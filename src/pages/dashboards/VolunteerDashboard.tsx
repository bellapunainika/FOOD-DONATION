import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FoodDonation } from '../../types';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Check, PackageOpen, Truck } from 'lucide-react';

const currentLocIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24]
});

const pickupIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24]
});

export default function VolunteerDashboard() {
  const { userProfile } = useAuth();
  const [availablePickups, setAvailablePickups] = useState<FoodDonation[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<FoodDonation[]>([]);
  const [delivered, setDelivered] = useState<FoodDonation[]>([]);

  useEffect(() => {
    // Donations reserved by NGO but not yet picked up by any volunteer
    const qPickups = query(collection(db, 'donations'), where('status', '==', 'reserved'));
    const unsubPickups = onSnapshot(qPickups, (snapshot) => {
      const docs: FoodDonation[] = [];
      snapshot.forEach(doc => {
         const data = { id: doc.id, ...doc.data() } as FoodDonation;
         // Ensure no other volunteer has claimed it
         if (!data.volunteerId) docs.push(data);
      });
      setAvailablePickups(docs);
    });

    if (userProfile?.uid) {
      const qActive = query(collection(db, 'donations'), where('volunteerId', '==', userProfile.uid));
      const unsubActive = onSnapshot(qActive, (snapshot) => {
        const activeDocs: FoodDonation[] = [];
        const pastDocs: FoodDonation[] = [];
        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() } as FoodDonation;
            if (data.status === 'delivered') pastDocs.push(data);
            else activeDocs.push(data);
        });
        setActiveDeliveries(activeDocs);
        setDelivered(pastDocs);
      });
      
      return () => {
        unsubPickups();
        unsubActive();
      };
    }
  }, [userProfile]);

  const acceptPickup = async (donationId: string) => {
      if (!userProfile) return;
      try {
          await updateDoc(doc(db, 'donations', donationId), {
              volunteerId: userProfile.uid,
          });
          toast.success("Delivery accepted! Please proceed to pickup location.");
      } catch(err: any) {
          toast.error("Failed: " + err.message);
      }
  };

  const updateDeliveryStatus = async (donationId: string, status: 'picked_up' | 'delivered') => {
      try {
          await updateDoc(doc(db, 'donations', donationId), { status });
          if(status === 'delivered') {
              toast.success("Hooray! Delivery marked as completed. Thank you hero!");
          } else {
              toast.success("Marked as in-transit.");
          }
      } catch (err: any) {
          toast.error("Failed: " + err.message);
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold leading-7 text-gray-900">Volunteer Logistics</h2>
        <p className="mt-1 text-gray-500">Pick up ready donations and deliver them safely to the assigned NGOs.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8 text-center text-white">
          <div className="bg-yellow-500 p-6 rounded-3xl shadow-sm border border-yellow-400">
             <div className="text-sm font-bold uppercase tracking-wider mb-2 opacity-80">Looking for pickup</div>
             <div className="text-6xl font-black">{availablePickups.length}</div>
          </div>
          <div className="bg-blue-500 p-6 rounded-3xl shadow-sm border border-blue-400">
             <div className="text-sm font-bold uppercase tracking-wider mb-2 opacity-80">In Transit</div>
             <div className="text-6xl font-black">{activeDeliveries.length}</div>
          </div>
          <div className="bg-green-500 p-6 rounded-3xl shadow-sm border border-green-400">
             <div className="text-sm font-bold uppercase tracking-wider mb-2 opacity-80">Total Delivered</div>
             <div className="text-6xl font-black">{delivered.length}</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                <div className="h-96 w-full rounded-2xl overflow-hidden z-0">
                  <MapContainer center={[28.6139, 77.2090]} zoom={11} className="w-full h-full z-0">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    {userProfile?.location && (
                       <Marker position={[userProfile.location.lat, userProfile.location.lng]} icon={currentLocIcon}>
                          <Popup>Your Location</Popup>
                       </Marker>
                    )}
                    {availablePickups.map(don => don.location && (
                       <Marker key={don.id} position={[don.location.lat, don.location.lng]} icon={pickupIcon}>
                          <Popup>
                             <strong>{don.donorName}</strong><br/>
                             {don.quantityInMeals} Meals<br/>
                             <button onClick={() => don.id && acceptPickup(don.id)} className="w-full mt-2 text-xs bg-brand-600 text-white rounded p-1">Accept</button>
                          </Popup>
                       </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                 <h3 className="font-bold text-xl mb-4">Available Needs Nearby</h3>
                 {availablePickups.length === 0 && <p className="text-gray-500">No pickups available currently.</p>}
                 <div className="space-y-4">
                     {availablePickups.map(don => (
                        <div key={don.id} className="flex flex-col sm:flex-row justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
                           <div>
                               <div className="font-bold text-lg text-gray-900">{don.donorName}</div>
                               <div className="text-sm text-gray-600">Quantity: {don.quantityInMeals} Meals | Ready since {new Date(don.preparedTime).toLocaleTimeString()}</div>
                               <div className="text-sm text-gray-500 mt-1 flex gap-2 items-center">
                                  <Navigation size={14}/> {don.location.address}
                               </div>
                           </div>
                           <button onClick={() => don.id && acceptPickup(don.id)} className="mt-4 sm:mt-0 font-bold px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl shadow-sm transition">
                               Accept Delivery
                           </button>
                        </div>
                     ))}
                 </div>
              </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-fit">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-900">
                  <Truck /> Your Active Tasks
              </h3>
              {activeDeliveries.length === 0 && <p className="text-gray-500 text-center py-8">No active tasks.</p>}
              <div className="space-y-4">
                  {activeDeliveries.map(d => (
                     <div key={d.id} className="p-4 border border-blue-200 bg-blue-50 rounded-xl shadow-sm">
                         <div className="font-bold text-lg">{d.donorName}</div>
                         <div className="text-sm text-gray-600 mb-4">{d.quantityInMeals} Meals</div>

                         <div className="space-y-2">
                            {d.status === 'reserved' && (
                                <button onClick={() => d.id && updateDeliveryStatus(d.id, 'picked_up')} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition">
                                   <PackageOpen size={18} /> Mark as Picked Up
                                </button>
                            )}
                            {d.status === 'picked_up' && (
                                <button onClick={() => d.id && updateDeliveryStatus(d.id, 'delivered')} className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition">
                                   <Check size={18} /> Mark as Delivered to NGO
                                </button>
                            )}
                         </div>
                     </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}
