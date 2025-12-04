// Pin@Home Page Scanner
// Uses requestIdleCallback for non-blocking chunked scanning
import { CONFIG } from './config.js';
import { state, updateState } from './state.js';
import { saveToCache } from './cache.js';

/**
 * Find the board container (cached per scan)
 */
function findBoardContainer() {
  const containerSelectors = [
    '[data-test-id="board-feed"]',
    '[data-test-id="pin-grid"]',
    'div[style*="column"]',
    'main [role="main"]',
    'main'
  ];
  
  for (const selector of containerSelectors) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  
  return document;
}

/**
 * Check if an image is valid (size + not in nav/header)
 */
function isValidImage(img, boardContainer) {
  // Size check
  if (img.naturalWidth <= 200 || img.naturalHeight <= 200) {
    return false;
  }
  
  // Walk up DOM tree to check ancestors
  let element = img;
  while (element && element !== boardContainer) {
    const role = element.getAttribute('role');
    const testId = element.getAttribute('data-test-id');
    
    if (role === 'navigation' || 
        role === 'banner' ||
        testId?.includes('header') ||
        testId?.includes('nav') ||
        testId?.includes('sidebar') ||
        element.tagName === 'HEADER' ||
        element.tagName === 'NAV') {
      return false;
    }
    
    element = element.parentElement;
  }
  
  return true;
}

/**
 * Extract URL from image
 */
function extractUrl(img) {
  if (img.srcset) {
    const sources = img.srcset.split(',').map(s => s.trim().split(' '));
    return sources[sources.length - 1][0];
  }
  return img.src;
}

/**
 * Scan the page using chunked processing with requestIdleCallback
 * This prevents blocking the animation loop
 */
export function startScanning(onEnoughPinsCallback) {
  let scanner = null;
  
  const scanPageChunked = () => {
    const boardContainer = findBoardContainer();
    const images = Array.from(boardContainer.querySelectorAll('img[src*="pinimg.com"]'));
    
    // Chunked processing state
    let index = 0;
    const validUrls = [];
    
    function processChunk(deadline) {
      // Process images while we have idle time (> 2ms remaining)
      while (index < images.length && deadline.timeRemaining() > 2) {
        const img = images[index];
        
        if (isValidImage(img, boardContainer)) {
          validUrls.push(extractUrl(img));
        }
        
        index++;
      }
      
      // More images to process?
      if (index < images.length) {
        // Schedule next chunk
        requestIdleCallback(processChunk, { timeout: 100 });
      } else {
        // Done scanning - finalize
        finalizeScan(validUrls, onEnoughPinsCallback, scanner);
      }
    }
    
    // Start chunked processing
    requestIdleCallback(processChunk, { timeout: 100 });
  };
  
  // Execute first scan immediately
  scanPageChunked();
  
  // Continue scanning at intervals
  scanner = setInterval(scanPageChunked, CONFIG.SCAN_INTERVAL);
  
  return scanner;
}

// Track consecutive scans with no new pins
let previousPinCount = 0;
let noNewPinsCount = 0;

/**
 * Finalize scan results
 */
function finalizeScan(validUrls, onEnoughPinsCallback, scanner) {
  // Deduplicate
  const uniqueUrls = [...new Set(validUrls)];
  
  if (CONFIG.DEBUG) {
    console.log(`🧘 Pin@Home: Scanned ${validUrls.length} valid images, ${uniqueUrls.length} unique`);
  }
  
  // Save to cache if we found pins
  if (uniqueUrls.length > 0) {
    saveToCache(uniqueUrls);
  }
  
  // Check if we found new pins this scan
  const currentPinCount = state.pinsFound.length;
  if (currentPinCount === previousPinCount) {
    noNewPinsCount++;
    if (CONFIG.DEBUG) console.log(`🧘 No new pins (${noNewPinsCount}/3 attempts)`);
  } else {
    noNewPinsCount = 0; // Reset counter
    previousPinCount = currentPinCount;
  }
  
  // Stop early if 3 consecutive scans found nothing new
  const noMorePins = noNewPinsCount >= 3;
  
  // Check if we have enough pins OR no more pins to find
  if (state.pinsFound.length >= CONFIG.MIN_POOL_SIZE || state.scanAttempts >= CONFIG.MAX_SCAN_ATTEMPTS || noMorePins) {
    if (noMorePins && CONFIG.DEBUG) console.log('✨ No more pins to find, stopping early!');
    
    console.log(`✨ Scan complete! Found ${state.pinsFound.length} pins`);
    if (onEnoughPinsCallback) {
      onEnoughPinsCallback();
    }
    if (state.loading) state.loading.style.display = 'none';
    if (scanner) clearInterval(scanner);
    return;
  }
  
  updateState({ scanAttempts: state.scanAttempts + 1 });
}
