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
  cacheKey: ''
};

// Run immediately
init();

// Initialize
function init() {
  console.log('🧘 Pin@Home: Starting...');
  
  // Generate cache key based on URL (username + board)
  const path = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  state.cacheKey = CONFIG.CACHE_KEY_PREFIX + path;
  
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
    console.warn('Pin@Home: Cache load failed', e);
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
    console.warn('Pin@Home: Cache save failed', e);
  }
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
  
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'pin_at_home-btn';
  refreshBtn.textContent = '🔄 Shuffle';
  refreshBtn.onclick = shufflePins;
  
  const exitBtn = document.createElement('button');
  exitBtn.className = 'pin_at_home-btn exit';
  exitBtn.textContent = 'Exit Pin@Home';
  exitBtn.onclick = exitPinAtHome;
  
  header.appendChild(refreshBtn);
  header.appendChild(exitBtn);
  
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
