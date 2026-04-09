export type UserRole = 'donor' | 'organizations' | 'volunteer';

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  pincode?: string;
  landmark?: string;
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
}

export interface FoodDonation {
  id?: string;
  donorId: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  status: 'available' | 'reserved' | 'picked_up' | 'delivered';
  foodCategory: 'Veg' | 'Non-Veg' | 'Both';
  foodType: 'Cooked' | 'Packaged' | 'Raw Ingredients';
  quantityInMeals: number;
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
  // Organization details (when accepted by an organization)
  reservedByorganizationsId?: string;
  organizationName?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  // Volunteer details (when accepted by a volunteer)
  volunteerId?: string;
  volunteerName?: string;
  volunteerEmail?: string;
  volunteerPhone?: string;
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
