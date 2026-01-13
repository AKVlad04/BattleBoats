// --- CONSTANTE ȘI STARE GLOBALĂ ---
const API_BASE_URL = (window.API_BASE_URL || 'http://localhost:8081');
const dockElement = document.getElementById('dock');
const boardElement = document.getElementById('my-board');
const confirmBtn = document.getElementById("confirm-btn");
const GRID_SIZE = 10;

// culoarea apei, folosită când resetăm celule
const WATER_COLOR = "#2980b9";

// Stare globală D&D
const placedShips = [];
let draggedShipLength = 0;
let draggedShipId = null;
let isDraggingFromBoard = false;
let dragOffset = 0;
let draggedShipOrientation = true; // true = horizontal

// --- AUTH GUARD (nu permitem acces fara login) ---
const connectedUser = localStorage.getItem("connectedUser");
if (!connectedUser) {
    window.location.href = "index.html";
}

// --- 1. IDENTITATE UTILIZATOR (folosim ID-ul din DB) ---
let userId = null;

async function initUserIdFromLogin() {
    if (!connectedUser) return;
    const res = await fetch(`${API_BASE_URL}/api/auth/user/${connectedUser}`);
    if (!res.ok) throw new Error("Nu pot încărca user-ul logat");
    const userData = await res.json();
    userId = String(userData.id);
    localStorage.setItem("battleboats_userid", userId);
}

// --- INIȚIALIZARE ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await initUserIdFromLogin();
    } catch (e) {
        console.error(e);
        localStorage.removeItem("connectedUser");
        window.location.href = "index.html";
        return;
    }

    createBoard();
    fetchAndDisplaySavedShips();
});

function createBoard() {
    boardElement.innerHTML = "";
    boardElement.style.setProperty('--grid-rows', GRID_SIZE);
    boardElement.style.setProperty('--grid-cols', GRID_SIZE);

    for (let i = 0; i < (GRID_SIZE * GRID_SIZE); i++) {
        const cell = document.createElement("div");
        cell.classList.add("grid-cell");
        cell.dataset.index = i;
        cell.dataset.x = i % GRID_SIZE;
        cell.dataset.y = Math.floor(i / GRID_SIZE);

        cell.addEventListener("dragover", handleDragOver);
        cell.addEventListener("dragleave", clearHighlights);
        cell.addEventListener("drop", handleDrop);

        boardElement.appendChild(cell);
    }
}

// 2. Navele standard pentru toți jucătorii
async function fetchAndDisplaySavedShips() {
    // Nave fixe: 4x1, 3x2, 2x3, 1x4 blocuri
    const standardShips = [
        { id: 1, name: "Barcă 1", size: 1 },
        { id: 2, name: "Barcă 2", size: 1 },
        { id: 3, name: "Barcă 3", size: 1 },
        { id: 4, name: "Barcă 4", size: 1 },
        { id: 5, name: "Distrugător 1", size: 2 },
        { id: 6, name: "Distrugător 2", size: 2 },
        { id: 7, name: "Distrugător 3", size: 2 },
        { id: 8, name: "Crucișător 1", size: 3 },
        { id: 9, name: "Crucișător 2", size: 3 },
        { id: 10, name: "Portavion", size: 4 }
    ];

    // Obținem username-ul din localStorage
    const username = localStorage.getItem("connectedUser");
    let userSkins = {};

    if (username) {
        try {
            // Obținem ID-ul userului din backend
            const userResponse = await fetch(`${API_BASE_URL}/api/auth/user/${username}`);
            if (userResponse.ok) {
                const userData = await userResponse.json();
                const userIdFromDB = userData.id;

                // Obținem skin-urile userului
                const skinsResponse = await fetch(`${API_BASE_URL}/api/skins/${userIdFromDB}`);
                if (skinsResponse.ok) {
                    userSkins = await skinsResponse.json();
                }
            }
        } catch (error) {
            console.error("Eroare la încărcarea skin-urilor:", error);
        }
    }

    // Atașăm skin-urile la nave
    standardShips.forEach(ship => {
        ship.skinPath = userSkins[ship.size] || "img/default.png";
    });

    displayShipsInDock(standardShips);
}

