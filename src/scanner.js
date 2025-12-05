// Pin@Home Page Scanner
// Aggressive scroll-and-scan approach: scrolls to bottom while capturing all pins
import { CONFIG } from './config.js';
import { state, updateState } from './state.js';
import { saveToCache } from './cache.js';

// Set of already-found URLs to avoid duplicates
const foundUrls = new Set();

/**
 * Extract pin count from Pinterest board header
 * @returns {number|null} Total pin count or null if not found
 */
export function getBoardPinCount() {
  // Look for the pin count in the header
  // Usually in a div with text like "123 Pins" or "1.2k Pins"
  const header = document.querySelector('[data-test-id="board-header"]');
  if (!header) return null;

  // Try to find the count element
  // Strategy: Look for text ending in "Pins" or "Pin"
  const elements = header.querySelectorAll('*');
  for (const el of elements) {
    const text = el.textContent.trim();
    if (/^[\d,.]+[kKmM]?\s+Pins?$/i.test(text)) {
      // Parse count (handle "1.2k", "1,234")
      let numStr = text.split(/\s+/)[0].replace(/,/g, '').toLowerCase();
      let multiplier = 1;
      
      if (numStr.endsWith('k')) {
        multiplier = 1000;
        numStr = numStr.slice(0, -1);
      } else if (numStr.endsWith('m')) {
        multiplier = 1000000;
        numStr = numStr.slice(0, -1);
      }
      
      const count = parseFloat(numStr) * multiplier;
      return isNaN(count) ? null : Math.round(count);
    }
  }
  
  return null;
}

/**
 * Normalize URL to base hash to avoid duplicates from different sizes
 * Pinterest URLs: https://i.pinimg.com/236x/hash.jpg
 */
function normalizeUrl(url) {
  const match = url.match(/pinimg\.com\/[^/]+\/([a-f0-9]+\.[a-z]+)/i);
  return match ? match[1] : url;
}

/**
 * Extract URL from image - get highest quality version
 */
function extractUrl(img) {
  if (img.srcset) {
    const sources = img.srcset.split(',').map(s => s.trim().split(' '));
    return sources[sources.length - 1][0];
  }
  return img.src;
}

/**
 * Quick validation - just check if it's a pin image
 */
function isValidPinImage(img) {
  // Must have a src with pinimg.com
  const src = img.src || '';
  if (!src.includes('pinimg.com')) return false;
  
  // Must be inside a pin link
  const anchor = img.closest('a[href*="/pin/"]');
  if (!anchor) return false;
  
  // Check if it's a real pin link (has numeric ID)
  const href = anchor.getAttribute('href') || '';
  if (!href.match(/\/pin\/\d+/)) return false;
  
  // Exclude tiny images (avatars, icons)
  const width = img.naturalWidth || img.width || parseInt(img.getAttribute('width')) || 0;
  const height = img.naturalHeight || img.height || parseInt(img.getAttribute('height')) || 0;
  if (width > 0 && width < 100) return false;
  if (height > 0 && height < 100) return false;
  
  return true;
}

/**
 * Find the main board container to avoid scanning recommendations
 */
function findBoardContainer() {
  return document.querySelector('[data-test-id="board-feed"]') 
      || document.querySelector('[data-test-id="pinboard-feed"]')
      || document.querySelector('.gridCentered')
      || document.body;
}

/**
 * Scan currently visible images and add new ones
 */
function scanVisibleImages() {
  const container = findBoardContainer();
  const images = container.querySelectorAll('img[src*="pinimg.com"]');
  let newCount = 0;
  
  for (const img of images) {
    if (isValidPinImage(img)) {
      const url = extractUrl(img);
      const normalized = normalizeUrl(url);
      
      // We store the full URL, but check uniqueness against normalized hash
      // This prevents storing same image in different sizes
      let isDuplicate = false;
      for (const existing of foundUrls) {
        if (normalizeUrl(existing) === normalized) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        foundUrls.add(url);
        newCount++;
      }
    }
  }
  
  if (newCount > 0) {
    // Save to cache
    saveToCache([...foundUrls]);
    if (CONFIG.DEBUG) {
      console.log(`🧘 Found ${newCount} new pins (total: ${foundUrls.size})`);
    }
  }
  
  return newCount;
}

/**
 * Start scanning with auto-scroll to bottom
 * @param {Object} options - Options object
 * @param {function} options.onProgress - Called with progress updates
 * @param {function} options.onComplete - Called when scanning is complete
 * @returns {function} Cleanup function to stop scanning
 */
