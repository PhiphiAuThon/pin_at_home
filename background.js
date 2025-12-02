// Background Service Worker for Pinterest Random Pins Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Set default preferences
    chrome.storage.local.set({
      preferences: {
        selectedBoards: [],
        pinsPerPage: 12,
        refreshInterval: 'daily',
        theme: 'dark'
      }
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Listen for messages from content scripts and new tab page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  switch (request.action) {
    case 'authenticate':
      handleAuthentication()
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'fetchBoards':
      fetchUserBoards()
        .then(boards => sendResponse({ success: true, data: boards }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'fetchPins':
      fetchRandomPins(request.boardIds, request.count)
        .then(pins => sendResponse({ success: true, data: pins }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'refreshToken':
      refreshAccessToken()
        .then(token => sendResponse({ success: true, data: token }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Placeholder functions (will be implemented in later phases)
async function handleAuthentication() {
  // Will implement OAuth flow in Phase 3
  throw new Error('Not implemented yet');
}

async function fetchUserBoards() {
  // Will implement in Phase 4
  throw new Error('Not implemented yet');
}

async function fetchRandomPins(boardIds, count) {
  // Will implement in Phase 4
  throw new Error('Not implemented yet');
}

async function refreshAccessToken() {
  // Will implement in Phase 3
  throw new Error('Not implemented yet');
}

// Alarm listener for periodic token refresh
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tokenRefresh') {
    console.log('Refreshing access token...');
    refreshAccessToken().catch(console.error);
  }
});

// Set up token refresh alarm (check every 24 hours)
chrome.alarms.create('tokenRefresh', {
  periodInMinutes: 1440 // 24 hours
});

console.log('Background service worker initialized');
