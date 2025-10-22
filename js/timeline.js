// Timeline functionality - Optimized version
// Performance utilities accessed via window.PerformanceUtils

// Helper function to generate random avatar (uses cache from app.js if available)
function generateRandomAvatar(seed) {
    const style = 'fun-emoji';
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// DOM Elements
const yapsContainer = document.getElementById('yapsContainer');
const TIMELINE_PAGE_SIZE = 20; // Load 20 yaps at a time
let lastYapTimestamp = null;
let isLoadingMore = false;

// Intersection Observer for infinite scroll
let infiniteScrollObserver = null;

function setupInfiniteScroll() {
    if (!infiniteScrollObserver) {
        infiniteScrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoadingMore) {
                    loadTimeline(true);
                }
            });
        }, { rootMargin: '100px' });
    }
}

// Load timeline with pagination
function loadTimeline(loadMore = false) {
    if (!auth.currentUser) {
        return;
    }
    
    if (!yapsContainer) {
        (window.PerformanceUtils?.Logger || console).error('Yaps container element not found');
        return;
    }

    if (isLoadingMore) return; // Prevent duplicate requests
    isLoadingMore = true;

    const currentUserId = auth.currentUser.uid;

    // Show loading state
    if (!loadMore) {
        yapsContainer.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
    } else {
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-more';
        loadingSpinner.innerHTML = '<div class="loading-spinner"></div>';
        yapsContainer.appendChild(loadingSpinner);
    }

    // Get followed users
    database.ref(`following/${currentUserId}`).once('value')
        .then(snapshot => {
            const following = snapshot.val() || {};
            const followedUserIds = Object.keys(following);
            
            // Always include the current user's yaps in the timeline
            followedUserIds.push(currentUserId);
            
            // If not following anyone, show a message and suggestions
            if (followedUserIds.length === 1 && !loadMore) {
                const messageHtml = '<div class="follow-suggestion-banner">' +
                    '<p>Follow other users to see their posts in your feed!</p>' +
                    '<button onclick="showFollowSuggestions()" class="btn primary-btn">Find people to follow</button>' +
                    '</div>';
                yapsContainer.insertAdjacentHTML('afterbegin', messageHtml);
            }

            // Fetch yaps with query limit for better performance
            const yapPromises = followedUserIds.map(userId => {
                let query = database.ref(`userYaps/${userId}`)
                    .orderByChild('timestamp')
                    .limitToLast(TIMELINE_PAGE_SIZE);
                
                if (loadMore && lastYapTimestamp) {
                    query = query.endBefore(lastYapTimestamp);
                }
                
                return query.once('value');
            });

            return Promise.all(yapPromises);
        })
        .then(results => {
            const yaps = [];

            results.forEach(snapshot => {
                snapshot.forEach(childSnapshot => {
                    const yapData = childSnapshot.val();
                    if (yapData) {
                        yapData.id = childSnapshot.key;
                        yaps.push(yapData);
                    }
                });
            });

            // Sort yaps by timestamp (newest first)
            yaps.sort((a, b) => b.timestamp - a.timestamp);

            // Track last timestamp for pagination
            if (yaps.length > 0) {
                lastYapTimestamp = yaps[yaps.length - 1].timestamp;
            }

            // Remove loading spinner
            if (loadMore) {
                const loadingSpinner = yapsContainer.querySelector('.loading-more');
                if (loadingSpinner) loadingSpinner.remove();
            } else {
                yapsContainer.innerHTML = '';
            }

            // Render yaps
            if (yaps.length === 0 && !loadMore) {
                yapsContainer.innerHTML += '<p class="empty-state">No yaps to show yet. Start following people or create your first yap!</p>';
            } else {
                const fragment = document.createDocumentFragment();
                yaps.forEach(yapData => {
                    const yapElement = createYapElement(yapData);
                    fragment.appendChild(yapElement);
                });
                yapsContainer.appendChild(fragment);
                
                // Add "Load More" button if we got a full page
                if (yaps.length >= TIMELINE_PAGE_SIZE) {
                    const loadMoreBtn = document.createElement('button');
                    loadMoreBtn.className = 'load-more-btn';
                    loadMoreBtn.textContent = 'Load More';
                    loadMoreBtn.onclick = () => {
                        loadMoreBtn.remove();
                        loadTimeline(true);
                    };
                    yapsContainer.appendChild(loadMoreBtn);
                }
            }
            
            isLoadingMore = false;
            
            // Setup real-time updates after initial load
            if (!loadMore) {
                setupRealTimeUpdates();
            }
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Error loading timeline:', error);
            if (!loadMore) {
                yapsContainer.innerHTML = `<p class="error">Error loading Yaps: ${error.message}</p>`;
            }
            isLoadingMore = false;
        });
}

