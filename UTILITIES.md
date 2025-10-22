# Utility Modules Documentation

This document describes the utility modules created to reduce code duplication and improve maintainability.

## Overview

Three utility modules have been created:
1. **`utils.js`** - General utilities (validation, formatting, etc.)
2. **`ui-utils.js`** - UI operations (modals, loading states, etc.)
3. **`db-utils.js`** - Database operations (CRUD for yaps, likes, replies)

## Module Loading Order

In `index.html`, these must load in this order:
```html
<script src="./js/firebase-config.js"></script>  <!-- First: Firebase -->
<script src="./js/utils.js"></script>            <!-- Second: General utilities -->
<script src="./js/ui-utils.js"></script>          <!-- Third: UI utilities -->
<script src="./js/db-utils.js"></script>          <!-- Fourth: DB utilities (needs Firebase) -->
```

---

## 1. General Utilities (`utils.js`)

### Available Functions

Accessible via `window.utils.*`

#### Validation
- **`isValidEmail(email)`** - Validate email format
- **`validateUsername(username)`** - Returns `{valid: boolean, message: string}`

#### Formatting
- **`formatNumber(num)`** - Format with K/M suffix (e.g., 1500 → "1.5K")
- **`getRelativeTime(timestamp)`** - Convert to relative time (e.g., "2h ago")
- **`sanitizeHTML(html)`** - Prevent XSS attacks
- **`escapeHTML(str)`** - Escape HTML special characters

#### Performance
- **`debounce(func, wait)`** - Limit function calls
- **`throttle(func, limit)`** - Ensure max one call per interval
- **`retryWithBackoff(fn, maxRetries, delay)`** - Retry with exponential backoff

#### Misc
- **`copyToClipboard(text)`** - Copy to clipboard
- **`isMobile()`** - Check if mobile device
- **`lazyLoadImages(selector)`** - Lazy load images

### Usage Examples

```javascript
// Validate email
if (window.utils.isValidEmail('user@example.com')) {
    // Valid email
}

// Format numbers
console.log(window.utils.formatNumber(15000)); // "15K"

// Debounce search
const debouncedSearch = window.utils.debounce(searchFunction, 500);

// Get relative time
const timeAgo = window.utils.getRelativeTime(Date.now() - 3600000); // "1h ago"
```

---

## 2. UI Utilities (`ui-utils.js`)

### Available Functions

Accessible via `window.uiUtils.*`

#### Modal Operations
- **`toggleModal(modal, show)`** - Show/hide modal with animations
- **`openModal(modalId, onOpen)`** - Open modal by ID
- **`closeModal(modalId)`** - Close modal by ID
- **`showConfirmDialog(title, message, confirmText, cancelText)`** - Returns Promise<boolean>

#### Reply Context Management
- **`clearReplyContext()`** - Clear all reply-related UI and context
- **`setupReplyContext(yapId, username, content, textareaId)`** - Setup reply UI

#### Compose Area Management
- **`clearComposeArea(textareaId, imagePreviewId, checkboxId)`** - Clear textarea and related elements

#### Loading States
- **`showLoadingSpinner(container, message)`** - Show loading spinner
- **`showEmptyState(container, message, icon)`** - Show empty state
- **`showError(container, message)`** - Show error message

### Usage Examples

```javascript
// Open modal
window.uiUtils.openModal('createYapModal');

// Close modal
window.uiUtils.closeModal('createYapModal');

// Show confirmation
const confirmed = await window.uiUtils.showConfirmDialog(
    'Delete Yap?',
    'This action cannot be undone',
    'Delete',
    'Cancel'
);

// Setup reply
window.uiUtils.setupReplyContext(
    'yap123',
    'johndoe',
    'Original yap content...',
    'modalYapText'
);

// Clear reply when done
window.uiUtils.clearReplyContext();

// Show loading
window.uiUtils.showLoadingSpinner('yapsContainer', 'Loading yaps...');

// Show empty state
window.uiUtils.showEmptyState(
    'yapsContainer',
    'No yaps yet. Follow someone to see their posts!',
    'fas fa-comment-slash'
);
```

---

## 3. Database Utilities (`db-utils.js`)

### Available Functions

Accessible via `window.dbUtils.*`

#### Read Operations
- **`getYapById(yapId)`** - Get yap by ID, returns Promise<yapData>
- **`getUserProfile(uid)`** - Get user profile, returns Promise<userData>
- **`getYapInteractionStatus(yapId, userId)`** - Returns Promise<{isLiked, isReyapped}>
- **`getYapReplies(yapId)`** - Get all replies, returns Promise<Array>

#### Interaction Operations
- **`toggleYapLike(yapId, yapAuthorId)`** - Toggle like, returns Promise<boolean>
- **`toggleYapReyap(yapId, yapAuthorId, allowReyap)`** - Toggle reyap, returns Promise<boolean>

#### CRUD Operations
- **`createYap(yapData, replyToId)`** - Create yap/reply, returns Promise<{yapId, yapData, replyToId}>
- **`deleteYap(yapId, yapUid, parentYapId)`** - Delete yap/reply, returns Promise<void>

### Usage Examples

