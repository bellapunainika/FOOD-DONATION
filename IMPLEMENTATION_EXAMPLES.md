# Implementation Examples & Setup Instructions

## Quick Setup Guide

### Step 1: Update Firestore Security Rules

Add this rule to allow volunteers to update their availability:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Volunteers can update only their own document
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Anyone can read donations (for map view)
    match /donations/{donationId} {
      allow read: if request.auth != null;
      allow create: if request.auth.token.role == 'donor';
      allow update: if request.auth.uid == resource.data.donorId || 
                       request.auth.uid == resource.data.volunteerId;
    }
  }
}
```

### Step 2: Create Firestore Indexes

Navigate to Firestore Console and create these composite indexes:

**Index 1: Available Volunteers**
```
Collection: users
Fields:
  - role (Ascending)
  - isAvailable (Ascending)
  - location.lat (Ascending)
  - location.lng (Ascending)
```

**Index 2: Available Donations**
```
Collection: donations
Fields:
  - status (Ascending)
  - volunteerId (Ascending)
  - createdAt (Descending)
```

---

## Code Examples

### Example 1: Call Toggle Function from Frontend

```typescript
// In VolunteerDashboard.tsx
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const toggleAvailability = async () => {
  if (!userProfile?.uid) return;
  
  try {
    const newStatus = !isAvailable;
    
    // Update Firestore document directly
    await updateDoc(doc(db, 'users', userProfile.uid), {
      isAvailable: newStatus,
      lastAvailabilityToggle: Date.now()
    });
    
    setIsAvailable(newStatus);
    toast.success(
      newStatus 
        ? '🟢 You\'re ONLINE!\nReady to help!' 
        : '🔴 You\'re OFFLINE\nTake a break!'
    );
  } catch (error) {
    console.error('Toggle failed:', error);
    toast.error('Failed to update availability');
  }
};
```

### Example 2: Real-Time Donation Listener

```typescript
// Listen to donations in real-time (only if volunteer is available)
useEffect(() => {
  if (!isAvailable || !userProfile) return;

  const q = query(
    collection(db, 'donations'),
    where('status', '==', 'available')
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const donations: FoodDonation[] = [];
    
    querySnapshot.forEach((doc) => {
      const donation = { id: doc.id, ...doc.data() } as FoodDonation;
      
      // Filter by proximity (5km)
      const distance = calculateDistance(
        userProfile.location!,
        donation.location
      );
      
      if (distance <= 5) {
        donations.push(donation);
      }
    });
    
    setAvailablePickups(donations);
  });

  return () => unsubscribe();
}, [isAvailable, userProfile]);
```

### Example 3: Calculate Distance Between Two Points

```typescript
// utils/distance.ts
import { LocationData } from '../types';

