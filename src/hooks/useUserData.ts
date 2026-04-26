import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

interface UseUserDataReturn {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useUserData(uid: string | undefined): UseUserDataReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'users', uid);
    
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUser(docSnap.data() as UserProfile);
          setError(null);
        } else {
          setUser(null);
          setError('User not found');
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { user, loading, error };
}
