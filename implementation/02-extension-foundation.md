# Phase 2: Extension Foundation

## Overview
Create the core Chrome extension structure with Manifest V3, background service worker, and basic storage setup.

---

## Step 2.1: Create manifest.json

The manifest file is the heart of your Chrome extension. It defines permissions, background scripts, and overrides.

**File: `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Pinterest Random Pins",
  "version": "1.0.0",
  "description": "Display random pins from your private Pinterest boards on every new tab",
  "permissions": [
    "storage",
    "identity"
  ],
  "host_permissions": [
    "https://api.pinterest.com/*",
    "https://www.pinterest.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "chrome_url_overrides": {
    "newtab": "newtab/newtab.html"
  },
  "action": {
    "default_popup": "settings/settings.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Key Points:

- **manifest_version: 3** - Latest version (required for new extensions)
- **permissions**: 
  - `storage` - Save user preferences and cached data
  - `identity` - For OAuth authentication
- **host_permissions** - Access to Pinterest API and website
- **chrome_url_overrides.newtab** - Replace new tab page
- **action.default_popup** - Settings accessible from toolbar icon

---

## Step 2.2: Create Background Service Worker

The background service worker handles API calls, authentication, and data management.

**File: `background.js`**

```javascript
// Background Service Worker for Pinterest Random Pins Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Set default preferences
    chrome.storage.local.set({
      preferences: {
        selectedBoards: [],
        pinsPerPage: 12,
        refreshInterval: 'daily',
        theme: 'dark'
      }
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Listen for messages from content scripts and new tab page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  switch (request.action) {
    case 'authenticate':
      handleAuthentication()
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'fetchBoards':
      fetchUserBoards()
        .then(boards => sendResponse({ success: true, data: boards }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'fetchPins':
      fetchRandomPins(request.boardIds, request.count)
        .then(pins => sendResponse({ success: true, data: pins }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'refreshToken':
      refreshAccessToken()
        .then(token => sendResponse({ success: true, data: token }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Placeholder functions (will be implemented in later phases)
async function handleAuthentication() {
  // Will implement OAuth flow in Phase 3
  throw new Error('Not implemented yet');
}

async function fetchUserBoards() {
  // Will implement in Phase 4
  throw new Error('Not implemented yet');
}

async function fetchRandomPins(boardIds, count) {
  // Will implement in Phase 4
  throw new Error('Not implemented yet');
}

async function refreshAccessToken() {
  // Will implement in Phase 3
  throw new Error('Not implemented yet');
}

// Alarm listener for periodic token refresh
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tokenRefresh') {
    console.log('Refreshing access token...');
    refreshAccessToken().catch(console.error);
  }
});

// Set up token refresh alarm (check every 24 hours)
chrome.alarms.create('tokenRefresh', {
  periodInMinutes: 1440 // 24 hours
});

console.log('Background service worker initialized');
```

### Key Points:

- **onInstalled** - Set default preferences on first install
- **onMessage** - Handle requests from new tab page and settings
- **Alarms** - Periodic token refresh to keep authentication valid
- **Async/await** - Modern promise handling
- **Error handling** - Proper error responses

---

## Step 2.3: Create Storage Utility

Centralize all Chrome storage operations for consistency.

**File: `utils/storage.js`**

```javascript
// Chrome Storage Utility Functions

const STORAGE_KEYS = {
  AUTH_TOKENS: 'authTokens',
  PREFERENCES: 'preferences',
  CACHED_PINS: 'cachedPins',
  CACHED_BOARDS: 'cachedBoards',
  CACHE_TIMESTAMP: 'cacheTimestamp'
};

// ============================================
// Authentication Token Management
// ============================================

/**
 * Save OAuth tokens to storage
 * @param {Object} tokens - { accessToken, refreshToken, expiresAt }
 */
async function saveTokens(tokens) {
  return chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_TOKENS]: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt
    }
  });
}

/**
 * Get OAuth tokens from storage
 * @returns {Promise<Object|null>} Tokens or null if not found
 */
async function getTokens() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKENS);
  return result[STORAGE_KEYS.AUTH_TOKENS] || null;
}

/**
 * Check if access token is still valid
 * @returns {Promise<boolean>}
 */
