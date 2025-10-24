// Groups module for Yappin'
// Handles creation, management, and interaction with topic-based groups

/**
 * Create a new group
 * @param {Object} groupData - Group information
 * @returns {Promise<string>} Group ID
 */
async function createGroup(groupData) {
    if (!auth.currentUser) {
        throw new Error('Must be logged in to create a group');
    }
    
    const { name, description, topic, isPublic, imageFile } = groupData;
    
    // Validate required fields
    if (!name || name.length < 3 || name.length > 50) {
        throw new Error('Group name must be between 3 and 50 characters');
    }
    
    if (!description || description.length < 10 || description.length > 500) {
        throw new Error('Group description must be between 10 and 500 characters');
    }
    
    if (!topic || topic.length < 3 || topic.length > 50) {
        throw new Error('Group topic must be between 3 and 50 characters');
    }
    
    // Upload group image if provided
    let imageURL = null;
    if (imageFile) {
        imageURL = await uploadGroupImage(imageFile);
    }
    
    // Create group object
    const groupId = database.ref('groups').push().key;
    const group = {
        name: name.trim(),
        description: description.trim(),
        topic: topic.trim(),
        isPublic: isPublic === true,
        createdBy: auth.currentUser.uid,
        createdAt: Date.now(),
        memberCount: 1
    };
    
    if (imageURL) {
        group.imageURL = imageURL;
    }
    
    // Create updates object for batch write
    const updates = {};
    updates[`groups/${groupId}`] = group;
    updates[`groupMembers/${groupId}/${auth.currentUser.uid}`] = {
        joinedAt: Date.now(),
        role: 'admin'
    };
    updates[`userGroups/${auth.currentUser.uid}/${groupId}`] = true;
    
    // Execute batch update
    await database.ref().update(updates);
    
    showSnackbar(window.t ? window.t('success') : 'Group created successfully!', 'success');
    return groupId;
}

/**
 * Upload group image to Firebase Storage
 * @param {File} imageFile - Image file to upload
 * @returns {Promise<string>} Download URL
 */
async function uploadGroupImage(imageFile) {
    if (!imageFile) {
        throw new Error('No image file provided');
    }
    
    // Validate file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
        throw new Error('Image file must be less than 5MB');
    }
    
    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
        throw new Error('File must be an image');
    }
    
    const timestamp = Date.now();
    const fileName = `group_${timestamp}_${imageFile.name}`;
    const storageRef = storage.ref(`group-images/${fileName}`);
    
    // Upload file
    const snapshot = await storageRef.put(imageFile);
    
    // Get download URL
    const downloadURL = await snapshot.ref.getDownloadURL();
    return downloadURL;
}

/**
 * Join a group
 * @param {string} groupId - Group ID to join
 */
async function joinGroup(groupId) {
    if (!auth.currentUser) {
        throw new Error('Must be logged in to join a group');
    }
    
    // Check if group exists
    const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
    if (!groupSnapshot.exists()) {
        throw new Error('Group not found');
    }
    
    // Check if already a member
    const memberSnapshot = await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}`).once('value');
    if (memberSnapshot.exists()) {
        throw new Error('Already a member of this group');
    }
    
    const groupData = groupSnapshot.val();
    
    // For private groups, would need approval logic (TODO)
    // For now, allow direct join for both public and private
    
    const updates = {};
    updates[`groupMembers/${groupId}/${auth.currentUser.uid}`] = {
        joinedAt: Date.now(),
        role: 'member'
    };
    updates[`userGroups/${auth.currentUser.uid}/${groupId}`] = true;
    
    // Increment member count
    const currentCount = groupData.memberCount || 0;
    updates[`groups/${groupId}/memberCount`] = currentCount + 1;
    
    await database.ref().update(updates);
    
    // Group appears in user's list - no notification needed
}

/**
 * Leave a group
 * @param {string} groupId - Group ID to leave
 */
async function leaveGroup(groupId) {
    if (!auth.currentUser) {
        throw new Error('Must be logged in to leave a group');
    }
    
    // Check if group exists
    const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
    if (!groupSnapshot.exists()) {
        throw new Error('Group not found');
    }
    
    // Check if member
    const memberSnapshot = await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}`).once('value');
    if (!memberSnapshot.exists()) {
        throw new Error('Not a member of this group');
    }
    
    const groupData = groupSnapshot.val();
    
    // Don't allow creator to leave if they're the only admin
    if (groupData.createdBy === auth.currentUser.uid) {
        // Count admins
        const membersSnapshot = await database.ref(`groupMembers/${groupId}`).once('value');
        let adminCount = 0;
        membersSnapshot.forEach(memberSnap => {
            if (memberSnap.val().role === 'admin') {
                adminCount++;
            }
        });
        
        if (adminCount <= 1) {
            throw new Error('As the only admin, you must delete the group or promote another member to admin first');
        }
    }
    
    const updates = {};
    updates[`groupMembers/${groupId}/${auth.currentUser.uid}`] = null;
    updates[`userGroups/${auth.currentUser.uid}/${groupId}`] = null;
    
    // Decrement member count
    const currentCount = groupData.memberCount || 1;
    updates[`groups/${groupId}/memberCount`] = Math.max(0, currentCount - 1);
    
    await database.ref().update(updates);
    
    // Group removed from user's list - no notification needed
}