// 3. Afișează navele în Dock
function displayShipsInDock(ships) {
    dockElement.innerHTML = '';

    ships.forEach(ship => {
        const shipDiv = document.createElement('div');
        shipDiv.className = 'ship-preview';
        shipDiv.draggable = true;

        shipDiv.id = `ship-${ship.id}`;
        shipDiv.dataset.length = ship.size;
        shipDiv.dataset.id = ship.id.toString();
        shipDiv.dataset.skinPath = ship.skinPath || "img/default.png";

        // In dock afisam doar skin-ul, repetat pe lungime (ship.size)
        const skinPath = shipDiv.dataset.skinPath;
        shipDiv.innerHTML = `
            <div class="ship-skin" style="--ship-len:${ship.size}; --skin-url:url('${skinPath.replace(/'/g, "\\'")}')"></div>
        `;

        // --- Logica DragStart ---
        shipDiv.addEventListener("dragstart", (e) => {
            isDraggingFromBoard = false;
            draggedShipLength = parseInt(e.currentTarget.dataset.length);
            draggedShipId = e.currentTarget.dataset.id;
            dragOffset = 0;
            draggedShipOrientation = true;

            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", draggedShipId);

            // FIX: Ascundem nava cu întârziere pentru a nu bloca drag-ul
            setTimeout(() => {
                e.target.style.display = "none";
            }, 0);
        });

        shipDiv.addEventListener("dragend", handleDragEnd);
        dockElement.appendChild(shipDiv);
    });

    checkGameReady();
}

// --- LOGICA DRAG & DROP ---

function handleDragOver(e) {
    e.preventDefault();
    const cell = e.target.closest('.grid-cell');
    if (!cell) return;

    const targetIndex = parseInt(cell.dataset.index);
    let startIndex = calculateStartIndex(targetIndex, draggedShipOrientation);
    const indices = calculateIndices(startIndex, draggedShipLength, draggedShipOrientation);

    clearHighlights();

    if (isValidPlacement(indices, draggedShipId)) {
        indices.forEach(idx => getCell(idx)?.classList.add("hover-valid"));
    } else {
        indices.forEach(idx => {
            if(idx >= 0 && idx < 100) getCell(idx)?.classList.add("hover-invalid");
        });
    }
}

function handleDrop(e) {
    e.preventDefault();
    clearHighlights();

    const cell = e.target.closest('.grid-cell');
    if (!cell) return;

    const targetIndex = parseInt(cell.dataset.index);
    let startIndex = calculateStartIndex(targetIndex, draggedShipOrientation);
    const indices = calculateIndices(startIndex, draggedShipLength, draggedShipOrientation);

    if (isValidPlacement(indices, draggedShipId)) {
        if (isDraggingFromBoard) {
            removeShipUI(draggedShipId);
        }
        placeShipOnBoard(draggedShipId, draggedShipLength, indices, draggedShipOrientation);
    }
}

function handleDragEnd(e) {
    clearHighlights();
    document.querySelectorAll(".ship-cell").forEach(c => c.classList.remove("ship-dragging"));

    const isPlacedSuccessfully = placedShips.some(s => s.id === draggedShipId);

    // Dacă nava nu a fost plasată, o reafișăm în Dock
    if (!isPlacedSuccessfully) {
        const dockShip = document.getElementById(`ship-${draggedShipId}`);
        if (dockShip) dockShip.style.display = "block";
    }
}

// --- GESTIONARE NAVE PE TABLĂ ---

function placeShipOnBoard(id, length, indices, isHorizontal) {
    const dockShip = document.getElementById(`ship-${id}`);
    const skinPath = dockShip?.dataset?.skinPath || "img/default.png";

    placedShips.push({ id, length, isHorizontal, indices, skinPath });

    indices.forEach((idx, i) => {
        const cell = getCell(idx);

        cell.classList.add("ship-cell");
        cell.setAttribute("draggable", "true");
        cell.dataset.shipId = id;
        cell.dataset.skinPath = skinPath;

        // Punem skin-ul ca background pe fiecare celulă (se repetă natural pe toată nava)
        cell.style.backgroundImage = `url('${skinPath.replace(/'/g, "\\'")}')`;
        cell.style.backgroundRepeat = "no-repeat";
        cell.style.backgroundPosition = "center";
        cell.style.backgroundSize = "contain";

        // DRAG START DE PE TABLĂ
        cell.addEventListener("dragstart", (e) => {
            isDraggingFromBoard = true;
            draggedShipId = id;
            draggedShipLength = length;
            draggedShipOrientation = isHorizontal;
            dragOffset = i;

            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", id);

            markShipAsDragging(id);
        });

        // Click Stânga - Rotire
        cell.onclick = (e) => {
            e.stopPropagation();
            rotateShip(id);
        };

        // Click Dreapta - Ștergere
        cell.oncontextmenu = (e) => {
            e.preventDefault();
            removeShipUI(id);
            const dockShip = document.getElementById(`ship-${id}`);
            if (dockShip) dockShip.style.display = "block";
            checkGameReady();
        };
    });

    if(dockShip) dockShip.style.display = "none";

    checkGameReady();
}

function markShipAsDragging(shipId) {
    const ship = placedShips.find(s => s.id === shipId);
    if (!ship) return;
    ship.indices.forEach(idx => {
        getCell(idx)?.classList.add("ship-dragging");
    });
}

