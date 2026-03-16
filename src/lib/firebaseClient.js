// ── PantriPal Firebase Client ────────────────────────────────
// Centralizes Firebase initialization, auth, and Firestore access.
// Config is loaded from Vite env vars (VITE_FIREBASE_*).
// When env vars are missing the app falls back to demo mode.

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// ── Config from environment ─────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "",
};

// ── Demo mode (no valid config → local-only data) ───────────
export const IS_DEMO =
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey === "PASTE_YOUR_API_KEY_HERE";

// ── Lazy-initialized singletons ─────────────────────────────
let _app = null;
let _auth = null;
let _db = null;
let _storage = null;

/**
 * Returns Firebase instances + all auth/firestore helper functions.
 * Initializes on first call, caches afterwards.
 * Stays async to keep call-site API unchanged (`const fb = await getFirebase()`).
 */
export async function getFirebase() {
  if (_app) {
    return _bundle();
  }

  try {
    _app = initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db = getFirestore(_app);
    _storage = getStorage(_app);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
    throw new Error(
      "Firebase failed to initialize. Check your environment config (.env)."
    );
  }

  return _bundle();
}

// ── Private: assemble the return object ─────────────────────
function _bundle() {
  return {
    auth: _auth,
    db: _db,
    storage: _storage,
    // Auth helpers
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    // Firestore helpers
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    onSnapshot,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    // Storage helpers
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
  };
}
