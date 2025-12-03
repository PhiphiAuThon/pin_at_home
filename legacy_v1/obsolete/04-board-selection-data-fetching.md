# Phase 4: Data Scraping & Board Selection

## Overview
Implement the "Session/Scraping" logic to fetch boards and pins directly from Pinterest's website using the user's active session.

---

## Step 4.1: Create Pinterest Scraper

This module handles fetching HTML and extracting data from Pinterest's internal JSON.

**File: `api/pinterest-scraper.js`**

```javascript
// Pinterest Web Scraper
// Extracts data from Pinterest's internal JSON blobs

const PINTEREST_URL = 'https://www.pinterest.com';

/**
 * Fetch and parse a Pinterest page
 * @param {string} path - URL path (e.g., '/username/boards/')
 * @returns {Promise<Object>} Extracted data
 */
async function fetchAndParse(path) {
  try {
    const url = `${PINTEREST_URL}${path}`;
    console.log(`Fetching ${url}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }
    
    const html = await response.text();
    return extractJsonFromHtml(html);
    
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  }
}

/**
 * Extract the __PWS_DATA__ JSON blob from Pinterest HTML
 * @param {string} html - Raw HTML
 * @returns {Object} Parsed JSON data
 */
function extractJsonFromHtml(html) {
  // Pinterest stores data in a script tag with id="__PWS_DATA__"
  const regex = /<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
  const match = html.match(regex);
  
  if (!match || !match[1]) {
    throw new Error('Could not find Pinterest data blob in HTML');
  }
  
  try {
    const jsonString = match[1];
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Failed to parse Pinterest JSON data');
  }
}

// ============================================
// Board Fetching
// ============================================

/**
 * Fetch the authenticated user's profile and boards
 * @returns {Promise<Array>} List of boards
 */
async function fetchUserBoards() {
  try {
    // 1. Fetch the main feed or profile to find the username
    // We can often find the username in the initial data of the home page
    const homeData = await fetchAndParse('/');
    
    // Extract username from the "viewer" object
    // Note: The structure of PWS_DATA changes, so we need to be defensive
    const viewer = homeData?.props?.initialReduxState?.viewer;
    
    if (!viewer || !viewer.username) {
      throw new Error('Could not find logged-in user. Are you logged in?');
    }
    
    const username = viewer.username;
    console.log(`Found user: ${username}`);
    
    // 2. Fetch the user's boards page
    // Pinterest usually loads boards at /username/_saved/ or /username/boards/
    const boardsData = await fetchAndParse(`/${username}/_saved/`);
    
    // 3. Extract boards from the response
    // We need to traverse the JSON to find the boards list
    // This is the tricky part as the structure is complex
    const boards = extractBoardsFromData(boardsData);
    
    console.log(`Found ${boards.length} boards`);
    
    // Cache the boards
    await StorageUtils.cacheBoards(boards);
    
    return boards;
    
  } catch (error) {
    console.error('Fetch boards error:', error);
    throw error;
  }
}

/**
 * Helper to find boards array in the complex Redux state
 */
function extractBoardsFromData(data) {
  const boards = [];
  
  // Helper to recursively search for objects that look like boards
  function searchForBoards(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if this object looks like a board
    if (obj.type === 'board' && obj.id && obj.url) {
      boards.push({
        id: obj.id,
        name: obj.name,
        url: obj.url,
        privacy: obj.privacy,
        imageUrl: obj.image_cover_url,
        pinCount: obj.pin_count
      });
    }
    
    // Recurse
    Object.values(obj).forEach(searchForBoards);
  }
  
  // Start search (limit depth if needed, but usually safe)
  searchForBoards(data);
  
  // Deduplicate by ID
  return Array.from(new Map(boards.map(b => [b.id, b])).values());
}

// ============================================
// Pin Fetching
// ============================================

/**
 * Fetch pins from specific boards
 * @param {Array<string>} boardUrls - List of board URLs (e.g. /username/boardname/)
 * @param {number} count - Approx number of pins to fetch
 */