/**
 * Load user's groups
 * @returns {Promise<Array>} Array of group objects
 */
async function loadMyGroups() {
    if (!auth.currentUser) {
        return [];
    }
    
    const userGroupsSnapshot = await database.ref(`userGroups/${auth.currentUser.uid}`).once('value');
    
    if (!userGroupsSnapshot.exists()) {
        return [];
    }
    
    const groupIds = Object.keys(userGroupsSnapshot.val());
    const groupPromises = groupIds.map(groupId => 
        database.ref(`groups/${groupId}`).once('value')
    );
    
    const groupSnapshots = await Promise.all(groupPromises);
    
    const groups = [];
    groupSnapshots.forEach((snapshot, index) => {
        if (snapshot.exists()) {
            groups.push({
                id: groupIds[index],
                ...snapshot.val()
            });
        }
    });
    
    return groups;
}

/**
 * Load public groups for discovery
 * @param {number} limit - Maximum number of groups to load
 * @returns {Promise<Array>} Array of group objects
 */
async function loadPublicGroups(limit = 20) {
    const groupsSnapshot = await database.ref('groups')
        .orderByChild('isPublic')
        .equalTo(true)
        .limitToFirst(limit)
        .once('value');
    
    if (!groupsSnapshot.exists()) {
        return [];
    }
    
    const groups = [];
    groupsSnapshot.forEach(snapshot => {
        groups.push({
            id: snapshot.key,
            ...snapshot.val()
        });
    });
    
    // Sort by member count descending
    groups.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    
    return groups;
}

/**
 * Load group members
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} Array of member objects with user data
 */
async function loadGroupMembers(groupId) {
    const membersSnapshot = await database.ref(`groupMembers/${groupId}`).once('value');
    
    if (!membersSnapshot.exists()) {
        return [];
    }
    
    const members = [];
    const memberPromises = [];
    
    membersSnapshot.forEach(memberSnap => {
        const uid = memberSnap.key;
        const memberData = memberSnap.val();
        
        memberPromises.push(
            database.ref(`users/${uid}`).once('value').then(userSnap => {
                if (userSnap.exists()) {
                    const userData = userSnap.val();
                    members.push({
                        uid,
                        username: userData.username,
                        displayName: userData.displayName,
                        photoURL: userData.photoURL,
                        role: memberData.role,
                        joinedAt: memberData.joinedAt
                    });
                }
            })
        );
    });
    
    await Promise.all(memberPromises);
    
    // Sort by role (admins first) then by join date
    members.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.joinedAt - b.joinedAt;
    });
    
    return members;
}

/**
 * Delete a group (admin only)
 * @param {string} groupId - Group ID to delete
 */
