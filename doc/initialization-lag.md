# Initialization Lag Issue

## Problem
Grid takes too long to appear after page load, blocking the UI.

## Root Causes

1. **Blocking Preload**  
   `await preloadImages()` blocked rendering until images loaded

2. **Sequential Module Loading**  
   ES6 module chain loaded sequentially before overlay appeared

3. **Staggered Scroller Init**  
   One scroller initialized per animation frame (slow)

4. **Competing Operations**  
   `autoScroll()` and `startScanning()` ran immediately, competing for resources

## Startup Flow (Before)
```
loader.js → await import(main.js) → await preloadImages → create columns 
→ stagger init scrollers → start animation
Total: ~500-1000ms before animation
```

## Solutions Implemented

| Fix | File | Change |
|-----|------|--------|
| Instant overlay | `loader.js` | Create overlay before module import |
| Board page check | `loader.js` | Skip overlay for non-board pages |
| Non-blocking preload | `grid.js` | Fire-and-forget, don't await |
| Sync scroller init | `grid.js` | Init all scrollers immediately |
| Delayed scanning | `main.js` | 2 second delay before scan starts |

## Startup Flow (After)
```
loader.js → instant overlay → import(main.js) → create columns 
→ init all scrollers → start animation (instant!)
→ background: preload images, delayed scan
Total: ~50-100ms before animation
```

## Current State
Animation starts almost instantly. Images load in background.
