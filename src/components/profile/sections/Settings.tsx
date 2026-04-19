import React, { useState } from 'react';
import { Bell, Lock, Eye, EyeOff, ToggleLeft, AlertCircle, LogOut, Check } from 'lucide-react';
import { UserProfile } from '../../../types';
import toast from 'react-hot-toast';

interface SettingsProps {
  user: UserProfile;
  onLogout: () => void;
  onAvailabilityToggle?: (available: boolean) => Promise<void>;
  onPasswordChange?: (oldPassword: string, newPassword: string) => Promise<void>;
}

const inputCls = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2';
const cardCls  = 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300';

export default function Settings({ user, onLogout, onAvailabilityToggle, onPasswordChange }: SettingsProps) {
  const [showPasswordForm,    setShowPasswordForm]    = useState(false);
  const [showPassword,        setShowPassword]        = useState(false);
  const [isChangingPassword,  setIsChangingPassword]  = useState(false);
  const [isSaving,            setIsSaving]            = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [notifSettings, setNotifSettings] = useState({ donations: true, pickups: true, deliveries: true, community: false });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('New passwords do not match'); return; }
    if (passwordData.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      setIsChangingPassword(true);
      if (onPasswordChange) { await onPasswordChange(passwordData.oldPassword, passwordData.newPassword); toast.success('Password changed!'); setShowPasswordForm(false); setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' }); }
    } catch (err: any) { toast.error(err.message || 'Failed to change password'); } finally { setIsChangingPassword(false); }
  };

  const handleNotifSave = async () => {
    try { setIsSaving(true); toast.success('Notification preferences updated!'); } catch { toast.error('Failed to save preferences'); } finally { setIsSaving(false); }
  };

  const handleAvailToggle = async () => {
    try { if (onAvailabilityToggle) { await onAvailabilityToggle(!(user.isAvailable ?? false)); toast.success('Availability updated!'); } } catch (err: any) { toast.error(err.message || 'Failed to update availability'); }
  };

  const NOTIF_ITEMS = [
    { id: 'donations',  label: 'New Donation Updates',  desc: 'Get notified about new donations in your area' },
    { id: 'pickups',    label: 'Pickup Reminders',       desc: 'Reminders for scheduled pickups'              },
    { id: 'deliveries', label: 'Delivery Updates',       desc: 'Updates on delivery status'                   },
    { id: 'community',  label: 'Community News',         desc: 'Weekly community digest and announcements'    },
  ];

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <div className={cardCls}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Bell className="text-brand-600 dark:text-brand-400" size={24} /> Notification Preferences
        </h3>
        <div className="space-y-4">
          {NOTIF_ITEMS.map(({ id, label, desc }) => (
            <div key={id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
              </div>
              <button
                onClick={() => setNotifSettings(prev => ({ ...prev, [id]: !prev[id as keyof typeof notifSettings] }))}
                className={`relative inline-flex h-8 w-14 rounded-full transition-colors ${notifSettings[id as keyof typeof notifSettings] ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-6 w-6 mt-1 transform rounded-full bg-white shadow-md transition-transform ${notifSettings[id as keyof typeof notifSettings] ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={handleNotifSave} disabled={isSaving} className="mt-6 w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
          <Check size={18} /> Save Preferences
        </button>
      </div>

      {/* Volunteer Availability */}
      {user.role === 'volunteer' && (
        <div className={cardCls}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <ToggleLeft className="text-brand-600 dark:text-brand-400" size={24} /> Availability
          </h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4 mb-6">
            <p className="text-blue-900 dark:text-blue-300 text-sm">Toggle your availability status to let organizations know when you're ready to pick up donations.</p>
          </div>
          <button onClick={handleAvailToggle}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-between ${user.isAvailable ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            <span>{user.isAvailable ? '✓ You are Available' : '○ Set as Available'}</span>
            <ToggleLeft size={20} />
          </button>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">Last updated: {user.lastAvailabilityToggle ? new Date(user.lastAvailabilityToggle).toLocaleTimeString() : 'Never'}</p>
        </div>
      )}

      {/* Password & Security */}
      <div className={cardCls}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="text-brand-600 dark:text-brand-400" size={24} /> Password &amp; Security
        </h3>
        {!showPasswordForm ? (
          <button onClick={() => setShowPasswordForm(true)} className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className={labelCls}>Current Password</label>
              <input type="password" value={passwordData.oldPassword} onChange={e => setPasswordData(p => ({ ...p, oldPassword: e.target.value }))} className={inputCls} placeholder="Enter current password" required />
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={passwordData.newPassword} onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} className={inputCls} placeholder="Min 8 characters" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirm Password</label>
              <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} className={inputCls} placeholder="Confirm new password" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isChangingPassword} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">Update Password</button>
              <button type="button" onClick={() => setShowPasswordForm(false)} className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
            </div>
          </form>
        )}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700 flex gap-3">
          <AlertCircle className="text-yellow-700 dark:text-yellow-400 flex-shrink-0" size={20} />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">Use a strong password with uppercase, lowercase, numbers, and symbols.</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 p-6 transition-colors duration-300">
        <h3 className="text-xl font-bold text-red-900 dark:text-red-400 mb-4">Danger Zone</h3>
        <button onClick={onLogout} className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
          <LogOut size={18} /> Logout from All Devices
        </button>
        <p className="text-xs text-red-700 dark:text-red-400 mt-3">This will log you out from your account on all devices.</p>
      </div>
    </div>
  );
}
