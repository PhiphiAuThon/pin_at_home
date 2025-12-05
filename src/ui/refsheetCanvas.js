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
  
  // Setup zoom/pan - mouse-centered zoom with constrained panning (like solo view)
  let scale = 1;
  let isPanning = false;
  let hasDragged = false;
  let startX = 0, startY = 0;
  let translateX = 0, translateY = 0;
  let lastTranslateX = 0, lastTranslateY = 0;
  
  const applyTransform = () => {
    grid.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    // Note: transform-origin is handled in CSS (center center)
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
    
    // Cursor updates
    if (scale > 1) {
      container.style.cursor = isPanning ? 'grabbing' : 'grab';
    } else {
      container.style.cursor = 'default';
    }
  };
  
  resetBtn.onclick = () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    lastTranslateX = 0;
    lastTranslateY = 0;
    applyTransform();
  };
  
  // Mouse wheel zoom - zoom towards mouse position
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    const newScale = Math.min(Math.max(1, scale + delta), 5);
    
    if (newScale === 1) {
      scale = 1;
      translateX = 0;
      translateY = 0;
      lastTranslateX = 0;
      lastTranslateY = 0;
    } else {
      // Calculate mouse position relative to grid center
      // Since grid is centered in container, we can use container coordinates
      const rect = grid.getBoundingClientRect();
      const gridCenterX = rect.left + rect.width / 2;
      const gridCenterY = rect.top + rect.height / 2;
      const mouseX = e.clientX - gridCenterX;
      const mouseY = e.clientY - gridCenterY;
      
      // Adjust translation to zoom towards mouse
      const scaleChange = newScale / scale;
      translateX = translateX - (mouseX / scale) * (scaleChange - 1);
      translateY = translateY - (mouseY / scale) * (scaleChange - 1);
      
      lastTranslateX = translateX;
      lastTranslateY = translateY;
      scale = newScale;
    }
    
    applyTransform();
  }, { passive: false });
  
  // Pan functionality - only when zoomed in
  container.addEventListener('mousedown', (e) => {
    if (scale > 1) {
      e.preventDefault();
      isPanning = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      container.style.cursor = 'grabbing';
    }
  });
  
  container.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged = true;
    }
    
    // Update translation directly from last saved position
    // No bounds check - "free" panning when zoomed
    translateX = lastTranslateX + dx;
    translateY = lastTranslateY + dy;
    
    applyTransform();
  });
  
  const stopPanning = () => {
    if (isPanning) {
      isPanning = false;
      lastTranslateX = translateX;
      lastTranslateY = translateY;
      applyTransform(); // Update cursor
    }
  };
  
  container.addEventListener('mouseup', stopPanning);
  container.addEventListener('mouseleave', stopPanning);
  
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