// Create a yap element
function createYapElement(yapData, isLiked = false, isReyapped = false) {
    // Validate yapData
    if (!yapData || !yapData.id) {
        (window.PerformanceUtils?.Logger || console).error('Invalid yap data provided to createYapElement:', yapData);
        return document.createElement('div'); // Return empty div
    }
    
    const yapElement = document.createElement('div');
    yapElement.className = 'yap-item';
    yapElement.dataset.yapId = yapData.id;
    
    // Check if this is a reyap
    const isReyap = yapData.reyappedBy && yapData.reyappedAt;
    
    // Defensive: fallback for missing data and escape HTML
    const username = (yapData.username || 'anonymous').replace(/[<>"']/g, '');
    const content = yapData.text || yapData.content || '';  // Support both 'text' (new) and 'content' (legacy)
    const formattedTime = yapData.timestamp ? formatRelativeTime(yapData.timestamp) : '';
    const isOwnYap = auth.currentUser && yapData.uid === auth.currentUser.uid;
    
    // Fetch fresh user data for displayName and photoURL if we have a uid
    if (yapData.uid && database) {
        Promise.all([
            database.ref(`users/${yapData.uid}/displayName`).once('value'),
            database.ref(`users/${yapData.uid}/photoURL`).once('value')
        ]).then(([displayNameSnap, photoSnap]) => {
            const freshDisplayName = displayNameSnap.val();
            const freshPhotoURL = photoSnap.val();
            
            // Update display name if we got fresh data
            const displayNameElement = yapElement.querySelector('.display-name');
            if (displayNameElement && freshDisplayName) {
                const escapedDisplayName = freshDisplayName.replace(/[<>"']/g, '');
                displayNameElement.textContent = escapedDisplayName;
                
                // Update username to show as secondary
                const userInfoDiv = yapElement.querySelector('.yap-user-info');
                if (userInfoDiv) {
                    const usernameSecondary = userInfoDiv.querySelector('.username-secondary');
                    if (!usernameSecondary) {
                        const timeSpan = userInfoDiv.querySelector('.time');
                        const newUsernameSpan = document.createElement('span');
                        newUsernameSpan.className = 'username-secondary';
                        newUsernameSpan.textContent = `@${username}`;
                        if (timeSpan) {
                            userInfoDiv.insertBefore(newUsernameSpan, timeSpan);
                        }
                    }
                }
            }
            
            // Update avatar if we got fresh data
            const avatarImg = yapElement.querySelector('.yap-avatar img');
            if (avatarImg && freshPhotoURL) {
                avatarImg.src = freshPhotoURL.replace(/["'<>]/g, '');
            }
        }).catch(error => {
            (window.PerformanceUtils?.Logger || console).warn('Could not fetch fresh user data for yap:', error);
        });
    }
    
    // Use stored data as initial/fallback
    const displayName = yapData.displayName ? yapData.displayName.replace(/[<>"']/g, '') : null;
    const displayText = displayName || `@${username}`;
    const avatar = (yapData.userPhotoURL || generateRandomAvatar(yapData.uid || username)).replace(/["'<>]/g, '');
    
    yapElement.innerHTML = `
        ${isReyap ? `
            <div class="reyap-indicator">
                <i class="fas fa-retweet"></i>
                <span>You reyapped</span>
            </div>
        ` : ''}
        <div class="yap-header">
            <div class="yap-user">
                <div class="yap-avatar">
                    <img src="${avatar}" alt="${displayText}" onerror="this.src='./images/default-avatar.svg'" loading="lazy">
                </div>
                <div class="yap-user-info">
                    <span class="display-name">${displayText}</span>
                    ${displayName ? `<span class="username-secondary">@${username}</span>` : ''}
                    <span class="time">· ${formattedTime}</span>
                </div>
            </div>
            <div class="yap-options">
                ${isOwnYap ? '<button class="icon-btn delete-yap" aria-label="Delete yap" title="Delete"><i class="fas fa-trash"></i></button>' : ''}
                <button class="icon-btn" aria-label="More options"><i class="fas fa-ellipsis-h"></i></button>
            </div>
        </div>
        <div class="yap-content">
            ${content ? formatYapContent(content) : ''}
            ${yapData.media && yapData.media.length > 0 ? `
                <div class="yap-media-grid ${yapData.media.length === 1 ? 'single' : yapData.media.length === 2 ? 'double' : yapData.media.length === 3 ? 'triple' : 'quad'}">
                    ${yapData.media.map(mediaItem => {
                        // Handle both old format (string URLs) and new format (objects)
                        if (typeof mediaItem === 'string') {
                            return `<img src="${mediaItem}" alt="Yap media" loading="lazy" onerror="this.style.display='none'">`;
                        } else if (mediaItem.type === 'gif') {
                            return `<img src="${mediaItem.url}" alt="GIF" class="yap-gif" loading="lazy" onerror="this.style.display='none'">`;
                        } else {
                            return `<img src="${mediaItem.url}" alt="Yap media" loading="lazy" onerror="this.style.display='none'">`;
                        }
                    }).join('')}
                </div>
            ` : ''}
        </div>
        <div class="yap-actions">
            <button class="action-btn reply" aria-label="Reply">
                <i class="far fa-comment"></i>
                <span>${yapData.replies || 0}</span>
            </button>
            <button class="action-btn reyap ${isReyapped ? 'reyapped' : ''}" aria-label="Reyap" ${yapData.allowReyap === false ? 'disabled title="Reyaps disabled by author"' : ''}>
                <i class="fas fa-retweet"></i>
                <span>${yapData.reyaps || 0}</span>
            </button>
            <button class="action-btn like ${isLiked ? 'liked' : ''}" aria-label="Like">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                <span>${yapData.likes || 0}</span>
            </button>
            <button class="action-btn share" aria-label="Share">
                <i class="far fa-share-square"></i>
            </button>
            <button class="action-btn message hidden" aria-label="Message" data-user-id="${yapData.uid}">
                <i class="far fa-envelope"></i>
            </button>
        </div>
    `;
    
    // Add event listeners
    const likeBtn = yapElement.querySelector('.action-btn.like');
    const reyapBtn = yapElement.querySelector('.action-btn.reyap');
    const replyBtn = yapElement.querySelector('.action-btn.reply');
    const shareBtn = yapElement.querySelector('.action-btn.share');
    const messageBtn = yapElement.querySelector('.action-btn.message');
    
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
        }).catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Like error:', error);
            showSnackbar('Failed to update like', 'error');
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
        }).catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Reyap error:', error);
            showSnackbar('Failed to update reyap', 'error');
        });
    });
    
    replyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openReplyModal(yapId, username, content);
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
                        (window.PerformanceUtils?.Logger || console).error('Error sharing:', error);
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
    
    // Message button - check for mutual follow and show if applicable
    if (messageBtn) {
        // Add click listener first
        messageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = messageBtn.dataset.userId;
            if (userId && typeof startConversation === 'function') {
                startConversation(userId);
            }
        });
        
        // Check visibility only if not current user's own yap
        if (auth.currentUser && yapData.uid !== auth.currentUser.uid) {
            // Check if we follow them and they follow us (mutual follow)
            const currentUid = auth.currentUser.uid;
            const otherUid = yapData.uid;
            
            Promise.all([
                database.ref(`following/${currentUid}/${otherUid}`).once('value'),
                database.ref(`following/${otherUid}/${currentUid}`).once('value')
            ]).then(([iFollowThem, theyFollowMe]) => {
                const iFollow = iFollowThem.exists();
                const theyFollow = theyFollowMe.exists();
                
                // Debug: Log follow status for troubleshooting
                if (iFollow || theyFollow) {
                    (window.PerformanceUtils?.Logger || console).log(`[Message Button] ${yapData.username}: I follow=${iFollow}, They follow=${theyFollow}`);
                }
                
                // Show message button only if mutual follow
                if (iFollow && theyFollow) {
                    messageBtn.classList.remove('hidden');
                }
            }).catch(error => {
                (window.PerformanceUtils?.Logger || console).error('Failed to check mutual follow status:', error);
            });
        }
    }
    
    // Add delete button listener if it's the user's own yap
    const deleteBtn = yapElement.querySelector('.delete-yap');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await showConfirmModal(
                'Delete Yap',
                'Are you sure you want to delete this yap? This action cannot be undone.',
                'Delete',
                'Cancel'
            );
            if (confirmed) {
                deleteYap(yapData.id, yapData.uid);
            }
        });
    }
    
    // Add thread toggle if there are replies
    if (yapData.replies && yapData.replies > 0) {
        const threadContainer = document.createElement('div');
        threadContainer.className = 'thread-container';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'thread-toggle-btn';
        toggleBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Show ${yapData.replies} ${yapData.replies === 1 ? 'reply' : 'replies'}`;
        
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'replies-container';
        repliesContainer.style.display = 'none';
        
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReplies(yapId, repliesContainer, toggleBtn);
        });
        
        threadContainer.appendChild(toggleBtn);
        threadContainer.appendChild(repliesContainer);
        yapElement.appendChild(threadContainer);
    }
    
    // Open yap details on click
    yapElement.addEventListener('click', () => {
        // TODO: Navigate to yap details page
        showSnackbar('Yap details feature coming soon!');
    });
    
    // Convert title attributes to data-tooltip for this element
    if (typeof window.convertTitlesToTooltips === 'function') {
        window.convertTitlesToTooltips(yapElement);
    }
    
    return yapElement;
}

// Format yap content (add links, hashtags, mentions)
function formatYapContent(content) {
    if (!content) return '';
    
    // First escape HTML to prevent XSS
    const escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    // Convert URLs to links
    let formatted = escaped.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert hashtags
    formatted = formatted.replace(
        /#(\w+)/g,
        '<a href="#hashtag/$1" class="hashtag" data-hashtag="$1">#$1</a>'
    );
    
    // Convert mentions
    formatted = formatted.replace(
        /@(\w+)/g,
        '<a href="#user/$1" class="mention" data-username="$1">@$1</a>'
    );
    
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Delete a yap
function deleteYap(yapId, yapUid) {
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to delete yaps', 'error');
        return;
    }
    
    // Verify the user owns this yap
    if (auth.currentUser.uid !== yapUid) {
        showSnackbar('You can only delete your own yaps', 'error');
        return;
    }
    
    // Fetch all related data first, then build updates object
    Promise.all([
        database.ref(`likes/${yapId}`).once('value'),
        database.ref(`reyaps/${yapId}`).once('value')
    ]).then(([likesSnapshot, reyapsSnapshot]) => {
        const updates = {};
        
        // Remove from main yaps collection
        updates[`yaps/${yapId}`] = null;
        
        // Remove from user's yaps
        updates[`userYaps/${yapUid}/${yapId}`] = null;
        
        // Remove all likes for this yap
        if (likesSnapshot.exists()) {
            const likes = likesSnapshot.val();
            Object.keys(likes).forEach(userId => {
                updates[`likes/${yapId}/${userId}`] = null;
                updates[`userLikes/${userId}/${yapId}`] = null;
            });
        }
        
        // Remove all reyaps for this yap
        if (reyapsSnapshot.exists()) {
            const reyaps = reyapsSnapshot.val();
            Object.keys(reyaps).forEach(userId => {
                updates[`reyaps/${yapId}/${userId}`] = null;
                updates[`userReyaps/${userId}/${yapId}`] = null;
            });
        }
        
        // Apply all updates atomically
        return database.ref().update(updates);
    }).then(() => {
        // Remove the yap element from DOM with animation
        const yapElement = document.querySelector(`[data-yap-id="${yapId}"]`);
        if (yapElement) {
            yapElement.style.transition = 'all 0.3s ease';
            yapElement.style.opacity = '0';
            yapElement.style.transform = 'translateX(-100%)';
            setTimeout(() => yapElement.remove(), 300);
        }
        showSnackbar('Yap deleted successfully', 'success');
    }).catch(error => {
        (window.PerformanceUtils?.Logger || console).error('Error deleting yap:', error);
        showSnackbar('Error deleting yap: ' + error.message, 'error');
    });
}

// Set up real-time updates for new yaps
// Set up real-time updates for new yaps
let realtimeListeners = [];

function setupRealTimeUpdates() {
    if (!auth.currentUser) return;
    
    const currentUserId = auth.currentUser.uid;
    
    // Clear any existing listeners
    realtimeListeners.forEach(listener => listener.off());
    realtimeListeners = [];
    
    // Get followed users
    database.ref(`following/${currentUserId}`).once('value')
        .then(snapshot => {
            const following = snapshot.val() || {};
            const followedUserIds = Object.keys(following);
            followedUserIds.push(currentUserId); // Include own yaps
            
            // Get current timestamp to only listen for new yaps
            const currentTime = Date.now();
            
            // Set up listener for each followed user
            followedUserIds.forEach(userId => {
                // Listen for new yaps (only future ones)
                const newYapsRef = database.ref(`userYaps/${userId}`)
                    .orderByChild('timestamp')
                    .startAt(currentTime);
                
                realtimeListeners.push(newYapsRef);
                
                newYapsRef.on('child_added', snapshot => {
                    const yapData = snapshot.val();
                    if (!yapData) return;
                    
                    yapData.id = snapshot.key;
                    
                    // Only add if timestamp is after we started listening
                    // and it's not already in the DOM
                    if (yapData.timestamp >= currentTime && 
                        !document.querySelector(`[data-yap-id="${yapData.id}"]`)) {
                        
                        // Check if user has liked or reyapped this yap
                        Promise.all([
                            database.ref(`userLikes/${currentUserId}/${yapData.id}`).once('value'),
                            database.ref(`userReyaps/${currentUserId}/${yapData.id}`).once('value')
                        ]).then(([likeSnapshot, reyapSnapshot]) => {
                            const isLiked = likeSnapshot.exists();
                            const isReyapped = reyapSnapshot.exists();
                            
                            // Create and prepend the new yap element
                            const yapElement = createYapElement(yapData, isLiked, isReyapped);
                            
                            // Find the first yap in the container (after any banners)
                            const firstYap = yapsContainer.querySelector('.yap-item');
                            if (firstYap) {
                                yapsContainer.insertBefore(yapElement, firstYap);
                            } else {
                                yapsContainer.appendChild(yapElement);
                            }
                            
                            // Add a temporary highlight effect
                            yapElement.classList.add('new-yap');
                            setTimeout(() => {
                                yapElement.classList.remove('new-yap');
                            }, 2000);
                            
                            // Show notification
                            if (typeof showSnackbar === 'function' && yapData.uid !== currentUserId) {
                                showSnackbar(`New yap from @${yapData.username}`, 'success', 3000);
                            }
                        });
                    }
                });
                
                // Listen for deleted yaps on the unfiltered reference (catches all deletions)
                const deletionsRef = database.ref(`userYaps/${userId}`);
                realtimeListeners.push(deletionsRef);
                
                deletionsRef.on('child_removed', snapshot => {
                    const yapId = snapshot.key;
                    
                    // Remove the yap element from DOM if it exists
                    const yapElement = document.querySelector(`[data-yap-id="${yapId}"]`);
                    if (yapElement) {
                        yapElement.style.transition = 'all 0.3s ease';
                        yapElement.style.opacity = '0';
                        yapElement.style.transform = 'translateX(-100%)';
                        setTimeout(() => yapElement.remove(), 300);
                    }
                });
            });
        });
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
            (window.PerformanceUtils?.Logger || console).error('Error loading suggested users:', error);
            suggestionsContainer.innerHTML = '<p class="error">Error loading suggestions. Please try again.</p>';
        });
}

// Thread/Reply functionality
function loadReplies(yapId, repliesContainer) {
    if (!yapId || !repliesContainer) return;
    
    // Show loading state
    repliesContainer.innerHTML = '<div class="loading-replies"><i class="fas fa-spinner fa-spin"></i> Loading replies...</div>';
    
    database.ref(`yapReplies/${yapId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                repliesContainer.innerHTML = '<div class="no-replies">No replies yet</div>';
                return;
            }
            
            const replyIds = Object.keys(snapshot.val());
            const replyPromises = replyIds.map(replyId => 
                database.ref(`yaps/${replyId}`).once('value')
            );
            
            return Promise.all(replyPromises)
                .then(snapshots => {
                    repliesContainer.innerHTML = '';
                    
                    snapshots.forEach((replySnap, index) => {
                        if (replySnap.exists()) {
                            const replyData = replySnap.val();
                            const replyId = replyIds[index];
                            
                            // Check if current user has liked/reyapped this reply
                            const userId = auth.currentUser ? auth.currentUser.uid : null;
                            const likePromise = userId 
                                ? database.ref(`userLikes/${userId}/${replyId}`).once('value')
                                : Promise.resolve({ exists: () => false });
                            const reyapPromise = userId
                                ? database.ref(`userReyaps/${userId}/${replyId}`).once('value')
                                : Promise.resolve({ exists: () => false });
                            
                            Promise.all([likePromise, reyapPromise]).then(([likeSnap, reyapSnap]) => {
                                const replyElement = createYapElement(
                                    replyData, 
                                    likeSnap.exists(), 
                                    reyapSnap.exists()
                                );
                                replyElement.classList.add('reply-yap');
                                replyElement.dataset.replyId = replyId;
                                repliesContainer.appendChild(replyElement);
                            });
                        }
                    });
                });
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Error loading replies:', error);
            repliesContainer.innerHTML = '<div class="error-replies">Error loading replies</div>';
        });
}

