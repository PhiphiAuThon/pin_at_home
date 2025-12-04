// Pin@Home - Overlay Module
// Handles main overlay creation and lifecycle

import { CONFIG } from '../config.js';
import { state, updateState } from '../state.js';
import { autoScroll } from '../utils.js';
import { startScanning } from '../scanner.js';
import { renderPins, shufflePins, handleClearCache } from './grid.js';
import { toggleBrowseMode } from './browseMode.js';

/**
 * Helper to inject overlay as soon as body exists
 * @returns {Promise<void>} Resolves when overlay is created
 */
export function injectOverlayWhenReady() {
  return new Promise(resolve => {
    if (document.body) {
      createOverlay();
      resolve();
    } else {
      // Body not ready yet, watch for it
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          createOverlay();
          obs.disconnect();
          resolve();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  });
}

/**
 * Create the UI Overlay
 * Reuses overlay from loader.js if it exists, otherwise creates new one
 */
function createOverlay() {
  // Check if overlay already exists (created by loader.js for instant display)
  let overlay = document.getElementById('pin_at_home-overlay');
  
  if (!overlay) {
    // Fallback: create new overlay if loader didn't create one
    overlay = document.createElement('div');
    overlay.id = 'pin_at_home-overlay';
    document.body.appendChild(overlay);
  }
  
  // Header with controls
  const header = document.createElement('div');
  header.id = 'pin_at_home-header';
  
  // Left side: Board menu (expandable) + Browse button
  const leftSection = document.createElement('div');
  leftSection.className = 'pin_at_home-header-left';
  
  // Board Menu Container - expands on hover to show actions
  const boardMenu = document.createElement('div');
  boardMenu.className = 'pin_at_home-board-menu';
  boardMenu.id = 'pin_at_home-board-menu';
  
  const boardTitle = document.createElement('div');
  boardTitle.className = 'pin_at_home-board-title';
  boardTitle.textContent = state.boardName || 'Board';
  
  // Menu items container (hidden by default, shows on hover)
  const menuItems = document.createElement('div');
  menuItems.className = 'pin_at_home-menu-items';
  menuItems.id = 'pin_at_home-menu-items';
  
  // Divider
  const divider = document.createElement('div');
  divider.className = 'pin_at_home-menu-divider';
  
  const browseBtn = document.createElement('button');
  browseBtn.id = 'pin_at_home-browse-btn';
  browseBtn.className = 'pin_at_home-menu-btn browse';
  browseBtn.textContent = '📋 Browse All';
  browseBtn.onclick = () => toggleBrowseMode(browseBtn);

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'pin_at_home-menu-btn';
  refreshBtn.textContent = '🔄 Shuffle';
  refreshBtn.onclick = shufflePins;
  
  const clearCacheBtn = document.createElement('button');
  clearCacheBtn.className = 'pin_at_home-menu-btn';
  clearCacheBtn.textContent = '🧹 Clear Cache';
  clearCacheBtn.onclick = handleClearCache;
  
  const exitBtn = document.createElement('button');
  exitBtn.className = 'pin_at_home-menu-btn exit';
  exitBtn.textContent = '✕ Exit';
  exitBtn.onclick = exitPinAtHome;
  
  menuItems.appendChild(browseBtn);
  menuItems.appendChild(refreshBtn);
  menuItems.appendChild(clearCacheBtn);
  menuItems.appendChild(exitBtn);
  menuItems.appendChild(divider); // Divider last (closest to title)
  
  boardMenu.appendChild(boardTitle);
  boardMenu.appendChild(menuItems);
  
  leftSection.appendChild(boardMenu);
  // Browse button is now inside the menu
  
  header.appendChild(leftSection);
  
  // Grid container - REUSE from early-init.js if exists
  let grid = document.getElementById('pin_at_home-grid');
  if (!grid) {
    // Fallback: create grid if early-init didn't (shouldn't happen normally)
    grid = document.createElement('div');
    grid.id = 'pin_at_home-grid';
    overlay.appendChild(grid);
  }
  
  // Loading indicator - optional, may not exist with new early-init flow
  let loading = document.getElementById('pin_at_home-loading');
  
  // Insert header before grid
  overlay.insertBefore(header, grid);
  
  // Only append to body if not already there (loader.js may have done this)
  if (!overlay.parentNode) {
    document.body.appendChild(overlay);
  }
  
  // Overlay is now instantly visible via CSS (no JS needed)
  
  updateState({ 
    overlay, 
    grid, 
    loading 
  });
  
  // Prevent scrolling on body while overlay is open
  document.body.style.overflow = 'hidden';
}

/**
 * Exit Pin@Home and restore normal Pinterest view
 */
export function exitPinAtHome() {
  if (state.overlay) {
    // Smooth fade out
    state.overlay.style.transition = 'opacity 0.3s ease-out';
    state.overlay.style.opacity = '0';
    setTimeout(() => {
      state.overlay.remove();
      document.body.style.overflow = ''; // Restore scrolling
    }, 300);
  }
  updateState({ isActive: false });
}
