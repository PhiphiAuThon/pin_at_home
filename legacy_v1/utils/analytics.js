// Privacy-friendly local analytics

async function trackEvent(eventName, data = {}) {
  const event = {
    name: eventName,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  // Store locally only
  const result = await chrome.storage.local.get('analytics');
  const analytics = result.analytics || [];
  
  analytics.push(event);
  
  // Keep only last 100 events
  if (analytics.length > 100) {
    analytics.shift();
  }
  
  await chrome.storage.local.set({ analytics });
}

async function getAnalytics() {
  const result = await chrome.storage.local.get('analytics');
  return result.analytics || [];
}

async function clearAnalytics() {
  await chrome.storage.local.remove('analytics');
}

// Export
if (typeof window !== 'undefined') {
  window.Analytics = {
    trackEvent,
    getAnalytics,
    clearAnalytics
  };
}
