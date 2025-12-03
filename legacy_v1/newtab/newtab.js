// New Tab Page - Pin Display Logic

// DOM Elements
const loadingState = document.getElementById('loadingState');
const authState = document.getElementById('authState');
const errorState = document.getElementById('errorState');
const pinsGrid = document.getElementById('pinsGrid');
const authBtn = document.getElementById('authBtn');
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');
const retryBtn = document.getElementById('retryBtn');
const errorMessage = document.getElementById('errorMessage');

// State
let currentPins = [];
let isOnline = navigator.onLine;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('New tab page loaded');
  
  // Check online status
  if (!isOnline) {
    showOnlineStatus(false);
  }
  
  await initialize();
});

async function initialize() {
  try {
    // Check authentication status
    const isAuthenticated = await checkAuthentication();
    
    if (!isAuthenticated) {
      showState('auth');
      return;
    }
    
    // Load pins
    await loadPins();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'initialize');
    showError(error.message);
  }
}

// ============================================
// Offline Support
// ============================================

window.addEventListener('online', () => {
  isOnline = true;
  console.log('Back online');
  showOnlineStatus(true);
  // Refresh pins if we were offline
  fetchFreshPins();
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('Gone offline');
  showOnlineStatus(false);
});

function showOnlineStatus(online) {
  // Remove existing status if any
  const existingStatus = document.querySelector('.online-status');
  if (existingStatus) {
    existingStatus.remove();
  }
  
  if (!online) {
    // Show offline banner
    const banner = document.createElement('div');
    banner.className = 'online-status offline';
    banner.innerHTML = `
      <span>📡</span>
      <span>You're offline. Showing cached pins.</span>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
  }
}

// ============================================
// Authentication Check
// ============================================

async function checkAuthentication() {
  try {
    // Ask background script to check session
    const response = await chrome.runtime.sendMessage({ action: 'checkSession' });
    return response && response.success && response.loggedIn;
  } catch (error) {
    ErrorHandler.handleError(error, 'checkAuthentication');
    return false;
  }
}

// ============================================
// Load Pins
// ============================================

async function loadPins() {
  showLoadingSkeletons();
  
  try {
    // Try to load from cache first
    const cachedPins = await StorageUtils.getCachedPins();
    
    if (cachedPins && cachedPins.length > 0) {
      console.log('Loading pins from cache');
      currentPins = cachedPins;
      displayPins(cachedPins);
      
      Analytics.trackEvent('pins_loaded', {
        count: cachedPins.length,
        source: 'cache'
      });
      
      // Fetch fresh pins in background if online
      if (isOnline) {
        fetchFreshPins();
      }
      return;
    }
    
    // No cache, fetch fresh pins
    await fetchFreshPins();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'loadPins');
    showError(error.message);
  }
}

async function fetchFreshPins() {
  if (!isOnline) return;

  try {
    // Get selected board IDs
    const boardIds = await getSelectedBoardIds();
    
    if (!boardIds || boardIds.length === 0) {
      showError('No boards selected. Click the settings icon to select boards.');
      return;
    }

    // Get cached boards to find URLs
    const allBoards = await StorageUtils.getCachedBoards();
    
    if (!allBoards) {
      // If we have IDs but no board data, we can't fetch pins by URL
      // Trigger a board refresh
      await chrome.runtime.sendMessage({ action: 'fetchBoards' });
      // Retry after a short delay
      setTimeout(fetchFreshPins, 1000);
      return;
    }
    
    // Filter to get URLs
    const selectedUrls = allBoards
      .filter(b => boardIds.includes(b.id))
      .map(b => b.url);
    
    const prefs = await StorageUtils.getPreferences();
    
    const response = await chrome.runtime.sendMessage({
      action: 'fetchPins',
      boardUrls: selectedUrls,
      count: prefs.pinsPerPage || 12
    });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    currentPins = response.data;
    displayPins(response.data);
    
    Analytics.trackEvent('pins_loaded', {
      count: response.data.length,
      source: 'api'
    });
    
  } catch (error) {
    ErrorHandler.handleError(error, 'fetchFreshPins');
    
    // If we have cached pins, keep showing them
    if (currentPins.length > 0) {
      console.log('Using cached pins due to fetch error');
    } else {
      throw error;
    }
  }
}

async function getSelectedBoardIds() {
  const prefs = await StorageUtils.getPreferences();
  return prefs.selectedBoards || [];
}

// ============================================
// Display Pins
// ============================================

function showLoadingSkeletons() {
  pinsGrid.innerHTML = '';
  pinsGrid.className = 'skeleton-grid';
  pinsGrid.style.display = 'block';
  
  // Create 12 skeleton cards
  for (let i = 0; i < 12; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    
    const randomHeight = 200 + Math.random() * 200;
    skeleton.innerHTML = `
      <div class="skeleton-image" style="height: ${randomHeight}px"></div>
      <div class="skeleton-text">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
    
    pinsGrid.appendChild(skeleton);
  }
  
  // Hide other states
  loadingState.style.display = 'none';
  authState.style.display = 'none';
  errorState.style.display = 'none';
}

