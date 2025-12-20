# Pin@Home - Roadmap

<!-- Labels: M = Milestone, S = Substep, T = Tech task | Status: [ ], [/], [x] -->

- [x] **M1: The Personal Dashboard Foundation**
    - [x] S1: Local Board Collection – Save high-res Pinterest board metadata and URLs for instant access.
    - [x] S2: Fluid Discovery Engine – Browse hundreds of pins in a buttery-smooth, infinite masonry grid.
    - [x] S3: Immersive Inspection – View details and metadata in an immersive full-screen mode.
    - [x] S4: Workflow-Specific Viewmodes – Choose between Grid, Column, and Refsheet modes for different creative needs.

- [ ] **M2: Local Source Integration & Offline Independence**
    - [x] S1: Local Folder Sourcing – Select a local folder to use its images as a reference source.
        - [x] T1: Implement `LocalFolderManager` using File System Access API (IndexedDB for handle persistence).
        - [x] T2: Add "Link Local Folder" UI to Board Menu.
        - [x] T3: Implement recursive image scanning with support for common formats (JPG, PNG, WebP).
        - [x] T4: Update `newtab.js` to support local board types with Blob URL generation.
        - [x] T5: Fix Folder Picker Trigger (User Gesture & API Availability).
        - [x] T6: Fix Session-based Folder Picker (Imports & Logic Cleanup).
    - [ ] S2: True Offline Persistence – Option to save images locally so the dashboard works without an internet connection.
