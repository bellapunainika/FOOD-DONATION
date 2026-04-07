# Documentation: AI ENABLED FEED HUNGER

## 1. Project Abstract
“AI Enabled Feed Hunger” is a comprehensive full-stack web application designed to combat food waste and alleviate hunger by directly bridging the gap between those with surplus food and those in need. The platform connects Donors (restaurants, event organizers, and individuals) with registered NGOs and active Delivery Volunteers. Through a responsive real-time map interface, stakeholders can identify available leftover food dynamically weighted by urgency and proximity. The integration of the Google Vertex AI Gemini model empowers a smart chatbot assistant that guides users through onboarding, operational queries, and food safety standards. Built leveraging React, TypeScript, Tailwind CSS, and Firebase Serverless Architecture, this platform streamlines the logistics of food donation with high availability, modern aesthetic UX, and immediate local impact.

## 2. Problem Statement
Annually, millions of tons of prepared food from restaurants, catering events, and hostels are discarded due to logistical friction and strict expiry windows. Simultaneously, numerous disadvantaged individuals suffer from severe hunger. Existing food delivery apps only transport purchased meals, while traditional NGOs struggle with immediate matching of spontaneous food surplus pickups before it spoils.

## 3. Proposed Solution
A unified marketplace-style platform that serves three distinct user groups:
- **Donors** easily list surplus food specifying expiry times and storage requirements.
- **NGOs** use an interactive map and urgency algorithms to accept active allocations rapidly.
- **Delivery Volunteers** accept transit responsibilities handling the immediate physical chain from Donor to NGO cleanly.
The entire workflow happens seamlessly and safely on the web with AI-powered customer support to reduce administrative bottlenecks.

## 4. System Architecture
The application runs entirely on a scalable, Serverless Architecture using modern JAMStack paradigms, circumventing the need for a persistent traditional backend server.

```text
                            +--------------------------+
                            | Vertex AI Gemini (LLM)   |
                            +--------------------------+
                                       ^
                                       | (REST API via Helper)
+----------------+          +--------------------------+
|  React Client  |  <====>  | Firebase Cloud Functions |
|  (Frontend UI) |          | (NodeJS Backend Logic)   |
+----------------+          +--------------------------+
        ^                              ^
        | (Auth, Real-time Reads)      | (Triggers/Admin SDK)
        v                              v
+------------------------------------------------------+
|             Firebase Cloud Backend                   |
| 1. Authentication (Google & Email/Password)          |
| 2. Firestore Document Database                       |
| 3. Firebase Hosting (CDN)                            |
+------------------------------------------------------+
```

## 5. Tech Stack Used
- **Frontend / Core Logic:** `React 18` and `TypeScript`. Chosen for strictly-typed component-driven UI architecture, drastically reducing runtime bugs.
- **Styling:** `Tailwind CSS`. Adopted to create premium dynamic aesthetics inherently responsive and optimized.
- **Backend / Real-time DB:** `Firebase Firestore`. Document NoSQL database allows real-time data syncs via WebSockets—essential for the active map markers and "urgent Pickup" claims without page-reloads.
- **Authentication:** `Firebase Auth`. Chosen for seamless identity management including Google OAuth provider bridging role-based access.
- **AI Engine:** `Vertex AI Gemini`. The most capable and robust cloud LLM to date, used via Cloud Functions to abstract API tokens securely from the client side.
- **Mapping:** `React-Leaflet` + `OpenStreetMap`. Offers a lightweight, free geospatial mapping capability without Google Maps billing overhead.

## 6. Database Design
We use Firestore (NoSQL). Collections:
- `users`: Contains `UserProfile` attributes. 
  - Fields: `uid`, `email`, `role` (donor/ngo/volunteer), `fullName`, `phoneNumber`, `location` (object), `createdAt`. Specific fields: `donorType`, `ngoRegNumber`.
- `donations`: Represents the food listing and its transit lifecycle.
  - Fields: `donorId`, `donorName`, `status` (available, reserved, picked_up, delivered), `foodCategory`, `quantityInMeals`, `preparedTime`, `expiryTime`, `storageInfo`, `location` (object), `reservedByNgoId`, `volunteerId`. 

## 7. Module Description
- **Authentication Module:** Registers entities cleanly categorizing them structurally into the correct authorization `role`.
- **Donor Module:** Provides forms ensuring food safety guidelines are validated. Shows live urgency (Green/Safe, Yellow/Moderate, Red/Critical) calculated contextually based on `expiryTime`.
- **NGO Module:** Consolidates available points on a live Leaflet map. Allows NGO admins to "Accept Allocation", mutating the donation state to 'reserved'.
- **Volunteer Module:** Maps 'reserved' jobs. Allows volunteer to accept transit, then subsequently trigger lifecycle steps marking instances 'picked_up' and ultimately 'delivered'.
- **AI Chatbot Module:** A floating widget that communicates continuously with a Cloud Function interfacing the Vertex AI.

## 8. AI Feature Explanation
The AI is powered by `gemini-1.5-pro-preview-0409`. When a user types a message in the frontend, it invokes a Firebase Callable HTTPS Cloud Function securely payloading the message. The backend explicitly injects systemic instructions identifying it as the "Feed Hunger Customer Assistant", prompting the LLM accurately. The generated string is piped directly back into the chat UI. This abstracts sensitive AI keys from the browser payload preventing malicious invocations.

