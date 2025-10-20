# Yappin' - AI Coding Agent Instructions

## Project Overview
Yappin' is a Twitter-like Progressive Web App (PWA) for sharing short posts called "Yaps". Built with vanilla JavaScript, Firebase (v9 compat mode), and a mobile-first design philosophy.

## Architecture & Data Flow

### Firebase Structure
- **Authentication**: Firebase Auth (compat mode) - `firebase.auth()`
- **Database**: Firebase Realtime Database with denormalized data structure:
  - `users/{uid}` - User profiles with username, bio, followers/following counts
  - `yaps/{yapId}` - All yaps with embedded user data (username, photoURL)
  - `userYaps/{uid}/{yapId}` - Denormalized copy of yaps per user for timeline queries
  - `likes/{yapId}/{uid}` - Like relationships
  - `userLikes/{uid}/{yapId}` - Reverse index for user's liked yaps
  - `reyaps/{yapId}/{uid}` - Reyap (retweet) relationships
  - `userReyaps/{uid}/{yapId}` - Reverse index for user's reyaps
  - `following/{uid}/{targetUid}` - Who the user follows
  - `followers/{uid}/{followerUid}` - User's followers
  - `usernames/{lowercaseUsername}` - Maps usernames to UIDs
  - `notifications/{uid}` - User notifications for mentions/likes/reyaps
  - `hashtags/{tag}/{yapId}` - Hashtag index with timestamps
  - `trending/{tag}/count` - Trending hashtag counts

### Script Loading Order (Critical)
Scripts MUST load in this exact order (see `index.html`):
1. Firebase SDKs (app, auth, database, storage) - v9.19.1 compat
2. `firebase-config.js` - Initializes Firebase, exports `auth`, `database`, `storage`
3. `auth.js` - Authentication logic, user profile management
4. `app.js` - Main app functionality, dark mode, modal handling
5. `timeline.js` - Timeline rendering, yap creation

### State Management Pattern
- No state management library - relies on Firebase real-time listeners
- `auth.onAuthStateChanged()` in `auth.js` is the main state coordinator
- UI updates triggered by database listeners or explicit function calls
- LocalStorage used for: theme preference (`theme`), drafts (`yappin_drafts`), bookmarks (`yappin_bookmarks_{uid}`)

## Key Development Patterns

### Creating Database Writes
Always use **batched updates** with denormalized data:
```javascript
const updates = {};
updates[`yaps/${yapId}`] = yapData;
updates[`userYaps/${userId}/${yapId}`] = yapData;
database.ref().update(updates);
```

### Handling Likes/Reyaps
Check if action exists first, then toggle with transaction for counts:
```javascript
likeRef.once('value').then(snapshot => {
  if (snapshot.exists()) {
    // Unlike: remove from both indexes
    updates[`likes/${yapId}/${uid}`] = null;
    updates[`userLikes/${uid}/${yapId}`] = null;
  } else {
    // Like: add to both indexes
    updates[`likes/${yapId}/${uid}`] = true;
    updates[`userLikes/${uid}/${yapId}`] = true;
  }
  yapRef.child('likes').transaction(likes => (likes || 0) ± 1);
});
```

### Dark Mode Implementation
Unified theme system in `app.js`:
- Checks localStorage first (`theme` key), then system preference
- Applies to both `body.dark-mode` class and `data-theme` attribute
- Toggle button is either `#darkModeToggle` or `#themeToggleBtn`
- Theme persists across page loads

### Snackbar Notifications
Global function `window.showSnackbar(message, type, duration)`:
- Types: `'success'`, `'error'`, `'default'`
- Default duration: 3000ms
- Styled via CSS classes on `#snackbar` element

## CSS Architecture

### File Organization
- `style.css` - Core styling, base components
- `optimized.css` - Combined modern UI enhancements (merged from `modern.css` + `modern-enhancements.css`)
- Both files loaded in production (see `index.html`)

### Mobile-First Approach
- Bottom navigation bar (`.mobile-nav`) for mobile devices
- Floating compose button (`.mobile-compose-btn`) on mobile
- Desktop sidebar (`.sidebar`) hidden on mobile via media queries
- Touch targets sized for 44px minimum

### Dark Mode CSS
- Use `body.dark-mode` class or `[data-theme="dark"]` selector
- Define both light and dark values for dynamic elements
- Example: `background-color: var(--bg-primary)` with CSS custom properties

## PWA Configuration

