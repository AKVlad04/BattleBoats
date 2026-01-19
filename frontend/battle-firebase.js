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

function isOppTurn(game, myUid) {
  const oppUid = getOpponentUid(game, myUid);
  if (!oppUid) return false;
  return String(game?.currentTurnUid || '') === String(oppUid);
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

function getOtherUid(game, uid) {
  const p1 = game?.player1?.uid;
  const p2 = game?.player2?.uid;
  if (!p1 || !p2) return null;
  return String(p1) === String(uid) ? p2 : p1;
}

function playSound(name) {
  try {
    const a = new Audio(`sounds/${name}.mp3`);
    a.volume = 0.75;
    a.play().catch(() => {});
  } catch {
    // ignore
  }
}

function showFinished(game, myUid) {
  const enemyBoard = document.getElementById('enemy-board');
  const statusText = document.getElementById('turn-indicator');
  const banner = document.getElementById('end-banner');
  const actions = document.getElementById('end-actions');

  enemyBoard?.classList.add('disabled-board');

  if (statusText) statusText.style.display = 'none';

  const winnerIsMe = String(game?.winnerUid || '') === String(myUid);
  if (banner) {
    banner.style.display = 'block';
    banner.classList.remove('win', 'lose');
    banner.classList.add(winnerIsMe ? 'win' : 'lose');
    banner.innerText = winnerIsMe ? '🏆 VICTORIE!' : '💀 ÎNFRÂNGERE!';
  }

  try {
    const dot = document.getElementById('turn-dot');
    dot?.classList.remove('yours', 'theirs', 'waiting');
  } catch {}

  if (actions) actions.style.display = 'flex';

  playSound(winnerIsMe ? 'win' : 'lose');
}

function animateHit(cell) {
  if (!cell) return;
  cell.classList.remove('hit-flash');
  // force reflow
  void cell.offsetWidth;
  cell.classList.add('hit-flash');
}

function animateMiss(cell) {
  if (!cell) return;
  cell.classList.remove('miss-shake');
  void cell.offsetWidth;
  cell.classList.add('miss-shake');
}

function updateIncomingShotsUI(game, myUid) {
  const myBoard = document.getElementById('my-board');
  const oppUid = getOtherUid(game, myUid);
  if (!myBoard || !oppUid) return;

  const incomingShots = toSet(game?.shots?.[oppUid]);
  const incomingHits = toSet(game?.hits?.[oppUid]);

  myBoard.querySelectorAll('.grid-cell').forEach((cell) => {
    const idx = Number(cell.dataset.index);
    if (!incomingShots.has(idx)) return;

    const isHit = incomingHits.has(idx);

    // If the cell has a ship-skin background, prefer a "damaged" effect instead of painting red.
    const hasShipSkin = Boolean(cell.style.backgroundImage);

    if (isHit) {
      if (hasShipSkin) {
        cell.classList.add('hit-skin');
        cell.textContent = '';
      } else {
        cell.classList.add('hit');
        cell.textContent = '💥';
      }
      animateHit(cell);
    } else {
      cell.classList.add('miss');
      cell.textContent = '❌';
      animateMiss(cell);
    }
  });
}

function hasBothPlayers(game) {
  return Boolean(game?.player1?.uid) && Boolean(game?.player2?.uid);
}

function hasPlacement(game, uid) {
  const p = game?.placements?.[uid];
  return Array.isArray(p) && p.length > 0;
}

function updateShotsUI(game, myUid) {
  const enemyBoard = document.getElementById('enemy-board');
  const myShots = toSet(game?.shots?.[myUid]);
  const myHits = toSet(game?.hits?.[myUid]);

  enemyBoard?.querySelectorAll('.grid-cell').forEach((cell) => {
    const idx = Number(cell.dataset.index);
    const shot = myShots.has(idx);
    const hit = myHits.has(idx);

    cell.classList.toggle('hit', shot && hit);
    cell.classList.toggle('miss', shot && !hit);

    if (shot) {
      cell.dataset.shot = '1';
    } else {
      delete cell.dataset.shot;
    }
  });
}

function isParticipant(game, myUid) {
  return String(game?.player1?.uid || '') === String(myUid) || String(game?.player2?.uid || '') === String(myUid);
}

function isGamePlayableForUser(game, myUid) {
  if (!hasBothPlayers(game)) return false;
  const oppUid = getOpponentUid(game, myUid);
  if (!oppUid) return false;
  if (!hasPlacement(game, myUid)) return false;
  if (!hasPlacement(game, oppUid)) return false;
  if (!game?.currentTurnUid) return false;
  // currentTurnUid must be one of the two players
  const t = String(game.currentTurnUid);
  if (t !== String(myUid) && t !== String(oppUid)) return false;
  return true;
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

  // If we detect a stale/ghost game, self-heal by clearing local storage and sending back to menu.
  let didAutoLeave = false;
  function autoLeaveToMenu(reason) {
    if (didAutoLeave) return;
    didAutoLeave = true;

    console.warn('Auto-leaving stale game:', reason, { myUid, gameId });
    try {
      localStorage.removeItem('current_game_id');
    } catch {}

    statusText.innerText = reason || 'Joc invalid. Te trimit la meniu.';
    statusText.style.color = '#f1c40f';
    enemyBoard.classList.add('disabled-board');

    setTimeout(() => {
      window.location.href = 'menu.html';
    }, 900);
  }

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
  let nonPlayableSinceMs = null;
  const NON_PLAYABLE_GRACE_MS = 6000; // wait a bit for Firestore to sync before treating as stale

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
      nonPlayableSinceMs = null;
      setWaitingUI();
      return;
    }

    // If we have both players, but game isn't playable for too long, it's likely stale.
    if (!isGamePlayableForUser(game, myUid)) {
      if (nonPlayableSinceMs == null) nonPlayableSinceMs = Date.now();

      setWaitingUI();
      updateShotsUI(game, myUid);
      updateIncomingShotsUI(game, myUid);

      if (Date.now() - nonPlayableSinceMs > NON_PLAYABLE_GRACE_MS) {
        autoLeaveToMenu('Nu am găsit un adversar valid. Reîncearcă matchmaking.');
      }
      return;
    }

    nonPlayableSinceMs = null;

    // Finished
    if (game.status === 'finished') {
      showFinished(game, myUid);
      updateShotsUI(game, myUid);
      updateIncomingShotsUI(game, myUid);
      return;
    }

    // Turn UI: only show their-turn if it's strictly opponent's turn.
    if (isMyTurn(game, myUid)) setMyTurnUI();
    else if (isOppTurn(game, myUid)) setTheirTurnUI();
    else {
      // Safety fall-back for any weird value
      setWaitingUI();
    }

    updateShotsUI(game, myUid);
    updateIncomingShotsUI(game, myUid);
  });

  async function handleAttack(index, cellElement) {
    if (cellElement.dataset.shot === '1') return;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) throw new Error('Joc inexistent');
      const game = snap.data();

      if (game.status === 'finished') return;
      if (!hasBothPlayers(game)) throw new Error('Nu există încă adversar');

      const oppUid = getOpponentUid(game, myUid);
      if (!oppUid) throw new Error('Adversar invalid');

      // Don't allow play until both sides placed ships; avoids swapping turns to a "ghost".
      if (!hasPlacement(game, myUid) || !hasPlacement(game, oppUid)) {
        throw new Error('Se așteaptă plasarea navelor...');
      }

      if (!isMyTurn(game, myUid)) throw new Error('Nu este rândul tău');

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
        // Battleship rule: if you HIT, you keep shooting; only switch on MISS.
        if (!hit) {
          updates.currentTurnUid = oppUid;
        }
      }

      tx.update(gameRef, updates);
    }).catch((e) => {
      console.warn('Attack error:', e);
      // optional: show status
      statusText.innerText = `⚠️ ${e?.message || e}`;
      statusText.style.color = '#f1c40f';
      setTimeout(() => {
        // status will refresh from snapshot
      }, 600);
    });

    cellElement.dataset.shot = '1';
  }
}
