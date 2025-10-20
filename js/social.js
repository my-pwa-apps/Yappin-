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
    
    followingRef.once('value')
        .then(snapshot => {
            const updates = {};
            
            if (snapshot.exists()) {
                // Unfollow user
                updates[`following/${currentUserId}/${userId}`] = null;
                updates[`followers/${userId}/${currentUserId}`] = null;
                
                return database.ref().update(updates)
                    .then(() => {
                        showSnackbar('Unfollowed successfully', 'success');
                        updateFollowButtonUI(userId, false);
                        // Reload timeline to reflect changes
                        if (typeof loadTimeline === 'function') {
                            loadTimeline();
                        }
                    });
            } else {
                // Follow user
                updates[`following/${currentUserId}/${userId}`] = true;
                updates[`followers/${userId}/${currentUserId}`] = true;
                
                return database.ref().update(updates)
                    .then(() => {
                        showSnackbar('Followed successfully', 'success');
                        updateFollowButtonUI(userId, true);
                        // Reload timeline to reflect changes
                        if (typeof loadTimeline === 'function') {
                            loadTimeline();
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
function updateFollowButtonUI(userId, isFollowing) {
    const followButtons = document.querySelectorAll(`.follow-btn[data-user-id="${userId}"]`);
    followButtons.forEach(btn => {
        if (isFollowing) {
            btn.classList.add('following');
            btn.textContent = 'Following';
        } else {
            btn.classList.remove('following');
            btn.textContent = 'Follow';
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
                                Follow
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

// Load suggested users when user is authenticated
if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadSuggestedUsers();
        }
    });
}

// Make functions globally available
window.toggleFollow = toggleFollow;
window.loadSuggestedUsers = loadSuggestedUsers;
