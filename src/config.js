// Pin@Home Configuration
export const CONFIG = {
  DEBUG: true, // Set to true for verbose logging
  
  // PIN_COUNT will be calculated dynamically
  SCAN_INTERVAL: 500,       // 500ms between scans (fast!)
  MAX_SCAN_ATTEMPTS: 30,    // More attempts for thorough scanning
  MIN_POOL_SIZE: 40,
  CACHE_KEY_PREFIX: 'pin_at_home_cache_',
  MAX_CACHE_SIZE: 200, // Keep last 200 pins
  
  // Grid configuration
  GRID_ROWS: 2,
  AVG_IMAGE_WIDTH: 300,
  MIN_COLUMNS: 3,
  
  // Browse mode / Refsheet configuration
  BROWSE_COLUMNS: 5,
  SIDEPANEL_WIDTH: 200,
  
  // Scrolling configuration
  AUTO_SCROLL_COUNT: 3,
  AUTO_SCROLL_DISTANCE: 1000,
  AUTO_SCROLL_INTERVAL: 800,
  SCROLL_SPEED: 0.25, // Pixels per frame
  
  // Loading phase configuration (reduces initial RAM spike)
  LOADING_PHASES: {
    // Phase 1: Sprint to visibility (all columns get work)
    SPRINT: {
      maxConcurrentLoads: 15,    // Limit concurrent downloads
      revealsPerFrame: 5,       // 1 per column (5 columns)
      createsPerFrame: 5,       // 1 per column
      frameSkip: 1,             // Every frame
    },
    // Phase 2: Coast to stable (slower, but still all columns)
    COAST: {
      maxConcurrentLoads: 5,    // Very gentle
      revealsPerFrame: 5,       // 1 per column
      createsPerFrame: 5,       // 1 per column  
      frameSkip: 3,             // Every 3rd frame
    },
    // Thresholds for phase transitions
    SPRINT_UNTIL_VISIBLE: 3,    // Sprint until 3 images visible per column
  },
  
  // Non-board URL patterns to exclude
  NON_BOARD_PATTERNS: [
    'search', 'pin', 'ideas', 'today', 'explore', 
    'settings', 'resource', '_', 'business'
  ]
};
