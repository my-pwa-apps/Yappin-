// Main App Script

// DOM Elements
const createYapBtn = document.getElementById('createYapBtn');
const mobileComposeBtn = document.getElementById('mobileComposeBtn');
const createYapModal = document.getElementById('createYapModal');
const closeYapModal = document.getElementById('closeYapModal');
const postYapBtn = document.getElementById('postYapBtn');
const modalPostYapBtn = document.getElementById('modalPostYapBtn');
const yapText = document.getElementById('yapText');
const modalYapText = document.getElementById('modalYapText');
const snackbar = document.getElementById('snackbar');
const characterCount = document.getElementById('characterCount');
const modalCharacterCount = document.getElementById('modalCharacterCount');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');

// Constants
const MAX_YAP_LENGTH = 280;
const DRAFTS_STORAGE_KEY = 'yappin_drafts';

// Event Listeners

// Only add event listeners if the elements exist
if (createYapBtn) createYapBtn.addEventListener('click', openYapModal);
if (mobileComposeBtn) mobileComposeBtn.addEventListener('click', openYapModal);
if (closeYapModal) closeYapModal.addEventListener('click', closeModal);
if (postYapBtn) postYapBtn.addEventListener('click', () => createYap(yapText));
if (modalPostYapBtn) modalPostYapBtn.addEventListener('click', () => createYap(modalYapText));

// Add character counters
yapText.addEventListener('input', () => updateCharacterCount(yapText, characterCount));
modalYapText.addEventListener('input', () => updateCharacterCount(modalYapText, modalCharacterCount));

// Add auto-save for drafts
yapText.addEventListener('input', debounce(() => saveDraft(yapText.value), 500));
modalYapText.addEventListener('input', debounce(() => saveDraft(modalYapText.value), 500));

// Search functionality
if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

// Dark mode toggle logic - unified implementation
const darkModeToggle = document.getElementById('darkModeToggle') || document.getElementById('themeToggleBtn');

// Function to apply theme
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // Update icon if toggle exists
    if (darkModeToggle) {
        const icon = darkModeToggle.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    // Save theme preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Apply initial theme based on saved preference or system preference
function applyInitialTheme() {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    const isDarkMode = savedTheme ? savedTheme === 'dark' : systemPrefersDark;
    applyTheme(isDarkMode);
}

// Apply theme on page load
applyInitialTheme();

// Add event listener for toggle button
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newIsDarkMode = currentTheme === 'light';
        
        applyTheme(newIsDarkMode);
        showSnackbar(newIsDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'success');
    });
}

// Close modal when clicking outside of it
window.addEventListener('click', (e) => {
    if (e.target === createYapModal) {
        closeModal();
    }
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    // Escape to close modal
    if (e.key === 'Escape' && !createYapModal.classList.contains('hidden')) {
        closeModal();
    }
    
    // Ctrl+Enter to post when in textarea
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement === yapText) {
            createYap(yapText);
        } else if (activeElement === modalYapText) {
            createYap(modalYapText);
        }
    }
    
    // 'n' key to open new yap modal (when not in a text input)
    if (e.key === 'n' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openYapModal();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load saved draft if it exists
    loadDraft();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Show new features notification for returning users
    showNewFeaturesNotification();
});

// Utility function to show snackbar notifications (consolidated from duplicate)
function showSnackbar(message, type = 'default', duration = 3000) {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        console.warn('Snackbar element not found');
        return;
    }
    
    // Clear any existing classes and add new ones
    snackbar.className = '';
    snackbar.classList.add('show');
    if (type) snackbar.classList.add(type);
    
    // Set the message
    snackbar.textContent = message;
    
    // Hide after specified duration
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, duration);
}

// Make the function globally available
window.showSnackbar = showSnackbar;

// Utility function to toggle modal visibility
function toggleModal(modal, isVisible) {
    if (isVisible) {
        // Don't just remove 'hidden', add 'show' for transition effects
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
        document.body.style.overflow = 'hidden';
        
        // Focus the textarea
        const textarea = modal.querySelector('textarea');
        if (textarea) {
            textarea.focus();
        }
    } else {
        modal.classList.remove('show');
        // Wait for transition to finish before hiding
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }
}

