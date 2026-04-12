import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FoodDonation } from '../../types';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Check, PackageOpen, Truck, Heart, CheckCircle, AlertCircle, Zap } from 'lucide-react';

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
  const [previousActiveCount, setPreviousActiveCount] = useState<number>(0);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | '7days' | '30days'>('all');
  
  // Partial Acceptance State
  const [acceptingDonation, setAcceptingDonation] = useState<FoodDonation | null>(null);
  const [takeQuantity, setTakeQuantity] = useState<number>(1);
  const [takeVegQuantity, setTakeVegQuantity] = useState<number>(0);
  const [takeNonVegQuantity, setTakeNonVegQuantity] = useState<number>(0);
  const [isAccepting, setIsAccepting] = useState(false);
  
  // Availability toggle state
  const [isAvailable, setIsAvailable] = useState<boolean>(userProfile?.isAvailable ?? false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);

  // Sync availability state with userProfile
  useEffect(() => {
    if (userProfile?.isAvailable !== undefined) {
      setIsAvailable(userProfile.isAvailable);
    }
  }, [userProfile?.isAvailable]);

  useEffect(() => {
    // Donations that are available for pickup (only shown if volunteer is available)
    const qPickups = query(collection(db, 'donations'), where('status', '==', 'available'));
    const unsubPickups = onSnapshot(qPickups, (snapshot) => {
      const docs: FoodDonation[] = [];
      const now = Date.now();
      snapshot.forEach(doc => {
         const data = { id: doc.id, ...doc.data() } as FoodDonation;
         if (!data.volunteerId && data.expiryTime > now) docs.push(data);
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
        
        // Detect if an active delivery was removed
        if (previousActiveCount > activeDocs.length && previousActiveCount > 0) {
          toast.error('A donation pickup was cancelled by the donor!');
        }
        setPreviousActiveCount(activeDocs.length);
        setActiveDeliveries(activeDocs);
        setDelivered(pastDocs);
      });
      
      return () => {
        unsubPickups();
        unsubActive();
      };
    }
  }, [userProfile, previousActiveCount]);

  // Toggle availability handler
  const toggleAvailability = async () => {
    if (!userProfile?.uid) return;
    
    setIsTogglingAvailability(true);
    try {
      const newAvailabilityStatus = !isAvailable;
      await updateDoc(doc(db, 'users', userProfile.uid), {
        isAvailable: newAvailabilityStatus,
        lastAvailabilityToggle: Date.now()
      });
      
      setIsAvailable(newAvailabilityStatus);
      
      if (newAvailabilityStatus) {
        toast.success('🟢 You\'re ONLINE!\nReady to help people in need!', {
          duration: 3,
          icon: '✨'
        });
      } else {
        toast.success('🔴 You\'re OFFLINE\nTake a break, you deserve it!', {
          duration: 3
        });
      }
    } catch (err: any) {
      toast.error('Failed to update availability: ' + err.message);
      setIsTogglingAvailability(false);
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const handleOpenAcceptModal = (donation: FoodDonation) => {
    setAcceptingDonation(donation);
    if (donation.foodCategory === 'Both') {
      setTakeVegQuantity(donation.vegQuantity || 0);
      setTakeNonVegQuantity(donation.nonVegQuantity || 0);
    } else {
      setTakeQuantity(donation.quantityInMeals);
    }
  };

  const confirmAcceptPickup = async () => {
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
          
          const volName = userProfile.fullName || 'Anonymous Volunteer';
          
          if (takingTotal === currentData.quantityInMeals) {
              await updateDoc(donationRef, {
                  status: 'reserved',
                  volunteerId: userProfile.uid,
                  volunteerName: volName,
                  volunteerEmail: userProfile.email || '',
                  volunteerPhone: userProfile.phoneNumber || ''
              });
          } else {
              const updates: any = { quantityInMeals: currentData.quantityInMeals - takingTotal };
              if (currentData.foodCategory === 'Both') {
                  updates.vegQuantity = (currentData.vegQuantity || 0) - takingVeg;
                  updates.nonVegQuantity = (currentData.nonVegQuantity || 0) - takingNonVeg;
              }
              await updateDoc(donationRef, updates);
              
              const newDonation = {
                  ...currentData,
                  quantityInMeals: takingTotal,
                  status: 'reserved',
                  volunteerId: userProfile.uid,
                  volunteerName: volName,
                  volunteerEmail: userProfile.email || '',
                  volunteerPhone: userProfile.phoneNumber || '',
                  createdAt: Date.now()
              };
              if (currentData.foodCategory === 'Both') {
                  newDonation.vegQuantity = takingVeg;
                  newDonation.nonVegQuantity = takingNonVeg;
              }
              delete newDonation.id;
              
              await addDoc(collection(db, 'donations'), newDonation);
          }
          toast.success("🎯 Wow! You've accepted a delivery\n⏱️ Head to the pickup location now!");
          setAcceptingDonation(null);
      } catch(err: any) {
          toast.error("Failed: " + err.message);
      } finally {
          setIsAccepting(false);
      }
  };

  const updateDeliveryStatus = async (donationId: string, status: 'picked_up' | 'delivered') => {
      try {
          await updateDoc(doc(db, 'donations', donationId), { status });
          if(status === 'delivered') {
              toast.success("🌟 Delivery completed! You're making a difference\n💪 Keep up the amazing work!");
          } else {
              toast.success("📦 Package picked up! On the way now\n🚗 Safe journey ahead!");
          }
      } catch (err: any) {
          toast.error("Failed: " + err.message);
      }
  };

  const getFilteredHistory = () => {
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

  const historyDonations = getFilteredHistory();
  const totalMealsDelivered = delivered.reduce((acc, curr) => acc + curr.quantityInMeals, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Availability Toggle */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold leading-7 text-gray-900">Volunteer Dashboard</h2>
            <p className="mt-1 text-gray-500">Help people in need by making food donations accessible to everyone.</p>
          </div>
          
          {/* Modern Toggle Switch */}
          <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <div className="flex flex-col items-end">
              <p className={`text-sm font-semibold transition-colors ${
                isAvailable ? 'text-green-700' : 'text-gray-700'
              }`}>
                Available for Delivery
              </p>
              <p className={`text-xs mt-1 font-medium transition-colors ${
                isAvailable ? 'text-green-600' : 'text-gray-500'
              }`}>
                {isAvailable ? '🟢 You are ONLINE' : '🔴 You are OFFLINE'}
              </p>
            </div>
            
            {/* Toggle Switch Button */}
            <button
              onClick={toggleAvailability}
              disabled={isTogglingAvailability}
              className={`relative inline-flex items-center h-10 w-18 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${
                isAvailable
                  ? 'bg-green-500 shadow-lg shadow-green-500/50'
                  : 'bg-gray-300 shadow-lg shadow-gray-300/50'
              } ${isTogglingAvailability ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-300 flex items-center justify-center ${
                  isAvailable ? 'translate-x-9' : 'translate-x-1'
                }`}
              >
                {isAvailable ? (
                  <Zap size={16} className="text-green-500" />
                ) : (
                  <AlertCircle size={16} className="text-gray-400" />
                )}
              </span>
            </button>
          </div>
        </div>
        
        {/* Status Message */}
        <div className={`mt-6 p-4 rounded-xl border-2 flex items-start gap-3 transition-all duration-300 ${
          isAvailable
            ? 'bg-green-50 border-green-300'
            : 'bg-gray-100 border-gray-300'
        }`}>
          <div className={`flex-shrink-0 mt-0.5 ${isAvailable ? 'animate-pulse' : ''}`}>
            {isAvailable ? (
              <Zap size={20} className="text-green-600" />
            ) : (
              <AlertCircle size={20} className="text-gray-600" />
            )}
          </div>
          <div>
            <p className={`font-semibold ${isAvailable ? 'text-green-900' : 'text-gray-900'}`}>
              {isAvailable
                ? '✅ You are ONLINE and ready for deliveries!'
                : '⏸️ You are currently OFFLINE'}
            </p>
            <p className={`text-sm mt-1 ${isAvailable ? 'text-green-700' : 'text-gray-700'}`}>
              {isAvailable
                ? 'Nearby donations will appear below. You\'ll be notified when someone needs your help. Thank you for being a hero!'
                : 'Toggle ON to start receiving donation requests and notifications. Take a break whenever you need!'}
            </p>
          </div>
        </div>
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
                             {don.donorEmail && <>📧 {don.donorEmail}<br/></>}
                             {don.donorPhone && <>📱 {don.donorPhone}<br/></>}
                             {don.quantityInMeals} Meals<br/>
                             <button onClick={() => handleOpenAcceptModal(don)} className="w-full mt-2 text-xs bg-brand-600 text-white rounded p-1">Accept</button>
                          </Popup>
                       </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                 <h3 className="font-bold text-xl mb-4">🎯 Available Needs Nearby</h3>
                 {!isAvailable ? (
                   <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                     <Zap size={40} className="mx-auto text-gray-300 mb-3" />
                     <p className="text-gray-600 text-lg font-medium mb-2">Go Online to See Donations</p>
                     <p className="text-sm text-gray-500 max-w-xs mx-auto">
                       Toggle your availability to the ON position to start seeing food donations that need a hero like you!
                     </p>
                   </div>
                 ) : availablePickups.length === 0 ? (
                   <p className="text-gray-500 py-8 text-center">✨ No pickups available currently. Check back soon!</p>
                 ) : (
                   <div className="space-y-4">
                     {availablePickups.map(don => (
                        <div key={don.id} className="flex flex-col sm:flex-row justify-between bg-gray-50 border border-gray-200 rounded-xl p-4 gap-4">
                           <div className="flex-1">
                               <div className="font-bold text-lg text-gray-900">{don.donorName}</div>
                               <div className="text-xs uppercase text-gray-500 font-semibold mt-2">Donor Contact:</div>
                                <div className="text-sm text-gray-600">
                                 {don.donorEmail && <p>📧 {don.donorEmail}</p>}
                                 {don.donorPhone && <p>📱 {don.donorPhone}</p>}
                               </div>
                               <div className="text-sm text-gray-600 mt-2">Quantity: {don.quantityInMeals} Meals | Ready since {new Date(don.preparedTime).toLocaleTimeString()}</div>
                               <div className="text-sm text-gray-500 mt-1 flex gap-2 items-center">
                                  <Navigation size={14}/> {don.location.address}
                               </div>
                           </div>
                           <button onClick={() => handleOpenAcceptModal(don)} className="mt-4 sm:mt-0 font-bold px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl shadow-sm transition whitespace-nowrap h-fit">
                               Accept Delivery
                           </button>
                        </div>
                     ))}
                    </div>
                 )}
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
                         <div className="text-xs uppercase text-gray-500 font-semibold mt-2">Donor Contact:</div>
                         <div className="text-sm text-gray-600 mb-2">
                           {d.donorEmail && <p>📧 {d.donorEmail}</p>}
                           {d.donorPhone && <p>📱 {d.donorPhone}</p>}
                         </div>
                         <div className="text-sm text-gray-600 mb-4">{d.quantityInMeals} Meals</div>

                         <div className="space-y-2">
                            {d.status === 'reserved' && (
                                <button onClick={() => d.id && updateDeliveryStatus(d.id, 'picked_up')} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition">
                                   <PackageOpen size={18} /> Mark as Picked Up
                                </button>
                            )}
                            {d.status === 'picked_up' && (
                                <button onClick={() => d.id && updateDeliveryStatus(d.id, 'delivered')} className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition">
                                   <Check size={18} /> Mark as Delivered
                                </button>
                            )}
                         </div>
                     </div>
                  ))}
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
                Your Hero's Journey
              </h3>
              <p className="text-sm text-gray-500 mt-1">Celebrate your successful deliveries and impact</p>
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs uppercase text-green-700 font-semibold tracking-wide">Total Meals Delivered</p>
            <p className="text-3xl font-black text-green-600 mt-2">{totalMealsDelivered}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs uppercase text-blue-700 font-semibold tracking-wide">People Helped</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{delivered.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs uppercase text-purple-700 font-semibold tracking-wide">Impact Score</p>
            <p className="text-3xl font-black text-purple-600 mt-2">⭐{Math.min(delivered.length * 5, 100)}</p>
          </div>
        </div>

        {historyDonations.length === 0 ? (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-dashed border-yellow-200 rounded-2xl p-12 text-center">
            <Heart className="mx-auto text-yellow-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg font-medium">No completed deliveries yet</p>
            <p className="text-gray-500 text-sm mt-1">Your heroic deliveries will appear here!</p>
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
                          ✓ Successfully Delivered
                        </span>
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
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">✅ Delivered On</p>
                        <p className="text-sm text-gray-900 font-medium">{new Date(donation.createdAt).toLocaleString()}</p>
                      </div>
                      {donation.donorName && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">🏪 From</p>
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
                  Accept Pickup
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
                  <button disabled={isAccepting} onClick={confirmAcceptPickup} className="flex-1 inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none sm:text-sm disabled:opacity-50">
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
