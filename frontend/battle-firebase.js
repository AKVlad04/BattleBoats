// Firebase-only battle logic for BattleBoats.
// Contract (Firestore):
// - games/{gameId}
//    - status: 'active' | 'finished'
//    - player1 { uid, username }
//    - player2 { uid, username }
//    - currentTurnUid: uid
//    - shots: { [uid]: number[] }
//    - hits:  { [uid]: number[] }
//    - winnerUid: uid | null
//    - placements: { [uid]: placementData }
// - users/{uid}.skins

import { auth, db, waitForAuthReady, getUserSkins } from './firebase.js';
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const GRID_SIZE = 10;

function toSet(arr) {
  return new Set(Array.isArray(arr) ? arr : []);
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function getOpponentUid(game, myUid) {
  if (!game?.player1?.uid || !game?.player2?.uid) return null;
  return game.player1.uid === myUid ? game.player2.uid : game.player1.uid;
}

function isMyTurn(game, myUid) {
  return String(game?.currentTurnUid || '') === String(myUid);
}

function flattenPlacementToOccupiedSet(placementData) {
  const s = new Set();
  (placementData || []).forEach(ship => {
    const occ = ship?.occupiedIndices;
    if (Array.isArray(occ)) occ.forEach(i => s.add(Number(i)));
    else if (typeof ship?.startCellIndex === 'number') s.add(Number(ship.startCellIndex));
  });
  return s;
}

function hasBothPlayers(game) {
  return Boolean(game?.player1?.uid) && Boolean(game?.player2?.uid);
}

function isParticipant(game, myUid) {
  return String(game?.player1?.uid || '') === String(myUid) || String(game?.player2?.uid || '') === String(myUid);
}

export async function startBattlePage() {
  const connectedUser = localStorage.getItem('connectedUser');
  if (!connectedUser) {
    window.location.href = 'index.html';
    return;
  }

  const myUid = localStorage.getItem('battleboats_userid');
  const gameId = localStorage.getItem('current_game_id');
  if (!myUid || !gameId) {
    window.location.href = 'menu.html';
    return;
  }

  // UI helpers
  const statusText = document.getElementById('turn-indicator');
  const enemyBoard = document.getElementById('enemy-board');
  const turnBadge = document.getElementById('turn-dot');

  function setWaitingUI() {
    statusText.innerText = '⏳ Se așteaptă un adversar...';
    statusText.style.color = '#f1c40f';
    enemyBoard.classList.add('disabled-board');
    turnBadge.classList.add('waiting');
    turnBadge.classList.remove('yours', 'theirs');
  }

  function setMyTurnUI() {
    statusText.innerText = '🟢 ESTE RÂNDUL TĂU! TRAGE!';
    statusText.style.color = '#2ecc71';
    enemyBoard.classList.remove('disabled-board');
    turnBadge.classList.remove('waiting');
    turnBadge.classList.add('yours');
    turnBadge.classList.remove('theirs');
  }

  function setTheirTurnUI() {
    statusText.innerText = '🔴 Rândul adversarului.';
    statusText.style.color = '#e74c3c';
    enemyBoard.classList.add('disabled-board');
    turnBadge.classList.remove('waiting');
    turnBadge.classList.add('theirs');
    turnBadge.classList.remove('yours');
  }

  // show something immediately (no 'Se conectează...' forever)
  setWaitingUI();

  // ensure auth is ready (mainly for skins)
  await waitForAuthReady(3000);

  const gameRef = doc(db, 'games', gameId);

  // Load my skins once for drawing my ships
  let sizeToSkin = { 1: 'img/default.png', 2: 'img/default.png', 3: 'img/default.png', 4: 'img/default.png' };
  try {
    sizeToSkin = { ...sizeToSkin, ...(await getUserSkins(myUid)) };
  } catch (e) {
    console.warn('Skins load failed:', e);
  }

  function createGrid(elementId, isEnemy) {
    const board = document.getElementById(elementId);
    board.innerHTML = '';
    board.style.display = 'grid';
    board.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 40px)`;
    board.style.gridTemplateRows = `repeat(${GRID_SIZE}, 40px)`;
    board.style.gap = '2px';

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');
      cell.dataset.index = String(i);
      if (isEnemy) {
        cell.onclick = () => handleAttack(i, cell);
      }
      board.appendChild(cell);
    }
  }

  function clearBoardShips() {
    document.querySelectorAll('#my-board .grid-cell').forEach(cell => {
      cell.style.backgroundImage = '';
      cell.style.backgroundRepeat = '';
      cell.style.backgroundPosition = '';
      cell.style.backgroundSize = '';
    });
  }

  function drawShipsFromPlacement(boardSelector, placementData, skinsMap) {
    if (!Array.isArray(placementData)) return;

    placementData.forEach(ship => {
      const occ = ship?.occupiedIndices;
      if (!Array.isArray(occ) || occ.length === 0) return;
      const len = occ.length;
      const skinPath = skinsMap?.[String(len)] || skinsMap?.[len] || 'img/default.png';

      occ.forEach(idx => {
        const cell = document.querySelector(`${boardSelector} .grid-cell[data-index='${idx}']`);
        if (!cell) return;
        cell.style.backgroundImage = `url('${String(skinPath).replace(/'/g, "\\'")}')`;
        cell.style.backgroundRepeat = 'no-repeat';
        cell.style.backgroundPosition = 'center';
        cell.style.backgroundSize = 'contain';
      });
    });
  }

  // Initialize boards
  createGrid('my-board', false);
  createGrid('enemy-board', true);

  // Subscribe to game changes
  onSnapshot(gameRef, (snap) => {
    if (!snap.exists()) {
      statusText.innerText = 'Jocul nu există.';
      enemyBoard.classList.add('disabled-board');
      return;
    }

    const game = snap.data();

    // If I'm not part of this game, bail out (stale localStorage gameId)
    if (!isParticipant(game, myUid)) {
      console.warn('Stale gameId in localStorage', { myUid, gameId, game });
      statusText.innerText = 'Nu ești participant în acest joc. Te trimit la meniu.';
      enemyBoard.classList.add('disabled-board');
      setTimeout(() => (window.location.href = 'menu.html'), 1200);
      return;
    }

    // Always (re)draw my fleet from the source of truth: game.placements
    try {
      clearBoardShips();
      const myPlacement = game?.placements?.[myUid];
      drawShipsFromPlacement('#my-board', myPlacement, sizeToSkin);
    } catch (e) {
      console.warn('Draw ships failed:', e);
    }

    // waiting for second player
    if (!hasBothPlayers(game)) {
      setWaitingUI();
      return;
    }

    if (!game?.currentTurnUid) {
      setWaitingUI();
      return;
    }

    if (game.status === 'finished') {
      showFinished(game);
      updateShotsUI(game);
      return;
    }

    if (isMyTurn(game, myUid)) setMyTurnUI();
    else setTheirTurnUI();

    updateShotsUI(game);
  });

  async function handleAttack(index, cellElement) {
    if (cellElement.dataset.shot === '1') return;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) throw new Error('Joc inexistent');
      const game = snap.data();

      if (game.status === 'finished') return;
      if (!hasBothPlayers(game)) throw new Error('Nu există încă adversar');

      if (!isMyTurn(game, myUid)) throw new Error('Nu este rândul tău');

      const oppUid = getOpponentUid(game, myUid);
      if (!oppUid) throw new Error('Adversar invalid');

      const myShots = safeArr(game?.shots?.[myUid]);
      if (myShots.includes(index)) return;

      // determine hit by checking opponent placements
      const oppPlacement = game?.placements?.[oppUid];
      const oppOcc = flattenPlacementToOccupiedSet(oppPlacement);
      const hit = oppOcc.has(index);

      const updates = {
        updatedAt: serverTimestamp(),
        [`shots.${myUid}`]: arrayUnion(index),
      };

      if (hit) {
        updates[`hits.${myUid}`] = arrayUnion(index);
      }

      // Check win condition: all opponent occupied indices are hit by me
      const prevHits = safeArr(game?.hits?.[myUid]);
      const newMyHitsSet = new Set(prevHits);
      if (hit) newMyHitsSet.add(index);

      const allOpp = Array.from(oppOcc);
      const iWon = allOpp.length > 0 && allOpp.every(v => newMyHitsSet.has(v));

      if (iWon) {
        updates.status = 'finished';
        updates.winnerUid = myUid;
      } else {
        updates.currentTurnUid = oppUid;
      }

      tx.update(gameRef, updates);
    }).catch((e) => {
      console.warn('Attack error:', e);
      // optional: show status
      statusText.innerText = `⚠️ ${e.message || e}`;
      statusText.style.color = '#f1c40f';
      setTimeout(() => {
        // status will refresh from snapshot
      }, 600);
    });

    cellElement.dataset.shot = '1';
  }
}