async function fetchRandomPins(boardUrls, count = 12) {
  try {
    console.log(`Fetching pins from ${boardUrls.length} boards...`);
    
    const allPins = [];
    
    // Fetch from boards in parallel
    const promises = boardUrls.map(async (url) => {
      try {
        const data = await fetchAndParse(url);
        return extractPinsFromData(data);
      } catch (e) {
        console.warn(`Failed to fetch board ${url}`, e);
        return [];
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(pins => allPins.push(...pins));
    
    if (allPins.length === 0) {
      throw new Error('No pins found in selected boards');
    }
    
    // Shuffle and slice
    const randomPins = allPins
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
      
    await StorageUtils.cachePins(randomPins);
    return randomPins;
    
  } catch (error) {
    console.error('Fetch pins error:', error);
    throw error;
  }
}

/**
 * Helper to find pins in data
 */
function extractPinsFromData(data) {
  const pins = [];
  
  function searchForPins(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if object looks like a pin
    if (obj.type === 'pin' && obj.id && obj.images) {
      // Find best image
      const images = obj.images;
      const url = images.orig?.url || images['1200x']?.url || images['600x']?.url;
      
      if (url) {
        pins.push({
          id: obj.id,
          title: obj.title || obj.grid_title || '',
          description: obj.description || '',
          imageUrl: url,
          link: `https://www.pinterest.com/pin/${obj.id}/`,
          dominantColor: obj.dominant_color,
          boardId: obj.board?.id
        });
      }
    }
    
    Object.values(obj).forEach(searchForPins);
  }
  
  searchForPins(data);
  
  // Deduplicate
  return Array.from(new Map(pins.map(p => [p.id, p])).values());
}

// Export
if (typeof self !== 'undefined') {
  self.PinterestScraper = {
    fetchUserBoards,
    fetchRandomPins
  };
}
```

---

## Step 4.2: Update Background Script

Update `background.js` to use the scraper instead of the API client.

**File: `background.js`**

```javascript
importScripts('utils/storage.js');
importScripts('auth/session-manager.js');
importScripts('api/pinterest-scraper.js'); // Use scraper

// ...

// Update fetch handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ...
  
  if (request.action === 'fetchBoards') {
    PinterestScraper.fetchUserBoards()
      .then(boards => sendResponse({ success: true, data: boards }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'fetchPins') {
    // Note: We now pass board URLs, not just IDs, because fetching by URL is easier
    PinterestScraper.fetchRandomPins(request.boardUrls, request.count)
      .then(pins => sendResponse({ success: true, data: pins }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
```

---

## Step 4.3: Update Settings Page

Update `settings.js` to handle the new board data structure (which includes URLs).

**File: `settings/settings.js`**

When saving selected boards, we now need to save the `url` as well, or just save the whole board object.

```javascript
// ... inside handleBoardClick ...

// We need to store the board URL for the scraper to work
// So instead of just IDs, let's store the board objects or a map of ID -> URL
// For simplicity, let's just update 'selectedBoards' to be an array of objects: { id, url }
// OR, keep it simple: Just store the IDs in preferences, but look up the URL from cachedBoards when fetching.

// Let's stick to storing IDs in preferences for consistency.
// But when we request pins, we'll need to look up the URLs.
```

**File: `newtab/newtab.js`**

Update `loadPins` to resolve IDs to URLs:

```javascript
async function loadPins() {
  // ...
  
  // Get selected board IDs
  const prefs = await StorageUtils.getPreferences();
  const selectedIds = prefs.selectedBoards || [];
  
  // Get cached boards to find URLs
  const allBoards = await StorageUtils.getCachedBoards();
  
  if (!allBoards) {
    // If we have IDs but no board data, we can't fetch pins by URL
    // Trigger a board refresh
    await chrome.runtime.sendMessage({ action: 'fetchBoards' });
    return loadPins(); // Retry
  }
  
  // Filter to get URLs
  const selectedUrls = allBoards
    .filter(b => selectedIds.includes(b.id))
    .map(b => b.url);
    
  // Fetch pins
  const response = await chrome.runtime.sendMessage({
    action: 'fetchPins',
    boardUrls: selectedUrls,
    count: prefs.pinsPerPage
  });
  
  // ...
}
```

---

## ✅ Verification Checklist

1.  **Check Console**: Open the background page console (`brave://extensions` -> Inspect Service Worker).
2.  **Test Board Fetch**:
    *   Open Settings.
    *   Click "Refresh Boards" (if you added it) or just load the page.
    *   Check console logs: "Fetching https://www.pinterest.com/...".
    *   Verify it finds your username and boards.
3.  **Test Pin Fetch**:
    *   Select a board.
    *   Open a new tab.
    *   Check console logs: "Fetching pins from...".
    *   Verify it extracts JSON and finds images.

## ⚠️ Important Note on Scraping

Pinterest's HTML structure (`__PWS_DATA__`) changes occasionally. If this stops working:
1.  Open Pinterest in a normal tab.
2.  View Source.
3.  Search for `json` or `Redux`.
4.  See where the data is hidden now.
5.  Update `extractJsonFromHtml` logic.
