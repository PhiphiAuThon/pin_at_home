// Pin@Home - Refsheet Canvas Module
// Handles the reference sheet canvas overlay

import { state, updateState } from '../state.js';

/**
 * Open the refsheet canvas overlay
 */
export function openRefsheetCanvas() {
  if (state.selectedImages.length === 0) return;
  
  // Create canvas if doesn't exist
  if (!state.refsheetCanvas) {
    createRefsheetCanvas();
  }
  
  // Populate with selected images
  populateRefsheetCanvas();
  
  // Show canvas
  state.refsheetCanvas.classList.add('active');
  
  console.log('🎨 Opened refsheet canvas with', state.selectedImages.length, 'images');
}

/**
 * Create the refsheet canvas overlay
 */
function createRefsheetCanvas() {
  const canvas = document.createElement('div');
  canvas.id = 'pin_at_home-refsheet-canvas';
  
  const container = document.createElement('div');
  container.className = 'pin_at_home-refsheet-container';
  
  const grid = document.createElement('div');
  grid.className = 'pin_at_home-refsheet-grid';
  
  container.appendChild(grid);
  
  // Close button (like solo view - circular X at top-right)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'pin_at_home-fullscreen-close';
  closeBtn.innerHTML = '×';
  closeBtn.onclick = closeRefsheetCanvas;
  
  // Controls (just reset and zoom level)
  const controls = document.createElement('div');
  controls.className = 'pin_at_home-refsheet-controls';
  
  const resetBtn = document.createElement('button');
  resetBtn.className = 'pin_at_home-btn';
  resetBtn.textContent = '↺ Reset View';
  
  const zoomLevel = document.createElement('span');
  zoomLevel.className = 'pin_at_home-zoom-level';
  zoomLevel.textContent = '100%';
  
  controls.appendChild(resetBtn);
  controls.appendChild(zoomLevel);
  
  canvas.appendChild(container);
  canvas.appendChild(closeBtn);
  canvas.appendChild(controls);
  document.body.appendChild(canvas);
  
  // Setup zoom/pan - simple center-based zoom with bounded panning
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPanning = false;
  let startX, startY, lastTranslateX, lastTranslateY;
  
  const applyTransform = () => {
    grid.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    grid.style.transformOrigin = 'center center';
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
  };
  
  resetBtn.onclick = () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
  };
  
  // Mouse wheel zoom - center-based
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const newScale = Math.max(0.3, Math.min(3, scale + delta));
    
    // When zooming out, gradually center the content
    if (newScale < scale) {
      translateX *= 0.9;
      translateY *= 0.9;
    }
    
    scale = newScale;
    applyTransform();
  }, { passive: false });
  
  // Pan functionality with bounds
  container.addEventListener('mousedown', (e) => {
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    lastTranslateX = translateX;
    lastTranslateY = translateY;
    container.style.cursor = 'grabbing';
  });
  
  container.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Limit panning so content doesn't go too far off screen
    const maxPan = 200 * scale;
    translateX = Math.max(-maxPan, Math.min(maxPan, lastTranslateX + dx));
    translateY = Math.max(-maxPan, Math.min(maxPan, lastTranslateY + dy));
    
    applyTransform();
  });
  
  container.addEventListener('mouseup', () => {
    isPanning = false;
    container.style.cursor = 'grab';
  });
  
  container.addEventListener('mouseleave', () => {
    isPanning = false;
    container.style.cursor = 'grab';
  });
  
  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && canvas.classList.contains('active')) {
      closeRefsheetCanvas();
    }
  });
  
  updateState({ refsheetCanvas: canvas });
}

/**
 * Populate refsheet canvas with selected images
 */
function populateRefsheetCanvas() {
  const grid = state.refsheetCanvas.querySelector('.pin_at_home-refsheet-grid');
  grid.innerHTML = '';
  
  // Reset zoom
  grid.style.transform = 'scale(1)';
  const zoomLevel = state.refsheetCanvas.querySelector('.pin_at_home-zoom-level');
  if (zoomLevel) zoomLevel.textContent = '100%';
  
  // Add images
  state.selectedImages.forEach((url, index) => {
    const img = document.createElement('img');
    img.className = 'pin_at_home-refsheet-image';
    img.src = url;
    img.alt = `Reference ${index + 1}`;
    img.draggable = false;
    grid.appendChild(img);
  });
}

/**
 * Close refsheet canvas
 */
export function closeRefsheetCanvas() {
  if (state.refsheetCanvas) {
    state.refsheetCanvas.classList.remove('active');
  }
  console.log('🎨 Closed refsheet canvas');
}
