import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { FoodDonation, LiveLocation } from '../../types';
import { MapPin, Clock, Navigation, User, Phone, Wifi, WifiOff } from 'lucide-react';

const deliveryIcon = L.divIcon({
  className: '',
  html: `<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(99,102,241,0.6);display:flex;align-items:center;justify-content:center;font-size:18px;">🚗</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const donorIcon = L.divIcon({
  className: '',
  html: `<div style="background:linear-gradient(135deg,#f59e0b,#d97706);width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(245,158,11,0.5);display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

interface Props {
  donationId: string;
  initialDonation?: FoodDonation;
  donorLat?: number;
  donorLng?: number;
}

export default function LiveTrackingMap({ donationId, initialDonation, donorLat, donorLng }: Props) {
  const [liveLocation, setLiveLocation] = useState<LiveLocation | undefined>(initialDonation?.currentLocation);
  const [isTracking, setIsTracking] = useState<boolean>(initialDonation?.trackingActive ?? false);
  const [personName, setPersonName] = useState(initialDonation?.deliveryPersonName || initialDonation?.volunteerName || 'Delivery Person');
  const [personPhone, setPersonPhone] = useState(initialDonation?.deliveryPersonPhone || initialDonation?.volunteerPhone || '');
  const [donationStatus, setDonationStatus] = useState(initialDonation?.status);

  useEffect(() => {
    if (!donationId) return;
    const unsub = onSnapshot(doc(db, 'donations', donationId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as FoodDonation;
      if (data.currentLocation) setLiveLocation(data.currentLocation);
      setIsTracking(data.trackingActive ?? false);
      setPersonName(data.deliveryPersonName || data.volunteerName || 'Delivery Person');
      setPersonPhone(data.deliveryPersonPhone || data.volunteerPhone || '');
      setDonationStatus(data.status);
    });
    return () => unsub();
  }, [donationId]);

  const center: [number, number] = liveLocation
    ? [liveLocation.lat, liveLocation.lng]
    : donorLat && donorLng
    ? [donorLat, donorLng]
    : [28.6139, 77.2090];

  const secondsAgo = liveLocation?.lastUpdated
    ? Math.floor((Date.now() - liveLocation.lastUpdated) / 1000)
    : null;

  const getStatusLabel = () => {
    if (donationStatus === 'picked_up') return { label: '🚗 On the way to deliver', color: 'bg-blue-500' };
    if (donationStatus === 'reserved') return { label: '📦 Heading to pickup location', color: 'bg-yellow-500' };
    return { label: '✅ Delivered', color: 'bg-green-500' };
  };

  const statusInfo = getStatusLabel();

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-indigo-200 dark:border-indigo-700 shadow-lg">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation size={16} className="text-white animate-pulse" />
          <span className="text-white font-bold text-sm tracking-wide">Live Tracking</span>
        </div>
        <div className="flex items-center gap-2">
          {isTracking ? (
            <><Wifi size={14} className="text-green-300" /><span className="text-xs text-green-200 font-semibold">LIVE</span></>
          ) : (
            <><WifiOff size={14} className="text-red-300" /><span className="text-xs text-red-200">Paused</span></>
          )}
        </div>
      </div>

      {/* Status pill */}
      <div className="px-4 pt-3 pb-1">
        <span className={`inline-block px-3 py-1 text-xs font-bold text-white rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Person info row */}
      <div className="px-4 py-2 flex flex-wrap gap-4 bg-indigo-50 dark:bg-indigo-900/20">
        {personName && (
          <div className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200">
            <User size={13} className="text-indigo-500" />
            <span className="font-semibold">{personName}</span>
          </div>
        )}
        {personPhone && (
          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
            <Phone size={13} className="text-indigo-500" />
            <a href={`tel:${personPhone}`} className="underline">{personPhone}</a>
          </div>
        )}
        {secondsAgo !== null && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Clock size={12} />
            <span>Updated {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo/60)}m ago`}</span>
          </div>
        )}
      </div>

      {/* Map */}
      {liveLocation ? (
        <div className="h-56 w-full">
          <MapContainer center={center} zoom={14} className="w-full h-full z-0" key={`${liveLocation.lat},${liveLocation.lng}`}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <Marker position={[liveLocation.lat, liveLocation.lng]} icon={deliveryIcon}>
              <Popup>{personName}</Popup>
            </Marker>
            {donorLat && donorLng && (
              <Marker position={[donorLat, donorLng]} icon={donorIcon}>
                <Popup>Your Pickup Location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      ) : (
        <div className="h-44 flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-900/10 gap-2">
          <MapPin className="text-indigo-300 dark:text-indigo-600" size={32} />
          <p className="text-sm text-indigo-400 dark:text-indigo-500 font-medium">Waiting for location signal...</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">The delivery person hasn't started sharing their location yet</p>
        </div>
      )}
    </div>
  );
}
