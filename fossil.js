const GRID_COLS = 15;
const GRID_ROWS = 10;
const MAX_COLLAPSE = 100;

// Game State
let currentTool = 'pickaxe'; // 'pickaxe' or 'hammer'
let collapseAmount = 0;
let items = []; // { id, type, shape, color, discovered, cells: [{r, c}] }
let grid = []; // 2D array of { layer, itemId }
let totalItems = 0;
let foundItems = 0;
let isGameOver = false;

// DOM Elements
const gridElement = document.getElementById('game-grid');
const collapseBar = document.getElementById('collapse-bar');
const itemsFoundEl = document.getElementById('items-found');
const itemsTotalEl = document.getElementById('items-total');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const retryBtn = document.getElementById('retry-btn');
const toolBtns = document.querySelectorAll('.tool-btn');

// Item Definitions (1 is filled, 0 is empty)
const ITEM_TYPES = [
    {
        name: 'skull',
        type: 'fossil',
        shape: [
            [1, 1, 1],
            [1, 1, 1],
            [0, 1, 0]
        ]
    },
    {
        name: 'bone',
        type: 'fossil',
        shape: [
            [1, 1, 1, 1]
        ]
    },
    {
        name: 'gem1',
        type: 'gem',
        shape: [
            [1]
        ]
    },
    {
        name: 'gem2',
        type: 'gem',
        shape: [
            [1, 1],
            [1, 1]
        ]
    },
    {
        name: 'claw',
        type: 'fossil',
        shape: [
            [1, 1],
            [0, 1],
            [0, 1]
        ]
    }
];

// Initialize Game
function initGame() {
    isGameOver = false;
    collapseAmount = 0;
    foundItems = 0;
    items = [];
    grid = [];
    gridElement.innerHTML = '';
    
    updateCollapseBar();
    
    // Initialize empty grid
    for (let r = 0; r < GRID_ROWS; r++) {
        let row = [];
        for (let c = 0; c < GRID_COLS; c++) {
            // Generate random layer thickness (2 to 4)
            // 4 is hardest, 2 is easiest (among covered cells)
            let layer = Math.floor(Math.random() * 3) + 2; 
            row.push({ layer: layer, itemId: null });
        }
        grid.push(row);
    }

    // Place items
    placeItems();

    // Render grid
    renderGrid();

    // Update UI
    itemsFoundEl.textContent = foundItems;
    itemsTotalEl.textContent = totalItems;
    modalOverlay.classList.add('hidden');
}

function placeItems() {
    totalItems = Math.floor(Math.random() * 3) + 4; // 4 to 6 items
    let attempts = 0;
    let itemsPlaced = 0;

    while (itemsPlaced < totalItems && attempts < 100) {
        attempts++;
        const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
        
        // Randomly flip or rotate shape (simplified: just use as is for now)
        const shape = itemType.shape;
        const shapeRows = shape.length;
        const shapeCols = shape[0].length;
        
        const startR = Math.floor(Math.random() * (GRID_ROWS - shapeRows + 1));
        const startC = Math.floor(Math.random() * (GRID_COLS - shapeCols + 1));
        
        // Check for overlap
        let canPlace = true;
        for (let r = 0; r < shapeRows; r++) {
            for (let c = 0; c < shapeCols; c++) {
                if (shape[r][c] === 1) {
                    if (grid[startR + r][startC + c].itemId !== null) {
                        canPlace = false;
                        break;
                    }
                }
            }
            if (!canPlace) break;
        }

        if (canPlace) {
            const itemId = itemsPlaced;
            const newItem = {
                id: itemId,
                type: itemType.type,
                discovered: false,
                cells: []
            };

            for (let r = 0; r < shapeRows; r++) {
                for (let c = 0; c < shapeCols; c++) {
                    if (shape[r][c] === 1) {
                        grid[startR + r][startC + c].itemId = itemId;
                        newItem.cells.push({ r: startR + r, c: startC + c, localR: r, localC: c });
                    }
                }
            }
            items.push(newItem);
            itemsPlaced++;
        }
    }
    totalItems = itemsPlaced; // Adjust if we couldn't fit all
}

function renderGrid() {
    gridElement.style.setProperty('--grid-cols', GRID_COLS);
    gridElement.style.setProperty('--grid-rows', GRID_ROWS);

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cellData = grid[r][c];
            const cellEl = document.createElement('div');
            cellEl.classList.add('cell');
            cellEl.dataset.r = r;
            cellEl.dataset.c = c;
            cellEl.dataset.layer = cellData.layer;

            // Add item visual if present
            if (cellData.itemId !== null) {
                const itemData = items[cellData.itemId];
                const itemPart = document.createElement('div');
                itemPart.classList.add('item-part', 'item-' + itemData.name);
                
                if (itemData.type === 'fossil') {
                    const cellObj = itemData.cells.find(pos => pos.r === r && pos.c === c);
                    if (cellObj) {
                        itemPart.style.backgroundPosition = `-${cellObj.localC * 40}px -${cellObj.localR * 40}px`;
                    }
                }
                
                cellEl.appendChild(itemPart);
            }

            // Events
            cellEl.addEventListener('mousedown', handleCellClick);
            cellEl.addEventListener('mouseenter', handleCellHover);
            cellEl.addEventListener('mouseleave', handleCellLeave);

            gridElement.appendChild(cellEl);
        }
    }
}

