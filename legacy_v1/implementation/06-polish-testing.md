# Phase 6: Polish & Testing

## Overview
Add final polish, comprehensive error handling, offline support, and thorough testing across all features.

---

## Step 6.1: Enhanced Error Handling

Add robust error handling throughout the extension.

**File: `utils/error-handler.js`** (New file)

```javascript
// Centralized Error Handling

const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  API: 'API_ERROR',
  STORAGE: 'STORAGE_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

class ExtensionError extends Error {
  constructor(type, message, originalError = null) {
    super(message);
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Handle and categorize errors
 */
function handleError(error, context = '') {
  console.error(`Error in ${context}:`, error);
  
  let errorType = ErrorTypes.UNKNOWN;
  let userMessage = 'An unexpected error occurred';
  
  // Categorize error
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    errorType = ErrorTypes.NETWORK;
    userMessage = 'Network error. Please check your internet connection.';
  } else if (error.message?.includes('auth') || error.message?.includes('session')) {
    errorType = ErrorTypes.AUTH;
    userMessage = 'Session expired. Please log in to Pinterest again.';
  } else if (error.message?.includes('scraping') || error.message?.includes('parse')) {
    errorType = ErrorTypes.API;
    userMessage = 'Could not load data from Pinterest. They might have changed their layout.';
  } else if (error.message?.includes('storage')) {
    errorType = ErrorTypes.STORAGE;
    userMessage = 'Storage error. Please check browser permissions.';
  }
  
  // Log to analytics (if implemented)
  logError(errorType, error.message, context);
  
  return new ExtensionError(errorType, userMessage, error);
}

/**
 * Log errors for debugging
 */
function logError(type, message, context) {
  const errorLog = {
    type,
    message,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  // Store recent errors for debugging
  chrome.storage.local.get('errorLog', (result) => {
    const log = result.errorLog || [];
    log.push(errorLog);
    
    // Keep only last 50 errors
    if (log.length > 50) {
      log.shift();
    }
    
    chrome.storage.local.set({ errorLog: log });
  });
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ErrorHandler = {
    ErrorTypes,
    ExtensionError,
    handleError,
    retryWithBackoff
  };
}

if (typeof self !== 'undefined') {
  self.ErrorHandler = {
    ErrorTypes,
    ExtensionError,
    handleError,
    retryWithBackoff
  };
}
```

---

## Step 6.2: Offline Support

Add offline detection and cached content display.

**Update `newtab/newtab.js`:**

Add these functions:

```javascript
// Offline detection
let isOnline = navigator.onLine;

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

// Check online status on load
if (!isOnline) {
  showOnlineStatus(false);
}
```

**Add to `newtab/newtab.css`:**

```css
/* Online Status Banner */
.online-status {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  text-align: center;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.online-status.offline {
  background: rgba(255, 152, 0, 0.9);
  color: white;
  backdrop-filter: blur(10px);
}

.online-status.online {
  background: rgba(76, 175, 80, 0.9);
  color: white;
}
```

---

## Step 6.3: Loading States & Skeletons

Add skeleton loading states for better UX.

**Add to `newtab/newtab.css`:**

```css
/* Skeleton Loading */
.skeleton-grid {
  column-count: 5;
  column-gap: var(--gap);
  padding: 1rem 0;
}

.skeleton-card {
  break-inside: avoid;
  margin-bottom: var(--gap);
  background: var(--bg-card);
  border-radius: 16px;
  overflow: hidden;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-image {
  width: 100%;
  height: 300px;
  background: linear-gradient(
    90deg,
    var(--bg-card) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    var(--bg-card) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  padding: 1rem;
}

.skeleton-line {
  height: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.skeleton-line.short {
  width: 60%;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@media (max-width: 1400px) {
  .skeleton-grid { column-count: 4; }
}

@media (max-width: 1200px) {
  .skeleton-grid { column-count: 3; }
}

@media (max-width: 900px) {
  .skeleton-grid { column-count: 2; }
}

@media (max-width: 600px) {
  .skeleton-grid { column-count: 1; }
}
```

**Update `newtab/newtab.js`:**

```javascript
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
}

// Update loadPins function
async function loadPins() {
  showLoadingSkeletons(); // Instead of showState('loading')
  
  try {
    // ... rest of the function
  } catch (error) {
    console.error('Load pins error:', error);
    showError(error.message);
  }
}

// Update displayPins to restore proper class
function displayPins(pins) {
  if (!pins || pins.length === 0) {
    showEmptyState();
    return;
  }
  
  pinsGrid.className = 'pins-grid'; // Restore proper class
  pinsGrid.innerHTML = '';
  
  // ... rest of the function
}
```

