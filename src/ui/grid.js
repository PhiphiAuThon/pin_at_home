// Pin@Home - Grid Module
// Orchestrates grid rendering using ColumnScroller

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { clearCurrentBoardCache } from '../cache.js';
import { autoScroll } from '../utils.js';
import { startScanning } from '../scanner.js';
import { switchToSelectionMode } from './browseMode.js';
import { updateSidepanel } from './sidepanel.js';
import { ColumnScroller } from './columnScroller.js';

// Module-level state
let animationFrameId = null;
let columnScrollers = [];

/**
 * Render random pins to the grid (Grid-based collage)
 * Hydrates existing columns from early-init.js OR creates new ones if needed
 */
export async function renderPins() {
  if (!state.grid) return;
  
  // Stop any existing animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  columnScrollers = [];
  
  // Shuffle available pins
  const shuffled = [...state.pinsFound].sort(() => Math.random() - 0.5);
  
  if (CONFIG.DEBUG) console.log(`🎨 Gallery: Rendering ${shuffled.length} pins`);
  
  // Hide loading indicator
  if (state.loading) state.loading.style.display = 'none';
  
  // Check if columns already exist (from early-init.js)
  let existingColumns = state.grid.querySelectorAll('.pin-column');
  
  if (existingColumns.length > 0) {
    // HYDRATE: Reuse existing columns from early-init
    if (CONFIG.DEBUG) console.log(`🎨 Gallery: Hydrating ${existingColumns.length} existing columns for ${state.pinsFound.length} pins`);
    
    // Clear tracks (images) but keep column structure
    // Batch: collect all tracks first, then clear (avoids read-write interleaving)
    const tracks = Array.from(existingColumns, col => col.querySelector('.pin-track'));
    tracks.forEach(track => track?.replaceChildren());
    
  } else {
    // CREATE: No columns exist, create them (fallback or shuffle scenario)
    const availableWidth = state.refsheetMode ? window.innerWidth - CONFIG.SIDEPANEL_WIDTH : window.innerWidth;
    const columns = Math.max(Math.ceil(availableWidth / CONFIG.AVG_IMAGE_WIDTH), CONFIG.MIN_COLUMNS);
    
    if (CONFIG.DEBUG) console.log(`🎨 Gallery: Creating ${columns} columns for ${state.pinsFound.length} pins`);
    
    // Clear current grid
    state.grid.innerHTML = '';
    
    // Set to Flexbox for columns
    state.grid.style.display = 'flex';
    state.grid.style.overflowY = 'hidden';
    
    for (let i = 0; i < columns; i++) {
      const column = document.createElement('div');
      column.className = 'pin-column';
      
      const track = document.createElement('div');
      track.className = 'pin-track';
      
      column.appendChild(track);
      state.grid.appendChild(column);
    }
    
    existingColumns = state.grid.querySelectorAll('.pin-column');
  }
  
  // Build column data for scrollers
  const columnData = [];
  existingColumns.forEach((column, colIndex) => {
    const track = column.querySelector('.pin-track');
    
    // Distribute images to this column (round-robin)
    const columnImages = [];
    for (let i = colIndex; i < shuffled.length; i += existingColumns.length) {
      columnImages.push(shuffled[i]);
    }
    
    // If we have very few images, repeat them
    while (columnImages.length < 20 && columnImages.length > 0) {
      columnImages.push(...columnImages);
    }
    
    columnData.push({ column, track, columnImages, colIndex });
  });
  
  // Initialize ALL columns at once (so round-robin works from the start)
  for (const { column, track, columnImages, colIndex } of columnData) {
    const speed = (colIndex % 2 === 0 ? -1 : 1) * CONFIG.SCROLL_SPEED;
    const scroller = new ColumnScroller(column, track, columnImages, speed);
    scroller.init();
    columnScrollers.push(scroller);
  }
  
  if (CONFIG.DEBUG) console.log(`🎨 Gallery: Initialized ${columnScrollers.length} columns`);
  
  // Start animation loop
  startAnimationLoop();
  if (CONFIG.DEBUG) console.log(`✨ Animation started with all columns ready`);
  
  // If in browse mode, ensure we stay in selection mode and update counts
  if (state.refsheetMode) {
    switchToSelectionMode();
    updateSidepanel();
  }
}

/**
 * Start the animation loop for all column scrollers
 * Uses phase-aware budget to limit work per frame across ALL columns
 */

// Phase tracking: SPRINT → COAST → STABLE
let currentPhase = 'SPRINT';

/**
 * Get frame budget based on current loading phase
 */
