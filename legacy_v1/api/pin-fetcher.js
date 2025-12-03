// Pinterest Pin Fetcher
// Fetches pins from board URLs using HTML parsing

const PINTEREST_URL = 'https://www.pinterest.com';

/**
 * Fetch HTML from a Pinterest board
 * @param {string} boardUrl - Board URL path (e.g., /username/board-name/)
 * @returns {Promise<string>} Raw HTML
 */
async function fetchBoardHtml(boardUrl) {
  try {
    const url = `${PINTEREST_URL}${boardUrl}`;
    console.log(`📥 Fetching board: ${url}`);
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'text/html',
        'User-Agent': navigator.userAgent
      }
    });
    
    console.log(`📬 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Board not found (404): ${boardUrl} - Check if the URL is correct`);
      } else if (response.status === 403) {
        throw new Error(`Access denied (403): ${boardUrl} - Board might be private or require login`);
      } else {
        throw new Error(`Failed to fetch board (${response.status}): ${boardUrl}`);
      }
    }
    
    const html = await response.text();
    console.log(`✅ Received HTML (${html.length} chars)`);
    
    return html;
    
  } catch (error) {
    console.error(`❌ Error fetching board ${boardUrl}:`, error);
    throw error;
  }
}

/**
 * Extract __PWS_DATA__ from Pinterest HTML
 * @param {string} html - Raw HTML
 * @returns {Object|null} Parsed data or null
 */
function extractPwsData(html) {
  try {
    const regex = /<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
    const match = html.match(regex);
    
    if (!match || !match[1]) {
      console.warn('⚠️ No __PWS_DATA__ found in HTML');
      console.log('💡 This might mean:');
      console.log('   - Pinterest changed their HTML structure');
      console.log('   - Board page loaded differently');
      console.log('   - You need to be logged in');
      return null;
    }
    
    console.log(`📊 Found __PWS_DATA__ (${match[1].length} chars)`);
    const data = JSON.parse(match[1]);
    console.log('✅ Successfully parsed PWS data');
    
    return data;
  } catch (error) {
    console.error('❌ Failed to parse __PWS_DATA__:', error);
    return null;
  }
}

/**
 * Extract pins from PWS data
 * @param {Object} data - PWS data object
 * @returns {Array} List of pin objects
 */
function extractPinsFromData(data) {
  const pins = [];
  
  // Debug: Log top-level keys to understand structure
  console.log('🔍 PWS Data top-level keys:', Object.keys(data));
  
  // Check if there's a more direct path to pins
  if (data.resourceDataCache) {
    console.log('📦 Found resourceDataCache');
    // Sometimes pins are directly here
    const cache = data.resourceDataCache;
    for (const key in cache) {
      const resource = cache[key];
      if (resource && resource.data) {
        console.log(`   Resource key: ${key}, has data: ${!!resource.data}`);
      }
    }
  }
  
  // Recursive function to search through the data structure
  function searchForPins(obj, depth = 0, path = 'root') {
    if (depth > 10) return; // Prevent infinite recursion
    if (!obj || typeof obj !== 'object') return;
    
    // Check if this looks like a pin object
    if (obj.type === 'pin' && obj.id) {
      console.log(`📍 Found pin at ${path}: id=${obj.id}, title="${obj.title || obj.grid_title || 'no title'}"`);
      
      const pin = {
        id: obj.id,
        title: obj.title || obj.grid_title || '',
        description: obj.description || '',
        link: obj.link || `https://www.pinterest.com/pin/${obj.id}/`,
        boardId: obj.board?.id,
        dominantColor: obj.dominant_color || '#2a2a2a'
      };
      
      // Extract image URL
      if (obj.images) {
        const images = obj.images;
        pin.imageUrl = images.orig?.url || 
                      images['1200x']?.url || 
                      images['736x']?.url ||
                      images['600x']?.url ||
                      images['474x']?.url ||
                      images['236x']?.url;
        
        if (pin.imageUrl) {
          pins.push(pin);
          console.log(`   ✅ Pin added with image`);
        } else {
          console.log(`   ⚠️ Pin has no image URL`);
        }
      } else {
        console.log(`   ⚠️ Pin has no images object`);
      }
      return;
    }
    
    // Recurse into objects and arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => searchForPins(item, depth + 1, `${path}[${idx}]`));
    } else {
      Object.entries(obj).forEach(([key, value]) => searchForPins(value, depth + 1, `${path}.${key}`));
    }
  }
  
  searchForPins(data);
  
  // If we found no pins, show a sample of what we DID find
  if (pins.length === 0) {
    console.warn('⚠️ No pins found! Here\'s a sample of the data structure:');
    console.log(JSON.stringify(data, null, 2).substring(0, 1000) + '...');
  }
  
  // Deduplicate by ID
  const uniquePins = Array.from(
    new Map(pins.map(p => [p.id, p])).values()
  );
  
  console.log(`🔍 Found ${uniquePins.length} unique pins`);
  
  return uniquePins;
}