---

## Step 6.4: User Preferences Enhancement

Add more customization options.

**Update `settings/settings.html`:**

Add theme selection:

```html
<section class="settings-section">
  <h2>Appearance</h2>
  
  <div class="setting-item">
    <label for="theme">Theme</label>
    <select id="theme">
      <option value="dark">Dark</option>
      <option value="light">Light</option>
      <option value="auto">Auto (System)</option>
    </select>
  </div>
  
  <div class="setting-item">
    <label for="columnCount">Grid Columns</label>
    <select id="columnCount">
      <option value="auto">Auto</option>
      <option value="3">3 columns</option>
      <option value="4">4 columns</option>
      <option value="5">5 columns</option>
      <option value="6">6 columns</option>
    </select>
  </div>
</section>
```

**Update `settings/settings.js`:**

```javascript
const theme = document.getElementById('theme');
const columnCount = document.getElementById('columnCount');

async function loadPreferences() {
  const prefs = await StorageUtils.getPreferences();
  pinsCount.value = prefs.pinsPerPage || 12;
  pinsCountValue.textContent = prefs.pinsPerPage || 12;
  refreshInterval.value = prefs.refreshInterval || 'daily';
  theme.value = prefs.theme || 'dark';
  columnCount.value = prefs.columnCount || 'auto';
}

async function savePreferences() {
  await StorageUtils.savePreferences({
    selectedBoards: (await StorageUtils.getPreferences()).selectedBoards,
    pinsPerPage: parseInt(pinsCount.value),
    refreshInterval: refreshInterval.value,
    theme: theme.value,
    columnCount: columnCount.value
  });
}

// Add listeners
theme.addEventListener('change', savePreferences);
columnCount.addEventListener('change', savePreferences);
```

---

## Step 6.5: Analytics & Usage Tracking (Optional)

Track basic usage for debugging (privacy-friendly, local only).

**File: `utils/analytics.js`** (New file)

```javascript
// Privacy-friendly local analytics

async function trackEvent(eventName, data = {}) {
  const event = {
    name: eventName,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  // Store locally only
  const result = await chrome.storage.local.get('analytics');
  const analytics = result.analytics || [];
  
  analytics.push(event);
  
  // Keep only last 100 events
  if (analytics.length > 100) {
    analytics.shift();
  }
  
  await chrome.storage.local.set({ analytics });
}

async function getAnalytics() {
  const result = await chrome.storage.local.get('analytics');
  return result.analytics || [];
}

async function clearAnalytics() {
  await chrome.storage.local.remove('analytics');
}

// Export
if (typeof window !== 'undefined') {
  window.Analytics = {
    trackEvent,
    getAnalytics,
    clearAnalytics
  };
}
```

**Usage in newtab.js:**

```javascript
// Track when pins are loaded
Analytics.trackEvent('pins_loaded', {
  count: pins.length,
  source: 'cache' // or 'api'
});

// Track when user opens a pin
Analytics.trackEvent('pin_opened', {
  pinId: pin.id,
  hasLink: !!pin.link
});
```

---

## Step 6.6: Comprehensive Testing Checklist

### Functional Testing

**Authentication:**
- [ ] Session check works correctly
- [ ] "Connect" button opens Pinterest login
- [ ] Extension detects when user logs in
- [ ] Extension detects when user logs out

**Board Selection:**
- [ ] All boards load (including private)
- [ ] Board selection persists
- [ ] Multiple boards can be selected
- [ ] Deselecting boards works
- [ ] Board cache works

**Pin Fetching:**
- [ ] Pins load from selected boards
- [ ] Random selection works
- [ ] Cache works correctly
- [ ] Fresh fetch works
- [ ] Handles boards with no pins

**Display:**
- [ ] Masonry layout displays correctly
- [ ] Images load properly
- [ ] Lazy loading works
- [ ] Hover effects work
- [ ] Click to open works
- [ ] Overlay buttons work

**Settings:**
- [ ] All settings save correctly
- [ ] Settings persist across sessions
- [ ] Changing settings updates display
- [ ] Clear cache works

### Error Handling

- [ ] Network errors show appropriate message
- [ ] Scraping errors are handled gracefully
- [ ] Missing permissions handled
- [ ] Invalid session triggers re-login prompt
- [ ] Empty states display correctly

### Performance

