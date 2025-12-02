# Phase 0: Project Overview & Implementation Guide

## 🎯 Project Overview

### What You're Building

A **Chrome/Brave browser extension** that transforms your new tab page into a beautiful, personalized Pinterest gallery. Every time you open a new tab, you'll see a curated selection of random pins from your private Pinterest boards displayed in a stunning masonry layout.

### Key Features

- 🍪 **Session-based Authentication** - Uses your active Pinterest login (no API keys needed)
- 🔒 **Private Board Access** - View pins from your secret/private boards (via your session)
- 🎨 **Beautiful UI** - Premium masonry grid with smooth animations
- 🎲 **Random Selection** - Fresh pins every time you refresh
- ⚡ **Smart Caching** - Fast loading with intelligent cache management
- ⚙️ **Customizable** - Choose boards, pin count, refresh intervals
- 📱 **Responsive** - Adapts to any screen size
- ⌨️ **Keyboard Shortcuts** - Quick actions with R (refresh) and S (settings)
- 🌐 **Offline Support** - Works even without internet using cached pins

### Technology Stack

- **Manifest V3** - Latest Chrome extension standard
- **Vanilla JavaScript** - No frameworks, pure JS
- **Manifest V3** - Latest Chrome extension standard
- **Vanilla JavaScript** - No frameworks, pure JS
- **DOM Parsing** - Extracting data from Pinterest's internal JSON
- **Session Cookies** - Piggybacking on browser session
- **Chrome Storage API** - Local data persistence
- **CSS Grid & Columns** - Responsive masonry layout

---

## 📋 Implementation Phases

The project is divided into **7 phases**, each building on the previous:

| Phase | Focus | Duration | Complexity |
|-------|-------|----------|------------|
| **1** | Project Setup & Research | 1-2 hours | ⭐⭐ Easy |
| **2** | Extension Foundation | 2-3 hours | ⭐⭐⭐ Medium |
| **3** | Session Management | 1-2 hours | ⭐⭐ Easy |
| **4** | Data Scraping | 3-4 hours | ⭐⭐⭐⭐ Hard |
| **5** | Display & UI | 3-4 hours | ⭐⭐⭐⭐ Hard |
| **6** | Polish & Testing | 2-3 hours | ⭐⭐⭐ Medium |
| **7** | Documentation | 1-2 hours | ⭐⭐ Easy |

**Total Estimated Time**: 14-21 hours (spread over several days)

---

## ⚡ Parallel Development Strategy

If you have multiple people or agents working on this, you can split the work into parallel tracks!

### 🚀 The Critical Path (Must be done first)

**Phase 1 & Phase 2 (Foundation)**
*   **Who:** Lead Developer / Everyone
*   **Why:** Everyone needs the same `manifest.json`, directory structure, and `utils/storage.js` to avoid merge conflicts later.
*   **Action:** Set up the repo, create the empty files, and push to Git.

### ⚡ Parallel Track A: The "Logic" Team
**Focus:** Session Handling and Data Scraping
**Phases:** 3 (Session) & 4 (Scraping)

This team works on the "invisible" parts of the extension.
*   **Tasks:**
    *   Implement Session Check (`auth/session-manager.js`)
    *   Build the Scraper (`api/pinterest-scraper.js`)
    *   Reverse-engineer Pinterest's internal JSON structure
    *   Implement the Random Selection algorithm
*   **Independence:** They don't need a beautiful UI to test. They can test by logging data to the console.

### 🎨 Parallel Track B: The "UI" Team
**Focus:** Visuals, Animations, and Layout
**Phases:** 5 (Display) & Part of 6 (Polish)

This team works on the "visible" parts.
*   **Tasks:**
    *   Build the Masonry Grid (`newtab.css`)
    *   Design the Pin Cards and Hover effects
    *   Create Loading Skeletons
    *   Implement Responsive Design
*   **Independence:** They **DO NOT** need real Pinterest data to build this. They can use **Mock Data** (fake pins) to build the perfect interface while Team A figures out the complex API stuff.

### 📝 Parallel Track C: The "Product" Team
**Focus:** Documentation, Assets, and Store Listing
**Phases:** 7 (Docs) & Part of 1 (Assets)

*   **Tasks:**
    *   Design the Icons (16x16, 48x48, 128x128)
    *   Write the `README.md` and User Guides
    *   Prepare the Chrome Web Store listing text/screenshots

### 🤝 The "Contract" (Crucial for Success)

For Track A and Track B to work independently, you must agree on the **Data Structure** immediately.

If Team B knows exactly what a "Pin" looks like, they can build the UI for it without waiting for Team A to actually fetch it.

