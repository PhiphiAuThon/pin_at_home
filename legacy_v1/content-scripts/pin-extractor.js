// Pin Extractor Content Script
// Runs on Pinterest pages with pinterest.com origin

console.log('📌 Pinterest Pin Extractor loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPins') {
    console.log('🔍 Extracting pins from current page...');
    extractPinsFromPage()
      .then(pins => {
        console.log(`✅ Extracted ${pins.length} pins`);
        sendResponse({ success: true, pins: pins });
      })
      .catch(error => {
        console.error('❌ Error extracting pins:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep channel open for async response
  }
});

/**
 * Extract pins from the current Pinterest board page
 */
async function extractPinsFromPage() {
  // Wait for page to fully load
  await waitForPageLoad();
  
  const pins = [];
  
  // Method 1: Try __PWS_DATA__
  console.log('Trying Method 1: __PWS_DATA__');
  const pwsPins = extractFromPwsData();
  if (pwsPins.length > 0) {
    console.log(`📊 Found ${pwsPins.length} pins in __PWS_DATA__`);
    pins.push(...pwsPins);
  }
  
  // Method 2: Try Redux store
  if (pins.length === 0) {
    console.log('Trying Method 2: Redux Store');
    const reduxPins = extractFromReduxStore();
    if (reduxPins.length > 0) {
      console.log(`🔴 Found ${reduxPins.length} pins in Redux store`);
      pins.push(...reduxPins);
    }
  }
  
  // Method 3: DOM scraping fallback
  if (pins.length === 0) {
    console.log('Trying Method 3: DOM Scraping');
    const domPins = await extractFromDOM();
    console.log(`🎨 Found ${domPins.length} pins in DOM`);
    pins.push(...domPins);
  }
  
  // Deduplicate by ID
  const uniquePins = Array.from(
    new Map(pins.map(p => [p.id, p])).values()
  );
  
  return uniquePins;
}

/**
 * Wait for page load
 */
function waitForPageLoad() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      setTimeout(resolve, 500); // Small delay
    } else {
      window.addEventListener('load', () => setTimeout(resolve, 500));
    }
  });
}

/**
 * Extract from __PWS_DATA__
 */
function extractFromPwsData() {
  const pins = [];
  
  try {
    const script = document.getElementById('__PWS_DATA__');
    if (!script) return pins;
    
    const data = JSON.parse(script.textContent);
    
    // Recursive search
    function searchPins(obj, depth = 0) {
      if (depth > 15) return;
      if (!obj || typeof obj !== 'object') return;
      
      if (obj.type === 'pin' && obj.id && obj.images) {
        const images = obj.images;
        const imageUrl = images.orig?.url || 
                        images['1200x']?.url || 
                        images['736x']?.url ||
                        images['600x']?.url;
        
        if (imageUrl) {
          pins.push({
            id: obj.id,
            title: obj.title || obj.grid_title || '',
            description: obj.description || '',
            link: obj.link || `https://www.pinterest.com/pin/${obj.id}/`,
            imageUrl: imageUrl,
            dominantColor: obj.dominant_color || '#2a2a2a'
          });
        }
      }
      
      if (Array.isArray(obj)) {
        obj.forEach(item => searchPins(item, depth + 1));
      } else {
        Object.values(obj).forEach(val => searchPins(val, depth + 1));
      }
    }
    
    searchPins(data);
  } catch (error) {
    console.warn('Could not extract from PWS:', error);
  }
  
  return pins;
}

/**
 * Extract from Redux store
 */
function extractFromReduxStore() {
  const pins = [];
  
  try {
    // Look for Redux state in window
    const state = window.__REDUX_STATE__ || 
                  window.__INITIAL_STATE__ ||
                  window.reduxStore?.getState();
    
    if (!state) return pins;
    
    // Search for pins
    function findPins(obj, depth = 0) {
      if (depth > 10) return;
      if (!obj || typeof obj !== 'object') return;
      
      if (obj.id && obj.images && typeof obj.id === 'string' && obj.id.length > 5) {
        const images = obj.images;
        const imageUrl = images.orig?.url || 
                        images['1200x']?.url || 
                        images['600x']?.url;
        
        if (imageUrl) {
          pins.push({
            id: obj.id,
            title: obj.title || obj.grid_title || '',
            description: obj.description || '',
            link: obj.link || `https://www.pinterest.com/pin/${obj.id}/`,
            imageUrl: imageUrl,
            dominantColor: obj.dominant_color || '#2a2a2a'
          });
        }
      }
      
      if (Array.isArray(obj)) {
        obj.forEach(item => findPins(item, depth + 1));
      } else {
        Object.values(obj).forEach(val => findPins(val, depth + 1));
      }
    }
    
    findPins(state);
  } catch (error) {
    console.warn('Could not extract from Redux:', error);
  }
  
  return pins;
}

/**
 * Extract from DOM (fallback)
 */
async function extractFromDOM() {
  const pins = [];
  
  try {
    // Wait for lazy load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find pin elements - Pinterest uses various selectors
    const selectors = [
      '[data-test-id="pin"]',
      '[data-test-id*="pin"]',
      'div[role="listitem"]',
      'a[href*="/pin/"]'
    ];
    
    let pinElements = [];
    for (const selector of selectors) {
      pinElements = document.querySelectorAll(selector);
      if (pinElements.length > 0) {
        console.log(`Found ${pinElements.length} elements with selector: ${selector}`);
        break;
      }
    }
    
    pinElements.forEach(el => {
      try {
        // Find pin link
        let link = el.href || el.querySelector('a[href*="/pin/"]')?.href;
        if (!link) return;
        
        const pinId = link.match(/\/pin\/(\d+)/)?.[1];
        if (!pinId) return;
        
        // Find image
        const img = el.querySelector('img');
        if (!img || !img.src) return;
        
        const title = img.alt || el.querySelector('h3, h2, h1')?.textContent || '';
        
        pins.push({
          id: pinId,
          title: title.trim(),
          description: '',
          link: `https://www.pinterest.com/pin/${pinId}/`,
          imageUrl: img.src,
          dominantColor: '#2a2a2a'
        });
      } catch (error) {
        // Skip this element
      }
    });
  } catch (error) {
    console.warn('Could not extract from DOM:', error);
  }
  
  return pins;
}
