import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { FoodDonation } from '../../types';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle, Heart, Users } from 'lucide-react';

const customMarker = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #f59e0b; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function OrganizationsDashboard() {
  const { userProfile } = useAuth();
  const [availableDonations, setAvailableDonations] = useState<FoodDonation[]>([]);
  const [acceptedDonations, setAcceptedDonations] = useState<FoodDonation[]>([]);
  const [previousAcceptedCount, setPreviousAcceptedCount] = useState<number>(0);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | '7days' | '30days'>('all');
  
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
      const qAccepted = query(collection(db, 'donations'), where('reservedByorganizationsId', '==', userProfile.uid));
      const unsubAccepted = onSnapshot(qAccepted, (snapshot) => {
        const docs: FoodDonation[] = [];
        snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() } as FoodDonation));
        
        // Detect if an accepted donation was removed
        if (previousAcceptedCount > docs.length && previousAcceptedCount > 0) {
          toast.error('A donation allocation was taken back by the donor!');
        }
        setPreviousAcceptedCount(docs.length);
        setAcceptedDonations(docs);
      });
      return () => {
        unsubAvailable();
        unsubAccepted();
      };
    }

    return () => unsubAvailable();
  }, [userProfile, previousAcceptedCount]);

  const handleAccept = async (donationId: string) => {
    if (!userProfile) return;
    try {
      const docRef = doc(db, 'donations', donationId);
      await updateDoc(docRef, {
        status: 'reserved',
        reservedByorganizationsId: userProfile.uid,
        organizationName: userProfile.organizationName || userProfile.fullName,
        organizationEmail: userProfile.email,
        organizationPhone: userProfile.phoneNumber
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

  const getFilteredHistory = () => {
    const delivered = acceptedDonations.filter(d => d.status === 'delivered');
    const now = Date.now();
    
    switch(historyFilter) {
      case '7days':
        return delivered.filter(d => (now - d.createdAt) <= 7 * 24 * 60 * 60 * 1000);
      case '30days':
        return delivered.filter(d => (now - d.createdAt) <= 30 * 24 * 60 * 60 * 1000);
      default:
        return delivered;
    }
  };

  const activeDonations = acceptedDonations.filter(d => ['reserved', 'picked_up'].includes(d.status));
  const historyDonations = getFilteredHistory();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold leading-7 text-gray-900 sm:truncate">Organizations Dashboard</h2>
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
                          {don.donorEmail && <>📧 {don.donorEmail}<br/></>}
                          {don.donorPhone && <>📱 {don.donorPhone}<br/></>}
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
                    <li key={don.id} className="p-6 flex flex-col sm:flex-row justify-between items-start bg-white hover:bg-gray-50 transition gap-6">
                       <div className="flex-1">
                          <div className="text-lg font-bold text-gray-900">{don.quantityInMeals} Meals <span className="text-sm font-normal text-gray-500">by {don.donorName}</span></div>
                          <div className="text-sm text-gray-600 mt-1">Category: {don.foodCategory} | Storage: {don.storageInfo}</div>
                          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg inline-block">
                            <p className="text-xs font-semibold text-orange-700 uppercase mb-1">Donor Contact</p>
                            <p className="font-semibold text-gray-900">{don.donorName}</p>
                            {don.donorEmail && <p className="text-sm text-gray-600">📧 {don.donorEmail}</p>}
                            {don.donorPhone && <p className="text-sm text-gray-600">📱 {don.donorPhone}</p>}
                          </div>
                          <div className="mt-2 flex gap-2">
                             <span className={`px-2 py-1 text-xs rounded-full font-semibold ${isExpiring ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                {urgencyStr}
                             </span>
                          </div>
                       </div>
                       <button onClick={() => don.id && handleAccept(don.id)} className="mt-4 sm:mt-0 font-bold px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition whitespace-nowrap">
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
                 {activeDonations.map(d => (
                    <li key={d.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                       <span className="font-bold block text-gray-900">{d.quantityInMeals} Meals from {d.donorName}</span>
                       <div className="text-xs uppercase text-gray-500 font-semibold mt-2">Donor Contact:</div>
                       <div className="text-sm text-gray-600 mb-2">
                         {d.donorEmail && <p>📧 {d.donorEmail}</p>}
                         {d.donorPhone && <p>📱 {d.donorPhone}</p>}
                       </div>
                       {d.volunteerName && (
                         <>
                           <div className="text-xs uppercase text-gray-500 font-semibold mt-2">Assigned Volunteer:</div>
                           <div className="text-sm text-gray-600 mb-2">
                             <p className="font-semibold">{d.volunteerName}</p>
                             {d.volunteerEmail && <p>📧 {d.volunteerEmail}</p>}
                             {d.volunteerPhone && <p>📱 {d.volunteerPhone}</p>}
                           </div>
                         </>
                       )}
                       <span className="text-sm font-semibold capitalize mt-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                         Status: {d.status.replace('_', ' ')}
                       </span>
                    </li>
                 ))}
                 {activeDonations.length === 0 && (
                   <span className="text-sm text-gray-500">No active allocations right now.</span>
                 )}
              </ul>
           </div>
        </div>
      </div>

      {/* Delivery History Section */}
      <div className="mt-12">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="text-red-500" size={28} />
                Your Delivery History
              </h3>
              <p className="text-sm text-gray-500 mt-1">Successfully received and distributed donations</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', '7days', '30days'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setHistoryFilter(filter as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    historyFilter === filter
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? 'All Time' : filter === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {historyDonations.length === 0 ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-2xl p-12 text-center">
            <Heart className="mx-auto text-blue-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg font-medium">No completed deliveries yet</p>
            <p className="text-gray-500 text-sm mt-1">Donations appearing here will show your successful distributions</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {historyDonations.map((donation) => (
              <div
                key={donation.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div
                  onClick={() => setExpandedHistory(expandedHistory === donation.id ? null : (donation.id || null))}
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0 h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="text-green-600" size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-bold text-gray-900">
                            {donation.quantityInMeals} Meals - {donation.foodType}
                          </p>
                          <p className="text-sm text-gray-500">
                            {donation.foodCategory} • {new Date(donation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          ✓ Delivered
                        </span>
                        {donation.donorName && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full flex items-center gap-1">
                            From: {donation.donorName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 text-gray-400 transition-transform ${
                        expandedHistory === donation.id ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </div>
                  </div>
                </div>

                {expandedHistory === donation.id && (
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">📍 Received On</p>
                        <p className="text-sm text-gray-900 font-medium">{new Date(donation.createdAt).toLocaleString()}</p>
                      </div>
                      {donation.donorName && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">🏪 From Donor</p>
                          <div>
                            <p className="text-sm text-gray-900 font-medium">{donation.donorName}</p>
                            {donation.donorEmail && (
                              <p className="text-sm text-gray-600">📧 {donation.donorEmail}</p>
                            )}
                            {donation.donorPhone && (
                              <p className="text-sm text-gray-600">📱 {donation.donorPhone}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {donation.volunteerName && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">👤 Delivered By</p>
                          <div>
                            <p className="text-sm text-gray-900 font-medium">{donation.volunteerName}</p>
                            {donation.volunteerEmail && (
                              <p className="text-sm text-gray-600">📧 {donation.volunteerEmail}</p>
                            )}
                            {donation.volunteerPhone && (
                              <p className="text-sm text-gray-600">📱 {donation.volunteerPhone}</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">📋 Food Details</p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Category: <span className="font-medium">{donation.foodCategory}</span></p>
                          <p>Type: <span className="font-medium">{donation.foodType}</span></p>
                          <p>Storage: <span className="font-medium">{donation.storageInfo}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
