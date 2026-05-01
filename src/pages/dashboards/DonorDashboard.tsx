import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FoodDonation } from '../../types';
import toast from 'react-hot-toast';
import { Clock, AlertCircle, CheckCircle, Package, Trash2, Users, Heart, Plus, Minus } from 'lucide-react';

export default function DonorDashboard() {
  const { userProfile } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | '7days' | '30days'>('all');

  // Form states
  const [foodCategory, setFoodCategory] = useState<'Veg' | 'Non-Veg' | 'Both'>('Veg');
  const [foodType, setFoodType] = useState<'Cooked' | 'Packaged' | 'Raw Ingredients'>('Cooked');
  const [quantityInMeals, setQuantityInMeals] = useState<number>(10);
  const [vegQuantity, setVegQuantity] = useState<number>(5);
  const [nonVegQuantity, setNonVegQuantity] = useState<number>(5);
  const [expiryValue, setExpiryValue] = useState<number>(4);
  const [expiryUnit, setExpiryUnit] = useState<'Hours' | 'Days'>('Hours');
  const [storageInfo, setStorageInfo] = useState<'Room temp' | 'Refrigerated'>('Room temp');
  
  // Raw Ingredients State
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);

  const addRawMaterial = () => {
    setRawMaterials([...rawMaterials, {
      name: '',
      quantity: 1,
      unit: 'kg',
      expiryDate: '',
      storageType: 'Room temp',
      notes: ''
    }]);
  };

  const removeRawMaterial = (index: number) => {
    const newMaterials = [...rawMaterials];
    newMaterials.splice(index, 1);
    setRawMaterials(newMaterials);
  };

  const updateRawMaterial = (index: number, field: string, value: any) => {
    const newMaterials = [...rawMaterials];
    newMaterials[index][field] = value;
    setRawMaterials(newMaterials);
  };

  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(collection(db, 'donations'), where('donorId', '==', userProfile.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs: FoodDonation[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as FoodDonation;
        if (data.status === 'available' && data.expiryTime < Date.now()) {
            data.status = 'expired';
            updateDoc(doc(db, 'donations', docSnap.id), { status: 'expired' });
        }
        docs.push({ id: docSnap.id, ...data });
      });
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setDonations(docs);
    });
    return () => unsubscribe();
  }, [userProfile]);

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    
    try {
      const now = Date.now();
      const expiry = now + (expiryUnit === 'Days' ? expiryValue * 24 * 60 * 60 * 1000 : expiryValue * 60 * 60 * 1000);
      
      let finalQuantity = quantityInMeals;
      if (foodCategory === 'Both') {
        finalQuantity = vegQuantity + nonVegQuantity;
      }
      
      if (foodType === 'Raw Ingredients' && rawMaterials.length === 0) {
        toast.error('Please add at least one raw material details.');
        return;
      }
      
      // Process raw materials dates and check validity
      const processedRawMaterials = rawMaterials.map(rm => {
        const time = rm.expiryDate ? new Date(rm.expiryDate).getTime() : now + (7 * 24 * 60 * 60 * 1000);
        // We ensure we give them until the END of the selected day just in case
        return {
          ...rm,
          expiryDate: time
        };
      });

      if (foodType === 'Raw Ingredients') {
        const invalidDates = processedRawMaterials.some(rm => rm.expiryDate < now);
        if (invalidDates) {
          toast.error('Expiry date cannot be in the past. Please select valid future dates.');
          return;
        }
      }

      // If raw ingredients, we derive the overall donation expiry from the *earliest* expiring product
      const finalExpiry = foodType === 'Raw Ingredients' 
        ? Math.min(...processedRawMaterials.map(rm => rm.expiryDate)) 
        : expiry;
      
      const newDonation: Omit<FoodDonation, 'id'> = {
        donorId: userProfile.uid,
        donorName: userProfile.organizationName || userProfile.fullName || 'Anonymous Donor',
        donorEmail: userProfile.email,
        donorPhone: userProfile.phoneNumber,
        status: 'available',
        foodCategory,
        foodType,
        quantityInMeals: finalQuantity,
        ...(foodCategory === 'Both' && { vegQuantity, nonVegQuantity }),
        preparedTime: now,
        expiryTime: finalExpiry,
        storageInfo,
        hygieneChecklist: { freshlyCooked: true, covered: true, safePackaging: true }, // Simplified for MVP
        location: userProfile.location!,
        createdAt: now,
        ...(foodType === 'Raw Ingredients' && { rawMaterials: processedRawMaterials })
      };

      await addDoc(collection(db, 'donations'), newDonation);
      toast.success('Food donation listed successfully!');
      setShowAddModal(false);
    } catch (error: any) {
      toast.error('Failed to add donation: ' + error.message);
    }
  };

  const calculateUrgency = (expiryTime: number) => {
    const timeLeft = expiryTime - Date.now();
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300', border: 'border-gray-500 dark:border-gray-600', name: 'Expired', icon: AlertCircle };
    if (hoursLeft < 2) return { color: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300', border: 'border-red-500 dark:border-red-400', name: 'Critical', icon: AlertCircle };
    if (hoursLeft < 6) return { color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300', border: 'border-yellow-500 dark:border-yellow-400', name: 'Moderate', icon: Clock };
    return { color: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300', border: 'border-green-500 dark:border-green-400', name: 'Safe', icon: CheckCircle };
  };

  const totalMealsDonated = donations.filter(d => d.status === 'delivered').reduce((acc, curr) => acc + curr.quantityInMeals, 0);

  const getFilteredHistory = () => {
    const closed = donations.filter(d => d.status === 'delivered' || d.status === 'expired');
    const now = Date.now();
    
    switch(historyFilter) {
      case '7days':
        return closed.filter(d => (now - d.createdAt) <= 7 * 24 * 60 * 60 * 1000);
      case '30days':
        return closed.filter(d => (now - d.createdAt) <= 30 * 24 * 60 * 60 * 1000);
      default:
        return closed;
    }
  };

  const activeDonations = donations.filter(d => d.status === 'available' || d.status === 'reserved' || d.status === 'picked_up');
  const historyDonations = getFilteredHistory();

  const handleDeleteDonation = async (donationId: string, donationStatus: string) => {
    if (!donationId) return;
    try {
      await deleteDoc(doc(db, 'donations', donationId));
      if (donationStatus === 'available') {
        toast.success('Donation removed successfully!');
      } else if (donationStatus === 'reserved') {
        toast.success('Donation taken back! Organizations have been notified.');
      } else {
        toast.success('Donation removed from records.');
      }
    } catch (error: any) {
      toast.error('Failed to delete donation: ' + error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold leading-7 text-gray-900 dark:text-gray-200 sm:truncate">
            Donor Dashboard
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="ml-3 inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-gray-100 bg-brand-600 hover:bg-brand-700"
          >
            + Add Food Donation
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-5 transition-colors">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Listings</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-200">{donations.length}</dd>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-5 transition-colors">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Active Donations</dt>
          <dd className="mt-1 text-3xl font-semibold text-brand-600">
            {donations.filter(d => d.status === 'available' || d.status === 'reserved').length}
          </dd>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-5 transition-colors">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Meals Successfully Delivered</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{totalMealsDonated}</dd>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-xl border border-gray-100 dark:border-gray-700 transition-colors">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {activeDonations.length === 0 ? (
            <li className="p-8 text-center text-gray-500 dark:text-gray-400">No donations listed yet. Click "Add Food Donation" to get started.</li>
          ) : (
            activeDonations.map((donation) => {
              const urgency = calculateUrgency(donation.expiryTime);
              const UrgencyIcon = urgency.icon;
              return (
                <li key={donation.id} className="p-6">
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      <div className={`p-4 rounded-full border-2 ${urgency.border} ${urgency.color}`}>
                         <Package className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-200 truncate">
                          {donation.quantityInMeals} Meals ({donation.foodType} - {donation.foodCategory})
                          {donation.foodCategory === 'Both' && donation.vegQuantity !== undefined && donation.nonVegQuantity !== undefined && (
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({donation.vegQuantity} Veg, {donation.nonVegQuantity} Non-Veg)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${urgency.border} ${urgency.color} items-center gap-1`}>
                            <UrgencyIcon size={14} />
                            {urgency.name} Urgency
                          </div>
                          {donation.status === 'available' && (
                            <button
                              onClick={() => donation.id && handleDeleteDonation(donation.id, donation.status)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                              title="Delete donation"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <p className="truncate">Status: <span className="font-bold capitalize">{donation.status.replace('_', ' ')}</span></p>
                        </div>
                      </div>
                      {donation.status === 'available' && (
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                          Expires on: <span className="text-gray-900 dark:text-gray-200">{new Date(donation.expiryTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      )}
                      {donation.status !== 'available' && (
                        <>
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {donation.organizationName && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">Organization</p>
                                <p className="font-bold text-gray-900 dark:text-gray-200 mt-1">{donation.organizationName}</p>
                                {donation.organizationEmail && <p className="text-sm text-gray-600 dark:text-gray-400">📧 {donation.organizationEmail}</p>}
                                {donation.organizationPhone && <p className="text-sm text-gray-600 dark:text-gray-400">📱 {donation.organizationPhone}</p>}
                              </div>
                            )}
                            {donation.volunteerName && (
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">Volunteer</p>
                                <p className="font-bold text-gray-900 dark:text-gray-200 mt-1">{donation.volunteerName}</p>
                                {donation.volunteerEmail && <p className="text-sm text-gray-600 dark:text-gray-400">📧 {donation.volunteerEmail}</p>}
                                {donation.volunteerPhone && <p className="text-sm text-gray-600 dark:text-gray-400">📱 {donation.volunteerPhone}</p>}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => donation.id && handleDeleteDonation(donation.id, donation.status)}
                            className="mt-4 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition border border-red-200 dark:border-red-700"
                          >
                            <Trash2 className="inline mr-2" size={16} /> Take Back
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Donation History Section */}
      <div className="mt-12">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-200 flex items-center gap-2">
                <Heart className="text-red-500" size={28} />
                Your Impact History
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed donations and happy recipients</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', '7days', '30days'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setHistoryFilter(filter as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    historyFilter === filter
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter === 'all' ? 'All Time' : filter === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {historyDonations.length === 0 ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-2 border-dashed border-blue-200 dark:border-gray-600 rounded-2xl p-12 text-center">
            <Heart className="mx-auto text-blue-400 dark:text-gray-500 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">No completed donations yet</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Donations will appear here once they're successfully delivered</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {historyDonations.map((donation) => (
              <div
                key={donation.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div
                  onClick={() => setExpandedHistory(expandedHistory === donation.id ? null : (donation.id || null))}
                  className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`flex-shrink-0 h-12 w-12 ${donation.status === 'expired' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-green-100 dark:bg-green-900/30'} rounded-full flex items-center justify-center`}>
                          {donation.status === 'expired' ? <AlertCircle className="text-gray-500 dark:text-gray-400" size={24} /> : <CheckCircle className="text-green-600 dark:text-green-400" size={24} />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-lg font-bold ${donation.status === 'expired' ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-200'}`}>
                            {donation.quantityInMeals} Meals - {donation.foodType}
                            {donation.foodCategory === 'Both' && donation.vegQuantity !== undefined && donation.nonVegQuantity !== undefined && (
                              <span className="text-sm font-normal ml-2 inline-block">({donation.vegQuantity} Veg, {donation.nonVegQuantity} Non-Veg)</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {donation.foodCategory} • {new Date(donation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {donation.status === 'expired' ? (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs font-semibold rounded-full flex items-center gap-1 border border-gray-200 dark:border-gray-600">
                            <AlertCircle size={12} /> Expired (Auto-removed)
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded-full">
                            ✓ Delivered
                          </span>
                        )}
                        {donation.organizationName && (
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full flex items-center gap-1">
                            <Users size={12} /> {donation.organizationName}
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
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">📍 Donated</p>
                        <p className="text-sm text-gray-900 dark:text-gray-200 font-medium">{new Date(donation.createdAt).toLocaleString()}</p>
                      </div>
                      {donation.organizationName && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">🏢 Received By</p>
                          <div>
                            <p className="text-sm text-gray-900 dark:text-gray-200 font-medium">{donation.organizationName}</p>
                            {donation.organizationEmail && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">📧 {donation.organizationEmail}</p>
                            )}
                            {donation.organizationPhone && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">📱 {donation.organizationPhone}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {donation.volunteerName && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">👤 Delivered By</p>
                          <div>
                            <p className="text-sm text-gray-900 dark:text-gray-200 font-medium">{donation.volunteerName}</p>
                            {donation.volunteerEmail && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">📧 {donation.volunteerEmail}</p>
                            )}
                            {donation.volunteerPhone && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">📱 {donation.volunteerPhone}</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">📋 Details</p>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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


      {showAddModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAddModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full transition-colors">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-2xl font-bold leading-6 text-gray-900 dark:text-gray-200 mb-6" id="modal-title">
                  Post Food Donation
                </h3>
                <form onSubmit={handleCreateDonation} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Food Category</label>
                    <select value={foodCategory} onChange={e => setFoodCategory(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-xl">
                      <option>Veg</option>
                      <option>Non-Veg</option>
                      <option>Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Food Type</label>
                    <select value={foodType} onChange={e => setFoodType(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-xl">
                      <option>Cooked</option>
                      <option>Packaged</option>
                      <option>Raw Ingredients</option>
                    </select>
                  </div>
                  {foodType !== 'Raw Ingredients' && (
                    <>
                      {foodCategory === 'Both' ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Veg Quantity (Meals)</label>
                            <input type="number" min="1" required value={vegQuantity} onChange={e => setVegQuantity(parseInt(e.target.value) || 0)} className="mt-1 flex w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl px-3 py-3 focus:ring-brand-500 focus:border-brand-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Non-Veg Quantity (Meals)</label>
                            <input type="number" min="1" required value={nonVegQuantity} onChange={e => setNonVegQuantity(parseInt(e.target.value) || 0)} className="mt-1 flex w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl px-3 py-3 focus:ring-brand-500 focus:border-brand-500" />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity (Number of Meals)</label>
                          <input type="number" min="1" required value={quantityInMeals} onChange={e => setQuantityInMeals(parseInt(e.target.value) || 0)} className="mt-1 flex w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl px-3 py-3 focus:ring-brand-500 focus:border-brand-500" />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expires In</label>
                        <div className="mt-1 flex space-x-2">
                           <input type="number" min="1" required value={expiryValue} onChange={e => setExpiryValue(parseInt(e.target.value) || 0)} className="flex-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl px-3 py-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm" />
                           <select value={expiryUnit} onChange={e => setExpiryUnit(e.target.value as any)} className="block w-28 pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl focus:ring-brand-500 focus:border-brand-500 sm:text-sm">
                             <option>Hours</option>
                             <option>Days</option>
                           </select>
                        </div>
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Storage Info</label>
                        <select value={storageInfo} onChange={e => setStorageInfo(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-xl">
                          <option>Room temp</option>
                          <option>Refrigerated</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {foodType === 'Raw Ingredients' && (
                    <div className="border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-bold text-gray-900 dark:text-gray-200">Raw Materials Details</h4>
                        <button type="button" onClick={addRawMaterial} className="flex items-center gap-1 text-sm bg-brand-600 text-gray-100 px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">
                          <Plus size={16} /> Add 
                        </button>
                      </div>
                      
                      {rawMaterials.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">Please add at least one material.</p>
                      ) : (
                        <div className="space-y-4">
                          {rawMaterials.map((material, index) => (
                            <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm relative group">
                              <button type="button" onClick={() => removeRawMaterial(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition">
                                <Minus size={14} />
                              </button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Material Name <span className="text-red-500">*</span></label>
                                  <input type="text" required placeholder="e.g. Rice, Potatoes" value={material.name} onChange={e => updateRawMaterial(index, 'name', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 placeholder-gray-400 dark:placeholder-gray-500" />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Quantity <span className="text-red-500">*</span></label>
                                  <div className="flex flex-row space-x-2">
                                    <input type="number" min="0.1" step="0.1" required value={material.quantity} onChange={e => updateRawMaterial(index, 'quantity', parseFloat(e.target.value))} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 placeholder-gray-400 dark:placeholder-gray-500" />
                                    <select value={material.unit} onChange={e => updateRawMaterial(index, 'unit', e.target.value)} className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-brand-500 focus:border-brand-500">
                                      <option>kg</option>
                                      <option>g</option>
                                      <option>L</option>
                                      <option>ml</option>
                                      <option>pieces</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Expiry Date <span className="text-red-500">*</span></label>
                                  <input type="date" required value={material.expiryDate} onChange={e => updateRawMaterial(index, 'expiryDate', e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500" />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Storage Needs</label>
                                  <select value={material.storageType} onChange={e => updateRawMaterial(index, 'storageType', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500">
                                    <option>Room temp</option>
                                    <option>Refrigerated</option>
                                    <option>Frozen</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                                  <input type="text" placeholder="Brand, condition..." value={material.notes} onChange={e => updateRawMaterial(index, 'notes', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 placeholder-gray-400 dark:placeholder-gray-500" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button type="submit" className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-3 bg-brand-600 text-base font-medium text-gray-100 hover:bg-brand-700 focus:outline-none sm:col-start-2 sm:text-sm">
                      Post Donation
                    </button>
                    <button type="button" onClick={() => setShowAddModal(false)} className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-3 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:col-start-1 sm:text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
