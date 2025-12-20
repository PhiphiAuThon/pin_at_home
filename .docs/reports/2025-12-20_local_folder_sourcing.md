# Report: Local Folder Sourcing Implementation

## 1. The Handover (User View)
- [x] **Capability Added:** Users can now link local folders as boards. The extension scans for images (JPG, PNG, WebP) recursively and displays them in the same smooth masonry grid as Pinterest boards.
- [x] **Verification:**
  1. Open the New Tab page.
  2. Hover over the board menu (current board name at the bottom).
  3. Click "📁 Link Local Folder".
  4. Select a folder containing images from your computer.
  5. The board should load and start scrolling with your local images.
  6. Verify you can switch back to Pinterest boards and back to the local folder (might require re-granting permission if browser was restarted).
  7. Verify you can delete the local board link using the trash icon in the menu.

## 2. Technical Changes (Engineer View)
- **Files Created:**
  - `src/utils/localFolderManager.js`: Core logic for File System Access API, IndexedDB persistence, and recursive scanning.
- **Files Modified:**
  - `src/cache.js`: Added `getUnifiedBoards()` to merge storage-based boards with IDB-based local boards. Updated deletion logic.
  - `src/state.js`: Added `revokeBlobUrls` to track and cleanup local image URLs.
  - `src/newtab.js`: Integrated local board loading flow (permission check -> scan -> blob URL generation).
  - `src/ui/header/boardMenu.js`: Added "Link Local Folder" button and folder icon rendering for local boards. Improved name capitalization logic.
- **Key Decisions:**
  - **IndexedDB for Handles:** `FileSystemDirectoryHandle` is not serializable for `chrome.storage.local`, so IndexedDB was used for persistence as per standard File System Access API patterns.
  - **Selective Capitalization:** Local folder names are kept as-is to preserve user-defined casing, while Pinterest boards (which are hyphenated/lowercase in storage) continue to use `capitalizeWords`.
  - **Manual Perm Check:** Implemented `verifyPermission` to handle the browser's security requirement that local folder access must be re-granted after a session restart.

## 3. Next Steps
- [ ] [M2 S2: True Offline Persistence](.docs/roadmap.md) - Allow caching Pinterest images to local storage/IDB for full offline support.
