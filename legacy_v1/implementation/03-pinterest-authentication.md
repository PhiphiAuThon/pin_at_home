# Phase 3: Session Management

## Overview
Instead of using the official API (which requires approval), we will piggyback on the user's active Pinterest session. This means if the user is logged into Pinterest in their browser, our extension works automatically.

---

## Step 3.1: Create Session Manager

This module checks if the user is currently logged into Pinterest.

**File: `auth/session-manager.js`**

```javascript
// Pinterest Session Management Module

const PINTEREST_DOMAIN = 'https://www.pinterest.com';

/**
 * Check if the user has an active Pinterest session
 * @returns {Promise<boolean>} True if logged in
 */
async function checkSession() {
  try {
    // Method 1: Check for the '_auth' cookie
    // This is the fastest method but requires 'cookies' permission
    const cookie = await chrome.cookies.get({
      url: PINTEREST_DOMAIN,
      name: '_auth'
    });

    if (cookie && cookie.value) {
      console.log('Found Pinterest auth cookie');
      return true;
    }

    // Method 2: Fallback - Try to fetch the homepage
    // If we are redirected to login, we aren't logged in
    console.log('Cookie not found, trying fetch fallback...');
    const response = await fetch(PINTEREST_DOMAIN, {
      method: 'HEAD', // Lightweight request
      redirect: 'manual' // Don't follow redirects automatically
    });

    // Pinterest usually redirects to /login/ if not authenticated
    // or returns 200 OK if authenticated
    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get('location');
    
    if (isRedirect && location && location.includes('login')) {
      return false;
    }

    return response.status === 200;

  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
}

/**
 * Open Pinterest login page in a new tab
 */
function openLogin() {
  chrome.tabs.create({
    url: `${PINTEREST_DOMAIN}/login/`
  });
}

/**
 * Open Pinterest logout page (and handle cleanup)
 */
async function logout() {
  // We can't really "log them out" easily without CSRF tokens,
  // but we can send them to the logout page
  chrome.tabs.create({
    url: `${PINTEREST_DOMAIN}/logout/`
  });
  
  // Clear our local cache
  if (self.StorageUtils) {
    await StorageUtils.clearAllCache();
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.SessionManager = {
    checkSession,
    openLogin,
    logout
  };
}

// For background script
if (typeof self !== 'undefined' && self.constructor.name === 'ServiceWorkerGlobalScope') {
  self.SessionManager = {
    checkSession,
    openLogin,
    logout
  };
}
```

---

## Step 3.2: Update Background Script

Update `background.js` to use this new session manager.

**File: `background.js`**

```javascript
// Import dependencies
importScripts('utils/storage.js');
importScripts('auth/session-manager.js');

// ... (Keep existing onInstalled listener) ...

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  switch (request.action) {
    case 'checkSession':
      SessionManager.checkSession()
        .then(isValid => sendResponse({ success: true, isAuthenticated: isValid }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'openLogin':
      SessionManager.openLogin();
      sendResponse({ success: true });
      return false;

    // ... (Keep other cases like fetchBoards/fetchPins for Phase 4) ...
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});
```

---

## Step 3.3: Update New Tab Page

Update the new tab page to check session status instead of OAuth tokens.

**File: `newtab/newtab.html`**

Replace the old auth script import:
```html
<!-- Remove pinterest-auth.js -->
<script src="../auth/session-manager.js"></script>
```

**File: `newtab/newtab.js`**

Update the `checkAuthentication` function and event listeners:

```javascript
// Updated checkAuthentication
async function checkAuthentication() {
  try {
    // Ask background script to check session
    // (We do this via background to ensure we have correct cookie access context)
    const response = await chrome.runtime.sendMessage({ action: 'checkSession' });
    return response.success && response.isAuthenticated;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// Update Auth Button Listener
authBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'openLogin' });
});
```

---

## Step 3.4: Update Settings Page

**File: `settings/settings.html`**

Replace `pinterest-auth.js` with `session-manager.js`.

**File: `settings/settings.js`**

Update the status check logic to use `SessionManager.checkSession()`.

---

## ✅ Verification Checklist

1.  **Load the Extension**: Reload the extension in `brave://extensions`.
2.  **Open New Tab**: Open a new tab.
3.  **Test "Not Logged In"**:
    *   Open Pinterest in another tab and log out.
    *   Refresh your new tab.
    *   It should show "Connect to Pinterest".
4.  **Test "Logged In"**:
    *   Click "Connect Pinterest" (should open login page).
    *   Log in to Pinterest.
    *   Refresh your new tab.
    *   It should (eventually) show the "Loading pins..." or "Found 0 pins" state (since we haven't implemented scraping yet).

## 🔍 Troubleshooting

*   **"Connect" button does nothing**: Check console for errors. Ensure `runtime.sendMessage` is working.
*   **Always says "Not Logged In"**:
    *   Check `manifest.json` has `cookies` and `https://www.pinterest.com/*` permissions.
    *   Verify you are actually logged in to `www.pinterest.com` (not a country specific domain like `fr.pinterest.com` - though the wildcard `*.pinterest.com` should handle that).
