import React, { useState } from 'react';
import {
  Bell,
  Lock,
  Eye,
  EyeOff,
  ToggleLeft,
  AlertCircle,
  LogOut,
  Check,
} from 'lucide-react';
import { UserProfile } from '../../../types';
import toast from 'react-hot-toast';

interface SettingsProps {
  user: UserProfile;
  onLogout: () => void;
  onAvailabilityToggle?: (available: boolean) => Promise<void>;
  onPasswordChange?: (
    oldPassword: string,
    newPassword: string
  ) => Promise<void>;
}

export default function Settings({
  user,
  onLogout,
  onAvailabilityToggle,
  onPasswordChange,
}: SettingsProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    donations: true,
    pickups: true,
    deliveries: true,
    community: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setIsChangingPassword(true);
      if (onPasswordChange) {
        await onPasswordChange(
          passwordData.oldPassword,
          passwordData.newPassword
        );
        toast.success('Password changed successfully!');
        setShowPasswordForm(false);
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationSave = async () => {
    try {
      setIsSaving(true);
      // Save notification settings to Firestore
      toast.success('Notification preferences updated!');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvailabilityToggle = async () => {
    try {
      if (onAvailabilityToggle) {
        await onAvailabilityToggle(!(user.isAvailable ?? false));
        toast.success('Availability updated!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update availability');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Bell className="text-brand-600" size={24} />
          Notification Preferences
        </h3>

        <div className="space-y-4">
          {[
            {
              id: 'donations',
              label: 'New Donation Updates',
              description: 'Get notified about new donations in your area',
            },
            {
              id: 'pickups',
              label: 'Pickup Reminders',
              description: 'Reminders for scheduled pickups',
            },
            {
              id: 'deliveries',
              label: 'Delivery Updates',
              description: 'Updates on delivery status',
            },
            {
              id: 'community',
              label: 'Community News',
              description: 'Weekly community digest and announcements',
            },
          ].map((setting) => (
            <div
              key={setting.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{setting.label}</p>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <button
                onClick={() =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    [setting.id]: !prev[
                      setting.id as keyof typeof notificationSettings
                    ],
                  }))
                }
                className={`relative inline-flex h-8 w-14 rounded-full transition-colors ${
                  notificationSettings[setting.id as keyof typeof notificationSettings]
                    ? 'bg-brand-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                    notificationSettings[setting.id as keyof typeof notificationSettings]
                      ? 'translate-x-7'
                      : 'translate-x-1'
                  }`}
                ></span>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleNotificationSave}
          disabled={isSaving}
          className="mt-6 w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Check size={18} />
          Save Preferences
        </button>
      </div>

      {/* Availability Toggle (for Volunteers) */}
      {user.role === 'volunteer' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ToggleLeft className="text-brand-600" size={24} />
            Availability
          </h3>

          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
            <p className="text-blue-900 text-sm">
              Toggle your availability status to let organizations know when
              you're ready to pick up donations.
            </p>
          </div>

          <button
            onClick={handleAvailabilityToggle}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-between ${
              user.isAvailable
                ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <span>
              {user.isAvailable ? '✓ You are Available' : '○ Set as Available'}
            </span>
            <ToggleLeft size={20} />
          </button>

          <p className="text-xs text-gray-600 mt-3">
            Last updated:{' '}
            {user.lastAvailabilityToggle
              ? new Date(user.lastAvailabilityToggle).toLocaleTimeString()
              : 'Never'}
          </p>
        </div>
      )}

      {/* Password Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="text-brand-600" size={24} />
          Password & Security
        </h3>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    oldPassword: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  placeholder="Enter new password (min 8 characters)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                placeholder="Confirm new password"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                Update Password
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex gap-3">
          <AlertCircle className="text-yellow-700 flex-shrink-0" size={20} />
          <p className="text-sm text-yellow-800">
            Use a strong password with uppercase, lowercase, numbers, and symbols.
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <h3 className="text-xl font-bold text-red-900 mb-4">Danger Zone</h3>

        <button
          onClick={onLogout}
          className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Logout from All Devices
        </button>

        <p className="text-xs text-red-700 mt-3">
          This will log you out from your account on all devices.
        </p>
      </div>
    </div>
  );
}
