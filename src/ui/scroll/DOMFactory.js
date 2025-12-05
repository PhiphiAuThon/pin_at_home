// Pin@Home - DOM Factory
// Creates pin elements for both initial load and duplicates

import { openFullscreenViewer } from '../fullscreenViewer.js';

/**
 * Create a pin element (container + image)
 * @param {string} url - Image URL
 * @returns {{ element: HTMLElement, img: HTMLImageElement }}
 */
export function createPinElement(url) {
  const pin = document.createElement('div');
  pin.className = 'pin_at_home-pin';
  pin.dataset.url = url;
  pin.style.cssText = 'position: absolute; left: 0; right: 0; visibility: hidden; height: 0px;';
  
  const img = document.createElement('img');
  img.alt = 'Pin image';
  img.decoding = 'async';
  
  pin.onclick = () => openFullscreenViewer(url);
  pin.appendChild(img);
  
  return { element: pin, img };
}
