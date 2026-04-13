import React, { useEffect, useState } from 'react';
import { Star, Award, Trophy, Flame } from 'lucide-react';
import { UserProfile } from '../../../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlockedAt?: number;
  requirement?: string;
}

interface AchievementsProps {
  user: UserProfile;
}

export default function Achievements({ user }: AchievementsProps) {
  const [totalMeals, setTotalMeals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(
          collection(db, 'donations'),
          where('donorId', '==', user.uid),
          where('status', '==', 'delivered')
        );

        const snapshot = await getDocs(q);
        let total = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          total += data.quantityInMeals || 0;
        });

        setTotalMeals(total);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user.uid]);

  const getBadges = (): Badge[] => {
    const badges: Badge[] = [
      {
        id: 'first_donation',
        name: 'First Step',
        description: 'Made your first donation',
        icon: <Award className="text-blue-500" size={32} />,
        requirement: 'Make 1 donation',
      },
      {
        id: 'meal_milestone_10',
        name: 'Hunger Fighter',
        description: 'Donated 10 meals',
        icon: <Flame className="text-orange-500" size={32} />,
        requirement: 'Donate 10 meals',
      },
      {
        id: 'meal_milestone_50',
        name: 'Hunger Hero',
        description: 'Donated 50 meals',
        icon: <Trophy className="text-yellow-500" size={32} />,
        requirement: 'Donate 50 meals',
      },
      {
        id: 'meal_milestone_100',
        name: 'Legend of Generosity',
        description: 'Donated 100+ meals',
        icon: <Star className="text-purple-500" size={32} />,
        requirement: 'Donate 100 meals',
      },
    ];

    return badges;
  };

  const getUnlockedBadges = () => {
    const badges = getBadges();
    return badges.filter((badge) => {
      if (badge.id === 'first_donation' && totalMeals > 0) return true;
      if (badge.id === 'meal_milestone_10' && totalMeals >= 10) return true;
      if (badge.id === 'meal_milestone_50' && totalMeals >= 50) return true;
      if (badge.id === 'meal_milestone_100' && totalMeals >= 100) return true;
      return false;
    });
  };

  const getLockedBadges = () => {
    const badges = getBadges();
    return badges.filter((badge) => {
      if (badge.id === 'first_donation' && totalMeals > 0) return false;
      if (badge.id === 'meal_milestone_10' && totalMeals >= 10) return false;
      if (badge.id === 'meal_milestone_50' && totalMeals >= 50) return false;
      if (badge.id === 'meal_milestone_100' && totalMeals >= 100) return false;
      return true;
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Loading achievements...</p>
      </div>
    );
  }

  const unlockedBadges = getUnlockedBadges();
  const lockedBadges = getLockedBadges();

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-brand-50 to-blue-50 rounded-xl border border-brand-200 p-6">
          <p className="text-brand-700 text-sm font-semibold">Total Meals Donated</p>
          <p className="text-4xl font-bold text-brand-900 mt-2">{totalMeals}</p>
          <div className="mt-2 h-2 bg-brand-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-blue-500 rounded-full transition-all"
              style={{
                width: `${Math.min((totalMeals / 100) * 100, 100)}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-semibold">Badges Earned</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">
            {unlockedBadges.length}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            of {getBadges().length} available
          </p>
        </div>

        {user.role === 'volunteer' ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-600 text-sm font-semibold">
              Status
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  user.isAvailable
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-gray-400'
                }`}
              ></span>
              <p className="text-lg font-bold text-gray-900">
                {user.isAvailable ? 'Available' : 'Unavailable'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-600 text-sm font-semibold">Next Milestone</p>
            <p className="text-lg font-bold text-gray-900 mt-2">
              {totalMeals < 10
                ? `${10 - totalMeals} meals to "Hunger Fighter"`
                : totalMeals < 50
                  ? `${50 - totalMeals} meals to "Hunger Hero"`
                  : totalMeals < 100
                    ? `${100 - totalMeals} meals to "Legend"`
                    : '🏆 You have all badges!'}
            </p>
          </div>
        )}
      </div>

      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            🏆 Badges Earned ({unlockedBadges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unlockedBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-6 transform hover:scale-105 transition-transform"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg">
                      {badge.name}
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">
                      {badge.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            🔒 Locked Badges ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lockedBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-gray-50 rounded-xl border border-gray-200 p-6 opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-200 rounded-lg text-gray-400">
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-600 text-lg">
                      {badge.name}
                    </h4>
                    <p className="text-gray-500 text-sm mt-1">
                      {badge.description}
                    </p>
                    {badge.requirement && (
                      <p className="text-gray-500 text-xs mt-3 font-medium">
                        Requirement: {badge.requirement}
                      </p>
                    )}
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
