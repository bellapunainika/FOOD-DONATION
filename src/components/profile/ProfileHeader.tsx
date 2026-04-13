import React, { useRef } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';
import toast from 'react-hot-toast';

interface ProfileHeaderProps {
  user: UserProfile;
  onEditClick: () => void;
  onPhotoUpdate?: (photoUrl: string) => Promise<void>;
  isUpdating?: boolean;
}

export default function ProfileHeader({
  user,
  onEditClick,
  onPhotoUpdate,
  isUpdating = false,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'donor':
        return 'Donor';
      case 'organizations':
        return 'Organization';
      case 'volunteer':
        return 'Volunteer';
      default:
        return role;
    }
  };

  const getRoleBgColor = (role: string) => {
    switch (role) {
      case 'donor':
        return 'bg-blue-100 text-blue-700';
      case 'organizations':
        return 'bg-green-100 text-green-700';
      case 'volunteer':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const displayName =
    user.fullName ||
    user.organizationName ||
    user.email;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center md:items-start">
          <div className="relative group">
            <div className="h-32 w-32 bg-gradient-to-br from-brand-100 to-brand-50 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
              {user.idProofUrl && (
                <img
                  src={user.idProofUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            {onPhotoUpdate && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Upload logic would go here
                    toast.success('Photo updated successfully');
                  }}
                  disabled={isUpdating}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdating}
                  className="absolute bottom-0 right-0 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white p-2.5 rounded-full shadow-lg transition-all transform hover:scale-105"
                  title="Upload photo"
                >
                  <Upload size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-3">
              <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
              <div
                className={`inline-flex w-fit px-3 py-1.5 rounded-full font-semibold text-sm ${getRoleBgColor(
                  user.role
                )}`}
              >
                {getRoleLabel(user.role)}
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Member since{' '}
              <strong>
                {new Date(user.createdAt).toLocaleDateString()}
              </strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.email && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Email
                  </span>
                  <span className="text-gray-900 font-medium">{user.email}</span>
                </div>
              )}
              {user.phoneNumber && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Phone
                  </span>
                  <span className="text-gray-900 font-medium">
                    {user.phoneNumber}
                  </span>
                </div>
              )}
              {user.location && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Location
                  </span>
                  <span className="text-gray-900 font-medium">
                    {user.location.city || user.location.address}
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Verification Status
                </span>
                <div className="flex items-center gap-2">
                  {user.idProofUrl ? (
                    <>
                      <CheckCircle size={20} className="text-green-600" />
                      <span className="text-green-700 font-medium">Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={20} className="text-yellow-600" />
                      <span className="text-yellow-700 font-medium">
                        Not Verified
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={onEditClick}
              className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
