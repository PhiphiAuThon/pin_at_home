# Phase 3: Pinterest Authentication

## Overview
Implement OAuth 2.0 authentication flow to securely connect to Pinterest and access private boards.

---

## Step 3.1: Update Pinterest App Configuration

Before implementing OAuth, you need to configure your Pinterest app with the correct redirect URI.

### Update Redirect URI:

1. **Go to Pinterest Developers Portal**
   - Visit: https://developers.pinterest.com/apps/
   - Select your app

2. **Add Redirect URI**
   - Navigate to "OAuth" or "Settings" section
   - Add redirect URI in this format:
     ```
     https://<YOUR_EXTENSION_ID>.chromiumapp.org/
     ```
   - Replace `<YOUR_EXTENSION_ID>` with the ID from Phase 2, Step 2.5
   - Example: `https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/`

3. **Save Changes**
   - Click "Save" or "Update"
   - Wait a few minutes for changes to propagate

---

## Step 3.2: Create Pinterest Authentication Module

This module handles the complete OAuth 2.0 flow.

**File: `auth/pinterest-auth.js`**

```javascript
// Pinterest OAuth 2.0 Authentication Module

// Pinterest API Configuration
const PINTEREST_CONFIG = {
  authEndpoint: 'https://www.pinterest.com/oauth/',
  tokenEndpoint: 'https://api.pinterest.com/v5/oauth/token',
  apiBase: 'https://api.pinterest.com/v5',
  
  // These will be set from environment or manifest
  clientId: '', // Will be set dynamically
  clientSecret: '', // Will be set dynamically
  redirectUri: '', // Will be set dynamically
  
  scopes: [
    'boards:read',
    'boards:read_secret',
    'pins:read',
    'pins:read_secret'
  ]
};

// ============================================
// Configuration Setup
// ============================================

/**
 * Initialize Pinterest configuration
 * Call this before using any auth functions
 */
async function initializeConfig(clientId, clientSecret) {
  PINTEREST_CONFIG.clientId = clientId;
  PINTEREST_CONFIG.clientSecret = clientSecret;
  
  // Get extension ID for redirect URI
  const extensionId = chrome.runtime.id;
  PINTEREST_CONFIG.redirectUri = `https://${extensionId}.chromiumapp.org/`;
  
  console.log('Pinterest auth configured:', {
    clientId: PINTEREST_CONFIG.clientId,
    redirectUri: PINTEREST_CONFIG.redirectUri
  });
}

// ============================================
// OAuth Flow
// ============================================

/**
 * Initiate OAuth authentication flow
 * Opens Pinterest login in new window
 * @returns {Promise<Object>} Authentication tokens
 */
async function initiateAuth() {
  try {
    console.log('Starting Pinterest OAuth flow...');
    
    // Generate random state for CSRF protection
    const state = generateRandomState();
    
    // Build authorization URL
    const authUrl = buildAuthUrl(state);
    
    console.log('Opening auth URL:', authUrl);
    
    // Use Chrome Identity API for OAuth
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (!redirectUrl) {
            reject(new Error('No redirect URL received'));
            return;
          }
          
          try {
            // Extract authorization code from redirect URL
            const code = extractAuthCode(redirectUrl);
            const receivedState = extractState(redirectUrl);
            
            // Verify state matches
            if (receivedState !== state) {
              throw new Error('State mismatch - possible CSRF attack');
            }
            
            // Exchange code for tokens
            const tokens = await exchangeCodeForToken(code);
            
            // Save tokens
            await StorageUtils.saveTokens(tokens);
            
            console.log('Authentication successful');
            resolve(tokens);
            
          } catch (error) {
            reject(error);
          }
        }
      );
    });
    
  } catch (error) {
    console.error('Auth initiation error:', error);
    throw error;
  }
}

/**
 * Build Pinterest authorization URL
 */
function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: PINTEREST_CONFIG.clientId,
    redirect_uri: PINTEREST_CONFIG.redirectUri,
    response_type: 'code',
    scope: PINTEREST_CONFIG.scopes.join(','),
    state: state
  });
  
  return `${PINTEREST_CONFIG.authEndpoint}?${params.toString()}`;
}

