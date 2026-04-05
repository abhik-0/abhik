import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Placeholder configuration - will be replaced if firebase-applet-config.json exists
const defaultFirebaseConfig = {
  apiKey: "TODO_KEYHERE",
  authDomain: "TODO_AUTH_DOMAIN",
  projectId: "TODO_PROJECT_ID",
  storageBucket: "TODO_STORAGE_BUCKET",
  messagingSenderId: "TODO_MESSAGING_SENDER_ID",
  appId: "TODO_APP_ID"
};

import firebaseConfig from '../firebase-applet-config.json';

// Check if the config is valid (not placeholders)
export const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "TODO_KEYHERE" && 
  !firebaseConfig.apiKey.includes("TODO");

let app;
let db: any = null;
let auth: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { db, auth, googleProvider };
export { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, signInWithPopup, onAuthStateChanged };
export type { User };
