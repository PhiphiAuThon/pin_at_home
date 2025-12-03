// Pin@Home Content Script
// Runs on Pinterest board pages

console.log('🧘 Pin@Home: Initializing...');

// Configuration
const CONFIG = {
  // PIN_COUNT will be calculated dynamically
  SCAN_INTERVAL: 500,
  MAX_SCAN_ATTEMPTS: 30,
  MIN_POOL_SIZE: 40,
  CACHE_KEY_PREFIX: 'pin_at_home_cache_',
  MAX_CACHE_SIZE: 200 // Keep last 200 pins
};

// State
let state = {
  isActive: true,
  pinsFound: [],
  scanAttempts: 0,
  overlay: null,
  grid: null,
  loading: null,
  cacheKey: '',
  boardName: ''
};

// Check if we're on a board page before running
if (isBoardPage()) {
  init();
} else {
  console.log('🧘 Pin@Home: Not a board page, skipping initialization');
}

// Validate that we're on a board page
function isBoardPage() {
  const path = window.location.pathname;
  // Board URLs follow pattern: /{username}/{board-name}/
  // Must have at least 2 path segments (excluding empty strings from leading/trailing slashes)
  const segments = path.split('/').filter(s => s.length > 0);
  
  // Board pages have exactly 2 segments: username and board name
  // Exclude known non-board patterns
  const nonBoardPatterns = [
    'search', 'pin', 'ideas', 'today', 'explore', 
    'settings', 'resource', '_', 'business'
  ];
  
  if (segments.length === 2) {
    // Check if first segment is not a known non-board pattern
    const isValid = !nonBoardPatterns.includes(segments[0].toLowerCase());
    if (isValid) {
      console.log(`🧘 Pin@Home: Valid board page detected: ${segments[0]}/${segments[1]}`);
    }
    return isValid;
  }
  
  return false;
}

// Initialize
function init() {
  console.log('🧘 Pin@Home: Starting...');
  
  // Generate cache key based on URL (username + board)
  const path = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  state.cacheKey = CONFIG.CACHE_KEY_PREFIX + path;
  
  // Extract board name for display
  const segments = path.split('/').filter(s => s.length > 0);
  if (segments.length >= 2) {
    state.boardName = decodeURIComponent(segments[1].replace(/-/g, ' '));
  }
  
  console.log(`🧘 Pin@Home: Cache key: ${state.cacheKey}`);
  
  // 1. Start loading cache immediately (async)
  const cachePromise = loadFromCache();
  
  // 2. Try to inject overlay ASAP
  injectOverlayWhenReady().then(() => {
    // 3. When overlay is ready, check if cache is ready
    cachePromise.then(hasCache => {
      if (hasCache) {
        console.log('⚡ Instant Load from Cache!');
        renderPins();
        if (state.loading) state.loading.style.display = 'none';
      }
      
      // 4. Start scanning for new content
      // We might need to wait for body to be fully populated for scanning to work well
      if (document.readyState === 'complete') {
        autoScroll();
        startScanning();
      } else {
        window.addEventListener('load', () => {
          autoScroll();
          startScanning();
        });
      }
    });
  });
}

