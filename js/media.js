/**
 * Media Module
 * Handles GIF picker, sticker picker, emoji picker, image uploads, and draft management
 */

import { showSnackbar } from './ui.js';

// Constants
// Using Giphy API (more reliable than Tenor)
const GIPHY_API_KEY = 'nA6Ou7qNMHAhVYE8Ao3xjXHPQTjCkLuP'; // Public demo key
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';
const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const DRAFTS_STORAGE_KEY = 'yappin_drafts';

// State
let selectedImages = [];
let selectedGifUrl = null;
let emojiPickerElement = null;

// Common emojis for picker
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

// Predefined stickers
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

// ========================================
// DRAFT MANAGEMENT
// ========================================

/**
 * Save draft to localStorage
 */
export function saveDraft(content) {
    if (content && content.trim()) {
        localStorage.setItem(DRAFTS_STORAGE_KEY, content);
    }
}

/**
 * Load draft from localStorage
 */
export function loadDraft() {
    const draft = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (draft) {
        const yapText = document.getElementById('yapText');
        const modalYapText = document.getElementById('modalYapText');
        
        if (yapText) yapText.value = draft;
        if (modalYapText) modalYapText.value = draft;
        
        // Update character counts if available
        if (typeof window.updateCharacterCount === 'function') {
            const characterCount = document.getElementById('characterCount');
            const modalCharacterCount = document.getElementById('modalCharacterCount');
            if (yapText && characterCount) window.updateCharacterCount(yapText, characterCount);
            if (modalYapText && modalCharacterCount) window.updateCharacterCount(modalYapText, modalCharacterCount);
        }
    }
}

/**
 * Clear draft from localStorage
 */
export function clearDraft() {
    localStorage.removeItem(DRAFTS_STORAGE_KEY);
}

// ========================================
// IMAGE ATTACHMENTS
// ========================================

/**
 * Handle image selection from file input
 */
export function handleImageSelect(event) {
    const files = Array.from(event.target.files);
    addImagesToYap(files);
}

/**
 * Handle paste events (including images)
 */
export function handlePaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            addImagesToYap([file]);
        }
    }
}

/**
 * Add images to yap
 */
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

/**
 * Render image previews
 */
export function renderImagePreviews() {
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    if (!imagePreviewContainer) return;
    
    if (selectedImages.length === 0 && !selectedGifUrl) {
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
            <button class="image-preview-remove" data-index="${index}" aria-label="Remove image">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add event listener for remove button
        const removeBtn = preview.querySelector('.image-preview-remove');
        removeBtn.addEventListener('click', () => removeImage(index));
        
        imagePreviewContainer.appendChild(preview);
    });
    
    // Add GIF preview if selected
    if (selectedGifUrl) {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${selectedGifUrl}" alt="Selected GIF">
            <button class="image-preview-remove" aria-label="Remove GIF">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const removeBtn = preview.querySelector('.image-preview-remove');
        removeBtn.addEventListener('click', removeGif);
        
        imagePreviewContainer.appendChild(preview);
    }
}

/**
 * Remove image from selection
 */
export function removeImage(index) {
    selectedImages.splice(index, 1);
    renderImagePreviews();
    
    // Clear file input
    const imageInput = document.getElementById('imageInput');
    if (imageInput) imageInput.value = '';
}

/**
 * Remove GIF
 */
export function removeGif() {
    selectedGifUrl = null;
    renderImagePreviews();
}

/**
 * Clear all images and GIFs
 */
export function clearImages() {
    selectedImages = [];
    selectedGifUrl = null;
    renderImagePreviews();
    
    const imageInput = document.getElementById('imageInput');
    if (imageInput) imageInput.value = '';
}

/**
 * Upload media files (convert to base64)
 */
export function uploadMediaFiles(mediaItems) {
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

/**
 * Get attached media files and GIFs
 */
export function getMediaAttachments() {
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

// ========================================
// EMOJI PICKER
// ========================================

/**
 * Toggle emoji picker
 */
export function toggleEmojiPicker() {
    if (!emojiPickerElement) {
        createEmojiPicker();
    }
    
    if (emojiPickerElement.classList.contains('hidden')) {
        emojiPickerElement.classList.remove('hidden');
        // Close other pickers
        closeGifPicker();
        closeStickerPicker();
    } else {
        emojiPickerElement.classList.add('hidden');
    }
}

/**
 * Create emoji picker
 */
function createEmojiPicker() {
    emojiPickerElement = document.createElement('div');
    emojiPickerElement.className = 'emoji-picker hidden';
    
    commonEmojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn-item';
        btn.textContent = emoji;
        btn.addEventListener('click', () => insertEmoji(emoji));
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
            !emojiPickerElement.contains(e.target)) {
            const emojiBtn = document.getElementById('emojiBtn');
            if (!emojiBtn || !emojiBtn.contains(e.target)) {
                emojiPickerElement.classList.add('hidden');
            }
        }
    });
}

/**
 * Insert emoji at cursor position
 */
export function insertEmoji(emoji) {
    const yapText = document.getElementById('yapText');
    const modalYapText = document.getElementById('modalYapText');
    const textarea = yapText && !yapText.closest('.hidden') ? yapText : modalYapText;
    
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + emoji + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    textarea.focus();
    
    // Update character count
    if (typeof window.updateCharacterCount === 'function') {
        const characterCount = document.getElementById('characterCount');
        const modalCharacterCount = document.getElementById('modalCharacterCount');
        const countElement = textarea === yapText ? characterCount : modalCharacterCount;
        if (countElement) {
            window.updateCharacterCount(textarea, countElement);
        }
    }
    
    // Hide picker
    if (emojiPickerElement) {
        emojiPickerElement.classList.add('hidden');
    }
}