// Open create yap modal
function openYapModal() {
    if (!createYapModal) return;
    
    toggleModal(createYapModal, true);
    
    // Load any saved draft
    loadDraft();
    
    // Update character count
    if (modalYapText && modalCharacterCount) {
        updateCharacterCount(modalYapText, modalCharacterCount);
    }
    
    // Focus and select the textarea for better UX
    setTimeout(() => {
        if (modalYapText) {
            modalYapText.focus();
            modalYapText.setSelectionRange(modalYapText.value.length, modalYapText.value.length);
        }
    }, 100);
}

// Make this function available globally
window.openYapModal = openYapModal;

// Close modal
function closeModal() {
    // Ask for confirmation if there's unsaved content
    if (modalYapText.value.trim() !== '') {
        const saveDraftConfirm = confirm("Do you want to save this Yap as a draft?");
        if (saveDraftConfirm) {
            saveDraft(modalYapText.value);
            showSnackbar('Draft saved!', 'success');
        }
    }
    
    toggleModal(createYapModal, false);
    
    // Clear the textarea if not saving as draft
    if (!saveDraftConfirm) {
        modalYapText.value = '';
    }
}

// Update character count display
function updateCharacterCount(textarea, countDisplay) {
    if (!textarea || !countDisplay) return;
    
    const count = textarea.value.length;
    const remaining = MAX_YAP_LENGTH - count;
    countDisplay.textContent = remaining;
    
    // Add warning colors
    countDisplay.className = 'character-count';
    if (remaining <= 20) {
        countDisplay.classList.add('danger');
    } else if (remaining <= 40) {
        countDisplay.classList.add('warning');
    }
    
    // Disable/enable post button based on length
    const postButton = textarea === yapText ? postYapBtn : modalPostYapBtn;
    if (postButton) {
        postButton.disabled = count === 0 || count > MAX_YAP_LENGTH;
    }
}

// Save draft to localStorage
function saveDraft(content) {
    if (content && content.trim()) {
        localStorage.setItem(DRAFTS_STORAGE_KEY, content);
    }
}

// Load draft from localStorage
function loadDraft() {
    const draft = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (draft) {
        yapText.value = draft;
        modalYapText.value = draft;
        
        // Update character counts
        if (characterCount) updateCharacterCount(yapText, characterCount);
        if (modalCharacterCount) updateCharacterCount(modalYapText, modalCharacterCount);
    }
}

// Clear draft from localStorage
function clearDraft() {
    localStorage.removeItem(DRAFTS_STORAGE_KEY);
}

