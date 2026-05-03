export type UserRole = 'donor' | 'organizations' | 'volunteer';

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  pincode?: string;
  landmark?: string;
}

export interface AvailabilitySlot {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isActive: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  fullName?: string;
  organizationName?: string; // For Donors & organizationss
  phoneNumber?: string;
  location?: LocationData;
  idProofUrl?: string;
  aadharNumber?: string;
  createdAt: number;
  
  // Specific fields
  donorType?: 'Individual' | 'Restaurant' | 'Catering Service' | 'Event';
  organizationsRegNumber?: string;
  organizationsType?: 'organizations' | 'Volunteer Group' | 'Individual Volunteer';
  capacityMealsPerDay?: number;
  availableVehicles?: boolean;
  
  // Volunteer specific
  isAvailable?: boolean; // Real-time availability toggle
  availabilitySchedule?: AvailabilitySlot[];
  lastAvailabilityToggle?: number; // Timestamp of last toggle
}

export interface RawMaterial {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: number; // timestamp
  storageType: string;
  notes: string;
}

export interface LiveLocation {
  lat: number;
  lng: number;
  lastUpdated: number; // timestamp
}

export interface FoodDonation {
  id?: string;
  donorId: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  status: 'available' | 'reserved' | 'picked_up' | 'delivered' | 'expired';
  foodCategory: 'Veg' | 'Non-Veg' | 'Both';
  foodType: 'Cooked' | 'Packaged' | 'Raw Ingredients';
  quantityInMeals: number;
  vegQuantity?: number;
  nonVegQuantity?: number;
  preparedTime: number; // timestamp
  expiryTime: number; // timestamp
  pickupTimeWindow?: string;
  storageInfo: 'Room temp' | 'Refrigerated';
  hygieneChecklist: {
    freshlyCooked: boolean;
    covered: boolean;
    safePackaging: boolean;
  };
  foodImageUrl?: string;
  specialInstructions?: string;
  rawMaterials?: RawMaterial[];
  // Organization details (when accepted by an organization)
  reservedByorganizationsId?: string;
  organizationName?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  // Organization delivery person details
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  // Volunteer details (when accepted by a volunteer)
  volunteerId?: string;
  volunteerName?: string;
  volunteerEmail?: string;
  volunteerPhone?: string;
  // Live tracking
  currentLocation?: LiveLocation;
  trackingActive?: boolean;
  // Delivery proof (volunteers)
  deliveryConfirmCode?: string;  // 6-char alphanumeric code generated on delivery
  deliveredAt?: number;          // timestamp of delivery
  deliveredGPS?: { lat: number; lng: number }; // GPS at delivery point
  location: LocationData;
  createdAt: number;
}

export interface DeliveryJob {
  id?: string;
  donationId: string;
  donorId: string;
  organizationsId: string;
  volunteerId?: string;
  status: 'pending_volunteer' | 'assigned' | 'in_transit' | 'delivered';
  pickupLocation: LocationData;
  dropoffLocation: LocationData;
  createdAt: number;
}
