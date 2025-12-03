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
    const homeData = await fetchAndParse('/');
    
    console.log('DEBUG: Home data structure:', Object.keys(homeData));
    
    // Try multiple possible paths to find the username
    let username = null;
    
    // Path 1: context.user.username (NEW - Pinterest's current structure)
    if (homeData?.context?.user?.username) {
      username = homeData.context.user.username;
      console.log('DEBUG: Found username in context.user:', username);
    }
    
    // Path 2: props.initialReduxState.viewer (OLD structure)
    if (!username) {
      const viewer = homeData?.props?.initialReduxState?.viewer;
      if (viewer) {
        console.log('DEBUG: Found viewer object:', viewer);
        username = viewer.username || viewer.user_name;
      }
    }
    
    // Path 3: Check if there's a users object
    if (!username && homeData?.props?.initialReduxState?.users) {
      console.log('DEBUG: Checking users object...');
      const users = homeData.props.initialReduxState.users;
      // Find the first user that looks like "me"
      for (const userId in users) {
        const user = users[userId];
        if (user && user.username && user.is_viewer) {
          username = user.username;
          console.log('DEBUG: Found username in users:', username);
          break;
        }
      }
    }
    
    // Path 4: Check resourceDataCache
    if (!username && homeData?.props?.initialReduxState?.resourceDataCache) {
      console.log('DEBUG: Checking resourceDataCache...');
      const cache = homeData.props.initialReduxState.resourceDataCache;
      // Look for UserResource
      for (const key in cache) {
        if (key.includes('UserResource') || key.includes('MeResource')) {
          const resource = cache[key];
          if (resource?.data?.username) {
            username = resource.data.username;
            console.log('DEBUG: Found username in resourceDataCache:', username);
            break;
          }
        }
      }
    }
    
    if (!username) {
      console.error('DEBUG: Could not find username. Full data structure:', JSON.stringify(homeData, null, 2).substring(0, 5000));
      throw new Error('Could not find logged-in user. Are you logged in?');
    }
    
    console.log(`✅ Found user: ${username}`);
    
    // 2. Fetch the user's boards page
    // Try multiple endpoints to find boards
    let boardsData = null;
    let boards = [];
    
    // Try 1: User profile page (most reliable)
    try {
      console.log(`DEBUG: Trying /${username}/`);
      boardsData = await fetchAndParse(`/${username}/`);
      boards = extractBoardsFromData(boardsData);
      if (boards.length > 0) {
        console.log(`✅ Found ${boards.length} boards from profile page`);
      }
    } catch (e) {
      console.warn('Could not fetch from profile page:', e.message);
    }
    
    // Try 2: _saved endpoint
    if (boards.length === 0) {
      try {
        console.log(`DEBUG: Trying /${username}/_saved/`);
        boardsData = await fetchAndParse(`/${username}/_saved/`);
        boards = extractBoardsFromData(boardsData);
        if (boards.length > 0) {
          console.log(`✅ Found ${boards.length} boards from _saved page`);
        }
      } catch (e) {
        console.warn('Could not fetch from _saved page:', e.message);
      }
    }
    
    // Try 3: _boards endpoint (correct endpoint!)
    if (boards.length === 0) {
      try {
        console.log(`DEBUG: Trying /${username}/_boards/`);
        boardsData = await fetchAndParse(`/${username}/_boards/`);
        boards = extractBoardsFromData(boardsData);
        if (boards.length > 0) {
          console.log(`✅ Found ${boards.length} boards from _boards page`);
        }
      } catch (e) {
        console.warn('Could not fetch from _boards page:', e.message);
      }
    }
    
    if (boards.length === 0) {
      throw new Error('Could not find any boards. Make sure you have at least one board on Pinterest.');
    }
    
    console.log(`✅ Final board count: ${boards.length}`);
    
    // Cache the boards
    await StorageUtils.cacheBoards(boards);
    
    return boards;
    
  } catch (error) {
    console.error('❌ Fetch boards error:', error);
    throw error;
  }
}

/**
 * Helper to find boards array in the complex Redux state
 */
function extractBoardsFromData(data) {
  const boards = [];
  const username = data?.context?.user?.username;
  
  if (!username) {
    console.warn('⚠️ No username found in data.context.user');
    return boards;
  }
  
  console.log(`🔍 Searching for boards for user: ${username}`);
  
  // Helper to recursively search for board objects
  function searchForBoards(obj, depth = 0, path = '') {
    if (!obj || typeof obj !== 'object' || depth > 15) return;
    
    // Look for objects with href that matches board URL pattern
    if (obj.href && typeof obj.href === 'string') {
      // Board URLs look like: /username/board-slug/
      const boardUrlPattern = new RegExp(`^/${username}/([^/]+)/$`);
      const match = obj.href.match(boardUrlPattern);
      
      if (match) {
        const slug = match[1];
        // Exclude special pages like _saved, _created, _boards
        if (!slug.startsWith('_')) {
          const board = {
            id: obj.id || slug,
            name: obj.title || obj.name || slug,
            url: obj.href,
            privacy: obj.privacy || 'public',
            imageUrl: obj.image_cover_url || obj.image_thumbnail_url || obj.image_medium_url,
            pinCount: obj.pin_count || 0,
            slug: slug
          };
          
          boards.push(board);
          console.log(`✅ Found board: "${board.name}" (${board.url})`);
        }
      }
    }
    
    // Also check the old way (type === 'board')
    if (obj.type === 'board' && obj.id && obj.name) {
      const board = {
        id: obj.id,
        name: obj.name,
        url: obj.url || obj.href || `/${username}/${obj.slug || obj.name.toLowerCase().replace(/\s+/g, '-')}/`,
        privacy: obj.privacy || 'public',
        imageUrl: obj.image_cover_url || obj.image_thumbnail_url || obj.image_medium_url,
        pinCount: obj.pin_count || 0
      };
      
      boards.push(board);
      console.log(`✅ Found board (type=board): "${board.name}"`);
    }
    
    // Recurse through all properties
    for (const [key, val] of Object.entries(obj)) {
      searchForBoards(val, depth + 1, path ? `${path}.${key}` : key);
    }
  }
  
  // Start the search from the root
  searchForBoards(data);
  
  // Deduplicate by ID
  const uniqueBoards = Array.from(new Map(boards.map(b => [b.id, b])).values());
  
  if (uniqueBoards.length > 0) {
    console.log(`✅ Total unique boards: ${uniqueBoards.length}`);
    console.log(`📋 Board names: ${uniqueBoards.map(b => b.name).join(', ')}`);
  } else {
    console.warn('⚠️ No boards found in data');
  }
  
  return uniqueBoards;
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
  console.log('PinterestScraper module loaded');
}
