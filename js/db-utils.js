// Database Utility Functions
// Reusable functions for Firebase operations

/**
 * Get a yap by ID with error handling
 * @param {string} yapId - The yap ID
 * @returns {Promise<Object>} - Yap data with ID
 */
async function getYapById(yapId) {
    if (!yapId) {
        throw new Error('Yap ID is required');
    }
    
    const snapshot = await database.ref(`yaps/${yapId}`).once('value');
    if (!snapshot.exists()) {
        throw new Error('Yap not found');
    }
    
    const yapData = snapshot.val();
    yapData.id = yapId;
    return yapData;
}

/**
 * Get user profile by UID
 * @param {string} uid - User ID
 * @returns {Promise<Object>} - User profile data
 */
async function getUserProfile(uid) {
    if (!uid) {
        throw new Error('User ID is required');
    }
    
    const snapshot = await database.ref(`users/${uid}`).once('value');
    if (!snapshot.exists()) {
        throw new Error('User not found');
    }
    
    return snapshot.val();
}

/**
 * Check if current user has liked a yap
 * @param {string} yapId - The yap ID
 * @param {string} userId - The user ID (defaults to current user)
 * @returns {Promise<boolean>} - True if liked
 */
async function isYapLiked(yapId, userId = null) {
    const uid = userId || (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return false;
    
    const snapshot = await database.ref(`userLikes/${uid}/${yapId}`).once('value');
    return snapshot.exists();
}

/**
 * Check if current user has reyapped a yap
 * @param {string} yapId - The yap ID
 * @param {string} userId - The user ID (defaults to current user)
 * @returns {Promise<boolean>} - True if reyapped
 */
async function isYapReyapped(yapId, userId = null) {
    const uid = userId || (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return false;
    
    const snapshot = await database.ref(`userReyaps/${uid}/${yapId}`).once('value');
    return snapshot.exists();
}

/**
 * Get like and reyap status for a yap
 * @param {string} yapId - The yap ID
 * @param {string} userId - The user ID (defaults to current user)
 * @returns {Promise<Object>} - {isLiked, isReyapped}
 */
async function getYapInteractionStatus(yapId, userId = null) {
    const uid = userId || (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return { isLiked: false, isReyapped: false };
    
    const [likeSnapshot, reyapSnapshot] = await Promise.all([
        database.ref(`userLikes/${uid}/${yapId}`).once('value'),
        database.ref(`userReyaps/${uid}/${yapId}`).once('value')
    ]);
    
    return {
        isLiked: likeSnapshot.exists(),
        isReyapped: reyapSnapshot.exists()
    };
}

/**
 * Toggle like on a yap
 * @param {string} yapId - The yap ID
 * @param {string} yapAuthorId - The yap author's UID
 * @returns {Promise<boolean>} - True if now liked, false if unliked
 */
async function toggleYapLike(yapId, yapAuthorId) {
    if (!auth.currentUser) {
        throw new Error('Must be signed in to like');
    }
    
    const uid = auth.currentUser.uid;
    const likeRef = database.ref(`userLikes/${uid}/${yapId}`);
    const snapshot = await likeRef.once('value');
    const isCurrentlyLiked = snapshot.exists();
    
    const updates = {};
    
    if (isCurrentlyLiked) {
        // Unlike
        updates[`likes/${yapId}/${uid}`] = null;
        updates[`userLikes/${uid}/${yapId}`] = null;
        
        // Decrement like count
        await database.ref(`yaps/${yapId}/likes`).transaction(likes => {
            return (likes || 1) - 1;
        });
    } else {
        // Like
        updates[`likes/${yapId}/${uid}`] = true;
        updates[`userLikes/${uid}/${yapId}`] = true;
        
        // Increment like count
        await database.ref(`yaps/${yapId}/likes`).transaction(likes => {
            return (likes || 0) + 1;
        });
        
        // Create notification if liking someone else's yap
        if (yapAuthorId && yapAuthorId !== uid) {
            const notificationId = database.ref('notifications').push().key;
            updates[`notifications/${yapAuthorId}/${notificationId}`] = {
                type: 'like',
                from: uid,
                yapId: yapId,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false
            };
        }
    }
    
    await database.ref().update(updates);
    return !isCurrentlyLiked;
}

/**
 * Toggle reyap on a yap
 * @param {string} yapId - The yap ID
 * @param {string} yapAuthorId - The yap author's UID
 * @param {boolean} allowReyap - Whether reyaps are allowed
 * @returns {Promise<boolean>} - True if now reyapped, false if unreyapped
 */
async function toggleYapReyap(yapId, yapAuthorId, allowReyap = true) {
    if (!auth.currentUser) {
        throw new Error('Must be signed in to reyap');
    }
    
    if (!allowReyap) {
        throw new Error('Reyaps not allowed on this yap');
    }
    
    const uid = auth.currentUser.uid;
    const reyapRef = database.ref(`userReyaps/${uid}/${yapId}`);
    const snapshot = await reyapRef.once('value');
    const isCurrentlyReyapped = snapshot.exists();
    
    const updates = {};
    
    if (isCurrentlyReyapped) {
        // Unreyap
        updates[`reyaps/${yapId}/${uid}`] = null;
        updates[`userReyaps/${uid}/${yapId}`] = null;
        
        // Decrement reyap count
        await database.ref(`yaps/${yapId}/reyaps`).transaction(reyaps => {
            return (reyaps || 1) - 1;
        });
    } else {
        // Reyap
        updates[`reyaps/${yapId}/${uid}`] = true;
        updates[`userReyaps/${uid}/${yapId}`] = true;
        
        // Increment reyap count
        await database.ref(`yaps/${yapId}/reyaps`).transaction(reyaps => {
            return (reyaps || 0) + 1;
        });
        
        // Create notification if reyapping someone else's yap
        if (yapAuthorId && yapAuthorId !== uid) {
            const notificationId = database.ref('notifications').push().key;
            updates[`notifications/${yapAuthorId}/${notificationId}`] = {
                type: 'reyap',
                from: uid,
                yapId: yapId,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false
            };
        }
    }
    
    await database.ref().update(updates);
    return !isCurrentlyReyapped;
}

/**
 * Create a new yap
 * @param {Object} yapData - Yap data (content, username, photoURL, etc.)
 * @param {string} replyToId - Parent yap ID if this is a reply
 * @returns {Promise<Object>} - {yapId, yapData, replyToId}
 */
async function createYap(yapData, replyToId = null) {
    if (!auth.currentUser) {
        throw new Error('Must be signed in to create yap');
    }
    
    const newYapKey = database.ref('yaps').push().key;
    const updates = {};
    
    // Add reply reference if this is a reply
    if (replyToId) {
        yapData.replyTo = replyToId;
    }
    
    // Always store in main yaps collection
    updates[`yaps/${newYapKey}`] = yapData;
    
    // Only store in userYaps if it's NOT a reply (replies only show under parent)
    if (!replyToId) {
        updates[`userYaps/${auth.currentUser.uid}/${newYapKey}`] = yapData;
    }
    
    // If this is a reply, add to yapReplies and increment reply count
    if (replyToId) {
        updates[`yapReplies/${replyToId}/${newYapKey}`] = true;
        
        // Increment reply count on parent yap
        const parentSnap = await database.ref(`yaps/${replyToId}`).once('value');
        const currentReplies = parentSnap.val()?.replies || 0;
        updates[`yaps/${replyToId}/replies`] = currentReplies + 1;
    }
    
    // Commit all updates
    await database.ref().update(updates);
    
    return { yapId: newYapKey, yapData, replyToId };
}

/**
 * Delete a yap
 * @param {string} yapId - The yap ID
 * @param {string} yapUid - The yap author's UID
 * @param {string} parentYapId - Parent yap ID if this is a reply
 * @returns {Promise<void>}
 */
async function deleteYap(yapId, yapUid, parentYapId = null) {
    if (!auth.currentUser || auth.currentUser.uid !== yapUid) {
        throw new Error('Unauthorized to delete this yap');
    }
    
    // Get all likes and reyaps to delete
    const [likesSnap, reyapsSnap] = await Promise.all([
        database.ref(`likes/${yapId}`).once('value'),
        database.ref(`reyaps/${yapId}`).once('value')
    ]);
    
    const updates = {};
    
    // Delete main yap
    updates[`yaps/${yapId}`] = null;
    
    // Delete from userYaps (only exists if not a reply)
    if (!parentYapId) {
        updates[`userYaps/${yapUid}/${yapId}`] = null;
    }
    
    // If this is a reply, remove from yapReplies and decrement count
    if (parentYapId) {
        updates[`yapReplies/${parentYapId}/${yapId}`] = null;
        
        // Decrement reply count
        const parentSnap = await database.ref(`yaps/${parentYapId}`).once('value');
        const currentReplies = parentSnap.val()?.replies || 1;
        updates[`yaps/${parentYapId}/replies`] = Math.max(0, currentReplies - 1);
    }
    
    // Delete all likes
    if (likesSnap.exists()) {
        updates[`likes/${yapId}`] = null;
        likesSnap.forEach(likeSnap => {
            const userId = likeSnap.key;
            updates[`userLikes/${userId}/${yapId}`] = null;
        });
    }
    
    // Delete all reyaps
    if (reyapsSnap.exists()) {
        updates[`reyaps/${yapId}`] = null;
        reyapsSnap.forEach(reyapSnap => {
            const userId = reyapSnap.key;
            updates[`userReyaps/${userId}/${yapId}`] = null;
        });
    }
    
    // Delete any replies to this yap
    const repliesSnap = await database.ref(`yapReplies/${yapId}`).once('value');
    if (repliesSnap.exists()) {
        updates[`yapReplies/${yapId}`] = null;
        // Note: We're not recursively deleting reply yaps themselves
        // They stay in the yaps collection but become orphaned
    }
    
    await database.ref().update(updates);
}

/**
 * Get replies for a yap
 * @param {string} yapId - The yap ID
 * @returns {Promise<Array>} - Array of reply data with interaction status
 */
async function getYapReplies(yapId) {
    const snapshot = await database.ref(`yapReplies/${yapId}`).once('value');
    
    if (!snapshot.exists()) {
        return [];
    }
    
    const replyIds = Object.keys(snapshot.val());
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    
    // Fetch all replies and their interaction status
    const replyPromises = replyIds.map(async (replyId) => {
        try {
            const replySnap = await database.ref(`yaps/${replyId}`).once('value');
            
            if (!replySnap.exists()) {
                return null;
            }
            
            const replyData = replySnap.val();
            replyData.id = replyId;
            
            // Get interaction status if user is logged in
            if (userId) {
                const status = await getYapInteractionStatus(replyId, userId);
                replyData.isLiked = status.isLiked;
                replyData.isReyapped = status.isReyapped;
            }
            
            return replyData;
        } catch (error) {
            console.warn(`Could not load reply ${replyId}:`, error);
            return null;
        }
    });
    
    const replies = await Promise.all(replyPromises);
    return replies.filter(reply => reply !== null);
}

// Export all functions
if (typeof window !== 'undefined') {
    window.dbUtils = {
        getYapById,
        getUserProfile,
        isYapLiked,
        isYapReyapped,
        getYapInteractionStatus,
        toggleYapLike,
        toggleYapReyap,
        createYap,
        deleteYap,
        getYapReplies
    };
}