async function deleteGroup(groupId) {
    if (!auth.currentUser) {
        throw new Error('Must be logged in to delete a group');
    }
    
    // Check if user is admin
    const memberSnapshot = await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}`).once('value');
    if (!memberSnapshot.exists() || memberSnapshot.val().role !== 'admin') {
        throw new Error('Only admins can delete groups');
    }
    
    // Get all members
    const membersSnapshot = await database.ref(`groupMembers/${groupId}`).once('value');
    
    const updates = {};
    updates[`groups/${groupId}`] = null;
    updates[`groupMembers/${groupId}`] = null;
    updates[`groupYaps/${groupId}`] = null;
    
    // Remove from all user's group lists
    if (membersSnapshot.exists()) {
        membersSnapshot.forEach(memberSnap => {
            const uid = memberSnap.key;
            updates[`userGroups/${uid}/${groupId}`] = null;
        });
    }
    
    await database.ref().update(updates);
    
    showSnackbar(window.t ? window.t('success') : 'Group deleted successfully!', 'success');
}

/**
 * Post a yap to a group
 * @param {string} groupId - Group ID
 * @param {Object} yapData - Yap content and metadata
 * @returns {Promise<string>} Yap ID
 */
async function postGroupYap(groupId, yapData) {
    if (!auth.currentUser) {
        throw new Error('Must be logged in to post');
    }
    
    // Check if user is a member
    const memberSnapshot = await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}`).once('value');
    if (!memberSnapshot.exists()) {
        throw new Error('Must be a member to post in this group');
    }
    
    const { content, mediaFiles, mediaUrls: providedMediaUrls } = yapData;
    
    // Validate content
    if (!content && (!mediaFiles || mediaFiles.length === 0) && (!providedMediaUrls || providedMediaUrls.length === 0)) {
        throw new Error('Please add text or images to your yap');
    }
    
    if (content && content.length > 280) {
        throw new Error('Yap text must be 280 characters or less');
    }
    
    // Handle media - either use provided URLs or upload files
    let mediaUrls = [];
    if (providedMediaUrls && providedMediaUrls.length > 0) {
        // Media already uploaded (from media.js) - can be {type, url} objects or just URL strings
        mediaUrls = providedMediaUrls.map(item => 
            typeof item === 'string' ? item : item.url
        );
    } else if (mediaFiles && mediaFiles.length > 0) {
        // Upload files directly (legacy path)
        const uploadPromises = mediaFiles.map(file => {
            const timestamp = Date.now();
            const fileName = `group_yap_${timestamp}_${file.name}`;
            const storageRef = storage.ref(`group-yaps/${fileName}`);
            return storageRef.put(file).then(snapshot => snapshot.ref.getDownloadURL());
        });
        mediaUrls = await Promise.all(uploadPromises);
    }
    
    // Get user data
    const userSnapshot = await database.ref(`users/${auth.currentUser.uid}`).once('value');
    const userData = userSnapshot.val();
    
    // Create yap object
    const yapId = database.ref('groupYaps').push().key;
    const yap = {
        uid: auth.currentUser.uid,
        username: userData.username,
        displayName: userData.displayName || null,
        userPhotoURL: userData.photoURL || null,
        timestamp: Date.now(),
        likes: 0,
        reyaps: 0,
        replies: 0,
        groupId: groupId
    };
    
    if (content) {
        yap.text = content;
    }
    
    if (mediaUrls.length > 0) {
        yap.media = mediaUrls;
    }
    
    // Create updates
    const updates = {};
    updates[`groupYaps/${groupId}/${yapId}`] = yap;
    updates[`yaps/${yapId}`] = { ...yap }; // Also store in main yaps for consistency
    
    await database.ref().update(updates);
    
    // Send notification to group members (except poster)
    notifyGroupMembers(groupId, auth.currentUser.uid, yapId, 'new_yap');
    
    // Post appears in group feed - no notification needed
    return yapId;
}

/**
 * Load yaps posted in a group
 * @param {string} groupId - Group ID
 * @param {number} limit - Maximum number of yaps to load
 * @returns {Promise<Array>} Array of yap objects
 */
