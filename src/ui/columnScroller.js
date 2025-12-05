// Pin@Home - Column Scroller Module

import { calculateItemPositions } from './scroll/LayoutCalculator.js';
import { ItemManager } from './scroll/ItemManager.js';
import { Recycler } from './scroll/Recycler.js';
import { createPinElement } from './scroll/DOMFactory.js';

const LOADING_CONFIG = {
  maxLoading: 3,
  minPending: 8
};

export class ColumnScroller {
  constructor(container, track, imageUrls, speed) {
    this.container = container;
    this.track = track;
    this.imageUrls = [...imageUrls];
    this.urlIndex = 0;
    this.speed = speed;
    this.trackOffset = 0;
    this.columnWidth = 0;
    
    this.itemManager = new ItemManager();
    this.recycler = new Recycler();
    
    this.isDoneLoading = false;
    this.isPaused = false;
    this.hoverPause = false;
    
    this.container.addEventListener('mouseenter', () => this.hoverPause = true);
    this.container.addEventListener('mouseleave', () => this.hoverPause = false);
    this.container.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  }
  
  get items() { return this.itemManager.visibleItems; }
  get totalHeight() { return this.itemManager.totalHeight; }
  get isStable() { return this.totalHeight >= window.innerHeight * 2; }
  
  handleWheel(e) {
    e.preventDefault();
    this.scroll(-e.deltaY * 0.5);
  }
  
  getNextUrl() {
    if (this.urlIndex >= this.imageUrls.length) {
      return null;
    }
    return this.imageUrls[this.urlIndex++];
  }
  
  init() {
    this.columnWidth = this.container.offsetWidth;
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }
  
  createItem() {
    const url = this.getNextUrl();
    if (!url) {
      this.isDoneLoading = true;
      return;
    }
    
    const columnWidth = this.columnWidth || this.container.offsetWidth;
    const { element, img } = createPinElement(url);
    
    this.track.appendChild(element);
    this.itemManager.addItem({ element, url, img, columnWidth });
  }
  
  startLoading(item) {
    const { img, url, columnWidth } = item;
    
    img.onload = () => {
      const height = img.naturalHeight * (columnWidth / img.naturalWidth);
      this.itemManager.markReady(item, height);
    };
    
    img.onerror = () => {
      item.element.remove();
      this.itemManager.removeItem(item);
    };
    
    img.src = url;
  }
  
  revealImage(item) {
    const { element: pin, img, height } = item;
    const localTop = this.itemManager.nextLocalTop;
    
    pin.style.cssText = `position: absolute; left: 0; right: 0; height: ${height}px; top: ${localTop}px; visibility: visible;`;
    img.classList.add('loaded');
    
    item.localTop = localTop;
    this.itemManager.reveal(item, localTop);
    
    if (!this.isDoneLoading && this.items.length >= this.imageUrls.length) {
      this.isDoneLoading = true;
    }
  }
  
  // === Budget-controlled methods (called from grid.js) ===
  
  needsCreate() {
    if (this.isDoneLoading) return false;
    return this.itemManager.pipelineCount < LOADING_CONFIG.minPending;
  }
  
  createOne() {
    this.createItem();
  }
  
  canStartLoad() {
    return this.itemManager.pendingItems.length > 0;
  }
  
  startOneLoad() {
    const pending = this.itemManager.pendingItems;
    if (pending.length > 0) {
      const item = pending[0];
      this.itemManager.startLoading(item);
      this.startLoading(item);
    }
  }
  
  hasItemsToReveal() {
    return this.itemManager.readyItems.length > 0;
  }
  
  revealOne() {
    const ready = this.itemManager.readyItems;
    if (ready.length > 0) {
      this.revealImage(ready[0]);
    }
  }
  
  /**
   * Add a cloned image with known height (called by grid for cross-column filling)
   * @param {string} url - Image URL (already cached)
   * @param {number} height - Pre-calculated height for this column width
   */
  addClonedImage(url, height) {
    const { element, img } = createPinElement(url);
    img.src = url; // already cached, loads instantly
    
    const localTop = this.itemManager.nextLocalTop;
    element.style.cssText = `position: absolute; left: 0; right: 0; height: ${height}px; top: ${localTop}px; visibility: visible;`;
    img.classList.add('loaded');
    
    this.track.appendChild(element);
    
    this.itemManager.addClone({
      element, url, img,
      height,
      localTop
    });
  }
  
  /**
   * Check if this column needs more content to fill viewport
   */
  needsFilling() {
    return this.totalHeight < window.innerHeight * 2;
  }
  
  updateScroll() {
    if (!this.isPaused && !this.hoverPause && this.items.length >= 1) {
      this.scroll(this.speed);
    }
  }
  
  scroll(delta) {
    this.trackOffset += delta;
    this.track.style.transform = `translateY(${this.trackOffset}px)`;
    this.recycler.update(this.items, this.trackOffset, window.innerHeight);
  }
  
  onResize() {
    const newWidth = this.container.offsetWidth;
    if (newWidth === this.columnWidth || newWidth === 0) return;
    
    // Sync array order with visual order (Recycler changes visual, not array)
    this.itemManager.sortByPosition();
    
    const visibleItems = this.itemManager.visibleItems;
    if (visibleItems.length === 0) {
      this.columnWidth = newWidth;
      return;
    }
    
    // Find anchor item (closest to viewport top) to preserve scroll position
    let anchorItem = visibleItems[0];
    let minDistance = Math.abs(anchorItem.localTop + this.trackOffset);
    
    for (const item of visibleItems) {
      const distance = Math.abs(item.localTop + this.trackOffset);
      if (distance < minDistance) {
        minDistance = distance;
        anchorItem = item;
      }
    }
    
    const anchorScreenTop = anchorItem.localTop + this.trackOffset;
    
    // Recalculate layout
    const positions = calculateItemPositions(visibleItems, newWidth);
    
    visibleItems.forEach((item, i) => {
      if (positions[i]) {
        this.itemManager.updatePosition(item, positions[i].height, positions[i].top);
        item.element.style.height = `${item.height}px`;
        item.element.style.top = `${item.localTop}px`;
      }
    });
    
    this.columnWidth = newWidth;
    
    // Restore scroll position relative to anchor
    // newTrackOffset + anchor.newLocalTop = anchorScreenTop
    this.trackOffset = anchorScreenTop - anchorItem.localTop;
    this.track.style.transform = `translateY(${this.trackOffset}px)`;
    
    // Reset flag so grid fills gaps if needed
    // (This is handled by grid.js listener, but good to know)
  }
}
