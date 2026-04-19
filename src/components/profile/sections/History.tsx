import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Package, TrendingUp } from 'lucide-react';
import { UserProfile, FoodDonation } from '../../../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

interface HistoryItem {
  id: string; title: string; date: number;
  quantity: number; status: string;
  location?: string; category?: string;
}

interface HistoryProps { user: UserProfile; }

const cardCls = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors duration-300';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'delivered': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'expired':   return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    default:          return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
};
const getStatusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');

export default function History({ user }: HistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '7days' | '30days' | '90days'>('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, 'donations'), where('donorId', '==', user.uid), where('status', 'in', ['delivered', 'expired']));
        const snap = await getDocs(q);
        const items: HistoryItem[] = [];
        snap.forEach(doc => {
          const d = doc.data() as FoodDonation;
          items.push({ id: doc.id, title: `${d.foodCategory} - ${d.foodType}`, date: d.createdAt, quantity: d.quantityInMeals, status: d.status, location: d.location?.city || d.location?.address, category: d.foodCategory });
        });
        setHistory(items.sort((a, b) => b.date - a.date));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetch();
  }, [user.uid]);

  const filtered = (() => {
    const now = Date.now(), d = 86400000;
    if (filter === '7days')  return history.filter(i => now - i.date <= 7 * d);
    if (filter === '30days') return history.filter(i => now - i.date <= 30 * d);
    if (filter === '90days') return history.filter(i => now - i.date <= 90 * d);
    return history;
  })();
  const totalMeals = filtered.reduce((s, i) => s + i.quantity, 0);

  if (loading) return (
    <div className={`${cardCls} p-8 text-center`}>
      <p className="text-gray-600 dark:text-gray-400">Loading history…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Donations', value: filtered.length },
          { label: 'Total Meals',     value: totalMeals },
          { label: 'Avg. Per Donation', value: filtered.length > 0 ? Math.round(totalMeals / filtered.length) : 0 },
        ].map(({ label, value }) => (
          <div key={label} className={`${cardCls} p-4`}>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={`${cardCls} !rounded-2xl p-4`}>
        <div className="flex gap-2 overflow-x-auto">
          {(['all', '7days', '30days', '90days'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {f === 'all' ? 'All Time' : f === '7days' ? 'Last 7 Days' : f === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className={`${cardCls} p-4 hover:shadow-md`}>
              <div className="flex items-start justify-between flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-brand-100 dark:bg-brand-900/30 p-2.5 rounded-lg">
                      <Package className="text-brand-600 dark:text-brand-400" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {item.location && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 ml-11">
                      <MapPin size={16} className="text-gray-400 dark:text-gray-500" /> {item.location}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Quantity</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{item.quantity} meals</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${cardCls} !rounded-2xl p-12 text-center`}>
          <TrendingUp className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
          <p className="text-gray-600 dark:text-gray-400 font-medium">No donations yet</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Your donation history will appear here</p>
        </div>
      )}
    </div>
  );
}