async function isTokenValid() {
  const tokens = await getTokens();
  if (!tokens || !tokens.expiresAt) return false;
  
  // Check if token expires in next 5 minutes
  const now = Date.now();
  const expiresAt = new Date(tokens.expiresAt).getTime();
  return expiresAt > (now + 5 * 60 * 1000);
}

/**
 * Clear authentication tokens
 */
async function clearTokens() {
  return chrome.storage.local.remove(STORAGE_KEYS.AUTH_TOKENS);
}

// ============================================
// User Preferences
// ============================================

/**
 * Save user preferences
 * @param {Object} preferences - User settings
 */
async function savePreferences(preferences) {
  return chrome.storage.local.set({
    [STORAGE_KEYS.PREFERENCES]: preferences
  });
}

/**
 * Get user preferences
 * @returns {Promise<Object>} User preferences with defaults
 */
async function getPreferences() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PREFERENCES);
  return result[STORAGE_KEYS.PREFERENCES] || {
    selectedBoards: [],
    pinsPerPage: 12,
    refreshInterval: 'daily',
    theme: 'dark'
  };
}

/**
 * Update specific preference
 * @param {string} key - Preference key
 * @param {*} value - New value
 */
async function updatePreference(key, value) {
  const prefs = await getPreferences();
  prefs[key] = value;
  return savePreferences(prefs);
}

// ============================================
// Pin Caching
// ============================================

/**
 * Cache pins with timestamp
 * @param {Array} pins - Array of pin objects
 */
async function cachePins(pins) {
  return chrome.storage.local.set({
    [STORAGE_KEYS.CACHED_PINS]: pins,
    [STORAGE_KEYS.CACHE_TIMESTAMP]: Date.now()
  });
}

/**
 * Get cached pins if still valid
 * @param {number} maxAgeMs - Maximum cache age in milliseconds
 * @returns {Promise<Array|null>} Cached pins or null if expired
 */
async function getCachedPins(maxAgeMs = 24 * 60 * 60 * 1000) { // Default 24 hours
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.CACHED_PINS,
    STORAGE_KEYS.CACHE_TIMESTAMP
  ]);
  
  const pins = result[STORAGE_KEYS.CACHED_PINS];
  const timestamp = result[STORAGE_KEYS.CACHE_TIMESTAMP];
  
  if (!pins || !timestamp) return null;
  
  const age = Date.now() - timestamp;
  if (age > maxAgeMs) {
    // Cache expired
    return null;
  }
  
  return pins;
}

/**
 * Clear cached pins
 */
async function clearPinCache() {
  return chrome.storage.local.remove([
    STORAGE_KEYS.CACHED_PINS,
    STORAGE_KEYS.CACHE_TIMESTAMP
  ]);
}

// ============================================
// Board Caching
// ============================================

/**
 * Cache user's boards
 * @param {Array} boards - Array of board objects
 */
async function cacheBoards(boards) {
  return chrome.storage.local.set({
    [STORAGE_KEYS.CACHED_BOARDS]: boards
  });
}

/**
 * Get cached boards
 * @returns {Promise<Array|null>}
 */
async function getCachedBoards() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CACHED_BOARDS);
  return result[STORAGE_KEYS.CACHED_BOARDS] || null;
}

/**
 * Clear all cached data
 */
async function clearAllCache() {
  return chrome.storage.local.remove([
    STORAGE_KEYS.CACHED_PINS,
    STORAGE_KEYS.CACHED_BOARDS,
    STORAGE_KEYS.CACHE_TIMESTAMP
  ]);
}

// ============================================
// Export functions
// ============================================

