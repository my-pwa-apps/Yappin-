// Main App Script

// DOM Elements
const createYapBtn = document.getElementById('createYapBtn');
const createYapModal = document.getElementById('createYapModal');
const closeYapModal = document.getElementById('closeYapModal');
const postYapBtn = document.getElementById('postYapBtn');
const modalPostYapBtn = document.getElementById('modalPostYapBtn');
const yapText = document.getElementById('yapText');
const modalYapText = document.getElementById('modalYapText');
const snackbar = document.getElementById('snackbar');

// Event Listeners
createYapBtn.addEventListener('click', openYapModal);
closeYapModal.addEventListener('click', closeModal);
postYapBtn.addEventListener('click', () => createYap(yapText));
modalPostYapBtn.addEventListener('click', () => createYap(modalYapText));

// Close modal when clicking outside of it
window.addEventListener('click', (e) => {
    if (e.target === createYapModal) {
        closeModal();
    }
});

// Utility function to show snackbar notifications
function showSnackbar(message, duration = 3000) {
    snackbar.textContent = message;
    snackbar.classList.add('show');
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, duration);
}

// Utility function to toggle modal visibility
function toggleModal(modal, isVisible) {
    if (isVisible) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Open create yap modal
function openYapModal() {
    toggleModal(createYapModal, true);
    modalYapText.focus();
}

// Close modal
function closeModal() {
    toggleModal(createYapModal, false);
    
    // Clear the textarea
    modalYapText.value = '';
}

// Create a new yap
function createYap(textarea) {
    // Get the text content
    const content = textarea.value.trim();
    
    // Validate content
    if (!content) {
        showSnackbar('Yap cannot be empty');
        return;
    }
    
    if (content.length > 280) {
        showSnackbar('Yap must be 280 characters or less');
        return;
    }
    
    // Check if user is authenticated
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to post a Yap');
        return;
    }
    
    // Get user data
    database.ref(`users/${auth.currentUser.uid}`).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (!userData) {
                throw new Error('User profile not found');
            }
            
            // Create yap object
            const yapData = {
                uid: auth.currentUser.uid,
                username: userData.username,
                content: content,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                likes: 0,
                reyaps: 0,
                replies: 0,
                userPhotoURL: userData.photoURL || null
            };
            
            // Generate a new key for the yap
            const newYapKey = database.ref('yaps').push().key;
            
            // Create update object
            const updates = {};
            updates[`yaps/${newYapKey}`] = yapData;
            updates[`userYaps/${auth.currentUser.uid}/${newYapKey}`] = true;
            
            // Commit updates
            return database.ref().update(updates);
        })
        .then(() => {
            // Clear the textarea
            textarea.value = '';
            
            // Close modal if it's open
            if (textarea === modalYapText) {
                closeModal();
            }
            
            // Show success message
            showSnackbar('Yap posted successfully!');
            
            // Refresh timeline
            loadTimeline();
        })
        .catch(error => {
            console.error('Error posting yap:', error);
            showSnackbar(`Error: ${error.message}`);
        });
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
    
    if (now.getFullYear() === date.getFullYear()) {
        return date.toLocaleDateString(undefined, options);
    }
    
    // Include year if not current year
    return date.toLocaleDateString(undefined, {
        ...options,
        year: 'numeric'
    });
}

// Handle like/unlike yap
function toggleLike(yapId) {
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to like a Yap');
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
                
                // Update yap likes count
                return yapRef.child('likes').transaction(likes => {
                    return (likes || 0) - 1;
                }).then(() => database.ref().update(updates));
            } else {
                // User hasn't liked this yap, so add the like
                updates[`likes/${yapId}/${auth.currentUser.uid}`] = true;
                updates[`userLikes/${auth.currentUser.uid}/${yapId}`] = true;
                
                // Update yap likes count
                return yapRef.child('likes').transaction(likes => {
                    return (likes || 0) + 1;
                }).then(() => database.ref().update(updates));
            }
        })
        .catch(error => {
            console.error('Error toggling like:', error);
            showSnackbar(`Error: ${error.message}`);
        });
}

// Handle reyap
function toggleReyap(yapId) {
    if (!auth.currentUser) {
        showSnackbar('You must be logged in to reyap');
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
                
                // Update yap reyaps count
                return yapRef.child('reyaps').transaction(reyaps => {
                    return (reyaps || 0) - 1;
                }).then(() => database.ref().update(updates));
            } else {
                // User hasn't reyapped this, so add the reyap
                updates[`reyaps/${yapId}/${auth.currentUser.uid}`] = true;
                updates[`userReyaps/${auth.currentUser.uid}/${yapId}`] = true;
                
                // Update yap reyaps count
                return yapRef.child('reyaps').transaction(reyaps => {
                    return (reyaps || 0) + 1;
                }).then(() => database.ref().update(updates));
            }
        })
        .catch(error => {
            console.error('Error toggling reyap:', error);
            showSnackbar(`Error: ${error.message}`);
        });
}