```javascript
// Get a yap
const yapData = await window.dbUtils.getYapById('yap123');

// Check interaction status
const { isLiked, isReyapped } = await window.dbUtils.getYapInteractionStatus('yap123');

// Toggle like
const nowLiked = await window.dbUtils.toggleYapLike('yap123', 'author_uid');
if (nowLiked) {
    console.log('Yap liked!');
} else {
    console.log('Yap unliked!');
}

// Create a yap
const yapData = {
    content: 'Hello world!',
    username: 'johndoe',
    photoURL: 'https://...',
    uid: auth.currentUser.uid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    likes: 0,
    reyaps: 0,
    replies: 0
};

const { yapId } = await window.dbUtils.createYap(yapData);
console.log('Created yap:', yapId);

// Create a reply
const replyData = { ...yapData, content: '@johndoe Nice yap!' };
const { yapId: replyId } = await window.dbUtils.createYap(replyData, 'parent_yap_id');

// Get all replies
const replies = await window.dbUtils.getYapReplies('yap123');
replies.forEach(reply => {
    console.log(reply.content, reply.isLiked, reply.isReyapped);
});

// Delete a yap
await window.dbUtils.deleteYap('yap123', auth.currentUser.uid);

// Delete a reply
await window.dbUtils.deleteYap('reply123', auth.currentUser.uid, 'parent_yap_id');
```

---

## Benefits of This Architecture

### 1. **Reduced Code Duplication**
- Modal operations used in multiple files now use single implementation
- Database CRUD operations centralized
- Reply context management unified

### 2. **Easier Maintenance**
- Fix a bug once, it's fixed everywhere
- Update behavior in one place
- Consistent error handling

### 3. **Better Testing**
- Test utility functions in isolation
- Mock database operations easily
- Predictable behavior

### 4. **Improved Readability**
- Descriptive function names
- Clear parameters and return values
- Documented with JSDoc comments

### 5. **Type Safety**
- JSDoc comments provide IDE autocomplete
- Clear function signatures
- Error handling with try/catch

---

## Migration Guide

### Before (Old Code)
```javascript
// Opening modal
modal.classList.remove('hidden');
modal.classList.add('show');
document.body.style.overflow = 'hidden';

// Creating yap
const newYapKey = database.ref('yaps').push().key;
const updates = {};
updates[`yaps/${newYapKey}`] = yapData;
updates[`userYaps/${uid}/${newYapKey}`] = yapData;
await database.ref().update(updates);

// Checking like status
const snapshot = await database.ref(`userLikes/${uid}/${yapId}`).once('value');
const isLiked = snapshot.exists();
```

### After (New Code)
```javascript
// Opening modal
window.uiUtils.openModal('createYapModal');

// Creating yap
const { yapId } = await window.dbUtils.createYap(yapData);

// Checking like status
const { isLiked } = await window.dbUtils.getYapInteractionStatus(yapId);
```

---

## Best Practices

1. **Always check if utilities are available**
   ```javascript
   if (window.uiUtils && window.uiUtils.clearReplyContext) {
       window.uiUtils.clearReplyContext();
   } else {
       // Fallback
   }
   ```

2. **Use try/catch for database operations**
   ```javascript
   try {
       await window.dbUtils.createYap(yapData);
       showSnackbar('Success!', 'success');
   } catch (error) {
       showSnackbar(error.message, 'error');
   }
   ```

3. **Always clear reply context after posting**
   ```javascript
   await window.dbUtils.createYap(yapData, replyToId);
   window.uiUtils.clearReplyContext();
   ```

4. **Use confirmation dialogs for destructive actions**
   ```javascript
   const confirmed = await window.uiUtils.showConfirmDialog(
       'Delete Yap?',
       'This action cannot be undone'
   );
   if (confirmed) {
       await window.dbUtils.deleteYap(yapId, uid);
   }
   ```

---

## Future Enhancements

Potential additions to these utilities:

### `ui-utils.js`
- `showToast(message, duration)` - Toast notifications
- `animateElement(element, animation)` - CSS animations
- `handleImageUpload(input, callback)` - File upload handler

### `db-utils.js`
- `getUserFeed(uid, limit)` - Get user timeline
- `searchUsers(query, limit)` - Search functionality
- `blockUser(uid)` - Block/unblock users
- `reportContent(yapId, reason)` - Report functionality

### `utils.js`
- `compressImage(file, maxSize)` - Image compression
- `detectMentions(text)` - Extract @mentions
- `detectHashtags(text)` - Extract #hashtags
- `generateInviteCode()` - Generate invite codes

---

## Troubleshooting

### Issue: "window.uiUtils is not defined"
**Solution**: Check script loading order in `index.html`. Ensure `ui-utils.js` loads before files that use it.

### Issue: "database is not defined" in db-utils
**Solution**: Ensure `firebase-config.js` loads before `db-utils.js`.

### Issue: Reply context not clearing
**Solution**: Call `window.uiUtils.clearReplyContext()` after successful yap creation.

### Issue: Modal not opening
**Solution**: Check if modal element exists with correct ID. Use browser DevTools to debug.

---

## Summary

These utility modules significantly improve code organization and maintainability. When adding new features:

1. Check if a utility function already exists
2. If writing similar code twice, consider adding to utilities
3. Keep utilities pure and focused on single responsibility
4. Document new utilities in this README
