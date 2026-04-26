import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserData } from '../../hooks/useUserData';
import DonorProfile from './DonorProfile';
import OrganizationProfile from './OrganizationProfile';
import VolunteerProfile from './VolunteerProfile';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { user, loading, error } = useUserData(currentUser?.uid);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Profile
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'Unable to load your profile. Please try again.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  switch (user.role) {
    case 'donor':
      return <DonorProfile user={user} onLogout={handleLogout} />;
    case 'organizations':
      return <OrganizationProfile user={user} onLogout={handleLogout} />;
    case 'volunteer':
      return <VolunteerProfile user={user} onLogout={handleLogout} />;
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Role
            </h1>
            <p className="text-gray-600 mb-6">Your user role is not recognized.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
  }
}
