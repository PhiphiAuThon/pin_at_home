# Pin@Home

Pinterest overlay for displaying random pins from a board.
I personally set a Pinterest board as new tab page on my browser to get random inspiration.

## ✨ Features

- **New Tab Override**: Opens your Pinterest board as your browser's new tab page
- **Grid View**: Display random pins in a clean, customizable grid layout
- **Browse Mode**: Scroll through your entire pin collection
- **Fullscreen Viewer**: View pins in fullscreen with navigation
- **Refsheet Canvas**: Create reference sheets from selected pins
- **Multi-board Caching**: Pins are cached per board for instant loading

## 🚀 Setup

1.  **Open Extensions Page**
    *   Go to `brave://extensions/` (or `chrome://extensions/`)

2.  **Load the Extension**
    *   If you have an old version of "Pin@Home" loaded, **remove it** or disable it.
    *   Click **"Load unpacked"**.
    *   Select the **`pin_at_home`** folder (`Documents/dev/pin_at_home`).

## 📁 Project Structure

```
pin_at_home/
├── src/                      # ES6 module source code
│   ├── config.js            # Configuration constants
│   ├── state.js             # State management
│   ├── utils.js             # Utility functions
│   ├── cache.js             # Cache management (Chrome storage)
│   ├── scanner.js           # Page scanning logic
│   ├── scannerOnly.js       # Lightweight scanner for new tab
│   ├── loader.js            # Module loader (content script entry)
│   ├── early-init.js        # Early initialization (overlay injection)
│   ├── main.js              # Main entry point
│   ├── newtab.js            # New tab page logic
│   ├── ui.js                # UI barrel export
│   ├── ui/                  # UI components
│   │   ├── grid.js          # Grid rendering
│   │   ├── overlay.js       # Overlay management
│   │   ├── browseMode.js    # Browse mode (infinite scroll)
│   │   ├── fullscreenViewer.js  # Fullscreen pin viewer
│   │   ├── refsheetCanvas.js    # Reference sheet creator
│   │   ├── columnScroller.js    # Column-based scrolling
│   │   ├── imageQueue.js        # Image loading queue
│   │   ├── sidepanel.js         # Side panel UI
│   │   ├── selection.js         # Pin selection handling
│   │   ├── scannerIndicator.js  # Scanning progress indicator
│   │   └── index.js             # UI module exports
│   └── README.md            # Module documentation
├── icons/                   # Extension icons
├── newtab.html              # New tab page HTML
├── styles.css               # All UI styles
├── manifest.json            # Extension manifest (v2.0.0)
└── README.md                # This file
```

## 🧪 How to Test

1.  **Open a New Tab**
    *   Open a new tab to see your cached Pinterest pins displayed in a grid.

2.  **Go to Pinterest**
    *   Navigate to any Pinterest board URL (e.g., `https://www.pinterest.com/your-username/your-board/`).

3.  **Watch the Magic**
    *   As soon as the page loads, the screen should turn dark.
    *   A "Finding Inspiration..." message might appear briefly.
    *   **BAM!** A clean grid of pins should fade in.
    *   Next time you open the page, the overlay will be instantly visible.

4.  **Controls**
    *   **Shuffle**: Pick a new set of random pins from the page.
    *   **Browse**: Enter browse mode to scroll through all pins.
    *   **Refsheet**: Create a reference sheet from selected pins.
    *   **Clear Cache**: Clear cached images for the current board.
    *   **Exit**: Close the overlay and see the normal Pinterest page.

## 🐛 Troubleshooting

*   **"I see the dark screen but no pins!"**
    *   Wait a few seconds. The script is scanning for images.
    *   If nothing happens, try scrolling down a bit (the overlay blocks scrolling, so you might need to Exit, scroll down to load more pins, then refresh).
    *   The extension automatically scrolls to load more pins on initialization.

*   **"It doesn't load on my country's Pinterest (e.g., .fr, .de)"**
    *   Supported domains: `.com`, `.fr`, `.de`, `.co.uk`, `.ca`, `.jp`. If you use another domain, add it into the **manifest.json** file!

*   **"Extension was reloaded" notification appears**
    *   This happens when you reload the extension while a Pinterest page is open.
    *   Simply refresh the Pinterest page to continue using Pin@Home.

## 🏗️ Development

The codebase uses ES6 modules for clean organization:

### Core Modules
- **config.js**: All configuration (grid, cache, scrolling, loading phases)
- **state.js**: Centralized state management
- **utils.js**: URL validation, board name extraction, auto-scroll
- **cache.js**: Chrome storage operations with FIFO logic
- **scanner.js**: Pin detection and extraction

### UI Modules (`src/ui/`)
- **grid.js**: Grid layout and pin rendering
- **overlay.js**: Overlay creation and management
- **browseMode.js**: Infinite scroll browsing
- **fullscreenViewer.js**: Fullscreen image viewing
- **refsheetCanvas.js**: Reference sheet creation
- **columnScroller.js**: Column-based scrolling with stagger effect
- **imageQueue.js**: Throttled image loading
- **sidepanel.js**: Side panel with board info and controls

### Making Changes

The extension now uses ES6 modules natively:

1. Edit the appropriate module file in the `src/` folder
2. Reload the extension in Chrome (`Ctrl+Shift+R` on the extensions page)
3. Refresh the Pinterest page

The `loader.js` file serves as the content script entry point and dynamically imports the other modules.
