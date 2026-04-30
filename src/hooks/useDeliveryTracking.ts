import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DeliveryTracking } from '../types';
import toast from 'react-hot-toast';

/**
 * Hook for HANDLERS (Organization / Volunteer) to manage location tracking.
 *
 * – Creates a delivery tracking doc when the donation is picked up.
 * – Uses navigator.geolocation.watchPosition() to stream GPS updates.
 * – Writes currentLocation to Firestore on every position change.
 * – Automatically stops tracking when delivery is marked as delivered.
 */
export function useTrackingUpdater(
  userId: string | undefined,
  role: 'organization' | 'volunteer',
  handlerName: string
) {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const activeDeliveryIdRef = useRef<string | null>(null);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  /**
   * Start tracking for a specific donation.
   * Creates the delivery document if it doesn't exist, then begins watching position.
   */
  const startTracking = useCallback(
    async (donationId: string, donorId: string) => {
      if (!userId) return;

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        setTrackingError('Geolocation is not supported by this browser.');
        toast.error('Geolocation is not supported by this browser.');
        return;
      }

      try {
        // Check if a delivery doc already exists for this donation
        const deliveriesRef = collection(db, 'deliveries');
        const existingQuery = query(
          deliveriesRef,
          where('donationId', '==', donationId),
          where('status', 'in', ['pending', 'picked'])
        );
        const existingSnap = await getDocs(existingQuery);

        let deliveryDocId: string;

        if (!existingSnap.empty) {
          // Use existing delivery doc
          deliveryDocId = existingSnap.docs[0].id;
        } else {
          // Create new delivery tracking document
          const newDelivery: Omit<DeliveryTracking, 'id'> = {
            donationId,
            donorId,
            handledBy: role,
            ...(role === 'organization'
              ? { organizationId: userId }
              : { volunteerId: userId }),
            handlerName,
            status: 'picked',
            currentLocation: { lat: 0, lng: 0 },
            lastUpdated: Date.now(),
            createdAt: Date.now(),
          };

          const docRef = await addDoc(deliveriesRef, newDelivery);
          deliveryDocId = docRef.id;
        }

        activeDeliveryIdRef.current = deliveryDocId;

        // Start watching position
        const watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPos({ lat: latitude, lng: longitude });
            setTrackingError(null);

            // Write to Firestore
            if (activeDeliveryIdRef.current) {
              try {
                await updateDoc(doc(db, 'deliveries', activeDeliveryIdRef.current), {
                  currentLocation: { lat: latitude, lng: longitude },
                  lastUpdated: Date.now(),
                  status: 'picked',
                });
              } catch (err) {
                console.error('Failed to update location in Firestore:', err);
              }
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            let msg = 'Location access denied.';
            if (error.code === error.TIMEOUT) msg = 'Location request timed out.';
            if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location unavailable.';
            setTrackingError(msg);
            toast.error(msg);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000, // 10 seconds
            timeout: 15000, // 15 seconds
          }
        );

        watchIdRef.current = watchId;
        setIsTracking(true);
        setTrackingError(null);
        toast.success('📍 Live tracking started!');
      } catch (err: any) {
        console.error('Failed to start tracking:', err);
        setTrackingError(err.message);
        toast.error('Failed to start tracking: ' + err.message);
      }
    },
    [userId, role, handlerName]
  );

  /**
   * Stop tracking and mark delivery as delivered.
   */
  const stopTracking = useCallback(async () => {
    // Clear geolocation watcher
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Update delivery doc status to delivered
    if (activeDeliveryIdRef.current) {
      try {
        await updateDoc(doc(db, 'deliveries', activeDeliveryIdRef.current), {
          status: 'delivered',
          lastUpdated: Date.now(),
        });
      } catch (err) {
        console.error('Failed to update delivery status:', err);
      }
    }

    activeDeliveryIdRef.current = null;
    setIsTracking(false);
    setCurrentPos(null);
  }, []);

  return {
    isTracking,
    trackingError,
    currentPos,
    startTracking,
    stopTracking,
  };
}

/**
 * Hook for DONORS to listen to real-time delivery location updates.
 *
 * Uses Firestore onSnapshot() on the deliveries collection,
 * filtered by donorId to only show deliveries relevant to this donor.
 */
export function useLiveTracking(donorId: string | undefined) {
  const [deliveries, setDeliveries] = useState<DeliveryTracking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!donorId) {
      setLoading(false);
      return;
    }

    const deliveriesRef = collection(db, 'deliveries');
    const q = query(
      deliveriesRef,
      where('donorId', '==', donorId),
      where('status', 'in', ['pending', 'picked'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: DeliveryTracking[] = [];
      snapshot.forEach((docSnap) => {
        docs.push({ id: docSnap.id, ...docSnap.data() } as DeliveryTracking);
      });
      setDeliveries(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [donorId]);

  return { deliveries, loading };
}

/**
 * Hook to listen to a SINGLE delivery by donationId.
 * Used when you want to show tracking for a specific donation.
 */
export function useSingleDeliveryTracking(donationId: string | undefined) {
  const [delivery, setDelivery] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!donationId) {
      setLoading(false);
      return;
    }

    const deliveriesRef = collection(db, 'deliveries');
    const q = query(
      deliveriesRef,
      where('donationId', '==', donationId),
      where('status', 'in', ['pending', 'picked'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setDelivery({ id: docSnap.id, ...docSnap.data() } as DeliveryTracking);
      } else {
        setDelivery(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [donationId]);

  return { delivery, loading };
}