function displayPins(pins) {
  if (!pins || pins.length === 0) {
    showEmptyState();
    return;
  }
  
  console.log(`Displaying ${pins.length} pins`);
  
  pinsGrid.className = 'pins-grid'; // Restore proper class
  pinsGrid.innerHTML = '';
  
  // Create pin cards
  pins.forEach((pin, index) => {
    const pinCard = createPinCard(pin, index);
    pinsGrid.appendChild(pinCard);
  });
  
  showState('pins');
}

// Intersection Observer for lazy loading
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    }
  });
}, {
  rootMargin: '50px' // Start loading 50px before visible
});

function createPinCard(pin, index) {
  const card = document.createElement('div');
  card.className = 'pin-card';
  card.setAttribute('role', 'article');
  card.setAttribute('aria-label', pin.title || 'Pinterest pin');
  card.setAttribute('tabindex', '0');
  
  // Create image container
  const imageContainer = document.createElement('div');
  imageContainer.className = 'pin-image-container';
  
  // Create image
  const img = document.createElement('img');
  img.className = 'pin-image loading';
  img.alt = pin.altText || pin.title || 'Pin image';
  // Use data-src for Intersection Observer
  img.dataset.src = pin.imageUrl || createPlaceholderImage(pin.dominantColor);
  
  // Handle image load
  img.onload = () => {
    img.classList.remove('loading');
  };
  
  img.onerror = () => {
    img.classList.remove('loading');
    img.src = createPlaceholderImage(pin.dominantColor);
  };
  
  // Observe image
  imageObserver.observe(img);
  
  imageContainer.appendChild(img);
  
  // Create overlay
  const overlay = createPinOverlay(pin);
  imageContainer.appendChild(overlay);
  
  card.appendChild(imageContainer);
  
  // Create info section
  if (pin.title || pin.description) {
    const info = document.createElement('div');
    info.className = 'pin-info';
    
    if (pin.title) {
      const title = document.createElement('div');
      title.className = 'pin-title';
      title.textContent = pin.title;
      info.appendChild(title);
    }
    
    if (pin.description) {
      const description = document.createElement('div');
      description.className = 'pin-description';
      description.textContent = pin.description;
      info.appendChild(description);
    }
    
    card.appendChild(info);
  }
  
  // Click handler
  card.addEventListener('click', () => {
    openPin(pin);
    Analytics.trackEvent('pin_opened', {
      pinId: pin.id,
      hasLink: !!pin.link
    });
  });
  
  // Keyboard handler
  card.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPin(pin);
      Analytics.trackEvent('pin_opened', {
        pinId: pin.id,
        hasLink: !!pin.link
      });
    }
  });
  
  return card;
}

