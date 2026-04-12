import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBP0yrt2nJeKAQBGaEcczY5K6qsXueMHLQ",
  authDomain: "fooddonation-d8aeb.firebaseapp.com",
  projectId: "fooddonation-d8aeb",
  storageBucket: "fooddonation-d8aeb.firebasestorage.app",
  messagingSenderId: "728786608759",
  appId: "1:728786608759:web:d0102207dab876e4b19c72",
  measurementId: "G-W01NKPREHK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch(console.error);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
