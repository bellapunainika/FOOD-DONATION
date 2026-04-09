import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: (role?: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(uid: string) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  }

  async function signInWithGoogle(role?: UserRole) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if profile exists
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() && role) {
      // First login
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        fullName: user.displayName || '',
        role: role,
        createdAt: Date.now()
      };
      await setDoc(docRef, newProfile);
      setUserProfile(newProfile);
    } else if (docSnap.exists()) {
      setUserProfile(docSnap.data() as UserProfile);
    }
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setLoading(true);
        await fetchUserProfile(user.uid);
        setLoading(false);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    logout,
    signInWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
