import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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

  const acceptPickup = async (donationId: string) => {
      if (!userProfile) return;
      try {
          await updateDoc(doc(db, 'donations', donationId), {
              status: 'reserved',
              volunteerId: userProfile.uid,
              volunteerName: userProfile.fullName,
              volunteerEmail: userProfile.email,
              volunteerPhone: userProfile.phoneNumber
          });
          toast.success("🎯 Wow! You've accepted a delivery\n⏱️ Head to the pickup location now!");
      } catch(err: any) {
          toast.error("Failed: " + err.message);
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
                             <button onClick={() => don.id && acceptPickup(don.id)} className="w-full mt-2 text-xs bg-brand-600 text-white rounded p-1">Accept</button>
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
                           <button onClick={() => don.id && acceptPickup(don.id)} className="mt-4 sm:mt-0 font-bold px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl shadow-sm transition whitespace-nowrap h-fit">
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
    </div>
  );
}
