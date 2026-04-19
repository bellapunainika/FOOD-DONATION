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

const getRoleBgColor = (role: string) => {
  switch (role) {
    case 'donor':        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    case 'organizations':return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'volunteer':    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
    default:             return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'donor':         return 'Donor';
    case 'organizations': return 'Organization';
    case 'volunteer':     return 'Volunteer';
    default:              return role;
  }
};

export default function ProfileHeader({ user, onEditClick, onPhotoUpdate, isUpdating = false }: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayName = user.fullName || user.organizationName || user.email;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-6 transition-colors duration-300">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Avatar */}
        <div className="flex flex-col items-center md:items-start">
          <div className="relative group">
            <div className="h-32 w-32 bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/40 dark:to-brand-800/20 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
              {user.idProofUrl && (
                <img src={user.idProofUrl} alt="Profile" className="h-full w-full object-cover" />
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
                    toast.success('Photo updated successfully');
                  }}
                  disabled={isUpdating}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdating}
                  className="absolute bottom-0 right-0 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-105"
                  title="Upload photo"
                >
                  <Upload size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
              <div className={`inline-flex w-fit px-3 py-1.5 rounded-full font-semibold text-sm ${getRoleBgColor(user.role)}`}>
                {getRoleLabel(user.role)}
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Member since <strong>{new Date(user.createdAt).toLocaleDateString()}</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.email && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Email</span>
                  <span className="text-gray-900 dark:text-white font-medium">{user.email}</span>
                </div>
              )}
              {user.phoneNumber && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Phone</span>
                  <span className="text-gray-900 dark:text-white font-medium">{user.phoneNumber}</span>
                </div>
              )}
              {user.location && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Location</span>
                  <span className="text-gray-900 dark:text-white font-medium">{user.location.city || user.location.address}</span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Verification Status</span>
                <div className="flex items-center gap-2">
                  {user.idProofUrl ? (
                    <>
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                      <span className="text-green-700 dark:text-green-400 font-medium">Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                      <span className="text-yellow-700 dark:text-yellow-400 font-medium">Not Verified</span>
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
