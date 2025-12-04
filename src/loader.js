// Pin@Home Loader
// Scanner-only mode on Pinterest, full overlay on new tab
// Supports SPA navigation (detects URL changes)

const NON_BOARD_PATTERNS = ['search', 'pin', 'ideas', 'today', 'explore', 'settings', 'resource', '_', 'business'];

function isBoardPage(path) {
  const segments = path.split('/').filter(s => s.length > 0);
  return segments.length === 2 && !NON_BOARD_PATTERNS.includes(segments[0].toLowerCase());
}

function injectIndicator() {
  // Remove existing indicator if any
  const existing = document.getElementById('pin_at_home-indicator');
  if (existing) existing.remove();
  
  const indicator = document.createElement('div');
  indicator.id = 'pin_at_home-indicator';
  indicator.className = 'clickable';
  indicator.innerHTML = `
    <span class="indicator-icon">📌</span>
    <span class="indicator-text">Scan this board?</span>
  `;
  indicator.style.cursor = 'pointer';
  
  // Click to start scanning
  indicator.onclick = async () => {
    indicator.onclick = null;
    indicator.style.cursor = 'default';
    indicator.classList.remove('clickable');
    indicator.querySelector('.indicator-text').textContent = 'Scanning...';
    
    try {
      const scannerOnlySrc = chrome.runtime.getURL('src/scannerOnly.js');
      await import(scannerOnlySrc);
    } catch (e) {
      console.error('Pin@Home: Scanner failed', e);
      indicator.remove();
    }
  };
  
  document.body.appendChild(indicator);
}

function checkAndInject() {
  const path = window.location.pathname;
  
  if (isBoardPage(path)) {
    // Wait a moment for page to stabilize after navigation
    setTimeout(() => {
      if (isBoardPage(window.location.pathname) && document.body) {
        injectIndicator();
      }
    }, 500);
  } else {
    // Remove indicator if we navigated away from a board
    const existing = document.getElementById('pin_at_home-indicator');
    if (existing) existing.remove();
  }
}

// Initial check
if (document.body) {
  checkAndInject();
} else {
  document.addEventListener('DOMContentLoaded', checkAndInject);
}

// Watch for SPA navigation (URL changes without page reload)
let lastUrl = window.location.href;

const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('🧘 Pin@Home: URL changed, checking for board page...');
    checkAndInject();
  }
});

// Observe changes to the document (Pinterest modifies DOM on navigation)
urlObserver.observe(document, { subtree: true, childList: true });

// Also listen to popstate for browser back/forward
window.addEventListener('popstate', () => {
  setTimeout(checkAndInject, 100);
});

