// --- CONSTANTE ȘI STARE GLOBALĂ ---
const API_BASE_URL = 'http://localhost:8080';
const dockElement = document.getElementById('dock');
const boardElement = document.getElementById('my-board');
const confirmBtn = document.getElementById("confirm-btn");
const GRID_SIZE = 10;

// Stare globală D&D
const placedShips = [];
let draggedShipLength = 0;
let draggedShipId = null;
let isDraggingFromBoard = false;
let dragOffset = 0;
let draggedShipOrientation = true; // true = horizontal

// --- 1. GENERARE ID UTILIZATOR (MULTIPLAYER) ---
let userId = localStorage.getItem("battleboats_userid");
if (!userId) {
    userId = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("battleboats_userid", userId);
}

// --- INIȚIALIZARE ---
document.addEventListener("DOMContentLoaded", () => {
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

// 2. Funcția de Conectare la Spring Boot (Aduce navele din DB)
async function fetchAndDisplaySavedShips() {
    try {
        const loadoutResponse = await fetch(`${API_BASE_URL}/api/ships/loadout`);
        const savedIds = await loadoutResponse.json();

        if (savedIds.length !== 4) {
            dockElement.innerHTML = `<p style='color: #e74c3c;'>Flota incompletă. <a href='alege-flota.html'>Alege 4 nave.</a></p>`;
            return;
        }

        const allShipsResponse = await fetch(`${API_BASE_URL}/api/ships`);
        const allShips = await allShipsResponse.json();

        // Filtrează navele salvate
        const savedShips = allShips.filter(ship => savedIds.includes(ship.id));

        displayShipsInDock(savedShips);

    } catch (error) {
        console.error("Eroare la încărcarea flotei:", error);
        dockElement.innerHTML = `<p style='color: #e74c3c;'>Eroare de rețea. Serverul Java nu răspunde.</p>`;
    }
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

        shipDiv.innerHTML = `${ship.name} (${ship.size})`;

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
    placedShips.push({ id, length, isHorizontal, indices });

    indices.forEach((idx, i) => {
        const cell = getCell(idx);

        cell.classList.add("ship-cell");
        cell.setAttribute("draggable", "true");
        cell.dataset.shipId = id;

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

    const dockShip = document.getElementById(`ship-${id}`);
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
    const expectedShips = 4;

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
    window.location.href = "alege-flota.html";
}

// --- 4. TRIMITERE LA SERVER (MULTIPLAYER JOIN) ---
async function confirmPlacement() {
    if (placedShips.length !== 4) return;

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