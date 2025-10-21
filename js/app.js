// Main App Script

// Helper function to generate random avatar
function generateRandomAvatar(seed) {
    const style = 'fun-emoji'; // Cute fun emojis - very friendly
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// DOM Elements
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
const imageInput = document.getElementById('imageInput');
const attachImageBtn = document.getElementById('attachImageBtn');
const emojiBtn = document.getElementById('emojiBtn');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');

// Constants
const MAX_YAP_LENGTH = 280;
const DRAFTS_STORAGE_KEY = 'yappin_drafts';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 4;

// Image attachments storage
let selectedImages = [];

// Event Listeners

// Only add event listeners if the elements exist
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

// Image attachment functionality
if (attachImageBtn && imageInput) {
    attachImageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageSelect);
}

// Paste image functionality
if (yapText) {
    yapText.addEventListener('paste', handlePaste);
}

// Emoji picker functionality
if (emojiBtn) {
    emojiBtn.addEventListener('click', toggleEmojiPicker);
}

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
const darkModeToggle = document.getElementById('darkModeToggle');

// Function to apply theme
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // Update checkbox state if toggle exists
    if (darkModeToggle && darkModeToggle.type === 'checkbox') {
        darkModeToggle.checked = isDark;
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

// Listen for system theme changes (only if user hasn't set a preference)
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkModeMediaQuery.addEventListener('change', (e) => {
    // Only auto-update if user hasn't manually set a preference
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
        applyTheme(e.matches);
    }
});

// Toggle dark mode (called from checkbox onchange)
window.toggleDarkMode = function() {
    const isDarkMode = darkModeToggle.checked;
    applyTheme(isDarkMode);
    showSnackbar(isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'success');
}

// Apply theme on page load
applyInitialTheme();

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
async function closeModal() {
    let saveDraftConfirm = false;
    
    // Ask for confirmation if there's unsaved content
    if (modalYapText.value.trim() !== '') {
        saveDraftConfirm = await showConfirmModal(
            'Save Draft',
            'Do you want to save this Yap as a draft?',
            'Save',
            'Discard'
        );
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

// ========================================
// IMAGE ATTACHMENTS & PASTE
// ========================================

// Handle image selection from file input
function handleImageSelect(event) {
    const files = Array.from(event.target.files);
    addImagesToYap(files);
}

// Handle paste events (including images)
function handlePaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            addImagesToYap([file]);
        }
    }
}

