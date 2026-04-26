import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import DarkModeToggle from './ui/DarkModeToggle';

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
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex flex-shrink-0 items-center gap-2">
              <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400 transition-colors duration-300">
                <Heart size={24} className="fill-brand-500" />
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-gray-200 tracking-tight transition-colors duration-300">AI Feed Hunger</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            
            {!currentUser ? (
              <>
                <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors duration-300">
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="bg-brand-600 text-gray-100 px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link 
                  to="/dashboard" 
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors duration-300"
                >
                  Dashboard
                </Link>
                
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 transition-colors duration-300"></div>
                
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-200 transition-colors duration-300">
                      {userProfile?.fullName || userProfile?.organizationName || currentUser.email}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full font-medium uppercase tracking-wider transition-colors duration-300">
                      {userProfile?.role || 'User'}
                    </span>
                  </div>
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen((prev) => !prev)}
                      className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 border-2 border-white dark:border-gray-700 shadow-sm overflow-hidden transition hover:scale-[1.02]"
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
                      <div className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-xl p-4 z-50 transition-colors duration-300">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              navigate('/profile');
                            }}
                            className="flex-1 rounded-xl bg-brand-600 text-gray-100 px-4 py-2 text-sm font-semibold hover:bg-brand-700 transition"
                          >
                            View Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300"
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
