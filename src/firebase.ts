import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCVoOjtWJKRb-dzGYs3FySFllKTaAfktxo",
  authDomain: "trip-gon-log.firebaseapp.com",
  projectId: "trip-gon-log",
  storageBucket: "trip-gon-log.firebasestorage.app",
  messagingSenderId: "836705572435",
  appId: "1:836705572435:web:209d36cff3f290ef5118a6",
  measurementId: "G-JV1BKYLB48"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with Persistent Local Cache (Offline Cache) with safety fallback
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  console.warn("Firestore persistent cache failed, falling back to default db instance", e);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

// Initialize Storage
export const storage = getStorage(app);
