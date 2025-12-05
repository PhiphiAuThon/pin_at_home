// Pin@Home - Grid Module

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { clearCurrentBoardCache } from '../cache.js';
import { autoScroll } from '../utils.js';
import { startScanning } from '../scanner.js';
import { switchToSelectionMode } from './browseMode.js';
import { updateSidepanel } from './sidepanel.js';
import { ColumnScroller } from './columnScroller.js';

// ============ STATE ============

let animationFrameId = null;
let columnScrollers = [];
let scrollPaused = false;
let manualPause = false;
let speedMultiplier = 1.0;
let pinCountLimit = 'all';
let currentPhase = 'SPRINT';
let allColumnsFilled = false;

// ============ EXPORTS: PAUSE ============

export function setScrollPaused(paused, isManual = false) {
  scrollPaused = paused;
  if (isManual) manualPause = paused;
  columnScrollers.forEach(s => s.isPaused = paused);
}

export function getScrollPaused() {
  return scrollPaused;
}

export function isManuallyPaused() {
  return manualPause;
}

// ============ EXPORTS: SPEED ============

export function setScrollSpeedMultiplier(percent) {
  speedMultiplier = percent / 100;
  columnScrollers.forEach((scroller, index) => {
    const baseSpeed = (index % 2 === 0 ? -1 : 1) * CONFIG.SCROLL_SPEED;
    scroller.speed = baseSpeed * speedMultiplier;
  });
}

export function getScrollSpeedMultiplier() {
  return speedMultiplier * 100;
}

// ============ EXPORTS: PIN COUNT ============

export function setPinCountLimit(count) {
  pinCountLimit = count;
}

export function getPinCountLimit() {
  return pinCountLimit;
}

// ============ EXPORTS: RENDER ============

export async function renderPins() {
  if (!state.grid) return;
  
  stopAnimation();
  
  const pins = getShuffledPins();
  initializeColumns(pins);
  
  startAnimationLoop();
  
  if (state.refsheetMode) {
    switchToSelectionMode();
    updateSidepanel();
  }
}

export function isAllStable() {
  return columnScrollers.length > 0 && columnScrollers.every(s => s.isStable);
}

export function handleClearCache() {
  clearCurrentBoardCache(() => {
    if (state.loading) state.loading.style.display = 'block';
    if (state.grid) state.grid.innerHTML = '';
    autoScroll();
    startScanning(renderPins);
  });
}

// ============ RENDER HELPERS ============

function stopAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  columnScrollers = [];
  allColumnsFilled = false;
}

function getShuffledPins() {
  let pins = [...state.pinsFound].sort(() => Math.random() - 0.5);
  
  if (pinCountLimit !== 'all') {
    pins = pins.slice(0, parseInt(pinCountLimit, 10));
  }
  
  if (state.loading) state.loading.style.display = 'none';
  
  return pins;
}

function initializeColumns(pins) {
  const columns = createColumns();

  columns.forEach((column, index) => {
    const track = column.querySelector('.pin-track');
    const images = distributeImages(pins, index, columns.length);
    const speed = calculateSpeed(index);
    
    const scroller = new ColumnScroller(column, track, images, speed);
    scroller.init();
    columnScrollers.push(scroller);
  });
  
  // Re-fill columns after window resize (heights change, may need more images)
  window.addEventListener('resize', () => {
    allColumnsFilled = false;
  });
}

function createColumns() {
  const availableWidth = state.refsheetMode 
    ? window.innerWidth - CONFIG.SIDEPANEL_WIDTH 
    : window.innerWidth;
  const count = Math.max(Math.ceil(availableWidth / CONFIG.AVG_IMAGE_WIDTH), CONFIG.MIN_COLUMNS);
  
  state.grid.innerHTML = '';
  state.grid.style.display = 'flex';
  state.grid.style.overflowY = 'hidden';
  
  for (let i = 0; i < count; i++) {
    const column = document.createElement('div');
    column.className = 'pin-column';
    
    const track = document.createElement('div');
    track.className = 'pin-track';
    
    column.appendChild(track);
    state.grid.appendChild(column);
  }
  
  return state.grid.querySelectorAll('.pin-column');
}

function distributeImages(pins, columnIndex, totalColumns) {
  const images = [];
  
  for (let i = columnIndex; i < pins.length; i += totalColumns) {
    images.push(pins[i]);
  }
  
  return images;
}

function calculateSpeed(columnIndex) {
  const direction = columnIndex % 2 === 0 ? -1 : 1;
  return direction * CONFIG.SCROLL_SPEED * speedMultiplier;
}

// ============ ANIMATION LOOP ============

