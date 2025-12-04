// Pin@Home - Early Init Module
// This module runs BEFORE heavy modules load to provide instant visual feedback
// NO IMPORTS from other project modules - must be self-contained for speed

// Inline config (subset of main config, duplicated intentionally for speed)
const EARLY_CONFIG = {
  CACHE_KEY_PREFIX: 'pin_at_home_cache_',
  AVG_IMAGE_WIDTH: 300,
  MIN_COLUMNS: 3
};

// Generate cache key from URL
function generateCacheKey() {
  const path = window.location.pathname.replace(/\/$/, '');
  return EARLY_CONFIG.CACHE_KEY_PREFIX + path;
}

// Extract board name from URL
function extractBoardName() {
  const path = window.location.pathname;
  const segments = path.split('/').filter(s => s.length > 0);
  if (segments.length >= 2) {
    return decodeURIComponent(segments[1].replace(/-/g, ' '));
  }
  return '';
}

// Calculate column count based on screen width
function calculateColumns() {
  return Math.max(
    Math.ceil(window.innerWidth / EARLY_CONFIG.AVG_IMAGE_WIDTH),
    EARLY_CONFIG.MIN_COLUMNS
  );
}

// Start loading cache immediately (returns Promise)
const cacheKey = generateCacheKey();
const boardName = extractBoardName();

console.log(`⚡ Early Init: Loading cache for ${boardName}...`);

const cachePromise = chrome.storage.local.get([cacheKey]).then(result => {
  const cachedPins = result[cacheKey];
  if (cachedPins && Array.isArray(cachedPins) && cachedPins.length > 0) {
    console.log(`📦 Early Init: ${cachedPins.length} cached images ready`);
    return cachedPins;
  }
  console.log('📦 Early Init: No cache found');
  return [];
}).catch(e => {
  console.warn('⚠️ Early Init: Cache load failed', e);
  return [];
});

// Create grid structure immediately
function createEarlyGrid() {
  const overlay = document.getElementById('pin_at_home-overlay');
  if (!overlay) return null;
  
  // Check if grid already exists
  let grid = document.getElementById('pin_at_home-grid');
  if (grid) return grid;
  
  // Create grid container
  grid = document.createElement('div');
  grid.id = 'pin_at_home-grid';
  grid.style.display = 'flex';
  
  // Create columns
  const columns = calculateColumns();
  console.log(`🏗️ Early Init: Creating ${columns} columns`);
  
  for (let i = 0; i < columns; i++) {
    const column = document.createElement('div');
    column.className = 'pin-column';
    
    const track = document.createElement('div');
    track.className = 'pin-track';
    
    column.appendChild(track);
    grid.appendChild(column);
  }
  
  // Insert grid before loading text (or at end if loading not found)
  const loading = document.getElementById('pin_at_home-loading');
  if (loading) {
    overlay.insertBefore(grid, loading);
  } else {
    overlay.appendChild(grid);
  }
  
  return grid;
}

// Create grid as soon as this module loads
const earlyGrid = createEarlyGrid();

// Export for main.js to consume
export { cachePromise, cacheKey, boardName, earlyGrid, EARLY_CONFIG };