async function loadGroupYaps(groupId, limit = 50) {
    const yapsSnapshot = await database.ref(`groupYaps/${groupId}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');
    
    if (!yapsSnapshot.exists()) {
        return [];
    }
    
    const yaps = [];
    yapsSnapshot.forEach(snapshot => {
        yaps.push({
            id: snapshot.key,
            ...snapshot.val()
        });
    });
    
    // Sort by timestamp descending (newest first)
    yaps.sort((a, b) => b.timestamp - a.timestamp);
    
    return yaps;
}

/**
 * Request to join a private group
 * @param {string} groupId - Group ID
 */
async function requestJoinGroup(groupId) {
    if (!auth.currentUser) {
        throw new Error('Must be logged in to request joining a group');
    }
    
    // Check if group exists
    const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
    if (!groupSnapshot.exists()) {
        throw new Error('Group not found');
    }
    
    const groupData = groupSnapshot.val();
    
    // If public, just join directly
    if (groupData.isPublic) {
        return joinGroup(groupId);
    }
    
    // Check if already a member
    const memberSnapshot = await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}`).once('value');
    if (memberSnapshot.exists()) {
        throw new Error('Already a member of this group');
    }
    
    // Check if request already exists
    const requestSnapshot = await database.ref(`groupJoinRequests/${groupId}/${auth.currentUser.uid}`).once('value');
    if (requestSnapshot.exists()) {
        throw new Error('Join request already pending');
    }
    
    // Get user data
    const userSnapshot = await database.ref(`users/${auth.currentUser.uid}`).once('value');
    const userData = userSnapshot.val();
    
    // Create join request
    const updates = {};
    updates[`groupJoinRequests/${groupId}/${auth.currentUser.uid}`] = {
        username: userData.username,
        displayName: userData.displayName || null,
        photoURL: userData.photoURL || null,
        requestedAt: Date.now(),
        status: 'pending'
    };
    
    await database.ref().update(updates);
    
    // Notify group admins
    notifyGroupAdmins(groupId, auth.currentUser.uid, 'join_request');
    
    showSnackbar(window.t ? window.t('success') : 'Join request sent!', 'success');
}

/**
 * Approve a join request (admin only)
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID requesting to join
 */
