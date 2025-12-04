// Pin@Home - Selection Module
// Handles image selection logic for browse mode

import { state } from '../state.js';

// Callback reference for sidepanel updates (set by sidepanel.js to avoid circular import)
let updateSidepanelCallback = null;

export function setUpdateSidepanelCallback(fn) {
  updateSidepanelCallback = fn;
}

/**
 * Toggle image selection
 * @param {string} url - Image URL
 * @param {HTMLElement} item - Browse item element
 */
export function toggleImageSelection(url, item) {
  const index = state.selectedImages.indexOf(url);
  
  if (index === -1) {
    // Add to selection
    state.selectedImages.push(url);
    item.classList.add('selected');
  } else {
    // Remove from selection
    state.selectedImages.splice(index, 1);
    item.classList.remove('selected');
  }
  
  // Update all order badges
  updateSelectionOrder();
  
  // Update sidepanel via callback (avoids dynamic import)
  if (updateSidepanelCallback) updateSidepanelCallback();
  
  console.log(`🖼️ Selected ${state.selectedImages.length} images`);
}

/**
 * Update selection order badges in the main grid
 */
export function updateSelectionOrder() {
  if (!state.grid) return;
  
  const items = state.grid.querySelectorAll('.pin_at_home-browse-item');
  
  items.forEach(item => {
    const url = item.dataset.url;
    const orderBadge = item.querySelector('.selection-order');
    if (!orderBadge) return;
    
    const index = state.selectedImages.indexOf(url);
    
    if (index !== -1) {
      orderBadge.textContent = '✓';
    } else {
      orderBadge.textContent = '';
    }
  });
}

/**
 * Remove image from selection
 * @param {string} url - Image URL to remove
 */
export function removeFromSelection(url) {
  const index = state.selectedImages.indexOf(url);
  if (index !== -1) {
    state.selectedImages.splice(index, 1);
  }
  
  // Update main grid item
  if (state.grid) {
    const item = state.grid.querySelector(`[data-url="${CSS.escape(url)}"]`);
    if (item) {
      item.classList.remove('selected');
    }
  }
  
  updateSelectionOrder();
  
  // Update sidepanel via callback
  if (updateSidepanelCallback) updateSidepanelCallback();
}

/**
 * Clear all selected images
 */
export function clearSelection() {
  state.selectedImages = [];
  
  // Update all main grid items
  if (state.grid) {
    const items = state.grid.querySelectorAll('.pin_at_home-browse-item.selected');
    items.forEach(item => item.classList.remove('selected'));
  }
  
  updateSelectionOrder();
  
  // Update sidepanel via callback
  if (updateSidepanelCallback) updateSidepanelCallback();
  
  console.log('🗑️ Cleared selection');
}
