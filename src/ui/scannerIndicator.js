// Pin@Home - Scanner Indicator
// Discreet status indicator for Pinterest pages (no overlay)

/**
 * Create the scanner indicator element
 * @returns {HTMLElement}
 */
export function createScannerIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'pin_at_home-indicator';
  indicator.innerHTML = `
    <span class="indicator-icon">📌</span>
    <span class="indicator-text">Scanning...</span>
  `;
  return indicator;
}

/**
 * Update indicator with scan progress
 * @param {number} count - Number of pins found
 * @param {boolean} isDone - Whether scanning is complete
 */
export function updateIndicator(count, isDone) {
  const indicator = document.getElementById('pin_at_home-indicator');
  if (!indicator) return;
  
  const textEl = indicator.querySelector('.indicator-text');
  if (!textEl) return;
  
  if (isDone) {
    textEl.textContent = `Done! ${count} pins cached ✓`;
    indicator.classList.add('done');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 3000);
  } else {
    textEl.textContent = `Found ${count} pins...`;
  }
}

/**
 * Show error state
 * @param {string} message
 */
export function showIndicatorError(message) {
  const indicator = document.getElementById('pin_at_home-indicator');
  if (!indicator) return;
  
  const textEl = indicator.querySelector('.indicator-text');
  if (textEl) {
    textEl.textContent = message;
    indicator.classList.add('error');
  }
}
