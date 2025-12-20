// Pin@Home Cache Management
import { CONFIG } from './config.js';
import { state, updateState } from './state.js';
import { isContextInvalidated, showReloadNotification } from './utils.js';
import { getAllDirectoryHandles } from './utils/localFolderManager.js';

// Debounce timer for cache saves
let saveCacheTimer = null;
let pendingPins = [];

/**
 * Load pins from local storage
 * @returns {Promise<boolean>} True if cache was loaded successfully
 */
export async function loadFromCache() {
  try {
    const result = await chrome.storage.local.get([state.cacheKey]);
    const cachedPins = result[state.cacheKey];
    
    if (cachedPins && Array.isArray(cachedPins) && cachedPins.length > 0) {
      console.log(`📦 Cache loaded: ${cachedPins.length} images from storage`);
      updateState({ pinsFound: cachedPins });
      return true;
    } else {
      console.log('📦 Cache: empty or not found');
    }
  } catch (e) {
    if (isContextInvalidated(e)) {
      console.warn('Pin@Home: Extension reloaded. Please refresh this page.');
      showReloadNotification();
    } else {
      console.warn('Pin@Home: Cache load failed', e);
    }
  }
  return false;
}

/**
 * Save current pool to local storage (debounced)
 * @param {string[]} newPins - Array of new pin URLs to add to cache
 */
export function saveToCache(newPins) {
  // Accumulate pins
  pendingPins = [...pendingPins, ...newPins];
  
  // Clear existing timer
  if (saveCacheTimer) {
    clearTimeout(saveCacheTimer);
  }
  
  // Debounce: wait 500ms after last call
  saveCacheTimer = setTimeout(() => {
    doSaveToCache(pendingPins);
    pendingPins = [];
    saveCacheTimer = null;
  }, 500);
}

/**
 * Actually perform the cache save
 */
async function doSaveToCache(newPins) {
  try {
    // Get current cache
    const result = await chrome.storage.local.get([state.cacheKey]);
    let currentCache = result[state.cacheKey] || [];
    
    // Check if we actually have NEW pins (not already in cache)
    const existingSet = new Set(currentCache);
    const actuallyNew = newPins.filter(pin => !existingSet.has(pin));
    
    // Skip storage write if no new pins found
    if (actuallyNew.length === 0) {
      return; // Nothing new, skip I/O
    }
    
    // Merge: New pins go to front
    const combined = [...actuallyNew, ...currentCache];
    
    // Trim to max size
    const trimmed = combined.slice(0, CONFIG.MAX_CACHE_SIZE);
    
    // Save back
    await chrome.storage.local.set({ [state.cacheKey]: trimmed });
    console.log(`💾 Cache updated: +${actuallyNew.length} new pins (${trimmed.length} total)`);
    
    // Update state
    updateState({ pinsFound: trimmed });
    
  } catch (e) {
    if (isContextInvalidated(e)) {
      console.warn('Pin@Home: Extension reloaded. Cache not saved. Please refresh this page.');
    } else {
      console.warn('Pin@Home: Cache save failed', e);
    }
  }
}

/**
 * Clear cache for current board
 * @param {Function} onClearCallback - Callback to execute after clearing cache
 */
export async function clearCurrentBoardCache(onClearCallback) {
  const confirmed = confirm(`Clear cached images for "${state.boardName}"?\n\nThis will remove all cached images for this board and reload fresh content.`);
  
  if (!confirmed) return;
  
  try {
    // Remove current board's cache
    if (state.cacheKey?.startsWith('local_')) {
      const { removeDirectoryHandle } = await import('./utils/localFolderManager.js');
      await removeDirectoryHandle(state.cacheKey);
    } else {
      await chrome.storage.local.remove([state.cacheKey]);
    }
    console.log(`🧹 Cleared cache for: ${state.cacheKey}`);
    
    // Clear current state
    updateState({ 
      pinsFound: [], 
      scanAttempts: 0 
    });
    
    console.log('✨ Cache cleared! Rescanning for fresh pins...');
    
    // Execute callback if provided
    if (onClearCallback) {
      onClearCallback();
    }
    
  } catch (e) {
    if (isContextInvalidated(e)) {
      alert('Extension was reloaded. Please refresh this page and try again.');
    } else {
      console.error('Pin@Home: Failed to clear cache', e);
      alert('Failed to clear cache. Check console for details.');
    }
  }
}

/**
 * Delete a specific board's cache by cache key
 * @param {string} cacheKey - The cache key to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteBoardCache(cacheKey) {
  try {
    if (cacheKey.startsWith('local_')) {
      const { removeDirectoryHandle } = await import('./utils/localFolderManager.js');
      await removeDirectoryHandle(cacheKey);
    } else {
      await chrome.storage.local.remove([cacheKey]);
    }
    console.log(`🧹 Deleted cache: ${cacheKey}`);
    return true;
  } catch (e) {
    console.error('Pin@Home: Failed to delete board cache', e);
    return false;
  }
}

/**
 * Clear ALL Pin@Home caches (for deep cleaning)
 * @param {Function} onClearCallback - Callback to execute after clearing all caches
 */
