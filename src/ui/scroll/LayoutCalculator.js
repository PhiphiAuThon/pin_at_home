// Pin@Home - Layout Calculator
// Pure functions for calculating heights and positions
// NO side effects, NO state - just math

/**
 * Calculate the display height of an image given column width
 * @param {number} naturalWidth - Image's natural width
 * @param {number} naturalHeight - Image's natural height
 * @param {number} columnWidth - Current column width
 * @returns {number} Calculated display height
 */
export function calculateItemHeight(naturalWidth, naturalHeight, columnWidth) {
  if (!naturalWidth || !columnWidth) return 0;
  return naturalHeight * (columnWidth / naturalWidth);
}

/**
 * Calculate positions for all items based on current column width
 * Falls back to existing height if image not loaded yet
 * @param {Array} items - Array of items with img elements
 * @param {number} columnWidth - Current column width
 * @returns {Array} Array of { height, top } for each item
 */
export function calculateItemPositions(items, columnWidth) {
  let currentTop = 0;
  
  return items.map(item => {
    const img = item.img;
    let height = calculateItemHeight(
      img?.naturalWidth,
      img?.naturalHeight,
      columnWidth
    );
    
    // Fallback to existing height if image not loaded yet
    if (height === 0 && item.height > 0) {
      height = item.height;
    }
    
    const position = { height, top: currentTop };
    currentTop += height;
    return position;
  });
}

/**
 * Calculate total height from positions array
 * @param {Array} positions - Array of { height, top }
 * @returns {number} Total height
 */
export function calculateTotalHeight(positions) {
  if (positions.length === 0) return 0;
  const last = positions[positions.length - 1];
  return last.top + last.height;
}

/**
 * Calculate screen position of an item
 * @param {number} localTop - Item's position in track
 * @param {number} trackOffset - Track's scroll offset
 * @returns {number} Screen Y position
 */
export function getScreenPosition(localTop, trackOffset) {
  return localTop + trackOffset;
}

/**
 * Check if an item is visible on screen
 * @param {number} screenTop - Item's screen Y position
 * @param {number} height - Item's height
 * @param {number} viewportHeight - Viewport height
 * @returns {boolean} True if any part is visible
 */
export function isItemVisible(screenTop, height, viewportHeight) {
  const screenBottom = screenTop + height;
  return screenBottom > 0 && screenTop < viewportHeight;
}

/**
 * Check if item is above viewport (can be recycled to bottom)
 * @param {number} screenTop - Item's screen Y position
 * @param {number} height - Item's height
 * @returns {boolean} True if completely above viewport
 */
export function isAboveViewport(screenTop, height) {
  return screenTop + height < 0;
}

/**
 * Check if item is below viewport (can be recycled to top)
 * @param {number} screenTop - Item's screen Y position
 * @param {number} viewportHeight - Viewport height
 * @returns {boolean} True if completely below viewport
 */
export function isBelowViewport(screenTop, viewportHeight) {
  return screenTop > viewportHeight;
}
