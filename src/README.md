# Pin@Home Source Code Structure

This directory contains the ES6 module source code for the Pin@Home Chrome extension.

## Entry Points

### � `loader.js`
**Purpose**: Content script entry point for Pinterest pages
- Detects board pages and shows a "Scan this board?" indicator
- Supports SPA navigation (detects URL changes without page reload)
- Dynamically imports `scannerOnly.js` when user clicks to scan

### 🏠 `newtab.js`
**Purpose**: New tab page entry point
- Displays cached pins from previously scanned boards
- Board selector dropdown for switching between boards
- Remembers last visited board

## Core Modules

### 📋 `config.js`
**Purpose**: Central configuration management
- Grid settings (rows, columns, image width)
- Browse mode configuration
- Scanning intervals and thresholds
- Loading phase configuration (for smooth image loading)
- Exports: `CONFIG` object

### 🗂️ `state.js`
**Purpose**: Application state management
- Manages global application state (pins, overlay, grid, etc.)
- Provides helper functions for state manipulation
- Exports: `state` object, `resetState()`, `updateState()`

### 🛠️ `utils.js`
**Purpose**: Utility functions
- URL validation (`isBoardPage()`)
- Board name extraction (`extractBoardName()`)
- Cache key generation (`generateCacheKey()`)
- Error handling (`isContextInvalidated()`, `showReloadNotification()`)
- Auto-scroll functionality (`autoScroll()`)

### 💾 `cache.js`
**Purpose**: Cache management
- Load pins from Chrome storage (`loadFromCache()`)
- Save pins with FIFO logic (`saveToCache()`)
- Get all cached boards (`getAllCachedBoards()`)
- Last visited board tracking (`getLastVisitedBoard()`, `saveLastVisitedBoard()`)
- Clear cache functions

### 🔍 `scanner.js`
**Purpose**: Full page scanning logic
- Scans Pinterest pages for pin images
- Filters for high-quality images (>200x200px)
- Auto-scrolls to load more pins
- Triggers overlay display after scanning
- Exports: `startScanning()`

### ⚡ `scannerOnly.js`
**Purpose**: Lightweight scanner mode
- Scans current board without showing overlay
- Shows progress indicator
- Only caches images for later viewing in new tab

### 🚀 `early-init.js`
**Purpose**: Fast startup for overlay mode
- Self-contained (no imports for speed)
- Pre-loads cache while other modules load
- Creates grid structure immediately
- Exports: `cachePromise`, `earlyGrid`, etc.

### 🎯 `main.js`
**Purpose**: Main orchestration
- Initializes the extension in overlay mode
- Coordinates between modules
- Manages application lifecycle

## UI Modules (`ui/`)

### `index.js`
Barrel export for UI modules - re-exports public API.

### `overlay.js`
Creates and manages the dark overlay that covers Pinterest.

### `grid.js`
Grid layout rendering and pin display in random shuffle mode.

### `browseMode.js`
Infinite scroll browsing through all cached pins.

### `columnScroller.js`
Column-based scrolling with staggered reveal animation.

### `imageQueue.js`
Throttled image loading to prevent RAM spikes.

### `fullscreenViewer.js`
Fullscreen image viewing with navigation.

### `refsheetCanvas.js`
Reference sheet creation from selected pins.

### `sidepanel.js`
Side panel with board info and action buttons.

### `selection.js`
Pin selection handling for refsheet mode.

### `scannerIndicator.js`
Scanning progress indicator UI.

## Module Dependencies

```
newtab.js (New Tab Page)
├── config.js
├── state.js
├── cache.js
└── ui/
    ├── grid.js
    └── browseMode.js

loader.js (Content Script)
└── scannerOnly.js
    ├── config.js
    ├── cache.js
    └── scanner.js (subset)

main.js (Overlay Mode - legacy)
├── early-init.js
├── state.js
├── utils.js
├── cache.js
├── scanner.js
└── ui/
    └── (all UI modules)
```

## How It Works

1. **New Tab Page**: `newtab.html` loads `newtab.js` as an ES6 module, which displays cached pins
2. **Pinterest Page**: `loader.js` runs as content script, shows indicator on board pages
3. **Scanning**: User clicks indicator → `scannerOnly.js` scans and caches pins
4. **Viewing**: Next new tab shows the cached pins from scanned boards

## Adding New Features

1. Identify which module the feature belongs to (or create a new module)
2. Add the function to the appropriate module
3. Export it if other modules need to use it
4. Import it in the modules that need it
5. Update this README with the new functionality

## Best Practices

- Keep modules focused on a single responsibility
- Use clear, descriptive function names
- Export only what's needed by other modules
- Keep configuration in `config.js`
- Keep state management in `state.js`
- Document complex logic with comments
