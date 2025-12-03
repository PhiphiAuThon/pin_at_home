# Phase 4C - Manual Board Selection - Testing Guide

## 🎯 Quick Start

1. **Reload Extension**
   - Open `brave://extensions/`
   - Find "Pinterest@Home"  
   - Click **Reload**

2. **Open Settings**
   - Right-click extension icon → **Options**
   - Or navigate to the settings page

3. **Add Your First Board**
   - Go to Pinterest.com
   - Copy a board URL (e.g., `https://www.pinterest.com/username/my-board/`)
   - Paste it in Settings → "Paste Board URLs" textarea
   - Click **Add Boards**

4. **Select Boards**
   - Click on board cards to select them
   - Selected boards will highlight in red

---

## ✅ What to Test

- [ ] Extension reloads without errors
- [ ] Settings page loads correctly
- [ ] Can add single board URL
- [ ] Can add multiple board URLs (one per line)
- [ ] Invalid URLs show warning
- [ ] Board selection works (click to select/deselect)
- [ ] Remove board button works
- [ ] Data persists after closing/reopening settings
- [ ] Preferences save correctly

---

## 🐛 If Something Goes Wrong

**Check Browser Console:**
- Open settings page
- Press F12
- Look for red error messages

**Check Service Worker:**
- Go to `brave://extensions/`
- Find extension → "Inspect service worker"
- Look for errors in console

**Clear and Retry:**
- If storage is corrupted, go to DevTools → Application → Storage → Clear

---

## 📁 Files Changed

**New Files:**
- `api/manual-board-manager.js`

**Updated Files:**
- `background.js`
- `settings/settings.html`
- `settings/settings.css`
- `settings/settings.js`

**Moved to Obsolete:**
- `api/pinterest-scraper.js`
- `implementation/04*.md` (old versions)

---

Ready to test! 🚀