// Add images to yap
function addImagesToYap(files) {
    for (let file of files) {
        // Check if we've reached the limit
        if (selectedImages.length >= MAX_IMAGES) {
            showSnackbar(`Maximum ${MAX_IMAGES} images allowed`, 'error');
            break;
        }
        
        // Check file size
        if (file.size > MAX_IMAGE_SIZE) {
            showSnackbar(`Image too large. Max size: 5MB`, 'error');
            continue;
        }
        
        // Check if it's an image
        if (!file.type.startsWith('image/')) {
            showSnackbar('Only images are allowed', 'error');
            continue;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImages.push({
                file: file,
                dataUrl: e.target.result
            });
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    }
}

// Render image previews
function renderImagePreviews() {
    if (!imagePreviewContainer) return;
    
    if (selectedImages.length === 0) {
        imagePreviewContainer.classList.add('hidden');
        imagePreviewContainer.innerHTML = '';
        return;
    }
    
    imagePreviewContainer.classList.remove('hidden');
    imagePreviewContainer.innerHTML = '';
    
    selectedImages.forEach((image, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${image.dataUrl}" alt="Preview ${index + 1}">
            <button class="image-preview-remove" onclick="removeImage(${index})" aria-label="Remove image">
                <i class="fas fa-times"></i>
            </button>
        `;
        imagePreviewContainer.appendChild(preview);
    });
}

// Remove image from selection
window.removeImage = function(index) {
    selectedImages.splice(index, 1);
    renderImagePreviews();
    // Clear file input
    if (imageInput) imageInput.value = '';
};

// Clear all images
function clearImages() {
    selectedImages = [];
    renderImagePreviews();
    if (imageInput) imageInput.value = '';
}

// ========================================
// EMOJI PICKER
// ========================================

const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
    '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
    '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
    '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
    '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
    '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
    '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
    '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
    '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩',
    '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺',
    '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗',
    '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️',
    '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️',
    '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇',
    '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌',
    '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉',
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
    '🔥', '⭐', '🌟', '✨', '💫', '💥', '💢', '💦',
    '💨', '🌈', '☀️', '🌙', '⚡', '☁️', '🌊', '🎵',
    '🎶', '🎤', '🎧', '📱', '💻', '⌚', '📷', '🎮'
];

let emojiPickerElement = null;

function toggleEmojiPicker() {
    if (!emojiPickerElement) {
        createEmojiPicker();
    }
    
    if (emojiPickerElement.classList.contains('hidden')) {
        emojiPickerElement.classList.remove('hidden');
    } else {
        emojiPickerElement.classList.add('hidden');
    }
}

function createEmojiPicker() {
    emojiPickerElement = document.createElement('div');
    emojiPickerElement.className = 'emoji-picker hidden';
    
    commonEmojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn-item';
        btn.textContent = emoji;
        btn.onclick = () => insertEmoji(emoji);
        emojiPickerElement.appendChild(btn);
    });
    
    // Insert after compose actions
    const composeActions = document.querySelector('.compose-actions');
    if (composeActions) {
        composeActions.parentElement.insertBefore(emojiPickerElement, composeActions);
    }
    
    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (emojiPickerElement && 
            !emojiPickerElement.contains(e.target) && 
            !emojiBtn.contains(e.target)) {
            emojiPickerElement.classList.add('hidden');
        }
    });
}

function insertEmoji(emoji) {
    const textarea = yapText;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + emoji + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    textarea.focus();
    
    // Update character count
    updateCharacterCount(textarea, characterCount);
    
    // Hide picker
    if (emojiPickerElement) {
        emojiPickerElement.classList.add('hidden');
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
    
    // Check for media attachments
    const mediaFiles = getMediaAttachments();
    
    // Validate content - must have either text or media
    if (!content && (!mediaFiles || mediaFiles.length === 0)) {
        showSnackbar('Yap must have text or images', 'error');
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
            // Create yap object (using 'text' to match Firebase rules)
            const yapData = {
                uid: auth.currentUser.uid,
                username: userData.username || userData.displayName || 'anonymous',
                timestamp: Date.now(),
                likes: 0,
                reyaps: 0,
                replies: 0,
                userPhotoURL: userData.photoURL || generateRandomAvatar(auth.currentUser.uid)
            };
            
            // Add text only if not empty
            if (content) {
                yapData.text = content;
            }
            
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
            
            // Commit updates FIRST
            return database.ref().update(updates).then(() => {
                // AFTER successful creation, handle mentions and notifications
                const mentions = extractMentions(content);
                if (mentions.length > 0) {
                    processMentions(mentions, newYapKey, yapData.username);
                }
                
                // Process mentions for notifications (from notifications.js)
                if (typeof processMentionsAndNotify === 'function') {
                    processMentionsAndNotify(newYapKey, content, auth.currentUser.uid);
                }
                
                // If this is a reply, notify the original yap author
                if (replyToId) {
                    database.ref(`yaps/${replyToId}/uid`).once('value').then(authorSnapshot => {
                        const originalAuthorId = authorSnapshot.val();
                        if (originalAuthorId && typeof notifyReply === 'function') {
                            notifyReply(replyToId, originalAuthorId, auth.currentUser.uid, content);
                        }
                    }).catch(err => console.error('[ERROR] Failed to notify reply:', err));
                }
                
                // Extract hashtags for trending
                const hashtags = extractHashtags(content);
                if (hashtags.length > 0) {
                    processHashtags(hashtags, newYapKey);
                }
                
                // Return the yap data with ID for immediate display
                return { yapId: newYapKey, yapData };
            });
        })
        .then(({ yapId, yapData }) => {
            textarea.value = '';
            clearDraft();
            clearImages(); // Clear attached images
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
            
            // Add the yap immediately to the timeline without reloading
            if (typeof createYapElement === 'function' && yapsContainer) {
                yapData.id = yapId;
                const yapElement = createYapElement(yapData, false, false);
                
                // Insert at the top of the timeline
                const firstYap = yapsContainer.querySelector('.yap-item');
                if (firstYap) {
                    yapsContainer.insertBefore(yapElement, firstYap);
                } else {
                    // Remove any empty state messages
                    const emptyState = yapsContainer.querySelector('.empty-state');
                    if (emptyState) emptyState.remove();
                    yapsContainer.appendChild(yapElement);
                }
            }
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

// Convert images to base64 (no Firebase Storage needed)
function uploadMediaFiles(files) {
    const promises = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Convert to base64
        promises.push(new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                // Compress large images
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Max dimensions to keep database size reasonable
                    const maxSize = 1200;
                    if (width > height && width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to base64 with compression (0.8 quality)
                    const base64 = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(base64);
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        }));
    }
    
    return Promise.all(promises);
}

// Get attached media files
function getMediaAttachments() {
    // Return selected images as File objects
    return selectedImages.map(img => img.file);
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
                        // Update database
                        return database.ref().update(updates).then(() => {
                            // Create notification if the yap is not from the current user
                            if (yapData && yapData.uid !== auth.currentUser.uid && typeof notifyLike === 'function') {
                                notifyLike(yapId, yapData.uid, auth.currentUser.uid);
                            }
                        });
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
                        // Update database
                        return database.ref().update(updates).then(() => {
                            // Create notification if the yap is not from the current user
                            if (yapData && yapData.uid !== auth.currentUser.uid && typeof notifyReyap === 'function') {
                                notifyReyap(yapId, yapData.uid, auth.currentUser.uid);
                            }
                        });
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

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // N key: New yap (when not in input field)
    if (e.key === 'n' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openYapModal();
    }
    
    // Escape: Close modal
    if (e.key === 'Escape') {
        if (createYapModal && !createYapModal.classList.contains('hidden')) {
            closeModal();
        }
    }
    
    // Ctrl/Cmd + Enter: Post yap (when in textarea)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement === yapText) {
            createYap(yapText);
        } else if (document.activeElement === modalYapText) {
            createYap(modalYapText);
        }
    }
});

// Improve focus management for modals
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    });
}

// Apply focus trap to modal when opened
if (createYapModal) {
    trapFocus(createYapModal);
}

// ========================================
// NEW MODAL HANDLERS FOR NAVIGATION
// ========================================

// Profile Modal (unified with Settings)
window.showProfile = function() {
    const profileModal = document.getElementById('profileModal');
    if (!profileModal) return;
    
    toggleModal(profileModal, true);
    
    // Load current user's profile picture
    const user = auth.currentUser;
    if (user) {
        const profilePicturePreview = document.getElementById('profilePicturePreview');
        if (profilePicturePreview && user.photoURL) {
            profilePicturePreview.src = user.photoURL;
        }
        
        // Load privacy setting
        database.ref(`users/${user.uid}/privacy`).once('value').then(snapshot => {
            const privacy = snapshot.val() || 'public';
            const checkbox = document.getElementById('requireApprovalCheckbox');
            if (checkbox) {
                checkbox.checked = (privacy === 'private');
            }
        }).catch(error => {
            console.error('[ERROR] Failed to load privacy setting:', error);
        });
    }
};

window.closeProfileModal = function() {
    const profileModal = document.getElementById('profileModal');
    if (!profileModal) return;
    toggleModal(profileModal, false);
};

// Search Modal
window.showSearch = function() {
    const searchModal = document.getElementById('searchModal');
    if (!searchModal) return;
    
    toggleModal(searchModal, true);
    
    // Focus search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
        searchInput.value = '';
        
        // Clear previous results
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.innerHTML = '';
        }
    }
};

window.closeSearchModal = function() {
    const searchModal = document.getElementById('searchModal');
    if (!searchModal) return;
    toggleModal(searchModal, false);
};

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (searchInput && searchResults) {
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim().toLowerCase();
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }
            
            // Debounce search
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });
    }
});

function performSearch(query) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        searchResults.innerHTML = '<p class="no-results">Please sign in to search</p>';
        return;
    }
    
    searchResults.innerHTML = '<p class="loading-text">Searching...</p>';
    
    // Search by username
    database.ref('usernames').orderByKey().startAt(query).endAt(query + '\uf8ff').limitToFirst(10).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                searchResults.innerHTML = '<p class="no-results">No users found</p>';
                return;
            }
            
            const userIds = [];
            snapshot.forEach(child => {
                userIds.push(child.val());
            });
            
            // Load user details - only read accessible fields
            const promises = userIds.map(uid => {
                return Promise.all([
                    database.ref(`users/${uid}/username`).once('value'),
                    database.ref(`users/${uid}/photoURL`).once('value'),
                    database.ref(`users/${uid}/privacy`).once('value')
                ]).then(([usernameSnap, photoSnap, privacySnap]) => ({
                    key: uid,
                    val: () => ({
                        username: usernameSnap.val(),
                        photoURL: photoSnap.val(),
                        privacy: privacySnap.val()
                    }),
                    exists: () => usernameSnap.exists()
                }));
            });
            return Promise.all(promises);
        })
        .then(snapshots => {
            if (!snapshots || snapshots.length === 0) {
                searchResults.innerHTML = '<p class="no-results">No users found</p>';
                return;
            }
            
            searchResults.innerHTML = '';
            
            snapshots.forEach(userSnapshot => {
                if (!userSnapshot.exists()) return;
                
                const userData = userSnapshot.val();
                const uid = userSnapshot.key;
                
                // Skip current user
                if (uid === currentUser.uid) return;
                
                // Check privacy
                if (userData.privacy === 'private') {
                    // Check if following
                    database.ref(`following/${currentUser.uid}/${uid}`).once('value').then(followSnapshot => {
                        if (!followSnapshot.exists()) {
                            return; // Don't show private accounts unless following
                        }
                    });
                }
                
                const userCard = document.createElement('div');
                userCard.className = 'user-search-result';
                userCard.innerHTML = `
                    <img src="${userData.photoURL || generateRandomAvatar(uid)}" alt="${userData.username}" class="search-user-avatar">
                    <div class="search-user-info">
                        <div class="search-user-name">@${userData.username}</div>
                        <div class="search-user-bio">${userData.privacy === 'private' ? '🔒 Private Account' : 'Public Account'}</div>
                    </div>
                    <div class="search-actions">
                        <button onclick="followFromSearch('${uid}')" class="btn btn-primary search-follow-btn" id="search-follow-${uid}">
                            <i class="fas fa-user-plus"></i> Follow
                        </button>
                        <button onclick="startConversation('${uid}')" class="btn search-message-btn hidden" id="search-message-${uid}">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                `;
                searchResults.appendChild(userCard);
                
                // Check if already following and if mutual follow
                database.ref(`following/${currentUser.uid}/${uid}`).once('value').then(snapshot => {
                    const followBtn = document.getElementById(`search-follow-${uid}`);
                    const messageBtn = document.getElementById(`search-message-${uid}`);
                    if (!followBtn) return;
                    
                    if (snapshot.exists()) {
                        followBtn.innerHTML = '<i class="fas fa-check"></i> Following';
                        followBtn.classList.add('following');
                        followBtn.onclick = () => unfollowFromSearch(uid);
                        
                        // Check if they follow back (mutual follow = can message)
                        database.ref(`following/${uid}/${currentUser.uid}`).once('value').then(mutualSnapshot => {
                            if (mutualSnapshot.exists() && messageBtn) {
                                messageBtn.classList.remove('hidden');
                            }
                        });
                    }
                });
            });
        })
        .catch(error => {
            console.error('[ERROR] Search failed:', error);
            searchResults.innerHTML = '<p class="error-text">Search failed. Please try again.</p>';
        });
}

window.followFromSearch = function(targetUserId) {
    if (!auth.currentUser) return;
    
    const currentUserId = auth.currentUser.uid;
    
    // Check if target account is private
    database.ref(`users/${targetUserId}/privacy`).once('value').then(snapshot => {
        const privacy = snapshot.val() || 'public';
        
        if (privacy === 'private') {
            // Send follow request
            const updates = {};
            updates[`followRequests/${targetUserId}/${currentUserId}`] = true;
            
            return database.ref().update(updates).then(() => {
                showSnackbar('Follow request sent', 'success');
                const btn = document.getElementById(`search-follow-${targetUserId}`);
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-clock"></i> Pending';
                    btn.classList.add('pending');
                    btn.disabled = true;
                }
            });
        } else {
            // Public account - follow directly
            const updates = {};
            updates[`following/${currentUserId}/${targetUserId}`] = true;
            updates[`followers/${targetUserId}/${currentUserId}`] = true;
            
            return database.ref().update(updates).then(() => {
                // Update counts
                return Promise.all([
                    database.ref(`users/${currentUserId}/followingCount`).transaction(count => (count || 0) + 1),
                    database.ref(`users/${targetUserId}/followersCount`).transaction(count => (count || 0) + 1)
                ]);
            }).then(() => {
                showSnackbar('Now following!', 'success');
                const btn = document.getElementById(`search-follow-${targetUserId}`);
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Following';
                    btn.classList.add('following');
                    btn.onclick = () => unfollowFromSearch(targetUserId);
                }
            });
        }
    }).catch(error => {
        console.error('[ERROR] Follow failed:', error);
        showSnackbar('Follow failed', 'error');
    });
};

window.unfollowFromSearch = async function(targetUserId) {
    if (!auth.currentUser) return;
    
    const currentUserId = auth.currentUser.uid;
    
    const confirmed = await showConfirmModal(
        'Unfollow User',
        'Are you sure you want to unfollow this user?',
        'Unfollow',
        'Cancel'
    );
    if (!confirmed) return;
    
    const updates = {};
    updates[`following/${currentUserId}/${targetUserId}`] = null;
    updates[`followers/${targetUserId}/${currentUserId}`] = null;
    
    database.ref().update(updates).then(() => {
        // Update counts
        return Promise.all([
            database.ref(`users/${currentUserId}/followingCount`).transaction(count => Math.max((count || 1) - 1, 0)),
            database.ref(`users/${targetUserId}/followersCount`).transaction(count => Math.max((count || 1) - 1, 0))
        ]);
    }).then(() => {
        showSnackbar('Unfollowed', 'success');
        const btn = document.getElementById(`search-follow-${targetUserId}`);
        if (btn) {
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
            btn.classList.remove('following');
            btn.onclick = () => followFromSearch(targetUserId);
        }
    }).catch(error => {
        console.error('[ERROR] Unfollow failed:', error);
        showSnackbar('Unfollow failed', 'error');
    });
};

// Messages Modal
window.showMessages = function() {
    const messagesModal = document.getElementById('messagesModal');
    if (!messagesModal) return;
    toggleModal(messagesModal, true);
    
    // Load conversations (from messaging.js)
    if (typeof loadConversations === 'function') {
        loadConversations();
    }
};

window.closeMessagesModal = function() {
    const messagesModal = document.getElementById('messagesModal');
    if (!messagesModal) return;
    toggleModal(messagesModal, false);
    
    // Close any open conversation
    if (typeof closeConversation === 'function') {
        closeConversation();
    }
};

// ========================================
// CONFIRMATION MODAL
// ========================================

// Show confirmation modal (native app-style)
window.showConfirmModal = function(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const confirmModal = document.getElementById('confirmModal');
        const confirmModalTitle = document.getElementById('confirmModalTitle');
        const confirmModalMessage = document.getElementById('confirmModalMessage');
        const confirmModalConfirm = document.getElementById('confirmModalConfirm');
        const confirmModalCancel = document.getElementById('confirmModalCancel');
        
        if (!confirmModal) {
            // Fallback to browser confirm if modal doesn't exist
            resolve(confirm(message));
            return;
        }
        
        // Set content
        if (confirmModalTitle) confirmModalTitle.textContent = title;
        if (confirmModalMessage) confirmModalMessage.textContent = message;
        if (confirmModalConfirm) confirmModalConfirm.textContent = confirmText;
        if (confirmModalCancel) confirmModalCancel.textContent = cancelText;
        
        // Handle confirm
        const handleConfirm = () => {
            toggleModal(confirmModal, false);
            cleanup();
            resolve(true);
        };
        
        // Handle cancel
        const handleCancel = () => {
            toggleModal(confirmModal, false);
            cleanup();
            resolve(false);
        };
        
        // Cleanup function
        const cleanup = () => {
            if (confirmModalConfirm) confirmModalConfirm.removeEventListener('click', handleConfirm);
            if (confirmModalCancel) confirmModalCancel.removeEventListener('click', handleCancel);
        };
        
        // Add event listeners
        if (confirmModalConfirm) confirmModalConfirm.addEventListener('click', handleConfirm);
        if (confirmModalCancel) confirmModalCancel.addEventListener('click', handleCancel);
        
        // Show modal
        toggleModal(confirmModal, true);
    });
};
