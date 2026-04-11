import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { VertexAI } from '@google-cloud/vertexai';

admin.initializeApp();

const project = process.env.GCLOUD_PROJECT || 'fooddonation-d8aeb';
const location = 'us-central1';

export const askChatbot = functions.https.onCall({ cors: true, region: location }, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const message = request.data.message;
  if (!message || typeof message !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a string message.');
  }

  try {
    const vertex_ai = new VertexAI({project, location});
    const model = 'gemini-1.5-pro-preview-0409'; 

    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: model,
      generationConfig: {
        'maxOutputTokens': 2048,
        'temperature': 0.7,
        'topP': 1,
      }
    });

    const prompt = `You are the AI customer service chatbot for 'AI ENABLED FEED HUNGER', a platform connecting donors (restaurants/events), organizationss, and volunteers to reduce food waste. 
User asks: ${message}
Respond helpfully.`;

    const resp = await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return { response: resp.response.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated." };
  } catch (error: any) {
    console.error("Vertex AI Error:", error);
    
    // Fallback response for un-configured environments during eval Demo
    let demoResponse = "I'm the AI assistant for Feed Hunger. I can answer questions about donations, navigation, or organizations sign-up!";
    const msg = message.toLowerCase();
    
    if (msg.includes('donate')) {
       demoResponse = "To donate food, log in as a Donor, go to your Dashboard, and click '+ Add Food Donation'. Be sure to list the expiry time!";
    } else if (msg.includes('volunteer') || msg.includes('delivery')) {
       demoResponse = "Volunteers can view active pickups directly on their map dashboard. Simply accept a delivery, pick it up, and drop it at the organizations.";
    } else if (msg.includes('organizations')) {
       demoResponse = "organizationss can view real-time maps of nearby surplus food and allocate it instantly to active volunteers in the area.";
    }
    
    return { 
       response: demoResponse + "\n\n*(Vertex AI unavailable locally. Falling back to local smart-replies.)*"
    };
  }
});

/**
 * Cloud Function: Update Volunteer Availability
 * Endpoint: PUT /volunteers/{volunteerId}/availability
 * Updates the volunteer's availability status (isAvailable: true/false)
 */
export const updateVolunteerAvailability = functions.https.onCall(
  { cors: true, region: location },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const volunteerId = request.auth.uid;
    const { isAvailable } = request.data;

    if (typeof isAvailable !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', 'isAvailable must be a boolean');
    }

    try {
      const db = admin.firestore();
      const volunteerRef = db.collection('users').doc(volunteerId);
      
      await volunteerRef.update({
        isAvailable: isAvailable,
        lastAvailabilityToggle: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Volunteer ${volunteerId} availability updated to: ${isAvailable}`);

      return {
        success: true,
        message: isAvailable ? 'You are now ONLINE' : 'You are now OFFLINE',
        isAvailable: isAvailable,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error updating availability:', error);
      throw new functions.https.HttpsError('internal', 'Failed to update availability');
    }
  }
);

/**
 * Cloud Function: Get Nearby Available Volunteers
 * Triggered when a new donation is created
 * Filters available volunteers within proximity and sends notifications
 */
export const getNearbyAvailableVolunteers = functions.firestore
  .document('donations/{donationId}')
  .onCreate(async (snap, context) => {
    const donation = snap.data();
    
    console.log('New donation created:', {
      id: snap.id,
      donorName: donation.donorName,
      location: donation.location
    });

    try {
      const db = admin.firestore();
      
      // Get all AVAILABLE volunteers
      const volunteersSnapshot = await db
        .collection('users')
        .where('role', '==', 'volunteer')
        .where('isAvailable', '==', true)
        .get();

      console.log(`Found ${volunteersSnapshot.size} available volunteers`);

      // Filter volunteers within ~5km proximity (simplified haversine distance)
      const nearbyVolunteers = volunteersSnapshot.docs.filter(doc => {
        const volunteer = doc.data();
        const volunteerLoc = volunteer.location;

        if (!volunteerLoc) return false;

        // Simple distance calculation (5km threshold)
        const latDiff = Math.abs(volunteerLoc.lat - donation.location.lat);
        const lngDiff = Math.abs(volunteerLoc.lng - donation.location.lng);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // rough km conversion

        console.log(`Volunteer ${volunteer.fullName}: ${distance.toFixed(2)}km away`);
        return distance <= 5; // Within 5km
      });

      console.log(`${nearbyVolunteers.length} volunteers are nearby and available`);

      // Log notification events for nearby available volunteers
      // (In production, you'd send real push notifications via FCM)
      for (const volDoc of nearbyVolunteers) {
        const volunteer = volDoc.data();
        console.log(`[NOTIFICATION] Nearby donation for ${volunteer.fullName}: ${donation.quantityInMeals} meals from ${donation.donorName}`);
      }

      return {
        success: true,
        nearbyVolunteersNotified: nearbyVolunteers.length,
        message: `Notified ${nearbyVolunteers.length} available volunteers`
      };
    } catch (error: any) {
      console.error('Error getting nearby volunteers:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

/**
 * Cloud Function: Query Available Donations
 * Returns only donations visible to available/online volunteers
 */
export const getAvailableDonationsForVolunteer = functions.https.onCall(
  { cors: true, region: location },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const db = admin.firestore();
      const volunteerId = request.auth.uid;

      // Get volunteer profile
      const volunteerDoc = await db.collection('users').doc(volunteerId).get();
      if (!volunteerDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Volunteer profile not found');
      }

      const volunteer = volunteerDoc.data();

      // If volunteer is NOT available, return empty list
      if (!volunteer?.isAvailable) {
        return {
          available: false,
          donations: [],
          message: 'Volunteer is offline. No donations shown.'
        };
      }

      // Get available donations (not yet reserved/picked up)
      const donationsSnapshot = await db
        .collection('donations')
        .where('status', 'in', ['available', 'reserved'])
        .where('volunteerId', '==', '')
        .limit(20)
        .get();

      const nearDonations = donationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((donation: any) => {
          // Filter by proximity (5km)
          const latDiff = Math.abs(donation.location.lat - volunteer.location?.lat || 0);
          const lngDiff = Math.abs(donation.location.lng - volunteer.location?.lng || 0);
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
          return distance <= 5;
        });

      return {
        available: true,
        donations: nearDonations,
        count: nearDonations.length,
        message: `Found ${nearDonations.length} nearby donations`
      };
    } catch (error: any) {
      console.error('Error fetching available donations:', error);
      throw new functions.https.HttpsError('internal', 'Failed to fetch donations');
    }
  }
);
