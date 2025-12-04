// Pin@Home State Management

/**
 * Application state
 */
export const state = {
  isActive: true,
  pinsFound: [],
  scanAttempts: 0,
  overlay: null,
  grid: null,
  loading: null,
  cacheKey: '',
  boardName: '',
  // Refsheet feature state
  refsheetMode: false,
  selectedImages: [],
  refsheetCanvas: null,
  browseGallery: null,
  sidepanel: null,
  // New tab mode
  isNewTabMode: false
};

/**
 * Reset state to initial values
 */
export function resetState() {
  state.isActive = true;
  state.pinsFound = [];
  state.scanAttempts = 0;
  state.overlay = null;
  state.grid = null;
  state.loading = null;
  state.cacheKey = '';
  state.boardName = '';
  state.refsheetMode = false;
  state.selectedImages = [];
  state.refsheetCanvas = null;
  state.browseGallery = null;
  state.sidepanel = null;
  state.isNewTabMode = false;
}

/**
 * Update state with new values
 * @param {Object} updates - Object containing state updates
 */
export function updateState(updates) {
  Object.assign(state, updates);
}
