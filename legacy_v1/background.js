// Background Service Worker for Pinterest Random Pins Extension

// Import dependencies
importScripts('utils/storage.js');
importScripts('auth/session-manager.js');
importScripts('api/manual-board-manager.js');
importScripts('api/hidden-tab-fetcher.js');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Set default preferences
    chrome.storage.local.set({
      preferences: {
        selectedBoards: [],
        pinsPerPage: 12,
        refreshInterval: 60,
        theme: 'dark'
      }
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Listen for messages from content scripts and new tab page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received message:', request.action);
  
  switch (request.action) {
    case 'checkSession':
      SessionManager.checkSession()
        .then(isValid => sendResponse({ success: true, loggedIn: isValid }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'openLogin':
      SessionManager.openLogin();
      sendResponse({ success: true });
      return false;
      
    case 'addBoards':
      ManualBoardManager.addBoards(request.boards)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getBoards':
      ManualBoardManager.getAllBoards()
        .then(boards => sendResponse({ success: true, data: boards }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'removeBoard':
      ManualBoardManager.removeBoard(request.boardId)
        .then(boards => sendResponse({ success: true, data: boards }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'fetchPins':
      HiddenTabFetcher.fetchPinsFromBoards(request.boardUrls, request.count)
        .then(pins => sendResponse({ success: true, data: pins }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

console.log('🚀 Background service worker initialized (Manual Board Manager)');
