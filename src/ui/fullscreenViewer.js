// Pin@Home - Fullscreen Viewer Module
// Handles fullscreen image viewing with zoom and pan

import { state, updateState } from '../state.js';

/**
 * Create fullscreen image viewer element
 */
function createFullscreenViewer() {
  const viewer = document.createElement('div');
  viewer.id = 'pin_at_home-fullscreen-viewer';
  
  const container = document.createElement('div');
  container.className = 'pin_at_home-fullscreen-container';
  
  const img = document.createElement('img');
  img.className = 'pin_at_home-fullscreen-image';
  img.alt = 'Fullscreen pin';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'pin_at_home-fullscreen-close';
  closeBtn.innerHTML = '×';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeFullscreenViewer();
  };
  
  container.appendChild(img);
  viewer.appendChild(container);
  viewer.appendChild(closeBtn);
  
  // Close on background click
  viewer.onclick = (e) => {
    if (e.target === viewer) {
      closeFullscreenViewer();
    }
  };
  
  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewer.classList.contains('active')) {
      closeFullscreenViewer();
    }
  });
  
  document.body.appendChild(viewer);
  
  updateState({ fullscreenViewer: viewer, fullscreenImage: img });
}

/**
 * Open fullscreen viewer with specified image URL
 * @param {string} imageUrl - URL of the image to display
 */
export function openFullscreenViewer(imageUrl) {
  if (!state.fullscreenViewer) {
    createFullscreenViewer();
  }
  
  const img = state.fullscreenImage;
  img.src = imageUrl;
  
  // Reset zoom state
  let scale = 1;
  let isPanning = false;
  let hasDragged = false; // Track if user actually moved while panning
  let startX = 0, startY = 0;
  let translateX = 0, translateY = 0;
  let lastTranslateX = 0, lastTranslateY = 0;
  
  // Reset transform
  img.style.transform = 'scale(1) translate(0px, 0px)';
  img.style.cursor = 'zoom-in';
  
  // Toggle zoom on click
  const handleImageClick = (e) => {
    e.stopPropagation();
    
    // Don't toggle zoom if user just finished dragging
    if (hasDragged) {
      hasDragged = false;
      return;
    }
    
    if (scale === 1) {
      scale = 2.5;
      img.style.cursor = 'grab';
    } else {
      scale = 1;
      translateX = 0;
      translateY = 0;
      lastTranslateX = 0;
      lastTranslateY = 0;
      img.style.cursor = 'zoom-in';
    }
    img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  };
  
  // Mouse wheel zoom - zoom towards mouse position
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    const newScale = Math.min(Math.max(1, scale + delta), 5);
    
    if (newScale === 1) {
      translateX = 0;
      translateY = 0;
      lastTranslateX = 0;
      lastTranslateY = 0;
      img.style.cursor = 'zoom-in';
    } else {
      // Calculate mouse position relative to image center
      const rect = img.getBoundingClientRect();
      const imgCenterX = rect.left + rect.width / 2;
      const imgCenterY = rect.top + rect.height / 2;
      const mouseX = e.clientX - imgCenterX;
      const mouseY = e.clientY - imgCenterY;
      
      // Adjust translation to zoom towards mouse
      const scaleChange = newScale / scale;
      translateX = translateX - (mouseX / scale) * (scaleChange - 1);
      translateY = translateY - (mouseY / scale) * (scaleChange - 1);
      
      lastTranslateX = translateX;
      lastTranslateY = translateY;
      img.style.cursor = 'grab';
    }
    
    scale = newScale;
    img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  };
  
  // Pan start
  const handleMouseDown = (e) => {
    if (scale > 1) {
      e.preventDefault(); // Prevent default to avoid issues
      isPanning = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      img.style.cursor = 'grabbing';
      img.style.transition = 'none';
    }
  };
  
  // Pan move
  const handleMouseMove = (e) => {
    if (!isPanning) return;
    
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged = true;
    }
    
    // Update translation directly from last saved position
    translateX = lastTranslateX + dx;
    translateY = lastTranslateY + dy;
    
    img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  };
  
  // Pan end
  const handleMouseUp = () => {
    if (isPanning) {
      isPanning = false;
      lastTranslateX = translateX;
      lastTranslateY = translateY;
      img.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
      img.style.transition = 'transform 0.2s ease';
    }
  };
  
  // Store handlers for cleanup
  img._handlers = { handleImageClick, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp };
  
  // Add event listeners
  img.addEventListener('click', handleImageClick);
  img.addEventListener('wheel', handleWheel, { passive: false });
  img.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // Show viewer
  state.fullscreenViewer.style.display = 'flex';
  requestAnimationFrame(() => {
    state.fullscreenViewer.classList.add('active');
  });
}

/**
 * Close fullscreen viewer
 */
export function closeFullscreenViewer() {
  if (!state.fullscreenViewer) return;
  
  const img = state.fullscreenImage;
  
  // Remove event listeners
  if (img._handlers) {
    img.removeEventListener('click', img._handlers.handleImageClick);
    img.removeEventListener('wheel', img._handlers.handleWheel);
    img.removeEventListener('mousedown', img._handlers.handleMouseDown);
    document.removeEventListener('mousemove', img._handlers.handleMouseMove);
    document.removeEventListener('mouseup', img._handlers.handleMouseUp);
    delete img._handlers;
  }
  
  state.fullscreenViewer.classList.remove('active');
  
  setTimeout(() => {
    state.fullscreenViewer.style.display = 'none';
    img.src = '';
  }, 300);
}
