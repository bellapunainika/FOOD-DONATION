import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex flex-shrink-0 items-center gap-2">
              <div className="p-2 bg-brand-100 rounded-full text-brand-600">
                <Heart size={24} className="fill-brand-500" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">AI Feed Hunger</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {!currentUser ? (
              <>
                <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link 
                  to="/dashboard" 
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                
                <div className="h-8 w-px bg-gray-200"></div>
                
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-gray-900">
                      {userProfile?.fullName || userProfile?.organizationName || currentUser.email}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium uppercase tracking-wider">
                      {userProfile?.role || 'User'}
                    </span>
                  </div>
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen((prev) => !prev)}
                      className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 border-2 border-white shadow-sm overflow-hidden transition hover:scale-[1.02]"
                      title="Profile"
                    >
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon size={20} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen((prev) => !prev)}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      <ChevronDown size={16} />
                    </button>

                    {profileMenuOpen && (
                      <div className="absolute right-0 top-full mt-3 w-64 bg-white border border-gray-200 rounded-3xl shadow-xl p-4 z-50">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              navigate('/profile');
                            }}
                            className="flex-1 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700 transition"
                          >
                            View Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex-1 rounded-xl border border-gray-200 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition"
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
