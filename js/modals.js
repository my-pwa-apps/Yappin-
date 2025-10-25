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
    
    // Check if messaging module is loaded
    if (typeof window.loadConversations === 'function') {
        toggleModal(messagesModal, true);
        window.loadConversations();
    } else {
        // Messaging feature not yet implemented
        showSnackbar('Direct messages coming soon!', 'default', 3000);
    }
}

// Groups functions
export function showGroups() {
    const groupsModal = document.getElementById('groupsModal');
    if (!groupsModal) return;
    
    toggleModal(groupsModal, true);
    loadMyGroupsTab();
}

function loadMyGroupsTab() {
    const container = document.getElementById('myGroupsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> <span data-i18n="loading">Loading...</span></div>';
    
    if (typeof window.loadMyGroups === 'function') {
        window.loadMyGroups().then(groups => {
            if (groups.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>You haven\'t joined any groups yet.</p></div>';
            } else {
                container.innerHTML = groups.map(group => createGroupCard(group, true)).join('');
            }
        }).catch(error => {
            console.error('Error loading groups:', error);
            container.innerHTML = '<div class="error-state"><p>Error loading groups</p></div>';
        });
    }
}

function loadDiscoverGroupsTab() {
    const container = document.getElementById('discoverGroupsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> <span data-i18n="loading">Loading...</span></div>';
    
    if (typeof window.loadPublicGroups === 'function') {
        window.loadPublicGroups().then(groups => {
            if (groups.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No public groups available.</p></div>';
            } else {
                container.innerHTML = groups.map(group => createGroupCard(group, false)).join('');
            }
        }).catch(error => {
            console.error('Error loading groups:', error);
            container.innerHTML = '<div class="error-state"><p>Error loading groups</p></div>';
        });
    }
}

function createGroupCard(group, isMember) {
    const imageHtml = group.imageURL ? `<img src="${group.imageURL}" alt="${group.name}">` : '<i class="fas fa-users"></i>';
    return `
        <div class="group-card" onclick="viewGroup('${group.id}')">
            <div class="group-card-image">
                ${imageHtml}
            </div>
            <div class="group-card-info">
                <h4>${group.name}</h4>
                <p class="group-card-topic">${group.topic}</p>
                <p class="group-card-stats">
                    <i class="fas fa-users"></i> ${group.memberCount || 0} members
                    ${group.isPublic ? '<span class="group-badge public">Public</span>' : '<span class="group-badge private">Private</span>'}
                </p>
            </div>
        </div>
    `;
}

export function closeGroupsModal() {
    const groupsModal = document.getElementById('groupsModal');
    if (groupsModal) toggleModal(groupsModal, false);
}

// Create Group Modal
export function openCreateGroupModal() {
    const createGroupModal = document.getElementById('createGroupModal');
    if (!createGroupModal) return;
    
    toggleModal(createGroupModal, true);
    
    // Preview group image
    const imageInput = document.getElementById('groupImageInput');
    if (imageInput) {
        imageInput.onchange = () => {
            const file = imageInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('groupImagePreview');
                    const img = preview.querySelector('img');
                    img.src = e.target.result;
                    preview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        };
    }
}

export function closeCreateGroupModal() {
    const createGroupModal = document.getElementById('createGroupModal');
    if (createGroupModal) {
        toggleModal(createGroupModal, false);
        document.getElementById('createGroupForm').reset();
        document.getElementById('groupImagePreview').classList.add('hidden');
    }
}

// Handle create group form submission
window.handleCreateGroup = async function(event) {
    event.preventDefault();
    
    const name = document.getElementById('groupNameInput').value;
    const topic = document.getElementById('groupTopicInput').value;
    const description = document.getElementById('groupDescriptionInput').value;
    const isPublic = document.getElementById('groupIsPublicCheckbox').checked;
    const imageInput = document.getElementById('groupImageInput');
    const imageFile = imageInput.files[0] || null;
    
    try {
        const groupId = await window.createGroup({
            name,
            topic,
            description,
            isPublic,
            imageFile
        });
        
        closeCreateGroupModal();
        closeGroupsModal();
        viewGroup(groupId);
    } catch (error) {
        console.error('Error creating group:', error);
        showSnackbar(error.message || 'Error creating group', 'error');
    }
};

// View Group Modal
window.viewGroup = async function(groupId) {
    const viewGroupModal = document.getElementById('viewGroupModal');
    if (!viewGroupModal) return;
    
    try {
        // Load group data
        const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
        if (!groupSnapshot.exists()) {
            showSnackbar('Group not found', 'error');
            return;
        }
        
        const group = groupSnapshot.val();
        
        // Update modal content
        document.getElementById('viewGroupName').textContent = group.name;
        document.getElementById('viewGroupTopic').textContent = group.topic;
        document.getElementById('viewGroupDescription').textContent = group.description;
        document.getElementById('viewGroupMemberCount').textContent = group.memberCount || 0;
        document.getElementById('viewGroupVisibility').textContent = group.isPublic ? '(Public)' : '(Private)';
        
        // Show/hide group image
        const imageContainer = document.getElementById('viewGroupImage');
        if (group.imageURL) {
            imageContainer.querySelector('img').src = group.imageURL;
            imageContainer.classList.remove('hidden');
        } else {
            imageContainer.classList.add('hidden');
        }
        
        // Check if user is a member
        const isMember = auth.currentUser ? await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}`).once('value').then(s => s.exists()) : false;
        
        // Check if user is admin
        const isAdmin = isMember ? await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}/role`).once('value').then(s => s.val() === 'admin') : false;
        
        // Check for pending join request
        const hasPendingRequest = auth.currentUser && !isMember ? await database.ref(`groupJoinRequests/${groupId}/${auth.currentUser.uid}`).once('value').then(s => s.exists()) : false;
        
        // Show appropriate buttons
        const joinBtn = document.getElementById('joinGroupBtn');
        const leaveBtn = document.getElementById('leaveGroupBtn');
        const pendingBtn = document.getElementById('pendingJoinRequestBtn');
        
        joinBtn.classList.add('hidden');
        leaveBtn.classList.add('hidden');
        pendingBtn.classList.add('hidden');
        
        if (hasPendingRequest) {
            pendingBtn.classList.remove('hidden');
        } else if (isMember) {
            leaveBtn.classList.remove('hidden');
        } else {
            joinBtn.classList.remove('hidden');
            // For private groups, change to "Request to Join"
            if (!group.isPublic) {
                joinBtn.querySelector('span').textContent = 'Request to Join';
                joinBtn.onclick = () => handleRequestJoin(groupId);
            } else {
                joinBtn.querySelector('span').textContent = window.t ? window.t('join') : 'Join Group';
                joinBtn.onclick = () => handleJoinGroup(groupId);
            }
        }
        
        leaveBtn.onclick = () => handleLeaveGroup(groupId);
        
        // Show/hide compose section (members only)
        const composeSection = document.getElementById('groupComposeSection');
        const yapsSection = document.getElementById('groupYapsSection');
        if (isMember) {
            composeSection.classList.remove('hidden');
            yapsSection.classList.remove('hidden');
            setupGroupCompose(groupId);
            loadGroupYapsDisplay(groupId);
        } else {
            composeSection.classList.add('hidden');
            yapsSection.classList.add('hidden');
        }
        
        // Show/hide join requests section (admins only)
        const joinRequestsSection = document.getElementById('joinRequestsSection');
        if (isAdmin && !group.isPublic) {
            joinRequestsSection.classList.remove('hidden');
            loadJoinRequestsDisplay(groupId);
        } else {
            joinRequestsSection.classList.add('hidden');
        }
        
        // Load members
        loadGroupMembersDisplay(groupId);
        
        toggleModal(viewGroupModal, true);
    } catch (error) {
        console.error('Error loading group:', error);
        showSnackbar('Error loading group', 'error');
    }
};

