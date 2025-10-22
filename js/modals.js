// Modals Module
// Handles all modal-related functionality (profile, invite codes, followers, etc.)

import { toggleModal, showSnackbar } from './ui.js';

// Profile Modal
export function showProfile() {
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
}

export function closeProfileModal() {
    const profileModal = document.getElementById('profileModal');
    if (!profileModal) return;
    toggleModal(profileModal, false);
}

// Invite Codes Modal
export function showInviteCodes() {
    const inviteModal = document.getElementById('inviteCodesModal');
    if (!inviteModal) return;
    
    toggleModal(inviteModal, true);
    
    // Implementation from app.js will be moved here
    // loadInviteCodes();
}

export function closeInviteModal() {
    const inviteModal = document.getElementById('inviteCodesModal');
    if (!inviteModal) return;
    toggleModal(inviteModal, false);
}

// Follow Requests Modal
export function showFollowRequests() {
    const followRequestsModal = document.getElementById('followRequestsModal');
    if (!followRequestsModal) return;
    
    toggleModal(followRequestsModal, true);
    
    // Implementation from social.js will be referenced here
}

export function closeFollowRequestsModal() {
    const followRequestsModal = document.getElementById('followRequestsModal');
    if (!followRequestsModal) return;
    toggleModal(followRequestsModal, false);
}

// Followers Modal
export function showFollowers() {
    const followersModal = document.getElementById('followersModal');
    if (!followersModal) return;
    
    toggleModal(followersModal, true);
    
    // Implementation from social.js will be referenced here
}

export function closeFollowersModal() {
    const followersModal = document.getElementById('followersModal');
    if (!followersModal) return;
    toggleModal(followersModal, false);
}

// Following Modal
export function showFollowing() {
    const followingModal = document.getElementById('followingModal');
    if (!followingModal) return;
    
    toggleModal(followingModal, true);
    
    // Implementation from social.js will be referenced here
}

export function closeFollowingModal() {
    const followingModal = document.getElementById('followingModal');
    if (!followingModal) return;
    toggleModal(followingModal, false);
}

// Search Modal
export function showSearch() {
    const searchModal = document.getElementById('searchModal');
    if (!searchModal) return;
    
    toggleModal(searchModal, true);
    
    // Focus search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
    }
}

// Messages Modal
export function showMessages() {
    const messagesModal = document.getElementById('messagesModal');
    if (!messagesModal) return;
    
    toggleModal(messagesModal, true);
    
    // Load messages (from messaging.js)
    if (typeof window.loadMessages === 'function') {
        window.loadMessages();
    }
}

// GIF Picker
export function closeGifPicker() {
    const gifPicker = document.getElementById('gifPicker');
    if (gifPicker) gifPicker.classList.add('hidden');
}

// Sticker Picker
export function closeStickerPicker() {
    const stickerPicker = document.getElementById('stickerPicker');
    if (stickerPicker) stickerPicker.classList.add('hidden');
}

// Make functions globally available for backwards compatibility
window.showProfile = showProfile;
window.closeProfileModal = closeProfileModal;
window.showInviteCodes = showInviteCodes;
window.closeInviteModal = closeInviteModal;
window.showFollowRequests = showFollowRequests;
window.closeFollowRequestsModal = closeFollowRequestsModal;
window.showFollowers = showFollowers;
window.closeFollowersModal = closeFollowersModal;
window.showFollowing = showFollowing;
window.closeFollowingModal = closeFollowingModal;
window.showSearch = showSearch;
window.showMessages = showMessages;
window.closeGifPicker = closeGifPicker;
window.closeStickerPicker = closeStickerPicker;
