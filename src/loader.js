// Pin@Home Loader
// Scanner-only mode on Pinterest, full overlay on new tab
// Supports SPA navigation (detects URL changes)

const NON_BOARD_PATTERNS = ['search', 'pin', 'ideas', 'today', 'explore', 'settings', 'resource', '_', 'business'];

function isBoardPage(path) {
  const segments = path.split('/').filter(s => s.length > 0);
  return segments.length === 2 && !NON_BOARD_PATTERNS.includes(segments[0].toLowerCase());
}

async function loadScanner() {
  // Prevent multiple loads
  if (document.getElementById('pin_at_home-indicator')) return;
  
  try {
    const scannerOnlySrc = chrome.runtime.getURL('src/scannerOnly.js');
    await import(scannerOnlySrc);
  } catch (e) {
    console.error('Pin@Home: Failed to load scanner', e);
  }
}

function checkAndInject() {
  const path = window.location.pathname;
  
  if (isBoardPage(path)) {
    // Wait a moment for page to stabilize after navigation
    setTimeout(() => {
      if (isBoardPage(window.location.pathname) && document.body) {
        loadScanner();
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

