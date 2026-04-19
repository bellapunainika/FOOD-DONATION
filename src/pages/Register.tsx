import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserRole, LocationData } from '../types';
import toast from 'react-hot-toast';
import { Store, Heart, Navigation, MapPin } from 'lucide-react';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [waitingForVerification, setWaitingForVerification] = useState(false);
  
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Auto-poll for email verification
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (waitingForVerification) {
      interval = setInterval(async () => {
        if (auth.currentUser) {
          try {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
              clearInterval(interval);
              toast.success('Email verified successfully!');
              navigate('/onboarding');
            }
          } catch (e) {
            // Ignore errors while polling
          }
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [waitingForVerification, navigate]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    toast.loading('Detecting location...', { id: 'locationToast' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const autoAddress = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        setLocationData({
          lat: latitude,
          lng: longitude,
          address: autoAddress
        });
        setLocationStr(autoAddress);
        toast.success('Location detected!', { id: 'locationToast' });
      },
      (error) => {
        console.error(error);
        toast.error('Failed to detect location. Please enter manually.', { id: 'locationToast' });
      }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { toast.error('Please select your role'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (aadharNumber.length !== 12 || !/^\d+$/.test(aadharNumber)) { toast.error('Aadhar number must be exactly 12 digits'); return; }
    if (!fullName || !phoneNumber || !locationStr || !email) { toast.error('Please fill in all required fields'); return; }

    setLoading(true);
    try {
      // 1. Create User with Email and Password
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Send Email Verification Link
      try {
        const actionCodeSettings = {
          url: window.location.origin + '/login',
          handleCodeInApp: false
        };
        await sendEmailVerification(userCred.user, actionCodeSettings);
      } catch (emailError: any) {
        console.error("Failed to send verification email:", emailError);
        toast.error("Failed to send verification email. Please check your Firebase Console settings.");
      }
      
      // 3. Save profile doc
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: email,
        phoneNumber: phoneNumber,
        fullName: fullName,
        role: role,
        aadharNumber: aadharNumber,
        location: locationData || { address: locationStr, lat: 0, lng: 0 },
        createdAt: Date.now()
      });
      
      toast.success('Account created! Please check your email (and Spam folder) for the verification link.', { duration: 8000 });
      setWaitingForVerification(true);
    } catch (error: any) {
      toast.error(error.message || 'Verification or sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!role) {
      toast.error('Please select your role first');
      return;
    }
    try {
      await signInWithGoogle(role);
      toast.success('Account created with Google!');
      navigate('/onboarding');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    }
  };

  if (waitingForVerification) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-gray-950 relative overflow-hidden">
        <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl z-10 border border-gray-100 dark:border-gray-700 text-center transition-colors duration-300">
          <Heart className="w-16 h-16 text-brand-500 mx-auto mb-6" />
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Verify Your Email</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            We dispatched a secure verification link to <strong>{email}</strong>. 
            Please click the link in that email (don't forget to check your Spam folder) to proceed. 
            <br/><br/>
            <i>Waiting for verification automatically...</i>
          </p>
          <button 
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                await auth.currentUser?.reload();
                if (auth.currentUser?.emailVerified) {
                  toast.success('Email verified successfully!');
                  navigate('/onboarding');
                } else {
                  toast.error('Email not verified yet. Please check your inbox or spam folder.');
                }
              } catch (e: any) {
                toast.error('Error checking verification status');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-4 px-4 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 transition disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'I have verified my email'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-gray-950 relative overflow-hidden">
      <div className="max-w-2xl w-full mx-auto bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl z-10 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">Join the Movement</h2>
          <p className="text-gray-600 dark:text-gray-400">Choose how you want to make an impact today.</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setRole('donor')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              role === 'donor' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md ring-2 ring-blue-500 ring-offset-2' 
                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50/50 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Store className={`w-8 h-8 mb-2 ${role === 'donor' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className="font-bold">Donor</span>
            <span className="text-xs text-center mt-1 opacity-80">Restaurants, Events</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('organizations')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              role === 'organizations' 
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 shadow-md ring-2 ring-brand-500 ring-offset-2' 
                : 'border-gray-200 dark:border-gray-600 hover:border-brand-300 hover:bg-brand-50/50 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Heart className={`w-8 h-8 mb-2 ${role === 'organizations' ? 'text-brand-600' : 'text-gray-400'}`} />
            <span className="font-bold">organizations</span>
            <span className="text-xs text-center mt-1 opacity-80">Organizations</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('volunteer')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              role === 'volunteer' 
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 shadow-md ring-2 ring-yellow-500 ring-offset-2' 
                : 'border-gray-200 dark:border-gray-600 hover:border-yellow-300 hover:bg-yellow-50/50 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Navigation className={`w-8 h-8 mb-2 ${role === 'volunteer' ? 'text-yellow-600' : 'text-gray-400'}`} />
            <span className="font-bold">Volunteer</span>
            <span className="text-xs text-center mt-1 opacity-80">Delivery Partner</span>
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aadhar ID (12 digits)</label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="123412341234"
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={aadharNumber}
                onChange={(e) => setAadharNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                placeholder="+919999999999"
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
              <input
                type="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Enter address manually or auto-detect"
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={locationStr}
                onChange={(e) => {
                  setLocationStr(e.target.value);
                  setLocationData(null); // invalidate lat/lng if manual override
                }}
              />
              <button
                type="button"
                onClick={detectLocation}
                className="flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors shrink-0"
                title="Auto-detect Location"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !role}
            className="w-full flex justify-center py-3 px-4 mt-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
            </div>
          </div>
          <button
            onClick={handleGoogle}
            disabled={!role}
            className="mt-6 w-full flex justify-center items-center gap-3 py-3 px-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-sm text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-500">
            Log in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