// Create a new yap
function createYap(textarea) {
    // Validate textarea element
    if (!textarea) {
        console.error('Invalid textarea element provided to createYap');
        return;
    }
    
    // Get the text content
    const content = textarea.value.trim();
    
    // Validate content
    if (!content) {
        showSnackbar('Yap cannot be empty', 'error');
        return;
    }
    if (content.length > MAX_YAP_LENGTH) {
        showSnackbar(`Yap must be ${MAX_YAP_LENGTH} characters or less`, 'error');
        return;
    }
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to post a Yap', 'error');
        return;
    }
    // Show loading state
    const postButton = textarea === yapText ? postYapBtn : modalPostYapBtn;
    const originalText = postButton.innerHTML;
    postButton.disabled = true;
    postButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    // Check for media attachments
    const mediaFiles = getMediaAttachments();
    // Get user data
    database.ref(`users/${auth.currentUser.uid}`).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (!userData) {
                throw new Error('User profile not found');
            }
            // Handle media uploads first if any
            if (mediaFiles && mediaFiles.length > 0) {
                return uploadMediaFiles(mediaFiles).then(mediaUrls => {
                    return { userData, mediaUrls };
                });
            }
            return { userData, mediaUrls: [] };
        })
        .then(({ userData, mediaUrls }) => {
            // Create yap object
            const yapData = {
                uid: auth.currentUser.uid,
                username: userData.username || userData.displayName || 'anonymous',
                content: content,
                timestamp: Date.now(),
                likes: 0,
                reyaps: 0,
                replies: 0,
                userPhotoURL: userData.photoURL || null
            };
            // Add media if any
            if (mediaUrls && mediaUrls.length > 0) {
                yapData.media = mediaUrls;
            }
            // Check if this is a reply to another yap
            const replyToId = textarea.dataset.replyTo;
            if (replyToId) {
                yapData.replyTo = replyToId;
                // Increment reply count of the parent yap
                database.ref(`yaps/${replyToId}/replies`).transaction(current => {
                    return (current || 0) + 1;
                });
            }
            // Generate a new key for the yap
            const newYapKey = database.ref('yaps').push().key;
            // Create update object
            const updates = {};
            updates[`yaps/${newYapKey}`] = yapData;
            // Store the full yap object in userYaps for timeline consistency
            updates[`userYaps/${auth.currentUser.uid}/${newYapKey}`] = yapData;
            // If this is a reply, add to the replies list
            if (replyToId) {
                updates[`yapReplies/${replyToId}/${newYapKey}`] = true;
            }
            // Extract mentions to notify users
            const mentions = extractMentions(content);
            if (mentions.length > 0) {
                processMentions(mentions, newYapKey, yapData.username);
            }
            // Extract hashtags for trending
            const hashtags = extractHashtags(content);
            if (hashtags.length > 0) {
                processHashtags(hashtags, newYapKey);
            }
            // Commit updates
            return database.ref().update(updates);
        })
        .then(() => {
            textarea.value = '';
            clearDraft();
            if (textarea.dataset.replyTo) {
                delete textarea.dataset.replyTo;
                const replyInfo = textarea.parentElement.querySelector('.reply-info');
                if (replyInfo) replyInfo.remove();
            }
            if (textarea === modalYapText) {
                closeModal();
            }
            updateCharacterCount(textarea, textarea === yapText ? characterCount : modalCharacterCount);
            showSnackbar('Yap posted successfully!', 'success');
            loadTimeline();
        })
        .catch(error => {
            console.error('Error posting yap:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        })
        .finally(() => {
            postButton.disabled = false;
            postButton.innerHTML = originalText;
        });
}

// Upload media files and return URLs
function uploadMediaFiles(files) {
    const promises = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = storage.ref().child(`yap-media/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        
        promises.push(
            fileRef.put(file).then(snapshot => {
                return snapshot.ref.getDownloadURL();
            })
        );
    }
    
    return Promise.all(promises);
}

// Get attached media files
function getMediaAttachments() {
    // This would get file inputs from the form
    // For now just return an empty array
    return [];
}

// Extract @mentions from content
function extractMentions(content) {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    
    if (!matches) return [];
    
    // Remove @ symbol and return unique usernames
    return [...new Set(matches.map(match => match.substring(1)))];
}

// Process mentions and create notifications
function processMentions(mentions, yapId, fromUsername) {
    mentions.forEach(username => {
        // First find the user ID from the username
        database.ref('usernames').child(username.toLowerCase()).once('value')
            .then(snapshot => {
                const userId = snapshot.val();
                if (userId && userId !== auth.currentUser.uid) { // Don't notify yourself
                    // Create notification
                    const notificationData = {
                        type: 'mention',
                        fromUserId: auth.currentUser.uid,
                        fromUsername: fromUsername,
                        yapId: yapId,
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        read: false
                    };
                    
                    // Add to user's notifications
                    database.ref(`notifications/${userId}`).push().set(notificationData);
                }
            });
    });
}

// Extract #hashtags from content
function extractHashtags(content) {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    
    if (!matches) return [];
    
    // Remove # symbol and return unique hashtags
    return [...new Set(matches.map(match => match.substring(1).toLowerCase()))];
}

// Process hashtags for trending
function processHashtags(hashtags, yapId) {
    const now = Date.now();
    const updates = {};
    
    hashtags.forEach(hashtag => {
        // Add to global hashtags index
        updates[`hashtags/${hashtag}/${yapId}`] = now;
        
        // Update trending count
        updates[`trending/${hashtag}/count`] = firebase.database.ServerValue.increment(1);
        updates[`trending/${hashtag}/lastUpdated`] = now;
    });
    
    database.ref().update(updates);
}

// Format timestamp to relative time
function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    // Convert to seconds
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
        return `${seconds}s`;
    }
    
    // Convert to minutes
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 60) {
        return `${minutes}m`;
    }
    
    // Convert to hours
    const hours = Math.floor(minutes / 60);
    
    if (hours < 24) {
        return `${hours}h`;
    }
    
    // Convert to days
    const days = Math.floor(hours / 24);
    
    if (days < 7) {
        return `${days}d`;
    }
      // Format to date
    const date = new Date(timestamp);
    const options = { month: 'short', day: 'numeric' };
    const nowDate = new Date(now);
    
    if (nowDate.getFullYear() === date.getFullYear()) {
        return date.toLocaleDateString(undefined, options);
    }
    
    // Include year if not current year
    return date.toLocaleDateString(undefined, {
        ...options,
        year: 'numeric'
    });
}

// Handle like/unlike yap
function toggleLike(yapId) {
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to like a Yap', 'error');
        return Promise.reject('Not authenticated');
    }
    
    const likeRef = database.ref(`likes/${yapId}/${auth.currentUser.uid}`);
    const yapRef = database.ref(`yaps/${yapId}`);
    
    return likeRef.once('value')
        .then(snapshot => {
            const updates = {};
            
            if (snapshot.exists()) {
                // User already liked this yap, so unlike it
                updates[`likes/${yapId}/${auth.currentUser.uid}`] = null;
                updates[`userLikes/${auth.currentUser.uid}/${yapId}`] = null;
                
                // Update yap likes count
                return yapRef.child('likes').transaction(likes => {
                    return (likes || 0) - 1;
                }).then(() => database.ref().update(updates));
            } else {
                // User hasn't liked this yap, so add the like
                updates[`likes/${yapId}/${auth.currentUser.uid}`] = true;
                updates[`userLikes/${auth.currentUser.uid}/${yapId}`] = true;
                
                // Get yap info for notification
                return yapRef.once('value').then(yapSnapshot => {
                    const yapData = yapSnapshot.val();
                    
                    // Update yap likes count
                    return yapRef.child('likes').transaction(likes => {
                        return (likes || 0) + 1;
                    }).then(() => {
                        // Create notification if the yap is not from the current user
                        if (yapData && yapData.uid !== auth.currentUser.uid) {
                            // Get current user info
                            return database.ref(`users/${auth.currentUser.uid}`).once('value')
                                .then(userSnapshot => {
                                    const userData = userSnapshot.val();
                                    
                                    // Create notification
                                    const notificationData = {
                                        type: 'like',
                                        fromUserId: auth.currentUser.uid,
                                        fromUsername: userData.username,
                                        yapId: yapId,
                                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                                        read: false
                                    };
                                    
                                    // Add notification
                                    updates[`notifications/${yapData.uid}/${generateId()}`] = notificationData;
                                    
                                    return database.ref().update(updates);
                                });
                        }
                        
                        return database.ref().update(updates);
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error toggling like:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        });
}

// Handle reyap
function toggleReyap(yapId) {
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to reyap', 'error');
        return Promise.reject('Not authenticated');
    }
    
    const reyapRef = database.ref(`reyaps/${yapId}/${auth.currentUser.uid}`);
    const yapRef = database.ref(`yaps/${yapId}`);
    
    return reyapRef.once('value')
        .then(snapshot => {
            const updates = {};
            
            if (snapshot.exists()) {
                // User already reyapped this, so undo it
                updates[`reyaps/${yapId}/${auth.currentUser.uid}`] = null;
                updates[`userReyaps/${auth.currentUser.uid}/${yapId}`] = null;
                
                // Update yap reyaps count
                return yapRef.child('reyaps').transaction(reyaps => {
                    return (reyaps || 0) - 1;
                }).then(() => database.ref().update(updates));
            } else {
                // User hasn't reyapped this, so add the reyap
                updates[`reyaps/${yapId}/${auth.currentUser.uid}`] = true;
                updates[`userReyaps/${auth.currentUser.uid}/${yapId}`] = true;
                
                // Get yap info for notification
                return yapRef.once('value').then(yapSnapshot => {
                    const yapData = yapSnapshot.val();
                    
                    // Update yap reyaps count
                    return yapRef.child('reyaps').transaction(reyaps => {
                        return (reyaps || 0) + 1;
                    }).then(() => {
                        // Create notification if the yap is not from the current user
                        if (yapData && yapData.uid !== auth.currentUser.uid) {
                            // Get current user info
                            return database.ref(`users/${auth.currentUser.uid}`).once('value')
                                .then(userSnapshot => {
                                    const userData = userSnapshot.val();
                                    
                                    // Create notification
                                    const notificationData = {
                                        type: 'reyap',
                                        fromUserId: auth.currentUser.uid,
                                        fromUsername: userData.username,
                                        yapId: yapId,
                                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                                        read: false
                                    };
                                    
                                    // Add notification
                                    updates[`notifications/${yapData.uid}/${generateId()}`] = notificationData;
                                    
                                    return database.ref().update(updates);
                                });
                        }
                        
                        return database.ref().update(updates);
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error toggling reyap:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        });
}

// Initialize bookmark functionality
function initBookmarkSystem() {
    // Listen for bookmark button clicks
    document.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn.bookmark')) {
            e.stopPropagation();
            const button = e.target.closest('.action-btn.bookmark');
            const yapItem = button.closest('.yap-item');
            const yapId = yapItem?.dataset.yapId;
            
            if (yapId) {
                toggleBookmark(yapId, button);
            }
        }
    });
    
    // Load bookmarks from localStorage
    const bookmarks = getBookmarks();
    
    // Update UI for any bookmarked yaps currently in the timeline
    document.querySelectorAll('.yap-item').forEach(yapItem => {
        const yapId = yapItem.dataset.yapId;
        const bookmarkBtn = yapItem.querySelector('.action-btn.bookmark');
        
        if (yapId && bookmarkBtn && bookmarks.includes(yapId)) {
            bookmarkBtn.classList.add('bookmarked');
            bookmarkBtn.querySelector('i').classList.replace('far', 'fas');
        }
    });
}

// Toggle bookmark status
function toggleBookmark(yapId, buttonElement) {
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to bookmark a Yap', 'error');
        return;
    }
    
    const bookmarks = getBookmarks();
    const isBookmarked = bookmarks.includes(yapId);
    
    if (isBookmarked) {
        // Remove from bookmarks
        const updatedBookmarks = bookmarks.filter(id => id !== yapId);
        saveBookmarks(updatedBookmarks);
        
        // Update UI
        buttonElement.classList.remove('bookmarked');
        buttonElement.querySelector('i').classList.replace('fas', 'far');
        
        showSnackbar('Removed from bookmarks');
    } else {
        // Add to bookmarks
        bookmarks.push(yapId);
        saveBookmarks(bookmarks);
        
        // Update UI
        buttonElement.classList.add('bookmarked');
        buttonElement.querySelector('i').classList.replace('far', 'fas');
        
        showSnackbar('Added to bookmarks', 'success');
    }
    
    // Also save to Firebase for sync across devices
    if (auth.currentUser) {
        const userBookmarksRef = database.ref(`userBookmarks/${auth.currentUser.uid}`);
        
        if (isBookmarked) {
            userBookmarksRef.child(yapId).remove();
        } else {
            userBookmarksRef.child(yapId).set(true);
        }
    }
}

// Get bookmarks from localStorage
function getBookmarks() {
    const key = `yappin_bookmarks_${auth.currentUser?.uid || 'guest'}`;
    const bookmarksJson = localStorage.getItem(key);
    return bookmarksJson ? JSON.parse(bookmarksJson) : [];
}

// Save bookmarks to localStorage
function saveBookmarks(bookmarks) {
    const key = `yappin_bookmarks_${auth.currentUser?.uid || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(bookmarks));
}

// Handle search functionality
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        return;
    }
    
    // Show searching state
    showSnackbar('Searching...', 'default', 1000);
    
    // Determine if it's a hashtag search or regular search
    if (query.startsWith('#')) {
        const hashtag = query.substring(1);
        searchHashtag(hashtag);
    } else if (query.startsWith('@')) {
        const username = query.substring(1);
        searchUser(username);
    } else {
        // Regular search - for simplicity combine results
        Promise.all([
            searchContent(query),
            searchHashtag(query),
            searchUser(query)
        ]).then(results => {
            const combinedResults = [].concat(...results);
            displaySearchResults(combinedResults);
        });
    }
}

// Search for content
function searchContent(query) {
    // Basic implementation - in a real app this would use server-side search
    return database.ref('yaps')
        .orderByChild('content')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .limitToFirst(20)
        .once('value')
        .then(snapshot => {
            const results = [];
            snapshot.forEach(childSnapshot => {
                results.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val(),
                    resultType: 'yap'
                });
            });
            return results;
        });
}

