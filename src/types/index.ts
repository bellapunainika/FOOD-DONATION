export type UserRole = 'donor' | 'ngo' | 'volunteer';

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
  organizationName?: string; // For Donors & NGOs
  phoneNumber?: string;
  location?: LocationData;
  idProofUrl?: string;
  aadharNumber?: string;
  createdAt: number;
  
  // Specific fields
  donorType?: 'Individual' | 'Restaurant' | 'Catering Service' | 'Event';
  ngoRegNumber?: string;
  ngoType?: 'NGO' | 'Volunteer Group' | 'Individual Volunteer';
  capacityMealsPerDay?: number;
  availableVehicles?: boolean;
}

export interface FoodDonation {
  id?: string;
  donorId: string;
  donorName: string;
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
  location: LocationData;
  createdAt: number;
  
  // Link to NGO and Volunteer
  reservedByNgoId?: string;
  volunteerId?: string;
}

export interface DeliveryJob {
  id?: string;
  donationId: string;
  donorId: string;
  ngoId: string;
  volunteerId?: string;
  status: 'pending_volunteer' | 'assigned' | 'in_transit' | 'delivered';
  pickupLocation: LocationData;
  dropoffLocation: LocationData;
  createdAt: number;
}
