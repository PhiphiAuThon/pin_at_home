# Phase 4: Board Selection & Data Fetching

## Overview
Implement Pinterest API client to fetch boards and pins, create board selection interface, and implement caching strategy.

---

## Step 4.1: Create Pinterest API Client

This module handles all Pinterest API v5 requests.

**File: `api/pinterest-client.js`**

```javascript
// Pinterest API v5 Client

const PINTEREST_API = {
  baseUrl: 'https://api.pinterest.com/v5',
  endpoints: {
    boards: '/boards',
    boardPins: (boardId) => `/boards/${boardId}/pins`,
    pin: (pinId) => `/pins/${pinId}`
  }
};

// ============================================
// API Request Helper
// ============================================

/**
 * Make authenticated request to Pinterest API
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
async function makeApiRequest(endpoint, options = {}) {
  try {
    // Get valid access token (will refresh if needed)
    const accessToken = await PinterestAuth.getValidToken();
    
    const url = `${PINTEREST_API.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API request failed: ${response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// ============================================
// Fetch User Boards
// ============================================

/**
 * Fetch all boards for the authenticated user
 * Includes private/secret boards if proper scopes are granted
 * @returns {Promise<Array>} Array of board objects
 */
async function fetchUserBoards() {
  try {
    console.log('Fetching user boards...');
    
    const boards = [];
    let cursor = null;
    
    // Pinterest API uses cursor-based pagination
    do {
      const params = new URLSearchParams({
        page_size: '100' // Max allowed
      });
      
      if (cursor) {
        params.append('bookmark', cursor);
      }
      
      const response = await makeApiRequest(
        `${PINTEREST_API.endpoints.boards}?${params.toString()}`
      );
      
      if (response.items && response.items.length > 0) {
        boards.push(...response.items);
      }
      
      cursor = response.bookmark;
      
    } while (cursor);
    
    console.log(`Fetched ${boards.length} boards`);
    
    // Transform to our format
    const transformedBoards = boards.map(board => ({
      id: board.id,
      name: board.name,
      description: board.description || '',
      pinCount: board.pin_count || 0,
      privacy: board.privacy || 'public',
      imageUrl: board.image_thumbnail_url || null,
      createdAt: board.created_at
    }));
    
    // Cache boards
    await StorageUtils.cacheBoards(transformedBoards);
    
    return transformedBoards;
    
  } catch (error) {
    console.error('Fetch boards error:', error);
    throw error;
  }
}

// ============================================
// Fetch Board Pins
// ============================================

/**
 * Fetch pins from a specific board
 * @param {string} boardId - Pinterest board ID
 * @param {number} limit - Maximum number of pins to fetch
 * @returns {Promise<Array>} Array of pin objects
 */
async function fetchBoardPins(boardId, limit = 100) {
  try {
    console.log(`Fetching pins from board ${boardId}...`);
    
    const pins = [];
    let cursor = null;
    
    do {
      const params = new URLSearchParams({
        page_size: Math.min(limit - pins.length, 100).toString()
      });
      
      if (cursor) {
        params.append('bookmark', cursor);
      }
      
      const response = await makeApiRequest(
        `${PINTEREST_API.endpoints.boardPins(boardId)}?${params.toString()}`
      );
      
      if (response.items && response.items.length > 0) {
        pins.push(...response.items);
      }
      
      cursor = response.bookmark;
      
      // Stop if we've reached the limit
      if (pins.length >= limit) {
        break;
      }
      
      // Stop if no more pages
      if (!cursor) {
        break;
      }
      
    } while (true);
    
    console.log(`Fetched ${pins.length} pins from board ${boardId}`);
    
    // Transform to our format
    return pins.map(pin => transformPin(pin));
    
  } catch (error) {
    console.error(`Fetch board pins error for board ${boardId}:`, error);
    throw error;
  }
}

// ============================================
// Fetch Multiple Boards' Pins
// ============================================

/**
 * Fetch pins from multiple boards
 * @param {Array<string>} boardIds - Array of board IDs
 * @param {number} pinsPerBoard - Pins to fetch per board
 * @returns {Promise<Array>} Combined array of pins
 */
async function fetchPinsFromBoards(boardIds, pinsPerBoard = 50) {
  try {
    console.log(`Fetching pins from ${boardIds.length} boards...`);
    
    if (!boardIds || boardIds.length === 0) {
      throw new Error('No boards selected');
    }
    
    // Fetch pins from all boards in parallel
    const promises = boardIds.map(boardId => 
      fetchBoardPins(boardId, pinsPerBoard)
    );
    
    const results = await Promise.allSettled(promises);
    
    // Combine all successful results
    const allPins = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allPins.push(...result.value);
      } else {
        console.error(`Failed to fetch pins from board ${boardIds[index]}:`, result.reason);
      }
    });
    
    console.log(`Total pins fetched: ${allPins.length}`);
    
    return allPins;
    
  } catch (error) {
    console.error('Fetch pins from boards error:', error);
    throw error;
  }
}

