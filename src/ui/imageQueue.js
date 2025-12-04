// Pin@Home - Image Queue Module
// Manages preloading images and providing ready ones with known dimensions

import { CONFIG } from '../config.js';

class ImageQueue {
  constructor() {
    this.readyQueue = [];
    this.loadingPromises = [];
    this.allUrls = [];
    this.currentIndex = 0;
    this.preloadBatchSize = 10; // How many to preload at once
  }

  /**
   * Start preloading images from the given URLs
   * @param {string[]} urls - Array of image URLs to preload
   */
  startPreloading(urls) {
    this.allUrls = urls;
    this.currentIndex = 0;
    this.readyQueue = [];
    this.loadingPromises = [];
    
    if (CONFIG.DEBUG) console.log(`🎬 ImageQueue: Starting preload of ${urls.length} images`);
    
    // Start first batch
    this._preloadNextBatch();
  }

  /**
   * Preload the next batch of images
   * @private
   */
  _preloadNextBatch() {
    const batch = [];
    const startIndex = this.currentIndex;
    const endIndex = Math.min(startIndex + this.preloadBatchSize, this.allUrls.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const url = this.allUrls[i];
      const promise = this._preloadImage(url);
      batch.push(promise);
      this.loadingPromises.push(promise);
    }
    
    this.currentIndex = endIndex;
    
    // When this batch completes, start next batch if needed
    Promise.all(batch).then(() => {
      if (this.currentIndex < this.allUrls.length) {
        this._preloadNextBatch();
      } else {
        if (CONFIG.DEBUG) console.log(`✅ ImageQueue: All ${this.allUrls.length} images processed`);
      }
    });
  }

  /**
   * Preload a single image and add to ready queue
   * @param {string} url - Image URL to preload
   * @returns {Promise}
   * @private
   */
  _preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        this.readyQueue.push({
          url,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
        resolve();
      };
      
      img.onerror = () => {
        console.warn(`⚠️ ImageQueue: Failed to load ${url}`);
        resolve(); // Don't block on errors
      };
      
      img.src = url;
    });
  }

  /**
   * Get a ready image from the queue
   * @returns {{url: string, width: number, height: number}|null}
   */
  getReadyImage() {
    if (this.readyQueue.length === 0) {
      return null;
    }
    
    // Return from front of queue
    return this.readyQueue.shift();
  }

  /**
   * Wait until the queue has at least the specified number of ready images
   * @param {number} count - Minimum number of images needed
   * @returns {Promise<void>}
   */
  async waitForMinimumStock(count) {
    if (CONFIG.DEBUG) console.log(`⏳ ImageQueue: Waiting for ${count} images to be ready...`);
    
    return new Promise((resolve) => {
      const checkStock = () => {
        if (this.readyQueue.length >= count) {
          if (CONFIG.DEBUG) console.log(`✅ ImageQueue: ${this.readyQueue.length} images ready!`);
          resolve();
        } else {
          // Check again in 50ms
          setTimeout(checkStock, 50);
        }
      };
      
      checkStock();
    });
  }

  /**
   * Get current queue status
   * @returns {{ready: number, loading: number, total: number}}
   */
  getStatus() {
    return {
      ready: this.readyQueue.length,
      loading: this.loadingPromises.length,
      total: this.allUrls.length
    };
  }
}

/**
 * Test function - call this to verify the queue works
 */
export async function testImageQueue() {
  console.log('🧪 Testing ImageQueue...');
  
  // Use some test Pinterest images
  const testUrls = [
    'https://i.pinimg.com/236x/8d/3f/c0/8d3fc0c4c5e5c5e5c5e5c5e5c5e5c5e5.jpg',
    'https://i.pinimg.com/236x/1a/2b/3c/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p.jpg',
    'https://i.pinimg.com/236x/aa/bb/cc/aabbccddee.jpg'
  ];
  
  imageQueue.startPreloading(testUrls);
  
  await imageQueue.waitForMinimumStock(2);
  
  const img1 = imageQueue.getReadyImage();
  const img2 = imageQueue.getReadyImage();
  
  console.log('✅ Test passed! Got images:', img1, img2);
  console.log('Queue status:', imageQueue.getStatus());
}

// Export singleton instance
export const imageQueue = new ImageQueue();
