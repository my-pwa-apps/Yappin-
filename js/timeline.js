// Timeline functionality

// DOM Elements
const yapsContainer = document.getElementById('yapsContainer');

// Load timeline
function loadTimeline() {
    if (!auth.currentUser) {
        console.warn('Cannot load timeline: User not authenticated');
        return;
    }
    
    if (!yapsContainer) {
        console.error('Yaps container element not found');
        return;
    }

    const currentUserId = auth.currentUser.uid;

    // Show loading state
    yapsContainer.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    // Get followed users
    database.ref(`following/${currentUserId}`).once('value')
        .then(snapshot => {
            const following = snapshot.val() || {};
            const followedUserIds = Object.keys(following);
            
            // Always include the current user's yaps in the timeline
            followedUserIds.push(currentUserId);
            
            // If not following anyone, show a message and suggestions
            if (followedUserIds.length === 1) { // Only the current user
                // Still show user's own yaps but also add a message about following others
                const messageHtml = '<div class="follow-suggestion-banner">' +
                    '<p>Follow other users to see their posts in your feed!</p>' +
                    '<button onclick="showFollowSuggestions()" class="btn primary-btn">Find people to follow</button>' +
                    '</div>';
                yapsContainer.insertAdjacentHTML('afterbegin', messageHtml);
            }

            // Fetch yaps from followed users including own yaps
            const yapPromises = followedUserIds.map(userId => {
                return database.ref(`userYaps/${userId}`).once('value');
            });

            return Promise.all(yapPromises);
        })
        .then(results => {
            const yaps = [];

            results.forEach(snapshot => {
                snapshot.forEach(childSnapshot => {
                    const yapData = childSnapshot.val();
                    yapData.id = childSnapshot.key;
                    yaps.push(yapData);
                });
            });

            // Sort yaps by timestamp
            yaps.sort((a, b) => b.timestamp - a.timestamp);

            // Render yaps
            yapsContainer.innerHTML = '';
            yaps.forEach(yapData => {
                const yapElement = createYapElement(yapData);
                yapsContainer.appendChild(yapElement);
            });
        })
        .catch(error => {
            console.error('Error loading timeline:', error);
            yapsContainer.innerHTML = `<p class="error">Error loading Yaps: ${error.message}</p>`;
        });
}