- [ ] Page loads quickly (<2s)
- [ ] Images load progressively
- [ ] No memory leaks
- [ ] Smooth animations (60fps)
- [ ] Works with 100+ pins

### Browser Compatibility

- [ ] Works in Brave browser
- [ ] Works in Chrome
- [ ] Works in Edge
- [ ] Responsive on different screen sizes
- [ ] Works with different zoom levels

### Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] Alt text on images
- [ ] ARIA labels present

### Edge Cases

- [ ] Works with no internet (offline mode)
- [ ] Works with no boards selected
- [ ] Works with boards that have no pins
- [ ] Handles very long pin titles
- [ ] Handles missing images
- [ ] Handles Pinterest layout changes (scraping fails)

---

## Step 6.7: Performance Optimization

**Optimize Image Loading:**

Update `newtab/newtab.js`:

```javascript
// Use Intersection Observer for better lazy loading
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

// In createPinCard, use data-src instead of src
img.dataset.src = pin.imageUrl;
imageObserver.observe(img);
```

**Debounce Refresh:**

```javascript
// Prevent rapid refresh clicks
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
```

---

## Step 6.8: Debug Panel (Development Only)

**File: `debug/debug-panel.html`** (New file)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Debug Panel</title>
  <style>
    body {
      font-family: monospace;
      background: #1a1a1a;
      color: #fff;
      padding: 2rem;
    }
    .section {
      background: #2a2a2a;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
    }
    button {
      background: #e60023;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 0.5rem;
    }
    pre {
      background: #0a0a0a;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>Pinterest Extension Debug Panel</h1>
  
  <div class="section">
    <h2>Storage</h2>
    <button onclick="viewStorage()">View All Storage</button>
    <button onclick="clearAllStorage()">Clear All Storage</button>
    <pre id="storageOutput"></pre>
  </div>
  
  <div class="section">
    <h2>Error Log</h2>
    <button onclick="viewErrors()">View Errors</button>
    <button onclick="clearErrors()">Clear Errors</button>
    <pre id="errorOutput"></pre>
  </div>
  
  <div class="section">
    <h2>Analytics</h2>
    <button onclick="viewAnalytics()">View Analytics</button>
    <button onclick="clearAnalytics()">Clear Analytics</button>
    <pre id="analyticsOutput"></pre>
  </div>
  
  <script src="debug-panel.js"></script>
</body>
</html>
```

**File: `debug/debug-panel.js`**

```javascript
async function viewStorage() {
  const storage = await chrome.storage.local.get(null);
  document.getElementById('storageOutput').textContent = JSON.stringify(storage, null, 2);
}

async function clearAllStorage() {
  if (confirm('Clear all storage? This will sign you out.')) {
    await chrome.storage.local.clear();
    alert('Storage cleared');
    viewStorage();
  }
}

async function viewErrors() {
  const result = await chrome.storage.local.get('errorLog');
  document.getElementById('errorOutput').textContent = JSON.stringify(result.errorLog || [], null, 2);
}

async function clearErrors() {
  await chrome.storage.local.remove('errorLog');
  alert('Errors cleared');
  viewErrors();
}

async function viewAnalytics() {
  const result = await chrome.storage.local.get('analytics');
  document.getElementById('analyticsOutput').textContent = JSON.stringify(result.analytics || [], null, 2);
}

async function clearAnalytics() {
  await chrome.storage.local.remove('analytics');
  alert('Analytics cleared');
  viewAnalytics();
}
```

---

## Verification Checklist

- [ ] Error handling implemented throughout
- [ ] Offline support works
- [ ] Loading skeletons display
- [ ] Additional preferences work
- [ ] All functional tests pass
- [ ] Performance is optimized
- [ ] No console errors or warnings
- [ ] Debug panel works (dev only)

---

## Next Steps

Proceed to **Phase 7: Documentation & Deployment** to create user documentation and package the extension for distribution.

---

## Troubleshooting

### Issue: Extension feels slow
- **Check**: Number of pins being loaded
- **Check**: Image sizes (Pinterest should provide optimized sizes)
- **Solution**: Reduce pins per page
- **Solution**: Implement virtual scrolling

### Issue: Memory usage high
- **Check**: Image caching
- **Check**: Number of cached pins
- **Solution**: Limit cache size
- **Solution**: Clear old cache entries

### Issue: Animations stuttering
- **Check**: Too many animations at once
- **Solution**: Reduce animation complexity
- **Solution**: Use CSS transforms instead of position changes
