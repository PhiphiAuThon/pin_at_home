// Pin@Home - Scanner Indicator
// Progress bar and status indicator for Pinterest pages

/**
 * Create the scanner indicator element with progress bar
 * @param {number} [targetCount] - Optional target pin count
 * @returns {HTMLElement}
 */
export function createScannerIndicator(targetCount = null) {
  const indicator = document.createElement('div');
  indicator.id = 'pin_at_home-indicator';
  
  const countText = targetCount ? `(${targetCount} pins)` : '';
  
  indicator.innerHTML = `
    <div class="indicator-content">
      <div class="indicator-header">
        <span class="indicator-text">Pin@Home </span>
        <button id="pin_at_home-scan-btn" class="indicator-btn">Scan Board ${countText}</button>
      </div>
      <div class="indicator-progress" style="display: none;">
        <div class="indicator-progress-bar"></div>
      </div>
      <div class="indicator-details" style="display: none;"></div>
    </div>
  `;
  return indicator;
}

/**
 * Update indicator with scan progress
 * @param {Object} progress - Progress data
 * @param {number} progress.count - Number of pins found
 * @param {number} [progress.target] - Target pin count
 * @param {number} [progress.scrollPercent] - Scroll progress (0-100)
 * @param {boolean} progress.isDone - Whether scanning is complete
 */
export function updateIndicator(progress) {
  const { count, target, scrollPercent, isDone } = progress;
  
  const indicator = document.getElementById('pin_at_home-indicator');
  if (!indicator) return;
  
  const textEl = indicator.querySelector('.indicator-text');
  const progressBar = indicator.querySelector('.indicator-progress-bar');
  const progressContainer = indicator.querySelector('.indicator-progress');
  const detailsEl = indicator.querySelector('.indicator-details');
  const btn = indicator.querySelector('#pin_at_home-scan-btn');
  
  if (!textEl) return;
  
  // Hide button when scanning starts
  if (btn && !isDone) btn.style.display = 'none';
  
  // Show progress bars
  if (progressContainer) progressContainer.style.display = 'block';
  if (detailsEl) detailsEl.style.display = 'block';
  
  if (isDone) {
    textEl.textContent = `Done! ${count} pins cached ✓`;
    indicator.classList.add('done');
    
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.background = '#4CAF50';
      progressBar.classList.remove('scanning');
    }
    
    if (detailsEl) {
      const percent = target ? Math.round((count / target) * 100) : 100;
      detailsEl.textContent = target ? `${percent}% of board captured` : 'Scan complete';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 5000);
    
  } else {
    // Active scanning state
    textEl.textContent = `Scanning... ${count} found`;
    
    // Calculate progress
    let percent = 0;
    if (target && target > 0) {
      percent = Math.min(95, (count / target) * 100); // Cap at 95% until done
    } else if (scrollPercent) {
      percent = scrollPercent;
    }
    
    // Update progress bar
    if (progressBar) {
      progressBar.style.width = `${Math.max(5, percent)}%`;
      progressBar.classList.add('scanning');
    }
    
    // Update details text
    if (detailsEl) {
      if (target) {
        detailsEl.textContent = `${count} / ${target} pins`;
      } else {
        detailsEl.textContent = 'Scrolling to find pins...';
      }
    }
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
  const progressBar = indicator.querySelector('.indicator-progress-bar');
  
  if (textEl) {
    textEl.textContent = message;
    indicator.classList.add('error');
  }
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.style.background = '#f44336';
  }
}
