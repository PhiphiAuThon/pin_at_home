# Pin@Home

Pinterest overlay for displaying random pins from a board.
I personally set a Pinterest board as new tab page on my browser to get random inspiration.

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
├── src/                  # Modular source code (for development)
│   ├── config.js        # Configuration constants
│   ├── state.js         # State management
│   ├── utils.js         # Utility functions
│   ├── cache.js         # Cache management
│   ├── scanner.js       # Page scanning logic
│   ├── ui.js            # UI management
│   ├── main.js          # Main entry point
│   └── README.md        # Module documentation
├── icons/               # Extension icons
├── content.js           # Bundled content script (all modules combined)
├── styles.css           # UI styles
├── manifest.json        # Extension manifest
└── README.md            # This file
```

**Note**: The `src/` folder contains the modular source code for development and reference. The actual running code is in `content.js`, which bundles all modules together using an IIFE (Immediately Invoked Function Expression) pattern for Chrome extension compatibility.

See [src/README.md](src/README.md) for detailed module documentation.

## 🧪 How to Test

1.  **Go to Pinterest**
    *   Navigate to any Pinterest board URL (e.g., `https://www.pinterest.com/your-username/your-board/`).

2.  **Watch the Magic**
    *   As soon as the page loads, the screen should turn dark.
    *   A "Finding Inspiration..." message might appear briefly.
    *   **BAM!** A clean grid of pins should fade in.
    *   Next time you open the page, the overlay will be instantly visible.

3.  **Controls**
    *   **Shuffle**: Click to pick a new set of random pins from the page.
    *   **Clear Cache**: Clear cached images for the current board.
    *   **Exit**: Click to close the overlay and see the normal Pinterest page.

## 🐛 Troubleshooting

*   **"I see the dark screen but no pins!"**
    *   Wait a few seconds. The script is scanning for images.
    *   If nothing happens, try scrolling down a bit (the overlay blocks scrolling, so you might need to Exit, scroll down to load more pins, then refresh).
    *   The extension automatically scrolls to load more pins on initialization.

*   **"It doesn't load on my country's Pinterest (e.g., .fr, .de)"**
    *   I added support for `.com`, `.fr`, `.de`, `.co.uk`, `.ca`, `.jp`. If you use another domain, add it into the **manifest.json** file!

*   **"Extension was reloaded" notification appears**
    *   This happens when you reload the extension while a Pinterest page is open.
    *   Simply refresh the Pinterest page to continue using Pin@Home.

## 🏗️ Development

The codebase is organized into clear modules for easy maintenance and extension:

- **config.js**: All configuration in one place
- **state.js**: Centralized state management
- **utils.js**: Reusable utility functions
- **cache.js**: Chrome storage operations
- **scanner.js**: Pin detection and extraction
- **ui.js**: User interface and interactions
- **main.js**: Application initialization

### Making Changes

The source code is organized in the `src/` folder as separate modules for clarity. However, Chrome extensions don't fully support ES6 modules in content scripts yet, so the actual running code is in `content.js` as a bundled IIFE.

**To modify the code:**

1. Edit the appropriate module file in the `src/` folder
2. Manually update the corresponding section in `content.js` (marked with `// MODULE: filename.js` comments)
3. Reload the extension in Chrome

**Future improvement**: Consider adding a build step (e.g., with Rollup or Webpack) to automatically bundle the modules from `src/` into `content.js`.
