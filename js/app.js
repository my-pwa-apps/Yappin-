// Main App Script
// Performance utilities accessed via window.PerformanceUtils

// Performance Optimization: Cache frequently accessed user data
const userDataCache = new Map();
const USER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedUserData(uid) {
    const cached = userDataCache.get(uid);
    if (cached && Date.now() - cached.timestamp < USER_CACHE_DURATION) {
        return Promise.resolve(cached.data);
    }
    return null;
}

function setCachedUserData(uid, data) {
    userDataCache.set(uid, {
        data: data,
        timestamp: Date.now()
    });
}

// Helper function to generate random avatar (cached)
const avatarCache = new Map();
function generateRandomAvatar(seed) {
    if (!avatarCache.has(seed)) {
        const style = 'fun-emoji';
        avatarCache.set(seed, `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`);
    }
    return avatarCache.get(seed);
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

// Note: Search functionality is set up in DOMContentLoaded event listener below
// which correctly uses performSearch() function with usernames index

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
    // Theme change is obvious, no need for notification
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
    if (typeof window.loadDraft === 'function') {
        window.loadDraft();
    }
    
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize all event listeners (removes inline onclick handlers)
    if (typeof window.initializeEventListeners === 'function') {
        window.initializeEventListeners();
    }
    
    // Initialize settings modal
    if (typeof window.initializeSettings === 'function') {
        window.initializeSettings();
    }
    
    // Initialize media module
    if (typeof window.initializeMedia === 'function') {
        window.initializeMedia();
    }
    
    // Initialize invites module
    if (typeof window.initializeInvites === 'function') {
        window.initializeInvites();
    }
    
    // Show new features notification for returning users
    showNewFeaturesNotification();
});

