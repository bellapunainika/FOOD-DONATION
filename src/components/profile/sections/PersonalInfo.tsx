import React, { useState } from 'react';
import { Mail, Phone, MapPin, Building, Save, X } from 'lucide-react';
import { UserProfile } from '../../../types';
import toast from 'react-hot-toast';

interface PersonalInfoProps {
  user: UserProfile;
  onSave: (updatedUser: Partial<UserProfile>) => Promise<void>;
  isLoading?: boolean;
}

export default function PersonalInfo({
  user,
  onSave,
  isLoading = false,
}: PersonalInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    organizationName: user.organizationName || '',
    phoneNumber: user.phoneNumber || '',
    address: user.location?.address || '',
    city: user.location?.city || '',
    pincode: user.location?.pincode || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const updatedData: Partial<UserProfile> = {
        fullName: formData.fullName || undefined,
        organizationName: formData.organizationName || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        location: {
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          lat: user.location?.lat || 0,
          lng: user.location?.lng || 0,
        },
      };

      await onSave(updatedData);
      setIsEditing(false);
      toast.success('Personal info updated successfully!');
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  if (!isEditing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
          >
            Edit
          </button>
        </div>

        <div className="space-y-4">
          {user.fullName && (
            <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
              <Mail className="text-gray-400 mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Full Name
                </p>
                <p className="text-gray-900 font-medium">{user.fullName}</p>
              </div>
            </div>
          )}

          {user.organizationName && (
            <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
              <Building className="text-gray-400 mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Organization Name
                </p>
                <p className="text-gray-900 font-medium">
                  {user.organizationName}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
            <Mail className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Email Address
              </p>
              <p className="text-gray-900 font-medium">{user.email}</p>
            </div>
          </div>

          {user.phoneNumber && (
            <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
              <Phone className="text-gray-400 mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Phone Number
                </p>
                <p className="text-gray-900 font-medium">{user.phoneNumber}</p>
              </div>
            </div>
          )}

          {user.location && (
            <div className="flex items-start gap-4">
              <MapPin className="text-gray-400 mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Address
                </p>
                <p className="text-gray-900 font-medium">
                  {user.location.address}
                </p>
                {user.location.city && (
                  <p className="text-gray-600 text-sm">
                    {user.location.city}
                    {user.location.pincode && ` - ${user.location.pincode}`}
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Edit Personal Info</h3>
      </div>

      <div className="space-y-5">
        {user.role === 'donor' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              placeholder="Your full name"
            />
          </div>
        )}

        {user.role === 'organizations' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              placeholder="Organization name"
            />
          </div>
        )}

        {user.role === 'volunteer' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              placeholder="Your full name"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            placeholder="+91 98765 43210"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            placeholder="Street address"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pincode
            </label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              placeholder="000000"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          <Save size={18} />
          Save Changes
        </button>
        <button
          onClick={() => setIsEditing(false)}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-900 rounded-lg font-medium transition-colors"
        >
          <X size={18} />
          Cancel
        </button>
      </div>
    </div>
  );
}
