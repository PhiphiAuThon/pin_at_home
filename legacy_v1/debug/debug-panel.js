async function viewStorage() {
  const storage = await chrome.storage.local.get(null);
  document.getElementById('storageOutput').textContent = JSON.stringify(storage, null, 2);
}

async function clearAllStorage() {
  if (confirm('Clear all storage? This will sign you out.')) {
    await chrome.storage.local.clear();
    alert('Storage cleared');
    viewStorage();
  }
}

async function viewErrors() {
  const result = await chrome.storage.local.get('errorLog');
  document.getElementById('errorOutput').textContent = JSON.stringify(result.errorLog || [], null, 2);
}

async function clearErrors() {
  await chrome.storage.local.remove('errorLog');
  alert('Errors cleared');
  viewErrors();
}

async function viewAnalytics() {
  const result = await chrome.storage.local.get('analytics');
  document.getElementById('analyticsOutput').textContent = JSON.stringify(result.analytics || [], null, 2);
}

async function clearAnalytics() {
  await chrome.storage.local.remove('analytics');
  alert('Analytics cleared');
  viewAnalytics();
}