// Make functions available globally for the extension
if (typeof window !== 'undefined') {
  window.StorageUtils = {
    saveTokens,
    getTokens,
    isTokenValid,
    clearTokens,
    savePreferences,
    getPreferences,
    updatePreference,
    cachePins,
    getCachedPins,
    clearPinCache,
    cacheBoards,
    getCachedBoards,
    clearAllCache
  };
}
```

### Key Points:

- **Organized by function** - Tokens, preferences, caching
- **Async/await** - All functions return promises
- **Cache expiration** - Automatic cache invalidation
- **Default values** - Sensible defaults for preferences
- **Global export** - Available to all extension pages

---

## Step 2.4: Create Basic New Tab Page

Create a minimal new tab page that will be enhanced in later phases.

**File: `newtab/newtab.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pinterest Random Pins</title>
  <link rel="stylesheet" href="newtab.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Pinterest Random Pins</h1>
      <div class="header-actions">
        <button id="refreshBtn" class="icon-btn" title="Refresh pins">
          <span>🔄</span>
        </button>
        <button id="settingsBtn" class="icon-btn" title="Settings">
          <span>⚙️</span>
        </button>
      </div>
    </header>

    <main id="mainContent">
      <!-- Loading state -->
      <div id="loadingState" class="state-message">
        <div class="spinner"></div>
        <p>Loading your pins...</p>
      </div>

      <!-- Authentication required state -->
      <div id="authState" class="state-message" style="display: none;">
        <h2>Connect to Pinterest</h2>
        <p>Sign in to view your private boards</p>
        <button id="authBtn" class="primary-btn">Connect Pinterest</button>
      </div>

      <!-- Error state -->
      <div id="errorState" class="state-message" style="display: none;">
        <h2>Oops! Something went wrong</h2>
        <p id="errorMessage"></p>
        <button id="retryBtn" class="primary-btn">Try Again</button>
      </div>

      <!-- Pins grid (will be populated dynamically) -->
      <div id="pinsGrid" class="pins-grid" style="display: none;">
        <!-- Pins will be inserted here -->
      </div>
    </main>
  </div>

  <script src="../utils/storage.js"></script>
  <script src="newtab.js"></script>
</body>
</html>
```

**File: `newtab/newtab.css`**

```css
/* Pinterest Random Pins - New Tab Styles */

/* ============================================
   CSS Variables & Theme
   ============================================ */
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-card: #2a2a2a;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --accent-primary: #e60023;
  --accent-hover: #ff1744;
  --border-color: #3a3a3a;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.5);
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================
   Reset & Base Styles
   ============================================ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ============================================
   Container & Layout
   ============================================ */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

/* ============================================
   Buttons
   ============================================ */
.icon-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 48px;
  height: 48px;
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.icon-btn:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.primary-btn {
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.primary-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* ============================================
   State Messages
   ============================================ */
.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  gap: 1.5rem;
}

.state-message h2 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.state-message p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* ============================================
   Loading Spinner
   ============================================ */
.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--bg-card);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================================
   Pins Grid (placeholder for Phase 5)
   ============================================ */
.pins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
}

/* ============================================
   Responsive Design
   ============================================ */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  h1 {
    font-size: 1.5rem;
  }
  
  .pins-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
}
```

**File: `newtab/newtab.js`**

```javascript
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
```

---

## Step 2.5: Test Extension Loading

Now let's load the extension in Brave to verify the foundation works.

### Loading Steps:

1. **Open Brave Browser**

2. **Navigate to Extensions**
   - Type in address bar: `brave://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle switch in top-right corner

4. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to: `c:\Users\Phiphi\Documents\dev\pint_at_home`
   - Click "Select Folder"

5. **Note Your Extension ID**
   - After loading, you'll see something like:
     ```
     ID: abcdefghijklmnopqrstuvwxyz123456
     ```
   - **IMPORTANT**: Copy this ID! You'll need it for Pinterest OAuth configuration

6. **Test New Tab**
   - Open a new tab (Ctrl+T)
   - You should see your new tab page with "Connect to Pinterest" message

---

## Verification Checklist

- [ ] `manifest.json` created with correct structure
- [ ] `background.js` service worker created
- [ ] `utils/storage.js` utility functions created
- [ ] `newtab/newtab.html` page created
- [ ] `newtab/newtab.css` styles created
- [ ] `newtab/newtab.js` logic created
- [ ] Extension loads without errors in Brave
- [ ] New tab page displays correctly
- [ ] Extension ID noted for OAuth configuration
- [ ] Browser console shows no errors

---

## Next Steps

Proceed to **Phase 3: Pinterest Authentication** to implement the OAuth flow and enable Pinterest login.

---

## Troubleshooting

### Issue: Extension won't load
- **Check**: manifest.json syntax (use JSON validator)
- **Check**: All file paths are correct
- **Check**: Icons exist in assets/icons/

### Issue: New tab page is blank
- **Check**: Browser console for JavaScript errors
- **Check**: File paths in newtab.html are correct
- **Check**: newtab.css and newtab.js are loading

### Issue: Service worker errors
- **Check**: background.js syntax
- **View**: brave://extensions/ → Details → Service worker → Errors

### Issue: Can't find extension ID
- **Location**: brave://extensions/ → Details → ID field at top