function getFrameBudget() {
  const phases = CONFIG.LOADING_PHASES;
  if (currentPhase === 'STABLE') {
    // Continue creates if any column still needs them
    const needsCreates = columnScrollers.some(s => !s.isDoneLoading);
    return { creates: needsCreates ? 5 : 0, loads: 5, reveals: 5 };
  }
  const phase = phases[currentPhase] || phases.COAST;
  return {
    creates: phase.createsPerFrame,
    loads: phase.maxConcurrentLoads,
    reveals: phase.revealsPerFrame
  };
}

function startAnimationLoop() {
  let columnIndex = 0;  // For round-robin staggering
  let frameCounter = 0; // For frame skipping
  const COLUMNS_PER_FRAME = 2;  // Only 2 columns do heavy work per frame
  
  // Reset phase on new animation
  currentPhase = 'SPRINT';
  if (CONFIG.DEBUG) console.log('📊 Loading phase: SPRINT (1 reveal/frame)');
  
  const animate = () => {
    frameCounter++;
    
    // Get current phase config for frame skip check
    const phases = CONFIG.LOADING_PHASES;
    const phaseConfig = phases[currentPhase] || phases.COAST;
    // In STABLE: still do work if any column hasn't finished loading
    const needsMoreLoading = columnScrollers.some(s => !s.isDoneLoading);
    const shouldDoWork = currentPhase === 'STABLE' 
      ? needsMoreLoading 
      : (frameCounter % (phaseConfig.frameSkip || 1) === 0);
    
    // Only do heavy work on designated frames
    let createsLeft = 0, loadsLeft = 0, revealsLeft = 0;
    if (shouldDoWork) {
      const budget = getFrameBudget();
      createsLeft = budget.creates;
      loadsLeft = budget.loads;
      revealsLeft = budget.reveals;
    }
    
    // Round-robin: spread work evenly across ALL columns
    // Creates
    while (createsLeft > 0) {
      let didWork = false;
      for (const scroller of columnScrollers) {
        if (createsLeft > 0 && scroller.needsCreate()) {
          scroller.createOne();
          createsLeft--;
          didWork = true;
        }
      }
      if (!didWork) break;
    }
    
    // Loads
    while (loadsLeft > 0) {
      let didWork = false;
      for (const scroller of columnScrollers) {
        if (loadsLeft > 0 && scroller.canStartLoad()) {
          scroller.startOneLoad();
          loadsLeft--;
          didWork = true;
        }
      }
      if (!didWork) break;
    }
    
    // Reveals
    while (revealsLeft > 0) {
      let didWork = false;
      for (const scroller of columnScrollers) {
        if (revealsLeft > 0 && scroller.hasItemsToReveal()) {
          scroller.revealOne();
          revealsLeft--;
          didWork = true;
        }
      }
      if (!didWork) break;
    }
    
    // ALL columns scroll every frame (cheap operation)
    for (const scroller of columnScrollers) {
      scroller.updateScroll();
    }
    
    // Check phase transitions
    if (currentPhase === 'SPRINT') {
      // Transition to COAST when all columns have minimum visible images
      const allHaveMinVisible = columnScrollers.length > 0 && columnScrollers.every(
        s => s.items.length >= CONFIG.LOADING_PHASES.SPRINT_UNTIL_VISIBLE
      );
      if (allHaveMinVisible) {
        currentPhase = 'COAST';
        if (CONFIG.DEBUG) console.log('📊 Loading phase: SPRINT → COAST (conservative)');
      }
    } else if (currentPhase === 'COAST') {
      // Transition to STABLE when all columns are stable
      const allStable = columnScrollers.length > 0 && columnScrollers.every(s => s.isStable);
      if (allStable) {
        currentPhase = 'STABLE';
        if (CONFIG.DEBUG) console.log('📊 Loading phase: COAST → STABLE (recycling only)');
      }
    }
    
    animationFrameId = requestAnimationFrame(animate);
  };
  animationFrameId = requestAnimationFrame(animate);
}

/**
 * Shuffle and re-render pins
 */
export function shufflePins() {
  renderPins();
  if (CONFIG.DEBUG) console.log('🔄 Shuffled! Using pool of', state.pinsFound.length, 'pins');
}

/**
 * Check if all columns have reached stable mode
 */
export function isAllStable() {
  return columnScrollers.length > 0 && columnScrollers.every(s => s.isStable);
}

/**
 * Handle clear cache button click
 */
export function handleClearCache() {
  clearCurrentBoardCache(() => {
    // Show loading and restart scanning
    if (state.loading) state.loading.style.display = 'block';
    if (state.grid) state.grid.innerHTML = '';
    
    // Restart scanning
    autoScroll();
    startScanning(renderPins);
  });
}
