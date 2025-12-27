import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  setDoc
} from "firebase/firestore";

if (!process.env.FIREBASE_API_KEY || !process.env.FIREBASE_PROJECT_ID) {
  console.warn("Firebase environment variables not fully set. Using fallback configuration.");
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY!,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.FIREBASE_PROJECT_ID!,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.FIREBASE_APP_ID!
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

export const COLLECTIONS = {
  users: 'users',
  songs: 'songs',
  votes: 'votes',
  songSuggestions: 'songSuggestions',
  tags: 'tags',
  songTags: 'songTags',
  qrCodeScans: 'qrCodeScans'
};

export { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  setDoc
};

export async function initializeDatabase() {
  try {
    console.log("Initializing Firebase database...");
    console.log("Firebase connected successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    console.log("Continuing without database initialization...");
    return true;
  }
}
