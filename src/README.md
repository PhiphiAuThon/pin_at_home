# Pin@Home Source Code Structure

This directory contains the modular source code for the Pin@Home Chrome extension.

## Module Overview

### 📋 `config.js`
**Purpose**: Central configuration management
- Contains all configuration constants (scan intervals, cache sizes, grid settings, etc.)
- Easy to modify settings in one place
- Exports: `CONFIG` object

### 🗂️ `state.js`
**Purpose**: Application state management
- Manages the global application state
- Provides helper functions for state manipulation
- Exports: `state` object, `resetState()`, `updateState()`

### 🛠️ `utils.js`
**Purpose**: Utility functions
- URL validation (`isBoardPage()`)
- Board name extraction (`extractBoardName()`)
- Cache key generation (`generateCacheKey()`)
- Error handling (`isContextInvalidated()`, `showReloadNotification()`)
- Auto-scroll functionality (`autoScroll()`)
- Exports: Various utility functions

### 💾 `cache.js`
**Purpose**: Cache management
- Load pins from Chrome storage (`loadFromCache()`)
- Save pins to Chrome storage with FIFO logic (`saveToCache()`)
- Clear cache for current board (`clearCurrentBoardCache()`)
- Clear all caches (`clearAllCache()`)
- Exports: Cache management functions

### 🔍 `scanner.js`
**Purpose**: Page scanning logic
- Scans Pinterest pages for pin images
- Filters for high-quality images (>200x200px)
- Extracts and deduplicates image URLs
- Manages scan intervals and attempts
- Exports: `startScanning()`

### 🎨 `ui.js`
**Purpose**: User interface management
- Creates and manages the overlay UI
- Renders pins in a grid layout
- Handles user interactions (shuffle, clear cache, exit)
- Manages UI state and animations
- Exports: `injectOverlayWhenReady()`, `renderPins()`

### 🚀 `main.js`
**Purpose**: Main entry point and orchestration
- Initializes the extension
- Coordinates all modules
- Manages the application lifecycle
- Entry point for the content script

## Module Dependencies

```
main.js
├── state.js
├── utils.js
│   └── config.js
├── cache.js
│   ├── config.js
│   ├── state.js
│   └── utils.js
├── scanner.js
│   ├── config.js
│   ├── state.js
│   └── cache.js
└── ui.js
    ├── config.js
    ├── state.js
    ├── cache.js
    ├── utils.js
    └── scanner.js
```

## How It Works

1. **content.js** (loader) injects **main.js** as an ES6 module
2. **main.js** imports and coordinates all other modules
3. Modules use ES6 import/export syntax for clean dependencies
4. All modules are loaded via Chrome's web_accessible_resources

## Adding New Features

To add new functionality:

1. Identify which module it belongs to (or create a new module)
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
