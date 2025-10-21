// Social functionality - Follow/Unfollow and User Suggestions

// Function to toggle follow/unfollow
function toggleFollow(userId) {
    if (!auth || !auth.currentUser) {
        showSnackbar('You need to be logged in to follow users', 'error');
        return;
    }
    
    if (!database) {
        console.error('Database not initialized');
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    
    if (currentUserId === userId) {
        showSnackbar('You cannot follow yourself', 'error');
        return;
    }
    
    const followingRef = database.ref(`following/${currentUserId}/${userId}`);
    const followersRef = database.ref(`followers/${userId}/${currentUserId}`);
    const followRequestsRef = database.ref(`followRequests/${userId}/${currentUserId}`);
    
    // First check if already following or pending
    Promise.all([
        followingRef.once('value'),
        followRequestsRef.once('value')
    ]).then(([followingSnapshot, requestSnapshot]) => {
        const updates = {};
        
        if (followingSnapshot.exists()) {
            // Already following - unfollow
            updates[`following/${currentUserId}/${userId}`] = null;
            updates[`followers/${userId}/${currentUserId}`] = null;
            
            return database.ref().update(updates)
                .then(() => {
                    showSnackbar('Unfollowed successfully', 'success');
                    updateFollowButtonUI(userId, 'none');
                    // Reload timeline to reflect changes
                    if (typeof loadTimeline === 'function') {
                        loadTimeline();
                    }
                });
        } else if (requestSnapshot.exists()) {
            // Pending request - cancel it
            updates[`followRequests/${userId}/${currentUserId}`] = null;
            
            return database.ref().update(updates)
                .then(() => {
                    showSnackbar('Follow request cancelled', 'success');
                    updateFollowButtonUI(userId, 'none');
                });
        } else {
            // Not following - send follow request or follow directly based on privacy
            // Check target user's privacy settings
            return database.ref(`users/${userId}/privacy/requireApproval`).once('value')
                .then(privacySnapshot => {
                    const requiresApproval = privacySnapshot.val() === true;
                    
                    if (requiresApproval) {
                        // Private account - send follow request
                        updates[`followRequests/${userId}/${currentUserId}`] = {
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            status: 'pending'
                        };
                        
                        // Send notification
                        updates[`notifications/${userId}/${Date.now()}`] = {
                            type: 'follow_request',
                            from: currentUserId,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            read: false
                        };
                        
                        return database.ref().update(updates)
                            .then(() => {
                                showSnackbar('Follow request sent', 'success');
                                updateFollowButtonUI(userId, 'pending');
                            });
                    } else {
                        // Public account - follow directly
                        updates[`following/${currentUserId}/${userId}`] = true;
                        updates[`followers/${userId}/${currentUserId}`] = true;
                        
                        // Send notification
                        updates[`notifications/${userId}/${Date.now()}`] = {
                            type: 'new_follower',
                            from: currentUserId,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            read: false
                        };
                        
                        return database.ref().update(updates)
                            .then(() => {
                                showSnackbar('Followed successfully', 'success');
                                updateFollowButtonUI(userId, 'following');
                                // Reload timeline to reflect changes
                                if (typeof loadTimeline === 'function') {
                                    loadTimeline();
                                }
                            });
                    }
                });
        }
    })
    .catch(error => {
        console.error('Error toggling follow:', error);
        showSnackbar(`Error: ${error.message}`, 'error');
    });
}

// Update follow button UI
function updateFollowButtonUI(userId, state) {
    const followButtons = document.querySelectorAll(`.follow-btn[data-user-id="${userId}"]`);
    followButtons.forEach(btn => {
        // Remove all state classes
        btn.classList.remove('following', 'pending');
        
        if (state === 'following') {
            btn.classList.add('following');
            btn.innerHTML = '<span>Following</span>';
        } else if (state === 'pending') {
            btn.classList.add('pending');
            btn.innerHTML = '<span>Requested</span>';
            btn.disabled = false; // Can cancel request
        } else {
            btn.innerHTML = '<span>Follow</span>';
        }
    });
}

// Function to load suggested users
function loadSuggestedUsers() {
    if (!auth || !auth.currentUser) {
        console.warn('User not authenticated, cannot load suggestions');
        return;
    }
    
    const whoToFollowContainer = document.querySelector('.who-to-follow');
    if (!whoToFollowContainer) {
        console.warn('Who to follow container not found');
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    
    // First get list of users current user is already following
    database.ref(`following/${currentUserId}`).once('value')
        .then(snapshot => {
            const following = snapshot.val() || {};
            const followingIds = Object.keys(following);
            
            // Get a list of users to suggest (excluding those already followed)
            return database.ref('users').limitToFirst(10).once('value')
                .then(usersSnapshot => {
                    let html = '<h2>Who to follow</h2>';
                    const users = usersSnapshot.val() || {};
                    let suggestionCount = 0;
                    
                    Object.entries(users).forEach(([userId, userData]) => {
                        // Skip if this is the current user or already following
                        if (userId === currentUserId || followingIds.includes(userId)) {
                            return;
                        }
                        
                        if (suggestionCount >= 5) return; // Limit to 5 suggestions
                        
                        const displayName = userData.displayName || userData.username || 'Anonymous User';
                        const username = userData.username || userId.substring(0, 8);
                        const photoURL = userData.photoURL || './images/default-avatar.svg';
                        
                        html += `
                        <div class="suggested-user">
                            <div class="user-info">
                                <img src="${photoURL}" alt="${displayName}" class="user-avatar" onerror="this.src='./images/default-avatar.svg'">
                                <div>
                                    <p class="user-name">${displayName}</p>
                                    <p class="user-handle">@${username}</p>
                                </div>
                            </div>
                            <button onclick="toggleFollow('${userId}')" class="follow-btn" data-user-id="${userId}">
                                <span>Follow</span>
                            </button>
                        </div>
                        `;
                        suggestionCount++;
                    });
                    
                    if (suggestionCount === 0) {
                        html += '<p class="no-suggestions">No new users to follow right now.</p>';
                    }
                    
                    whoToFollowContainer.innerHTML = html;
                });
        })
        .catch(error => {
            console.error('Error loading suggested users:', error);
            whoToFollowContainer.innerHTML = '<h2>Who to follow</h2><p class="error">Error loading suggestions. Please try again.</p>';
        });
}

// Approve follow request
function approveFollowRequest(requesterId) {
    if (!auth || !auth.currentUser) {
        showSnackbar('You need to be logged in', 'error');
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const updates = {};
    
    // Add to following/followers
    updates[`following/${requesterId}/${currentUserId}`] = true;
    updates[`followers/${currentUserId}/${requesterId}`] = true;
    
    // Remove from requests
    updates[`followRequests/${currentUserId}/${requesterId}`] = null;
    
    // Send notification
    updates[`notifications/${requesterId}/${Date.now()}`] = {
        type: 'follow_approved',
        from: currentUserId,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        read: false
    };
    
    database.ref().update(updates)
        .then(() => {
            showSnackbar('Follow request approved', 'success');
            // Reload follow requests if displayed
            if (typeof loadFollowRequests === 'function') {
                loadFollowRequests();
            }
        })
        .catch(error => {
            console.error('Error approving follow request:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        });
}

// Reject follow request
function rejectFollowRequest(requesterId) {
    if (!auth || !auth.currentUser) {
        showSnackbar('You need to be logged in', 'error');
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const updates = {};
    
    // Remove from requests
    updates[`followRequests/${currentUserId}/${requesterId}`] = null;
    
    database.ref().update(updates)
        .then(() => {
            showSnackbar('Follow request rejected', 'success');
            // Reload follow requests if displayed
            if (typeof loadFollowRequests === 'function') {
                loadFollowRequests();
            }
        })
        .catch(error => {
            console.error('Error rejecting follow request:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        });
}

// Remove a follower
function removeFollower(followerId) {
    if (!auth || !auth.currentUser) {
        showSnackbar('You need to be logged in', 'error');
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    
    // Confirm before removing
    if (!confirm('Are you sure you want to remove this follower?')) {
        return;
    }
    
    const updates = {};
    
    // Remove follower from your followers list
    updates[`followers/${currentUserId}/${followerId}`] = null;
    
    // Remove you from their following list
    updates[`following/${followerId}/${currentUserId}`] = null;
    
    database.ref().update(updates)
        .then(() => {
            showSnackbar('Follower removed', 'success');
            // Reload followers list if displayed
            if (typeof loadFollowers === 'function') {
                loadFollowers();
            }
        })
        .catch(error => {
            console.error('Error removing follower:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        });
}

// Load follow requests for current user
function loadFollowRequests() {
    if (!auth || !auth.currentUser) {
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const requestsContainer = document.getElementById('followRequestsList');
    
    if (!requestsContainer) {
        console.warn('Follow requests container not found');
        return;
    }
    
    database.ref(`followRequests/${currentUserId}`).once('value')
        .then(snapshot => {
            const requests = snapshot.val();
            
            if (!requests || Object.keys(requests).length === 0) {
                requestsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No pending follow requests</p>';
                return;
            }
            
            requestsContainer.innerHTML = '';
            
            // Load user details for each requester
            const requestPromises = Object.keys(requests).map(requesterId => 
                database.ref(`users/${requesterId}`).once('value')
                    .then(userSnapshot => ({
                        userId: requesterId,
                        userData: userSnapshot.val(),
                        requestData: requests[requesterId]
                    }))
            );
            
            return Promise.all(requestPromises);
        })
        .then(requestsWithUsers => {
            if (!requestsWithUsers) return;
            
            requestsWithUsers.forEach(({ userId, userData, requestData }) => {
                if (!userData) return;
                
                const displayName = userData.displayName || userData.username || 'Anonymous User';
                const username = userData.username || userId.substring(0, 8);
                const photoURL = userData.photoURL || './images/default-avatar.svg';
                
                const requestDiv = document.createElement('div');
                requestDiv.className = 'follow-request-item';
                requestDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 15px; background: var(--hover-color); border-radius: var(--radius-md); margin-bottom: 10px;';
                
                requestDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${photoURL}" alt="${displayName}" class="user-avatar" style="width: 48px; height: 48px; border-radius: 50%;" onerror="this.src='./images/default-avatar.svg'">
                        <div>
                            <p style="font-weight: 600; margin: 0;">${displayName}</p>
                            <p style="color: var(--text-secondary); font-size: 0.9em; margin: 0;">@${username}</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="approveFollowRequest('${userId}')" class="btn primary-btn" style="padding: 8px 16px;">Accept</button>
                        <button onclick="rejectFollowRequest('${userId}')" class="btn" style="padding: 8px 16px; background: var(--hover-color); color: var(--text-primary);">Decline</button>
                    </div>
                `;
                
                requestsContainer.appendChild(requestDiv);
            });
        })
        .catch(error => {
            console.error('Error loading follow requests:', error);
            requestsContainer.innerHTML = '<p style="text-align: center; color: var(--danger-color); padding: 20px;">Error loading requests</p>';
        });
}

// Load followers list
function loadFollowers() {
    if (!auth || !auth.currentUser) {
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const followersContainer = document.getElementById('followersList');
    
    if (!followersContainer) {
        console.warn('Followers list container not found');
        return;
    }
    
    database.ref(`followers/${currentUserId}`).once('value')
        .then(snapshot => {
            const followers = snapshot.val();
            
            if (!followers || Object.keys(followers).length === 0) {
                followersContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No followers yet</p>';
                return;
            }
            
            followersContainer.innerHTML = '';
            
            // Load user details for each follower
            const followerPromises = Object.keys(followers).map(followerId => 
                database.ref(`users/${followerId}`).once('value')
                    .then(userSnapshot => ({
                        userId: followerId,
                        userData: userSnapshot.val()
                    }))
            );
            
            return Promise.all(followerPromises);
        })
        .then(followersWithUsers => {
            if (!followersWithUsers) return;
            
            followersWithUsers.forEach(({ userId, userData }) => {
                if (!userData) return;
                
                const displayName = userData.displayName || userData.username || 'Anonymous User';
                const username = userData.username || userId.substring(0, 8);
                const photoURL = userData.photoURL || './images/default-avatar.svg';
                
                const followerDiv = document.createElement('div');
                followerDiv.className = 'follower-item';
                followerDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 15px; background: var(--hover-color); border-radius: var(--radius-md); margin-bottom: 10px;';
                
                followerDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${photoURL}" alt="${displayName}" class="user-avatar" style="width: 48px; height: 48px; border-radius: 50%;" onerror="this.src='./images/default-avatar.svg'">
                        <div>
                            <p style="font-weight: 600; margin: 0;">${displayName}</p>
                            <p style="color: var(--text-secondary); font-size: 0.9em; margin: 0;">@${username}</p>
                        </div>
                    </div>
                    <button onclick="removeFollower('${userId}')" class="btn" style="padding: 8px 16px; background: var(--danger-color); color: white; border: none;">Remove</button>
                `;
                
                followersContainer.appendChild(followerDiv);
            });
        })
        .catch(error => {
            console.error('Error loading followers:', error);
            followersContainer.innerHTML = '<p style="text-align: center; color: var(--danger-color); padding: 20px;">Error loading followers</p>';
        });
}

// Toggle account privacy setting
function toggleAccountPrivacy() {
    if (!auth || !auth.currentUser) {
        showSnackbar('You need to be logged in', 'error');
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const privacyRef = database.ref(`users/${currentUserId}/privacy/requireApproval`);
    
    privacyRef.once('value')
        .then(snapshot => {
            const currentSetting = snapshot.val() === true;
            const newSetting = !currentSetting;
            
            return privacyRef.set(newSetting)
                .then(() => {
                    const message = newSetting ? 
                        'Account is now private - followers need approval' : 
                        'Account is now public - anyone can follow';
                    showSnackbar(message, 'success');
                    
                    // Update UI checkbox if exists
                    const checkbox = document.getElementById('requireApprovalCheckbox');
                    if (checkbox) {
                        checkbox.checked = newSetting;
                    }
                });
        })
        .catch(error => {
            console.error('Error toggling privacy:', error);
            showSnackbar(`Error: ${error.message}`, 'error');
        });
}

// Load suggested users when user is authenticated
if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadSuggestedUsers();
        }
    });
}

// Show follow requests modal
function showFollowRequests() {
    const modal = document.getElementById('followRequestsModal');
    if (!modal) {
        console.error('Follow requests modal not found');
        return;
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('show');
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        setTimeout(() => {
            modalContent.style.transform = 'translateY(0)';
            modalContent.style.opacity = '1';
        }, 10);
    }
    
    loadFollowRequests();
}

// Close follow requests modal
function closeFollowRequestsModal() {
    const modal = document.getElementById('followRequestsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

// Show settings modal
function showSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) {
        console.error('Settings modal not found');
        return;
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('show');
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        setTimeout(() => {
            modalContent.style.transform = 'translateY(0)';
            modalContent.style.opacity = '1';
        }, 10);
    }
    
    // Load current user settings
    if (auth && auth.currentUser) {
        database.ref(`users/${auth.currentUser.uid}`).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                
                // Load privacy setting
                const checkbox = document.getElementById('requireApprovalCheckbox');
                if (checkbox) {
                    checkbox.checked = userData?.privacy?.requireApproval === true;
                }
                
                // Load profile picture
                const preview = document.getElementById('profilePicturePreview');
                if (preview && userData) {
                    preview.src = userData.photoURL || './images/default-avatar.png';
                }
            });
    }
}

// Close settings modal
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

// Show followers modal
function showFollowers() {
    const modal = document.getElementById('followersModal');
    if (!modal) {
        console.error('Followers modal not found');
        return;
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('show');
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        setTimeout(() => {
            modalContent.style.transform = 'translateY(0)';
            modalContent.style.opacity = '1';
        }, 10);
    }
    
    loadFollowers();
}

// Close followers modal
function closeFollowersModal() {
    const modal = document.getElementById('followersModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

// Make functions globally available
window.toggleFollow = toggleFollow;
window.loadSuggestedUsers = loadSuggestedUsers;
window.approveFollowRequest = approveFollowRequest;
window.rejectFollowRequest = rejectFollowRequest;
window.removeFollower = removeFollower;
window.loadFollowRequests = loadFollowRequests;
window.loadFollowers = loadFollowers;
window.toggleAccountPrivacy = toggleAccountPrivacy;
window.showFollowRequests = showFollowRequests;
window.closeFollowRequestsModal = closeFollowRequestsModal;
window.showFollowers = showFollowers;
window.closeFollowersModal = closeFollowersModal;
window.showSettings = showSettings;
window.closeSettingsModal = closeSettingsModal;