export async function clearAllCache(onClearCallback) {
  const confirmed = confirm('Clear ALL Pin@Home caches?\n\nThis will remove cached images from ALL boards. This action cannot be undone.');
  
  if (!confirmed) return;
  
  try {
    // Get all storage keys
    const allData = await chrome.storage.local.get(null);
    const pinAtHomeKeys = Object.keys(allData).filter(key => key.startsWith(CONFIG.CACHE_KEY_PREFIX));
    
    if (pinAtHomeKeys.length === 0) {
      alert('No caches found to clear.');
      return;
    }
    
    // Remove all Pin@Home caches
    await chrome.storage.local.remove(pinAtHomeKeys);
    console.log(`🧹 Cleared ${pinAtHomeKeys.length} cache(s):`, pinAtHomeKeys);
    
    alert(`Successfully cleared ${pinAtHomeKeys.length} board cache(s).`);
    
    // Execute callback if provided
    if (onClearCallback) {
      onClearCallback();
    }
    
  } catch (e) {
    if (isContextInvalidated(e)) {
      alert('Extension was reloaded. Please refresh this page and try again.');
    } else {
      console.error('Pin@Home: Failed to clear all caches', e);
      alert('Failed to clear caches. Check console for details.');
    }
  }
}

/**
 * Get all cached boards from storage
 * @returns {Promise<Array<{cacheKey: string, boardName: string, imageCount: number}>>}
 */
export async function getAllCachedBoards() {
  try {
    const allData = await chrome.storage.local.get(null);
    return Object.keys(allData)
      .filter(key => key.startsWith(CONFIG.CACHE_KEY_PREFIX))
      .map(key => {
        // Extract board path from cache key and convert to display name
        const path = key.replace(CONFIG.CACHE_KEY_PREFIX, '');
        const segments = path.split('/').filter(s => s.length > 0);
        const boardName = segments.length >= 2 
          ? decodeURIComponent(segments[1].replace(/-/g, ' '))
          : path;
        return {
          cacheKey: key,
          boardName: boardName,
          imageCount: Array.isArray(allData[key]) ? allData[key].length : 0
        };
      })
      .filter(board => board.imageCount > 0)
      .sort((a, b) => b.imageCount - a.imageCount); // Most images first
  } catch (e) {
    console.warn('Pin@Home: Failed to get cached boards', e);
    return [];
  }
}

/**
 * Get unified list of boards (Pinterest + Local)
 */
export async function getUnifiedBoards() {
  const [pinterestBoards, localHandles] = await Promise.all([
    getAllCachedBoards(),
    getAllDirectoryHandles()
  ]);
  
  const localBoards = localHandles.map(item => ({
    cacheKey: item.id,
    boardName: item.name,
    imageCount: '', // Used for folder icon identification
    type: 'local'
  }));
  
  return [...localBoards, ...pinterestBoards];
}

/**
 * Save last visited board to storage (for new tab page)
 * @param {string} cacheKey 
 * @param {string} boardName 
 */
export async function saveLastVisitedBoard(cacheKey, boardName) {
  try {
    await chrome.storage.local.set({ 
      lastVisitedBoard: { cacheKey, boardName } 
    });
  } catch (e) {
    console.warn('Pin@Home: Failed to save last visited board', e);
  }
}

/**
 * Get last visited board from storage
 * @returns {Promise<{cacheKey: string, boardName: string}|null>}
 */
export async function getLastVisitedBoard() {
  try {
    const result = await chrome.storage.local.get(['lastVisitedBoard']);
    return result.lastVisitedBoard || null;
  } catch (e) {
    console.warn('Pin@Home: Failed to get last visited board', e);
    return null;
  }
}

/**
 * Get scroll speed percentage from storage
 * @returns {Promise<number>} Speed percentage (default: 100)
 */
export async function getScrollSpeed() {
  try {
    const result = await chrome.storage.local.get(['pin_at_home_scroll_speed']);
    return result.pin_at_home_scroll_speed ?? 100;
  } catch (e) {
    console.warn('Pin@Home: Failed to get scroll speed', e);
    return 100;
  }
}

/**
 * Save scroll speed percentage to storage
 * @param {number} speed - Speed percentage (-200 to 200)
 */
export async function saveScrollSpeed(speed) {
  try {
    await chrome.storage.local.set({ pin_at_home_scroll_speed: speed });
  } catch (e) {
    console.warn('Pin@Home: Failed to save scroll speed', e);
  }
}

/**
 * Get pin count limit from storage
 * @returns {Promise<string>} Pin count ('all', '50', '25', '15') - default: 'all'
 */
export async function getPinCount() {
  try {
    const result = await chrome.storage.local.get(['pin_at_home_pin_count']);
    return result.pin_at_home_pin_count ?? '25';
  } catch (e) {
    console.warn('Pin@Home: Failed to get pin count', e);
    return '25';
  }
}

/**
 * Save pin count limit to storage
 * @param {string} count - Pin count ('all', '50', '25', '15')
 */
export async function savePinCount(count) {
  try {
    await chrome.storage.local.set({ pin_at_home_pin_count: count });
  } catch (e) {
    console.warn('Pin@Home: Failed to save pin count', e);
  }
}