/**
 * Generate random state for CSRF protection
 */
function generateRandomState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract authorization code from redirect URL
 */
function extractAuthCode(url) {
  const urlObj = new URL(url);
  const code = urlObj.searchParams.get('code');
  
  if (!code) {
    throw new Error('No authorization code in redirect URL');
  }
  
  return code;
}

/**
 * Extract state from redirect URL
 */
function extractState(url) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get('state');
}

// ============================================
// Token Exchange
// ============================================

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from OAuth flow
 * @returns {Promise<Object>} Token object
 */
async function exchangeCodeForToken(code) {
  try {
    console.log('Exchanging code for token...');
    
    const response = await fetch(PINTEREST_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${PINTEREST_CONFIG.clientId}:${PINTEREST_CONFIG.clientSecret}`)
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: PINTEREST_CONFIG.redirectUri
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt.toISOString(),
      tokenType: data.token_type,
      scope: data.scope
    };
    
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

// ============================================
// Token Refresh
// ============================================

/**
 * Refresh access token using refresh token
 * @returns {Promise<Object>} New token object
 */
async function refreshAccessToken() {
  try {
    console.log('Refreshing access token...');
    
    const tokens = await StorageUtils.getTokens();
    
    if (!tokens || !tokens.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch(PINTEREST_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${PINTEREST_CONFIG.clientId}:${PINTEREST_CONFIG.clientSecret}`)
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // If refresh token is invalid, clear tokens and require re-auth
      if (response.status === 401) {
        await StorageUtils.clearTokens();
        throw new Error('Refresh token expired - please re-authenticate');
      }
      
      throw new Error(`Token refresh failed: ${error.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));
    
    const newTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken, // Keep old refresh token if new one not provided
      expiresAt: expiresAt.toISOString(),
      tokenType: data.token_type,
      scope: data.scope
    };
    
    // Save new tokens
    await StorageUtils.saveTokens(newTokens);
    
    console.log('Token refreshed successfully');
    return newTokens;
    
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

// ============================================
// Token Validation
// ============================================

/**
 * Get a valid access token (refresh if needed)
 * @returns {Promise<string>} Valid access token
 */
async function getValidToken() {
  try {
    const isValid = await StorageUtils.isTokenValid();
    
    if (isValid) {
      const tokens = await StorageUtils.getTokens();
      return tokens.accessToken;
    }
    
    // Token expired or about to expire, refresh it
    console.log('Token expired, refreshing...');
    const newTokens = await refreshAccessToken();
    return newTokens.accessToken;
    
  } catch (error) {
    console.error('Get valid token error:', error);
    throw error;
  }
}

// ============================================
// Sign Out
// ============================================

/**
 * Sign out and clear all authentication data
 */
async function signOut() {
  try {
    console.log('Signing out...');
    
    // Clear tokens
    await StorageUtils.clearTokens();
    
    // Clear all cached data
    await StorageUtils.clearAllCache();
    
    console.log('Signed out successfully');
    
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// ============================================
// Export Functions
// ============================================

if (typeof window !== 'undefined') {
  window.PinterestAuth = {
    initializeConfig,
    initiateAuth,
    refreshAccessToken,
    getValidToken,
    signOut
  };
}

// For background script
if (typeof self !== 'undefined' && self.constructor.name === 'ServiceWorkerGlobalScope') {
  self.PinterestAuth = {
    initializeConfig,
    initiateAuth,
    refreshAccessToken,
    getValidToken,
    signOut
  };
}
```

---

## Step 3.3: Update Background Service Worker

Update `background.js` to use the authentication module.

**File: `background.js` (Updated)**

Add these changes to your existing `background.js`:

```javascript
// Import authentication module
importScripts('utils/storage.js');
importScripts('auth/pinterest-auth.js');

// Pinterest API credentials
// TODO: Replace with your actual credentials
const PINTEREST_CLIENT_ID = 'your_client_id_here';
const PINTEREST_CLIENT_SECRET = 'your_client_secret_here';

// Initialize Pinterest auth on service worker startup
PinterestAuth.initializeConfig(PINTEREST_CLIENT_ID, PINTEREST_CLIENT_SECRET);

// Update the handleAuthentication function
async function handleAuthentication() {
  try {
    console.log('Handling authentication request...');
    const tokens = await PinterestAuth.initiateAuth();
    return { authenticated: true, tokens };
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// Update the refreshAccessToken function
async function refreshAccessToken() {
  try {
    return await PinterestAuth.refreshAccessToken();
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}

// Add sign out handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ... existing message handlers ...
  
  if (request.action === 'signOut') {
    PinterestAuth.signOut()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
```

---

## Step 3.4: Create Configuration File

Create a separate file to store your Pinterest credentials securely.

**File: `config.js`** (Create in root directory)

```javascript
// Pinterest API Configuration
// IMPORTANT: Never commit this file to version control!

const CONFIG = {
  pinterest: {
    clientId: 'YOUR_PINTEREST_APP_ID',
    clientSecret: 'YOUR_PINTEREST_APP_SECRET'
  }
};

// Make available to background script
if (typeof self !== 'undefined') {
  self.CONFIG = CONFIG;
}
```

**Update `.gitignore`:**
```
config.js
.env
node_modules/
```

**Update `manifest.json`:**

Add `config.js` to the background scripts:

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

Actually, for Manifest V3, we need to use `importScripts()`. Update `background.js`:

```javascript
// At the top of background.js
importScripts('config.js');
importScripts('utils/storage.js');
importScripts('auth/pinterest-auth.js');

// Use config
PinterestAuth.initializeConfig(
  CONFIG.pinterest.clientId,
  CONFIG.pinterest.clientSecret
);
```

---

## Step 3.5: Update New Tab Page for Authentication

Update the new tab page to properly handle authentication.

**File: `newtab/newtab.html` (Add script import)**

```html
<!-- Add before newtab.js -->
<script src="../auth/pinterest-auth.js"></script>
```

**File: `newtab/newtab.js` (Update authentication handling)**

Update the `checkAuthentication` function:

```javascript
async function checkAuthentication() {
  try {
    const tokens = await StorageUtils.getTokens();
    
    if (!tokens) {
      return false;
    }
    
    const isValid = await StorageUtils.isTokenValid();
    
    if (!isValid) {
      // Try to refresh token
      try {
        await chrome.runtime.sendMessage({ action: 'refreshToken' });
        return true;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}
```

---

## Step 3.6: Create Settings Page

Create a settings page where users can manage authentication and preferences.

**File: `settings/settings.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pinterest Random Pins - Settings</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Settings</h1>
    </header>

    <main>
      <!-- Authentication Section -->
      <section class="settings-section">
        <h2>Authentication</h2>
        
        <div id="authStatus" class="status-card">
          <div class="status-indicator" id="statusIndicator"></div>
          <div class="status-text">
            <p id="statusText">Checking authentication...</p>
            <p id="statusDetails" class="details"></p>
          </div>
        </div>

        <div class="button-group">
          <button id="connectBtn" class="primary-btn" style="display: none;">
            Connect Pinterest
          </button>
          <button id="disconnectBtn" class="secondary-btn" style="display: none;">
            Disconnect
          </button>
        </div>
      </section>

      <!-- Board Selection (will be implemented in Phase 4) -->
      <section class="settings-section">
        <h2>Board Selection</h2>
        <p class="section-description">Select which boards to display pins from</p>
        
        <div id="boardsList" class="boards-list">
          <p class="placeholder">Connect to Pinterest to see your boards</p>
        </div>
      </section>

      <!-- Display Preferences -->
      <section class="settings-section">
        <h2>Display Preferences</h2>
        
        <div class="setting-item">
          <label for="pinsCount">Number of pins to display</label>
          <input type="range" id="pinsCount" min="6" max="24" step="6" value="12">
          <span id="pinsCountValue">12</span>
        </div>

        <div class="setting-item">
          <label for="refreshInterval">Refresh interval</label>
          <select id="refreshInterval">
            <option value="hourly">Every hour</option>
            <option value="daily" selected>Daily</option>
            <option value="weekly">Weekly</option>
            <option value="manual">Manual only</option>
          </select>
        </div>
      </section>

      <!-- Cache Management -->
      <section class="settings-section">
        <h2>Cache Management</h2>
        
        <div class="button-group">
          <button id="clearCacheBtn" class="secondary-btn">
            Clear Cached Pins
          </button>
        </div>
        
        <p class="help-text">
          Clearing cache will force fresh pins to be loaded on next refresh
        </p>
      </section>
    </main>
  </div>

  <script src="../utils/storage.js"></script>
  <script src="../auth/pinterest-auth.js"></script>
  <script src="settings.js"></script>
</body>
</html>
```

**File: `settings/settings.css`**

```css
/* Settings Page Styles */

:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-card: #2a2a2a;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --accent-primary: #e60023;
  --accent-hover: #ff1744;
  --success: #00c853;
  --warning: #ffd600;
  --error: #ff1744;
  --border-color: #3a3a3a;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

header {
  margin-bottom: 3rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

h1 {
  font-size: 2rem;
  font-weight: 700;
}

h2 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
}

/* Settings Sections */
.settings-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.section-description {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

/* Status Card */
.status-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-secondary);
  flex-shrink: 0;
}

.status-indicator.connected {
  background: var(--success);
  box-shadow: 0 0 10px var(--success);
}

.status-indicator.disconnected {
  background: var(--error);
}

.status-text p {
  margin: 0;
}

.details {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.primary-btn,
.secondary-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: none;
}

.primary-btn {
  background: var(--accent-primary);
  color: white;
}

.primary-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.secondary-btn {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.secondary-btn:hover {
  background: var(--bg-primary);
  border-color: var(--text-secondary);
}

/* Setting Items */
.setting-item {
  margin-bottom: 1.5rem;
}

.setting-item label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.setting-item input[type="range"] {
  width: 100%;
  margin-right: 1rem;
}

.setting-item select {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
}

/* Boards List */
.boards-list {
  display: grid;
  gap: 1rem;
}

.placeholder {
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
}

/* Help Text */
.help-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 1rem;
}
```

**File: `settings/settings.js`**

```javascript
// Settings Page Logic

// DOM Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const statusDetails = document.getElementById('statusDetails');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const pinsCount = document.getElementById('pinsCount');
const pinsCountValue = document.getElementById('pinsCountValue');
const refreshInterval = document.getElementById('refreshInterval');
const clearCacheBtn = document.getElementById('clearCacheBtn');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  await loadPreferences();
  setupEventListeners();
});

// Check authentication status
async function checkAuthStatus() {
  try {
    const tokens = await StorageUtils.getTokens();
    const isValid = await StorageUtils.isTokenValid();
    
    if (tokens && isValid) {
      showConnectedState();
    } else {
      showDisconnectedState();
    }
  } catch (error) {
    console.error('Auth status check error:', error);
    showDisconnectedState();
  }
}

function showConnectedState() {
  statusIndicator.classList.add('connected');
  statusText.textContent = 'Connected to Pinterest';
  statusDetails.textContent = 'Your private boards are accessible';
  connectBtn.style.display = 'none';
  disconnectBtn.style.display = 'block';
}

function showDisconnectedState() {
  statusIndicator.classList.remove('connected');
  statusIndicator.classList.add('disconnected');
  statusText.textContent = 'Not connected';
  statusDetails.textContent = 'Connect to access your private boards';
  connectBtn.style.display = 'block';
  disconnectBtn.style.display = 'none';
}

// Load user preferences
async function loadPreferences() {
  const prefs = await StorageUtils.getPreferences();
  pinsCount.value = prefs.pinsPerPage;
  pinsCountValue.textContent = prefs.pinsPerPage;
  refreshInterval.value = prefs.refreshInterval;
}

// Save preferences
async function savePreferences() {
  await StorageUtils.savePreferences({
    selectedBoards: (await StorageUtils.getPreferences()).selectedBoards,
    pinsPerPage: parseInt(pinsCount.value),
    refreshInterval: refreshInterval.value,
    theme: 'dark'
  });
}

// Event Listeners
function setupEventListeners() {
  connectBtn.addEventListener('click', async () => {
    try {
      connectBtn.disabled = true;
      connectBtn.textContent = 'Connecting...';
      
      const response = await chrome.runtime.sendMessage({ action: 'authenticate' });
      
      if (response.success) {
        await checkAuthStatus();
      } else {
        alert('Authentication failed: ' + response.error);
      }
    } catch (error) {
      alert('Authentication error: ' + error.message);
    } finally {
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect Pinterest';
    }
  });

  disconnectBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to disconnect from Pinterest?')) {
      try {
        await chrome.runtime.sendMessage({ action: 'signOut' });
        await checkAuthStatus();
      } catch (error) {
        alert('Sign out error: ' + error.message);
      }
    }
  });

  pinsCount.addEventListener('input', () => {
    pinsCountValue.textContent = pinsCount.value;
  });

  pinsCount.addEventListener('change', savePreferences);
  refreshInterval.addEventListener('change', savePreferences);

  clearCacheBtn.addEventListener('click', async () => {
    try {
      await StorageUtils.clearPinCache();
      alert('Cache cleared successfully');
    } catch (error) {
      alert('Error clearing cache: ' + error.message);
    }
  });
}
```

---

## Step 3.7: Test Authentication Flow

### Testing Steps:

1. **Reload Extension**
   - Go to `brave://extensions/`
   - Click reload icon on your extension

2. **Open Settings**
   - Click extension icon in toolbar
   - Or right-click extension → Options

3. **Test Connection**
   - Click "Connect Pinterest"
   - Should open Pinterest OAuth page
   - Log in with your Pinterest account
   - Authorize the app
   - Should redirect back and show "Connected"

4. **Verify Token Storage**
   - Open DevTools (F12)
   - Go to Application → Storage → Extension Storage
   - Should see `authTokens` with access and refresh tokens

5. **Test New Tab**
   - Open new tab
   - Should no longer show "Connect to Pinterest"
   - Should show loading state (pins not implemented yet)

---

## Verification Checklist

- [ ] Pinterest app redirect URI updated with extension ID
- [ ] `auth/pinterest-auth.js` created
- [ ] `background.js` updated with auth handlers
- [ ] `config.js` created with Pinterest credentials
- [ ] `settings/settings.html` created
- [ ] `settings/settings.css` created
- [ ] `settings/settings.js` created
- [ ] OAuth flow completes successfully
- [ ] Tokens are saved to storage
- [ ] Settings page shows connected status
- [ ] New tab page recognizes authentication

---

## Next Steps

Proceed to **Phase 4: Board Selection & Data Fetching** to implement Pinterest API calls and fetch pins from selected boards.

---

## Troubleshooting

### Issue: OAuth popup doesn't open
- **Check**: Extension has `identity` permission in manifest
- **Check**: Pinterest app redirect URI matches extension ID exactly

### Issue: "Redirect URI mismatch" error
- **Check**: Extension ID in Pinterest app settings
- **Check**: Format is `https://EXTENSION_ID.chromiumapp.org/` (with trailing slash)

### Issue: Token exchange fails
- **Check**: Client ID and secret are correct in config.js
- **Check**: Network tab for error details
- **Check**: Pinterest app has correct scopes enabled

### Issue: "Invalid scope" error
- **Solution**: Your Pinterest app may not have elevated access approved yet
- **Workaround**: Remove `boards:read_secret` and `pins:read_secret` temporarily

### Issue: Tokens not saving
- **Check**: Browser console for storage errors
- **Check**: `utils/storage.js` is loaded before auth module