/**
 * Get CSRF token from Pinterest cookies
 * @returns {Promise<string|null>} CSRF token or null
 */
async function getCsrfToken() {
  try {
    const cookie = await chrome.cookies.get({
      url: PINTEREST_URL,
      name: 'csrftoken'
    });
    
    return cookie ? cookie.value : null;
  } catch (error) {
    console.warn('Could not get CSRF token:', error);
    return null;
  }
}

/**
 * Fetch pins from a board using Pinterest's internal API
 * @param {string} boardUrl - Board URL path (e.g., /username/board-name/)
 * @returns {Promise<Array>} List of pins
 */
async function fetchPinsFromBoard(boardUrl) {
  try {
    console.log(`📥 Fetching pins from board: ${boardUrl}`);
    
    // Extract username and board slug from URL
    const urlParts = boardUrl.split('/').filter(Boolean);
    if (urlParts.length < 2) {
      throw new Error(`Invalid board URL: ${boardUrl}`);
    }
    
    const username = urlParts[0];
    const boardSlug = urlParts[1];
    
    console.log(`   Username: ${username}, Board: ${boardSlug}`);
    
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      console.warn('⚠️ No CSRF token found - request might fail');
    } else {
      console.log('✅ Got CSRF token');
    }
    
    // Use Pinterest's internal BoardFeedResource API
    // This is the same endpoint their web app uses
    const apiUrl = `https://www.pinterest.com/resource/BoardFeedResource/get/`;
    
    const options = {
      username: username,
      slug: boardSlug,
      board_id: null,
      board_url: boardUrl,
      page_size: 25,
      redux_normalize_feed: true
    };
    
    const params = new URLSearchParams({
      source_url: boardUrl,
      data: JSON.stringify({
        options: options,
        context: {}
      })
    });
    
    const headers = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Pinterest-AppType': 'web'
    };
    
    // Add CSRF token if available
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    
    const response = await fetch(`${apiUrl}?${params}`, {
      credentials: 'include',
      headers: headers
    });
    
    console.log(`📬 API Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(`Access denied (403) - Pinterest API blocked the request. CSRF token: ${csrfToken ? 'present' : 'missing'}`);
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Received API response`);
    
    // Extract pins from the response
    const pins = [];
    
    if (data.resource_response && data.resource_response.data) {
      const items = data.resource_response.data;
      console.log(`📌 Found ${items.length} items in response`);
      
      items.forEach(item => {
        if (item && item.id && item.images) {
          const images = item.images;
          const imageUrl = images.orig?.url || 
                          images['1200x']?.url || 
                          images['736x']?.url ||
                          images['600x']?.url ||
                          images['474x']?.url;
          
          if (imageUrl) {
            pins.push({
              id: item.id,
              title: item.title || item.grid_title || '',
              description: item.description || '',
              link: item.link || `https://www.pinterest.com/pin/${item.id}/`,
              imageUrl: imageUrl,
              dominantColor: item.dominant_color || '#2a2a2a',
              boardId: item.board?.id
            });
          }
        }
      });
    }
    
    console.log(`✅ Extracted ${pins.length} pins from API response`);
    return pins;
    
  } catch (error) {
    console.error(`❌ Error fetching pins from ${boardUrl}:`, error);
    return [];
  }
}

/**
 * Fetch random pins from multiple boards
 * @param {Array<string>} boardUrls - Array of board URL paths
 * @param {number} count - Number of pins to return
 * @returns {Promise<Array>} Random selection of pins
 */
async function fetchRandomPins(boardUrls, count = 12) {
  try {
    if (!boardUrls || boardUrls.length === 0) {
      throw new Error('No board URLs provided');
    }
    
    console.log(`🎲 Fetching pins from ${boardUrls.length} boards...`);
    
    // Fetch pins from all boards in parallel
    const promises = boardUrls.map(url => fetchPinsFromBoard(url));
    const results = await Promise.all(promises);
    
    // Combine all pins
    const allPins = results.flat();
    
    if (allPins.length === 0) {
      throw new Error('No pins found in selected boards');
    }
    
    console.log(`📌 Total pins collected: ${allPins.length}`);
    
    // Shuffle and select random pins
    const shuffled = allPins.sort(() => Math.random() - 0.5);
    const selectedPins = shuffled.slice(0, count);
    
    console.log(`✅ Returning ${selectedPins.length} random pins`);
    
    // Cache the pins
    if (self.StorageUtils) {
      await StorageUtils.cachePins(selectedPins);
    }
    
    return selectedPins;
    
  } catch (error) {
    console.error('❌ Error fetching random pins:', error);
    throw error;
  }
}

// Export
const PinFetcher = {
  fetchRandomPins,
  fetchPinsFromBoard
};

// Make available globally for importScripts
if (typeof self !== 'undefined') {
  self.PinFetcher = PinFetcher;
}

console.log('✅ PinFetcher loaded');
