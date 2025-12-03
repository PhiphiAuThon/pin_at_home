# Phase 4B: Board Selection via HTML Parsing (Alternative Approach)

## Overview
This is an alternative implementation for Phase 4 that uses HTML parsing instead of JSON extraction. Pinterest no longer includes board data in the `__PWS_DATA__` JSON blob, so we need to parse the rendered HTML directly.

---

## Key Differences from Phase 4

1. **No `__PWS_DATA__` for boards**: Pinterest only includes basic context data (username, experiments) in the JSON blob
2. **Board data is in the HTML DOM**: The actual board information is rendered as HTML elements
3. **Regex-based parsing**: Since we're in a service worker without DOM access, we use regex to extract data
4. **More fragile but functional**: This approach works but may break if Pinterest changes their HTML structure

---

## Step 4B.1: Update Pinterest Scraper for HTML Parsing

**File: `api/pinterest-scraper.js`**

Replace the existing implementation with this HTML-parsing version:

```javascript
// Pinterest HTML Scraper
// Extracts board data from rendered HTML using regex patterns

const PINTEREST_URL = 'https://www.pinterest.com';

// Import storage utilities
import { StorageUtils } from '../utils/storage.js';

/**
 * Fetch HTML from Pinterest
 * @param {string} path - URL path (e.g., '/username/_boards/')
 * @returns {Promise<string>} Raw HTML
 */
async function fetchHtml(path) {
  try {
    const url = `${PINTEREST_URL}${path}`;
    console.log(`Fetching ${url}...`);
    
    const response = await fetch(url, {
      credentials: 'include', // Important: include cookies for authentication
      headers: {
        'Accept': 'text/html',
        'User-Agent': navigator.userAgent
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }
    
    return await response.text();
    
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Extract username from __PWS_DATA__ (this still works for basic context)
 * @param {string} html - Raw HTML
 * @returns {string|null} Username
 */
function extractUsername(html) {
  try {
    // Find the __PWS_DATA__ script tag
    const regex = /<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
    const match = html.match(regex);
    
    if (!match || !match[1]) {
      return null;
    }
    
    const data = JSON.parse(match[1]);
    return data?.context?.user?.username || null;
    
  } catch (error) {
    console.error('Failed to extract username:', error);
    return null;
  }
}

// ============================================
// Board Extraction from HTML
// ============================================

/**
 * Extract boards from HTML using regex patterns
 * @param {string} html - Raw HTML from boards page
 * @returns {Array} List of board objects
 */
function extractBoardsFromHtml(html) {
  const boards = [];
  
  // Pattern 1: Find all board containers
  // Look for: data-test-id="board-{BoardName}"
  const boardPattern = /data-test-id="board-([^"]+)"/g;
  let match;
  
  while ((match = boardPattern.exec(html)) !== null) {
    const boardName = match[1];
    const startIndex = match.index;
    
    // Extract a chunk of HTML around this board (next ~2000 characters)
    const chunk = html.substring(startIndex, startIndex + 2000);
    
    // Extract board URL
    const urlMatch = chunk.match(/href="(\/[^/]+\/[^/]+\/)"/);
    const boardUrl = urlMatch ? urlMatch[1] : null;
    
    // Extract pin count
    const pinMatch = chunk.match(/(\d+)\s*Pins?/);
    const pinCount = pinMatch ? parseInt(pinMatch[1], 10) : 0;
    
    // Check if it's a secret board
    const isSecret = chunk.includes('Secret board icon');
    
    // Extract cover image URL (optional)
    const imageMatch = chunk.match(/src="(https:\/\/i\.pinimg\.com\/[^"]+)"/);
    const imageUrl = imageMatch ? imageMatch[1] : null;
    
    // Only add if we have at least a name and URL
    if (boardName && boardUrl) {
      // Generate a simple ID from the URL
      const slug = boardUrl.split('/').filter(Boolean).pop();
      
      boards.push({
        id: slug || boardName.toLowerCase().replace(/\s+/g, '-'),
        name: boardName,
        url: boardUrl,
        privacy: isSecret ? 'secret' : 'public',
        imageUrl: imageUrl,
        pinCount: pinCount
      });
      
      console.log(`✅ Found board: "${boardName}" (${pinCount} pins)`);
    }
  }
  
  // Deduplicate by URL (in case we caught duplicates)
  const uniqueBoards = Array.from(
    new Map(boards.map(b => [b.url, b])).values()
  );
  
  console.log(`📋 Total unique boards found: ${uniqueBoards.length}`);
  
  return uniqueBoards;
}

// ============================================
// Main Board Fetching Function
// ============================================

/**
 * Fetch the authenticated user's boards
 * @returns {Promise<Array>} List of boards
 */
async function fetchUserBoards() {
  try {
    // Step 1: Get the homepage to extract username
    console.log('🔍 Fetching homepage to get username...');
    const homeHtml = await fetchHtml('/');
    const username = extractUsername(homeHtml);
    
    if (!username) {
      throw new Error('Could not find logged-in user. Are you logged in to Pinterest?');
    }
    
    console.log(`✅ Found user: ${username}`);
    
    // Step 2: Fetch the boards page
    console.log(`🔍 Fetching boards for ${username}...`);
    const boardsHtml = await fetchHtml(`/${username}/_boards/`);
    
    // Step 3: Extract boards from HTML
    const boards = extractBoardsFromHtml(boardsHtml);
    
    if (boards.length === 0) {
      throw new Error('No boards found. Make sure you have at least one board on Pinterest.');
    }
    
    console.log(`✅ Successfully fetched ${boards.length} boards`);
    
    // Step 4: Cache the boards
    await StorageUtils.cacheBoards(boards);
    
    return boards;
    
  } catch (error) {
    console.error('❌ Fetch boards error:', error);
    throw error;
  }
}

// ============================================
// Pin Fetching (Simplified for now)
// ============================================

/**
 * Fetch random pins from specified boards
 * @param {Array<string>} boardUrls - Array of board URLs
 * @param {number} count - Number of pins to fetch
 * @returns {Promise<Array>} List of pins
 */
async function fetchRandomPins(boardUrls, count = 50) {
  try {
    console.log(`Fetching pins from ${boardUrls.length} boards...`);
    
    // For now, return a simple message
    // We'll implement proper pin fetching in the next phase
    console.warn('Pin fetching from HTML not yet implemented');
    
    return [];
    
  } catch (error) {
    console.error('Fetch pins error:', error);
    throw error;
  }
}

// ============================================
// Export
// ============================================

export const PinterestScraper = {
  fetchUserBoards,
  fetchRandomPins
};

console.log('✅ PinterestScraper (HTML parsing version) loaded');
```

