// New Tab Page Logic

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

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('New tab page loaded');
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
    console.error('Initialization error:', error);
    showError(error.message);
  }
}

// ============================================
// Authentication Check
// ============================================

async function checkAuthentication() {
  try {
    const tokens = await StorageUtils.getTokens();
    const isValid = await StorageUtils.isTokenValid();
    return tokens && isValid;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// ============================================
// Load Pins
// ============================================

async function loadPins() {
  showState('loading');
  
  try {
    // Try to load from cache first
    const cachedPins = await StorageUtils.getCachedPins();
    
    if (cachedPins && cachedPins.length > 0) {
      console.log('Loading pins from cache');
      displayPins(cachedPins);
      return;
    }
    
    // Fetch fresh pins from background worker
    const response = await chrome.runtime.sendMessage({
      action: 'fetchPins',
      boardIds: await getSelectedBoardIds(),
      count: (await StorageUtils.getPreferences()).pinsPerPage
    });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    displayPins(response.data);
    
  } catch (error) {
    console.error('Load pins error:', error);
    showError(error.message);
  }
}

async function getSelectedBoardIds() {
  const prefs = await StorageUtils.getPreferences();
  return prefs.selectedBoards || [];
}

// ============================================
// Display Functions
// ============================================

function displayPins(pins) {
  if (!pins || pins.length === 0) {
    showError('No pins found. Please select some boards in settings.');
    return;
  }
  
  // Clear existing pins
  pinsGrid.innerHTML = '';
  
  // For now, just show placeholder
  // Will implement actual pin cards in Phase 5
  pinsGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
      <p>Found ${pins.length} pins!</p>
      <p style="color: var(--text-secondary); margin-top: 1rem;">
        Pin display will be implemented in Phase 5
      </p>
    </div>
  `;
  
  showState('pins');
}

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
      pinsGrid.style.display = 'grid';
      break;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  showState('error');
}

// ============================================
// Event Listeners
// ============================================

authBtn.addEventListener('click', async () => {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'authenticate' });
    if (response.success) {
      await initialize();
    } else {
      showError(response.error);
    }
  } catch (error) {
    showError(error.message);
  }
});

refreshBtn.addEventListener('click', async () => {
  await StorageUtils.clearPinCache();
  await loadPins();
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

retryBtn.addEventListener('click', () => {
  initialize();
});