// Create a yap element
function createYapElement(yapData, isLiked = false, isReyapped = false) {
    // Validate yapData
    if (!yapData || !yapData.id) {
        console.error('Invalid yap data provided to createYapElement:', yapData);
        return document.createElement('div'); // Return empty div
    }
    
    const yapElement = document.createElement('div');
    yapElement.className = 'yap-item';
    yapElement.dataset.yapId = yapData.id;
    
    // Defensive: fallback for missing data
    const username = yapData.username || yapData.displayName || 'anonymous';
    const content = yapData.content || '';
    const formattedTime = yapData.timestamp ? formatRelativeTime(yapData.timestamp) : '';
    const avatar = yapData.userPhotoURL || './images/default-avatar.png';
    yapElement.innerHTML = `
        <div class="yap-header">
            <div class="yap-user">
                <div class="yap-avatar">
                    <img src="${avatar}" alt="${username}" onerror="this.src='./images/default-avatar.png'">
                </div>
                <div class="yap-user-info">
                    <span class="username">@${username}</span>
                    <span class="time">· ${formattedTime}</span>
                </div>
            </div>
            <div class="yap-options">
                <button class="icon-btn"><i class="fas fa-ellipsis-h"></i></button>
            </div>
        </div>
        <div class="yap-content">
            ${formatYapContent(content)}
        </div>
        <div class="yap-actions">
            <button class="action-btn reply">
                <i class="far fa-comment"></i>
                <span>${yapData.replies || 0}</span>
            </button>
            <button class="action-btn reyap ${isReyapped ? 'reyapped' : ''}">
                <i class="${isReyapped ? 'fas' : 'far'} fa-retweet"></i>
                <span>${yapData.reyaps || 0}</span>
            </button>
            <button class="action-btn like ${isLiked ? 'liked' : ''}">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                <span>${yapData.likes || 0}</span>
            </button>
            <button class="action-btn share">
                <i class="far fa-share-square"></i>
            </button>
        </div>
    `;
    
    // Add event listeners
    const likeBtn = yapElement.querySelector('.action-btn.like');
    const reyapBtn = yapElement.querySelector('.action-btn.reyap');
    const replyBtn = yapElement.querySelector('.action-btn.reply');
    const shareBtn = yapElement.querySelector('.action-btn.share');
    
    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(yapData.id).then(() => {
            const likesCount = likeBtn.querySelector('span');
            const icon = likeBtn.querySelector('i');
            
            if (likeBtn.classList.toggle('liked')) {
                // Just liked
                icon.classList.replace('far', 'fas');
                likesCount.textContent = (parseInt(likesCount.textContent) + 1).toString();
            } else {
                // Just unliked
                icon.classList.replace('fas', 'far');
                likesCount.textContent = (parseInt(likesCount.textContent) - 1).toString();
            }
        });
    });
    
    reyapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleReyap(yapData.id).then(() => {
            const reyapsCount = reyapBtn.querySelector('span');
            const icon = reyapBtn.querySelector('i');
            
            if (reyapBtn.classList.toggle('reyapped')) {
                // Just reyapped
                icon.classList.replace('far', 'fas');
                reyapsCount.textContent = (parseInt(reyapsCount.textContent) + 1).toString();
            } else {
                // Just un-reyapped
                icon.classList.replace('fas', 'far');
                reyapsCount.textContent = (parseInt(reyapsCount.textContent) - 1).toString();
            }
        });
    });
    
    replyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // TODO: Implement reply functionality
        showSnackbar('Reply feature coming soon!');
    });
    
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Simple share functionality
        if (navigator.share) {
            const shareData = {
                title: 'Check out this Yap!',
                text: `@${username}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                url: window.location.href
            };
            
            navigator.share(shareData)
                .then(() => showSnackbar('Shared successfully', 'success'))
                .catch(error => {
                    if (error.name !== 'AbortError') { // User cancelled
                        console.error('Error sharing:', error);
                        showSnackbar('Error sharing', 'error');
                    }
                });
        } else {
            // Fallback: copy link to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href)
                    .then(() => showSnackbar('Link copied to clipboard', 'success'))
                    .catch(() => showSnackbar('Could not copy link', 'error'));
            } else {
                showSnackbar('Share feature not supported by your browser', 'error');
            }
        }
    });
    
    // Open yap details on click
    yapElement.addEventListener('click', () => {
        // TODO: Navigate to yap details page
        showSnackbar('Yap details feature coming soon!');
    });
    
    return yapElement;
}

// Format yap content (add links, hashtags, mentions)
function formatYapContent(content) {
    // Check if content is undefined or null
    if (!content) {
        return '';
    }
    
    // Convert URLs to links
    let formattedContent = content.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank">$1</a>'
    );
    
    // Convert hashtags
    formattedContent = formattedContent.replace(
        /#(\w+)/g,
        '<a href="#" class="hashtag">#$1</a>'
    );
    
    // Convert mentions
    formattedContent = formattedContent.replace(
        /@(\w+)/g,
        '<a href="#" class="mention">@$1</a>'
    );
    
    return formattedContent;
}

// Set up real-time updates for new yaps
function setupRealTimeUpdates() {
    // Get the timestamp of the newest yap we've seen
    const mostRecentTimestamp = getMostRecentYapTimestamp();
    
    // Listen for new yaps added after this timestamp
    const realtimeRef = database.ref('yaps')
        .orderByChild('timestamp')
        .startAfter(mostRecentTimestamp);
    
    // Remove any existing listeners
    realtimeRef.off();
    
    // Add the new listener
    realtimeRef.on('child_added', snapshot => {
        const yapData = snapshot.val();
        yapData.id = snapshot.key;
        
        // Only show new yaps if not from the initial load
        if (yapData.timestamp > mostRecentTimestamp && mostRecentTimestamp > 0) {
            // Check if user has liked or reyapped this yap
            Promise.all([
                database.ref(`userLikes/${auth.currentUser.uid}/${yapData.id}`).once('value'),
                database.ref(`userReyaps/${auth.currentUser.uid}/${yapData.id}`).once('value')
            ]).then(([likeSnapshot, reyapSnapshot]) => {
                const isLiked = likeSnapshot.exists();
                const isReyapped = reyapSnapshot.exists();
                
                // Create and prepend the new yap element
                const yapElement = createYapElement(yapData, isLiked, isReyapped);
                yapsContainer.insertBefore(yapElement, yapsContainer.firstChild);
                
                // Add a temporary highlight effect
                setTimeout(() => {
                    yapElement.classList.add('new-yap');
                    setTimeout(() => {
                        yapElement.classList.remove('new-yap');
                    }, 2000);
                }, 0);
            });
        }
    });
}

// Get the timestamp of the most recent yap in the timeline
function getMostRecentYapTimestamp() {
    const yaps = yapsContainer.querySelectorAll('.yap-item');
    if (yaps.length === 0) return 0;
    
    let mostRecent = 0;
    
    yaps.forEach(yap => {
        const yapId = yap.dataset.yapId;
        database.ref(`yaps/${yapId}/timestamp`).once('value')
            .then(snapshot => {
                const timestamp = snapshot.val() || 0;
                if (timestamp > mostRecent) {
                    mostRecent = timestamp;
                }
            });
    });
    
    return mostRecent;
}

// Function to show follow suggestions in a modal
function showFollowSuggestions() {
    // Show the modal with suggestions
    const modal = document.getElementById('createYapModal');
    const modalContent = modal.querySelector('.modal-content');
    
    // Store original content to restore later
    const originalContent = modalContent.innerHTML;
    
    // Set modal header and content for follow suggestions
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>People to Follow</h2>
            <button id="closeFollowModal" class="close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body follow-suggestions-container">
            <div class="loading-container"><div class="loading-spinner"></div></div>
        </div>
    `;
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('show');
    
    // Set up close button
    const closeBtn = document.getElementById('closeFollowModal');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        modal.classList.add('hidden');
        setTimeout(() => {
            modalContent.innerHTML = originalContent; // Restore original content
        }, 300);
    });
    
    // Load suggested users
    loadModalSuggestedUsers();
}

