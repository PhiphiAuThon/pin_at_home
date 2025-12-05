// Pin@Home - Browse Mode Module
// Handles browse mode toggle and grid switching

import { CONFIG } from '../config.js';
import { state, updateState } from '../state.js';
import { openFullscreenViewer } from './fullscreenViewer.js';
import { toggleImageSelection, updateSelectionOrder } from './selection.js';
import { createSidepanel, updateSidepanel, setExitBrowseModeRef } from './sidepanel.js';
import { setScrollPaused, isManuallyPaused } from './grid.js';

/**
 * Toggle browse all mode on/off
 * @param {HTMLElement} browseBtn - The browse button element
 */
export function toggleBrowseMode(browseBtn) {
  const isActive = state.refsheetMode;
  
  if (isActive) {
    // Exit browse mode
    exitBrowseMode(browseBtn);
  } else {
    // Enter browse mode
    enterBrowseMode(browseBtn);
  }
}

/**
 * Enter browse mode - show all pins with selection sidepanel
 * @param {HTMLElement} browseBtn - The browse button element
 */
function enterBrowseMode(browseBtn) {
  updateState({ refsheetMode: true });
  browseBtn.classList.add('active');
  browseBtn.textContent = '← Exit Browse';
  
  // Hide the entire bottom container (board menu and pause control) in browse mode
  const boardMenu = document.getElementById('pin_at_home-board-menu');
  const pauseControl = document.querySelector('.pin_at_home-pause-control');
  if (boardMenu) boardMenu.style.display = 'none';
  if (pauseControl) pauseControl.style.display = 'none';
  
  // Create sidepanel if it doesn't exist
  if (!state.sidepanel) {
    createSidepanel();
  }
  
  // Add browse-active class to shrink grid for sidepanel
  if (state.grid) {
    state.grid.classList.add('browse-active');
    
    // Switch click handlers to selection mode (no re-render)
    switchToSelectionMode();
  }
  
  // Update sidepanel to show correct counts immediately
  updateSidepanel();
  
  // Show sidepanel with animation
  state.sidepanel.classList.add('active');
  
  // Add body class for CSS overrides
  document.body.classList.add('pin_at_home-browse-mode');
  
  // Auto-pause scrolling in browse mode
  setScrollPaused(true);
  
  // Hide duplicates
  const uniqueCount = hideDuplicates();
  
  // Update sidepanel with correct count
  updateSidepanel(uniqueCount);
  
  console.log('📋 Entered browse mode');
}

/**
 * Exit browse mode - return to normal grid view
 * @param {HTMLElement} browseBtn - The browse button element
 */
export function exitBrowseMode(browseBtn) {
  updateState({ refsheetMode: false });
  browseBtn.classList.remove('active');
  browseBtn.textContent = '📋 Browse All';
  
  // Show the bottom containers again
  const boardMenu = document.getElementById('pin_at_home-board-menu');
  const pauseControl = document.querySelector('.pin_at_home-pause-control');
  if (boardMenu) boardMenu.style.display = '';
  if (pauseControl) pauseControl.style.display = '';
  
  // Remove browse-active class to restore grid width
  if (state.grid) {
    state.grid.classList.remove('browse-active');
    
    // Switch click handlers back to fullscreen mode (no re-render)
    switchToFullscreenMode();
  }
  
  // Hide sidepanel
  if (state.sidepanel) {
    state.sidepanel.classList.remove('active');
  }
  
  // Remove body class
  document.body.classList.remove('pin_at_home-browse-mode');

  // Resume scrolling if not manually paused
  if (!isManuallyPaused()) {
    setScrollPaused(false);
  }
  
  // Show duplicates again
  showDuplicates();
  
  console.log('📋 Exited browse mode');
}

// Register exitBrowseMode with sidepanel to avoid circular import
setExitBrowseModeRef(exitBrowseMode);

/**
 * Switch existing grid items to selection mode (no re-render)
 */
