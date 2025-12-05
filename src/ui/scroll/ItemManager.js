// Pin@Home - Item Manager
// Manages item lifecycle with clear states
// Single source of truth for all items in a column

/**
 * Item states
 */
export const ItemStatus = {
  PENDING: 'PENDING',   // Created, waiting to start loading
  LOADING: 'LOADING',   // img.src set, waiting for onload
  READY: 'READY',       // Loaded, waiting to be revealed
  VISIBLE: 'VISIBLE'    // Revealed and visible in DOM
};

/**
 * ItemManager - handles item lifecycle for a single column
 * Replaces the 4 separate queues with one array + statuses
 */
export class ItemManager {
  constructor() {
    this.items = [];
  }
  
  /**
   * Add a new item in PENDING state
   * @param {Object} item - { element, url, img }
   */
  addItem(item) {
    this.items.push({
      ...item,
      status: ItemStatus.PENDING,
      height: 0,
      localTop: 0
    });
  }
  
  /**
   * Transition item to LOADING state
   * @param {Object} item - Item to transition
   */
  startLoading(item) {
    if (item.status === ItemStatus.PENDING) {
      item.status = ItemStatus.LOADING;
    }
  }
  
  /**
   * Transition item to READY state (image loaded)
   * @param {Object} item - Item to transition
   * @param {number} height - Calculated height
   */
  markReady(item, height) {
    if (item.status === ItemStatus.LOADING) {
      item.status = ItemStatus.READY;
      item.height = height;
    }
  }
  
  /**
   * Transition item to VISIBLE state
   * @param {Object} item - Item to transition
   * @param {number} localTop - Position in track
   */
  reveal(item, localTop) {
    if (item.status === ItemStatus.READY) {
      item.status = ItemStatus.VISIBLE;
      item.localTop = localTop;
    }
  }
  
  /**
   * Remove an item (on error)
   * @param {Object} item - Item to remove
   */
  removeItem(item) {
    const index = this.items.indexOf(item);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }
  
  // ========== Computed getters ==========
  
  /**
   * Items by status
   */
  getByStatus(status) {
    return this.items.filter(i => i.status === status);
  }
  
  get pendingItems() {
    return this.getByStatus(ItemStatus.PENDING);
  }
  
  get loadingItems() {
    return this.getByStatus(ItemStatus.LOADING);
  }
  
  get readyItems() {
    return this.getByStatus(ItemStatus.READY);
  }
  
  get visibleItems() {
    return this.getByStatus(ItemStatus.VISIBLE);
  }
  
  /**
   * Total height of visible items
   */
  get totalHeight() {
    return this.visibleItems.reduce((sum, item) => sum + item.height, 0);
  }
  
  /**
   * Next localTop position for revealing items
   */
  get nextLocalTop() {
    const visible = this.visibleItems;
    if (visible.length === 0) return 0;
    
    // Find the actual bottom-most point regardless of array order
    let maxBottom = 0;
    for (const item of visible) {
      const bottom = item.localTop + item.height;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    return maxBottom;
  }
  
  /**
   * Count of items in loading pipeline
   */
  get pipelineCount() {
    return this.pendingItems.length + this.loadingItems.length + this.readyItems.length;
  }
  
  /**
   * Check if all items have been loaded
   * @param {number} expectedCount - Total expected items
   */
  isDoneLoading(expectedCount) {
    return this.visibleItems.length >= expectedCount;
  }
  
  /**
   * Add a clone directly as VISIBLE (skips loading pipeline)
   * Used for filling viewport after all originals are loaded
   * @param {Object} clone - { element, url, img, height, localTop }
   */
  addClone({ element, url, img, height, localTop }) {
    this.items.push({
      element, url, img, height, localTop,
      status: ItemStatus.VISIBLE,
      isClone: true
    });
  }
  
  /**
   * Sort items by their visual position (localTop)
   * Crucial for syncing array order with Recycler's visual changes
   */
  sortByPosition() {
    this.items.sort((a, b) => a.localTop - b.localTop);
  }

  /**
   * Update height and position of a visible item
   * @param {Object} item - Item to update
   * @param {number} height - New height
   * @param {number} localTop - New position
   */
  updatePosition(item, height, localTop) {
    if (item.status === ItemStatus.VISIBLE) {
      item.height = height;
      item.localTop = localTop;
    }
  }
}
