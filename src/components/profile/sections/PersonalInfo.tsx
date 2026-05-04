import React, { useState } from 'react';
import { Mail, Phone, MapPin, Building, Save, X } from 'lucide-react';
import { UserProfile } from '../../../types';
import toast from 'react-hot-toast';

interface PersonalInfoProps {
  user: UserProfile;
  onSave: (updatedUser: Partial<UserProfile>) => Promise<void>;
  isLoading?: boolean;
}

const inputCls =
  'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors';

const labelCls = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2';
const rowCls   = 'flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700';

export default function PersonalInfo({ user, onSave, isLoading = false }: PersonalInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName:         user.fullName || '',
    organizationName: user.organizationName || '',
    phoneNumber:      user.phoneNumber || '',
    address:          user.location?.address || '',
    city:             user.location?.city || '',
    pincode:          user.location?.pincode || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await onSave({
        fullName:         formData.fullName || undefined,
        organizationName: formData.organizationName || undefined,
        phoneNumber:      formData.phoneNumber || undefined,
        location: {
          address: formData.address,
          city:    formData.city,
          pincode: formData.pincode,
          lat:     user.location?.lat || 0,
          lng:     user.location?.lng || 0,
        },
      });
      setIsEditing(false);
      toast.success('Personal info updated successfully!');
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const cardCls = 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300';

  if (!isEditing) {
    return (
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200">Personal Information</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-gray-100 rounded-lg font-medium transition-colors"
          >
            Edit
          </button>
        </div>

        <div className="space-y-4">
          {user.fullName && (
            <div className={rowCls}>
              <Mail className="text-gray-400 dark:text-gray-500 mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Full Name</p>
                <p className="text-gray-900 dark:text-gray-200 font-medium">{user.fullName}</p>
              </div>
            </div>
          )}
          {user.organizationName && (
            <div className={rowCls}>
              <Building className="text-gray-400 dark:text-gray-500 mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Organization Name</p>
                <p className="text-gray-900 dark:text-gray-200 font-medium">{user.organizationName}</p>
              </div>
            </div>
          )}
          <div className={rowCls}>
            <Mail className="text-gray-400 dark:text-gray-500 mt-1" size={20} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email Address</p>
              <p className="text-gray-900 dark:text-gray-200 font-medium">{user.email}</p>
            </div>
          </div>
          {user.phoneNumber && (
            <div className={rowCls}>
              <Phone className="text-gray-400 dark:text-gray-500 mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Phone Number</p>
                <p className="text-gray-900 dark:text-gray-200 font-medium">{user.phoneNumber}</p>
              </div>
            </div>
          )}
          {user.location && (
            <div className="flex items-start gap-4">
              <MapPin className="text-gray-400 dark:text-gray-500 mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Address</p>
                <p className="text-gray-900 dark:text-gray-200 font-medium">{user.location.address}</p>
                {user.location.city && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {user.location.city}{user.location.pincode && ` - ${user.location.pincode}`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200">Edit Personal Info</h3>
      </div>

      <div className="space-y-5">
        <div>
          <label className={labelCls}>Full Name</label>
          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={inputCls} placeholder="Your full name" />
        </div>
        {(user.role === 'organizations' || user.role === 'donor') && (
          <div>
            <label className={labelCls}>Organization Name</label>
            <input type="text" name="organizationName" value={formData.organizationName} onChange={handleChange} className={inputCls} placeholder="Organization name" />
          </div>
        )}
        <div>
          <label className={labelCls}>Phone Number</label>
          <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className={inputCls} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputCls} placeholder="Street address" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} className={inputCls} placeholder="City" />
          </div>
          <div>
            <label className={labelCls}>Pincode</label>
            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className={inputCls} placeholder="000000" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-gray-100 rounded-lg font-medium transition-colors">
          <Save size={18} /> Save Changes
        </button>
        <button onClick={() => setIsEditing(false)} disabled={isLoading} className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors">
          <X size={18} /> Cancel
        </button>
      </div>
    </div>
  );
}
