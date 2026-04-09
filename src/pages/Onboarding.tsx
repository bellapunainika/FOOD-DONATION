import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export default function Onboarding() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Form State
  const [fullName, setFullName] = useState(userProfile?.fullName || userProfile?.organizationName || '');
  const [phone, setPhone] = useState(userProfile?.phoneNumber || '');
  const [address, setAddress] = useState(userProfile?.location?.address || '');
  const [city, setCity] = useState(userProfile?.location?.city || '');
  
  // Specific
  const [donorType, setDonorType] = useState<'Individual' | 'Restaurant' | 'Catering Service' | 'Event'>(userProfile?.donorType || 'Restaurant');
  const [organizationsReg, setorganizationsReg] = useState(userProfile?.organizationsRegNumber || '');

  useEffect(() => {
    if (!userProfile) return;

    setFullName(userProfile.fullName || userProfile.organizationName || '');
    setPhone(userProfile.phoneNumber || '');
    setAddress(userProfile.location?.address || '');
    setCity(userProfile.location?.city || '');
    setDonorType((userProfile.donorType || 'Restaurant') as 'Individual' | 'Restaurant' | 'Catering Service' | 'Event');
    setorganizationsReg(userProfile.organizationsRegNumber || '');
  }, [userProfile]);

  const getLocation = () => {
    if (navigator.geolocation) {
      toast.success('Detecting location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAddress(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)} (Auto-detected)`);
        },
        (error) => toast.error('Location error: ' + error.message)
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('You must agree to Terms & Conditions');
      return;
    }
    if (!currentUser) return;

    setLoading(true);
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const updateData: any = {
        fullName,
        phoneNumber: phone,
        location: {
          address,
          city,
          lat: 28.6139, // Defaulting to Delhi for MVP if not typed
          lng: 77.2090
        }
      };

      if (userProfile?.role === 'donor') {
        updateData.donorType = donorType;
        updateData.organizationName = fullName;
      } else if (userProfile?.role === 'organizations') {
        updateData.organizationsRegNumber = organizationsReg;
        updateData.organizationName = fullName;
      }

      await updateDoc(docRef, updateData);
      toast.success('Profile completed!');
      // Force reload or just navigate. Assuming context updates naturally on next DB snapshot or manual fetch.
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full mx-auto bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Complete Your Profile</h2>
          <p className="text-gray-600 mt-2">Just a few more details to get you started as a {userProfile.role}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {userProfile.role === 'volunteer' ? 'Full Name' : 'Organization / Full Name'}
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-gray-700">Full Address</label>
              <button type="button" onClick={getLocation} className="text-sm text-brand-600 font-bold hover:underline">
                Auto-detect
              </button>
            </div>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none mb-4"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {userProfile.role === 'donor' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type of Donor</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                value={donorType}
                onChange={(e) => setDonorType(e.target.value as 'Individual' | 'Restaurant' | 'Catering Service' | 'Event')}
              >
                <option>Restaurant</option>
                <option>Catering Service</option>
                <option>Event</option>
                <option>Individual</option>
              </select>
            </div>
          )}

          {userProfile.role === 'organizations' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Government organizations Registration Number</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={organizationsReg}
                onChange={(e) => setorganizationsReg(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
            <input
              type="checkbox"
              id="terms"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-gray-300"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I agree to the Terms & Conditions and certify that all details provided are true. 
              (For volunteers/donors, I ensure food safety guidelines are followed).
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Finish Onboarding'}
          </button>
        </form>
      </div>
    </div>
  );
}