// Search for hashtags
function searchHashtag(hashtag) {
    return database.ref(`hashtags/${hashtag}`)
        .limitToFirst(20)
        .once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                return [];
            }
            
            // Get the yap IDs
            const yapIds = Object.keys(snapshot.val());
            
            // Fetch the actual yaps
            return Promise.all(
                yapIds.map(yapId => 
                    database.ref(`yaps/${yapId}`).once('value')
                        .then(yapSnapshot => ({
                            id: yapId,
                            ...yapSnapshot.val(),
                            resultType: 'hashtag'
                        }))
                )
            );
        });
}

// Search for users
function searchUser(username) {
    return database.ref('users')
        .orderByChild('lowercaseUsername')
        .startAt(username)
        .endAt(username + '\uf8ff')
        .limitToFirst(10)
        .once('value')
        .then(snapshot => {
            const results = [];
            snapshot.forEach(childSnapshot => {
                results.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val(),
                    resultType: 'user'
                });
            });
            return results;
        });
}

// Display search results
function displaySearchResults(results) {
    if (results.length === 0) {
        showSnackbar('No results found', 'default', 2000);
    } else {
        showSnackbar(`Found ${results.length} results`, 'success', 2000);
        
        // TODO: Update UI with results
        // This would be implemented based on the app's UI design
        // For now, log to console for debugging
        if (typeof console !== 'undefined' && console.table) {
            console.table(results.slice(0, 10)); // Show first 10 results
        }
    }
}

