import React from 'react';
import { Heart, Zap, TrendingUp } from 'lucide-react';
import { UserProfile } from '../../../types';

interface OverviewProps {
  user: UserProfile;
  stats?: { totalContributions: number; memberSince: string; status: string };
}

const cardCls = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300';
const labelCls = 'text-gray-600 dark:text-gray-400 text-sm font-medium';
const valueCls = 'text-gray-900 dark:text-white font-semibold';

export default function Overview({ user, stats }: OverviewProps) {
  const tagline = (): string => {
    switch (user.role) {
      case 'donor':       return user.donorType ? `${user.donorType} committed to reducing food waste` : 'Making a difference by sharing surplus food';
      case 'organizations': return `Supporting the community through ${user.organizationsType || 'collective efforts'}`;
      case 'volunteer':   return 'Dedicated to delivering hope and nourishment';
      default:            return 'Contributing to our food donation mission';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tagline */}
      <div className="bg-gradient-to-r from-brand-50 to-blue-50 dark:from-brand-900/20 dark:to-blue-900/20 rounded-2xl border border-brand-200 dark:border-brand-700 p-6">
        <p className="text-lg text-brand-900 dark:text-brand-300 font-medium italic">
          "{tagline()}"
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <p className={labelCls}>Total Contributions</p>
              <p className={`text-3xl font-bold mt-2 ${valueCls}`}>{stats?.totalContributions || 0}</p>
            </div>
            <div className="bg-brand-100 dark:bg-brand-900/30 p-3 rounded-full">
              <Heart className="text-brand-600 dark:text-brand-400" size={24} />
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <p className={labelCls}>Member Since</p>
              <p className={`text-lg font-bold mt-2 ${valueCls}`}>
                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <Zap className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <p className={labelCls}>Current Status</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block h-2 w-2 rounded-full ${user.role === 'volunteer' && user.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                <p className={`font-bold ${valueCls}`}>
                  {user.role === 'volunteer' ? (user.isAvailable ? 'Available' : 'Unavailable') : 'Active'}
                </p>
              </div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className={cardCls + ' !rounded-2xl'}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About You</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Full Name',         value: user.fullName },
            { label: 'Organization',      value: user.organizationName },
            { label: 'Donor Type',        value: user.donorType },
            { label: 'Type',              value: user.organizationsType },
            { label: 'Capacity',          value: user.capacityMealsPerDay ? `${user.capacityMealsPerDay} meals/day` : undefined },
            { label: 'Vehicles',          value: user.availableVehicles !== undefined ? (user.availableVehicles ? 'Yes' : 'No') : undefined },
          ].filter(f => f.value).map(({ label, value }) => (
            <div key={label}>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{label}</p>
              <p className="text-gray-900 dark:text-white font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
