// Notification System for Yappin'

// Helper function to generate random avatar
function generateRandomAvatar(seed) {
    const style = 'fun-emoji'; // Cute fun emojis - very friendly
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// Load notifications for current user
function loadNotifications() {
    const user = auth.currentUser;
    if (!user) return;

    const notificationsRef = database.ref(`notifications/${user.uid}`);
    
    notificationsRef.on('value', (snapshot) => {
        const notifications = snapshot.val() || {};
        displayNotifications(notifications);
        updateNotificationsBadge(notifications);
    });
}

// Display notifications (called when clicking the notifications icon)
function displayNotifications(notifications) {
    // This will be implemented when we create a notifications modal/dropdown

}

// Update notifications badge count
function updateNotificationsBadge(notifications) {
    const notificationIds = Object.keys(notifications);
    const unreadCount = notificationIds.filter(id => !notifications[id].read).length;

    // Update badge on sidebar (desktop)
    const sidebarBadge = document.querySelector('.sidebar .fa-bell').parentElement.querySelector('.badge');
    if (sidebarBadge) {
        if (unreadCount > 0) {
            sidebarBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            sidebarBadge.style.display = 'inline-block';
        } else {
            sidebarBadge.style.display = 'none';
        }
    }

    // Update badge on mobile nav
    const mobileBadge = document.querySelector('.mobile-nav .fa-bell').parentElement.querySelector('.badge');
    if (mobileBadge) {
        if (unreadCount > 0) {
            mobileBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            mobileBadge.style.display = 'inline-block';
        } else {
            mobileBadge.style.display = 'none';
        }
    }
}

// Create notification for a new like
function notifyLike(yapId, yapAuthorId, likerId) {
    if (yapAuthorId === likerId) return; // Don't notify yourself

    database.ref(`users/${likerId}`).once('value').then(snapshot => {
        if (!snapshot.exists()) return;

        const likerData = snapshot.val();
        const notificationData = {
            type: 'like',
            from: likerId,
            fromUsername: likerData.username,
            fromPhotoURL: likerData.photoURL || generateRandomAvatar(likerId),
            yapId: yapId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        database.ref(`notifications/${yapAuthorId}`).push(notificationData);
    }).catch(error => {
        console.error('[ERROR] Failed to create like notification:', error);
    });
}

// Create notification for a new reyap
function notifyReyap(yapId, yapAuthorId, reyapperId) {
    if (yapAuthorId === reyapperId) return; // Don't notify yourself

    database.ref(`users/${reyapperId}`).once('value').then(snapshot => {
        if (!snapshot.exists()) return;

        const reyapperData = snapshot.val();
        const notificationData = {
            type: 'reyap',
            from: reyapperId,
            fromUsername: reyapperData.username,
            fromPhotoURL: reyapperData.photoURL || generateRandomAvatar(reyapperId),
            yapId: yapId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        database.ref(`notifications/${yapAuthorId}`).push(notificationData);
    }).catch(error => {
        console.error('[ERROR] Failed to create reyap notification:', error);
    });
}

// Create notification for a reply to a yap
function notifyReply(yapId, yapAuthorId, replierId, replyText) {
    if (yapAuthorId === replierId) return; // Don't notify yourself

    database.ref(`users/${replierId}`).once('value').then(snapshot => {
        if (!snapshot.exists()) return;

        const replierData = snapshot.val();
        const notificationData = {
            type: 'reply',
            from: replierId,
            fromUsername: replierData.username,
            fromPhotoURL: replierData.photoURL || generateRandomAvatar(replierId),
            yapId: yapId,
            replyText: replyText.substring(0, 100), // First 100 chars
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        database.ref(`notifications/${yapAuthorId}`).push(notificationData);
    }).catch(error => {
        console.error('[ERROR] Failed to create reply notification:', error);
    });
}

// Create notification for a mention
function notifyMention(yapId, mentionedUserId, mentionerId, yapText) {
    if (mentionedUserId === mentionerId) return; // Don't notify yourself

    database.ref(`users/${mentionerId}`).once('value').then(snapshot => {
        if (!snapshot.exists()) return;

        const mentionerData = snapshot.val();
        const notificationData = {
            type: 'mention',
            from: mentionerId,
            fromUsername: mentionerData.username,
            fromPhotoURL: mentionerData.photoURL || generateRandomAvatar(mentionerId),
            yapId: yapId,
            yapText: yapText.substring(0, 100), // First 100 chars
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        database.ref(`notifications/${mentionedUserId}`).push(notificationData);
    }).catch(error => {
        console.error('[ERROR] Failed to create mention notification:', error);
    });
}

// Create notification for a new follower
function notifyFollow(followedUserId, followerId) {
    if (followedUserId === followerId) return;

    database.ref(`users/${followerId}`).once('value').then(snapshot => {
        if (!snapshot.exists()) return;

        const followerData = snapshot.val();
        const notificationData = {
            type: 'follow',
            from: followerId,
            fromUsername: followerData.username,
            fromPhotoURL: followerData.photoURL || generateRandomAvatar(followerId),
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        database.ref(`notifications/${followedUserId}`).push(notificationData);
    }).catch(error => {
        console.error('[ERROR] Failed to create follow notification:', error);
    });
}

// Extract mentions from yap text
function extractMentions(text) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]); // Username without @
    }

    return [...new Set(mentions)]; // Remove duplicates
}

// Process mentions and create notifications
function processMentionsAndNotify(yapId, yapText, yapAuthorId) {
    const mentions = extractMentions(yapText);
    
    if (mentions.length === 0) return;

    // Look up usernames and create notifications
    mentions.forEach(username => {
        database.ref(`usernames/${username.toLowerCase()}`).once('value').then(snapshot => {
            if (!snapshot.exists()) return;

            const mentionedUserId = snapshot.val();
            notifyMention(yapId, mentionedUserId, yapAuthorId, yapText);
        }).catch(error => {
            console.error('[ERROR] Failed to process mention:', error);
        });
    });
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    const user = auth.currentUser;
    if (!user) return;

    database.ref(`notifications/${user.uid}/${notificationId}/read`).set(true);
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    const user = auth.currentUser;
    if (!user) return;

    database.ref(`notifications/${user.uid}`).once('value').then(snapshot => {
        if (!snapshot.exists()) return;

        const updates = {};
        snapshot.forEach(childSnapshot => {
            updates[`notifications/${user.uid}/${childSnapshot.key}/read`] = true;
        });

        return database.ref().update(updates);
    }).catch(error => {
        console.error('[ERROR] Failed to mark all notifications as read:', error);
    });
}

// Initialize notifications when user is authenticated
auth.onAuthStateChanged((user) => {
    if (user) {
        loadNotifications();
    }
});

// Export functions for use in other modules
window.notifyLike = notifyLike;
window.notifyReyap = notifyReyap;
window.notifyReply = notifyReply;
window.notifyMention = notifyMention;
window.notifyFollow = notifyFollow;
window.processMentionsAndNotify = processMentionsAndNotify;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