function createPinOverlay(pin) {
  const overlay = document.createElement('div');
  overlay.className = 'pin-overlay';
  
  if (pin.title) {
    const title = document.createElement('div');
    title.className = 'pin-overlay-title';
    title.textContent = pin.title;
    overlay.appendChild(title);
  }
  
  const actions = document.createElement('div');
  actions.className = 'pin-overlay-actions';
  
  // View on Pinterest button
  const viewBtn = document.createElement('button');
  viewBtn.className = 'pin-action-btn';
  viewBtn.textContent = '📌 View';
  viewBtn.onclick = (e) => {
    e.stopPropagation();
    openPinOnPinterest(pin);
  };
  actions.appendChild(viewBtn);
  
  // Visit link button (if pin has external link)
  if (pin.link) {
    const linkBtn = document.createElement('button');
    linkBtn.className = 'pin-action-btn';
    linkBtn.textContent = '🔗 Visit';
    linkBtn.onclick = (e) => {
      e.stopPropagation();
      window.open(pin.link, '_blank');
    };
    actions.appendChild(linkBtn);
  }
  
  overlay.appendChild(actions);
  
  return overlay;
}

function createPlaceholderImage(dominantColor) {
  const color = dominantColor || '#2a2a2a';
  const svg = `
    <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="600" fill="${color}"/>
      <text x="50%" y="50%" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="48">📌</text>
    </svg>
  `;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ============================================
// Pin Actions
// ============================================

function openPin(pin) {
  if (pin.link) {
    window.open(pin.link, '_blank');
  } else {
    openPinOnPinterest(pin);
  }
}

function openPinOnPinterest(pin) {
  const pinterestUrl = `https://www.pinterest.com/pin/${pin.id}/`;
  window.open(pinterestUrl, '_blank');
}

// ============================================
// State Management
// ============================================

function showState(state) {
  // Hide all states
  loadingState.style.display = 'none';
  authState.style.display = 'none';
  errorState.style.display = 'none';
  pinsGrid.style.display = 'none';
  
  // Show requested state
  switch (state) {
    case 'loading':
      loadingState.style.display = 'flex';
      break;
    case 'auth':
      authState.style.display = 'flex';
      break;
    case 'error':
      errorState.style.display = 'flex';
      break;
    case 'pins':
      pinsGrid.style.display = 'block';
      break;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  showState('error');
}

function showEmptyState() {
  pinsGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📌</div>
      <h3>No pins to display</h3>
      <p>Select some boards in settings to get started</p>
      <button class="primary-btn" onclick="chrome.runtime.openOptionsPage()" style="margin-top: 1.5rem;">
        Open Settings
      </button>
    </div>
  `;
  showState('pins');
}

// ============================================
// Event Listeners
// ============================================

authBtn.addEventListener('click', async () => {
  try {
    // Open login page
    await chrome.runtime.sendMessage({ action: 'openLogin' });
    
    // Update button text
    authBtn.textContent = 'Waiting for login...';
    authBtn.disabled = true;
    
    // Set up auto-refresh when user comes back
    let checkCount = 0;
    const checkInterval = setInterval(async () => {
      checkCount++;
      const isAuth = await checkAuthentication();
      
      if (isAuth) {
        clearInterval(checkInterval);
        console.log('✅ Login detected! Refreshing...');
        await initialize();
      } else if (checkCount > 60) {
        // Stop checking after 60 attempts (30 seconds)
        clearInterval(checkInterval);
        authBtn.textContent = 'Refresh page after logging in';
      }
    }, 500); // Check every 500ms
    
  } catch (error) {
    ErrorHandler.handleError(error, 'authBtn');
    showError(error.message);
  }
});

let refreshTimeout = null;

refreshBtn.addEventListener('click', async () => {
  if (refreshTimeout) return;
  
  refreshBtn.disabled = true;
  refreshTimeout = setTimeout(() => {
    refreshTimeout = null;
  }, 2000);
  
  await StorageUtils.clearPinCache();
  await loadPins();
  
  refreshBtn.disabled = false;
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

retryBtn.addEventListener('click', async () => {
  retryBtn.disabled = true;
  retryBtn.textContent = 'Retrying...';
  await initialize();
  retryBtn.disabled = false;
  retryBtn.textContent = 'Try Again';
});

// ============================================
// Keyboard Shortcuts
// ============================================

document.addEventListener('keydown', (e) => {
  // R key to refresh
  if (e.key === 'r' || e.key === 'R') {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      refreshBtn.click();
    }
  }
  
  // S key to open settings
  if (e.key === 's' || e.key === 'S') {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      settingsBtn.click();
    }
  }
});
