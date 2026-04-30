import React from 'react';
import { useLiveTracking } from '../../hooks/useDeliveryTracking';
import {
  MapPin,
  Clock,
  ExternalLink,
  Truck,
  Building2,
  User,
  Radio,
  Loader,
  PackageCheck,
} from 'lucide-react';

interface LiveTrackingViewerProps {
  /** The logged-in donor's user ID */
  donorId: string;
}

/**
 * LiveTrackingViewer — Rendered on the Donor dashboard.
 *
 * Uses Firestore onSnapshot() to listen for all active deliveries
 * belonging to this donor and displays real-time location, status,
 * and a Google Maps link.
 */
export default function LiveTrackingViewer({ donorId }: LiveTrackingViewerProps) {
  const { deliveries, loading } = useLiveTracking(donorId);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader size={20} className="animate-spin" />
          <span className="text-sm font-medium">Loading live tracking...</span>
        </div>
      </div>
    );
  }

  if (deliveries.length === 0) {
    return null; // No active deliveries — render nothing
  }

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Radio size={24} className="text-indigo-600 dark:text-indigo-400" />
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 animate-ping" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200">
            Live Delivery Tracking
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time location of your donations in transit
          </p>
        </div>
      </div>

      {/* Delivery Cards */}
      {deliveries.map((delivery) => {
        const hasValidLocation =
          delivery.currentLocation &&
          delivery.currentLocation.lat !== 0 &&
          delivery.currentLocation.lng !== 0;

        const lastUpdatedStr = delivery.lastUpdated
          ? new Date(delivery.lastUpdated).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'medium',
            })
          : 'N/A';

        const timeSinceUpdate = delivery.lastUpdated
          ? Math.floor((Date.now() - delivery.lastUpdated) / 1000)
          : null;

        const getTimeSinceLabel = () => {
          if (timeSinceUpdate === null) return '';
          if (timeSinceUpdate < 60) return `${timeSinceUpdate}s ago`;
          if (timeSinceUpdate < 3600)
            return `${Math.floor(timeSinceUpdate / 60)}m ago`;
          return `${Math.floor(timeSinceUpdate / 3600)}h ago`;
        };

        const isStale = timeSinceUpdate !== null && timeSinceUpdate > 120; // 2 min

        return (
          <div
            key={delivery.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md"
          >
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-900/20 dark:via-purple-900/15 dark:to-blue-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {delivery.handledBy === 'organization' ? (
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <User size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
                      {delivery.handlerName || (delivery.handledBy === 'organization' ? 'Organization' : 'Volunteer')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      Handled by {delivery.handledBy}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {delivery.status === 'picked' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1.5 rounded-full">
                      <Truck size={14} />
                      In Transit
                    </span>
                  )}
                  {delivery.status === 'pending' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1.5 rounded-full">
                      <Clock size={14} />
                      Pending Pickup
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Location Info */}
              {hasValidLocation ? (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Location
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 font-mono">
                      {delivery.currentLocation.lat.toFixed(6)},{' '}
                      {delivery.currentLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <Loader size={16} className="animate-spin" />
                  <span>Waiting for handler to share location...</span>
                </div>
              )}

              {/* Last Updated */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Updated
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                      {lastUpdatedStr}
                    </p>
                    {timeSinceUpdate !== null && (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isStale
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}
                      >
                        {getTimeSinceLabel()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <PackageCheck size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Delivery Status
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-200 capitalize mt-0.5">
                    {delivery.status === 'picked' ? 'Picked Up — In Transit' : delivery.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Open in Google Maps Button */}
            {hasValidLocation && (
              <div className="px-5 pb-4">
                <a
                  href={`https://www.google.com/maps?q=${delivery.currentLocation.lat},${delivery.currentLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id={`tracking-map-link-${delivery.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm"
                >
                  <ExternalLink size={16} />
                  Open Live Location
                </a>
              </div>
            )}

            {/* Stale Warning */}
            {isStale && hasValidLocation && (
              <div className="px-5 pb-3">
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                  ⚠️ Location hasn't been updated recently. The handler may have paused or lost GPS signal.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