**The Agreed Pin Object Structure:**
```javascript
// Both teams agree that a "Pin" will ALWAYS look like this:
const MOCK_PIN = {
  id: "12345",
  title: "Cozy Living Room",
  description: "Modern bohemian living room decor ideas...",
  imageUrl: "https://images.unsplash.com/photo-1540932296235-d848cc98c059", // Placeholder image
  dominantColor: "#8B4513", // For placeholders
  link: "https://pinterest.com/pin/12345",
  boardId: "board_1",
  altText: "Living room with plants"
};
```

### 🤖 Note for AI Agents
If you are working on **Track B (UI)**, you should create a temporary `mock-data.js` file or function that returns an array of these `MOCK_PIN` objects. This allows you to verify the UI completely without needing the API to be working.

---

## 🚦 How to Use These Documents

### ⚠️ IMPORTANT: Don't Rush!

These documents are designed to be followed **step-by-step** with **verification points** throughout. Rushing through will lead to hard-to-debug issues later.

### The Right Approach

1. **Read the entire phase document first** before writing any code
2. **Follow steps in order** - each step builds on the previous
3. **Stop at verification points** - test before moving forward
4. **Use the checklists** - don't skip verification items
5. **Refer to troubleshooting** - when something doesn't work

### 🛑 Key Verification Points

Throughout the documents, you'll see these markers indicating when to **STOP and VERIFY**:

#### ✅ Verification Checkpoint
```
When you see a "Verification Checklist" section:
- STOP coding
- Test what you just built
- Check off each item
- Only proceed when ALL items pass
```

#### 🧪 Testing Steps
```
When you see "Testing Steps" or "Test [Feature]":
- STOP coding
- Follow the testing procedure
- Verify expected behavior
- Fix any issues before continuing
```

#### 📊 Manual Verification
```
When you see "Verify [Something]":
- STOP and check manually
- Open browser DevTools if needed
- Inspect storage/network/console
- Confirm everything works as expected
```

---

## 🎓 Working with an AI Agent

If you're using an AI coding assistant to help implement this project, here's how to work effectively:

### Give Clear Instructions

**❌ Don't say:**
> "Implement Phase 3"

**✅ Do say:**
> "Let's implement Phase 3, Step 3.1 only. Stop after creating the pinterest-auth.js file so I can review it."

### Request Verification Points

**Example:**
> "I've completed Step 2.2. Before moving to Step 2.3, I want to verify the background service worker is working. What should I check?"

### Ask for Explanations

**Example:**
> "Can you explain why we're using importScripts() instead of ES6 imports in the background worker?"

### Report Issues

**Example:**
> "I'm at Step 3.6 and getting a 'Redirect URI mismatch' error. I've checked the URI matches my extension ID. What else could be wrong?"

---

## 📍 Recommended Workflow

### For Each Phase:

#### 1. **Planning** (5-10 minutes)
- [ ] Read the entire phase document
- [ ] Understand the goals
- [ ] Note any prerequisites
- [ ] Check if you have required credentials/tools

#### 2. **Implementation** (varies by phase)
- [ ] Follow steps sequentially
- [ ] Copy code carefully (or have AI generate it)
- [ ] Add comments to understand what code does
- [ ] Save files as you go

#### 3. **Verification** (10-15 minutes per checkpoint)
- [ ] Stop at each verification point
- [ ] Follow testing procedures
- [ ] Check browser console for errors
- [ ] Verify in browser DevTools
- [ ] Test edge cases

#### 4. **Troubleshooting** (as needed)
- [ ] Check troubleshooting section in document
- [ ] Review error messages carefully
- [ ] Check browser console
- [ ] Verify file paths and names
- [ ] Ensure all prerequisites are met

#### 5. **Documentation** (5 minutes)
- [ ] Add comments to your code
- [ ] Note any deviations from the guide
- [ ] Document any issues you encountered
- [ ] Update your own notes

---

## 🎯 Key Verification Points by Phase

### Phase 1: Project Setup
**STOP POINTS:**
1. After creating directory structure → Verify all folders exist
2. After Pinterest app creation → Verify you have App ID and Secret
3. After requesting API access → Verify request was submitted

### Phase 2: Extension Foundation
**STOP POINTS:**
1. After creating manifest.json → Verify JSON is valid
2. After loading extension → Verify it appears in brave://extensions/
3. After opening new tab → Verify your page loads (even if basic)
4. After noting extension ID → Verify you saved it somewhere

### Phase 3: Session Management
**STOP POINTS:**
1. After updating manifest → Verify permissions are correct
2. After creating session manager → Verify it detects if you are logged in
3. After testing login flow → Verify clicking "Connect" opens Pinterest

