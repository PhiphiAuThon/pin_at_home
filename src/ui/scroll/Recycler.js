// Pin@Home - Recycler (Carousel Mode)
// Repositions items that exit viewport to the other end

export class Recycler {
  update(items, trackOffset, viewportHeight) {
    if (items.length < 2) return;
    
    // Buffer to prevent flickering (keep items just off-screen)
    const BUFFER = 200;
    
    // Keep repositioning until all items are within bounds
    let safety = 0;
    const maxIterations = items.length * 4; // Allow multiple passes for fast scrolling
    
    // Check for massive gaps (e.g. 22M pixels) and compact if needed
    let { topmost, bottommost } = this.findBounds(items);
    const spread = (bottommost.localTop + bottommost.height) - topmost.localTop;
    const totalHeight = items.reduce((sum, item) => sum + item.height, 0);
    
    if (spread > totalHeight * 1.5) {
      // console.log('Recycler: Detected gap, compacting...', { spread, totalHeight });
      this.compact(items);
      // Re-fetch bounds after compaction
      const bounds = this.findBounds(items);
      topmost = bounds.topmost;
      bottommost = bounds.bottommost;
    }

    while (safety < maxIterations) {
      // ... existing loop ...
      const { topmost: currentTop, bottommost: currentBottom } = this.findBounds(items);
      let moved = false;
      
      // 1. Top -> Bottom (Scrolling Down)
      const topScreenBottom = currentTop.localTop + trackOffset + currentTop.height;
      const bottomScreenBottom = currentBottom.localTop + trackOffset + currentBottom.height;
      
      const hasGapAtBottom = bottomScreenBottom < viewportHeight;
      const topIsHidden = topScreenBottom < 0;
      
      if (topIsHidden && (hasGapAtBottom || topScreenBottom < -BUFFER)) {
        currentTop.localTop = currentBottom.localTop + currentBottom.height;
        currentTop.element.style.top = `${currentTop.localTop}px`;
        moved = true;
      }
      
      // 2. Bottom -> Top (Scrolling Up)
      const bottomScreenTop = currentBottom.localTop + trackOffset;
      if (bottomScreenTop > viewportHeight + BUFFER) {
        // Recalculate topmost since it might have changed
        const newBounds = this.findBounds(items);
        currentBottom.localTop = newBounds.topmost.localTop - currentBottom.height;
        currentBottom.element.style.top = `${currentBottom.localTop}px`;
        moved = true;
      }
      
      if (!moved) break;
      safety++;
    }
  }
  
  /**
   * Re-stack items contiguously to heal gaps
   * Preserves the position of the topmost item
   */
  compact(items) {
    // Sort by current position
    items.sort((a, b) => a.localTop - b.localTop);
    
    let currentTop = items[0].localTop;
    for (const item of items) {
      item.localTop = currentTop;
      item.element.style.top = `${currentTop}px`;
      currentTop += item.height;
    }
  }
  
  findBounds(items) {
    let topmost = items[0];
    let bottommost = items[0];
    for (const item of items) {
      if (item.localTop < topmost.localTop) topmost = item;
      if (item.localTop > bottommost.localTop) bottommost = item;
    }
    return { topmost, bottommost };
  }
}
