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

    const prompt = `You are the AI customer service chatbot for 'AI ENABLED FEED HUNGER', a platform connecting donors (restaurants/events), NGOs, and volunteers to reduce food waste. 
User asks: ${message}
Respond helpfully.`;

    const resp = await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return { response: resp.response.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated." };
  } catch (error: any) {
    console.error("Vertex AI Error:", error);
    
    // Fallback response for un-configured environments during eval Demo
    let demoResponse = "I'm the AI assistant for Feed Hunger. I can answer questions about donations, navigation, or NGO sign-up!";
    const msg = message.toLowerCase();
    
    if (msg.includes('donate')) {
       demoResponse = "To donate food, log in as a Donor, go to your Dashboard, and click '+ Add Food Donation'. Be sure to list the expiry time!";
    } else if (msg.includes('volunteer') || msg.includes('delivery')) {
       demoResponse = "Volunteers can view active pickups directly on their map dashboard. Simply accept a delivery, pick it up, and drop it at the NGO.";
    } else if (msg.includes('ngo')) {
       demoResponse = "NGOs can view real-time maps of nearby surplus food and allocate it instantly to active volunteers in the area.";
    }
    
    return { 
       response: demoResponse + "\n\n*(Vertex AI unavailable locally. Falling back to local smart-replies.)*"
    };
  }
});
