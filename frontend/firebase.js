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

export async function recordMatchResult(uid, username, didWin) {
  if (!uid) throw new Error('Missing uid');
  const ref = doc(db, 'leaderboard', uid);

  // Ensure doc exists so update doesn't fail.
  await ensureLeaderboardDoc(uid, username);

  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? (snap.data() || {}) : {};

    const wins = Number(data.wins) || 0;
    const losses = Number(data.losses) || 0;

    tx.update(ref, {
      username: username || data.username || null,
      wins: didWin ? wins + 1 : wins,
      losses: didWin ? losses : losses + 1,
      updatedAt: serverTimestamp(),
    });

    return true;
  });
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
    let waiting = qData.waiting || null;

    // Sanity: if waiting entry is missing required fields, ignore it.
    if (waiting && (!waiting.uid || !Array.isArray(waiting.placementData) || waiting.placementData.length === 0)) {
      tx.set(queueRef, { waiting: null, updatedAt: serverTimestamp() }, { merge: true });
      waiting = null;
    }

    // If queue entry is stale (e.g., user closed tab), clear it.
    // Firestore Timestamp can be missing on first write, so guard everything.
    try {
      const enq = waiting?.enqueuedAt;
      const ms = enq && typeof enq.toMillis === 'function' ? enq.toMillis() : null;
      const MAX_WAIT_MS = 2 * 60 * 1000; // 2 minutes
      if (waiting && (!ms || Date.now() - ms > MAX_WAIT_MS)) {
        tx.set(queueRef, { waiting: null, updatedAt: serverTimestamp() }, { merge: true });
        waiting = null;
      }
    } catch {
      // ignore and proceed
    }

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
  // Return an active game ONLY if it looks playable.
  // This avoids reusing stale games that were left "active" when the opponent left.
  const MAX_GAME_AGE_MS = 10 * 60 * 1000; // 10 minutes
  const MAX_SCAN = 10;

  async function pickFirstPlayable(q) {
    const s = await getDocs(q);
    if (s.empty) return null;

    for (const d of s.docs) {
      const g = d.data() || {};

      const p1 = g?.player1?.uid;
      const p2 = g?.player2?.uid;
      if (!p1 || !p2) continue;

      const placements = g?.placements || {};
      const p1pl = placements?.[p1];
      const p2pl = placements?.[p2];
      if (!Array.isArray(p1pl) || p1pl.length === 0) continue;
      if (!Array.isArray(p2pl) || p2pl.length === 0) continue;

      // Age check (createdAt can be missing on older docs)
      try {
        const createdAt = g?.createdAt;
        const ms = createdAt && typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : null;
        if (ms && Date.now() - ms > MAX_GAME_AGE_MS) continue;
      } catch {
        // ignore
      }

      return d.id;
    }

    return null;
  }

  const q1 = query(
    collection(db, 'games'),
    where('player1.uid', '==', uid),
    where('status', '==', 'active'),
    limit(MAX_SCAN)
  );
  const g1 = await pickFirstPlayable(q1);
  if (g1) return g1;

  const q2 = query(
    collection(db, 'games'),
    where('player2.uid', '==', uid),
    where('status', '==', 'active'),
    limit(MAX_SCAN)
  );
  const g2 = await pickFirstPlayable(q2);
  if (g2) return g2;

  return null;
}

// Best-effort cleanup: if I'm currently enqueued in matchQueue/global,
// remove myself so others don't get paired with a stale (offline) user.
export async function leaveMatchQueueIfWaiting(uid) {
  if (!uid) return false;
  const queueRef = doc(db, 'matchQueue', 'global');

  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(queueRef);
      if (!snap.exists()) return false;
      const data = snap.data() || {};
      const waiting = data.waiting || null;
      if (waiting?.uid && String(waiting.uid) === String(uid)) {
        tx.set(queueRef, { waiting: null, updatedAt: serverTimestamp() }, { merge: true });
        return true;
      }
      return false;
    });
  } catch (e) {
    console.warn('leaveMatchQueueIfWaiting failed:', e);
    return false;
  }
}
