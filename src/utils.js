// Pin@Home Utility Functions
import { CONFIG } from './config.js';

/**
 * Validate that we're on a board page
 * @returns {boolean} True if current page is a valid board page
 */
export function isBoardPage() {
  const path = window.location.pathname;
  // Board URLs follow pattern: /{username}/{board-name}/
  // Must have at least 2 path segments (excluding empty strings from leading/trailing slashes)
  const segments = path.split('/').filter(s => s.length > 0);
  
  // Board pages have exactly 2 segments: username and board name
  // Exclude known non-board patterns
  if (segments.length === 2) {
    // Check if first segment is not a known non-board pattern
    const isValid = !CONFIG.NON_BOARD_PATTERNS.includes(segments[0].toLowerCase());
    if (isValid) {
      console.log(`🧘 Pin@Home: Valid board page detected: ${segments[0]}/${segments[1]}`);
    }
    return isValid;
  }
  
  return false;
}

/**
 * Extract board name from URL
 * @returns {string} Decoded board name
 */
export function extractBoardName() {
  const path = window.location.pathname;
  const segments = path.split('/').filter(s => s.length > 0);
  if (segments.length >= 2) {
    return decodeURIComponent(segments[1].replace(/-/g, ' '));
  }
  return '';
}

/**
 * Generate cache key from current URL
 * @returns {string} Cache key for current board
 */
export function generateCacheKey() {
  const path = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  return CONFIG.CACHE_KEY_PREFIX + path;
}

/**
 * Check if error is due to extension context invalidation
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is due to context invalidation
 */
export function isContextInvalidated(error) {
  return error && (
    error.message?.includes('Extension context invalidated') ||
    error.message?.includes('Cannot access') ||
    chrome.runtime?.id === undefined
  );
}

/**
 * Show notification to reload page when extension context is invalidated
 */
export function showReloadNotification() {
  // Only show once
  if (document.getElementById('pin_at_home-reload-notice')) return;
  
  const notice = document.createElement('div');
  notice.id = 'pin_at_home-reload-notice';
  notice.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(230, 0, 35, 0.95);
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 16px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    text-align: center;
  `;
  notice.innerHTML = `
    <div style="margin-bottom: 10px;">🔄 Extension was reloaded</div>
    <div style="font-size: 14px; opacity: 0.9;">Please refresh this page to continue</div>
  `;
  
  document.body.appendChild(notice);
  
  // Auto-remove after 5 seconds
  setTimeout(() => notice.remove(), 5000);
}

/**
 * Scroll down a few times to load more pins
 * Uses requestIdleCallback to avoid blocking animation
 */
export function autoScroll() {
  let scrollsRemaining = CONFIG.AUTO_SCROLL_COUNT;
  
  function doOneScroll() {
    if (scrollsRemaining <= 0) return;
    
    // Wait for idle time (or max 1 second)
    requestIdleCallback(() => {
      window.scrollBy(0, CONFIG.AUTO_SCROLL_DISTANCE);
      scrollsRemaining--;
      
      // Schedule next scroll after interval
      if (scrollsRemaining > 0) {
        setTimeout(doOneScroll, CONFIG.AUTO_SCROLL_INTERVAL);
      }
    }, { timeout: 1000 });
  }
  
  doOneScroll();
}

/**
 * Scroll to the bottom of the page to load all lazy-loaded pins.
 * Returns a promise that resolves when scrolling is complete.
 * @param {Object} options - Configuration options
 * @param {function} options.onProgress - Callback for scroll progress updates
 * @param {number} options.scrollStep - Pixels to scroll per step (default: 800)
 * @param {number} options.scrollDelay - Delay between scrolls in ms (default: 300)
 * @param {number} options.maxNoChangeAttempts - Max attempts when no height change (default: 5)
 * @returns {Promise<boolean>} Resolves true when bottom is reached
 */
export function scrollToBottom(options = {}) {
  const {
    onProgress = null,
    scrollStep = 800,
    scrollDelay = 300,
    maxNoChangeAttempts = 5
  } = options;
  
  return new Promise((resolve) => {
    let lastHeight = document.documentElement.scrollHeight;
    let noChangeCount = 0;
    let isScrolling = true;
    
    function doScroll() {
      if (!isScrolling) return;
      
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = window.innerHeight;
      
      // Check if we're at the bottom
      const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
      
      if (atBottom) {
        // At bottom - check if page height is still increasing (lazy load)
        if (scrollHeight === lastHeight) {
          noChangeCount++;
          
          if (noChangeCount >= maxNoChangeAttempts) {
            // No new content after multiple attempts - we're done
            isScrolling = false;
            if (CONFIG.DEBUG) console.log('🧘 scrollToBottom: Reached true bottom');
            resolve(true);
            return;
          }
        } else {
          // Height changed - more content loaded
          noChangeCount = 0;
          lastHeight = scrollHeight;
        }
      }
      
      // Report progress
      if (onProgress) {
        const progress = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
        onProgress(progress, scrollHeight);
      }
      
      // Scroll down
      window.scrollBy(0, scrollStep);
      
      // Schedule next scroll
      setTimeout(doScroll, scrollDelay);
    }
    
    // Start scrolling
    doScroll();
  });
}

/**
 * Stops any active scrollToBottom operation (for cleanup)
 */
let activeScrollController = null;

export function createScrollController() {
  let isStopped = false;
  
  const controller = {
    stop: () => { isStopped = true; },
    isStopped: () => isStopped
  };
  
  activeScrollController = controller;
  return controller;
}

export function stopActiveScroll() {
  if (activeScrollController) {
    activeScrollController.stop();
    activeScrollController = null;
  }
}