function toggleReplies(yapId, repliesContainer, toggleBtn) {
    if (!repliesContainer || !toggleBtn) return;
    
    const isExpanded = repliesContainer.style.display !== 'none' && repliesContainer.innerHTML !== '';
    
    if (isExpanded) {
        // Collapse
        repliesContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Show replies';
        toggleBtn.classList.remove('expanded');
    } else {
        // Expand and load replies
        repliesContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide replies';
        toggleBtn.classList.add('expanded');
        
        if (repliesContainer.innerHTML === '') {
            loadReplies(yapId, repliesContainer);
        }
    }
}

// Reply functionality
function openReplyModal(replyToYapId, replyToUsername, replyToContent) {
    if (!auth.currentUser) {
        showSnackbar('Please sign in to reply', 'error');
        return;
    }
    
    const composeModal = document.getElementById('composeModal');
    const modalYapText = document.getElementById('modalYapText');
    
    if (!composeModal || !modalYapText) {
        (window.PerformanceUtils?.Logger || console).error('Compose modal elements not found');
        return;
    }
    
    // Store reply context
    window.replyContext = {
        yapId: replyToYapId,
        username: replyToUsername
    };
    
    // Pre-fill with @username mention
    modalYapText.value = `@${replyToUsername} `;
    
    // Show modal
    toggleModal(composeModal, true);
    
    // Focus text area at the end
    modalYapText.focus();
    modalYapText.setSelectionRange(modalYapText.value.length, modalYapText.value.length);
    
    // Update character count
    if (typeof updateCharacterCount === 'function') {
        updateCharacterCount();
    }
    
    // Add reply indicator
    let replyIndicator = document.getElementById('replyIndicator');
    if (!replyIndicator) {
        replyIndicator = document.createElement('div');
        replyIndicator.id = 'replyIndicator';
        replyIndicator.style.cssText = 'padding: 8px 12px; margin-bottom: 8px; background: var(--bg-secondary); border-radius: 8px; font-size: 14px; color: var(--text-secondary);';
        modalYapText.parentElement.insertBefore(replyIndicator, modalYapText);
    }
    
    const truncatedContent = replyToContent.length > 50 ? replyToContent.substring(0, 50) + '...' : replyToContent;
    replyIndicator.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>Replying to @${replyToUsername}: "${truncatedContent}"</span>
            <button onclick="cancelReply()" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    replyIndicator.style.display = 'block';
}

window.cancelReply = function() {
    window.replyContext = null;
    const replyIndicator = document.getElementById('replyIndicator');
    if (replyIndicator) {
        replyIndicator.style.display = 'none';
    }
    const modalYapText = document.getElementById('modalYapText');
    if (modalYapText && modalYapText.value.startsWith('@')) {
        modalYapText.value = '';
        if (typeof updateCharacterCount === 'function') {
            updateCharacterCount();
        }
    }
};

// Export functions globally for use in other modules
window.loadTimeline = loadTimeline;
window.createYapElement = createYapElement;
