import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: (role?: UserRole) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

/** Create / fetch the Firestore profile for a Google-authenticated user */
async function ensureGoogleProfile(user: FirebaseUser, role?: UserRole): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }

  if (role) {
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      fullName: user.displayName || '',
      role,
      createdAt: Date.now(),
    };
    await setDoc(docRef, newProfile);
    return newProfile;
  }

  // No role provided and no existing profile — Google login on /login page
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUserProfile() {
    if (auth.currentUser) {
      await fetchUserProfile(auth.currentUser.uid);
    }
  }

  async function fetchUserProfile(uid: string) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      setUserProfile(docSnap.exists() ? (docSnap.data() as UserProfile) : null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  }

  /**
   * Sign in / register with Google.
   * Tries popup first (works on most browsers/localhost).
   * Falls back to redirect if the popup is blocked.
   */
  async function signInWithGoogle(role?: UserRole) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let user: FirebaseUser;
    try {
      // Try popup — faster, works on localhost
      const result = await signInWithPopup(auth, provider);
      user = result.user;
    } catch (popupErr: any) {
      // Popup blocked or closed — fall back to redirect
      if (
        popupErr.code === 'auth/popup-blocked' ||
        popupErr.code === 'auth/popup-closed-by-user' ||
        popupErr.code === 'auth/cancelled-popup-request'
      ) {
        // Store the intended role in sessionStorage so we can read it after redirect
        if (role) sessionStorage.setItem('pendingGoogleRole', role);
        await signInWithRedirect(auth, provider);
        return; // Page will reload after redirect
      }
      throw popupErr;
    }

    const profile = await ensureGoogleProfile(user, role);
    setUserProfile(profile);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    let cancelled = false;

    // Handle redirect result (runs after page reload from signInWithRedirect)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user && !cancelled) {
          const pendingRole = sessionStorage.getItem('pendingGoogleRole') as UserRole | null;
          sessionStorage.removeItem('pendingGoogleRole');
          const profile = await ensureGoogleProfile(result.user, pendingRole || undefined);
          if (!cancelled) setUserProfile(profile);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Redirect result error:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (cancelled) return;
      setCurrentUser(user);
      if (user) {
        setLoading(true);
        await fetchUserProfile(user.uid);
        if (!cancelled) setLoading(false);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    logout,
    signInWithGoogle,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