// ========================================
// GIF PICKER
// ========================================

/**
 * Toggle GIF picker
 */
export function toggleGifPicker() {
    const gifPicker = document.getElementById('gifPicker');
    if (!gifPicker) return;
    
    const isHidden = gifPicker.classList.contains('hidden');
    
    // Close other pickers
    closeStickerPicker();
    if (emojiPickerElement) emojiPickerElement.classList.add('hidden');
    
    if (isHidden) {
        gifPicker.classList.remove('hidden');
        loadTrendingGifs();
        const gifSearch = document.getElementById('gifSearch');
        if (gifSearch) gifSearch.focus();
    } else {
        gifPicker.classList.add('hidden');
    }
}

/**
 * Close GIF picker
 */
export function closeGifPicker() {
    const gifPicker = document.getElementById('gifPicker');
    if (gifPicker) gifPicker.classList.add('hidden');
}

/**
 * Load trending GIFs
 */
export function loadTrendingGifs() {
    const gifResults = document.getElementById('gifResults');
    if (!gifResults) return;
    
    gifResults.innerHTML = '<div class="loading-text">Loading trending GIFs...</div>';
    
    fetch(`${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            displayGifs(data.data);
        })
        .catch(error => {
            console.error('[Media] Failed to load GIFs:', error);
            gifResults.innerHTML = '<div class="error-text">Failed to load GIFs. Please try again.</div>';
        });
}

/**
 * Search GIFs
 */
export function searchGifs(query) {
    const gifResults = document.getElementById('gifResults');
    if (!query || !gifResults) return;
    
    gifResults.innerHTML = '<div class="loading-text">Searching...</div>';
    
    fetch(`${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            displayGifs(data.data);
        })
        .catch(error => {
            console.error('[Media] Failed to search GIFs:', error);
            gifResults.innerHTML = '<div class="error-text">Search failed. Please try again.</div>';
        });
}

/**
 * Display GIFs in grid (Giphy format)
 */
function displayGifs(gifs) {
    const gifResults = document.getElementById('gifResults');
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
        // Giphy API format: images.fixed_width_small.url for preview
        img.src = gif.images.fixed_width_small.url;
        img.alt = gif.title || 'GIF';
        img.loading = 'lazy';
        
        gifElement.appendChild(img);
        
        gifElement.addEventListener('click', () => {
            // Use original GIF URL for full quality
            selectGif(gif.images.original.url);
        });
        
        gifResults.appendChild(gifElement);
    });
}

/**
 * Select GIF
 */
function selectGif(gifUrl) {
    selectedGifUrl = gifUrl;
    renderImagePreviews();
    closeGifPicker();
    showSnackbar('GIF added!', 'success');
}

/**
 * Initialize GIF search with debounce
 */
export function initializeGifSearch() {
    const gifSearch = document.getElementById('gifSearch');
    if (!gifSearch) return;
    
    let gifSearchTimeout;
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

// ========================================
// STICKER PICKER
// ========================================

/**
 * Toggle sticker picker
 */
export function toggleStickerPicker() {
    const stickerPicker = document.getElementById('stickerPicker');
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

/**
 * Close sticker picker
 */
export function closeStickerPicker() {
    const stickerPicker = document.getElementById('stickerPicker');
    if (stickerPicker) stickerPicker.classList.add('hidden');
}

/**
 * Load stickers
 */
function loadStickers() {
    const stickerGrid = document.getElementById('stickerGrid');
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

/**
 * Insert sticker at cursor position
 */
export function insertSticker(sticker) {
    const yapText = document.getElementById('yapText');
    const modalYapText = document.getElementById('modalYapText');
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
        if (typeof window.updateCharacterCount === 'function') {
            const characterCount = document.getElementById('characterCount');
            const modalCharacterCount = document.getElementById('modalCharacterCount');
            const countElement = activeTextarea === yapText ? characterCount : modalCharacterCount;
            if (countElement) {
                window.updateCharacterCount(activeTextarea, countElement);
            }
        }
    }
    
    closeStickerPicker();
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize media module
 */
export function initializeMedia() {
    // Initialize GIF search
    initializeGifSearch();
    
    // Load draft on page load
    loadDraft();
    
    console.log('[Media] Module initialized');
}

// Backward compatibility - expose functions globally
window.saveDraft = saveDraft;
window.loadDraft = loadDraft;
window.clearDraft = clearDraft;
window.handleImageSelect = handleImageSelect;
window.handlePaste = handlePaste;
window.removeImage = removeImage;
window.removeGif = removeGif;
window.clearImages = clearImages;
window.uploadMediaFiles = uploadMediaFiles;
window.getMediaAttachments = getMediaAttachments;
window.renderImagePreviews = renderImagePreviews;
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmoji = insertEmoji;
window.toggleGifPicker = toggleGifPicker;
window.closeGifPicker = closeGifPicker;
window.loadTrendingGifs = loadTrendingGifs;
window.searchGifs = searchGifs;
window.toggleStickerPicker = toggleStickerPicker;
window.closeStickerPicker = closeStickerPicker;
window.insertSticker = insertSticker;
window.initializeMedia = initializeMedia;

console.log('[Media] Module loaded');
