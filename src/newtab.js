// Pin@Home - New Tab Entry Point
// Displays cached images without Pinterest page

import { CONFIG } from './config.js';
import { state, updateState } from './state.js';
import { getAllCachedBoards, getLastVisitedBoard, saveLastVisitedBoard } from './cache.js';
import { renderPins, shufflePins } from './ui/grid.js';
import { toggleBrowseMode } from './ui/browseMode.js';

console.log('🧘 Pin@Home: New Tab Mode');

// Mark as new tab mode
updateState({ isNewTabMode: true });

/**
 * Initialize new tab page
 */
async function init() {
  // Get DOM elements (already exist in newtab.html)
  const overlay = document.getElementById('pin_at_home-overlay');
  const grid = document.getElementById('pin_at_home-grid');
  const loading = document.getElementById('pin_at_home-loading');
  
  updateState({ overlay, grid, loading });
  
  // Get all cached boards
  const boards = await getAllCachedBoards();
  
  if (boards.length === 0) {
    loading.textContent = 'No cached boards. Visit a Pinterest board first!';
    return;
  }
  
  // Try to load last visited board, or use first available
  const lastVisited = await getLastVisitedBoard();
  let selectedBoard = boards.find(b => b.cacheKey === lastVisited?.cacheKey) || boards[0];
  
  // Create header with board selector
  createHeader(boards, selectedBoard);
  
  // Load the selected board
  await loadBoard(selectedBoard);
}

/**
 * Create header with board selector
 */
function createHeader(boards, currentBoard) {
  const overlay = state.overlay;
  const grid = state.grid;
  
  const header = document.createElement('div');
  header.id = 'pin_at_home-header';
  
  // Board Menu Container
  const boardMenu = document.createElement('div');
  boardMenu.className = 'pin_at_home-board-menu';
  boardMenu.id = 'pin_at_home-board-menu';
  
  const boardTitle = document.createElement('div');
  boardTitle.className = 'pin_at_home-board-title';
  boardTitle.id = 'pin_at_home-board-title';
  boardTitle.textContent = currentBoard.boardName || 'Select Board';
  
  // Menu items container
  const menuItems = document.createElement('div');
  menuItems.className = 'pin_at_home-menu-items';
  menuItems.id = 'pin_at_home-menu-items';
  
  // Divider
  const divider = document.createElement('div');
  divider.className = 'pin_at_home-menu-divider';
  
  // Board selector section
  if (boards.length > 1) {
    const boardSelectorLabel = document.createElement('div');
    boardSelectorLabel.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 11px; padding: 4px 8px; text-transform: uppercase; letter-spacing: 1px;';
    boardSelectorLabel.textContent = 'Switch Board';
    menuItems.appendChild(boardSelectorLabel);
    
    // Add board buttons (max 10 to avoid huge menu)
    const displayBoards = boards.slice(0, 10);
    for (const board of displayBoards) {
      const boardBtn = document.createElement('button');
      boardBtn.className = 'pin_at_home-menu-btn';
      if (board.cacheKey === currentBoard.cacheKey) {
        boardBtn.classList.add('active');
        boardBtn.style.background = 'rgba(45, 85, 255, 0.6)';
      }
      boardBtn.textContent = `📌 ${board.boardName} (${board.imageCount})`;
      boardBtn.onclick = () => switchBoard(board, boards);
      menuItems.appendChild(boardBtn);
    }
    
    // Divider between boards and actions
    const actionDivider = document.createElement('div');
    actionDivider.className = 'pin_at_home-menu-divider';
    actionDivider.style.opacity = '1';
    menuItems.appendChild(actionDivider);
  }
  
  // Browse button
  const browseBtn = document.createElement('button');
  browseBtn.id = 'pin_at_home-browse-btn';
  browseBtn.className = 'pin_at_home-menu-btn browse';
  browseBtn.textContent = '📋 Browse All';
  browseBtn.onclick = () => toggleBrowseMode(browseBtn);
  menuItems.appendChild(browseBtn);
  
  // Shuffle button
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'pin_at_home-menu-btn';
  refreshBtn.textContent = '🔄 Shuffle';
  refreshBtn.onclick = shufflePins;
  menuItems.appendChild(refreshBtn);
  
  // Exit button (shows blank page)
  const exitBtn = document.createElement('button');
  exitBtn.className = 'pin_at_home-menu-btn exit';
  exitBtn.textContent = '✕ Exit';
  exitBtn.onclick = exitNewTab;
  menuItems.appendChild(exitBtn);
  
  menuItems.appendChild(divider);
  
  boardMenu.appendChild(boardTitle);
  boardMenu.appendChild(menuItems);
  header.appendChild(boardMenu);
  
  // Insert header before grid
  overlay.insertBefore(header, grid);
}

/**
 * Load a board's cached images
 */
async function loadBoard(board) {
  const loading = state.loading;
  if (loading) loading.style.display = 'block';
  
  // Update state
  updateState({
    cacheKey: board.cacheKey,
    boardName: board.boardName
  });
  
  // Load pins from cache
  try {
    const result = await chrome.storage.local.get([board.cacheKey]);
    const pins = result[board.cacheKey] || [];
    
    if (pins.length === 0) {
      if (loading) loading.textContent = `No images in ${board.boardName}`;
      return;
    }
    
    updateState({ pinsFound: pins });
    if (loading) loading.style.display = 'none';
    
    // Render the grid
    renderPins();
    
    console.log(`🧘 Pin@Home: Loaded ${pins.length} images from ${board.boardName}`);
  } catch (e) {
    console.error('Failed to load board:', e);
    if (loading) loading.textContent = 'Failed to load board';
  }
}

/**
 * Switch to a different board
 */
async function switchBoard(board, allBoards) {
  // Update title
  const title = document.getElementById('pin_at_home-board-title');
  if (title) title.textContent = board.boardName;
  
  // Update active state in menu
  const menuItems = document.getElementById('pin_at_home-menu-items');
  if (menuItems) {
    const buttons = menuItems.querySelectorAll('.pin_at_home-menu-btn');
    buttons.forEach(btn => {
      if (btn.textContent.includes(board.boardName)) {
        btn.style.background = 'rgba(45, 85, 255, 0.6)';
      } else if (btn.textContent.startsWith('📌')) {
        btn.style.background = '';
      }
    });
  }
  
  // Clear current grid
  if (state.grid) state.grid.innerHTML = '';
  
  // Save as last visited so it opens next time
  saveLastVisitedBoard(board.cacheKey, board.boardName);
  
  // Load new board
  await loadBoard(board);
}

/**
 * Exit to blank page
 */
function exitNewTab() {
  if (state.overlay) {
    state.overlay.style.transition = 'opacity 0.3s ease-out';
    state.overlay.style.opacity = '0';
    setTimeout(() => {
      state.overlay.remove();
    }, 300);
  }
}

// Start initialization
init();
