// Pin@Home - Column Scroller Module
// Transform-based scrolling - moves track instead of individual items

import { openFullscreenViewer } from './fullscreenViewer.js';

// Configuration for progressive loading (easy to tune)
const LOADING_CONFIG = {
  createRate: 2,    // Create X DOM elements per frame
  revealRate: 3,    // Reveal X loaded images per frame
  maxLoading: 3,    // Max images loading at once (the "tunnel")
  minPending: 8,    // Keep at least X items in pipeline
  minVisible: 1     // Need at least X visible before scrolling starts
};

/**
 * Class to handle virtual scrolling for a single column
 * Uses transform on track for smooth scrolling (1 DOM write vs N)
 */
export class ColumnScroller {
  constructor(container, track, imageUrls, speed) {
    this.container = container;
    this.track = track;
    this.imageUrls = [...imageUrls];
    this.urlIndex = 0;
    this.speed = speed;
    
    // Track offset for transform-based scrolling
    this.trackOffset = 0;
    
    // Item tracking - positions are relative to track, not viewport
    this.items = [];           // Visible items: { element, url, height, localTop }
    this.loadQueue = [];       // Items waiting to load (created but img.src not set)
    this.loadingItems = [];    // Items currently loading (img.src set, waiting onload)
    this.revealQueue = [];     // Loaded and ready to reveal
    
    this.nextLocalTop = 0;     // Next position within track (not screen)
    this.totalHeight = 0;      // Total height of all visible items
    this.isStable = false;     // True when we have enough height for simple recycling
    this.isDoneLoading = false; // True when ALL assigned images have been loaded
    this.isPaused = false;
    this.columnWidth = 0;      // Cached column width (avoids layout recalc)
    
    // Event handlers
    this.container.addEventListener('mouseenter', () => this.isPaused = true);
    this.container.addEventListener('mouseleave', () => this.isPaused = false);
    this.container.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  }
  
  get viewportHeight() {
    return window.innerHeight;
  }
  
  handleWheel(e) {
    e.preventDefault();
    this.scroll(-e.deltaY * 0.5);
  }
  
  getNextUrl() {
    if (this.urlIndex >= this.imageUrls.length) {
      this.urlIndex = 0;
    }
    return this.imageUrls[this.urlIndex++];
  }
  
  init() {
    // Cache column width once (avoid layout recalc on every createItem)
    this.columnWidth = this.container.offsetWidth;
  }
  
  /**
   * Create item DOM but DON'T start loading yet (queue it)
   */
  createItem() {
    const url = this.getNextUrl();
    const columnWidth = this.columnWidth || this.container.offsetWidth;
    
    const pin = document.createElement('div');
    pin.className = 'pin_at_home-pin';
    pin.dataset.url = url;
    pin.style.cssText = 'position: absolute; left: 0; right: 0; visibility: hidden; height: 0px;';
    
    const img = document.createElement('img');
    img.alt = 'Pin image';
    img.decoding = 'async';
    // DON'T set img.src yet - queue it for controlled loading
    
    pin.onclick = () => openFullscreenViewer(url);
    pin.appendChild(img);
    this.track.appendChild(pin);
    
    // Add to load queue (NOT loading yet)
    this.loadQueue.push({ element: pin, url, img, columnWidth });
  }
  
  /**
   * Start loading queued items (respects maxLoading limit)
   */
  processLoadQueue() {
    // Only load up to maxLoading at a time
    while (this.loadingItems.length < LOADING_CONFIG.maxLoading && this.loadQueue.length > 0) {
      const item = this.loadQueue.shift();
      this.startLoading(item);
    }
  }
  
  /**
   * Actually start loading an image
   */
  startLoading(item) {
    const { img, url, columnWidth } = item;
    
    this.loadingItems.push(item);
    
    // No decode() - browser handles it naturally during paint
    img.onload = () => {
      const height = img.naturalHeight * (columnWidth / img.naturalWidth);
      this.onImageLoaded(item, height);
    };
    
    img.onerror = () => {
      item.element.remove();
      const idx = this.loadingItems.indexOf(item);
      if (idx >= 0) this.loadingItems.splice(idx, 1);
    };
    
    // NOW start loading
    img.src = url;
  }
  
  /**
   * Called when image finishes loading
   */
  onImageLoaded(item, height) {
    // Remove from loading
    const idx = this.loadingItems.indexOf(item);
    if (idx >= 0) this.loadingItems.splice(idx, 1);
    
    // Add to reveal queue
    this.revealQueue.push({ pendingItem: item, height });
  }
  
  /**
   * Reveal image - position is local to track (not affected by scroll)
   */
  revealImage(pendingItem, height) {
    const { element: pin, url, img } = pendingItem;
    
    const localTop = this.nextLocalTop;
    
    // Position within track (doesn't change during scroll)
    pin.style.cssText = `position: absolute; left: 0; right: 0; height: ${height}px; top: ${localTop}px; visibility: visible;`;
    img.classList.add('loaded');
    
    const item = { element: pin, url, height, localTop };
    this.items.push(item);
    
    this.nextLocalTop += height;
    this.totalHeight += height;
    
    // isStable: controls recycling (when we have enough height)
    const hasEnoughHeight = this.totalHeight >= this.viewportHeight * 2;
    if (!this.isStable && hasEnoughHeight) {
      this.isStable = true;
    }
    
    // isDoneLoading: controls creation (when all images are loaded)
    const allImagesRevealed = this.items.length >= this.imageUrls.length;
    if (!this.isDoneLoading && allImagesRevealed) {
      this.isDoneLoading = true;
      console.log(`✅ Column done loading: ${this.items.length}/${this.imageUrls.length} images`);
    }
  }
  
