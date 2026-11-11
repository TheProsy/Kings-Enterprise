import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';

// Firebase web configuration is a public identifier (security is enforced by
// Firestore rules), so the production values are kept as build-safe defaults.
// Environment variables still take precedence when provided.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD2HuvDjNQkGlnCSxaClicmIhIMOzVX4y4',
  authDomain: 'blessed-kings-enterprises.firebaseapp.com',
  projectId: 'blessed-kings-enterprises',
  storageBucket: 'blessed-kings-enterprises.firebasestorage.app',
  messagingSenderId: '170309180270',
  appId: '1:170309180270:web:4f2d19c61b15a4f5343f7f',
} as const;

const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const apiKey =
  typeof envApiKey === 'string' && /^AIza[\w-]{30,}$/.test(envApiKey)
    ? envApiKey
    : DEFAULT_FIREBASE_CONFIG.apiKey;

const firebaseConfig = {
  apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { app, auth, db, firebaseConfig };
export type { FirebaseApp, Auth, Firestore };
