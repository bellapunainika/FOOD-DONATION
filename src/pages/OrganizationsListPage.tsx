import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, Users, BarChart3, Calendar, ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReceivedDonation {
  id: string;
  organizationName: string;
  foodType: string;
  quantityInMeals: number;
  donorName: string;
  status: 'pending' | 'received' | 'distributed';
  receivedAt?: number;
  createdAt: number;
}

export default function OrganizationsListPage() {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<ReceivedDonation[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<ReceivedDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'received' | 'distributed'>('all');
  const [totalMealsDistributed, setTotalMealsDistributed] = useState(0);
  const [activeOrganizations, setActiveOrganizations] = useState(0);
  const [totalMealsReceived, setTotalMealsReceived] = useState(0);

  useEffect(() => {
    const qDonations = query(collection(db, 'donations'));
    const unsubscribe = onSnapshot(qDonations, (snapshot) => {
      const donationsList: ReceivedDonation[] = [];
      let distributedCount = 0;
      let receivedCount = 0;
      const uniqueOrgs = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        donationsList.push({
          id: doc.id,
          organizationName: data.organizationName || 'Unknown Organization',
          foodType: data.foodType || 'Food',
          quantityInMeals: data.quantityInMeals || 0,
          donorName: data.donorName || 'Unknown Donor',
          status: data.status || 'pending',
          receivedAt: data.receivedAt,
          createdAt: data.createdAt || Date.now(),
        } as ReceivedDonation);

        if (data.status === 'delivered') {
          distributedCount += data.quantityInMeals || 0;
        }
        if (data.status !== 'pending') {
          receivedCount += data.quantityInMeals || 0;
        }
        if (data.organizationId) {
          uniqueOrgs.add(data.organizationId);
        }
      });

      setDonations(donationsList);
      setTotalMealsDistributed(distributedCount);
      setTotalMealsReceived(receivedCount);
      setActiveOrganizations(uniqueOrgs.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedStatus === 'all') {
      setFilteredDonations(donations);
    } else {
      setFilteredDonations(donations.filter(d => d.status === selectedStatus));
    }
  }, [selectedStatus, donations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'received':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'distributed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'received':
        return '📦';
      case 'distributed':
        return '✓';
      default:
        return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header */}
      <section className="bg-gradient-to-r from-brand-600 to-pink-600 dark:from-brand-900 dark:to-pink-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Heart size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Partner Organizations</h1>
              <p className="text-pink-100">Distributing hope and nourishment</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <p className="text-pink-100 text-sm font-medium">Meals Distributed</p>
              <p className="text-3xl font-bold mt-2">{totalMealsDistributed.toLocaleString()}+</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <p className="text-pink-100 text-sm font-medium">Active Organizations</p>
              <p className="text-3xl font-bold mt-2">{activeOrganizations}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <p className="text-pink-100 text-sm font-medium">Meals Received</p>
              <p className="text-3xl font-bold mt-2">{totalMealsReceived.toLocaleString()}+</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          {(['all', 'pending', 'received', 'distributed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                selectedStatus === status
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Donations Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No donations received yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDonations.map((donation) => (
              <div
                key={donation.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200 mb-1">
                      {donation.organizationName}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      From: {donation.donorName}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${getStatusColor(
                      donation.status
                    )}`}
                  >
                    {getStatusIcon(donation.status)} {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <BarChart3 size={18} className="text-brand-600 flex-shrink-0" />
                    <span className="font-semibold">{donation.quantityInMeals} meals received</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Heart size={18} className="text-brand-600 flex-shrink-0" />
                    <span>{donation.foodType}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Calendar size={18} className="text-brand-600 flex-shrink-0" />
                    <span>
                      {new Date(donation.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-brand-500 to-pink-500 h-2 rounded-full"
                      style={{ width: `${Math.min((donation.quantityInMeals / 1000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Distribution Progress</p>
                </div>

                <button className="w-full mt-4 bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-700 hover:to-pink-700 text-gray-100 font-semibold py-2 rounded-lg transition-all group-hover:shadow-lg">
                  View Impact
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
