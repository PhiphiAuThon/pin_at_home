// Pin@Home - Sidepanel Module
// Handles the selection sidepanel UI

import { state, updateState } from '../state.js';
import { removeFromSelection, clearSelection, setUpdateSidepanelCallback } from './selection.js';
import { openRefsheetCanvas } from './refsheetCanvas.js';

// Forward reference to avoid circular import
let exitBrowseModeRef = null;
export function setExitBrowseModeRef(fn) {
  exitBrowseModeRef = fn;
}

/**
 * Create the sidepanel for selected images
 */
export function createSidepanel() {
  const panel = document.createElement('div');
  panel.id = 'pin_at_home-sidepanel';
  
  // Header
  const header = document.createElement('div');
  header.className = 'pin_at_home-sidepanel-header';
  
  const title = document.createElement('div');
  title.className = 'pin_at_home-sidepanel-title';
  title.textContent = 'Reference Sheet';
  
  const count = document.createElement('div');
  count.className = 'pin_at_home-sidepanel-count';
  count.textContent = '0 selected / 0 total';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'pin_at_home-sidepanel-close';
  closeBtn.innerHTML = '×';
  closeBtn.title = 'Close Sidepanel';
  closeBtn.onclick = () => {
    const browseBtn = document.getElementById('pin_at_home-browse-btn');
    if (exitBrowseModeRef) {
      exitBrowseModeRef(browseBtn);
    }
  };
  
  header.appendChild(title);
  header.appendChild(count);
  header.appendChild(closeBtn);
  
  // Gallery
  const gallery = document.createElement('div');
  gallery.className = 'pin_at_home-sidepanel-gallery';
  
  const empty = document.createElement('div');
  empty.className = 'pin_at_home-sidepanel-empty';
  empty.textContent = 'Click images to add them to your reference sheet';
  
  gallery.appendChild(empty);
  
  // Actions
  const actions = document.createElement('div');
  actions.className = 'pin_at_home-sidepanel-actions';
  
  const createBtn = document.createElement('button');
  createBtn.className = 'pin_at_home-sidepanel-btn create';
  createBtn.textContent = '✨ Create Ref Sheet';
  createBtn.disabled = true;
  createBtn.onclick = openRefsheetCanvas;
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'pin_at_home-sidepanel-btn clear';
  clearBtn.textContent = 'Clear Selection';
  clearBtn.onclick = clearSelection;
  
  actions.appendChild(createBtn);
  actions.appendChild(clearBtn);
  
  panel.appendChild(header);
  panel.appendChild(gallery);
  panel.appendChild(actions);
  document.body.appendChild(panel);
  
  updateState({ sidepanel: panel });
}

/**
 * Update the sidepanel to show selected images
 */
export function updateSidepanel() {
  if (!state.sidepanel) return;
  
  const gallery = state.sidepanel.querySelector('.pin_at_home-sidepanel-gallery');
  const count = state.sidepanel.querySelector('.pin_at_home-sidepanel-count');
  const createBtn = state.sidepanel.querySelector('.pin_at_home-sidepanel-btn.create');
  
  gallery.innerHTML = '';
  
  if (state.selectedImages.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pin_at_home-sidepanel-empty';
    empty.textContent = 'Click images to add them to your reference sheet';
    gallery.appendChild(empty);
    createBtn.disabled = true;
  } else {
    state.selectedImages.forEach((url, index) => {
      const item = document.createElement('div');
      item.className = 'pin_at_home-sidepanel-item';
      item.onclick = () => removeFromSelection(url); // Click anywhere to remove
      
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Selected ${index + 1}`;
      
      // Visual indicator (red circle)
      const removeBtn = document.createElement('div');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '×';
      
      item.appendChild(img);
      item.appendChild(removeBtn);
      gallery.appendChild(item);
    });
    createBtn.disabled = false;
  }
  
  count.textContent = `${state.selectedImages.length} selected / ${state.pinsFound.length} total`;
}

// Register callback to avoid circular import issues
setUpdateSidepanelCallback(updateSidepanel);
