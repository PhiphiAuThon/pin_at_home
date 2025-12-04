// Pin@Home Content Script - Main Entry Point
// Runs on Pinterest board pages

import { CONFIG } from './config.js';
import { state, updateState } from './state.js';
import { isBoardPage, autoScroll } from './utils.js';
import { startScanning } from './scanner.js';
import { injectOverlayWhenReady, renderPins } from './ui.js';
import { saveLastVisitedBoard } from './cache.js';

// Import cache data from early-init (already loaded!)
import { cachePromise, cacheKey, boardName, earlyGrid } from './early-init.js';

console.log('🧘 Pin@Home: Initializing...');

// Check if we're on a board page before running
if (isBoardPage()) {
  init();
} else {
  console.log('🧘 Pin@Home: Not a board page, skipping initialization');
}

/**
 * Initialize Pin@Home
 * Note: Grid already created by early-init.js, cache already loading
 */
async function init() {
  console.log('🧘 Pin@Home: Starting...');
  
  // Update state with cache key and board name (already calculated by early-init)
  updateState({ 
    cacheKey, 
    boardName 
  });
  
  if (CONFIG.DEBUG) console.log(`🧘 Pin@Home: Cache key: ${cacheKey}`);
  
  // Wait for cache to be ready (started by early-init)
  const cachedPins = await cachePromise;
  
  if (cachedPins.length > 0) {
    console.log('⚡ Instant Load from Cache!');
    updateState({ pinsFound: cachedPins });
  }
  
  // Inject full overlay UI in parallel (don't wait for it)
  injectOverlayWhenReady();
  
  // Get grid reference immediately (already exists from early-init)
  const grid = document.getElementById('pin_at_home-grid');
  const loading = document.getElementById('pin_at_home-loading');
  updateState({ grid, loading });
  
  // Render pins immediately if we have cache (don't wait for overlay)
  if (cachedPins.length > 0) {
    renderPins();
    // Save as last visited board for new tab page
    saveLastVisitedBoard(cacheKey, boardName);
  }
  
  // Start scanning for new content - wait for stable mode first
  const startScanningDelayed = () => {
    // Import isAllStable dynamically to avoid circular dependency
    import('./ui/grid.js').then(({ isAllStable }) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max (100 * 100ms)
      
      const checkAndStart = () => {
        attempts++;
        if (isAllStable() || attempts >= maxAttempts) {
          if (CONFIG.DEBUG) console.log(`🔍 Starting background scan (stable: ${isAllStable()}, attempts: ${attempts})`);
          autoScroll();
          startScanning(renderPins);
        } else {
          setTimeout(checkAndStart, 100);  // Check again in 100ms
        }
      };
      
      // Start checking after initial delay
      setTimeout(checkAndStart, 1000);
    });
  };
  
  if (document.readyState === 'complete') {
    startScanningDelayed();
  } else {
    window.addEventListener('load', startScanningDelayed);
  }
}