// Function to load suggested users in the modal
function loadModalSuggestedUsers() {
    if (!auth.currentUser) return;
    
    const suggestionsContainer = document.querySelector('.follow-suggestions-container');
    const currentUserId = auth.currentUser.uid;
    
    // Get users current user is following
    database.ref(`following/${currentUserId}`).once('value')
        .then(snapshot => {
            const following = snapshot.val() || {};
            const followingIds = Object.keys(following);
            
            // Get users to suggest (up to 10)
            return database.ref('users').limitToFirst(10).once('value')
                .then(usersSnapshot => {
                    let html = '';
                    const users = usersSnapshot.val() || {};
                    
                    Object.entries(users).forEach(([userId, userData]) => {
                        // Skip current user
                        if (userId === currentUserId) {
                            return;
                        }
                        
                        const isFollowing = followingIds.includes(userId);
                        html += `
                        <div class="suggested-user">
                            <div class="user-info">
                                <img src="${userData.photoURL || './images/default-avatar.svg'}" alt="${userData.displayName || 'User'}" class="user-avatar">
                                <div>
                                    <p class="user-name">${userData.displayName || 'Anonymous User'}</p>
                                    <p class="user-handle">@${userData.username || userId.substring(0, 8)}</p>
                                </div>
                            </div>
                            <button onclick="toggleFollow('${userId}')" class="follow-btn ${isFollowing ? 'following' : ''}">
                                ${isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                        `;
                    });
                    
                    if (html === '') {
                        html = '<p class="no-suggestions">No users available to follow at this time.</p>';
                    }
                    
                    suggestionsContainer.innerHTML = html;
                });
        })
        .catch(error => {
            console.error('Error loading suggested users:', error);
            suggestionsContainer.innerHTML = '<p class="error">Error loading suggestions. Please try again.</p>';
        });
}