// Utility function to show snackbar notifications (consolidated from duplicate)
function showSnackbar(message, type = 'default', duration = 3000) {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        (window.PerformanceUtils?.Logger || console).warn('Snackbar element not found');
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
    selectedGifUrl = null;
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
        (window.PerformanceUtils?.Logger || console).error('Invalid textarea element provided to createYap');
        return;
    }
    
    // Get the text content
    const content = textarea.value.trim();
    
    // Check for media attachments
    const mediaFiles = getMediaAttachments();
    
    // Validate content - must have either text or media
    if (!content && (!mediaFiles || mediaFiles.length === 0)) {
        showSnackbar('Please add text or images to your yap', 'error');
        return;
    }
    
    // Validate text length only if text is provided
    if (content && content.length > MAX_YAP_LENGTH) {
        showSnackbar(`Yap text must be ${MAX_YAP_LENGTH} characters or less`, 'error');
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
    
    // Get user data - only read accessible fields
    Promise.all([
        database.ref(`users/${auth.currentUser.uid}/username`).once('value'),
        database.ref(`users/${auth.currentUser.uid}/displayName`).once('value'),
        database.ref(`users/${auth.currentUser.uid}/photoURL`).once('value')
    ])
        .then(([usernameSnap, displayNameSnap, photoSnap]) => {
            const userData = {
                username: usernameSnap.val(),
                displayName: displayNameSnap.val(),
                photoURL: photoSnap.val()
            };
            if (!userData.username) {
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
                username: userData.username || 'anonymous',
                timestamp: Date.now(),
                likes: 0,
                reyaps: 0,
                replies: 0,
                userPhotoURL: userData.photoURL || generateRandomAvatar(auth.currentUser.uid)
            };
            
            // Add displayName if set
            if (userData.displayName) {
                yapData.displayName = userData.displayName;
            }
            
            // Add text only if not empty
            if (content) {
                yapData.text = content;
            }
            
            // Add media if any
            if (mediaUrls && mediaUrls.length > 0) {
                yapData.media = mediaUrls;
            }
            // Check if this is a reply to another yap
            const replyToId = window.replyContext?.yapId || textarea.dataset.replyTo;
            if (replyToId) {
                yapData.replyTo = replyToId;
            }
            // Generate a new key for the yap
            const newYapKey = database.ref('yaps').push().key;
            // Create update object
            const updates = {};
            updates[`yaps/${newYapKey}`] = yapData;
            // Store the full yap object in userYaps for timeline consistency
            updates[`userYaps/${auth.currentUser.uid}/${newYapKey}`] = yapData;
            // If this is a reply, add to the replies list and update reply count
            if (replyToId) {
                updates[`yapReplies/${replyToId}/${newYapKey}`] = true;
                // Get current reply count and increment
                return database.ref(`yaps/${replyToId}`).once('value').then(parentSnap => {
                    const currentReplies = parentSnap.val()?.replies || 0;
                    updates[`yaps/${replyToId}/replies`] = currentReplies + 1;
                    
                    // Commit updates
                    return database.ref().update(updates);
                }).then(() => {
                    return { replyToId, newYapKey, yapData };
                });
            }
            
            // Commit updates FIRST (non-reply case)
            return database.ref().update(updates).then(() => {
                return { replyToId, newYapKey, yapData };
            });
        })
        .then(({ replyToId, newYapKey, yapData }) => {
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
                }).catch(err => (window.PerformanceUtils?.Logger || console).error('[ERROR] Failed to notify reply:', err));
            }
            
            // Extract hashtags for trending
            const hashtags = extractHashtags(content);
            if (hashtags.length > 0) {
                processHashtags(hashtags, newYapKey);
            }
            
            // Return the yap data with ID for immediate display
            return { yapId: newYapKey, yapData };
        })
        .then(({ yapId, yapData }) => {
            // Clear draft FIRST to prevent it from being reloaded
            clearDraft();
            
            // Clear text area
            textarea.value = '';
            
            // Clear images
            clearImages();
            
            // Clear reply context
            if (window.replyContext) {
                window.replyContext = null;
                const replyIndicator = document.getElementById('replyIndicator');
                if (replyIndicator) {
                    replyIndicator.style.display = 'none';
                }
            }
            
            if (textarea.dataset.replyTo) {
                delete textarea.dataset.replyTo;
                const replyInfo = textarea.parentElement.querySelector('.reply-info');
                if (replyInfo) replyInfo.remove();
            }
            
            // Update character count to show 0/280
            const charCount = textarea === yapText ? characterCount : modalCharacterCount;
            if (charCount) {
                charCount.textContent = '0';
                charCount.parentElement.classList.remove('warning', 'error');
            }
            
            if (textarea === modalYapText) {
                // Close modal without asking to save (we already posted!)
                toggleModal(createYapModal, false);
            }
            showSnackbar('Yap posted successfully!', 'success');
            
            // The real-time listener in timeline.js will automatically add the new yap
            // No need to manually insert it here to avoid duplication
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Error posting yap:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        })
        .finally(() => {
            postButton.disabled = false;
            postButton.innerHTML = originalText;
        });
}