function getCellElement(r, c) {
    return gridElement.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

function handleCellClick(e) {
    if (isGameOver) return;
    const r = parseInt(e.currentTarget.dataset.r);
    const c = parseInt(e.currentTarget.dataset.c);
    
    // Prevent hitting already fully uncovered cells
    if (grid[r][c].layer === 0 && currentTool === 'pickaxe') {
        // Hammer might still hit it if center is 0, but let's allow it for area effect
    }

    if (currentTool === 'pickaxe') {
        hitCell(r, c, 2);
        addCollapse(2);
    } else if (currentTool === 'hammer') {
        // Hit 3x3 area
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                    const damage = (dr === 0 && dc === 0) ? 2 : 1;
                    hitCell(nr, nc, damage);
                }
            }
        }
        addCollapse(10);
    } else if (currentTool === 'xray') {
        // Scan 5x5 area
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                    if (grid[nr][nc].itemId !== null && grid[nr][nc].layer > 0) {
                        const cellEl = getCellElement(nr, nc);
                        if (cellEl) {
                            cellEl.classList.remove('xray-flash');
                            void cellEl.offsetWidth; // Trigger reflow
                            cellEl.classList.add('xray-flash');
                        }
                    }
                }
            }
        }
        addCollapse(5); // Medium damage
    }

    checkItems();
    checkGameOver();
}

function hitCell(r, c, damage) {
    const cellData = grid[r][c];
    if (cellData.layer > 0) {
        cellData.layer = Math.max(0, cellData.layer - damage);
        const cellEl = getCellElement(r, c);
        cellEl.dataset.layer = cellData.layer;
        
        // Animation
        cellEl.classList.remove('hit');
        void cellEl.offsetWidth; // Trigger reflow
        cellEl.classList.add('hit');
    }
}

function handleCellHover(e) {
    if (currentTool !== 'hammer' && currentTool !== 'xray') return;
    const r = parseInt(e.currentTarget.dataset.r);
    const c = parseInt(e.currentTarget.dataset.c);
    
    const range = currentTool === 'xray' ? 2 : 1;
    const hoverClass = currentTool === 'xray' ? 'xray-hover' : 'hammer-hover';
    const centerClass = currentTool === 'xray' ? 'xray-center' : 'hammer-center';
    
    for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                const cellEl = getCellElement(nr, nc);
                if (cellEl) {
                    cellEl.classList.add(hoverClass);
                    if (dr === 0 && dc === 0) {
                        cellEl.classList.add(centerClass);
                    }
                }
            }
        }
    }
}

function handleCellLeave(e) {
    if (currentTool !== 'hammer' && currentTool !== 'xray') return;
    // Fast way to remove all hover classes
    document.querySelectorAll('.hammer-hover, .hammer-center, .xray-hover, .xray-center').forEach(el => {
        el.classList.remove('hammer-hover', 'hammer-center', 'xray-hover', 'xray-center');
    });
}

function addCollapse(amount) {
    collapseAmount = Math.min(MAX_COLLAPSE, collapseAmount + amount);
    updateCollapseBar();
}

function updateCollapseBar() {
    const percentage = (collapseAmount / MAX_COLLAPSE) * 100;
    collapseBar.style.width = `${percentage}%`;
    
    if (percentage > 80) {
        collapseBar.classList.add('danger');
    } else {
        collapseBar.classList.remove('danger');
    }
}

function checkItems() {
    items.forEach(item => {
        if (!item.discovered) {
            // Check if all cells of this item have layer === 0
            const isFullyUncovered = item.cells.every(pos => grid[pos.r][pos.c].layer === 0);
            if (isFullyUncovered) {
                item.discovered = true;
                foundItems++;
                itemsFoundEl.textContent = foundItems;
                
                // Play discovery animation
                item.cells.forEach(pos => {
                    const cellEl = getCellElement(pos.r, pos.c);
                    const itemPart = cellEl.querySelector('.item-part');
                    if (itemPart) {
                        itemPart.classList.add('item-discovered');
                    }
                });
            }
        }
    });
}

function checkGameOver() {
    if (foundItems === totalItems) {
        isGameOver = true;
        showModal('発掘成功！', `すべての化石を発見しました！<br>壁のダメージ: ${collapseAmount}%`);
    } else if (collapseAmount >= MAX_COLLAPSE) {
        isGameOver = true;
        showModal('壁が崩壊した...', `残念！全てを見つける前に壁が崩れてしまった。<br>見つけた数: ${foundItems} / ${totalItems}`);
    }
}

function showModal(title, descHtml) {
    modalTitle.textContent = title;
    modalDesc.innerHTML = descHtml;
    modalOverlay.classList.remove('hidden');
}

// Event Listeners
toolBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        toolBtns.forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        currentTool = target.dataset.tool;
        gridElement.dataset.tool = currentTool;
        
        // Remove hover classes just in case
        document.querySelectorAll('.hammer-hover, .hammer-center, .xray-hover, .xray-center').forEach(el => {
            el.classList.remove('hammer-hover', 'hammer-center', 'xray-hover', 'xray-center');
        });
    });
});

retryBtn.addEventListener('click', initGame);

// Start
initGame();
