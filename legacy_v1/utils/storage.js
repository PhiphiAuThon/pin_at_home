// Chrome Storage Utility Functions

const STORAGE_KEYS = {
  AUTH_TOKENS: 'authTokens',
  PREFERENCES: 'preferences',
  CACHED_PINS: 'cachedPins',
  CACHED_BOARDS: 'cachedBoards',
  CACHE_TIMESTAMP: 'cacheTimestamp'
};

// ============================================
// Authentication Token Management
// ============================================

/**
 * Save OAuth tokens to storage
 * @param {Object} tokens - { accessToken, refreshToken, expiresAt }
 */
async function saveTokens(tokens) {
  return chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_TOKENS]: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt
    }
  });
}

/**
 * Get OAuth tokens from storage
 * @returns {Promise<Object|null>} Tokens or null if not found
 */
async function getTokens() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKENS);
  return result[STORAGE_KEYS.AUTH_TOKENS] || null;
}

/**
 * Check if access token is still valid
 * @returns {Promise<boolean>}
 */
async function isTokenValid() {
  const tokens = await getTokens();
  if (!tokens || !tokens.expiresAt) return false;
  
  // Check if token expires in next 5 minutes
  const now = Date.now();
  const expiresAt = new Date(tokens.expiresAt).getTime();
  return expiresAt > (now + 5 * 60 * 1000);
}

/**
 * Clear authentication tokens
 */
async function clearTokens() {
  return chrome.storage.local.remove(STORAGE_KEYS.AUTH_TOKENS);
}

// ============================================
// User Preferences
// ============================================

/**
 * Save user preferences
 * @param {Object} preferences - User settings
 */
async function savePreferences(preferences) {
  return chrome.storage.local.set({
    [STORAGE_KEYS.PREFERENCES]: preferences
  });
}

/**
 * Get user preferences
 * @returns {Promise<Object>} User preferences with defaults
 */
async function getPreferences() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PREFERENCES);
  return result[STORAGE_KEYS.PREFERENCES] || {
    selectedBoards: [],
    pinsPerPage: 12,
    refreshInterval: 'daily',
    theme: 'dark'
  };
}

/**
 * Update specific preference
 * @param {string} key - Preference key
 * @param {*} value - New value
 */
async function updatePreference(key, value) {
  const prefs = await getPreferences();
  prefs[key] = value;
  return savePreferences(prefs);
}

// ============================================
// Pin Caching
// ============================================

/**
 * Cache pins with timestamp
 * @param {Array} pins - Array of pin objects
 */
async function cachePins(pins) {
  return chrome.storage.local.set({
    [STORAGE_KEYS.CACHED_PINS]: pins,
    [STORAGE_KEYS.CACHE_TIMESTAMP]: Date.now()
  });
}

/**
 * Get cached pins if still valid
 * @param {number} maxAgeMs - Maximum cache age in milliseconds
 * @returns {Promise<Array|null>} Cached pins or null if expired
 */
async function getCachedPins(maxAgeMs = 24 * 60 * 60 * 1000) { // Default 24 hours
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.CACHED_PINS,
    STORAGE_KEYS.CACHE_TIMESTAMP
  ]);
  
  const pins = result[STORAGE_KEYS.CACHED_PINS];
  const timestamp = result[STORAGE_KEYS.CACHE_TIMESTAMP];
  
  if (!pins || !timestamp) return null;
  
  const age = Date.now() - timestamp;
  if (age > maxAgeMs) {
    // Cache expired
    return null;
  }
  
  return pins;
}

/**
 * Clear cached pins
 */
async function clearPinCache() {
  return chrome.storage.local.remove([
    STORAGE_KEYS.CACHED_PINS,
    STORAGE_KEYS.CACHE_TIMESTAMP
  ]);
}

// ============================================
// Board Caching
// ============================================

/**
 * Cache user's boards
 * @param {Array} boards - Array of board objects
 */
async function cacheBoards(boards) {
  return chrome.storage.local.set({
    [STORAGE_KEYS.CACHED_BOARDS]: boards
  });
}

/**
 * Get cached boards
 * @returns {Promise<Array|null>}
 */
async function getCachedBoards() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CACHED_BOARDS);
  return result[STORAGE_KEYS.CACHED_BOARDS] || null;
}

/**
 * Clear all cached data
 */
async function clearAllCache() {
  return chrome.storage.local.remove([
    STORAGE_KEYS.CACHED_PINS,
    STORAGE_KEYS.CACHED_BOARDS,
    STORAGE_KEYS.CACHE_TIMESTAMP
  ]);
}

// Export functions
// ============================================

const StorageUtils = {
  saveTokens,
  getTokens,
  isTokenValid,
  clearTokens,
  savePreferences,
  getPreferences,
  updatePreference,
  cachePins,
  getCachedPins,
  clearPinCache,
  cacheBoards,
  getCachedBoards,
  clearAllCache
};

// Make functions available globally
if (typeof window !== 'undefined') {
  window.StorageUtils = StorageUtils;
} else if (typeof self !== 'undefined') {
  self.StorageUtils = StorageUtils;
} else if (typeof global !== 'undefined') {
  global.StorageUtils = StorageUtils;
}

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageUtils;
}
