// Firebase (modular SDK) setup + helpers for Auth/Firestore.
// This file is loaded as an ES module from HTML (type="module").

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  runTransaction,
  deleteDoc,
  onSnapshot,
  limit,
  increment,
  enableIndexedDbPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

function requireFirebaseConfig() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || !cfg.projectId) {
    throw new Error(
      'Missing Firebase config. Set window.FIREBASE_CONFIG in config.js (apiKey, authDomain, projectId, etc.).'
    );
  }
  return cfg;
}

const app = initializeApp(requireFirebaseConfig());
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence to speed up subsequent loads.
// If multiple tabs are open, this can throw; we ignore and continue.
try {
  enableIndexedDbPersistence(db);
} catch (e) {
  // no-op
}

// ----- Auth helpers -----

// We map the old "username" concept to an email for Firebase Auth.
// This keeps the UI unchanged (username + password fields).
export function usernameToEmail(username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return '';
  // Use projectId to avoid collisions if you reuse usernames across projects.
  const projectId = requireFirebaseConfig().projectId;
  return `${clean}@${projectId}.battleboats.local`;
}

export function waitForAuthReady(timeoutMs = 3000) {
  return new Promise((resolve) => {
    let done = false;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (done) return;
      if (u) {
        done = true;
        unsub();
        resolve(u);
      }
    });

    setTimeout(() => {
      if (done) return;
      done = true;
      try { unsub(); } catch {}
      resolve(auth.currentUser);
    }, timeoutMs);
  });
}

export async function ensureLeaderboardDoc(uid, username) {
  const ref = doc(db, 'leaderboard', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // keep username in sync if provided
    if (username) {
      const data = snap.data() || {};
      if (!data.username || data.username !== username) {
        await updateDoc(ref, { username, updatedAt: serverTimestamp() });
      }
    }
    return snap.data();
  }

  const data = {
    username: username || null,
    wins: 0,
    losses: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, data);
  return data;
}

export async function fbRegister(username, password) {
  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Store displayName for convenience.
  await updateProfile(cred.user, { displayName: username });

  // Ensure user profile exists in Firestore.
  await ensureUserDoc(cred.user.uid, username);
  await ensureLeaderboardDoc(cred.user.uid, username);
  return cred.user;
}

export async function fbLogin(username, password) {
  const email = usernameToEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  // Ensure user doc exists (in case old users were created without it).
  await ensureUserDoc(cred.user.uid, username);
  await ensureLeaderboardDoc(cred.user.uid, username);
  return cred.user;
}

export async function fbLogout() {
  await signOut(auth);
}

export function fbOnAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

// ----- Firestore data model -----
// users/{uid}:
//  - username: string
//  - createdAt: serverTimestamp
//  - skins: { "1": "img/default.png", "2": "...", ... }
//
// matchQueue/global:
//  - waiting: { uid, username, placementData, enqueuedAt }
//
// games/{gameId}:
//  - status: "active" | "finished"
//  - createdAt: serverTimestamp
//  - player1: { uid, username }
//  - player2: { uid, username }
//  - placements: { [uid]: placementData }
//
// NOTE: Option B matchmaking uses a single queue document + transaction.
// This avoids listing all waiting games (more secure).

export async function ensureUserDoc(uid, username) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const defaultSkins = {
    '1': 'img/default.png',
    '2': 'img/default.png',
    '3': 'img/default.png',
    '4': 'img/default.png',
  };

  const data = {
    username: username || null,
    createdAt: serverTimestamp(),
    skins: defaultSkins,
  };

  await setDoc(ref, data);
  return data;
}

export async function getUserSkins(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Fallback: create doc and return defaults.
    const u = auth.currentUser;
    const uname = u?.displayName || (u?.email ? u.email.split('@')[0] : '');
    const created = await ensureUserDoc(uid, uname);
    return created.skins;
  }
  const data = snap.data();
  return data.skins || {};
}

export async function saveUserSkins(uid, skinsObj) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { skins: skinsObj });
}

// Secure matchmaking (no queries over waiting games).
// Contract:
// - If no one is waiting: enqueue current user and return {gameId: null, status:'waiting'}.
// - If someone is waiting (not self): create a new game and return {gameId, status:'active'}.
export async function joinOrCreateGame(uid, username, placementData) {
  const queueRef = doc(db, 'matchQueue', 'global');

  return await runTransaction(db, async (tx) => {
    const qSnap = await tx.get(queueRef);
    const qData = qSnap.exists() ? (qSnap.data() || {}) : {};
    const waiting = qData.waiting || null;

    // If queue is empty, or it's us (stale retry), enqueue.
    if (!waiting || waiting.uid === uid) {
      tx.set(
        queueRef,
        {
          waiting: {
            uid,
            username,
            placementData,
            enqueuedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return { gameId: null, status: 'waiting' };
    }

    // Someone else is waiting: pair and create game.
    const gamesCol = collection(db, 'games');
    const gameRef = doc(gamesCol); // create id client-side

    const player1Uid = waiting.uid;
    const player2Uid = uid;

    tx.set(gameRef, {
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      player1: { uid: player1Uid, username: waiting.username },
      player2: { uid: player2Uid, username },

      // IMPORTANT: decide whose turn starts
      currentTurnUid: player1Uid,

      // initialize shot/hit maps so UI can render without undefined
      shots: {
        [player1Uid]: [],
        [player2Uid]: [],
      },
      hits: {
        [player1Uid]: [],
        [player2Uid]: [],
      },

      placements: {
        [player1Uid]: waiting.placementData,
        [player2Uid]: placementData,
      },
    });

    // Clear queue
    tx.set(queueRef, { waiting: null, updatedAt: serverTimestamp() }, { merge: true });

    return { gameId: gameRef.id, status: 'active' };
  });
}

export async function getMyActiveGameId(uid) {
  // Query for an active game where the user is either player1 or player2.
  // We keep it to 1 result to reduce reads.
  const q1 = query(collection(db, 'games'), where('player1.uid', '==', uid), where('status', '==', 'active'), limit(1));
  const s1 = await getDocs(q1);
  if (!s1.empty) return s1.docs[0].id;

  const q2 = query(collection(db, 'games'), where('player2.uid', '==', uid), where('status', '==', 'active'), limit(1));
  const s2 = await getDocs(q2);
  if (!s2.empty) return s2.docs[0].id;

  return null;
}
