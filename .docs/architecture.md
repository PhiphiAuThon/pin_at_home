# Architecture: Pin@Home

## Overview
Pin@Home is a Chrome Extension that transforms Pinterest boards into a personalized dashboard. It works by "scanning" Pinterest boards to cache images locally, which are then displayed on the browser's New Tab page.

## Core Systems

### 1. The Scanner (Scraping Layer)
*   **Purpose**: Extracts image URLs and metadata from Pinterest's DOM.
*   **Mechanism**: Injected via `content_scripts`. It uses a manual trigger ("Scan" button) to avoid background resource waste.
*   **Resiliency**: Uses CSS selectors and DOM traversal to find high-resolution image sources (`srcset`).

### 2. Cache Management (Data Layer)
*   **Storage**: Uses `chrome.storage.local`.
*   **Structure**: Boards are stored as arrays of URLs indexed by a `cacheKey` (derived from the Pinterest board URL).
*   **Optimization**: Implements debouncing for writes and max cache limits to stay within storage quotas.

### 3. The Dashboard (Presentation Layer)
*   **New Tab Override**: Replaces the default browser new tab with `newtab.html`.
*   **UI Architecture**: Built with modular Vanilla JS components in `src/ui/`.
*   **Masonry Engine**: Uses a custom infinite-scrolling masonry column implementation (`ColumnScroller`).
*   **Features**:
    *   **Grid Layout**: Masonry-style display of cached pins with "Recycler" (virtualization).
    *   **Refsheet Mode**: A canvas-based mode for organizing images for artistic reference.
    *   **Column Scroller**: Specialized viewing mode for vertical flow.

## Architecture Patterns

### 1. High-Performance Rendering (Recycler Pattern)
To handle hundreds of images without lagging the browser, the project implements a "Recycler" pattern:
*   **Virtualization**: Only images within or near the viewport are rendered.
*   **Recycling**: DOM elements are reused as the user scrolls, minimizing memory usage and GC pressure.
*   **Budgeting**: The animation loop in `grid.js` uses a "Frame Budget" to limit how many DOM creates, loads, and reveals happen per frame (to keep 60fps).

### 2. Loading Phases
The rendering engine goes through distinct phases to prioritize user perception:
*   **SPRINT**: Quickly fills the viewport with the first set of images.
*   **COAST**: Continues loading images at a sustainable pace.
*   **STABLE**: Only fills gaps when necessary (e.g., window resize).

### 3. State-Driven UI
The application state is centralized in `state.js`. UI components react to state changes, though mostly through manual updates rather than a data-binding framework.

## Data Flow
1. **User visits Pinterest Board** -> `loader.js` detects URL match.
2. **User clicks "Scan"** -> `scanner.js` crawls the page and sends URLs to `cache.js`.
3. **Cache Updates** -> Data is persisted in `chrome.storage.local`.
4. **User opens New Tab** -> `newtab.js` pulls data from storage and initializes the UI.

## Directory Structure
*   `src/`: Main source code.
    *   `ui/`: UI components (Grid, Sidepanel, etc.).
        *   `scroll/`: Internal logic for the masonry recycler (Layout, DOM, Recycling).
    *   `scanner.js`: Pinterest DOM scraping logic.
    *   `cache.js`: Chrome storage abstraction.
    *   `state.js`: Global application state.
*   `styles.css`: Main UI styling.

## Technical Principles
*   **Zero Frameworks**: No React/Vue. Pure DOM manipulation for maximum performance and minimum footprint.
*   **SPA-Aware**: Uses `MutationObserver` to handle Pinterest's internal navigation without page reloads.
*   **Declarative State (Light)**: Centralized `state.js` for tracking UI modes and loaded pins.
