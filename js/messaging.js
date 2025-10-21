// Direct Messaging System for Yappin'

// Helper function to generate random avatar
function generateRandomAvatar(seed) {
    const style = 'fun-emoji'; // Cute fun emojis - very friendly
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// Generate conversation ID from two user IDs (always sorted to ensure consistency)
function getConversationId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
}

// Load conversations list
function loadConversations() {
    const user = auth.currentUser;
    if (!user) return;

    const conversationsRef = database.ref(`conversations/${user.uid}`);
    
    conversationsRef.on('value', (snapshot) => {
        const conversations = snapshot.val() || {};
        displayConversations(conversations);
    });
}

// Display conversations in the Messages modal
function displayConversations(conversations) {
    const messagesModal = document.getElementById('messagesModal');
    if (!messagesModal) return;

    const modalBody = messagesModal.querySelector('.modal-body');
    if (!modalBody) return;

    // Check if there are conversations
    const conversationIds = Object.keys(conversations);
    
    if (conversationIds.length === 0) {
        modalBody.innerHTML = `
            <div class="messages-empty-state">
                <i class="fas fa-envelope messages-empty-icon"></i>
                <h3>No Messages Yet</h3>
                <p class="messages-empty-subtitle">Start a conversation with someone you follow!</p>
            </div>
        `;
        return;
    }

    // Create conversations list
    modalBody.innerHTML = `
        <div class="conversations-list" id="conversationsList"></div>
        <div class="conversation-view hidden" id="conversationView">
            <div class="conversation-header" id="conversationHeader"></div>
            <div class="conversation-messages" id="conversationMessages"></div>
            <div class="conversation-input">
                <input type="text" id="messageInput" placeholder="Type a message..." class="input-field">
                <button onclick="sendMessage()" class="btn btn-primary"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    const conversationsList = document.getElementById('conversationsList');

    // Load each conversation
    conversationIds.forEach(conversationId => {
        const conversation = conversations[conversationId];
        const otherUserId = conversation.otherUserId;

        // Load other user's data - only read accessible fields
        Promise.all([
            database.ref(`users/${otherUserId}/username`).once('value'),
            database.ref(`users/${otherUserId}/photoURL`).once('value')
        ]).then(([usernameSnap, photoSnap]) => {
            const userData = {
                username: usernameSnap.val(),
                photoURL: photoSnap.val()
            };
            const conversationItem = document.createElement('div');
            conversationItem.className = 'conversation-item';
            conversationItem.onclick = () => openConversation(conversationId, otherUserId);

            // Check if there are unread messages
            const unreadClass = conversation.unreadCount > 0 ? 'unread' : '';
            
            conversationItem.innerHTML = `
                <img src="${userData.photoURL || generateRandomAvatar(otherUserId)}" alt="${userData.username}" class="conversation-avatar">
                <div class="conversation-info">
                    <div class="conversation-name ${unreadClass}">${userData.username}</div>
                    <div class="conversation-preview">${conversation.lastMessage || 'No messages yet'}</div>
                </div>
                ${conversation.unreadCount > 0 ? `<span class="conversation-badge">${conversation.unreadCount}</span>` : ''}
            `;

            conversationsList.appendChild(conversationItem);
        }).catch(error => {
            console.error('[ERROR] Failed to load conversation:', error);
        });
    });
}

// Open a specific conversation
let currentConversationId = null;
let currentOtherUserId = null;
let messagesListener = null;

function openConversation(conversationId, otherUserId) {
    currentConversationId = conversationId;
    currentOtherUserId = otherUserId;

    // Hide conversations list, show conversation view
    const conversationsList = document.getElementById('conversationsList');
    const conversationView = document.getElementById('conversationView');
    
    if (conversationsList) conversationsList.classList.add('hidden');
    if (conversationView) conversationView.classList.remove('hidden');

    // Load other user's data for header - only read accessible fields
    Promise.all([
        database.ref(`users/${otherUserId}/username`).once('value'),
        database.ref(`users/${otherUserId}/photoURL`).once('value')
    ]).then(([usernameSnap, photoSnap]) => {
        const userData = {
            username: usernameSnap.val(),
            photoURL: photoSnap.val()
        };
        const conversationHeader = document.getElementById('conversationHeader');
        if (conversationHeader) {
            conversationHeader.innerHTML = `
                <button onclick="closeConversation()" class="btn-back"><i class="fas fa-arrow-left"></i></button>
                <img src="${userData.photoURL || generateRandomAvatar(otherUserId)}" alt="${userData.username}" class="conversation-header-avatar">
                <div class="conversation-header-name">${userData.username}</div>
            `;
        }
    });

    // Mark messages as read
    const user = auth.currentUser;
    if (user) {
        database.ref(`conversations/${user.uid}/${conversationId}/unreadCount`).set(0);
        updateMessagesBadge();
    }

    // Load messages
    loadMessages(conversationId);
}

// Close conversation and go back to list
window.closeConversation = function() {
    const conversationsList = document.getElementById('conversationsList');
    const conversationView = document.getElementById('conversationView');
    
    if (conversationsList) conversationsList.classList.remove('hidden');
    if (conversationView) conversationView.classList.add('hidden');

    // Remove listener
    if (messagesListener && currentConversationId) {
        database.ref(`messages/${currentConversationId}`).off('child_added', messagesListener);
    }

    currentConversationId = null;
    currentOtherUserId = null;
};

// Load messages for a conversation
function loadMessages(conversationId) {
    const conversationMessages = document.getElementById('conversationMessages');
    if (!conversationMessages) return;

    conversationMessages.innerHTML = '<p class="loading-text">Loading messages...</p>';

    const messagesRef = database.ref(`messages/${conversationId}`);
    
    // Remove previous listener
    if (messagesListener) {
        messagesRef.off('child_added', messagesListener);
    }

    // Load existing messages
    messagesRef.orderByChild('timestamp').once('value').then(snapshot => {
        conversationMessages.innerHTML = '';

        if (!snapshot.exists()) {
            conversationMessages.innerHTML = '<p class="no-messages">No messages yet. Say hi!</p>';
            return;
        }

        snapshot.forEach(childSnapshot => {
            const message = childSnapshot.val();
            displayMessage(message);
        });

        // Scroll to bottom
        conversationMessages.scrollTop = conversationMessages.scrollHeight;

        // Listen for new messages
        messagesListener = messagesRef.orderByChild('timestamp').startAt(Date.now()).on('child_added', (newSnapshot) => {
            const message = newSnapshot.val();
            displayMessage(message);
            conversationMessages.scrollTop = conversationMessages.scrollHeight;
        });
    }).catch(error => {
        console.error('[ERROR] Failed to load messages:', error);
        conversationMessages.innerHTML = '<p class="error-text">Failed to load messages</p>';
    });
}

// Display a single message
function displayMessage(message) {
    const conversationMessages = document.getElementById('conversationMessages');
    if (!conversationMessages) return;

    const user = auth.currentUser;
    if (!user) return;

    const isOwnMessage = message.senderId === user.uid;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwnMessage ? 'message-own' : 'message-other'}`;

    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(message.text)}</div>
        <div class="message-time">${time}</div>
    `;

    conversationMessages.appendChild(messageDiv);
}

// Send a message
window.sendMessage = function() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;

    const text = messageInput.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user || !currentConversationId || !currentOtherUserId) return;

    const messageData = {
        senderId: user.uid,
        receiverId: currentOtherUserId,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        read: false
    };

    // Save message
    const messageRef = database.ref(`messages/${currentConversationId}`).push();
    messageRef.set(messageData).then(() => {
        // Update conversation metadata for both users
        const updates = {};
        
        // Update sender's conversation
        updates[`conversations/${user.uid}/${currentConversationId}/lastMessage`] = text;
        updates[`conversations/${user.uid}/${currentConversationId}/lastMessageTime`] = firebase.database.ServerValue.TIMESTAMP;
        updates[`conversations/${user.uid}/${currentConversationId}/otherUserId`] = currentOtherUserId;

        // Update receiver's conversation
        updates[`conversations/${currentOtherUserId}/${currentConversationId}/lastMessage`] = text;
        updates[`conversations/${currentOtherUserId}/${currentConversationId}/lastMessageTime`] = firebase.database.ServerValue.TIMESTAMP;
        updates[`conversations/${currentOtherUserId}/${currentConversationId}/otherUserId`] = user.uid;
        updates[`conversations/${currentOtherUserId}/${currentConversationId}/unreadCount`] = firebase.database.ServerValue.increment(1);

        // Create notification for receiver
        updates[`notifications/${currentOtherUserId}/${messageRef.key}`] = {
            type: 'message',
            from: user.uid,
            fromUsername: user.displayName || 'Someone',
            message: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        return database.ref().update(updates);
    }).then(() => {
        messageInput.value = '';
        updateMessagesBadge();
    }).catch(error => {
        console.error('[ERROR] Failed to send message:', error);
        showSnackbar('Failed to send message', 'error');
    });
};

// Handle Enter key to send message
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// Start a new conversation with a user (called from profile/search)
window.startConversation = function(otherUserId) {
    const user = auth.currentUser;
    if (!user) {
        showSnackbar('Please sign in to send messages', 'error');
        return;
    }

    // Check if users follow each other
    Promise.all([
        database.ref(`following/${user.uid}/${otherUserId}`).once('value'),
        database.ref(`following/${otherUserId}/${user.uid}`).once('value')
    ]).then(([iFollowThem, theyFollowMe]) => {
        if (!iFollowThem.exists() || !theyFollowMe.exists()) {
            showSnackbar('You can only message users who follow each other', 'error');
            return;
        }

        // Create conversation ID
        const conversationId = getConversationId(user.uid, otherUserId);

        // Open messages modal and start conversation
        showMessages();
        setTimeout(() => {
            openConversation(conversationId, otherUserId);
        }, 100);
    }).catch(error => {
        console.error('[ERROR] Failed to check follow status:', error);
        showSnackbar('Failed to start conversation', 'error');
    });
};

// Update messages badge with unread count
function updateMessagesBadge() {
    const user = auth.currentUser;
    if (!user) return;

    database.ref(`conversations/${user.uid}`).once('value').then(snapshot => {
        let totalUnread = 0;

        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const conversation = childSnapshot.val();
                totalUnread += conversation.unreadCount || 0;
            });
        }

        const messagesBadge = document.getElementById('messagesBadge');
        if (messagesBadge) {
            if (totalUnread > 0) {
                messagesBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                messagesBadge.classList.remove('hidden');
            } else {
                messagesBadge.classList.add('hidden');
            }
        }
    }).catch(error => {
        console.error('[ERROR] Failed to update messages badge:', error);
    });
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize messaging when user is authenticated
auth.onAuthStateChanged((user) => {
    if (user) {
        updateMessagesBadge();
        
        // Listen for new messages to update badge
        database.ref(`conversations/${user.uid}`).on('value', () => {
            updateMessagesBadge();
        });
    }
});