// ============================================
// Fetch Random Pins
// ============================================

/**
 * Fetch random pins from selected boards
 * @param {Array<string>} boardIds - Board IDs to fetch from
 * @param {number} count - Number of random pins to return
 * @returns {Promise<Array>} Array of random pins
 */
async function fetchRandomPins(boardIds, count = 12) {
  try {
    console.log(`Fetching ${count} random pins from ${boardIds.length} boards...`);
    
    // Fetch more pins than needed to have a good selection
    const pinsPerBoard = Math.ceil(count / boardIds.length) * 2;
    
    const allPins = await fetchPinsFromBoards(boardIds, pinsPerBoard);
    
    if (allPins.length === 0) {
      throw new Error('No pins found in selected boards');
    }
    
    // Select random pins
    const randomPins = selectRandomPins(allPins, count);
    
    // Cache the pins
    await StorageUtils.cachePins(randomPins);
    
    return randomPins;
    
  } catch (error) {
    console.error('Fetch random pins error:', error);
    throw error;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Transform Pinterest API pin object to our format
 */
function transformPin(pin) {
  // Get the best quality image available
  const imageUrl = pin.media?.images?.['originals']?.url ||
                   pin.media?.images?.['1200x']?.url ||
                   pin.media?.images?.['600x']?.url ||
                   null;
  
  return {
    id: pin.id,
    title: pin.title || '',
    description: pin.description || '',
    imageUrl: imageUrl,
    link: pin.link || null,
    boardId: pin.board_id,
    createdAt: pin.created_at,
    dominantColor: pin.dominant_color || null,
    altText: pin.alt_text || pin.title || 'Pinterest pin'
  };
}

/**
 * Select random pins from array without duplicates
 */
function selectRandomPins(pins, count) {
  if (pins.length <= count) {
    return pins;
  }
  
  const shuffled = [...pins].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================
// Rate Limiting Helper
// ============================================

/**
 * Simple rate limiter to avoid hitting Pinterest API limits
 */
class RateLimiter {
  constructor(maxRequests = 200, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  async checkLimit() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      console.warn(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return this.checkLimit();
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

// ============================================
// Export Functions
// ============================================

if (typeof window !== 'undefined') {
  window.PinterestAPI = {
    fetchUserBoards,
    fetchBoardPins,
    fetchPinsFromBoards,
    fetchRandomPins
  };
}

if (typeof self !== 'undefined' && self.constructor.name === 'ServiceWorkerGlobalScope') {
  self.PinterestAPI = {
    fetchUserBoards,
    fetchBoardPins,
    fetchPinsFromBoards,
    fetchRandomPins
  };
}
```

---

## Step 4.2: Update Background Service Worker

Update `background.js` to use the Pinterest API client.

**Add to `background.js`:**

```javascript
// Import API client
importScripts('api/pinterest-client.js');

// Update fetchUserBoards function
async function fetchUserBoards() {
  try {
    // Try cache first
    const cachedBoards = await StorageUtils.getCachedBoards();
    if (cachedBoards) {
      console.log('Returning cached boards');
      return cachedBoards;
    }
    
    // Fetch fresh boards
    return await PinterestAPI.fetchUserBoards();
  } catch (error) {
    console.error('Fetch boards error:', error);
    throw error;
  }
}

// Update fetchRandomPins function
async function fetchRandomPins(boardIds, count) {
  try {
    if (!boardIds || boardIds.length === 0) {
      throw new Error('No boards selected. Please select boards in settings.');
    }
    
    return await PinterestAPI.fetchRandomPins(boardIds, count);
  } catch (error) {
    console.error('Fetch random pins error:', error);
    throw error;
  }
}
```

---

## Step 4.3: Create Random Selector Utility

**File: `utils/random-selector.js`**

```javascript
// Random Pin Selection Utilities

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (new array)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Select random items from array
 * @param {Array} array - Source array
 * @param {number} count - Number of items to select
 * @returns {Array} Random selection
 */
function selectRandom(array, count) {
  if (array.length <= count) {
    return shuffleArray(array);
  }
  
  return shuffleArray(array).slice(0, count);
}

/**
 * Select random pins with weighted distribution across boards
 * Ensures pins are distributed evenly across selected boards
 * @param {Object} pinsByBoard - Object with boardId as key, pins array as value
 * @param {number} totalCount - Total number of pins to select
 * @returns {Array} Selected pins
 */
function selectWeightedRandom(pinsByBoard, totalCount) {
  const boardIds = Object.keys(pinsByBoard);
  const numBoards = boardIds.length;
  
  if (numBoards === 0) {
    return [];
  }
  
  // Calculate pins per board
  const pinsPerBoard = Math.floor(totalCount / numBoards);
  const remainder = totalCount % numBoards;
  
  const selectedPins = [];
  
  boardIds.forEach((boardId, index) => {
    const pins = pinsByBoard[boardId];
    
    // Add extra pin to first boards to account for remainder
    const count = pinsPerBoard + (index < remainder ? 1 : 0);
    
    const selected = selectRandom(pins, count);
    selectedPins.push(...selected);
  });
  
  // Final shuffle to mix boards
  return shuffleArray(selectedPins);
}

/**
 * Remove duplicates from pin array based on pin ID
 * @param {Array} pins - Array of pin objects
 * @returns {Array} Deduplicated pins
 */
function removeDuplicates(pins) {
  const seen = new Set();
  return pins.filter(pin => {
    if (seen.has(pin.id)) {
      return false;
    }
    seen.add(pin.id);
    return true;
  });
}

/**
 * Ensure variety by limiting pins from same board
 * @param {Array} pins - Array of pin objects
 * @param {number} maxPerBoard - Maximum pins per board
 * @returns {Array} Filtered pins
 */
function ensureVariety(pins, maxPerBoard = 5) {
  const boardCounts = new Map();
  
  return pins.filter(pin => {
    const count = boardCounts.get(pin.boardId) || 0;
    
    if (count >= maxPerBoard) {
      return false;
    }
    
    boardCounts.set(pin.boardId, count + 1);
    return true;
  });
}

// Export functions
if (typeof window !== 'undefined') {
  window.RandomSelector = {
    shuffleArray,
    selectRandom,
    selectWeightedRandom,
    removeDuplicates,
    ensureVariety
  };
}
```

---

## Step 4.4: Update Settings Page for Board Selection

Update the settings page to display and allow selection of boards.

**Update `settings/settings.html`:**

Replace the board selection section with:

```html
<section class="settings-section">
  <h2>Board Selection</h2>
  <p class="section-description">Select which boards to display pins from</p>
  
  <div id="boardsLoading" class="loading-state">
    <div class="spinner-small"></div>
    <p>Loading boards...</p>
  </div>
  
  <div id="boardsList" class="boards-list" style="display: none;">
    <!-- Boards will be inserted here -->
  </div>
  
  <button id="refreshBoardsBtn" class="secondary-btn" style="display: none;">
    Refresh Boards
  </button>
</section>
```

**Update `settings/settings.css`:**

Add these styles:

```css
/* Board Selection */
.boards-list {
  display: grid;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
}

.board-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition);
}

.board-item:hover {
  background: var(--bg-primary);
  border-color: var(--border-color);
}

.board-item.selected {
  border-color: var(--accent-primary);
  background: rgba(230, 0, 35, 0.1);
}

.board-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.board-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--bg-card);
}

.board-info {
  flex: 1;
}

.board-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.board-meta {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.board-privacy {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--bg-card);
  border-radius: 4px;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.board-privacy.secret {
  background: rgba(230, 0, 35, 0.2);
  color: var(--accent-primary);
}

/* Loading States */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  color: var(--text-secondary);
}

.spinner-small {
  width: 24px;
  height: 24px;
  border: 3px solid var(--bg-card);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

**Update `settings/settings.js`:**

Add these functions:

```javascript
// Board selection state
let userBoards = [];

// Load boards after authentication check
async function loadBoards() {
  const tokens = await StorageUtils.getTokens();
  if (!tokens) {
    return;
  }
  
  try {
    document.getElementById('boardsLoading').style.display = 'flex';
    document.getElementById('boardsList').style.display = 'none';
    
    const response = await chrome.runtime.sendMessage({ action: 'fetchBoards' });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    userBoards = response.data;
    displayBoards(userBoards);
    
    document.getElementById('boardsLoading').style.display = 'none';
    document.getElementById('boardsList').style.display = 'grid';
    document.getElementById('refreshBoardsBtn').style.display = 'block';
    
  } catch (error) {
    console.error('Load boards error:', error);
    document.getElementById('boardsLoading').innerHTML = `
      <p style="color: var(--error)">Failed to load boards: ${error.message}</p>
    `;
  }
}

// Display boards in the list
async function displayBoards(boards) {
  const boardsList = document.getElementById('boardsList');
  const prefs = await StorageUtils.getPreferences();
  const selectedBoards = prefs.selectedBoards || [];
  
  boardsList.innerHTML = boards.map(board => `
    <div class="board-item ${selectedBoards.includes(board.id) ? 'selected' : ''}" 
         data-board-id="${board.id}">
      <input type="checkbox" 
             class="board-checkbox" 
             id="board-${board.id}"
             ${selectedBoards.includes(board.id) ? 'checked' : ''}>
      
      ${board.imageUrl ? 
        `<img src="${board.imageUrl}" alt="${board.name}" class="board-thumbnail">` :
        `<div class="board-thumbnail"></div>`
      }
      
      <div class="board-info">
        <div class="board-name">${escapeHtml(board.name)}</div>
        <div class="board-meta">
          ${board.pinCount} pins
          ${board.privacy === 'secret' ? 
            '<span class="board-privacy secret">🔒 Private</span>' : 
            '<span class="board-privacy">Public</span>'
          }
        </div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.board-item').forEach(item => {
    item.addEventListener('click', handleBoardClick);
  });
}