// Convert images to base64 (no Firebase Storage needed)
function uploadMediaFiles(mediaItems) {
    const promises = [];
    
    for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        
        // If it's a GIF URL, just return it as-is
        if (item.type === 'gif') {
            promises.push(Promise.resolve({ type: 'gif', url: item.url }));
            continue;
        }
        
        // Otherwise it's an image file - convert to base64
        const file = item.file || item;
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
                    resolve({ type: 'image', url: base64 });
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

// Get attached media files and GIFs
function getMediaAttachments() {
    const attachments = [];
    
    // Add image files
    selectedImages.forEach(img => {
        attachments.push({ type: 'image', file: img.file });
    });
    
    // Add GIF if selected
    if (selectedGifUrl) {
        attachments.push({ type: 'gif', url: selectedGifUrl });
    }
    
    return attachments;
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

// Make formatRelativeTime globally available
window.formatRelativeTime = formatRelativeTime;

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
                
                // Get current count and decrement
                return yapRef.once('value').then(yapSnapshot => {
                    const currentCount = yapSnapshot.val()?.likes || 0;
                    updates[`yaps/${yapId}/likes`] = Math.max(0, currentCount - 1);
                    return database.ref().update(updates);
                });
            } else {
                // User hasn't liked this yap, so add the like
                updates[`likes/${yapId}/${auth.currentUser.uid}`] = true;
                updates[`userLikes/${auth.currentUser.uid}/${yapId}`] = true;
                
                // Get yap info for notification and current count
                return yapRef.once('value').then(yapSnapshot => {
                    const yapData = yapSnapshot.val();
                    const currentCount = yapData?.likes || 0;
                    updates[`yaps/${yapId}/likes`] = currentCount + 1;
                    
                    // Update database
                    return database.ref().update(updates).then(() => {
                        // Create notification if the yap is not from the current user
                        if (yapData && yapData.uid !== auth.currentUser.uid && typeof notifyLike === 'function') {
                            notifyLike(yapId, yapData.uid, auth.currentUser.uid);
                        }
                    });
                });
            }
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Error toggling like:', error);
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
                
                // Get current count and decrement
                return yapRef.once('value').then(yapSnapshot => {
                    const currentCount = yapSnapshot.val()?.reyaps || 0;
                    updates[`yaps/${yapId}/reyaps`] = Math.max(0, currentCount - 1);
                    return database.ref().update(updates);
                });
            } else {
                // User hasn't reyapped this, so add the reyap
                updates[`reyaps/${yapId}/${auth.currentUser.uid}`] = true;
                updates[`userReyaps/${auth.currentUser.uid}/${yapId}`] = true;
                
                // Get yap info for notification and current count
                return yapRef.once('value').then(yapSnapshot => {
                    const yapData = yapSnapshot.val();
                    const currentCount = yapData?.reyaps || 0;
                    updates[`yaps/${yapId}/reyaps`] = currentCount + 1;
                    
                    // Update database
                    return database.ref().update(updates).then(() => {
                        // Create notification if the yap is not from the current user
                        if (yapData && yapData.uid !== auth.currentUser.uid && typeof notifyReyap === 'function') {
                            notifyReyap(yapId, yapData.uid, auth.currentUser.uid);
                        }
                    });
                });
            }
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Error toggling reyap:', error);
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

// Handle search functionality (LEGACY - NOT USED)
// This function is replaced by performSearch() which correctly uses the usernames index
// Kept here for reference only - do not call this function
function handleSearch() {
    (window.PerformanceUtils?.Logger || console).warn('handleSearch() is deprecated - use performSearch() instead');
    return;
}

// Search for content (disabled - not compatible with privacy rules)
function searchContent(query) {
    // Content search across all yaps requires reading /yaps which violates privacy rules
    // Users can only see yaps from people they follow or public accounts
    // For now, return empty results and focus on user/hashtag search
    return Promise.resolve([]);
}

// Search for hashtags (disabled - requires reading individual yaps which violates privacy rules)
function searchHashtag(hashtag) {
    // Hashtag search requires reading yaps, which users can only see if they follow the author or account is public
    // This global query would cause permission errors
    return Promise.resolve([]);
}

// Search for users (disabled - use performSearch() instead which uses usernames index)
function searchUser(username) {
    // This function tried to query /users directly which requires read permission on all users
    // Use performSearch() instead which queries the usernames index
    return Promise.resolve([]);
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

// Initialize tooltips - Convert title to data-tooltip for Material Design tooltips
function initializeTooltips() {
    convertTitlesToTooltips(document);
}

// Convert title attributes to data-tooltip
function convertTitlesToTooltips(root = document) {
    const elements = root.querySelectorAll('[title]:not([data-tooltip])');
    elements.forEach(element => {
        const title = element.getAttribute('title');
        if (title && title.trim()) {
            element.setAttribute('data-tooltip', title);
        }
    });
}

// Make it globally available so it can be called after dynamic content loads
window.convertTitlesToTooltips = convertTitlesToTooltips;

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
            (window.PerformanceUtils?.Logger || console).error('Error toggling follow:', error);
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
    
    // Load current user's profile data
    const user = auth.currentUser;
    if (user) {
        const profilePicturePreview = document.getElementById('profilePicturePreview');
        if (profilePicturePreview && user.photoURL) {
            profilePicturePreview.src = user.photoURL;
        }
        
        // Load user data from database
        Promise.all([
            database.ref(`users/${user.uid}/displayName`).once('value'),
            database.ref(`users/${user.uid}/username`).once('value'),
            database.ref(`users/${user.uid}/privacy`).once('value')
        ]).then(([displayNameSnap, usernameSnap, privacySnap]) => {
            // Set display name
            const displayNameInput = document.getElementById('displayNameInput');
            if (displayNameInput) {
                displayNameInput.value = displayNameSnap.val() || '';
            }
            
            // Set username (readonly)
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                usernameDisplay.value = '@' + (usernameSnap.val() || user.email?.split('@')[0] || '');
            }
            
            // Set privacy setting
            const privacy = privacySnap.val() || 'public';
            const checkbox = document.getElementById('requireApprovalCheckbox');
            if (checkbox) {
                checkbox.checked = (privacy === 'private');
            }
        }).catch(error => {
            (window.PerformanceUtils?.Logger || console).error('[ERROR] Failed to load profile data:', error);
            showSnackbar('Could not load profile data. Please refresh.', 'error');
            
            // Set fallback values
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay && user.email) {
                usernameDisplay.value = '@' + user.email.split('@')[0];
            }
        });
    }
};

