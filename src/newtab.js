// Pin@Home - New Tab Entry Point
import { state, updateState } from './state.js';
import { getAllCachedBoards, getLastVisitedBoard, saveLastVisitedBoard, getPinCount } from './cache.js';
import { renderPins, setPinCountLimit } from './ui/grid.js';
import { createBoardMenu, setBoardMenuCallbacks, updateBoardTitle, rebuildBoardMenu, capitalizeWords } from './ui/header/boardMenu.js';
import { createControlsPanel, applySavedSettings } from './ui/header/controlsPanel.js';

console.log('🧘 Pin@Home: New Tab Mode');
updateState({ isNewTabMode: true });

// ============ INIT ============

async function init() {
  const overlay = document.getElementById('pin_at_home-overlay');
  const grid = document.getElementById('pin_at_home-grid');
  const loading = document.getElementById('pin_at_home-loading');
  
  updateState({ overlay, grid, loading });
  
  const boards = await getAllCachedBoards();
  
  if (boards.length === 0) {
    loading.textContent = 'No cached boards. Visit a Pinterest board first!';
    return;
  }
  
  const lastVisited = await getLastVisitedBoard();
  const selectedBoard = boards.find(b => b.cacheKey === lastVisited?.cacheKey) || boards[0];
  
  // Set up board menu callbacks
  setBoardMenuCallbacks({
    onSwitch: switchBoard,
    onDeleted: handleBoardDeleted
  });
  
  const header = createHeader(boards, selectedBoard);
  overlay.insertBefore(header, grid);
  
  await loadBoard(selectedBoard);
}

// ============ HEADER ============

function createHeader(boards, currentBoard) {
  const header = document.createElement('div');
  header.id = 'pin_at_home-header';
  
  header.appendChild(createBoardMenu(boards, currentBoard));
  header.appendChild(createControlsPanel());
  
  return header;
}

// ============ BOARD LOADING ============

async function loadBoard(board) {
  const loading = state.loading;
  if (loading) loading.style.display = 'block';
  
  updateState({ cacheKey: board.cacheKey, boardName: board.boardName });
  
  try {
    const result = await chrome.storage.local.get([board.cacheKey]);
    const pins = result[board.cacheKey] || [];
    
    if (pins.length === 0) {
      if (loading) loading.textContent = `No images in ${board.boardName}`;
      return;
    }
    
    updateState({ pinsFound: pins });
    if (loading) loading.style.display = 'none';
    
    const savedCount = await getPinCount();
    setPinCountLimit(savedCount);
    renderPins();
    
    await applySavedSettings(savedCount);
    
    console.log(`🧘 Pin@Home: Loaded ${pins.length} images from ${board.boardName}`);
  } catch (e) {
    console.error('Failed to load board:', e);
    if (loading) loading.textContent = 'Failed to load board';
  }
}

async function switchBoard(board, allBoards) {
  updateBoardTitle(board.boardName);
  
  const menuItems = document.getElementById('pin_at_home-menu-items');
  if (menuItems) {
    menuItems.querySelectorAll('.pin_at_home-menu-btn.board-item').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(capitalizeWords(board.boardName)));
    });
  }
  
  if (state.grid) state.grid.innerHTML = '';
  
  saveLastVisitedBoard(board.cacheKey, board.boardName);
  await loadBoard(board);
}

async function handleBoardDeleted(deletedBoard, updatedBoards, currentBoard) {
  // If we deleted the current board, switch to another
  if (deletedBoard.cacheKey === currentBoard.cacheKey) {
    if (updatedBoards.length > 0) {
      await switchBoard(updatedBoards[0], updatedBoards);
      rebuildBoardMenu(updatedBoards, updatedBoards[0]);
    } else {
      // No boards left
      if (state.loading) {
        state.loading.textContent = 'No cached boards. Visit a Pinterest board first!';
        state.loading.style.display = 'block';
      }
      if (state.grid) state.grid.innerHTML = '';
      rebuildBoardMenu([], null);
    }
  } else {
    // Rebuild menu keeping current board
    rebuildBoardMenu(updatedBoards, currentBoard);
  }
}

// ============ START ============

init();