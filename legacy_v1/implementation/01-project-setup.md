# Phase 1: Project Setup

## Overview
Set up the development environment and prepare the project structure for the session-based architecture.

---

## Step 1.1: Create Project Structure

Create the following directory structure. Note that we have replaced `pinterest-client.js` with `pinterest-scraper.js` and `pinterest-auth.js` with `session-manager.js`.

```
pint_at_home/
├── manifest.json
├── background.js
├── auth/
│   └── session-manager.js
├── api/
│   └── pinterest-scraper.js
├── newtab/
│   ├── newtab.html
│   ├── newtab.css
│   └── newtab.js
├── settings/
│   ├── settings.html
│   ├── settings.css
│   └── settings.js
├── utils/
│   ├── storage.js
│   ├── random-selector.js
│   ├── error-handler.js
│   └── analytics.js
├── assets/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── docs/
    └── implementation/
```

**Commands to create structure:**
```powershell
# Navigate to project directory
cd c:\Users\Phiphi\Documents\dev\pint_at_home

# Create directories
New-Item -ItemType Directory -Force -Path auth, api, newtab, settings, utils, assets\icons
```

---

## Step 1.2: Prepare Pinterest Account

Since we are using your active session, you don't need a developer account or API keys.

1.  **Log in to Pinterest**
    *   Open [Pinterest.com](https://www.pinterest.com) in your browser.
    *   Log in with the account you want to use.
    *   Ensure you can see your private boards.

2.  **Check for "Secret" Boards**
    *   Go to your profile.
    *   Verify you have at least one board (public or secret) with pins in it.

---

## Step 1.3: Create Extension Icons

You need icons in three sizes: 16x16, 48x48, and 128x128 pixels.

### Option A: Use Image Generation
I can generate Pinterest-themed icons for you.

### Option B: Use Existing Images
- Find or create PNG images
- Place them in `assets/icons/`
- Name them: `icon16.png`, `icon48.png`, `icon128.png`

**Recommended design:**
- Pinterest-style "P" logo or pin icon
- Red/white color scheme (#E60023 is Pinterest red)
- Simple, recognizable at small sizes

---

## Step 1.4: Set Up Development Environment

### Install Required Tools:

1.  **Brave Browser** (already installed)
    *   Enable Developer Mode in extensions (`brave://extensions`).

2.  **Code Editor** (VS Code recommended)

3.  **Git** (optional but recommended)
    ```powershell
    git init
    echo "node_modules/" > .gitignore
    echo ".env" >> .gitignore
    ```

---

## Verification Checklist

- [ ] Project directory structure created
- [ ] Logged into Pinterest in the browser
- [ ] Extension icons prepared
- [ ] Development environment set up

---

## Next Steps

Once this phase is complete, proceed to:
**Phase 2: Extension Foundation** - Create the basic Chrome extension structure with manifest and core files.
