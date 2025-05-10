// Timeline functionality

// DOM Elements
const yapsContainer = document.getElementById('yapsContainer');

// Load timeline
function loadTimeline() {
    if (!auth.currentUser) {
        return;
    }
    
    // Show loading state
    yapsContainer.innerHTML = '<div class="loading">Loading Yaps...</div>';
    
    // Get the most recent yaps
    database.ref('yaps')
        .orderByChild('timestamp')
        .limitToLast(50)  // Limit to the 50 most recent yaps
        .once('value')
        .then(snapshot => {
            // Clear the loading message
            yapsContainer.innerHTML = '';
            
            // Check if there are any yaps
            if (!snapshot.exists()) {
                yapsContainer.innerHTML = '<p class="no-yaps">No Yaps yet. Be the first to Yap!</p>';
                return;
            }
            
            // Get all yaps and reverse them to show newest first
            const yaps = [];
            snapshot.forEach(childSnapshot => {
                const yapData = childSnapshot.val();
                yapData.id = childSnapshot.key;
                yaps.push(yapData);
            });
            
            // Reverse to get newest first
            yaps.reverse();
            
            // Get current user's likes and reyaps
            return Promise.all([
                database.ref(`userLikes/${auth.currentUser.uid}`).once('value'),
                database.ref(`userReyaps/${auth.currentUser.uid}`).once('value')
            ]).then(([likesSnapshot, reyapsSnapshot]) => {
                const userLikes = likesSnapshot.val() || {};
                const userReyaps = reyapsSnapshot.val() || {};
                
                // Render each yap
                yaps.forEach(yapData => {
                    const yapElement = createYapElement(
                        yapData, 
                        userLikes[yapData.id] || false,
                        userReyaps[yapData.id] || false
                    );
                    yapsContainer.appendChild(yapElement);
                });
            });
        })
        .catch(error => {
            console.error('Error loading timeline:', error);
            yapsContainer.innerHTML = `<p class="error">Error loading Yaps: ${error.message}</p>`;
        });
    
    // Set up real-time listeners for new yaps
    setupRealTimeUpdates();
}

// Create a yap element
function createYapElement(yapData, isLiked, isReyapped) {
    const yapElement = document.createElement('div');
    yapElement.className = 'yap-item';
    yapElement.dataset.yapId = yapData.id;
    
    // Format timestamp
    const formattedTime = formatRelativeTime(yapData.timestamp);
    
    // Default avatar if none exists
    const avatar = yapData.userPhotoURL || './images/default-avatar.png';
    
    // Create the HTML structure
    yapElement.innerHTML = `
        <div class="yap-header">
            <div class="yap-user">
                <div class="yap-avatar">
                    <img src="${avatar}" alt="${yapData.username}" onerror="this.src='./images/default-avatar.png'">
                </div>
                <div class="yap-user-info">
                    <span class="username">@${yapData.username}</span>
                    <span class="time">· ${formattedTime}</span>
                </div>
            </div>
            <div class="yap-options">
                <button class="icon-btn"><i class="fas fa-ellipsis-h"></i></button>
            </div>
        </div>
        <div class="yap-content">
            ${formatYapContent(yapData.content)}
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
            navigator.share({
                title: 'Check out this Yap!',
                text: `@${yapData.username}: ${yapData.content}`,
                url: window.location.href
            })
            .catch(error => console.log('Error sharing:', error));
        } else {
            showSnackbar('Share feature not supported by your browser');
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