## 9. Security Implementation
- **Firestore Security Rules**: Rules explicitly dictate read/write bounds based on Firebase Auth identity (`request.auth.uid`). A user can only write to their own profile, and Donors can only construct allocations matching their intrinsic `uid`.
- **Protected Routing Context**: In React, `ProtectedRoute.tsx` wraps endpoints checking against `userProfile.role` ensuring malicious endpoints cannot be artificially accessed by unauthenticated spoofers.

## 10. Deployment Architecture
Artifacts are built using Webpack via `react-scripts`. Static assets are minified and pushed aggressively into edge nodes defined by Firebase Hosting CDN guaranteeing extremely fast Time-To-Interactive global load times. Backend handlers run asynchronously on Google Cloud infrastructure invoked as Firebase Functions payload.

## 11. Future Enhancements
1. **Blockchain Integration:** Ensure immutable and highly transparent history tracking verifying that food actually reached its NGO without tampering.
2. **AI Quality Image Assessment:** Passing photo uploads into Vertex Vision models to probabilistically verify food hygiene instantly before listing.
3. **Advanced Geospatial Queries:** Utilize Geohashes to query available pickups exclusively within a strict 5km/10km radius rather than sweeping the entire collection filter.
4. **Driver Dynamic Routing:** Implementing Traveling Salesperson algorithm optimizations to queue multiple pickups optimally for a volunteer based on current live traffic matrices.
5. **Push Notifications (FCM):** Proactively alerting nearby volunteers on mobile devices literally within seconds of an NGO accepting a highly critical expiring donation.

## 12. Viva Q&A (Evaluator Handbook)

**Q1: Why did you choose React over traditional HTML/PHP?**
*A:* Because of its single-page application (SPA) nature granting instantaneous reactivity. Our application relies fundamentally on real-time map updates and dynamic urgency metrics without reloading the DOM. Component architecture also promoted high code reusability.

**Q2: What is Vertex AI and why not just call the Gemini API from the frontend?**
*A:* Vertex AI is Google Cloud's enterprise machine learning platform. Calling the Gemini SDK natively from the client exposes our API constraints or service account keys. Moving the execution strictly into a serverless Firebase Function protects our infrastructure computationally and financially.

**Q3: How are you managing real-time data synchronization?**
*A:* Through Firebase Firestore's WebSocket integrations (via the `onSnapshot` listener). When a volunteer hits 'Pick Up' in their browser, Firestore triggers a doc update which natively pushes out to the NGO dashboard within milliseconds, eliminating manual querying polling.

**Q4: How does the application decide the urgency of the food?**
*A:* When a donor submits food, they define an expiry timeframe (e.g., 4 hours). We establish an absolute Unix timestamp. The UI strictly calculates `hoursLeft = (expiryTime - Date.now())`. Above 6 is Safe, under 6 is Moderate, under 2 is Critical. 

**Q5: What routing strategy prevents an NGO from accessing the Donor dashboard?**
*A:* The `ProtectedRoute` higher-order component. On route transition, if the logged-in user's context specifies `role: "ngo"`, they are inherently rejected functionally if they attempt to load the `/dashboard/donor` route mappings.

**Q6: What happens if food expires before an NGO accepts it?**
*A:* Our urgency calculator checks the timestamp. In a production pipeline, a cron-job (Cloud Scheduler) would routinely sweep Firestore to flip statuses explicitly to 'expired'. Right now, the frontend renders it as 'Expired' locking interaction dynamically.

**Q7: Explain your Firestore Security Rules strategy.**
*A:* We implement rule-based attribute verification on writes. `allow write: if request.auth != null && request.auth.uid == userId` strictly defines that even if an attacker manipulates the client connection to dispatch an edit against a fellow user, the Firestore interpreter immediately kills the transaction at the network edge.

**Q8: Why NoSQL over a Relational DB (SQL) for this specific project?**
*A:* Schema malleability. The properties of donors vastly differ from NGOs. Creating sparse columns in SQL wastes resources. NoSQL allows us to nest object properties (like `hygieneChecklist`) fluently mapped via TypeScript definitions strictly rather than SQL joins.

**Q9: Did you face any issues storing location data?**
*A:* Instead of complex PostGIS extensions, we stored straightforward `lat` and `lng` floats. While pure Firestore doesn't traditionally support sophisticated bounding-box queries dynamically, we mitigated this natively in JavaScript using haversine math or directly integrating coordinates via React-Leaflet libraries.

**Q10: Are there measures to prevent malicious fake donations?**
*A:* In MVP, we attach identities securely to standard Google Auth footprints creating accountability. For enhancement, integrating image upload Verification (matching against raw Vertex Vision signatures) would probabilistically flag 'fake' or highly unsafe food uploads reliably before NGOs are triggered.

*(Note: These representative Q&As span Firebase, React state, Architecture abstractions, AI implementations, scalability limits, and Map operations ensuring thorough theoretical comprehension for eval matrices.)*