window.updateDisplayName = function() {
    const user = auth.currentUser;
    if (!user) {
        showSnackbar('Please sign in to update your profile', 'error');
        return;
    }
    
    const displayNameInput = document.getElementById('displayNameInput');
    if (!displayNameInput) return;
    
    const displayName = displayNameInput.value.trim();
    
    // Validate display name
    if (displayName && (displayName.length < 1 || displayName.length > 50)) {
        showSnackbar('Display name must be 1-50 characters', 'error');
        return;
    }
    
    // Update in database
    const updates = {};
    if (displayName) {
        updates[`users/${user.uid}/displayName`] = displayName;
    } else {
        updates[`users/${user.uid}/displayName`] = null; // Remove if empty
    }
    
    database.ref().update(updates).then(() => {
        showSnackbar('Display name updated successfully', 'success');
    }).catch(error => {
        (window.PerformanceUtils?.Logger || console).error('[ERROR] Failed to update display name:', error);
        showSnackbar('Failed to update display name', 'error');
    });
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
            
            // Remove duplicates
            const uniqueUserIds = [...new Set(userIds)];

            
            // Load user details - only read accessible fields
            const promises = uniqueUserIds.map(uid => {
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
                        // With new rules, can read following/${otherUserId}/${currentUser.uid} for mutual follow checks
                        database.ref(`following/${uid}/${currentUser.uid}`).once('value').then(theyFollowMe => {
                            if (theyFollowMe.exists() && messageBtn) {
                                messageBtn.classList.remove('hidden');
                            }
                        }).catch(err => {
                            (window.PerformanceUtils?.Logger || console).error('[ERROR] Failed to check follower status:', err);
                        });
                    }
                });
            });
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('[ERROR] Search failed:', error);
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
            
            // Get current counts and increment
            return Promise.all([
                database.ref(`users/${currentUserId}`).once('value'),
                database.ref(`users/${targetUserId}`).once('value')
            ]).then(([currentUserSnap, targetUserSnap]) => {
                const currentFollowingCount = currentUserSnap.val()?.followingCount || 0;
                const targetFollowersCount = targetUserSnap.val()?.followersCount || 0;
                
                updates[`users/${currentUserId}/followingCount`] = currentFollowingCount + 1;
                updates[`users/${targetUserId}/followersCount`] = targetFollowersCount + 1;
                
                return database.ref().update(updates);
            }).then(() => {
                showSnackbar('Now following!', 'success');
                const btn = document.getElementById(`search-follow-${targetUserId}`);
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Following';
                    btn.classList.add('following');
                    btn.onclick = () => unfollowFromSearch(targetUserId);
                }
                
                // Reload timeline to show new user's yaps
                if (typeof loadTimeline === 'function') {
                    loadTimeline();
                }
            });
        }
    }).catch(error => {
        (window.PerformanceUtils?.Logger || console).error('[ERROR] Follow failed:', error);
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
    
    // Get current counts and decrement
    Promise.all([
        database.ref(`users/${currentUserId}`).once('value'),
        database.ref(`users/${targetUserId}`).once('value')
    ]).then(([currentUserSnap, targetUserSnap]) => {
        const currentFollowingCount = currentUserSnap.val()?.followingCount || 0;
        const targetFollowersCount = targetUserSnap.val()?.followersCount || 0;
        
        updates[`users/${currentUserId}/followingCount`] = Math.max(0, currentFollowingCount - 1);
        updates[`users/${targetUserId}/followersCount`] = Math.max(0, targetFollowersCount - 1);
        
        return database.ref().update(updates);
    }).then(() => {
        showSnackbar('Unfollowed', 'success');
        const btn = document.getElementById(`search-follow-${targetUserId}`);
        if (btn) {
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
            btn.classList.remove('following');
            btn.onclick = () => followFromSearch(targetUserId);
        }
    }).catch(error => {
        (window.PerformanceUtils?.Logger || console).error('[ERROR] Unfollow failed:', error);
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

// ========================================
// GIF & STICKER FUNCTIONALITY
// ========================================

// Tenor API (free GIF API, no key needed for basic usage)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Free demo key
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

let selectedGifUrl = null;
let selectedStickerUrl = null;

// GIF Picker
const gifBtn = document.getElementById('gifBtn');
const gifPicker = document.getElementById('gifPicker');
const gifSearch = document.getElementById('gifSearch');
const gifResults = document.getElementById('gifResults');

if (gifBtn) {
    gifBtn.addEventListener('click', () => {
        toggleGifPicker();
    });
}

function toggleGifPicker() {
    if (!gifPicker) return;
    
    const isHidden = gifPicker.classList.contains('hidden');
    
    // Close other pickers
    closeStickerPicker();
    if (emojiPickerElement) emojiPickerElement.classList.add('hidden');
    
    if (isHidden) {
        gifPicker.classList.remove('hidden');
        loadTrendingGifs();
        if (gifSearch) gifSearch.focus();
    } else {
        gifPicker.classList.add('hidden');
    }
}

window.closeGifPicker = function() {
    if (gifPicker) gifPicker.classList.add('hidden');
};

function loadTrendingGifs() {
    if (!gifResults) return;
    
    gifResults.innerHTML = '<div class="loading-text">Loading trending GIFs...</div>';
    
    fetch(`${TENOR_API_URL}/featured?key=${TENOR_API_KEY}&client_key=yappin&limit=20`)
        .then(response => response.json())
        .then(data => {
            displayGifs(data.results);
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Failed to load GIFs:', error);
            gifResults.innerHTML = '<div class="error-text">Failed to load GIFs</div>';
        });
}

function searchGifs(query) {
    if (!query || !gifResults) return;
    
    gifResults.innerHTML = '<div class="loading-text">Searching...</div>';
    
    fetch(`${TENOR_API_URL}/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=yappin&limit=20`)
        .then(response => response.json())
        .then(data => {
            displayGifs(data.results);
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Failed to search GIFs:', error);
            gifResults.innerHTML = '<div class="error-text">Search failed</div>';
        });
}

function displayGifs(gifs) {
    if (!gifResults) return;
    
    if (!gifs || gifs.length === 0) {
        gifResults.innerHTML = '<div class="no-results">No GIFs found</div>';
        return;
    }
    
    gifResults.innerHTML = '';
    
    gifs.forEach(gif => {
        const gifElement = document.createElement('div');
        gifElement.className = 'gif-item';
        
        const img = document.createElement('img');
        img.src = gif.media_formats.tinygif.url;
        img.alt = gif.content_description || 'GIF';
        img.loading = 'lazy';
        
        gifElement.appendChild(img);
        
        gifElement.addEventListener('click', () => {
            selectGif(gif.media_formats.gif.url);
        });
        
        gifResults.appendChild(gifElement);
    });
}

function selectGif(gifUrl) {
    selectedGifUrl = gifUrl;
    
    // Add to image preview
    const container = imagePreviewContainer || document.getElementById('imagePreviewContainer');
    if (container) {
        container.classList.remove('hidden');
        
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${gifUrl}" alt="Selected GIF">
            <button class="remove-image" onclick="removeGif()" aria-label="Remove GIF">×</button>
        `;
        
        container.appendChild(preview);
    }
    
    closeGifPicker();
    showSnackbar('GIF added!', 'success');
}

window.removeGif = function() {
    selectedGifUrl = null;
    updateImagePreviews();
};

// Debounce GIF search
let gifSearchTimeout;
if (gifSearch) {
    gifSearch.addEventListener('input', (e) => {
        clearTimeout(gifSearchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            loadTrendingGifs();
            return;
        }
        
        gifSearchTimeout = setTimeout(() => {
            searchGifs(query);
        }, 500);
    });
}

// Sticker Picker
const stickerBtn = document.getElementById('stickerBtn');
const stickerPicker = document.getElementById('stickerPicker');
const stickerGrid = document.getElementById('stickerGrid');

// Predefined stickers (emoji-style)
const stickers = [
    '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🌟', '⭐',
    '✨', '💫', '💥', '💢', '💦', '💨', '🔥', '⚡',
    '🌈', '☀️', '🌙', '⛅', '☁️', '🌊', '❄️', '⛄',
    '🎵', '🎶', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻',
    '🍕', '🍔', '🍟', '🌭', '🍿', '🧈', '🍞', '🥐',
    '🎂', '🍰', '🧁', '🍪', '🍩', '🍫', '🍬', '🍭',
    '☕', '🍵', '🥤', '🧃', '🧋', '🍷', '🍺', '🍻',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏',
    '🎮', '🕹️', '👾', '🎯', '🎲', '🎰', '🎳', '🎪',
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
    '✈️', '🚀', '🛸', '🚁', '⛵', '🚤', '🛥️', '⛴️',
    '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨',
    '💕', '💞', '💓', '💗', '💖', '💘', '💝', '❤️',
    '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
    '👍', '👎', '👊', '✊', '🤝', '👏', '🙌', '🙏',
    '💪', '🦾', '🤳', '✍️', '🤙', '🤘', '🤟', '✌️'
];

if (stickerBtn) {
    stickerBtn.addEventListener('click', () => {
        toggleStickerPicker();
    });
}

function toggleStickerPicker() {
    if (!stickerPicker) return;
    
    const isHidden = stickerPicker.classList.contains('hidden');
    
    // Close other pickers
    closeGifPicker();
    if (emojiPickerElement) emojiPickerElement.classList.add('hidden');
    
    if (isHidden) {
        stickerPicker.classList.remove('hidden');
        loadStickers();
    } else {
        stickerPicker.classList.add('hidden');
    }
}

window.closeStickerPicker = function() {
    if (stickerPicker) stickerPicker.classList.add('hidden');
};

function loadStickers() {
    if (!stickerGrid) return;
    
    stickerGrid.innerHTML = '';
    
    stickers.forEach(sticker => {
        const stickerElement = document.createElement('button');
        stickerElement.className = 'sticker-item';
        stickerElement.textContent = sticker;
        stickerElement.title = `Add ${sticker} sticker`;
        
        stickerElement.addEventListener('click', () => {
            insertSticker(sticker);
        });
        
        stickerGrid.appendChild(stickerElement);
    });
}

function insertSticker(sticker) {
    const activeTextarea = yapText && !yapText.closest('.hidden') ? yapText : modalYapText;
    
    if (activeTextarea) {
        const start = activeTextarea.selectionStart;
        const end = activeTextarea.selectionEnd;
        const text = activeTextarea.value;
        
        // Insert sticker at cursor position with spaces
        const before = text.substring(0, start);
        const after = text.substring(end);
        activeTextarea.value = before + ` ${sticker} ` + after;
        
        // Update cursor position
        const newPosition = start + sticker.length + 2;
        activeTextarea.selectionStart = newPosition;
        activeTextarea.selectionEnd = newPosition;
        activeTextarea.focus();
        
        // Update character count
        const countElement = activeTextarea === yapText ? characterCount : modalCharacterCount;
        if (countElement) {
            updateCharacterCount(activeTextarea, countElement);
        }
    }
    
    closeStickerPicker();
}

// Update createYap to handle GIFs
function getMediaAttachments() {
    const attachments = [...selectedImages];
    
    // Add GIF if selected
    if (selectedGifUrl) {
        attachments.push({ type: 'gif', url: selectedGifUrl });
    }
    
    return attachments;
}