### Phase 4: Data Scraping
**STOP POINTS:**
1. After creating scraper → Verify you can fetch raw HTML
2. After parsing logic → Verify you can extract the JSON blob
3. After fetching boards → Verify boards appear in settings
4. After fetching pins → Verify pins are returned (check console)

### Phase 5: Display & UI
**STOP POINTS:**
1. After updating CSS → Verify styles load correctly
2. After implementing pin cards → Verify at least one pin displays
3. After adding animations → Verify smooth performance
4. After responsive design → Verify works at different sizes

### Phase 6: Polish & Testing
**STOP POINTS:**
1. After error handling → Verify errors show user-friendly messages
2. After offline support → Verify works without internet
3. After performance optimization → Verify no lag or stuttering
4. After running all tests → Verify all checklist items pass

### Phase 7: Documentation
**STOP POINTS:**
1. After creating README → Verify instructions are clear
2. After creating setup guide → Verify someone else could follow it
3. Final verification → Verify entire extension works end-to-end

---

## 🔍 Debugging Tips

### When Something Doesn't Work

1. **Check Browser Console** (F12)
   - Look for red error messages
   - Read the error carefully
   - Note the file and line number

2. **Check Network Tab**
   - See if API calls are being made
   - Check response status codes
   - Inspect request/response data

3. **Check Extension Storage**
   - DevTools → Application → Storage → Extension Storage
   - Verify data is being saved
   - Check token expiration dates

4. **Check Service Worker**
   - brave://extensions/ → Details → Service worker
   - Click "Inspect" to see background worker console
   - Check for errors or logs

5. **Verify File Paths**
   - Ensure all file paths in manifest.json are correct
   - Check that files exist where referenced
   - Verify case sensitivity (especially on Linux)

---

## 📚 Prerequisites Knowledge

### Required:
- ✅ Basic JavaScript (variables, functions, async/await)
- ✅ Basic HTML/CSS
- ✅ How to use browser DevTools
- ✅ How to copy/paste code

### Helpful but Not Required:
- 🔶 Chrome Extension basics
- 🔶 OAuth 2.0 concepts
- 🔶 REST APIs
- 🔶 Git/version control

### You'll Learn:
- 🎓 Chrome Extension development (Manifest V3)
- 🎓 Session-based authentication
- 🎓 DOM Parsing & Web Scraping
- 🎓 Browser storage management
- 🎓 Responsive CSS layouts
- 🎓 Error handling patterns

---

## 🎯 Success Criteria

By the end of this project, you should have:

- ✅ A working Chrome/Brave extension
- ✅ Seamless integration with your Pinterest session
- ✅ Access to your private boards
- ✅ Beautiful pin display on new tabs
- ✅ Customizable settings
- ✅ Offline support
- ✅ Complete understanding of how it works

---

## ⏱️ Time Management

### Recommended Schedule

**Week 1:**
- Day 1: Phase 1 (Setup)
- Day 2: Phase 2 (Foundation)
- Day 3: Phase 3 (Authentication)

**Week 2:**
- Day 4: Phase 4 (Data Fetching)
- Day 5: Phase 5 (UI)
- Day 6: Phase 6 (Polish)
- Day 7: Phase 7 (Documentation)

**OR** work at your own pace! There's no rush.

---

## 🆘 Getting Help

### If You Get Stuck:

1. **Check the Troubleshooting section** in the current phase document
2. **Review the verification checklist** - did you miss a step?
3. **Check browser console** for error messages
4. **Re-read the step** you're on carefully
5. **Start fresh** if needed - delete and recreate the problematic file
6. **Ask for help** with specific error messages

### Good Questions to Ask:

- "I'm getting error X at step Y. I've checked Z. What should I try next?"
- "Can you explain what this code does in step X?"
- "I've verified items 1-5 on the checklist, but item 6 isn't working. What could be wrong?"

### Questions to Avoid:

- "It doesn't work" (too vague)
- "Can you just do it for me?" (you won't learn)
- "Why isn't anything working?" (check console first)

---

## 🎉 Ready to Start?

### Before You Begin:

- [ ] I've read this entire overview
- [ ] I understand I should stop at verification points
- [ ] I have a Pinterest account
- [ ] I have Brave or Chrome installed
- [ ] I'm ready to learn and take my time
- [ ] I have 1-2 hours for Phase 1

### Your First Step:

**Open `01-project-setup.md` and start with Step 1.1**

Remember: **Quality over speed**. Taking time to verify each step will save you hours of debugging later!

---

## 📖 Document Navigation

- **Current**: Phase 0 - Project Overview (You are here)
- **Next**: [Phase 1 - Project Setup](01-project-setup.md)

---

Good luck, and enjoy building your Pinterest extension! 🚀✨