export function switchToSelectionMode() {
  const pins = state.grid.querySelectorAll('.pin_at_home-pin');
  
  pins.forEach(pin => {
    const url = pin.dataset.url;
    
    // Add browse item class for selection styling
    pin.classList.add('pin_at_home-browse-item');
    
    // Check if already selected
    const selectionIndex = state.selectedImages.indexOf(url);
    if (selectionIndex !== -1) {
      pin.classList.add('selected');
    }
    
    // Add order badge if not exists
    if (!pin.querySelector('.selection-order')) {
      const orderBadge = document.createElement('span');
      orderBadge.className = 'selection-order';
      orderBadge.textContent = selectionIndex !== -1 ? '✓' : '';
      pin.appendChild(orderBadge);
    }
    
    // Switch click handler to selection
    pin.onclick = () => toggleImageSelection(url, pin);
  });
}

/**
 * Switch existing grid items back to fullscreen mode (no re-render)
 */
function switchToFullscreenMode() {
  const pins = state.grid.querySelectorAll('.pin_at_home-pin');
  
  pins.forEach(pin => {
    const url = pin.dataset.url;
    
    // Remove browse styling
    pin.classList.remove('pin_at_home-browse-item', 'selected');
    
    // Remove order badge
    const orderBadge = pin.querySelector('.selection-order');
    if (orderBadge) orderBadge.remove();
    
    // Switch click handler back to fullscreen
    pin.onclick = () => openFullscreenViewer(url);
  });
}

/**
 * Render browse grid - show ALL unique pins in the main grid with selection capability
 */
export function renderBrowseGrid() {
  if (!state.grid) return;
  
  // Clear current grid
  state.grid.innerHTML = '';
  
  // Calculate columns based on available width (accounting for sidepanel)
  const availableWidth = window.innerWidth - CONFIG.SIDEPANEL_WIDTH;
  const columns = Math.max(Math.ceil(availableWidth / CONFIG.AVG_IMAGE_WIDTH), CONFIG.MIN_COLUMNS);
  
  // Update CSS grid - use auto-rows for scrollable content
  state.grid.style.display = 'grid'; // FORCE GRID DISPLAY (override flex)
  state.grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  state.grid.style.gridTemplateRows = 'auto';
  state.grid.style.height = 'auto';
  state.grid.style.overflowY = 'auto';
  
  // Render ALL unique pins (not shuffled)
  state.pinsFound.forEach((url, index) => {
    const pin = document.createElement('div');
    pin.className = 'pin_at_home-pin pin_at_home-browse-item';
    pin.dataset.url = url;
    pin.style.animationDelay = `${Math.min(index * 0.02, 0.5)}s`;
    
    // Check if already selected
    const selectionIndex = state.selectedImages.indexOf(url);
    if (selectionIndex !== -1) {
      pin.classList.add('selected');
    }
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Pin ${index + 1}`;
    img.loading = 'lazy';
    
    const orderBadge = document.createElement('span');
    orderBadge.className = 'selection-order';
    orderBadge.textContent = selectionIndex !== -1 ? '✓' : '';
    
    // In browse mode, clicking selects instead of opening fullscreen
    pin.onclick = () => toggleImageSelection(url, pin);
    
    pin.appendChild(img);
    pin.appendChild(orderBadge);
    state.grid.appendChild(pin);
  });
  
  console.log(`📋 Browse grid: ${state.pinsFound.length} unique pins`);
}

/**
 * Hide duplicate pins (clones or repeated URLs)
 * Keeps only the first visible instance of each URL
 * @returns {number} The count of visible unique pins
 */
function hideDuplicates() {
  const seenUrls = new Set();
  const pins = state.grid.querySelectorAll('.pin_at_home-pin');
  let visibleCount = 0;
  
  pins.forEach(pin => {
    const url = pin.dataset.url;
    if (seenUrls.has(url)) {
      pin.classList.add('hidden-duplicate');
    } else {
      seenUrls.add(url);
      visibleCount++;
    }
  });
  
  return visibleCount;
}

/**
 * Show all pins (including duplicates)
 */
function showDuplicates() {
  const hidden = state.grid.querySelectorAll('.hidden-duplicate');
  hidden.forEach(pin => pin.classList.remove('hidden-duplicate'));
}