async function approveJoinRequest(groupId, userId) {
    if (!auth.currentUser) {
        throw new Error('Must be logged in');
    }
    
    // Check if current user is admin
    const memberSnapshot = await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}`).once('value');
    if (!memberSnapshot.exists() || memberSnapshot.val().role !== 'admin') {
        throw new Error('Only admins can approve join requests');
    }
    
    // Get group data
    const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
    const groupData = groupSnapshot.val();
    
    const updates = {};
    
    // Add user as member
    updates[`groupMembers/${groupId}/${userId}`] = {
        joinedAt: Date.now(),
        role: 'member'
    };
    updates[`userGroups/${userId}/${groupId}`] = true;
    
    // Update member count
    const currentCount = groupData.memberCount || 0;
    updates[`groups/${groupId}/memberCount`] = currentCount + 1;
    
    // Remove join request
    updates[`groupJoinRequests/${groupId}/${userId}`] = null;
    
    await database.ref().update(updates);
    
    // Notify user
    notifyUser(userId, 'join_request_approved', { groupId, groupName: groupData.name });
    
    showSnackbar('Join request approved', 'success');
}

/**
 * Reject a join request (admin only)
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID requesting to join
 */
async function rejectJoinRequest(groupId, userId) {
    if (!auth.currentUser) {
        throw new Error('Must be logged in');
    }
    
    // Check if current user is admin
    const memberSnapshot = await database.ref(`groupMembers/${groupId}/${auth.currentUser.uid}`).once('value');
    if (!memberSnapshot.exists() || memberSnapshot.val().role !== 'admin') {
        throw new Error('Only admins can reject join requests');
    }
    
    // Remove join request
    await database.ref(`groupJoinRequests/${groupId}/${userId}`).remove();
    
    showSnackbar('Join request rejected', 'success');
}

/**
 * Load pending join requests for a group (admin only)
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} Array of join request objects
 */
async function loadJoinRequests(groupId) {
    const requestsSnapshot = await database.ref(`groupJoinRequests/${groupId}`).once('value');
    
    if (!requestsSnapshot.exists()) {
        return [];
    }
    
    const requests = [];
    requestsSnapshot.forEach(snapshot => {
        requests.push({
            userId: snapshot.key,
            ...snapshot.val()
        });
    });
    
    // Sort by request date descending
    requests.sort((a, b) => b.requestedAt - a.requestedAt);
    
    return requests;
}

/**
 * Search groups by name or topic
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching groups
 */
async function searchGroups(query) {
    if (!query || query.trim().length === 0) {
        return loadPublicGroups();
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    // Load all public groups (in production, use proper search indexing)
    const allGroups = await loadPublicGroups(100);
    
    // Filter by name, topic, or description
    const results = allGroups.filter(group => {
        const name = (group.name || '').toLowerCase();
        const topic = (group.topic || '').toLowerCase();
        const description = (group.description || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               topic.includes(searchTerm) || 
               description.includes(searchTerm);
    });
    
    return results;
}

/**
 * Notify group members of new activity
 * @param {string} groupId - Group ID
 * @param {string} excludeUserId - User ID to exclude from notifications
 * @param {string} yapId - Yap ID
 * @param {string} type - Notification type
 */
async function notifyGroupMembers(groupId, excludeUserId, yapId, type) {
    try {
        const membersSnapshot = await database.ref(`groupMembers/${groupId}`).once('value');
        if (!membersSnapshot.exists()) return;
        
        const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
        const groupData = groupSnapshot.val();
        
        const updates = {};
        membersSnapshot.forEach(memberSnap => {
            const memberId = memberSnap.key;
            if (memberId !== excludeUserId) {
                const notificationId = database.ref('notifications').push().key;
                updates[`notifications/${memberId}/${notificationId}`] = {
                    type: type,
                    from: excludeUserId,
                    groupId: groupId,
                    groupName: groupData.name,
                    yapId: yapId,
                    timestamp: Date.now(),
                    read: false
                };
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
        }
    } catch (error) {
        console.error('Error notifying group members:', error);
    }
}

/**
 * Notify group admins
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID triggering notification
 * @param {string} type - Notification type
 */
async function notifyGroupAdmins(groupId, userId, type) {
    try {
        const membersSnapshot = await database.ref(`groupMembers/${groupId}`).once('value');
        if (!membersSnapshot.exists()) return;
        
        const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
        const groupData = groupSnapshot.val();
        
        const updates = {};
        membersSnapshot.forEach(memberSnap => {
            const memberId = memberSnap.key;
            const memberData = memberSnap.val();
            
            if (memberData.role === 'admin') {
                const notificationId = database.ref('notifications').push().key;
                updates[`notifications/${memberId}/${notificationId}`] = {
                    type: type,
                    from: userId,
                    groupId: groupId,
                    groupName: groupData.name,
                    timestamp: Date.now(),
                    read: false
                };
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
        }
    } catch (error) {
        console.error('Error notifying group admins:', error);
    }
}

/**
 * Notify a specific user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {Object} data - Additional notification data
 */
async function notifyUser(userId, type, data) {
    try {
        const notificationId = database.ref('notifications').push().key;
        const updates = {};
        updates[`notifications/${userId}/${notificationId}`] = {
            type: type,
            ...data,
            timestamp: Date.now(),
            read: false
        };
        
        await database.ref().update(updates);
    } catch (error) {
        console.error('Error notifying user:', error);
    }
}

// Export functions
window.createGroup = createGroup;
window.joinGroup = joinGroup;
window.leaveGroup = leaveGroup;
window.loadMyGroups = loadMyGroups;
window.loadPublicGroups = loadPublicGroups;
window.loadGroupMembers = loadGroupMembers;
window.deleteGroup = deleteGroup;
window.uploadGroupImage = uploadGroupImage;
window.postGroupYap = postGroupYap;
window.loadGroupYaps = loadGroupYaps;
window.requestJoinGroup = requestJoinGroup;
window.approveJoinRequest = approveJoinRequest;
window.rejectJoinRequest = rejectJoinRequest;
window.loadJoinRequests = loadJoinRequests;
window.searchGroups = searchGroups;
