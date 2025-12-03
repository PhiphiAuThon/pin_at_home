// Pinterest Session Management Module

const PINTEREST_DOMAIN = 'https://www.pinterest.com';

/**
 * Check if the user has an active Pinterest session
 * @returns {Promise<boolean>} True if logged in
 */
async function checkSession() {
  try {
    console.log('🔍 Checking Pinterest session...');
    
    // Pinterest uses several cookies to track authentication
    // Let's check for all of them to be more robust
    const cookiesToCheck = ['_auth', '_pinterest_sess', 'csrftoken'];
    
    for (const cookieName of cookiesToCheck) {
      try {
        const cookie = await chrome.cookies.get({
          url: PINTEREST_DOMAIN,
          name: cookieName
        });
        
        if (cookie && cookie.value) {
          console.log(`✅ Found Pinterest cookie: ${cookieName}`);
          return true;
        }
      } catch (err) {
        console.warn(`Could not check cookie ${cookieName}:`, err);
      }
    }
    
    console.log('⚠️ No Pinterest authentication cookies found');
    
    // Method 2: Fallback - Try to fetch the homepage and check for user data
    console.log('🔍 Trying fetch fallback...');
    
    try {
      const response = await fetch(PINTEREST_DOMAIN + '/', {
        credentials: 'include',
        headers: {
          'Accept': 'text/html'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Check if the page contains user data indicators
        // Pinterest includes user info in the page when logged in
        const hasUserData = html.includes('"username":') || 
                           html.includes('"isAuthenticated":true') ||
                           html.includes('__PWS_DATA__');
        
        console.log(`Fetch result: ${hasUserData ? '✅ Logged in' : '❌ Not logged in'}`);
        return hasUserData;
      }
    } catch (fetchErr) {
      console.error('Fetch fallback failed:', fetchErr);
    }
    
    return false;

  } catch (error) {
    console.error('❌ Session check failed:', error);
    return false;
  }
}

/**
 * Open Pinterest login page in a new tab
 */
function openLogin() {
  chrome.tabs.create({
    url: `${PINTEREST_DOMAIN}/login/`
  });
}

/**
 * Open Pinterest logout page (and handle cleanup)
 */
async function logout() {
  // We can't really "log them out" easily without CSRF tokens,
  // but we can send them to the logout page
  chrome.tabs.create({
    url: `${PINTEREST_DOMAIN}/logout/`
  });
  
  // Clear our local cache
  if (self.StorageUtils) {
    await StorageUtils.clearAllCache();
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.SessionManager = {
    checkSession,
    openLogin,
    logout
  };
} else if (typeof self !== 'undefined') {
  // Service Worker environment
  self.SessionManager = {
    checkSession,
    openLogin,
    logout
  };
}