// Initialize tooltips
function initializeTooltips() {
    // Simple tooltip implementation
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
        element.addEventListener('focus', showTooltip);
        element.addEventListener('blur', hideTooltip);
    });
}

// Show tooltip
function showTooltip(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = e.target.dataset.tooltip;
    
    document.body.appendChild(tooltip);
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    
    e.target._tooltip = tooltip;
    
    setTimeout(() => {
        tooltip.classList.add('show');
    }, 10);
}

// Hide tooltip
function hideTooltip(e) {
    const tooltip = e.target._tooltip;
    if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => {
            tooltip.remove();
            delete e.target._tooltip;
        }, 200);
    }
}

// Theme functions are now consolidated above in the unified dark mode implementation
// This section has been removed to prevent duplication and conflicts
// The functionality is now handled by the applyTheme and applyInitialTheme functions

// Show new features notification
function showNewFeaturesNotification() {
    const lastVisit = localStorage.getItem('yappin_last_visit');
    const now = Date.now();
    localStorage.setItem('yappin_last_visit', now);
    
    // If first visit or it's been more than 7 days
    if (!lastVisit || (now - lastVisit > 7 * 24 * 60 * 60 * 1000)) {
        setTimeout(() => {
            showSnackbar('Welcome to the enhanced Yappin\'! Check out our new features.', 'success', 5000);
        }, 2000);
    }
}

// Debounce utility function to limit how often a function is called
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initialize bookmark system when the DOM is ready
document.addEventListener('DOMContentLoaded', initBookmarkSystem);

// Add follow/unfollow functionality
function toggleFollow(userId) {
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to follow users', 'error');
        return;
    }

    const currentUserId = auth.currentUser.uid;
    const followingRef = database.ref(`following/${currentUserId}/${userId}`);
    const followersRef = database.ref(`followers/${userId}/${currentUserId}`);

    followingRef.once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                // Unfollow user
                const updates = {};
                updates[`following/${currentUserId}/${userId}`] = null;
                updates[`followers/${userId}/${currentUserId}`] = null;
                return database.ref().update(updates);
            } else {
                // Follow user
                const updates = {};
                updates[`following/${currentUserId}/${userId}`] = true;
                updates[`followers/${userId}/${currentUserId}`] = true;
                return database.ref().update(updates);
            }
        })
        .then(() => {
            showSnackbar('Follow status updated', 'success');
        })
        .catch(error => {
            console.error('Error toggling follow:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        });
}