export const calculateDistance = (
  loc1: LocationData,
  loc2: LocationData
): number => {
  const R = 6371; // Earth's radius in km
  
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

// Usage:
// const distance = calculateDistance(
//   { lat: 28.6139, lng: 77.2090 },
//   { lat: 28.6200, lng: 77.2100 }
// );
// console.log(`${distance.toFixed(2)} km away`);
```

### Example 4: Cloud Function - Notify Available Volunteers

```typescript
// functions/src/index.ts - Part of the implementation

export const notifyNearbyVolunteers = functions.firestore
  .document('donations/{donationId}')
  .onCreate(async (snap, context) => {
    const donation = snap.data();
    const db = admin.firestore();

    try {
      // Step 1: Get all AVAILABLE volunteers
      const volunteersSnapshot = await db
        .collection('users')
        .where('role', '==', 'volunteer')
        .where('isAvailable', '==', true)
        .select('uid', 'fullName', 'location', 'fcmToken')
        .get();

      console.log(`Found ${volunteersSnapshot.size} available volunteers`);

      // Step 2: Filter by proximity
      const nearbyVolunteers = volunteersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(vol => {
          const distance = calculateHaversineDistance(
            vol.location,
            donation.location
          );
          return distance <= 5;
        });

      console.log(`${nearbyVolunteers.length} volunteers are nearby`);

      // Step 3: Send FCM notifications
      const messaging = admin.messaging();
      const tokens = nearbyVolunteers
        .map(v => v.fcmToken)
        .filter(Boolean);

      if (tokens.length > 0) {
        await messaging.sendMulticast({
          tokens,
          notification: {
            title: '🎯 New Donation Nearby!',
            body: `${donation.quantityInMeals} meals from ${donation.donorName}`,
            imageUrl: donation.foodImageUrl || undefined
          },
          data: {
            donationId: context.params.donationId,
            action: 'view_donation'
          },
          android: {
            ttl: 600, // 10 minutes
            priority: 'high'
          },
          webpush: {
            ttl: 600
          }
        });

        console.log(`Notifications sent to ${tokens.length} volunteers`);
      }

      return {
        success: true,
        volunteersNotified: nearbyVolunteers.length
      };
    } catch (error) {
      console.error('Error notifying volunteers:', error);
      throw error;
    }
  });

// Helper function for distance calculation
const calculateHaversineDistance = (loc1: any, loc2: any): number => {
  const R = 6371;
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

### Example 5: Styled Toggle Switch Component

```typescript
// components/AvailabilityToggle.tsx
import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';

interface AvailabilityToggleProps {
  isAvailable: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  isAvailable,
  isLoading,
  onToggle
}) => {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
      <div className="flex flex-col items-end">
        <p className={`text-sm font-semibold transition-colors ${
          isAvailable ? 'text-green-700' : 'text-gray-700'
        }`}>
          Available for Delivery
        </p>
        <p className={`text-xs mt-1 font-medium transition-colors ${
          isAvailable ? 'text-green-600' : 'text-gray-500'
        }`}>
          {isAvailable ? '🟢 You are ONLINE' : '🔴 You are OFFLINE'}
        </p>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`relative inline-flex items-center h-10 w-18 rounded-full transition-all duration-300 cursor-pointer ${
          isAvailable
            ? 'bg-green-500 shadow-lg shadow-green-500/50 hover:shadow-xl'
            : 'bg-gray-300 shadow-lg shadow-gray-300/50 hover:shadow-xl'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isAvailable ? 'Toggle offline' : 'Toggle online'}
      >
        <span
          className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-300 flex items-center justify-center ${
            isAvailable ? 'translate-x-9' : 'translate-x-1'
          }`}
        >
          {isAvailable ? (
            <Zap size={16} className="text-green-500" />
          ) : (
            <AlertCircle size={16} className="text-gray-400" />
          )}
        </span>
      </button>
    </div>
  );
};
```

### Example 6: Status Message Component

```typescript
// components/AvailabilityStatus.tsx
import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';

interface AvailabilityStatusProps {
  isAvailable: boolean;
}

export const AvailabilityStatus: React.FC<AvailabilityStatusProps> = ({
  isAvailable
}) => {
  return (
    <div className={`mt-6 p-4 rounded-xl border-2 flex items-start gap-3 transition-all duration-300 ${
      isAvailable
        ? 'bg-green-50 border-green-300'
        : 'bg-gray-100 border-gray-300'
    }`}>
      <div className={`flex-shrink-0 mt-0.5 ${isAvailable ? 'animate-pulse' : ''}`}>
        {isAvailable ? (
          <Zap size={20} className="text-green-600" />
        ) : (
          <AlertCircle size={20} className="text-gray-600" />
        )}
      </div>
      <div>
        <p className={`font-semibold ${
          isAvailable ? 'text-green-900' : 'text-gray-900'
        }`}>
          {isAvailable
            ? '✅ You are ONLINE and ready for deliveries!'
            : '⏸️ You are currently OFFLINE'}
        </p>
        <p className={`text-sm mt-1 ${
          isAvailable ? 'text-green-700' : 'text-gray-700'
        }`}>
          {isAvailable
            ? 'Nearby donations will appear below. You\'ll be notified when someone needs your help. Thank you for being a hero!'
            : 'Toggle ON to start receiving donation requests and notifications. Take a break whenever you need!'}
        </p>
      </div>
    </div>
  );
};
```

---

## API Endpoints Summary

### 1. Update Availability (Direct Firestore Update)

**Method**: PATCH (via direct Firestore update)

**URL**: N/A (Direct Firestore)

**Request Body**:
```json
{
  "isAvailable": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "You are now ONLINE",
  "isAvailable": true,
  "timestamp": "2026-04-11T14:30:00Z"
}
```

---

## Performance Considerations

### Query Optimization

Use compound indexes for faster queries:

```typescript
// Query 1: Find available volunteers (with location index)
db.collection('users')
  .where('role', '==', 'volunteer')
  .where('isAvailable', '==', true);

// Expected: < 100ms for 1000 volunteers

// Query 2: Find nearby donations
db.collection('donations')
  .where('status', '==', 'available')
  .where('volunteerId', '==', '');

// Expected: < 50ms for 500 donations
```

### Network Optimization

- Debounce toggle clicks (100ms minimum)
- Cache volunteer profiles (5 minute TTL)
- Limit real-time listeners to 1 per component
- Unsubscribe listeners on unmount

---

## Security Notes

✅ **DO**:
- Validate `isAvailable` is boolean before update
- Check authentication before any update
- Use Firestore security rules
- Verify volunteer role before notification

❌ **DON'T**:
- Allow anonymous updates
- Update other user's availability
- Store sensitive info in Firestore
- Ignore authentication checks

---

## Testing Suite

### Unit Tests

```typescript
describe('AvailabilityToggle', () => {
  it('should toggle from false to true', async () => {
    const result = await toggleAvailability(true);
    expect(result.isAvailable).toBe(true);
  });

  it('should persist toggle state', async () => {
    await toggleAvailability(true);
    const profile = await getUserProfile();
    expect(profile.isAvailable).toBe(true);
  });

  it('should update timestamp on toggle', async () => {
    const before = Date.now();
    await toggleAvailability(true);
    const profile = await getUserProfile();
    expect(profile.lastAvailabilityToggle).toBeGreaterThan(before);
  });
});
```

### Integration Tests

```typescript
describe('Donation Filtering', () => {
  it('should show donations when volunteer is available', async () => {
    await setVolunteerAvailable(true);
    const donations = await getDonationsForVolunteer();
    expect(donations.length).toBeGreaterThan(0);
  });

  it('should hide donations when volunteer is offline', async () => {
    await setVolunteerAvailable(false);
    const donations = await getDonationsForVolunteer();
    expect(donations.length).toBe(0);
  });
});
```

---

## Troubleshooting Common Issues

### Issue 1: Toggle doesn't persist

**Symptoms**: Toggle switches back after refresh
**Solution**:
1. Check Firestore security rules
2. Verify user has write permission
3. Check network tab for failed requests

### Issue 2: Donations not showing

**Symptoms**: Empty list even when online
**Solution**:
1. Verify volunteer has `isAvailable: true`
2. Check if donations are within 5km radius
3. Verify donation status is 'available'

### Issue 3: Delays in notification

**Symptoms**: Slow notification delivery
**Solution**:
1. Optimize Firestore indexes
2. Reduce query complexity
3. Check FCM token validity

---

## Deployment Steps

1. **Update TypeScript types** `src/types/index.ts`
2. **Update VolunteerDashboard** `src/pages/dashboards/VolunteerDashboard.tsx`
3. **Deploy Cloud Functions** `functions/src/index.ts`
4. **Create Firestore indexes** (automatic or manual)
5. **Test in staging** environment
6. **Monitor production** for errors

---

**Version**: 1.0  
**Last Updated**: April 2026  
**Status**: Production Ready ✅