function removeShipUI(shipId) {
    const index = placedShips.findIndex(s => s.id === shipId);
    if (index === -1) return;

    const ship = placedShips[index];

    ship.indices.forEach(idx => {
        const c = getCell(idx);
        if (c) {
            c.classList.remove("ship-cell", "ship-dragging");
            c.removeAttribute("draggable");
            delete c.dataset.shipId;
            delete c.dataset.skinPath;

            // resetăm imaginea + culoarea de apă
            c.style.backgroundImage = "";
            c.style.backgroundRepeat = "";
            c.style.backgroundPosition = "";
            c.style.backgroundSize = "";
            c.style.backgroundColor = WATER_COLOR;

            // Resetăm listenerii prin clonare
            const newC = c.cloneNode(true);
            c.parentNode.replaceChild(newC, c);

            newC.addEventListener("dragover", handleDragOver);
            newC.addEventListener("dragleave", clearHighlights);
            newC.addEventListener("drop", handleDrop);
        }
    });

    placedShips.splice(index, 1);
    checkGameReady();
}

function rotateShip(shipId) {
    const shipIndex = placedShips.findIndex(s => s.id === shipId);
    if (shipIndex === -1) return;
    const ship = placedShips[shipIndex];

    const pivotIndex = ship.indices[0];
    const newOrientation = !ship.isHorizontal;
    const newIndices = calculateIndices(pivotIndex, ship.length, newOrientation);

    if (isValidPlacement(newIndices, shipId)) {
        removeShipUI(shipId);
        placeShipOnBoard(shipId, ship.length, newIndices, newOrientation);
    } else {
        // Feedback vizual roșu
        ship.indices.forEach(idx => {
            const c = getCell(idx);
            if (c) {
                c.style.backgroundColor = "#e74c3c";
                setTimeout(() => c.style.backgroundColor = "", 200);
            }
        });
    }
}

// --- UTILITARE ---

function calculateStartIndex(targetIndex, isHorizontal) {
    if (isHorizontal) {
        return targetIndex - dragOffset;
    } else {
        return targetIndex - (dragOffset * 10);
    }
}

function calculateIndices(startIndex, length, isHorizontal) {
    let indices = [];
    for (let i = 0; i < length; i++) {
        let idx;
        if (isHorizontal) {
            idx = startIndex + i;
            if (Math.floor(idx / GRID_SIZE) !== Math.floor(startIndex / GRID_SIZE)) return [-1];
        } else {
            idx = startIndex + (i * GRID_SIZE);
            if (idx >= GRID_SIZE * GRID_SIZE) return [-1];
        }
        indices.push(idx);
    }
    return indices;
}

function isValidPlacement(indices, ignoreId = null) {
    if (indices.includes(-1)) return false;
    if (indices.some(idx => idx < 0 || idx >= (GRID_SIZE * GRID_SIZE))) return false;

    for (let idx of indices) {
        for (let ship of placedShips) {
            if (ship.id === ignoreId) continue;
            if (ship.indices.includes(idx)) return false;
        }
    }
    return true;
}

function clearHighlights() {
    document.querySelectorAll(".grid-cell").forEach(c => {
        c.classList.remove("hover-valid", "hover-invalid");
    });
}

function getCell(index) {
    return document.querySelector(`.grid-cell[data-index='${index}']`);
}

function checkGameReady() {
    const expectedShips = 10; // 4x1 + 3x2 + 2x3 + 1x4 = 10 nave

    if (placedShips.length === expectedShips) {
        confirmBtn.disabled = false;
        confirmBtn.style.backgroundColor = "#2ecc71";
        confirmBtn.innerText = "✅ Gata de Luptă!";
        dockElement.style.visibility = "hidden";
    } else {
        confirmBtn.disabled = true;
        confirmBtn.style.backgroundColor = "#e67e22";
        confirmBtn.innerText = `Plasează ${expectedShips - placedShips.length} nave rămase...`;
        dockElement.style.visibility = "visible";
    }
}

function goBack() {
    if (placedShips.length > 0 && !confirm("Vrei să ieși? Vei pierde aranjamentul navelor.")) return;
    window.location.href = "menu.html";
}

// --- 4. TRIMITERE LA SERVER (MULTIPLAYER JOIN) ---
async function confirmPlacement() {
    if (placedShips.length !== 10) return;

    const placementData = placedShips.map(ship => ({
        shipId: ship.id,
        isHorizontal: ship.isHorizontal,
        startCellIndex: ship.indices[0],
        occupiedIndices: ship.indices
    }));

    // Salvăm local navele noastre ca să le vedem pe battle.html
    localStorage.setItem("my_ships", JSON.stringify(placementData));

    try {
        // Apelăm endpoint-ul de JOIN pentru Multiplayer
        const response = await fetch(`${API_BASE_URL}/api/game/join?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(placementData)
        });

        if (response.ok) {
            const data = await response.json();
            // Salvăm ID-ul jocului
            localStorage.setItem("current_game_id", data.gameId);
            // Mergem la luptă!
            window.location.href = "battle.html";
        } else {
            alert("Eroare la conectare server.");
        }
    } catch (error) {
        console.error(error);
        alert("Eroare de rețea.");
    }
}