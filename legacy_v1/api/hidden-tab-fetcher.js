// Hidden Tab Pin Fetcher
// Opens Pinterest boards in hidden tabs and extracts pins via content scripts

/**
 * Fetch pins from a board using hidden tab + content script
 * @param {string} boardUrl - Board URL path (e.g., /username/board/)
 * @returns {Promise<Array>} List of pins
 */
async function fetchPinsViaHiddenTab(boardUrl) {
  let tabId = null;
  
  try {
    console.log(`📂 Opening hidden tab for: ${boardUrl}`);
    
    // Create tab in background
    const tab = await chrome.tabs.create({
      url: `https://www.pinterest.com${boardUrl}`,
      active: false // Hidden
    });
    
    tabId = tab.id;
    console.log(`✅ Created tab ${tabId}`);
    
    // Wait for tab to load
    await waitForTabLoad(tabId);
    console.log(`✅ Tab loaded`);
    
    // Give Pinterest time to render (important!)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'extractPins'
    });
    
    console.log(`📬 Got response from content script`);
    
    // Close tab
    await chrome.tabs.remove(tabId);
    console.log(`🗑️ Closed tab ${tabId}`);
    
    if (response && response.success) {
      return response.pins;
    } else {
      throw new Error(response?.error || 'Failed to extract pins');
    }
    
  } catch (error) {
    // Clean up
    if (tabId) {
      try {
        await chrome.tabs.remove(tabId);
      } catch {}
    }
    
    console.error(`❌ Error with hidden tab:`, error);
    return [];
  }
}

/**
 * Wait for tab to finish loading
 */
function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Tab load timeout'));
    }, 20000); // 20 second timeout
    
    function checkStatus() {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          clearTimeout(timeout);
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (tab.status === 'complete') {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkStatus, 100);
        }
      });
    }
    
    checkStatus();
  });
}

/**
 * Fetch pins from multiple boards
 * @param {Array<string>} boardUrls - Board URL paths
 * @param {number} count - Number of pins to return
 * @returns {Promise<Array>} Selected pins
 */
async function fetchPinsFromBoards(boardUrls, count = 25) {
  try {
    if (!boardUrls || boardUrls.length === 0) {
      throw new Error('No board URLs provided');
    }
    
    console.log(`🎲 Fetching pins from ${boardUrls.length} boards via hidden tabs...`);
    
    const allPins = [];
    
    // Fetch boards one at a time to avoid too many tabs
    for (const boardUrl of boardUrls) {
      const pins = await fetchPinsViaHiddenTab(boardUrl);
      console.log(`   Got ${pins.length} pins from ${boardUrl}`);
      allPins.push(...pins);
      
      // Small delay between boards
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (allPins.length === 0) {
      throw new Error('No pins found in selected boards');
    }
    
    console.log(`📌 Total pins collected: ${allPins.length}`);
    
    // Shuffle and select random pins
    const shuffled = allPins.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    
    console.log(`✅ Returning ${selected.length} random pins`);
    
    // Cache
    if (self.StorageUtils) {
      await StorageUtils.cachePins(selected);
    }
    
    return selected;
    
  } catch (error) {
    console.error('❌ Error fetching pins from boards:', error);
    throw error;
  }
}

// Export
const HiddenTabFetcher = {
  fetchPinsFromBoards,
  fetchPinsViaHiddenTab
};

if (typeof self !== 'undefined') {
  self.HiddenTabFetcher = HiddenTabFetcher;
}

console.log('✅ HiddenTabFetcher loaded');
