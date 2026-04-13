import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Package, TrendingUp } from 'lucide-react';
import { UserProfile, FoodDonation } from '../../../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

interface HistoryItem {
  id: string;
  title: string;
  date: number;
  quantity: number;
  status: string;
  location?: string;
  category?: string;
}

interface HistoryProps {
  user: UserProfile;
}

export default function History({ user }: HistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '7days' | '30days' | '90days'>(
    'all'
  );

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'donations'),
          where('donorId', '==', user.uid),
          where('status', 'in', ['delivered', 'expired'])
        );

        const snapshot = await getDocs(q);
        const items: HistoryItem[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data() as FoodDonation;
          items.push({
            id: doc.id,
            title: `${data.foodCategory} - ${data.foodType}`,
            date: data.createdAt,
            quantity: data.quantityInMeals,
            status: data.status,
            location: data.location?.city || data.location?.address,
            category: data.foodCategory,
          });
        });

        setHistory(items.sort((a, b) => b.date - a.date));
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user.uid]);

  const getFilteredHistory = () => {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    switch (filter) {
      case '7days':
        return history.filter((item) => now - item.date <= 7 * dayInMs);
      case '30days':
        return history.filter((item) => now - item.date <= 30 * dayInMs);
      case '90days':
        return history.filter((item) => now - item.date <= 90 * dayInMs);
      case 'all':
      default:
        return history;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const filteredHistory = getFilteredHistory();
  const totalMeals = filteredHistory.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-gray-600 text-sm font-medium">Total Donations</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {filteredHistory.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-gray-600 text-sm font-medium">Total Meals</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {totalMeals}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-gray-600 text-sm font-medium">Avg. Per Donation</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {filteredHistory.length > 0
              ? Math.round(totalMeals / filteredHistory.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {(['all', '7days', '30days', '90days'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                filter === filterOption
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption === 'all'
                ? 'All Time'
                : filterOption === '7days'
                  ? 'Last 7 Days'
                  : filterOption === '30days'
                    ? 'Last 30 Days'
                    : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-brand-100 p-2.5 rounded-lg">
                      <Package className="text-brand-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {item.location && (
                    <p className="text-sm text-gray-600 flex items-center gap-2 ml-11">
                      <MapPin size={16} className="text-gray-400" />
                      {item.location}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="text-lg font-bold text-gray-900">
                      {item.quantity} meals
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <TrendingUp className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-600 font-medium">No donations yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Your donation history will appear here
          </p>
        </div>
      )}
    </div>
  );
}
