# Report: Fix Session-based Folder Picker

## 1. The Handover (User View)
- [x] **Capability Added:** Users can now click "Link Local Folder" in the Board Menu to select a local directory. The extension will immediately display the images from that folder in the grid.
- [x] **Verification:**
  1. Open the Board Menu.
  2. Click "Link Local Folder".
  3. Select a folder containing images (JPG, PNG, WebP, etc.).
  4. Verify that the grid updates with the local images and the board title changes to the folder name.
  5. Select a different folder and verify that the previous images are cleared (Blob URLs revoked) and the new ones appear.

## 2. Technical Changes (Engineer View)
- **Files Modified:**
  - `src/ui/header/boardMenu.js`:
    - Added missing imports: `state`, `updateState`, and `renderPins`.
    - Refactored `createLinkLocalFolderButton` to use an in-memory hidden input (cleaning up DOM clutter).
    - Simplified folder name extraction from `webkitRelativePath`.
    - Added explicit revocation of previous Blob URLs via `state.revokeBlobUrls()` before switching boards.
    - Ensured `updateState` and `renderPins` are called correctly to trigger UI refresh.

## 3. Next Steps
- [ ] [M2 S2: True Offline Persistence](.docs/roadmap.md#L19) - Implement saving images locally for persistent offline access.
