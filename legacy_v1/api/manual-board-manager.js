// Manual Board Manager
// Simple validation and storage of user-provided board URLs

/**
 * Parse and validate a board URL
 * @param {string} url - Pinterest board URL
 * @returns {Object|null} Board object or null if invalid
 */
function parseBoardUrl(url) {
  try {
    // Clean up the URL
    url = url.trim();
    
    // Handle different formats:
    // - https://www.pinterest.com/username/board-name/
    // - https://pinterest.com/username/board-name/
    // - www.pinterest.com/username/board-name/
    // - /username/board-name/
    
    // Extract the path part
    let path;
    
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      path = urlObj.pathname;
    } else if (url.startsWith('/')) {
      path = url;
    } else if (url.startsWith('www.') || url.startsWith('pinterest.com')) {
      const urlObj = new URL('https://' + url);
      path = urlObj.pathname;
    } else {
      return null; // Invalid format
    }
    
    // Validate path format: /username/board-slug/
    const pathMatch = path.match(/^\/([^/]+)\/([^/]+)\/?$/);
    
    if (!pathMatch) {
      return null; // Invalid path
    }
    
    const [, username, boardSlug] = pathMatch;
    
    // Generate board object
    return {
      id: `${username}-${boardSlug}`,
      name: boardSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Pretty name
      url: `/${username}/${boardSlug}/`,
      fullUrl: `https://www.pinterest.com/${username}/${boardSlug}/`,
      username: username,
      slug: boardSlug,
      addedAt: Date.now()
    };
    
  } catch (error) {
    console.error('Error parsing board URL:', error);
    return null;
  }
}

/**
 * Validate and parse multiple board URLs
 * @param {string} urlsText - Text with one URL per line
 * @returns {Object} { valid: Board[], invalid: string[] }
 */
function parseMultipleBoardUrls(urlsText) {
  const lines = urlsText.split('\n').map(line => line.trim()).filter(Boolean);
  const valid = [];
  const invalid = [];
  
  for (const line of lines) {
    const board = parseBoardUrl(line);
    
    if (board) {
      valid.push(board);
    } else {
      invalid.push(line);
    }
  }
  
  return { valid, invalid };
}

/**
 * Add boards to storage
 * @param {Array} boards - Array of board objects
 * @returns {Promise<void>}
 */
async function addBoards(boards) {
  if (!boards || boards.length === 0) {
    return;
  }
  
  // Get existing boards
  const existing = await StorageUtils.getCachedBoards() || [];
  
  // Merge (avoid duplicates by URL)
  const existingUrls = new Set(existing.map(b => b.url));
  const newBoards = boards.filter(b => !existingUrls.has(b.url));
  
  const allBoards = [...existing, ...newBoards];
  
  // Save
  await StorageUtils.cacheBoards(allBoards);
  
  console.log(`✅ Added ${newBoards.length} new boards (${allBoards.length} total)`);
  
  return { added: newBoards.length, total: allBoards.length };
}

/**
 * Remove a board by ID
 * @param {string} boardId - Board ID to remove
 */
async function removeBoard(boardId) {
  const existing = await StorageUtils.getCachedBoards() || [];
  const filtered = existing.filter(b => b.id !== boardId);
  
  await StorageUtils.cacheBoards(filtered);
  
  console.log(`✅ Removed board ${boardId}`);
  
  return filtered;
}

/**
 * Get all saved boards
 * @returns {Promise<Array>}
 */
async function getAllBoards() {
  return await StorageUtils.getCachedBoards() || [];
}

// Export
const ManualBoardManager = {
  parseBoardUrl,
  parseMultipleBoardUrls,
  addBoards,
  removeBoard,
  getAllBoards
};

// Make available globally for importScripts
if (typeof self !== 'undefined') {
  self.ManualBoardManager = ManualBoardManager;
}

console.log('✅ ManualBoardManager loaded');
