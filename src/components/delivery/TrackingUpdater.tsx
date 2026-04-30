import React, { useEffect, useState } from 'react';
import { useTrackingUpdater } from '../../hooks/useDeliveryTracking';
import { MapPin, Navigation, Loader, WifiOff, CheckCircle2, Radio } from 'lucide-react';

interface TrackingUpdaterProps {
  /** The logged-in handler's user ID */
  userId: string;
  /** Whether this handler is an organization or volunteer */
  role: 'organization' | 'volunteer';
  /** Display name of the handler */
  handlerName: string;
  /** The donation ID being delivered */
  donationId: string;
  /** The original donor's user ID */
  donorId: string;
  /** Current donation status from the donations collection */
  donationStatus: string;
}

/**
 * TrackingUpdater — Rendered inside the Organization or Volunteer dashboard.
 *
 * Automatically starts GPS tracking when the donation is marked as "picked_up"
 * and stops when it transitions to "delivered".
 */
export default function TrackingUpdater({
  userId,
  role,
  handlerName,
  donationId,
  donorId,
  donationStatus,
}: TrackingUpdaterProps) {
  const { isTracking, trackingError, currentPos, startTracking, stopTracking } =
    useTrackingUpdater(userId, role, handlerName);

  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Auto-start tracking when donation status becomes picked_up
  useEffect(() => {
    if (donationStatus === 'picked_up' && !isTracking && !hasAutoStarted) {
      startTracking(donationId, donorId);
      setHasAutoStarted(true);
    }
  }, [donationStatus, isTracking, hasAutoStarted, startTracking, donationId, donorId]);

  // Auto-stop tracking when donation status becomes delivered
  useEffect(() => {
    if (donationStatus === 'delivered' && isTracking) {
      stopTracking();
    }
  }, [donationStatus, isTracking, stopTracking]);

  // Don't render anything if not in a trackable state
  if (donationStatus !== 'picked_up' && donationStatus !== 'delivered') {
    return null;
  }

  // Delivered state — show completion
  if (donationStatus === 'delivered') {
    return (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
            Delivery Completed — Tracking Stopped
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-900/30 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio size={18} className="text-indigo-600 dark:text-indigo-400" />
            {isTracking && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
            )}
          </div>
          <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200 uppercase tracking-wider">
            Live Tracking
          </span>
        </div>
        {isTracking && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2.5 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Broadcasting
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Error State */}
        {trackingError && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <WifiOff size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">Tracking Error</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{trackingError}</p>
            </div>
          </div>
        )}

        {/* Tracking Active — Show coordinates */}
        {isTracking && currentPos && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-indigo-600 dark:text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Your Current Position
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 font-mono">
                {currentPos.lat.toFixed(6)}, {currentPos.lng.toFixed(6)}
              </p>
            </div>
          </div>
        )}

        {/* Waiting for GPS */}
        {isTracking && !currentPos && !trackingError && (
          <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-300">
            <Loader size={16} className="animate-spin" />
            <span>Acquiring GPS signal...</span>
          </div>
        )}

        {/* Not tracking yet */}
        {!isTracking && !trackingError && (
          <div className="flex items-center gap-2">
            <Loader size={16} className="animate-spin text-indigo-500" />
            <span className="text-sm text-indigo-600 dark:text-indigo-300">
              Starting location tracker...
            </span>
          </div>
        )}

        {/* Manual retry button */}
        {trackingError && (
          <button
            onClick={() => startTracking(donationId, donorId)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition text-sm"
          >
            <Navigation size={14} />
            Retry Tracking
          </button>
        )}

        {/* Open in Google Maps */}
        {currentPos && (
          <a
            href={`https://www.google.com/maps?q=${currentPos.lat},${currentPos.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition text-sm"
          >
            <MapPin size={14} />
            View on Google Maps
          </a>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-indigo-100 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10">
        <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60">
          📡 Location is shared with the donor in real-time. GPS updates automatically.
        </p>
      </div>
    </div>
  );
}
