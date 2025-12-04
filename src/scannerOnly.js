// Pin@Home - Scanner Only Mode
// Runs on Pinterest pages without overlay - just scans and caches

import { CONFIG } from './config.js';
import { state, updateState } from './state.js';
import { startScanning } from './scanner.js';
import { saveLastVisitedBoard } from './cache.js';
import { updateIndicator } from './ui/scannerIndicator.js';
import { autoScroll } from './utils.js';

// Generate cache key from URL
function generateCacheKey() {
  const path = window.location.pathname.replace(/\/$/, '');
  return CONFIG.CACHE_KEY_PREFIX + path;
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

console.log('🧘 Pin@Home: Scanner mode (no overlay)');

// Initialize
const cacheKey = generateCacheKey();
const boardName = extractBoardName();

updateState({ cacheKey, boardName });

// Start scanning with progress callback
const onProgress = (count, isDone) => {
  updateIndicator(count, isDone);
  
  if (isDone) {
    // Don't save as last visited - only manual board selection in new tab should do that
    console.log(`✅ Pin@Home: Cached ${count} pins from "${boardName}"`);
  }
};

// Modified scanning that reports progress
let lastReportedCount = 0;

const checkProgress = () => {
  const currentCount = state.pinsFound.length;
  
  if (currentCount !== lastReportedCount) {
    lastReportedCount = currentCount;
    const isDone = currentCount >= CONFIG.MIN_POOL_SIZE || state.scanAttempts >= CONFIG.MAX_SCAN_ATTEMPTS;
    onProgress(currentCount, isDone);
  }
};

// Auto-scroll to load more pins (Pinterest lazy-loads)
autoScroll();

// Also scroll periodically during scanning to get more pins
const scrollInterval = setInterval(() => {
  window.scrollBy(0, 500);
}, 1000);

// Start scanning (no callback needed, we poll progress)
startScanning(() => {
  // Called when enough pins found
  clearInterval(scrollInterval);
  onProgress(state.pinsFound.length, true);
});

// Poll for progress updates
const progressInterval = setInterval(() => {
  checkProgress();
  
  // Stop polling when done
  if (state.scanAttempts >= CONFIG.MAX_SCAN_ATTEMPTS) {
    clearInterval(progressInterval);
    clearInterval(scrollInterval);
    onProgress(state.pinsFound.length, true);
  }
}, 500);