// Handle board selection
async function handleBoardClick(event) {
  const boardItem = event.currentTarget;
  const checkbox = boardItem.querySelector('.board-checkbox');
  const boardId = boardItem.dataset.boardId;
  
  // Toggle checkbox if not clicked directly
  if (event.target !== checkbox) {
    checkbox.checked = !checkbox.checked;
  }
  
  // Update visual state
  boardItem.classList.toggle('selected', checkbox.checked);
  
  // Update preferences
  const prefs = await StorageUtils.getPreferences();
  let selectedBoards = prefs.selectedBoards || [];
  
  if (checkbox.checked) {
    if (!selectedBoards.includes(boardId)) {
      selectedBoards.push(boardId);
    }
  } else {
    selectedBoards = selectedBoards.filter(id => id !== boardId);
  }
  
  await StorageUtils.updatePreference('selectedBoards', selectedBoards);
  
  // Clear pin cache when boards change
  await StorageUtils.clearPinCache();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Update initialization
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  await loadPreferences();
  await loadBoards(); // Add this
  setupEventListeners();
});

// Add refresh boards button handler
document.getElementById('refreshBoardsBtn').addEventListener('click', async () => {
  // Clear cached boards
  await chrome.storage.local.remove('cachedBoards');
  await loadBoards();
});
```

---

## Step 4.5: Test Board Fetching

### Testing Steps:

1. **Reload Extension**
   - Go to `brave://extensions/`
   - Click reload

