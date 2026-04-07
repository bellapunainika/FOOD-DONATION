import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { FoodDonation } from '../../types';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const customMarker = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #f59e0b; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function NGODashboard() {
  const { userProfile } = useAuth();
  const [availableDonations, setAvailableDonations] = useState<FoodDonation[]>([]);
  const [acceptedDonations, setAcceptedDonations] = useState<FoodDonation[]>([]);
  
  useEffect(() => {
    // Listen for available donations generically (For scaled apps, add geohashing)
    const qAvailable = query(collection(db, 'donations'), where('status', '==', 'available'));
    const unsubAvailable = onSnapshot(qAvailable, (snapshot) => {
      const docs: FoodDonation[] = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() } as FoodDonation));
      docs.sort((a, b) => a.expiryTime - b.expiryTime); // prioritize closest to expiry
      setAvailableDonations(docs);
    });

    if (userProfile?.uid) {
      const qAccepted = query(collection(db, 'donations'), where('reservedByNgoId', '==', userProfile.uid));
      const unsubAccepted = onSnapshot(qAccepted, (snapshot) => {
        const docs: FoodDonation[] = [];
        snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() } as FoodDonation));
        setAcceptedDonations(docs);
      });
      return () => {
        unsubAvailable();
        unsubAccepted();
      };
    }

    return () => unsubAvailable();
  }, [userProfile]);

  const handleAccept = async (donationId: string) => {
    if (!userProfile) return;
    try {
      const docRef = doc(db, 'donations', donationId);
      await updateDoc(docRef, {
        status: 'reserved',
        reservedByNgoId: userProfile.uid
      });
      toast.success('Donation accepted! Volunteers nearby will be notified for pickup.');
    } catch (error: any) {
      toast.error('Failed to accept: ' + error.message);
    }
  };

  const calculateUrgency = (expiryTime: number) => {
      const timeLeft = expiryTime - Date.now();
      const hoursLeft = timeLeft / (1000 * 60 * 60);
      if (hoursLeft < 0) return 'Expired';
      if (hoursLeft < 2) return 'Critical';
      if (hoursLeft < 6) return 'Moderate';
      return 'Safe';
  };

  const totalPeopleServed = acceptedDonations
    .filter(d => d.status === 'delivered')
    .reduce((acc, curr) => acc + curr.quantityInMeals, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold leading-7 text-gray-900 sm:truncate">NGO Dashboard</h2>
        <p className="mt-1 text-gray-500">Find nearby active donations and direct volunteers to distribute them.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <span className="text-gray-500 font-medium uppercase tracking-wider text-sm mb-2">Total People Served</span>
            <div className="text-6xl font-black text-brand-600">{totalPeopleServed}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <span className="text-gray-500 font-medium uppercase tracking-wider text-sm mb-2">Active Procurements</span>
            <div className="text-6xl font-black text-blue-600">
               {acceptedDonations.filter(d => ['reserved', 'picked_up'].includes(d.status)).length}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 overflow-hidden">
            <h3 className="font-bold text-xl mb-4 text-gray-900">Map - Available Donations</h3>
            <div className="h-96 w-full rounded-2xl overflow-hidden z-0">
               <MapContainer center={[28.6139, 77.2090]} zoom={11} className="w-full h-full z-0">
                 <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                 {availableDonations.map(don => don.location && (
                    <Marker key={don.id} position={[don.location.lat, don.location.lng]} icon={customMarker}>
                       <Popup>
                          <strong>{don.quantityInMeals} Meals ({don.foodType})</strong><br/>
                          Donor: {don.donorName}<br/>
                          Urgency: {calculateUrgency(don.expiryTime)}
                       </Popup>
                    </Marker>
                 ))}
               </MapContainer>
            </div>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-xl">
             <div className="px-4 py-5 border-b border-gray-200">
               <h3 className="text-lg leading-6 font-medium text-gray-900">Priority Feed (Nearby & Expiring Soon)</h3>
             </div>
             <ul className="divide-y divide-gray-200">
                {availableDonations.length === 0 && <li className="p-6 text-gray-500 text-center">No active donations nearby.</li>}
                {availableDonations.map(don => {
                  const urgencyStr = calculateUrgency(don.expiryTime);
                  const isExpiring = urgencyStr === 'Critical';
                  return (
                    <li key={don.id} className="p-6 flex flex-col sm:flex-row justify-between items-center bg-white hover:bg-gray-50 transition">
                       <div>
                          <div className="text-lg font-bold text-gray-900">{don.quantityInMeals} Meals <span className="text-sm font-normal text-gray-500">by {don.donorName}</span></div>
                          <div className="text-sm text-gray-600 mt-1">Category: {don.foodCategory} | Storage: {don.storageInfo}</div>
                          <div className="mt-2 flex gap-2">
                             <span className={`px-2 py-1 text-xs rounded-full font-semibold ${isExpiring ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                {urgencyStr}
                             </span>
                          </div>
                       </div>
                       <button onClick={() => don.id && handleAccept(don.id)} className="mt-4 sm:mt-0 font-bold px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition">
                          Accept Allocation
                       </button>
                    </li>
                  )
                })}
             </ul>
          </div>
        </div>
        
        <div className="space-y-6">
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-xl mb-4 text-gray-900">Your Active Allocations</h3>
              <ul className="space-y-4">
                 {acceptedDonations.filter(d => ['reserved', 'picked_up'].includes(d.status)).map(d => (
                    <li key={d.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                       <span className="font-bold block text-gray-900">{d.quantityInMeals} Meals from {d.donorName}</span>
                       <span className="text-sm font-semibold capitalize mt-1 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                         Status: {d.status.replace('_', ' ')}
                       </span>
                    </li>
                 ))}
                 {acceptedDonations.filter(d => ['reserved', 'picked_up'].includes(d.status)).length === 0 && (
                   <span className="text-sm text-gray-500">No active allocations right now.</span>
                 )}
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