### Service Worker Strategy
`service-worker.js` uses cache-first for static assets, network-first for navigation:
- Static assets cached in `STATIC_ASSETS` array
- Dynamic caching for visited resources matching `DYNAMIC_CACHE_URLS` patterns
- API calls (Firebase) bypass cache
- Offline fallback to `/offline.html`
- Cache version: `v4` (increment to force cache refresh)

### Manifest & Icons
- PWA manifest: `manifest.json` with 8 icon sizes (72-512px)
- Icons generated from SVG using `convert-icons.js` (Node.js + Sharp)
- Supports maskable icons for Android adaptive icons

## Common Tasks

### Adding a New Database Node
1. Update Firebase rules in `firebase.rules.json`
2. Add denormalized writes in relevant functions (use batched updates)
3. Create reverse indexes if needed for queries
4. Test with current Firebase rules locally

### Creating a New Modal
1. Add modal HTML to `index.html` with class `modal hidden`
2. Implement `openModal()` using `toggleModal(modal, true)` pattern from `app.js`
3. Add close handler with confirmation if unsaved content exists
4. Focus appropriate input on modal open

### Adding Authentication Flow
1. All auth state changes handled by single listener in `auth.js`
2. Check `auth.currentUser` before database operations
3. Use `checkUserProfile()` pattern to ensure user document exists
4. Username uniqueness enforced via `usernames/{lowercaseUsername}` index

## Debugging Tips

### Firebase Operations
- Debug logs prefixed with `[DEBUG]` in `auth.js`
- Test writes confirmed with success logs
- Check browser console for Firebase permission errors
- Verify `firebase-config.js` loads before auth operations

### Timeline Not Loading
- Verify user is authenticated (`auth.currentUser`)
- Check `following/{uid}` has entries (or loads own yaps)
- Inspect `userYaps/{uid}` structure matches expected format
- Look for `yapsContainer` element existence

### Dark Mode Not Persisting
- Check localStorage `theme` key value
- Verify `applyInitialTheme()` called on DOMContentLoaded
- Ensure both class and attribute set: `body.dark-mode` + `data-theme="dark"`

## Security Rules
Current Firebase rules (`firebase.rules.json`) are restrictive:
- Users can only read their own profile
- Yaps readable by owner or friends
- All operations require authentication
- **Consider relaxing for public timeline features**

## PWA Architecture

### Complete PWA Implementation
This is a **fully-fledged Progressive Web App** with:
- ✅ Complete manifest.json with shortcuts and share targets
- ✅ Service worker with caching strategies
- ✅ Offline support with custom offline page
- ✅ Install prompts and app shortcuts
- ✅ Connection status monitoring
- ✅ Share Target API for receiving shared content
- ✅ File handlers for media files
- ✅ Window controls overlay support
- ✅ Safe area insets for notched devices

### PWA Script Loading Order
After Firebase scripts, load PWA modules:
1. `auth.js` - Authentication
2. `app.js` - Core functionality
3. `timeline.js` - Feed and yaps
4. `social.js` - Follow/unfollow features
5. `pwa-init.js` - **PWA features, service worker registration**

### PWA Features Location
- Service Worker: `service-worker.js` (root)
- PWA Init: `js/pwa-init.js` (install prompts, offline handling)
- Manifest: `manifest.json` (app configuration)
- Offline Page: `offline.html` (fallback page)

### No Inline Scripts/Styles
- **All JavaScript extracted to modules** - No `<script>` tags in index.html (except external imports)
- **All CSS in separate files** - No `<style>` tags in HTML
- Better maintainability, caching, and CSP compliance

## External Dependencies
- Firebase SDK v9.19.1 (compat mode) - loaded from CDN
- Font Awesome 6.0.0-beta3 - icons
- Google Fonts: Roboto, Poppins, Comfortaa
- Node.js + Sharp - for icon generation only (dev dependency)

## File Naming Conventions
- JavaScript: kebab-case filenames (`firebase-config.js`, `pwa-init.js`)
- CSS: kebab-case filenames (`modern-enhancements.css`, `enhancements.css`)
- Images: kebab-case with dimensions (`icon-192x192.png`)
- Functions: camelCase (`createYapElement`, `toggleLike`)
- Database paths: camelCase (`userYaps`, `userLikes`)

## Production Deployment
- **Requires HTTPS** - PWAs must be served over secure connection
- Test with Lighthouse (target 90+ PWA score)
- Configure Firebase production credentials
- Set proper CSP headers for security
