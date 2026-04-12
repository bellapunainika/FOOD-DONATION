import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, addDoc, getDoc } from 'firebase/firestore';
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
  
  // Partial Acceptance State
  const [acceptingDonation, setAcceptingDonation] = useState<FoodDonation | null>(null);
  const [takeQuantity, setTakeQuantity] = useState<number>(1);
  const [takeVegQuantity, setTakeVegQuantity] = useState<number>(0);
  const [takeNonVegQuantity, setTakeNonVegQuantity] = useState<number>(0);
  const [isAccepting, setIsAccepting] = useState(false);
  
  useEffect(() => {
    // Listen for available donations generically (For scaled apps, add geohashing)
    const qAvailable = query(collection(db, 'donations'), where('status', '==', 'available'));
    const unsubAvailable = onSnapshot(qAvailable, (snapshot) => {
      const docs: FoodDonation[] = [];
      const now = Date.now();
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as FoodDonation;
        if (data.expiryTime > now) {
            docs.push(data);
        }
      });
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

  const handleOpenAcceptModal = (donation: FoodDonation) => {
    setAcceptingDonation(donation);
    if (donation.foodCategory === 'Both') {
      setTakeVegQuantity(donation.vegQuantity || 0);
      setTakeNonVegQuantity(donation.nonVegQuantity || 0);
    } else {
      setTakeQuantity(donation.quantityInMeals);
    }
  };

  const confirmAcceptAllocation = async () => {
    if (!userProfile || !acceptingDonation || !acceptingDonation.id) return;
    setIsAccepting(true);
    try {
      const donationRef = doc(db, 'donations', acceptingDonation.id);
      const donationSnap = await getDoc(donationRef);
      
      if (!donationSnap.exists()) {
        toast.error("Donation is no longer available.");
        setAcceptingDonation(null);
        setIsAccepting(false);
        return;
      }
      
      const currentData = donationSnap.data() as FoodDonation;
      
      let takingTotal = 0;
      let takingVeg = 0;
      let takingNonVeg = 0;
      
      if (currentData.foodCategory === 'Both') {
        takingVeg = takeVegQuantity;
        takingNonVeg = takeNonVegQuantity;
        takingTotal = takingVeg + takingNonVeg;
        
        if (takingVeg < 0 || takingNonVeg < 0 || takingVeg > (currentData.vegQuantity || 0) || takingNonVeg > (currentData.nonVegQuantity || 0) || takingTotal <= 0) {
            toast.error("Invalid quantity selected.");
            setIsAccepting(false);
            return;
        }
      } else {
        takingTotal = takeQuantity;
        if (takingTotal <= 0 || takingTotal > currentData.quantityInMeals) {
            toast.error("Invalid quantity selected.");
            setIsAccepting(false);
            return;
        }
      }
      
      const orgName = userProfile.organizationName || userProfile.fullName || '';
      
      if (takingTotal === currentData.quantityInMeals) {
          // Taking all
          await updateDoc(donationRef, {
              status: 'reserved',
              reservedByorganizationsId: userProfile.uid,
              organizationName: orgName,
              organizationEmail: userProfile.email || '',
              organizationPhone: userProfile.phoneNumber || ''
          });
      } else {
          // Splitting
          const updates: any = {
              quantityInMeals: currentData.quantityInMeals - takingTotal
          };
          if (currentData.foodCategory === 'Both') {
              updates.vegQuantity = (currentData.vegQuantity || 0) - takingVeg;
              updates.nonVegQuantity = (currentData.nonVegQuantity || 0) - takingNonVeg;
          }
          await updateDoc(donationRef, updates);
          
          const newDonation = {
              ...currentData,
              quantityInMeals: takingTotal,
              status: 'reserved',
              reservedByorganizationsId: userProfile.uid,
              organizationName: orgName,
              organizationEmail: userProfile.email || '',
              organizationPhone: userProfile.phoneNumber || '',
              createdAt: Date.now()
          };
          if (currentData.foodCategory === 'Both') {
              newDonation.vegQuantity = takingVeg;
              newDonation.nonVegQuantity = takingNonVeg;
          }
          delete newDonation.id;
          
          await addDoc(collection(db, 'donations'), newDonation);
      }
      toast.success('Donation accepted! Please proceed to pickup location.');
      setAcceptingDonation(null);
    } catch (error: any) {
      toast.error('Failed to accept: ' + error.message);
    } finally {
      setIsAccepting(false);
    }
  };

  const updateDeliveryStatus = async (donationId: string, status: 'picked_up' | 'delivered') => {
      try {
          await updateDoc(doc(db, 'donations', donationId), { status });
          if(status === 'delivered') {
              toast.success("Hooray! Delivery marked as completed.");
          } else {
              toast.success("Marked as picked up.");
          }
      } catch (err: any) {
          toast.error("Failed: " + err.message);
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
        <p className="mt-1 text-gray-500">Find nearby active donations, pick them up, and distribute them to people in need.</p>
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
                       <button onClick={() => handleOpenAcceptModal(don)} className="mt-4 sm:mt-0 font-bold px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition whitespace-nowrap">
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
                       <div className="space-y-2 mt-4">
                           <span className="text-sm font-semibold capitalize inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                             Status: {d.status.replace('_', ' ')}
                           </span>
                           {d.status === 'reserved' && (
                               <button onClick={() => d.id && updateDeliveryStatus(d.id, 'picked_up')} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition mt-2">
                                  Mark as Picked Up
                               </button>
                           )}
                           {d.status === 'picked_up' && (
                               <button onClick={() => d.id && updateDeliveryStatus(d.id, 'delivered')} className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition mt-2">
                                  Mark as Delivered
                               </button>
                           )}
                       </div>
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
      {acceptingDonation && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setAcceptingDonation(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-bold leading-6 text-gray-900 mb-4">
                  Accept Allocation
                </h3>
                <div className="mb-4 text-sm text-gray-500">
                  How many meals would you like to receive?
                </div>
                {acceptingDonation.foodCategory === 'Both' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Veg (Max: {acceptingDonation.vegQuantity})</label>
                      <input type="number" min="0" max={acceptingDonation.vegQuantity} value={takeVegQuantity} onChange={e => setTakeVegQuantity(parseInt(e.target.value) || 0)} className="mt-1 flex w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-brand-500 focus:border-brand-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Non-Veg (Max: {acceptingDonation.nonVegQuantity})</label>
                      <input type="number" min="0" max={acceptingDonation.nonVegQuantity} value={takeNonVegQuantity} onChange={e => setTakeNonVegQuantity(parseInt(e.target.value) || 0)} className="mt-1 flex w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-brand-500 focus:border-brand-500" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity (Max: {acceptingDonation.quantityInMeals})</label>
                    <input type="number" min="1" max={acceptingDonation.quantityInMeals} value={takeQuantity} onChange={e => setTakeQuantity(parseInt(e.target.value) || 0)} className="mt-1 flex w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-brand-500 focus:border-brand-500" />
                  </div>
                )}
                <div className="mt-5 sm:mt-6 flex gap-3">
                  <button disabled={isAccepting} onClick={confirmAcceptAllocation} className="flex-1 inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none sm:text-sm disabled:opacity-50">
                    {isAccepting ? 'Accepting...' : 'Confirm'}
                  </button>
                  <button onClick={() => setAcceptingDonation(null)} className="flex-1 inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
