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
