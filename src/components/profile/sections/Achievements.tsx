import React, { useEffect, useState } from 'react';
import { Star, Award, Trophy, Flame } from 'lucide-react';
import { UserProfile } from '../../../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

interface Badge {
  id: string; name: string; description: string;
  icon: React.ReactNode; requirement?: string;
}

const ALL_BADGES: Badge[] = [
  { id: 'first_donation',    name: 'First Step',           description: 'Made your first donation',  icon: <Award  className="text-blue-500"   size={32} />, requirement: 'Make 1 donation'  },
  { id: 'meal_milestone_10', name: 'Hunger Fighter',       description: 'Donated 10 meals',           icon: <Flame  className="text-orange-500" size={32} />, requirement: 'Donate 10 meals' },
  { id: 'meal_milestone_50', name: 'Hunger Hero',          description: 'Donated 50 meals',           icon: <Trophy className="text-yellow-500" size={32} />, requirement: 'Donate 50 meals' },
  { id: 'meal_milestone_100',name: 'Legend of Generosity', description: 'Donated 100+ meals',         icon: <Star   className="text-purple-500" size={32} />, requirement: 'Donate 100 meals'},
];
const isUnlocked = (id: string, meals: number) => {
  if (id === 'first_donation'    && meals > 0)   return true;
  if (id === 'meal_milestone_10' && meals >= 10)  return true;
  if (id === 'meal_milestone_50' && meals >= 50)  return true;
  if (id === 'meal_milestone_100'&& meals >= 100) return true;
  return false;
};

export default function Achievements({ user }: { user: UserProfile }) {
  const [totalMeals, setTotalMeals] = useState(0);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, 'donations'), where('donorId', '==', user.uid), where('status', '==', 'delivered'));
        const snap = await getDocs(q);
        let total = 0;
        snap.forEach(doc => { total += doc.data().quantityInMeals || 0; });
        setTotalMeals(total);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetch();
  }, [user.uid]);

  if (loading) return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
      <p className="text-gray-600 dark:text-gray-400">Loading achievements…</p>
    </div>
  );

  const unlocked = ALL_BADGES.filter(b => isUnlocked(b.id, totalMeals));
  const locked   = ALL_BADGES.filter(b => !isUnlocked(b.id, totalMeals));

  const cardCls = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300';

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-brand-50 to-blue-50 dark:from-brand-900/20 dark:to-blue-900/20 rounded-xl border border-brand-200 dark:border-brand-700 p-6">
          <p className="text-brand-700 dark:text-brand-300 text-sm font-semibold">Total Meals Donated</p>
          <p className="text-4xl font-bold text-brand-900 dark:text-brand-200 mt-2">{totalMeals}</p>
          <div className="mt-2 h-2 bg-brand-200 dark:bg-brand-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-blue-500 rounded-full transition-all" style={{ width: `${Math.min((totalMeals / 100) * 100, 100)}%` }} />
          </div>
        </div>
        <div className={cardCls}>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">Badges Earned</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{unlocked.length}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">of {ALL_BADGES.length} available</p>
        </div>
        <div className={cardCls}>
          {user.role === 'volunteer' ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">Status</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`h-3 w-3 rounded-full ${user.isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <p className="text-lg font-bold text-gray-900 dark:text-white">{user.isAvailable ? 'Available' : 'Unavailable'}</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">Next Milestone</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                {totalMeals < 10 ? `${10 - totalMeals} meals to "Hunger Fighter"` : totalMeals < 50 ? `${50 - totalMeals} meals to "Hunger Hero"` : totalMeals < 100 ? `${100 - totalMeals} meals to "Legend"` : '🏆 You have all badges!'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Unlocked badges */}
      {unlocked.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">🏆 Badges Earned ({unlocked.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unlocked.map(badge => (
              <div key={badge.id} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-700 p-6 hover:scale-105 transition-transform">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">{badge.icon}</div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{badge.name}</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{badge.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">🔒 Locked Badges ({locked.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locked.map(badge => (
              <div key={badge.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-6 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-lg text-gray-400">{badge.icon}</div>
                  <div>
                    <h4 className="font-bold text-gray-600 dark:text-gray-300 text-lg">{badge.name}</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{badge.description}</p>
                    {badge.requirement && <p className="text-gray-500 dark:text-gray-500 text-xs mt-3 font-medium">Requirement: {badge.requirement}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
