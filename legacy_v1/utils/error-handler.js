// Centralized Error Handling

const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  API: 'API_ERROR',
  STORAGE: 'STORAGE_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

class ExtensionError extends Error {
  constructor(type, message, originalError = null) {
    super(message);
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Handle and categorize errors
 */
function handleError(error, context = '') {
  console.error(`Error in ${context}:`, error);
  
  let errorType = ErrorTypes.UNKNOWN;
  let userMessage = 'An unexpected error occurred';
  
  // Categorize error
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    errorType = ErrorTypes.NETWORK;
    userMessage = 'Network error. Please check your internet connection.';
  } else if (error.message?.includes('auth') || error.message?.includes('session')) {
    errorType = ErrorTypes.AUTH;
    userMessage = 'Session expired. Please log in to Pinterest again.';
  } else if (error.message?.includes('scraping') || error.message?.includes('parse')) {
    errorType = ErrorTypes.API;
    userMessage = 'Could not load data from Pinterest. They might have changed their layout.';
  } else if (error.message?.includes('storage')) {
    errorType = ErrorTypes.STORAGE;
    userMessage = 'Storage error. Please check browser permissions.';
  }
  
  // Log to analytics (if implemented)
  logError(errorType, error.message, context);
  
  return new ExtensionError(errorType, userMessage, error);
}

/**
 * Log errors for debugging
 */
function logError(type, message, context) {
  const errorLog = {
    type,
    message,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  // Store recent errors for debugging
  chrome.storage.local.get('errorLog', (result) => {
    const log = result.errorLog || [];
    log.push(errorLog);
    
    // Keep only last 50 errors
    if (log.length > 50) {
      log.shift();
    }
    
    chrome.storage.local.set({ errorLog: log });
  });
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ErrorHandler = {
    ErrorTypes,
    ExtensionError,
    handleError,
    retryWithBackoff
  };
}

if (typeof self !== 'undefined') {
  self.ErrorHandler = {
    ErrorTypes,
    ExtensionError,
    handleError,
    retryWithBackoff
  };
}