  // ======= Budget-controlled methods (called from grid.js) =======
  
  /**
   * Check if this column needs more items created
   */
  needsCreate() {
    if (this.isDoneLoading) return false;
    const inPipeline = this.loadQueue.length + this.loadingItems.length + this.revealQueue.length;
    return inPipeline < 8; // minPending
  }
  
  /**
   * Create one item (DOM only, no loading)
   */
  createOne() {
    this.createItem();
  }
  
  /**
   * Check if we can start another load
   * Note: grid.js controls the actual budget per phase
   */
  canStartLoad() {
    return this.loadQueue.length > 0;
  }
  
  /**
   * Start loading one item from queue
   */
  startOneLoad() {
    if (this.loadQueue.length > 0) {
      const item = this.loadQueue.shift();
      this.startLoading(item);
    }
  }
  
  /**
   * Check if there are items to reveal
   */
  hasItemsToReveal() {
    return this.revealQueue.length > 0;
  }
  
  /**
   * Reveal one item
   */
  revealOne() {
    if (this.revealQueue.length > 0) {
      const { pendingItem, height } = this.revealQueue.shift();
      this.revealImage(pendingItem, height);
    }
  }
  
  /**
   * Update scroll position (always runs, it's cheap)
   */
  updateScroll() {
    if (!this.isPaused && this.items.length >= 1) {
      this.scroll(this.speed);
    }
  }
  
  /**
   * Scroll by moving the track transform (single DOM write!)
   */
  scroll(delta) {
    this.trackOffset += delta;
    
    // Single DOM write for all items!
    this.track.style.transform = `translateY(${this.trackOffset}px)`;
    
    // Only recycle in stable mode (before stable, just let items accumulate)
    if (this.isStable) {
      this.recycleSimple(delta);
    }
    // Skip fillGaps during loading - it's expensive and not needed
  }
  
  /**
   * Simple O(1) recycling for stable mode
   * Only checks first/last item based on scroll direction
   */
  recycleSimple(delta) {
    if (this.items.length < 2) return;
    
    if (delta < 0) {
      // Scrolling UP: first item might go off-screen at top
      const first = this.items[0];
      const firstScreenBottom = this.getScreenTop(first) + first.height;
      
      if (firstScreenBottom < 0) {
        // Move first to end
        const last = this.items[this.items.length - 1];
        first.localTop = last.localTop + last.height;
        first.element.style.top = `${first.localTop}px`;
        this.items.shift();
        this.items.push(first);
      }
    } else {
      // Scrolling DOWN: last item might go off-screen at bottom
      const last = this.items[this.items.length - 1];
      const lastScreenTop = this.getScreenTop(last);
      
      if (lastScreenTop > this.viewportHeight) {
        // Move last to start
        const first = this.items[0];
        last.localTop = first.localTop - last.height;
        last.element.style.top = `${last.localTop}px`;
        this.items.pop();
        this.items.unshift(last);
      }
    }
  }
  
  /**
   * Get item's screen position (localTop + trackOffset)
   */
  getScreenTop(item) {
    return item.localTop + this.trackOffset;
  }
  
  /**
   * Fill gaps by recycling items
   * Note: items array is kept sorted by localTop (lowest first)
   * because revealImage() appends, and recycling uses unshift/push
   */
  fillGaps() {
    if (this.items.length === 0) return;
    
    // Fill gap at TOP
    while (this.items.length > 0) {
      const firstItem = this.items[0];
      const firstScreenTop = this.getScreenTop(firstItem);
      
      if (firstScreenTop <= 0) break; // No gap at top
      
      // Find item off-screen at bottom to recycle
      let recycleIndex = -1;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const screenTop = this.getScreenTop(this.items[i]);
        if (screenTop > this.viewportHeight) {
          recycleIndex = i;
          break;
        }
      }
      
      if (recycleIndex >= 0) {
        const recycled = this.items[recycleIndex];
        // Move to top in track coordinates
        recycled.localTop = firstItem.localTop - recycled.height;
        recycled.element.style.top = `${recycled.localTop}px`;
        // Reorder in array
        this.items.splice(recycleIndex, 1);
        this.items.unshift(recycled);
      } else {
        break;
      }
    }
    
    // Fill gap at BOTTOM
    while (this.items.length > 0) {
      const lastItem = this.items[this.items.length - 1];
      const lastScreenBottom = this.getScreenTop(lastItem) + lastItem.height;
      
      if (lastScreenBottom >= this.viewportHeight) break; // No gap at bottom
      
      // Find item off-screen at top to recycle
      let recycleIndex = -1;
      for (let i = 0; i < this.items.length; i++) {
        const screenBottom = this.getScreenTop(this.items[i]) + this.items[i].height;
        if (screenBottom < 0) {
          recycleIndex = i;
          break;
        }
      }
      
      if (recycleIndex >= 0) {
        const recycled = this.items[recycleIndex];
        // Move to bottom in track coordinates
        recycled.localTop = lastItem.localTop + lastItem.height;
        recycled.element.style.top = `${recycled.localTop}px`;
        // Reorder in array
        this.items.splice(recycleIndex, 1);
        this.items.push(recycled);
      } else {
        break;
      }
    }
    
    // Keep nextLocalTop in sync
    if (this.items.length > 0) {
      const lastItem = this.items[this.items.length - 1];
      this.nextLocalTop = lastItem.localTop + lastItem.height;
    }
  }
}