async function loadGroupMembersDisplay(groupId) {
    const container = document.getElementById('groupMembersList');
    if (!container) return;
    
    try {
        const members = await window.loadGroupMembers(groupId);
        
        if (members.length === 0) {
            container.innerHTML = '<p>No members yet</p>';
        } else {
            container.innerHTML = members.map(member => `
                <div class="group-member">
                    <img src="${member.photoURL || './images/default-avatar.png'}" alt="${member.username}" class="member-avatar">
                    <div class="member-info">
                        <p class="member-name">${member.displayName || member.username}</p>
                        <p class="member-username">@${member.username}</p>
                    </div>
                    ${member.role === 'admin' ? '<span class="member-badge">Admin</span>' : ''}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading members:', error);
        container.innerHTML = '<p>Error loading members</p>';
    }
}

window.handleJoinGroup = async function(groupId) {
    try {
        await window.joinGroup(groupId);
        viewGroup(groupId); // Refresh
    } catch (error) {
        console.error('Error joining group:', error);
        showSnackbar(error.message || 'Error joining group', 'error');
    }
};

window.handleRequestJoin = async function(groupId) {
    try {
        await window.requestJoinGroup(groupId);
        viewGroup(groupId); // Refresh
    } catch (error) {
        console.error('Error requesting to join group:', error);
        showSnackbar(error.message || 'Error requesting to join', 'error');
    }
};

window.handleLeaveGroup = async function(groupId) {
    if (confirm('Are you sure you want to leave this group?')) {
        try {
            await window.leaveGroup(groupId);
            closeViewGroupModal();
        } catch (error) {
            console.error('Error leaving group:', error);
            showSnackbar(error.message || 'Error leaving group', 'error');
        }
    }
};

// Setup group compose functionality
function setupGroupCompose(groupId) {
    const textarea = document.getElementById('groupYapText');
    const postBtn = document.getElementById('postGroupYapBtn');
    const imageInput = document.getElementById('groupImageInput');
    const attachBtn = document.getElementById('attachGroupImageBtn');
    const previewContainer = document.getElementById('groupImagePreviewContainer');
    
    if (!textarea || !postBtn) return;
    
    // Clear previous content
    textarea.value = '';
    previewContainer.innerHTML = '';
    previewContainer.classList.add('hidden');
    
    // Set active textarea when any media button is clicked
    const setGroupTextareaActive = () => {
        console.log('[Groups] Setting active textarea:', textarea);
        if (window.setActiveTextarea) {
            window.setActiveTextarea(textarea);
        }
    };
    
    // GIF button - use shared media.js function
    const gifBtn = document.getElementById('groupGifBtn');
    console.log('[Groups] Setting up GIF button:', gifBtn);
    if (gifBtn && window.toggleGifPicker) {
        gifBtn.onclick = () => {
            console.log('[Groups] GIF button clicked');
            setGroupTextareaActive();
            window.toggleGifPicker();
        };
    }
    
    // Sticker button - use shared media.js function
    const stickerBtn = document.getElementById('groupStickerBtn');
    console.log('[Groups] Setting up Sticker button:', stickerBtn);
    if (stickerBtn && window.toggleStickerPicker) {
        stickerBtn.onclick = () => {
            console.log('[Groups] Sticker button clicked');
            setGroupTextareaActive();
            window.toggleStickerPicker();
        };
    }
    
    // Emoji button - use shared media.js function  
    const emojiBtn = document.getElementById('groupEmojiBtn');
    console.log('[Groups] Setting up Emoji button:', emojiBtn);
    if (emojiBtn && window.toggleEmojiPicker) {
        emojiBtn.onclick = () => {
            console.log('[Groups] Emoji button clicked');
            setGroupTextareaActive();
            window.toggleEmojiPicker();
        };
    }
    
    // Image attachment button - reuse existing imageInput variable
    if (attachBtn && imageInput) {
        attachBtn.onclick = () => {
            setGroupTextareaActive();
            imageInput.click();
        };
        if (window.handleImageSelect) {
            imageInput.addEventListener('change', (e) => {
                setGroupTextareaActive();
                window.handleImageSelect(e);
            });
        }
    }
    
    // Post button
    postBtn.onclick = async () => {
        const content = textarea.value.trim();
        
        // Get media attachments from shared media.js
        const mediaAttachments = window.getMediaAttachments ? window.getMediaAttachments() : [];
        
        if (!content && mediaAttachments.length === 0) {
            showSnackbar('Please add text or images', 'error');
            return;
        }
        
        postBtn.disabled = true;
        postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        
        try {
            // Upload media using shared function
            let mediaUrls = [];
            if (mediaAttachments.length > 0 && window.uploadMediaFiles) {
                mediaUrls = await window.uploadMediaFiles(mediaAttachments);
            }
            
            // Convert media URLs to format expected by postGroupYap
            const mediaFiles = mediaUrls.map(item => ({
                url: item.url,
                type: item.type
            }));
            
            await window.postGroupYap(groupId, {
                content,
                mediaUrls: mediaFiles
            });
            
            // Clear form using shared function
            textarea.value = '';
            if (window.clearImages) window.clearImages();
            previewContainer.innerHTML = '';
            previewContainer.classList.add('hidden');
            
            // Reload yaps
            loadGroupYapsDisplay(groupId);
            
        } catch (error) {
            console.error('Error posting to group:', error);
            showSnackbar(error.message || 'Error posting', 'error');
        } finally {
            postBtn.disabled = false;
            postBtn.innerHTML = 'Yap';
        }
    };
}

// Load group yaps
async function loadGroupYapsDisplay(groupId) {
    const container = document.getElementById('groupYapsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        const yaps = await window.loadGroupYaps(groupId);
        
        if (yaps.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No yaps yet. Be the first to post!</p></div>';
        } else {
            container.innerHTML = '';
            for (const yap of yaps) {
                // Check if user liked/reyapped
                const userId = auth.currentUser ? auth.currentUser.uid : null;
                const isLiked = userId ? await database.ref(`userLikes/${userId}/${yap.id}`).once('value').then(s => s.exists()) : false;
                const isReyapped = userId ? await database.ref(`userReyaps/${userId}/${yap.id}`).once('value').then(s => s.exists()) : false;
                
                if (typeof window.createYapElement === 'function') {
                    const yapElement = window.createYapElement(yap, isLiked, isReyapped);
                    yapElement.classList.add('group-yap');
                    container.appendChild(yapElement);
                }
            }
        }
    } catch (error) {
        console.error('Error loading group yaps:', error);
        container.innerHTML = '<div class="error-state"><p>Error loading yaps</p></div>';
    }
}

// Load join requests
async function loadJoinRequestsDisplay(groupId) {
    const container = document.getElementById('joinRequestsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        const requests = await window.loadJoinRequests(groupId);
        
        if (requests.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No pending join requests</p></div>';
        } else {
            container.innerHTML = requests.map(request => `
                <div class="join-request-item">
                    <img src="${request.photoURL || './images/default-avatar.png'}" alt="${request.username}" class="member-avatar">
                    <div class="member-info">
                        <p class="member-name">${request.displayName || request.username}</p>
                        <p class="member-username">@${request.username}</p>
                        <p class="request-time">${formatTimestamp(request.requestedAt)}</p>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-sm primary-btn" onclick="approveRequest('${groupId}', '${request.userId}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm secondary-btn" onclick="rejectRequest('${groupId}', '${request.userId}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading join requests:', error);
        container.innerHTML = '<div class="error-state"><p>Error loading requests</p></div>';
    }
}

window.approveRequest = async function(groupId, userId) {
    try {
        await window.approveJoinRequest(groupId, userId);
        loadJoinRequestsDisplay(groupId);
        viewGroup(groupId); // Refresh member count
    } catch (error) {
        console.error('Error approving request:', error);
        showSnackbar(error.message || 'Error approving request', 'error');
    }
};

window.rejectRequest = async function(groupId, userId) {
    if (confirm('Are you sure you want to reject this join request?')) {
        try {
            await window.rejectJoinRequest(groupId, userId);
            loadJoinRequestsDisplay(groupId);
        } catch (error) {
            console.error('Error rejecting request:', error);
            showSnackbar(error.message || 'Error rejecting request', 'error');
        }
    }
};

// Search groups
window.searchGroups = async function(query) {
    const container = document.getElementById('discoverGroupsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    
    try {
        const groups = await window.searchGroups(query);
        
        if (groups.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No groups found</p></div>';
        } else {
            container.innerHTML = groups.map(group => createGroupCard(group, false)).join('');
        }
    } catch (error) {
        console.error('Error searching groups:', error);
        container.innerHTML = '<div class="error-state"><p>Error searching groups</p></div>';
    }
};

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

window.removeGroupImage = function(index) {
    const imageInput = document.getElementById('groupImageInput');
    const previewContainer = document.getElementById('groupImagePreviewContainer');
    
    if (!imageInput) return;
    
    // Remove file from input
    const dt = new DataTransfer();
    const files = Array.from(imageInput.files);
    files.splice(index, 1);
    files.forEach(file => dt.items.add(file));
    imageInput.files = dt.files;
    
    // Update preview
    if (files.length === 0) {
        previewContainer.innerHTML = '';
        previewContainer.classList.add('hidden');
    } else {
        const remainingPreviews = Array.from(previewContainer.querySelectorAll('.image-preview-item'));
        remainingPreviews[index].remove();
    }
};

export function closeViewGroupModal() {
    const viewGroupModal = document.getElementById('viewGroupModal');
    if (viewGroupModal) toggleModal(viewGroupModal, false);
}

// Setup groups tabs
document.addEventListener('DOMContentLoaded', () => {
    const groupsTabs = document.querySelectorAll('.groups-tab');
    groupsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            groupsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.groups-tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            if (tabName === 'my-groups') {
                document.getElementById('myGroupsTab').classList.remove('hidden');
                loadMyGroupsTab();
            } else if (tabName === 'discover-groups') {
                document.getElementById('discoverGroupsTab').classList.remove('hidden');
                loadDiscoverGroupsTab();
            }
        });
    });
});

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
window.showGroups = showGroups;
window.closeGroupsModal = closeGroupsModal;
window.openCreateGroupModal = openCreateGroupModal;
window.closeCreateGroupModal = closeCreateGroupModal;
window.closeViewGroupModal = closeViewGroupModal;
window.closeGifPicker = closeGifPicker;
window.closeStickerPicker = closeStickerPicker;
