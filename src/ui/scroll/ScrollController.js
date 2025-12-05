// Pin@Home - Scroll Controller
// Manages track transform and scroll offset
// Single responsibility: track position management

/**
 * ScrollController - manages the transform-based scrolling
 * Keeps track of the offset and applies it to the track element
 */
export class ScrollController {
  constructor(track) {
    this.track = track;
    this.offset = 0;
  }
  
  /**
   * Get current offset
   * @returns {number} Current track offset
   */
  getOffset() {
    return this.offset;
  }
  
  /**
   * Set offset to specific value and apply transform
   * @param {number} value - New offset value
   */
  setOffset(value) {
    this.offset = value;
    this.applyTransform();
  }
  
  /**
   * Add delta to current offset (for scrolling)
   * @param {number} delta - Amount to scroll (negative = down, positive = up)
   */
  scroll(delta) {
    this.offset += delta;
    this.applyTransform();
  }
  
  /**
   * Scale offset proportionally (for resize handling)
   * @param {number} ratio - Scale ratio (newHeight / oldHeight)
   */
  scaleOffset(ratio) {
    if (ratio > 0 && isFinite(ratio)) {
      this.offset *= ratio;
      this.applyTransform();
    }
  }
  
  /**
   * Apply the current offset as CSS transform
   */
  applyTransform() {
    this.track.style.transform = `translateY(${this.offset}px)`;
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.offset = 0;
    this.applyTransform();
  }
}
