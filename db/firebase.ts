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
    
    const usersRef = collection(firestore, COLLECTIONS.users);
    const usersSnapshot = await getDocs(usersRef);
    
    if (usersSnapshot.empty) {
      console.log("Inserting sample data...");
      
      await addDoc(usersRef, {
        username: 'cagoo',
        password: '$2b$10$gsypgex3yfikc9FZilmbtOTwTU3gZuhuUbt3kFS.9TD2Zx7YTKI/q',
        isAdmin: true,
        createdAt: Timestamp.now()
      });
      
      await addDoc(usersRef, {
        username: 'user',
        password: '$2b$10$aW5uZXJfcGFzc3dvcmRfaO5FnJ3BMJkCJQxdlgYeGT4bOWOZwJZWS',
        isAdmin: false,
        createdAt: Timestamp.now()
      });
      
      const songsRef = collection(firestore, COLLECTIONS.songs);
      await addDoc(songsRef, {
        title: 'Wonderwall',
        artist: 'Oasis',
        key: 'G',
        notes: 'Beginner friendly',
        lyrics: 'Today is gonna be the day...',
        createdBy: null,
        isActive: true,
        createdAt: Timestamp.now()
      });
      
      await addDoc(songsRef, {
        title: 'Hotel California',
        artist: 'Eagles',
        key: 'Bm',
        notes: 'Classic solo',
        lyrics: 'On a dark desert highway...',
        createdBy: null,
        isActive: true,
        createdAt: Timestamp.now()
      });
      
      await addDoc(songsRef, {
        title: 'Yellow',
        artist: 'Coldplay',
        key: 'B',
        notes: 'Use capo on 4th fret',
        lyrics: 'Look at the stars...',
        createdBy: null,
        isActive: true,
        createdAt: Timestamp.now()
      });
      
      const tagsRef = collection(firestore, COLLECTIONS.tags);
      const tagNames = ['rock', 'acoustic', 'pop', 'beginner', 'advanced'];
      for (const name of tagNames) {
        await addDoc(tagsRef, {
          name,
          createdAt: Timestamp.now()
        });
      }
      
      console.log("Sample data inserted successfully");
    }
    
    const songsRef = collection(firestore, COLLECTIONS.songs);
    const songsSnapshot = await getDocs(songsRef);
    console.log(`Firebase connected successfully with ${songsSnapshot.size} songs`);
    
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    console.log("Continuing without sample data...");
    return true;
  }
}
