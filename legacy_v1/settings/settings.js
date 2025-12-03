// Settings Page Logic - Manual Board Management

console.log('⚙️ Settings page loaded');

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const connectBtn = document.getElementById('connect-btn');
const boardUrlsTextarea = document.getElementById('board-urls');
const addBoardsBtn = document.getElementById('add-boards-btn');
const validationFeedback = document.getElementById('validation-feedback');
const boardsList = document.getElementById('boards-list');
const pinsPerPageInput = document.getElementById('pins-per-page');
const refreshIntervalSelect = document.getElementById('refresh-interval');
const savePrefsBtn = document.getElementById('save-prefs-btn');

// State
let allBoards = [];
let selectedBoardIds = [];

// ============================================
// Initialize
// ============================================

async function init() {
  await checkSession();
  await loadBoards();
  await loadPreferences();
  setupEventListeners();
}

// ============================================
// Session Check
// ============================================

async function checkSession() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkSession' });
    
    if (response.success && response.loggedIn) {
      updateStatus('connected', '✅ Pinterest Connected');
      connectBtn.style.display = 'none';
    } else {
      updateStatus('disconnected', '❌ Not Connected');
      connectBtn.style.display = 'block';
    }
  } catch (error) {
    console.error('Session check failed:', error);
    updateStatus('unknown', '⚠️ Error checking connection');
  }
}

function updateStatus(state, text) {
  statusIndicator.className = `status-${state}`;
  statusText.textContent = text;
}

// ============================================
// Board Management
// ============================================

async function loadBoards() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getBoards' });
    
    if (response.success) {
      allBoards = response.data || [];
      console.log('Loaded boards:', allBoards.length);
      renderBoards();
    } else {
      console.error('Failed to load boards:', response.error);
      showFeedback('error', `Error loading boards: ${response.error}`);
    }
  } catch (error) {
    console.error('Error loading boards:', error);
    showFeedback('error', `Error: ${error.message}`);
  }
}

async function handleAddBoards() {
  const urlsText = boardUrlsTextarea.value.trim();
  
  if (!urlsText) {
    showFeedback('error', 'Please paste at least one board URL.');
    return;
  }
  
  // Disable button during processing
  addBoardsBtn.disabled = true;
  addBoardsBtn.textContent = 'Adding...';
  
  try {
    // Parse locally first to show immediate feedback
    const lines = urlsText.split('\n').map(l => l.trim()).filter(Boolean);
    const boards = [];
    const invalid = [];
    
    for (const line of lines) {
      const board = parseBoardUrlLocally(line);
      if (board) {
        boards.push(board);
      } else {
        invalid.push(line);
      }
    }
    
    if (boards.length === 0) {
      showFeedback('error', 'No valid board URLs found. Make sure they follow the format: https://pinterest.com/username/board-name/');
      return;
    }
    
    // Add to storage
    const response = await chrome.runtime.sendMessage({
      action: 'addBoards',
      boards: boards
    });
    
    if (response.success) {
      const { added, total } = response.data;
      
      // Show feedback
      if (invalid.length > 0) {
        showFeedback('warning', 
          `✅ Added ${added} boards (${total} total). ` +
          `⚠️ ${invalid.length} invalid URLs were skipped.`
        );
      } else {
        showFeedback('success', `✅ Successfully added ${added} boards! You now have ${total} total.`);
      }
      
      // Clear textarea
      boardUrlsTextarea.value = '';
      
      // Reload board list
      await loadBoards();
      
    } else {
      showFeedback('error', `❌ Error: ${response.error}`);
    }
    
  } catch (error) {
    console.error('Error adding boards:', error);
    showFeedback('error', `❌ Error: ${error.message}`);
  } finally {
    // Re-enable button
    addBoardsBtn.disabled = false;
    addBoardsBtn.textContent = 'Add Boards';
  }
}

// Local URL parser (simplified version for client-side validation)
function parseBoardUrlLocally(url) {
  try {
    url = url.trim();
    
    let path;
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      path = urlObj.pathname;
    } else if (url.startsWith('/')) {
      path = url;
    } else {
      return null;
    }
    
    const match = path.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (!match) return null;
    
    const [, username, slug] = match;
    
    return {
      id: `${username}-${slug}`,
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      url: `/${username}/${slug}/`,
      fullUrl: `https://www.pinterest.com/${username}/${slug}/`,
      username,
      slug,
      addedAt: Date.now()
    };
  } catch {
    return null;
  }
}