function startAnimationLoop() {
  let frameCounter = 0;
  currentPhase = 'SPRINT';
  
  const animate = () => {
    frameCounter++;
    
    if (shouldDoWork(frameCounter)) {
      doFrameWork();
    }
    
    checkAndFillColumns();
    updateAllScrolls();
    checkPhaseTransitions();
    
    animationFrameId = requestAnimationFrame(animate);
  };
  
  animationFrameId = requestAnimationFrame(animate);
}

function shouldDoWork(frameCounter) {
  const phaseConfig = CONFIG.LOADING_PHASES[currentPhase] || CONFIG.LOADING_PHASES.COAST;
  
  if (currentPhase === 'STABLE') {
    return columnScrollers.some(s => !s.isDoneLoading);
  }
  
  return frameCounter % (phaseConfig.frameSkip || 1) === 0;
}

function getFrameBudget() {
  if (currentPhase === 'STABLE') {
    const needsCreates = columnScrollers.some(s => !s.isDoneLoading);
    return { creates: needsCreates ? 5 : 0, loads: 5, reveals: 5 };
  }
  
  const phase = CONFIG.LOADING_PHASES[currentPhase] || CONFIG.LOADING_PHASES.COAST;
  return {
    creates: phase.createsPerFrame,
    loads: phase.maxConcurrentLoads,
    reveals: phase.revealsPerFrame
  };
}

function doFrameWork() {
  const budget = getFrameBudget();
  
  doRoundRobinWork(budget.creates, s => s.needsCreate(), s => s.createOne());
  doRoundRobinWork(budget.loads, s => s.canStartLoad(), s => s.startOneLoad());
  doRoundRobinWork(budget.reveals, s => s.hasItemsToReveal(), s => s.revealOne());
}

function doRoundRobinWork(budget, canDo, doWork) {
  let remaining = budget;
  
  while (remaining > 0) {
    let didWork = false;
    
    for (const scroller of columnScrollers) {
      if (remaining > 0 && canDo(scroller)) {
        doWork(scroller);
        remaining--;
        didWork = true;
      }
    }
    
    if (!didWork) break;
  }
}

function updateAllScrolls() {
  for (const scroller of columnScrollers) {
    scroller.updateScroll();
  }
}

// ============ CROSS-COLUMN FILLING ============

function checkAndFillColumns() {
  if (allColumnsFilled) return;
  
  // Wait until all columns have finished loading their original images
  const allDone = columnScrollers.every(s => s.isDoneLoading && s.itemManager.pipelineCount === 0);
  if (!allDone) return;
  
  fillAllColumns();
  allColumnsFilled = true;
}

function collectAllLoadedImages() {
  const images = [];
  for (const scroller of columnScrollers) {
    for (const item of scroller.items) {
      if (!item.isClone) {
        // Store original aspect ratio so we can calculate height for any column width
        images.push({
          url: item.url,
          aspectRatio: item.height / scroller.columnWidth
        });
      }
    }
  }
  return images;
}

function fillAllColumns() {
  const allImages = collectAllLoadedImages();
  if (allImages.length === 0) return;
  
  // Track which URLs are already in each column
  const existingUrls = columnScrollers.map(scroller => 
    new Set(scroller.items.map(item => item.url))
  );
  
  let imageIndex = 0;
  let safety = 0;
  const maxIterations = allImages.length * columnScrollers.length * 10;
  
  while (columnScrollers.some(s => s.needsFilling()) && safety < maxIterations) {
    for (let i = 0; i < columnScrollers.length; i++) {
      const scroller = columnScrollers[i];
      if (scroller.needsFilling()) {
        // Find next image not already in this column
        let attempts = 0;
        let img;
        do {
          img = allImages[imageIndex % allImages.length];
          imageIndex++;
          attempts++;
        } while (existingUrls[i].has(img.url) && attempts < allImages.length);
        
        // Only add if we found a non-duplicate (or if all images are already in column)
        const height = img.aspectRatio * scroller.columnWidth;
        scroller.addClonedImage(img.url, height);
        existingUrls[i].add(img.url);
      }
    }
    safety++;
  }
}

function checkPhaseTransitions() {
  if (currentPhase === 'SPRINT') {
    const allHaveMinVisible = columnScrollers.every(
      s => s.items.length >= CONFIG.LOADING_PHASES.SPRINT_UNTIL_VISIBLE
    );
    if (allHaveMinVisible) {
      currentPhase = 'COAST';
    }
  } else if (currentPhase === 'COAST') {
    const allStable = columnScrollers.every(s => s.isStable);
    if (allStable) {
      currentPhase = 'STABLE';
    }
  }
}
