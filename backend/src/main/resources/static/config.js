// Centralized API base URL.
// Network-friendly default: same-origin (empty string).
// This means: if frontend is served from http://<server-ip>:8081, API calls go to the same host.
// You can still override by setting window.API_BASE_URL before other scripts.
window.API_BASE_URL = window.API_BASE_URL || '';

// Firebase Web app config (Firebase Console -> Project settings -> Your apps -> Web app)
// NOTE: It's normal for these keys to be public; security is enforced by Auth + Firestore Rules.
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey: "AIzaSyAWy2-ZrGQaU4Hpw5aRAK6Nc9tBtZPYVsA",
  authDomain: "battleboats-f65c0.firebaseapp.com",
  projectId: "battleboats-f65c0",
  storageBucket: "battleboats-f65c0.firebasestorage.app",
  messagingSenderId: "321855650383",
  appId: "1:321855650383:web:7c6fb86a3f10955b4ac83a",
  measurementId: "G-XRZ1DVPCDJ"
};