2. **Open Settings**
   - Click extension icon
   - Should be connected from Phase 3

3. **View Boards**
   - Should see loading spinner
   - Then list of all your boards (including private ones)
   - Each board shows thumbnail, name, pin count, privacy status

4. **Select Boards**
   - Click on boards to select them
   - Selected boards should highlight
   - Selection should persist after closing settings

5. **Verify Storage**
   - DevTools → Application → Extension Storage
   - Check `preferences.selectedBoards` array
   - Check `cachedBoards` array

---

## Verification Checklist

- [ ] `api/pinterest-client.js` created
- [ ] `utils/random-selector.js` created
- [ ] Background worker updated with API calls
- [ ] Settings page displays boards list
- [ ] Private boards are visible (if API approved)
- [ ] Board selection works and persists
- [ ] Cached boards load quickly on subsequent visits
- [ ] No console errors

---

## Next Steps

Proceed to **Phase 5: Display & UI** to create the beautiful pin display on the new tab page.

---

## Troubleshooting

### Issue: No boards showing
- **Check**: Authentication is successful
- **Check**: Browser console for API errors
- **Check**: Pinterest API scopes are approved

### Issue: Private boards not showing
- **Cause**: Elevated API access not yet approved
- **Solution**: Wait for Pinterest approval or test with public boards

### Issue: "No boards selected" error
- **Check**: At least one board is selected in settings
- **Check**: `preferences.selectedBoards` in storage

### Issue: API rate limit errors
- **Solution**: Implement longer cache times
- **Solution**: Reduce number of pins fetched per board

### Issue: Slow board loading
- **Check**: Number of boards (100+ boards takes longer)
- **Solution**: Pagination is already implemented
- **Solution**: Cache is working properly
