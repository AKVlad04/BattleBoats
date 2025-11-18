// Stare globală
const placedShips = []; 
let draggedShipLength = 0;
let draggedShipId = null;
let isDraggingFromBoard = false;
let dragOffset = 0;
let draggedShipOrientation = true; // true = horizontal

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
    setupDock();
});

function createBoard() {
    const board = document.getElementById("my-board");
    board.innerHTML = "";
    
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = i;
        
        cell.addEventListener("dragover", handleDragOver);
        cell.addEventListener("dragleave", handleDragLeave);
        cell.addEventListener("drop", handleDrop);

        board.appendChild(cell);
    }
}

function setupDock() {
    const ships = document.querySelectorAll(".ship-preview");
    ships.forEach(ship => {
        ship.addEventListener("dragstart", (e) => {
            isDraggingFromBoard = false;
            draggedShipLength = parseInt(ship.dataset.length);
            draggedShipId = ship.id;
            dragOffset = 0;
            draggedShipOrientation = true;
            
            e.dataTransfer.effectAllowed = "move";
        });
        ship.addEventListener("dragend", handleDragEnd);
    });
}

// --- LOGICA DRAG & DROP ---

function handleDragOver(e) {
    e.preventDefault();
    const targetIndex = parseInt(e.target.dataset.index);
    let startIndex = calculateStartIndex(targetIndex, draggedShipOrientation);
    const indices = calculateIndices(startIndex, draggedShipLength, draggedShipOrientation);

    clearHighlights();

    // FIX: Trimitem draggedShipId la verificare pentru a IGNORA nava curentă
    // (Ca să nu zică "Coliziune" cu propria umbră când o muți un pic)
    if (isValidPlacement(indices, draggedShipId)) {
        indices.forEach(idx => getCell(idx).classList.add("hover-valid"));
    } else {
        indices.forEach(idx => {
             if(idx >= 0 && idx < 100) getCell(idx).classList.add("hover-invalid");
        });
    }
}

function handleDragLeave() {
    // Lăsăm curățarea pentru dragOver/drop
}

function handleDrop(e) {
    e.preventDefault();
    clearHighlights(); // Curățăm imediat verdele/roșul
    
    const targetIndex = parseInt(e.target.dataset.index);
    let startIndex = calculateStartIndex(targetIndex, draggedShipOrientation);
    const indices = calculateIndices(startIndex, draggedShipLength, draggedShipOrientation);

    if (isValidPlacement(indices, draggedShipId)) {
        // 1. Dacă e valid, abia ACUM ștergem vechea navă (dacă exista)
        if (isDraggingFromBoard) {
            removeShipUI(draggedShipId);
        }
        // 2. Punem nava nouă
        placeShipOnBoard(draggedShipId, draggedShipLength, indices, draggedShipOrientation);
    } else {
        // Dacă drop-ul e invalid, nu facem nimic aici. 
        // handleDragEnd se va ocupa să facă nava veche vizibilă din nou.
    }
}

function handleDragEnd(e) {
    clearHighlights(); // Siguranță: curățăm orice urmă de verde
    
    // Resetăm starea vizuală a navelor de pe tablă
    // Dacă nava nu a fost mutată cu succes (drop invalid), scoatem clasa 'ship-dragging'
    // ca să reapară pe poziția veche.
    document.querySelectorAll(".ship-cell").forEach(c => c.classList.remove("ship-dragging"));
    
    // Verificăm dacă nava e undeva (pe tablă sau în dock)
    const isPlaced = placedShips.some(s => s.id === draggedShipId);
    if (!isPlaced) {
        const dockShip = document.getElementById(draggedShipId);
        if (dockShip) dockShip.style.display = "block";
    }
}

// --- GESTIONARE NAVE ---

function placeShipOnBoard(id, length, indices, isHorizontal) {
    // Salvăm datele
    placedShips.push({ id, length, isHorizontal, indices });

    // Desenăm
    indices.forEach((idx, i) => {
        const cell = getCell(idx);
        cell.className = "cell ship-cell"; // Resetăm clasele, păstrăm doar baza + ship
        cell.setAttribute("draggable", "true");
        
        // LOGICA NOUĂ DE DRAG START DE PE TABLĂ
        cell.addEventListener("dragstart", (e) => {
            isDraggingFromBoard = true;
            draggedShipId = id;
            draggedShipLength = length;
            draggedShipOrientation = isHorizontal;
            dragOffset = i; 

            e.dataTransfer.effectAllowed = "move";
            
            // Imaginea fantomă
            const ghostImage = document.getElementById(id);
            if (ghostImage) {
                 e.dataTransfer.setDragImage(ghostImage, dragOffset * 30 + 15, 15);
            }

            // FIX: NU ștergem nava. Doar o ascundem vizual.
            // Astfel, dacă drop-ul eșuează, ea rămâne acolo.
            markShipAsDragging(id);
        });

        // Event Click pentru Rotire
        cell.onclick = (e) => {
            e.stopPropagation();
            rotateShip(id);
        };

        // Event ContextMenu pentru Ștergere
        cell.oncontextmenu = (e) => { 
            e.preventDefault(); 
            removeShipUI(id); 
            document.getElementById(id).style.display = "block";
            checkGameReady();
        };
    });

    // Ascundem din Dock
    const dockShip = document.getElementById(id);
    if(dockShip) dockShip.style.display = "none";

    checkGameReady();
}