async function handleRemoveBoard(boardId) {
  if (!confirm('Are you sure you want to remove this board?')) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'removeBoard',
      boardId: boardId
    });
    
    if (response.success) {
      showFeedback('success', '✅ Board removed!');
      await loadBoards();
    } else {
      showFeedback('error', `❌ Error: ${response.error}`);
    }
  } catch (error) {
    console.error('Error removing board:', error);
    showFeedback('error', `❌ Error: ${error.message}`);
  }
}

function renderBoards() {
  if (allBoards.length === 0) {
    boardsList.innerHTML = '<p class="empty-state">No boards added yet. Add some above!</p>';
    return;
  }
  
  boardsList.innerHTML = allBoards.map(board => `
    <div class="board-card ${selectedBoardIds.includes(board.id) ? 'selected' : ''}" 
         data-board-id="${board.id}">
      <button class="remove-btn" title="Remove board" data-board-id="${board.id}">×</button>
      <h3>${escapeHtml(board.name)}</h3>
      <div class="board-url">${escapeHtml(board.url)}</div>
      <div class="board-meta">
        <span>@${escapeHtml(board.username)}</span>
        <span>${selectedBoardIds.includes(board.id) ? '✓ Selected' : 'Click to select'}</span>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to cards
  document.querySelectorAll('.board-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('remove-btn')) {
        toggleBoardSelection(card.dataset.boardId);
      }
    });
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRemoveBoard(btn.dataset.boardId);
    });
  });
}

function toggleBoardSelection(boardId) {
  const index = selectedBoardIds.indexOf(boardId);
  
  if (index === -1) {
    selectedBoardIds.push(boardId);
  } else {
    selectedBoardIds.splice(index, 1);
  }
  
  saveSelectedBoards();
  renderBoards();
}

async function saveSelectedBoards() {
  try {
    const prefs = {
      selectedBoards: selectedBoardIds,
      pinsPerPage: parseInt(pinsPerPageInput.value),
      refreshInterval: parseInt(refreshIntervalSelect.value)
    };
    
    await chrome.storage.local.set({ preferences: prefs });
    console.log('✅ Preferences saved:', prefs);
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

// ============================================
// Preferences
// ============================================

async function loadPreferences() {
  try {
    const result = await chrome.storage.local.get('preferences');
    const prefs = result.preferences || {};
    
    selectedBoardIds = prefs.selectedBoards || [];
    pinsPerPageInput.value = prefs.pinsPerPage || 12;
    refreshIntervalSelect.value = prefs.refreshInterval || 60;
    
    console.log('Loaded preferences:', prefs);
    renderBoards();
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

async function handleSavePreferences() {
  await saveSelectedBoards();
  showFeedback('success', '✅ Preferences saved!');
}

// ============================================
// Helpers
// ============================================

function showFeedback(type, message) {
  validationFeedback.className = `feedback ${type}`;
  validationFeedback.textContent = message;
  validationFeedback.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    validationFeedback.style.display = 'none';
  }, 5000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      window.open('https://www.pinterest.com', '_blank');
      
      // Auto-recheck session when user comes back
      const focusHandler = async () => {
        console.log('🔍 Window focused, rechecking session...');
        await checkSession();
        // Remove listener after first check
        window.removeEventListener('focus', focusHandler);
      };
      
      // Add focus listener
      window.addEventListener('focus', focusHandler);
    });
  }
  
  if (addBoardsBtn) {
    addBoardsBtn.addEventListener('click', handleAddBoards);
  }
  
  if (savePrefsBtn) {
    savePrefsBtn.addEventListener('click', handleSavePreferences);
  }
  
  // Auto-save preferences when they change
  if (pinsPerPageInput) {
    pinsPerPageInput.addEventListener('change', saveSelectedBoards);
  }
  
  if (refreshIntervalSelect) {
    refreshIntervalSelect.addEventListener('change', saveSelectedBoards);
  }
}

// ============================================
// Initialize
// ============================================

init();
