import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Package, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Donation {
  id: string;
  donorName: string;
  foodType: string;
  quantityInMeals: number;
  location: string;
  status: 'pending' | 'picked' | 'delivered';
  createdAt: number;
  pickupTime?: string;
}

export default function DonorsListPage() {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'picked' | 'delivered'>('all');
  const [totalMeals, setTotalMeals] = useState(0);
  const [activeDonors, setActiveDonors] = useState(0);

  useEffect(() => {
    const qDonations = query(collection(db, 'donations'));
    const unsubscribe = onSnapshot(qDonations, (snapshot) => {
      const donationsList: Donation[] = [];
      let mealCount = 0;
      const uniqueDonors = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        donationsList.push({
          id: doc.id,
          ...data,
        } as Donation);
        if (data.status === 'delivered') {
          mealCount += data.quantityInMeals || 0;
        }
        if (data.donorId) {
          uniqueDonors.add(data.donorId);
        }
      });

      setDonations(donationsList);
      setTotalMeals(mealCount);
      setActiveDonors(uniqueDonors.size);
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
      case 'picked':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'delivered':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'picked':
        return '🚚';
      case 'delivered':
        return '✓';
      default:
        return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 text-white py-12 px-4">
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
              <MapPin size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Our Donors</h1>
              <p className="text-blue-100">Restaurants & events making a difference</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm font-medium">Total Meals Served</p>
              <p className="text-3xl font-bold mt-2">{totalMeals.toLocaleString()}+</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm font-medium">Active Donors</p>
              <p className="text-3xl font-bold mt-2">{activeDonors}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm font-medium">Active Donations</p>
              <p className="text-3xl font-bold mt-2">{filteredDonations.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          {(['all', 'pending', 'picked', 'delivered'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white shadow-lg'
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No donations found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDonations.map((donation) => (
              <div
                key={donation.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200 mb-1">
                      {donation.foodType}
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
                    <Package size={18} className="text-blue-600 flex-shrink-0" />
                    <span className="font-semibold">{donation.quantityInMeals} meals</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <MapPin size={18} className="text-blue-600 flex-shrink-0" />
                    <span>{donation.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Calendar size={18} className="text-blue-600 flex-shrink-0" />
                    <span>
                      {new Date(donation.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {donation.pickupTime && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Pickup Time:</strong> {donation.pickupTime}
                    </p>
                  </div>
                )}

                <button className="w-full bg-blue-600 hover:bg-blue-700 text-gray-100 font-semibold py-2 rounded-lg transition-colors">
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
