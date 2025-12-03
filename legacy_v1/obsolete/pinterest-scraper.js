// Pinterest HTML Scraper
// Extracts board data from rendered HTML using regex patterns

const PINTEREST_URL = 'https://www.pinterest.com';

// Note: StorageUtils is assumed to be loaded globally via importScripts in background.js

/**
 * Fetch HTML from Pinterest
 * @param {string} path - URL path (e.g., '/username/_boards/')
 * @returns {Promise<string>} Raw HTML
 */
async function fetchHtml(path) {
  try {
    const url = `${PINTEREST_URL}${path}`;
    console.log(`Fetching ${url}...`);
    
    // Add a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'include', // Important: include cookies for authentication
      headers: {
        'Accept': 'text/html',
        'User-Agent': navigator.userAgent
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }
    
    return await response.text();
    
  } catch (error) {
    console.error('Fetch error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Pinterest might be slow or blocking requests.');
    }
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
/**
 * Extract boards from HTML using regex patterns
 * @param {string} html - Raw HTML from boards page
 * @returns {Array} List of board objects
 */
function extractBoardsFromHtml(html) {
  const boards = [];
  
  // Strategy: Find all <a> tags that look like board links
  // They usually have href="/username/board-slug/"
  // We'll look for the href pattern and then grab the content around it
  
  // Regex to find <a ... href="/username/board-slug/" ...>
  // We capture the href value to identify the board
  const linkPattern = /<a[^>]+href="(\/[^/]+\/[^/]+\/)"[^>]*>/g;
  let match;
  
  while ((match = linkPattern.exec(html)) !== null) {
    const boardUrl = match[1];
    const startIndex = match.index;
    
    // Skip if it's a system link (like /_/_/ or /settings/)
    if (boardUrl.includes('/_/') || boardUrl.includes('/settings/') || boardUrl.includes('/edit/')) {
      continue;
    }

    // Extract a chunk of HTML *inside* this <a> tag and a bit after
    // We need to find the closing </a> to be safe, or just grab a chunk
    const chunk = html.substring(startIndex, startIndex + 3000);
    
    // 1. Extract Board Name
    // It's often in an <h2> or just text. 
    // Let's look for the <h2> first as it's most reliable for titles
    let nameMatch = chunk.match(/<h2[^>]*>([^<]+)<\/h2>/);
    let boardName = nameMatch ? nameMatch[1] : null;
    
    // Fallback: Look for title attribute in the <a> tag
    if (!boardName) {
      const titleAttrMatch = match[0].match(/title="([^"]+)"/);
      if (titleAttrMatch) boardName = titleAttrMatch[1];
    }

    // Fallback: Look for aria-label
    if (!boardName) {
      const ariaLabelMatch = match[0].match(/aria-label="([^"]+)"/);
      if (ariaLabelMatch) boardName = ariaLabelMatch[1];
    }
    
    // 2. Extract Pin Count
    // Look for numbers followed by "Pins" or "Épingles" (international support)
    // \d+ followed by space and P or É
    const pinMatch = chunk.match(/(\d+)[,\s.]*\d*\s*(Pins?|Épingles?|Pin)/i);
    // Handle "1,5 k" or "1.5k" formats if possible, but keep it simple for now
    // Just grabbing the first number sequence
    let pinCount = 0;
    if (pinMatch) {
       // Remove non-numeric chars except maybe dots/commas if we want to be fancy
       // For now, just parse the first digits found
       pinCount = parseInt(pinMatch[1].replace(/\D/g, ''), 10);
    }
    
    // 3. Check for Secret Board
    const isSecret = chunk.includes('Secret board') || chunk.includes('lock') || chunk.includes('Private');
    
    // 4. Extract Image URL
    const imageMatch = chunk.match(/src="(https:\/\/i\.pinimg\.com\/[^"]+)"/);
    const imageUrl = imageMatch ? imageMatch[1] : null;

    // Only add if we have a name (URL is guaranteed by the regex)
    if (boardName && boardUrl) {
      // Clean up board name (decode HTML entities if needed, though regex usually gets raw)
      boardName = boardName.trim();
      
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
  
  // Deduplicate by URL
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
    
    // DEBUG: Log the first 2000 chars of HTML to see what we got
    console.log('📄 RAW HTML RECEIVED (First 2000 chars):');
    console.log(boardsHtml.substring(0, 2000));
    
    // Step 3: Extract boards from HTML
    const boards = extractBoardsFromHtml(boardsHtml);
    
    if (boards.length === 0) {
      throw new Error('No boards found. Make sure you have at least one board on Pinterest.');
    }
    
    console.log(`✅ Successfully fetched ${boards.length} boards`);
    
    // Step 4: Cache the boards
    if (self.StorageUtils) {
      await StorageUtils.cacheBoards(boards);
    }
    
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
    console.warn('⚠️ Pin fetching from HTML not yet implemented');
    
    return [];
    
  } catch (error) {
    console.error('Fetch pins error:', error);
    throw error;
  }
}

// ============================================
// Export
// ============================================

const PinterestScraper = {
  fetchUserBoards,
  fetchRandomPins
};

// Make functions available globally for importScripts
if (typeof self !== 'undefined') {
  self.PinterestScraper = PinterestScraper;
}

console.log('✅ PinterestScraper (HTML parsing version) loaded');

