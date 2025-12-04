// Pin@Home UI Management
// Backward compatibility - re-exports from modular UI components
//
// The UI has been refactored into smaller modules in src/ui/:
//   - overlay.js      - Main overlay lifecycle
//   - grid.js         - Pin grid rendering & ColumnScroller
//   - fullscreenViewer.js - Fullscreen image viewer
//   - browseMode.js   - Browse mode functionality
//   - selection.js    - Image selection logic
//   - sidepanel.js    - Sidepanel UI
//   - refsheetCanvas.js - Refsheet canvas overlay

export { injectOverlayWhenReady, renderPins } from './ui/index.js';
