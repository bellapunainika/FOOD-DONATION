import React from 'react';
import { Heart, Zap, TrendingUp } from 'lucide-react';
import { UserProfile } from '../../../types';

interface OverviewProps {
  user: UserProfile;
  stats?: {
    totalContributions: number;
    memberSince: string;
    status: string;
  };
}

export default function Overview({ user, stats }: OverviewProps) {
  const getUserTagline = (): string => {
    switch (user.role) {
      case 'donor':
        return user.donorType
          ? `${user.donorType} committed to reducing food waste`
          : 'Making a difference by sharing surplus food';
      case 'organizations':
        return `Supporting the community through ${user.organizationsType || 'collective efforts'}`;
      case 'volunteer':
        return 'Dedicated to delivering hope and nourishment';
      default:
        return 'Contributing to our food donation mission';
    }
  };

  const getTotalContributions = (): number => {
    // This would be fetched from Firestore in a real app
    return stats?.totalContributions || 0;
  };

  return (
    <div className="space-y-6">
      {/* Tagline */}
      <div className="bg-gradient-to-r from-brand-50 to-blue-50 rounded-2xl border border-brand-200 p-6">
        <p className="text-lg text-brand-900 font-medium italic">
          "{getUserTagline()}"
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Contributions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Total Contributions
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {getTotalContributions()}
              </p>
            </div>
            <div className="bg-brand-100 p-3 rounded-full">
              <Heart className="text-brand-600" size={24} />
            </div>
          </div>
        </div>

        {/* Member Since */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Member Since</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Zap className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Current Status</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    user.role === 'volunteer' && user.isAvailable
                      ? 'bg-green-500'
                      : 'bg-gray-400'
                  }`}
                ></span>
                <p className="font-bold text-gray-900">
                  {user.role === 'volunteer'
                    ? user.isAvailable
                      ? 'Available'
                      : 'Unavailable'
                    : 'Active'}
                </p>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">About You</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {user.fullName && (
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Full Name</p>
              <p className="text-gray-900 font-semibold">{user.fullName}</p>
            </div>
          )}
          {user.organizationName && (
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">
                Organization
              </p>
              <p className="text-gray-900 font-semibold">
                {user.organizationName}
              </p>
            </div>
          )}
          {user.donorType && (
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">
                Donor Type
              </p>
              <p className="text-gray-900 font-semibold">{user.donorType}</p>
            </div>
          )}
          {user.organizationsType && (
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Type</p>
              <p className="text-gray-900 font-semibold">
                {user.organizationsType}
              </p>
            </div>
          )}
          {user.capacityMealsPerDay && (
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">
                Capacity
              </p>
              <p className="text-gray-900 font-semibold">
                {user.capacityMealsPerDay} meals/day
              </p>
            </div>
          )}
          {user.availableVehicles !== undefined && (
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">
                Vehicles
              </p>
              <p className="text-gray-900 font-semibold">
                {user.availableVehicles ? 'Yes' : 'No'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