---

## Step 4B.2: Update Background Script

The background script remains the same as in Phase 4 - no changes needed!

**File: `background.js`** (already updated in Phase 4)

---

## Step 4B.3: Update Settings Page

The settings page also remains the same - no changes needed!

**File: `settings/settings.js`** (already updated in Phase 4)

---

## Testing the HTML Parsing Approach

### Test 1: Verify Board Fetching

1. Open the extension's **Settings** page
2. Click **"Refresh Boards"**
3. Check the **Service Worker console** for:
   ```
   ✅ Found user: YourUsername
   ✅ Found board: "Board Name 1" (X pins)
   ✅ Found board: "Board Name 2" (Y pins)
   📋 Total unique boards found: N
   ```

### Test 2: Verify Board Display

1. The boards should appear in the settings page
2. Each board should show:
   - Board name
   - Pin count
   - Privacy status (lock icon for secret boards)

### Test 3: Verify Caching

1. Refresh the boards
2. Close and reopen the settings page
3. Boards should load from cache instantly

---

## Known Limitations

### 1. **Fragile to HTML Changes**
- If Pinterest changes their HTML structure, the regex patterns may break
- We'll need to update the patterns if this happens

### 2. **No Pin Fetching Yet**
- This implementation only fetches boards
- Pin fetching from HTML is more complex and will be implemented in Phase 5

### 3. **Performance**
- Parsing HTML with regex is slower than JSON parsing
- But it's still fast enough for our use case (< 1 second)

### 4. **Limited Data**
- We can only extract data that's visible in the HTML
- Some metadata (like board ID, creation date) may not be available

---

## Troubleshooting

### Issue: "Could not find logged-in user"

**Cause**: Not logged in to Pinterest or cookies not being sent

**Solution**:
1. Make sure you're logged in to Pinterest in the same browser
2. Check that the extension has permission to access Pinterest cookies
3. Try opening `pinterest.com` in a new tab first, then retry

### Issue: "No boards found"

**Cause**: The HTML structure has changed or regex patterns don't match

**Solution**:
1. Open DevTools on the boards page
2. Inspect the HTML structure of a board card
3. Update the regex patterns in `extractBoardsFromHtml()`

### Issue: Duplicate boards

**Cause**: The regex is matching multiple instances of the same board

**Solution**: The deduplication logic should handle this, but if you see duplicates:
1. Check the console logs to see which boards are being found
2. Adjust the chunk size or regex patterns

---

## Next Steps

Once board fetching is working:

1. **Phase 5**: Implement pin fetching from boards (HTML parsing approach)
2. **Phase 6**: Build the new tab UI to display pins
3. **Phase 7**: Add filtering and randomization logic

---

## Comparison: HTML Parsing vs API Approach

| Aspect | HTML Parsing (This Doc) | API Approach |
|--------|------------------------|--------------|
| **Reliability** | ⚠️ Fragile to HTML changes | ✅ More stable |
| **Speed** | ⚠️ Slower (parse HTML) | ✅ Faster (JSON) |
| **Data Quality** | ⚠️ Limited to visible data | ✅ Full metadata |
| **Complexity** | ⚠️ Complex regex patterns | ✅ Simple JSON parsing |
| **Authentication** | ✅ Uses browser cookies | ✅ Uses browser cookies |
| **Maintenance** | ⚠️ May need frequent updates | ✅ Less maintenance |

**Recommendation**: If the HTML parsing approach becomes too unreliable, we should switch to using Pinterest's internal API endpoints (which we can discover from the Network tab).