function markShipAsDragging(shipId) {
    const ship = placedShips.find(s => s.id === shipId);
    if (!ship) return;
    ship.indices.forEach(idx => {
        getCell(idx).classList.add("ship-dragging");
    });
}

function removeShipUI(shipId) {
    const index = placedShips.findIndex(s => s.id === shipId);
    if (index === -1) return;

    const ship = placedShips[index];

    ship.indices.forEach(idx => {
        const c = getCell(idx);
        c.className = "cell"; // Curățăm tot: ship-cell, dragging, hover, etc.
        c.removeAttribute("draggable");
        
        // Metoda "nucleară" de a scoate event listenerii vechi: clonarea
        const newC = c.cloneNode(true);
        c.parentNode.replaceChild(newC, c);
        
        // Reatașăm DOAR listenerii de bază pentru grid
        newC.addEventListener("dragover", handleDragOver);
        newC.addEventListener("dragleave", handleDragLeave);
        newC.addEventListener("drop", handleDrop);
    });

    placedShips.splice(index, 1);
}

function rotateShip(shipId) {
    const shipIndex = placedShips.findIndex(s => s.id === shipId);
    if (shipIndex === -1) return;
    const ship = placedShips[shipIndex];

    const pivotIndex = ship.indices[0];
    const newOrientation = !ship.isHorizontal;
    const newIndices = calculateIndices(pivotIndex, ship.length, newOrientation);

    // Ignorăm nava curentă la verificarea rotației
    if (isValidPlacement(newIndices, shipId)) {
        removeShipUI(shipId); // Aici e ok să ștergem pt că rotația e instantanee, nu drag
        placeShipOnBoard(shipId, ship.length, newIndices, newOrientation);
    } else {
        // Feedback vizual eroare
        ship.indices.forEach(idx => {
            const c = getCell(idx);
            c.style.backgroundColor = "#e74c3c"; // Roșu
            setTimeout(() => c.style.backgroundColor = "", 200);
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
            if (startIndex >= 0 && Math.floor(idx / 10) !== Math.floor(startIndex / 10)) return [-1]; 
        } else {
            idx = startIndex + (i * 10);
            if (idx >= 100) return [-1]; 
        }
        indices.push(idx);
    }
    return indices;
}

// FIX: Parametrul ignoreId - permite să verificăm dacă e loc, 
// ignorând poziția actuală a navei pe care o mutăm
function isValidPlacement(indices, ignoreId = null) {
    if (indices.includes(-1)) return false; 
    if (indices.some(idx => idx < 0 || idx >= 100)) return false; 

    for (let idx of indices) {
        for (let ship of placedShips) {
            if (ship.id === ignoreId) continue; // Sări peste nava pe care o mut chiar acum
            if (ship.indices.includes(idx)) return false; 
        }
    }
    return true;
}

function clearHighlights() {
    document.querySelectorAll(".cell").forEach(c => {
        c.classList.remove("hover-valid", "hover-invalid");
    });
}

function getCell(index) {
    return document.querySelector(`.cell[data-index='${index}']`);
}

function checkGameReady() {
    const confirmBtn = document.getElementById("confirm-btn");
    const dockContainer = document.querySelector(".dock-container");

    if (placedShips.length === 5) {
        confirmBtn.disabled = false;
        confirmBtn.style.backgroundColor = "#2ecc71";
        confirmBtn.innerText = "✅ Gata de Luptă! (Click Aici)";

        // SCHIMBARE AICI: Folosim visibility în loc de display
        dockContainer.style.visibility = "hidden"; 
        dockContainer.style.opacity = "0"; // Opțional, pentru tranziție fină
    } else {
        confirmBtn.disabled = true;
        confirmBtn.style.backgroundColor = "";
        confirmBtn.innerText = "Plasează toate navele...";

        // SCHIMBARE AICI: O facem vizibilă la loc
        dockContainer.style.visibility = "visible";
        dockContainer.style.opacity = "1";
    }
}

function goBack() {
     if (placedShips.length > 0 && !confirm("Vrei să ieși? Vei pierde aranjamentul navelor.")) return;
    
    window.location.href = "menu.html";
}

function confirmPlacement() {
    alert("Se caută adversar...");
}