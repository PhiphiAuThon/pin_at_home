# Report: Fix Local Folder Picker Trigger

## 1. The Handover (User View)
- [x] **Capability Added:** Clicking "Link Local Folder" now reliably opens the OS directory picker.
- [x] **Verification:**
  1. Open the New Tab page.
  2. Open the Board Menu.
  3. Click "📁 Link Local Folder".
  4. The directory selection window should appear instantly.
  5. If using a browser that doesn't support the File System Access API, a clear error message is shown instead of failing silently.

## 2. Technical Changes (Engineer View)
- **Files Modified:**
  - `manifest.json`: Added `"fileSystem"` permission to the extension manifest.
  - `src/ui/header/boardMenu.js`: Refactored the `onclick` handler to ensure `showDirectoryPicker()` is the first operation, satisfying the browser's User Gesture requirement. Added an availability check for the API.
- **Key Decisions:**
  - **Immediate Invocation:** Moved the `showDirectoryPicker` call to the very top of the handler. In some environments, even small delays or async micro-tasks between the user click and the picker call can cause a "Security Error: Must be handled by a user gesture".
  - **Manifest Permission:** Included `fileSystem` as a preventative measure to ensure the extension has the necessary policy clearance to interact with local directories.

## 3. Next Steps
- [ ] [M2 S2: True Offline Persistence](.docs/roadmap.md)
