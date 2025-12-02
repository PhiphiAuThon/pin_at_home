# Phase 1: Project Setup & Research

## Overview
Set up the development environment and research Pinterest API requirements for accessing private boards.

---

## Step 1.1: Create Project Structure

Create the following directory structure:

```
pint_at_home/
├── manifest.json
├── background.js
├── auth/
│   └── pinterest-auth.js
├── api/
│   └── pinterest-client.js
├── newtab/
│   ├── newtab.html
│   ├── newtab.css
│   └── newtab.js
├── settings/
│   ├── settings.html
│   ├── settings.css
│   └── settings.js
├── utils/
│   ├── storage.js
│   └── random-selector.js
├── assets/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── docs/
    └── pinterest-api-setup.md
```

**Commands to create structure:**
```powershell
# Navigate to project directory
cd c:\Users\Phiphi\Documents\dev\pint_at_home

# Create directories
New-Item -ItemType Directory -Force -Path auth, api, newtab, settings, utils, assets\icons, docs
```

---

## Step 1.2: Register Pinterest Developer Account

1. **Go to Pinterest Developers Portal**
   - Visit: https://developers.pinterest.com/
   - Click "Get started" or "Sign in"

2. **Create a New App**
   - Navigate to "My Apps"
   - Click "Create app"
   - Fill in app details:
     - **App name**: "Pinterest Random Pins Extension"
     - **Description**: "Personal Chrome extension to display random pins from my private boards"
     - **App type**: "Other"

3. **Note Your Credentials**
   Save these values (you'll need them later):
   - **App ID**: `<your-app-id>`
   - **App Secret**: `<your-app-secret>`

4. **Configure OAuth Settings**
   - **Redirect URI**: Leave blank for now (we'll update after first build)
   - We need the extension ID first, which is generated on installation

---

## Step 1.3: Request Elevated API Access

Pinterest requires approval for accessing private/secret boards.

1. **In your Pinterest App settings:**
   - Look for "Request access" or "Scopes" section
   - Request the following scopes:
     - `boards:read` - Read public boards
     - `boards:read_secret` - Read private/secret boards
     - `pins:read` - Read public pins
     - `pins:read_secret` - Read pins from private boards

2. **Provide Justification**
   Example text:
   ```
   This is a personal browser extension that will display random pins from my 
   private Pinterest boards on my browser's new tab page. The extension will 
   only access my own account and boards. I need access to secret boards 
   because my boards are set to private.
   ```

3. **Wait for Approval**
   - Approval typically takes 1-3 business days
   - You'll receive an email notification
   - You can continue development while waiting

---

## Step 1.4: Research Pinterest API v5 Documentation

Review the following Pinterest API documentation:

### Key Endpoints to Use:

1. **Get User's Boards**
   ```
   GET https://api.pinterest.com/v5/boards
   ```
   - Returns all boards (including secret ones with proper scope)
   - Response includes board ID, name, description, pin count

2. **Get Board Pins**
   ```
   GET https://api.pinterest.com/v5/boards/{board_id}/pins
   ```
   - Returns pins from a specific board
   - Supports pagination with cursor-based navigation
   - Max 250 pins per request

3. **Get Pin Details**
   ```
   GET https://api.pinterest.com/v5/pins/{pin_id}
   ```
   - Returns full pin information
   - Includes image URLs, title, description, link

### Authentication Flow:

**OAuth 2.0 Authorization Code Flow:**

1. **Authorization Request**
   ```
   https://www.pinterest.com/oauth/?
     client_id={app_id}&
     redirect_uri={redirect_uri}&
     response_type=code&
     scope=boards:read,boards:read_secret,pins:read,pins:read_secret&
     state={random_state}
   ```

2. **Token Exchange**
   ```
   POST https://api.pinterest.com/v5/oauth/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=authorization_code&
   code={authorization_code}&
   redirect_uri={redirect_uri}&
   client_id={app_id}&
   client_secret={app_secret}
   ```

3. **Token Refresh**
   ```
   POST https://api.pinterest.com/v5/oauth/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=refresh_token&
   refresh_token={refresh_token}&
   client_id={app_id}&
   client_secret={app_secret}
   ```

### Rate Limits:

- **Standard**: 1,000 requests per hour per user
- **Burst**: 200 requests per minute
- Implement caching to stay within limits

---

## Step 1.5: Create Extension Icons

You need icons in three sizes: 16x16, 48x48, and 128x128 pixels.

### Option A: Use Image Generation
I can generate Pinterest-themed icons for you.

### Option B: Use Existing Images
- Find or create PNG images
- Place them in `assets/icons/`
- Name them: `icon16.png`, `icon48.png`, `icon128.png`

**Recommended design:**
- Pinterest-style "P" logo or pin icon
- Red/white color scheme (#E60023 is Pinterest red)
- Simple, recognizable at small sizes

---

## Step 1.6: Set Up Development Environment

### Install Required Tools:

1. **Brave Browser** (already installed)
   - Enable Developer Mode in extensions

2. **Code Editor** (VS Code recommended)
   - Install extensions:
     - ESLint
     - Prettier
     - Chrome Extension Tools

3. **Git** (optional but recommended)
   ```powershell
   git init
   echo "node_modules/" > .gitignore
   echo ".env" >> .gitignore
   ```

---

## Step 1.7: Create Environment Configuration

Create a `.env` file to store your Pinterest credentials (never commit this!):

```env
PINTEREST_APP_ID=your_app_id_here
PINTEREST_APP_SECRET=your_app_secret_here
PINTEREST_REDIRECT_URI=https://YOUR_EXTENSION_ID.chromiumapp.org/
```

**Note:** The redirect URI will be updated after first installation.

---

## Verification Checklist

- [ ] Project directory structure created
- [ ] Pinterest Developer account registered
- [ ] Pinterest app created and credentials saved
- [ ] Elevated API access requested (waiting for approval)
- [ ] Pinterest API documentation reviewed
- [ ] Extension icons prepared
- [ ] Development environment set up
- [ ] Environment configuration file created

---

## Next Steps

Once this phase is complete, proceed to:
**Phase 2: Extension Foundation** - Create the basic Chrome extension structure with manifest and core files.

---

## Troubleshooting

### Issue: Can't access Pinterest Developers Portal
- **Solution**: Ensure you're logged into your Pinterest account first

### Issue: Don't see option to request elevated access
- **Solution**: This may be in "App settings" → "Permissions" or "Scopes" section. If not visible, you may need to contact Pinterest support.

### Issue: API approval taking too long
- **Solution**: You can start development with mock data and integrate the real API once approved.
