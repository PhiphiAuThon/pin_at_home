// Pin@Home - Scanner Only Mode
// Manual trigger scanner with progress reporting

import { CONFIG } from './config.js';
import { state, updateState } from './state.js';
import { startScanning, getBoardPinCount } from './scanner.js';
import { createScannerIndicator, updateIndicator } from './ui/scannerIndicator.js';

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

console.log('🧘 Pin@Home: Scanner loaded - waiting for user trigger');

// Initialize
const cacheKey = generateCacheKey();
const boardName = extractBoardName();
updateState({ cacheKey, boardName });

// Get initial target count
const targetCount = getBoardPinCount();

// Create and append indicator with "Scan" button
const indicator = createScannerIndicator(targetCount);
document.body.appendChild(indicator);

// Handle scan button click
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'pin_at_home-scan-btn') {
    startScanProcess();
  }
});

function startScanProcess() {
  console.log('🧘 Pin@Home: User started scan');
  
  // Start scanning with progress callback
  const stopScanning = startScanning({
    onProgress: (progress) => {
      updateIndicator(progress);
    },
    onComplete: (finalCount) => {
      console.log(`✅ Pin@Home: Cached ${finalCount} pins from "${boardName}"`);
      // Final update handled by onProgress with isDone: true
    }
  });
}