export function startScanning(options = {}) {
  const { onProgress, onComplete } = options;
  
  // RESET state at start
  foundUrls.clear();
  
  let isRunning = true;
  let noNewPinsCount = 0;
  let lastHeight = 0;
  let atBottomCount = 0;
  let currentDelay = 500; // Adaptive delay
  
  // Try to get target count
  const targetCount = getBoardPinCount();
  console.log(`🧘 Pin@Home: Starting scan. Target: ${targetCount || 'Unknown'} pins`);
  
  function tick() {
    if (!isRunning) return;
    
    // Scan current viewport
    const newPins = scanVisibleImages();
    
    // ADAPTIVE LOGIC: If we found pins, speed up. If not, slow down (backoff).
    if (newPins > 0) {
      currentDelay = 500; // Reset to normal speed
      noNewPinsCount = 0; // Reset stall counter
    } else {
      // Increase delay up to 2s if we're stalling (waiting for load)
      currentDelay = Math.min(currentDelay + 200, 2000);
    }
    
    // Update state
    const currentCount = foundUrls.size;
    updateState({ pinsFound: [...foundUrls] });
    
    // Report progress
    if (onProgress) {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = window.innerHeight;
      const scrollPercent = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100) || 0;
      
      onProgress({
        count: currentCount,
        target: targetCount,
        scrollPercent: scrollPercent,
        isDone: false
      });
    }
    
    // Check scroll position
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const clientHeight = window.innerHeight;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 200; // Increased threshold
    
    if (atBottom) {
      atBottomCount++;
      
      // Check if page is still loading more content
      if (scrollHeight === lastHeight) {
        noNewPinsCount++;
      } else {
        noNewPinsCount = 0;
        lastHeight = scrollHeight;
        atBottomCount = 0; // Reset bottom count if height grew
      }
      
      // STOP CONDITION 1: Target reached
      if (targetCount && currentCount >= targetCount * 0.98) {
         if (noNewPinsCount >= 2) {
           console.log(`✅ Target reached! (${currentCount}/${targetCount})`);
           finishScan();
           return;
         }
      }
      
      // STOP CONDITION 2: Stuck at bottom
      // Be more patient if we haven't reached target
      const patienceLimit = targetCount && currentCount < targetCount * 0.8 ? 30 : 15;
      
      if (atBottomCount >= patienceLimit && noNewPinsCount >= patienceLimit) {
        console.log(`✅ Scan complete (reached bottom)! Found ${currentCount} pins`);
        finishScan();
        return;
      }
      
      // Gentle wiggle ONLY if we've been stuck for a bit
      if (atBottomCount > 5 && atBottomCount % 3 === 0) {
        window.scrollBy(0, -100);
        setTimeout(() => {
          if (isRunning) window.scrollBy(0, 100);
        }, 100);
      }
    } else {
      // Keep scrolling down
      atBottomCount = 0;
      window.scrollBy(0, 300);
    }
    
    // Continue with adaptive delay
    setTimeout(tick, currentDelay);
  }
  
  function finishScan() {
    isRunning = false;
    if (onProgress) {
      onProgress({
        count: foundUrls.size,
        target: targetCount,
        scrollPercent: 100,
        isDone: true
      });
    }
    if (onComplete) onComplete(foundUrls.size);
  }
  
  // Start after a brief delay
  setTimeout(tick, 100);
  
  // Return cleanup function
  return () => {
    isRunning = false;
  };
}

/**
 * Start passive scanning (no auto-scroll, just scan what's visible)
 * @param {function} onComplete - Called when enough pins found
 * @returns {number} Interval ID for cleanup
 */
export function startPassiveScanning(onComplete) {
  let noNewPinsCount = 0;
  
  const scanner = setInterval(() => {
    const newPins = scanVisibleImages();
    updateState({ pinsFound: [...foundUrls] });
    
    if (newPins === 0) {
      noNewPinsCount++;
      if (noNewPinsCount >= 20) {
        // Been a while with no new pins
        console.log(`✅ Passive scan: Found ${foundUrls.size} pins`);
        clearInterval(scanner);
        if (onComplete) onComplete();
      }
    } else {
      noNewPinsCount = 0;
    }
    
    // Check if we hit the limit
    if (foundUrls.size >= CONFIG.MAX_CACHE_SIZE) {
      console.log(`✅ Hit cache limit: ${foundUrls.size} pins`);
      clearInterval(scanner);
      if (onComplete) onComplete();
    }
  }, 300);
  
  return scanner;
}