// Helper to inject overlay as soon as body exists
function injectOverlayWhenReady() {
  return new Promise(resolve => {
    if (document.body) {
      createOverlay();
      resolve();
    } else {
      // Body not ready yet, watch for it
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          createOverlay();
          obs.disconnect();
          resolve();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  });
}

// Load pins from local storage
async function loadFromCache() {
  try {
    const result = await chrome.storage.local.get([state.cacheKey]);
    const cachedPins = result[state.cacheKey];
    
    if (cachedPins && Array.isArray(cachedPins) && cachedPins.length > 0) {
      state.pinsFound = cachedPins;
      return true;
    }
  } catch (e) {
    if (isContextInvalidated(e)) {
      console.warn('Pin@Home: Extension reloaded. Please refresh this page.');
      showReloadNotification();
    } else {
      console.warn('Pin@Home: Cache load failed', e);
    }
  }
  return false;
}

// Save current pool to local storage (FIFO)
async function saveToCache(newPins) {
  try {
    // Get current cache
    const result = await chrome.storage.local.get([state.cacheKey]);
    let currentCache = result[state.cacheKey] || [];
    
    // Merge: New pins go to front
    // We use a Set to remove duplicates, but we want to preserve order (newest first)
    const combined = [...newPins, ...currentCache];
    const unique = [...new Set(combined)];
    
    // Trim to max size
    const trimmed = unique.slice(0, CONFIG.MAX_CACHE_SIZE);
    
    // Save back
    await chrome.storage.local.set({ [state.cacheKey]: trimmed });
    console.log(`💾 Cache updated: ${trimmed.length} pins`);
    
    // Update state
    state.pinsFound = trimmed;
    
  } catch (e) {
    if (isContextInvalidated(e)) {
      console.warn('Pin@Home: Extension reloaded. Cache not saved. Please refresh this page.');
      // Don't show notification repeatedly during scanning
    } else {
      console.warn('Pin@Home: Cache save failed', e);
    }
  }
}

// Check if error is due to extension context invalidation
function isContextInvalidated(error) {
  return error && (
    error.message?.includes('Extension context invalidated') ||
    error.message?.includes('Cannot access') ||
    chrome.runtime?.id === undefined
  );
}

// Show notification to reload page when extension context is invalidated
function showReloadNotification() {
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

// Scroll down a few times to load more pins
function autoScroll() {
  let scrolls = 0;
  const maxScrolls = 3;
  
  const scroller = setInterval(() => {
    window.scrollBy(0, 1000);
    scrolls++;
    if (scrolls >= maxScrolls) clearInterval(scroller);
  }, 800);
}

// Create the UI Overlay
function createOverlay() {
  // ... (UI creation code remains same) ...
  // Create container
  const overlay = document.createElement('div');
  overlay.id = 'pin_at_home-overlay';
  
  // Header with controls
  const header = document.createElement('div');
  header.id = 'pin_at_home-header';
  
  // Board name display
  const boardTitle = document.createElement('div');
  boardTitle.className = 'pin_at_home-board-title';
  boardTitle.textContent = state.boardName || 'Board';
  
  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'pin_at_home-buttons';
  
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'pin_at_home-btn';
  refreshBtn.textContent = '🔄 Shuffle';
  refreshBtn.onclick = shufflePins;
  
  const clearCacheBtn = document.createElement('button');
  clearCacheBtn.className = 'pin_at_home-btn';
  clearCacheBtn.textContent = '🧹 Clear Cache';
  clearCacheBtn.onclick = clearCurrentBoardCache;
  
  const exitBtn = document.createElement('button');
  exitBtn.className = 'pin_at_home-btn exit';
  exitBtn.textContent = 'Exit Pin@Home';
  exitBtn.onclick = exitPinAtHome;
  
  buttonContainer.appendChild(refreshBtn);
  buttonContainer.appendChild(clearCacheBtn);
  buttonContainer.appendChild(exitBtn);
  
  header.appendChild(boardTitle);
  header.appendChild(buttonContainer);
  
  // Grid container
  const grid = document.createElement('div');
  grid.id = 'pin_at_home-grid';
  
  // Loading indicator
  const loading = document.createElement('div');
  loading.id = 'pin_at_home-loading';
  loading.textContent = 'Finding Inspiration...';
  
  // Assemble
  overlay.appendChild(header);
  overlay.appendChild(grid);
  overlay.appendChild(loading);
  document.body.appendChild(overlay);
  
  // Overlay is now instantly visible via CSS (no JS needed)
  
  state.overlay = overlay;
  state.grid = grid;
  state.loading = loading;
  
  // Prevent scrolling on body while overlay is open
  document.body.style.overflow = 'hidden';
}

// Scan the page for high-quality pin images
function startScanning() {
  // Scan function - extracted so we can call it immediately
  const scanPage = () => {
    // Find all images that look like pins
    const images = Array.from(document.querySelectorAll('img[src*="pinimg.com"]'));
    
    // Filter for quality
    const validImages = images.filter(img => {
      return img.naturalWidth > 200 && img.naturalHeight > 200;
    });
    
    // Extract URLs
    const urls = validImages.map(img => {
      if (img.srcset) {
        const sources = img.srcset.split(',').map(s => s.trim().split(' '));
        return sources[sources.length - 1][0];
      }
      return img.src;
    });
    
    // Deduplicate
    const uniqueUrls = [...new Set(urls)];
    
    console.log(`🧘 Pin@Home: Found ${uniqueUrls.length} potential pins`);
    
    // If we found new pins, update cache
    if (uniqueUrls.length > 0) {
      saveToCache(uniqueUrls);
    }
    
    // CHECK: Do we have enough pins to show INITIALLY?
    // Only auto-render on the FIRST load, then just update cache silently
    if (state.pinsFound.length >= CONFIG.MIN_POOL_SIZE || state.scanAttempts >= CONFIG.MAX_SCAN_ATTEMPTS) {
      
      // Only render if loading screen is visible (meaning first load)
      if (state.loading && state.loading.style.display !== 'none') {
        console.log('✨ Enough pins found! Rendering...');
        renderPins();
        state.loading.style.display = 'none';
      }
      // After first load, scanning continues silently to update cache
      // No auto-rendering - user must click shuffle to see new pins
    }
    
    state.scanAttempts++;
    // Safety timeout - force render after 15 seconds ONLY if initial load
    if (state.scanAttempts > CONFIG.MAX_SCAN_ATTEMPTS) {
      if (state.loading && state.loading.style.display !== 'none') {
        console.log('⚠️ Scan timeout - rendering what we have');
        renderPins();
        state.loading.style.display = 'none';
      }
      clearInterval(scanner); // Stop scanning after max attempts
    }
  };
  
  // Execute first scan immediately (don't wait for interval)
  scanPage();
  
  // Then continue scanning at intervals
  const scanner = setInterval(scanPage, CONFIG.SCAN_INTERVAL);
}

// Render random pins to the grid (Grid-based collage)
function renderPins() {
  if (!state.grid) return;
  
  // Grid configuration: 2 rows by default
  const ROWS = 2;
  
  // Calculate optimal number of columns based on screen width
  // Assuming average image width of ~250-350px for good visibility
  const avgImageWidth = 300;
  const columns = Math.max(Math.ceil(window.innerWidth / avgImageWidth), 3); // At least 3 columns
  
  // Total cells to fill
  const totalCells = ROWS * columns;
  
  console.log(`🎨 Grid: ${ROWS} rows × ${columns} cols = ${totalCells} cells`);
  
  // Clear current grid
  state.grid.innerHTML = '';
  
  // Update CSS grid with calculated columns
  state.grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  
  // Shuffle available pins
  const shuffled = [...state.pinsFound].sort(() => Math.random() - 0.5);
  
  // Fill all cells - repeat images if we don't have enough
  const imagesToRender = [];
  for (let i = 0; i < totalCells; i++) {
    // Cycle through shuffled images
    const imageUrl = shuffled[i % shuffled.length];
    imagesToRender.push(imageUrl);
  }
  
  // Render each image
  imagesToRender.forEach((url, index) => {
    const pin = document.createElement('div');
    pin.className = 'pin_at_home-pin';
    pin.style.animationDelay = `${index * 0.03}s`; // Stagger animation
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Pin image';
    
    pin.onclick = () => window.open(url, '_blank');
    
    pin.appendChild(img);
    state.grid.appendChild(pin);
  });
  
  console.log(`✨ Rendered ${imagesToRender.length} pins (${state.pinsFound.length} unique)`);
}

function shufflePins() {
  // Just re-render with current pool (shuffled)
  // Scanner is already running in background updating the cache
  renderPins();
  
  console.log('🔄 Shuffled! Using pool of', state.pinsFound.length, 'pins');
}

// Clear cache for current board
async function clearCurrentBoardCache() {
  const confirmed = confirm(`Clear cached images for "${state.boardName}"?\n\nThis will remove all cached images for this board and reload fresh content.`);
  
  if (!confirmed) return;
  
  try {
    // Remove current board's cache
    await chrome.storage.local.remove([state.cacheKey]);
    console.log(`🧹 Cleared cache for: ${state.cacheKey}`);
    
    // Clear current state
    state.pinsFound = [];
    state.scanAttempts = 0;
    
    // Show loading and restart scanning
    if (state.loading) state.loading.style.display = 'block';
    if (state.grid) state.grid.innerHTML = '';
    
    // Restart scanning
    autoScroll();
    startScanning();
    
    console.log('✨ Cache cleared! Rescanning for fresh pins...');
  } catch (e) {
    if (isContextInvalidated(e)) {
      alert('Extension was reloaded. Please refresh this page and try again.');
    } else {
      console.error('Pin@Home: Failed to clear cache', e);
      alert('Failed to clear cache. Check console for details.');
    }
  }
}

// Clear ALL Pin@Home caches (for deep cleaning)
async function clearAllCache() {
  const confirmed = confirm('Clear ALL Pin@Home caches?\n\nThis will remove cached images from ALL boards. This action cannot be undone.');
  
  if (!confirmed) return;
  
  try {
    // Get all storage keys
    const allData = await chrome.storage.local.get(null);
    const pinAtHomeKeys = Object.keys(allData).filter(key => key.startsWith(CONFIG.CACHE_KEY_PREFIX));
    
    if (pinAtHomeKeys.length === 0) {
      alert('No caches found to clear.');
      return;
    }
    
    // Remove all Pin@Home caches
    await chrome.storage.local.remove(pinAtHomeKeys);
    console.log(`🧹 Cleared ${pinAtHomeKeys.length} cache(s):`, pinAtHomeKeys);
    
    alert(`Successfully cleared ${pinAtHomeKeys.length} board cache(s).`);
    
    // Reload current board
    clearCurrentBoardCache();
  } catch (e) {
    if (isContextInvalidated(e)) {
      alert('Extension was reloaded. Please refresh this page and try again.');
    } else {
      console.error('Pin@Home: Failed to clear all caches', e);
      alert('Failed to clear caches. Check console for details.');
    }
  }
}

function exitPinAtHome() {
  if (state.overlay) {
    // Smooth fade out
    state.overlay.style.transition = 'opacity 0.3s ease-out';
    state.overlay.style.opacity = '0';
    setTimeout(() => {
      state.overlay.remove();
      document.body.style.overflow = ''; // Restore scrolling
    }, 300);
  }
  state.isActive = false;
}
