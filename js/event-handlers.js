/**
 * Event Handlers Module
 * Centralized event listener setup - removes all inline onclick handlers
 */

/**
 * Initialize all event listeners for the application
 */
export function initializeEventListeners() {
    // Navigation links in sidebar and mobile nav
    setupNavigationLinks();
    
    // Modal close buttons
    setupModalCloseButtons();
    
    // Picker close buttons
    setupPickerCloseButtons();
    
    // Generate invite code button
    setupInviteCodeButton();
    
    console.log('[EventHandlers] All event listeners initialized');
}

/**
 * Setup navigation links (sidebar and mobile nav)
 */
function setupNavigationLinks() {
    // Profile links in dropdown
    const profileLinks = document.querySelectorAll('a[href="#"][onclick*="showProfile"]');
    profileLinks.forEach(link => {
        link.removeAttribute('onclick');
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.showProfile === 'function') {
                window.showProfile();
            }
        });
    });
    
    // Search links
    const searchLinks = document.querySelectorAll('a[href="#"][onclick*="showSearch"]');
    searchLinks.forEach(link => {
        link.removeAttribute('onclick');
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.showSearch === 'function') {
                window.showSearch();
            }
        });
    });
    
    // Messages links
    const messagesLinks = document.querySelectorAll('a[href="#"][onclick*="showMessages"]');
    messagesLinks.forEach(link => {
        link.removeAttribute('onclick');
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.showMessages === 'function') {
                window.showMessages();
            }
        });
    });
    
    console.log('[EventHandlers] Navigation links initialized');
}

/**
 * Setup modal close buttons
 */
function setupModalCloseButtons() {
    // Invite modal close
    const inviteCloseBtn = document.querySelector('#inviteCodesModal .close-btn');
    if (inviteCloseBtn) {
        inviteCloseBtn.removeAttribute('onclick');
        inviteCloseBtn.addEventListener('click', () => {
            if (typeof window.closeInviteModal === 'function') {
                window.closeInviteModal();
            }
        });
    }
    
    // Follow requests modal close
    const followRequestsCloseBtn = document.querySelector('#followRequestsModal .close-btn');
    if (followRequestsCloseBtn) {
        followRequestsCloseBtn.removeAttribute('onclick');
        followRequestsCloseBtn.addEventListener('click', () => {
            if (typeof window.closeFollowRequestsModal === 'function') {
                window.closeFollowRequestsModal();
            }
        });
    }
    
    // Followers modal close
    const followersCloseBtn = document.querySelector('#followersModal .close-btn');
    if (followersCloseBtn) {
        followersCloseBtn.removeAttribute('onclick');
        followersCloseBtn.addEventListener('click', () => {
            if (typeof window.closeFollowersModal === 'function') {
                window.closeFollowersModal();
            }
        });
    }
    
    // Following modal close (there are two with same function)
    const followingCloseBtns = document.querySelectorAll('#followingModal .close-btn');
    followingCloseBtns.forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', () => {
            if (typeof window.closeFollowingModal === 'function') {
                window.closeFollowingModal();
            }
        });
    });
    
    // Search modal close
    const searchCloseBtn = document.querySelector('#searchModal .close-btn');
    if (searchCloseBtn) {
        searchCloseBtn.removeAttribute('onclick');
        searchCloseBtn.addEventListener('click', () => {
            if (typeof window.closeSearchModal === 'function') {
                window.closeSearchModal();
            }
        });
    }
    
    // Messages modal close
    const messagesCloseBtn = document.querySelector('#messagesModal .close-btn');
    if (messagesCloseBtn) {
        messagesCloseBtn.removeAttribute('onclick');
        messagesCloseBtn.addEventListener('click', () => {
            if (typeof window.closeMessagesModal === 'function') {
                window.closeMessagesModal();
            }
        });
    }
    
    console.log('[EventHandlers] Modal close buttons initialized');
}

/**
 * Setup picker close buttons
 */
function setupPickerCloseButtons() {
    // GIF picker close
    const gifPickerCloseBtn = document.querySelector('#gifPicker .close-btn');
    if (gifPickerCloseBtn) {
        gifPickerCloseBtn.removeAttribute('onclick');
        gifPickerCloseBtn.addEventListener('click', () => {
            if (typeof window.closeGifPicker === 'function') {
                window.closeGifPicker();
            }
        });
    }
    
    // Sticker picker close
    const stickerPickerCloseBtn = document.querySelector('#stickerPicker .close-btn');
    if (stickerPickerCloseBtn) {
        stickerPickerCloseBtn.removeAttribute('onclick');
        stickerPickerCloseBtn.addEventListener('click', () => {
            if (typeof window.closeStickerPicker === 'function') {
                window.closeStickerPicker();
            }
        });
    }
    
    console.log('[EventHandlers] Picker close buttons initialized');
}

/**
 * Setup invite code button
 */
function setupInviteCodeButton() {
    const generateInviteBtn = document.querySelector('.generate-invite-btn');
    if (generateInviteBtn) {
        generateInviteBtn.removeAttribute('onclick');
        generateInviteBtn.addEventListener('click', () => {
            if (typeof window.generateNewInviteCode === 'function') {
                window.generateNewInviteCode();
            }
        });
    }
    
    console.log('[EventHandlers] Invite code button initialized');
}

// Expose globally for backward compatibility
window.initializeEventListeners = initializeEventListeners;

console.log('[EventHandlers] Module loaded');
