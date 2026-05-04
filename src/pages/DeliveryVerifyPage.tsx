import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { CheckCircle, AlertTriangle, Loader2, Radio } from 'lucide-react';

type Stage = 'verifying' | 'tracking' | 'done' | 'error';

export default function DeliveryVerifyPage() {
  const [searchParams] = useSearchParams();
  const donationId = searchParams.get('donationId') || '';
  // Email is passed in the URL as ?de=... so no manual input needed
  const emailFromUrl = searchParams.get('de') ? decodeURIComponent(searchParams.get('de')!) : '';

  const [stage, setStage]   = useState<Stage>('verifying');
  const [errorMsg, setError] = useState('');
  const watchRef = useRef<number | null>(null);

  // ── Stop watch on unmount ──
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  // ── Listen to donation: stop tracking when status = 'delivered' ──
  useEffect(() => {
    if (!donationId || stage !== 'tracking') return;
    const unsub = onSnapshot(doc(db, 'donations', donationId), snap => {
      if (!snap.exists()) return;
      if (snap.data().status === 'delivered') {
        if (watchRef.current !== null) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
        updateDoc(doc(db, 'donations', donationId), { trackingActive: false }).catch(() => {});
        setStage('done');
      }
    });
    return () => unsub();
  }, [donationId, stage]);

  // ── Start continuous GPS broadcasting ──
  const startTracking = async (verifiedEmail: string) => {
    if (!donationId) { setError('No donation ID found in this link.'); setStage('error'); return; }

    // Write verified flag to Firestore
    try {
      await updateDoc(doc(db, 'donations', donationId), {
        deliveryPersonEmail: verifiedEmail,
        deliveryVerified:    true,
        trackingActive:      true,
      });
    } catch (e: any) {
      setError('Could not connect to database: ' + e.message);
      setStage('error');
      return;
    }

    setStage('tracking');

    if (!navigator.geolocation) {
      setError('GPS is not available on this device. Please use a phone.');
      setStage('error');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        try {
          await updateDoc(doc(db, 'donations', donationId), {
            currentLocation: { lat: coords.latitude, lng: coords.longitude, lastUpdated: Date.now() },
            trackingActive: true,
          });
        } catch (_) {}
      },
      () => {}, // silently retry on transient GPS errors
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    watchRef.current = watchId;
  };

  // ── On mount: complete the email-link sign-in ──
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setError('This verification link is invalid or has already been used.');
      setStage('error');
      return;
    }

    if (!emailFromUrl) {
      setError('Email address missing from link. Please ask the organisation to resend.');
      setStage('error');
      return;
    }

    // Auto sign-in — no user input required
    signInWithEmailLink(auth, emailFromUrl, window.location.href)
      .then(() => startTracking(emailFromUrl))
      .catch((err) => {
        setError('Verification failed: ' + err.message);
        setStage('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── UI (no Navbar — handled in App.tsx) ──────────── */

  if (stage === 'verifying') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 flex flex-col items-center gap-4 max-w-xs w-full border border-white/20 shadow-2xl text-center">
        <Loader2 size={44} className="text-indigo-300 animate-spin" />
        <p className="text-white font-semibold text-lg">Verifying your identity…</p>
        <p className="text-indigo-300 text-sm">Please wait a moment.</p>
      </div>
    </div>
  );

  if (stage === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-rose-900 p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 flex flex-col items-center gap-4 max-w-xs w-full border border-white/20 shadow-2xl text-center">
        <AlertTriangle size={44} className="text-red-300" />
        <p className="text-white font-semibold text-lg">Verification Failed</p>
        <p className="text-red-200 text-sm">{errorMsg}</p>
        <p className="text-red-300 text-xs mt-2">Ask the organisation to resend the verification link.</p>
      </div>
    </div>
  );

  if (stage === 'done') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-emerald-900 p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 flex flex-col items-center gap-4 max-w-xs w-full border border-white/20 shadow-2xl text-center">
        <CheckCircle size={52} className="text-green-300" />
        <p className="text-white font-bold text-2xl">Delivery Complete!</p>
        <p className="text-green-200 text-sm">Your location is no longer being shared. Thank you! 🙏</p>
      </div>
    </div>
  );

  // stage === 'tracking'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 flex flex-col items-center gap-5 max-w-xs w-full border border-white/20 shadow-2xl text-center">
        <div className="h-20 w-20 rounded-full bg-green-400/20 border-2 border-green-400 flex items-center justify-center">
          <Radio size={36} className="text-green-300 animate-pulse" />
        </div>
        <div>
          <p className="text-white font-black text-2xl">You're Live 📡</p>
          <p className="text-indigo-200 text-sm mt-1">
            Your location is being shared with the donor in real time.
          </p>
        </div>
        <div className="w-full bg-white/10 rounded-2xl px-5 py-4 text-left">
          <p className="text-indigo-300 text-xs uppercase font-bold mb-1">Verified as</p>
          <p className="text-white text-sm font-mono break-all">{emailFromUrl}</p>
        </div>
        <p className="text-indigo-400 text-xs">
          Tracking stops automatically when the delivery is marked complete.
        </p>
      </div>
    </div>
  );
}
