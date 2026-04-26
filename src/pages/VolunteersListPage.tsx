import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Navigation, Zap, Award, Clock, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Delivery {
  id: string;
  volunteerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  quantityInMeals: number;
  status: 'pending' | 'in-transit' | 'delivered';
  completedAt?: number;
  createdAt: number;
  distance?: number;
}

export default function VolunteersListPage() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'in-transit' | 'delivered'>('all');
  const [completedDeliveries, setCompletedDeliveries] = useState(0);
  const [activeVolunteers, setActiveVolunteers] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);

  useEffect(() => {
    const qDeliveries = query(collection(db, 'deliveries'));
    const unsubscribe = onSnapshot(qDeliveries, (snapshot) => {
      const deliveriesList: Delivery[] = [];
      let completed = 0;
      let distance = 0;
      const uniqueVolunteers = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        deliveriesList.push({
          id: doc.id,
          volunteerName: data.volunteerName || 'Anonymous Volunteer',
          pickupLocation: data.pickupLocation || 'Location',
          dropoffLocation: data.dropoffLocation || 'Destination',
          quantityInMeals: data.quantityInMeals || 0,
          status: data.status || 'pending',
          completedAt: data.completedAt,
          createdAt: data.createdAt || Date.now(),
          distance: data.distance || 0,
        } as Delivery);

        if (data.status === 'delivered') {
          completed += 1;
        }
        if (data.distance) {
          distance += data.distance;
        }
        if (data.volunteerId) {
          uniqueVolunteers.add(data.volunteerId);
        }
      });

      setDeliveries(deliveriesList);
      setCompletedDeliveries(completed);
      setTotalDistance(distance);
      setActiveVolunteers(uniqueVolunteers.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedStatus === 'all') {
      setFilteredDeliveries(deliveries);
    } else {
      setFilteredDeliveries(deliveries.filter(d => d.status === selectedStatus));
    }
  }, [selectedStatus, deliveries]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'in-transit':
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
      case 'in-transit':
        return '🚗';
      case 'delivered':
        return '✓';
      default:
        return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header */}
      <section className="bg-gradient-to-r from-yellow-500 to-orange-600 dark:from-yellow-700 dark:to-orange-800 text-white py-12 px-4">
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
              <Navigation size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Our Volunteers</h1>
              <p className="text-yellow-100">Delivering hope, one meal at a time</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-yellow-100" />
                <p className="text-yellow-100 text-sm font-medium">Deliveries Completed</p>
              </div>
              <p className="text-3xl font-bold mt-2">{completedDeliveries}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-yellow-100" />
                <p className="text-yellow-100 text-sm font-medium">Active Volunteers</p>
              </div>
              <p className="text-3xl font-bold mt-2">{activeVolunteers}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-yellow-100" />
                <p className="text-yellow-100 text-sm font-medium">Distance Covered</p>
              </div>
              <p className="text-3xl font-bold mt-2">{totalDistance.toFixed(1)} km</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          {(['all', 'pending', 'in-transit', 'delivered'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                selectedStatus === status
                  ? 'bg-yellow-500 text-white shadow-lg hover:bg-yellow-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md'
              }`}
            >
              {status === 'in-transit' ? 'In Transit' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Deliveries Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="text-center py-12">
            <Navigation size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No deliveries found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700 group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-400 opacity-10 rounded-bl-3xl"></div>

                <div className="relative flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200 mb-1">
                      {delivery.volunteerName}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Delivery ID: #{delivery.id.substring(0, 8)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${getStatusColor(
                      delivery.status
                    )}`}
                  >
                    {getStatusIcon(delivery.status)}{' '}
                    {delivery.status === 'in-transit' ? 'In Transit' : delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600 dark:text-yellow-400 font-bold text-xl">📍</div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">PICKUP</p>
                      <p className="text-gray-700 dark:text-gray-300 font-semibold">{delivery.pickupLocation}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-10 text-yellow-600 dark:text-yellow-400">
                    <div className="flex-1 h-0.5 bg-yellow-300 dark:bg-yellow-700"></div>
                    <Navigation size={16} className="rotate-180" />
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600 dark:text-yellow-400 font-bold text-xl">📌</div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">DROPOFF</p>
                      <p className="text-gray-700 dark:text-gray-300 font-semibold">{delivery.dropoffLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">MEALS</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{delivery.quantityInMeals}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">DISTANCE</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{delivery.distance?.toFixed(1)} km</p>
                  </div>
                </div>

                {delivery.completedAt && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ Completed on{' '}
                      {new Date(delivery.completedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-100 font-semibold py-2 rounded-lg transition-all group-hover:shadow-lg">
                  Track Delivery
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
