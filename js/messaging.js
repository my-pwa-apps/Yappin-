// Direct Messaging System for Yappin'
// Performance utilities accessed via window.PerformanceUtils

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
    console.log('[DM] displayConversations called with:', conversations);
    
    const messagesModal = document.getElementById('messagesModal');
    if (!messagesModal) {
        console.log('[DM] messagesModal not found');
        return;
    }

    const modalBody = messagesModal.querySelector('.modal-body');
    if (!modalBody) {
        console.log('[DM] modal-body not found');
        return;
    }

    // Check if we're currently in an active conversation - don't reset the view
    const conversationView = document.getElementById('conversationView');
    if (conversationView && !conversationView.classList.contains('hidden')) {
        // We're in an active conversation, just update the conversations list without destroying the view
        let conversationsList = document.getElementById('conversationsList');
        if (conversationsList) {
            conversationsList.innerHTML = ''; // Clear and update the list
            updateConversationsList(conversationsList, conversations);
        }
        return;
    }

    // Check if there are conversations
    const conversationIds = Object.keys(conversations);
    console.log('[DM] conversationIds:', conversationIds);
    
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
            <div id="dmImagePreviewContainer" class="image-preview-container hidden"></div>
            <div class="conversation-input-wrapper">
                <div class="conversation-input-actions">
                    <input type="file" id="dmImageInput" accept="image/*" multiple class="hidden-input">
                    <button class="icon-btn" id="dmAttachImageBtn" aria-label="Attach image" title="Attach image"><i class="far fa-image"></i></button>
                    <button class="icon-btn" id="dmGifBtn" aria-label="Add GIF" title="Add GIF"><span class="gif-text">GIF</span></button>
                    <button class="icon-btn" id="dmStickerBtn" aria-label="Add sticker" title="Add sticker"><i class="fas fa-note-sticky"></i></button>
                    <button class="icon-btn" id="dmEmojiBtn" aria-label="Add emoji" title="Add emoji"><i class="far fa-smile"></i></button>
                </div>
                <div class="conversation-input">
                    <input type="text" id="messageInput" placeholder="Type a message..." class="input-field">
                    <button onclick="sendMessage()" class="btn btn-primary"><i class="fas fa-paper-plane"></i></button>
                </div>
                
                <!-- DM GIF Picker -->
                <div id="dmGifPicker" class="gif-picker hidden">
                    <div class="gif-picker-header">
                        <input type="text" id="dmGifSearch" placeholder="Search GIFs..." class="input-field">
                        <button class="close-btn" onclick="closeDmGifPicker()" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="dmGifResults" class="gif-results"></div>
                </div>
                
                <!-- DM Sticker Picker -->
                <div id="dmStickerPicker" class="sticker-picker hidden">
                    <div class="sticker-picker-header">
                        <h3>Stickers</h3>
                        <button class="close-btn" onclick="closeDmStickerPicker()" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="dmStickerGrid" class="sticker-grid"></div>
                </div>
            </div>
        </div>
    `;

    const conversationsList = document.getElementById('conversationsList');
    updateConversationsList(conversationsList, conversations);
    
    // Media buttons will be set up when a conversation is opened
    // See setupDmMediaButtons() in openConversation()
}

// Helper function to update conversations list
function updateConversationsList(conversationsList, conversations) {
    if (!conversationsList) return;
    
    const conversationIds = Object.keys(conversations);

    // Load each conversation
    conversationIds.forEach(conversationId => {
        const conversation = conversations[conversationId];
        const otherUserId = conversation.otherUserId;

        // Load other user's data - only read accessible fields
        Promise.all([
            database.ref(`users/${otherUserId}/username`).once('value'),
            database.ref(`users/${otherUserId}/displayName`).once('value'),
            database.ref(`users/${otherUserId}/photoURL`).once('value')
        ]).then(([usernameSnap, displayNameSnap, photoSnap]) => {
            const userData = {
                username: usernameSnap.val(),
                displayName: displayNameSnap.val(),
                photoURL: photoSnap.val()
            };
            const displayText = userData.displayName || `@${userData.username}`;
            const conversationItem = document.createElement('div');
            conversationItem.className = 'conversation-item';
            conversationItem.onclick = () => openConversation(conversationId, otherUserId);

            // Check if there are unread messages
            const unreadClass = conversation.unreadCount > 0 ? 'unread' : '';
            
            conversationItem.innerHTML = `
                <img src="${userData.photoURL || generateRandomAvatar(otherUserId)}" alt="${displayText}" class="conversation-avatar">
                <div class="conversation-info">
                    <div class="conversation-name ${unreadClass}">${displayText}</div>
                    <div class="conversation-preview">${conversation.lastMessage || 'No messages yet'}</div>
                </div>
                ${conversation.unreadCount > 0 ? `<span class="conversation-badge">${conversation.unreadCount}</span>` : ''}
            `;

            conversationsList.appendChild(conversationItem);
        }).catch(error => {
            (window.PerformanceUtils?.Logger || console).error('[ERROR] Failed to load conversation:', error);
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
        database.ref(`users/${otherUserId}/displayName`).once('value'),
        database.ref(`users/${otherUserId}/photoURL`).once('value')
    ]).then(([usernameSnap, displayNameSnap, photoSnap]) => {
        const userData = {
            username: usernameSnap.val(),
            displayName: displayNameSnap.val(),
            photoURL: photoSnap.val()
        };
        const displayText = userData.displayName || `@${userData.username}`;
        const conversationHeader = document.getElementById('conversationHeader');
        if (conversationHeader) {
            conversationHeader.innerHTML = `
                <button onclick="closeConversation()" class="btn-back"><i class="fas fa-arrow-left"></i></button>
                <img src="${userData.photoURL || generateRandomAvatar(otherUserId)}" alt="${displayText}" class="conversation-header-avatar">
                <div class="conversation-header-info">
                    <div class="conversation-header-name">${displayText}</div>
                    ${userData.displayName ? `<div class="conversation-header-username">@${userData.username}</div>` : ''}
                </div>
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
    
    // Re-attach event listeners for media buttons (they're recreated in the conversation view)
    setTimeout(() => {
        setupDmMediaButtons();
    }, 100);
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
        (window.PerformanceUtils?.Logger || console).error('[ERROR] Failed to load messages:', error);
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

    let contentHTML = '';
    
    // Add text if present
    if (message.text) {
        contentHTML += `<div class="message-content">${escapeHtml(message.text)}</div>`;
    }
    
    // Add media if present
    if (message.media && message.media.length > 0) {
        contentHTML += `<div class="message-media">`;
        message.media.forEach(mediaItem => {
            if (typeof mediaItem === 'string') {
                // Old format - just URL
                contentHTML += `<img src="${mediaItem}" alt="Media" class="message-image" loading="lazy">`;
            } else if (mediaItem.type === 'gif') {
                contentHTML += `<img src="${mediaItem.url}" alt="GIF" class="message-gif" loading="lazy">`;
            } else {
                contentHTML += `<img src="${mediaItem.url}" alt="Image" class="message-image" loading="lazy">`;
            }
        });
        contentHTML += `</div>`;
    }
    
    contentHTML += `<div class="message-time">${time}</div>`;

    messageDiv.innerHTML = contentHTML;
    conversationMessages.appendChild(messageDiv);
}

// Send a message
window.sendMessage = function() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;

    const text = messageInput.value.trim();
    
    // Check for attachments using shared media.js function
    const mediaAttachments = window.getMediaAttachments ? window.getMediaAttachments() : [];
    const hasAttachments = mediaAttachments.length > 0;
    
    if (!text && !hasAttachments) return;

    const user = auth.currentUser;
    if (!user || !currentConversationId || !currentOtherUserId) return;

    // Handle media uploads first if any - use shared media.js functions
    let mediaPromise = Promise.resolve([]);
    if (hasAttachments && window.uploadMediaFiles) {
        mediaPromise = window.uploadMediaFiles(mediaAttachments);
    }

    mediaPromise.then(mediaUrls => {
        const messageData = {
            senderId: user.uid,
            receiverId: currentOtherUserId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };
        
        // Add text if present
        if (text) {
            messageData.text = text;
        }
        
        // Add media if present
        if (mediaUrls && mediaUrls.length > 0) {
            messageData.media = mediaUrls;
        }

        // Save message
        const messageRef = database.ref(`messages/${currentConversationId}`).push();
        return messageRef.set(messageData).then(() => {
            return { messageRef, messageData };
        });
    }).then(({ messageRef, messageData }) => {
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
        // Clear input and attachments immediately - use shared function
        messageInput.value = '';
        if (window.clearImages) window.clearImages();
        
        // Clear file input
        const dmImageInput = document.getElementById('dmImageInput');
        if (dmImageInput) dmImageInput.value = '';
        
        // Optionally display own message immediately (will also come via listener)
        const tempMessage = {
            senderId: user.uid,
            text: text,
            timestamp: Date.now()
        };
        displayMessage(tempMessage);
        
        // Scroll to bottom
        const conversationMessages = document.getElementById('conversationMessages');
        if (conversationMessages) {
            conversationMessages.scrollTop = conversationMessages.scrollHeight;
        }
        
        // Update badge for the sender
        updateMessagesBadge();
        
        // Focus back on input for quick reply
        messageInput.focus();
    }).catch(error => {
        (window.PerformanceUtils?.Logger || console).error('Failed to send message:', error);
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

// Start a new conversation with a user (called from profile/search/timeline)
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
        
        // Open modal without loading conversations list
        const messagesModal = document.getElementById('messagesModal');
        if (!messagesModal) {
            showSnackbar('Messages modal not found', 'error');
            return;
        }
        
        toggleModal(messagesModal, true);
        
        // Wait for modal animation, then set up conversation view
        setTimeout(() => {
            const modalBody = messagesModal.querySelector('.modal-body');
            
            if (!modalBody) {
                showSnackbar('Unable to open messages', 'error');
                return;
            }
            
            // Always recreate the conversation view structure to ensure it's clean
            modalBody.innerHTML = `
                <div class="conversations-list hidden" id="conversationsList"></div>
                <div class="conversation-view" id="conversationView">
                    <div class="conversation-header" id="conversationHeader"></div>
                    <div class="conversation-messages" id="conversationMessages"></div>
                    <div id="dmImagePreviewContainer" class="image-preview-container hidden"></div>
                    <div class="conversation-input-wrapper">
                        <div class="conversation-input-actions">
                            <input type="file" id="dmImageInput" accept="image/*" multiple class="hidden-input">
                            <button class="icon-btn" id="dmAttachImageBtn" aria-label="Attach image" title="Attach image"><i class="far fa-image"></i></button>
                            <button class="icon-btn" id="dmGifBtn" aria-label="Add GIF" title="Add GIF"><span class="gif-text">GIF</span></button>
                            <button class="icon-btn" id="dmStickerBtn" aria-label="Add sticker" title="Add sticker"><i class="fas fa-note-sticky"></i></button>
                            <button class="icon-btn" id="dmEmojiBtn" aria-label="Add emoji" title="Add emoji"><i class="far fa-smile"></i></button>
                        </div>
                        <div class="conversation-input">
                            <input type="text" id="messageInput" placeholder="Type a message..." class="input-field">
                            <button onclick="sendMessage()" class="btn btn-primary"><i class="fas fa-paper-plane"></i></button>
                        </div>
                        
                        <!-- DM GIF Picker -->
                        <div id="dmGifPicker" class="gif-picker hidden">
                            <div class="gif-picker-header">
                                <input type="text" id="dmGifSearch" placeholder="Search GIFs..." class="input-field">
                                <button class="close-btn" onclick="closeDmGifPicker()" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>
                            </div>
                            <div id="dmGifResults" class="gif-results"></div>
                        </div>
                        
                        <!-- DM Sticker Picker -->
                        <div id="dmStickerPicker" class="sticker-picker hidden">
                            <div class="sticker-picker-header">
                                <h3>Stickers</h3>
                                <button class="close-btn" onclick="closeDmStickerPicker()" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>
                            </div>
                            <div id="dmStickerGrid" class="sticker-grid"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Open the conversation
            openConversation(conversationId, otherUserId);
        }, 200);
    }).catch(error => {
        (window.PerformanceUtils?.Logger || console).error('Failed to start conversation:', error);
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
        (window.PerformanceUtils?.Logger || console).error('[ERROR] Failed to update messages badge:', error);
    });
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Request notification permission for OS notifications
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Show OS notification for new message (only when app is in background)
function showMessageNotification(fromUsername, messageText) {
    // Only show if user is not currently in the conversation
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`New message from @${fromUsername}`, {
            body: messageText,
            icon: './images/icons/icon-192x192.png',
            badge: './images/icons/icon-192x192.png',
            tag: 'yappin-message',
            requireInteraction: false
        });

        notification.onclick = function() {
            window.focus();
            this.close();
        };
    }
}

// Initialize messaging when user is authenticated
auth.onAuthStateChanged((user) => {
    if (user) {
        updateMessagesBadge();
        
        // Request notification permission on first login
        requestNotificationPermission();
        
        // Set up real-time listener for new messages to update badge and show notifications
        database.ref(`conversations/${user.uid}`).on('value', () => {
            updateMessagesBadge();
        });
        
        // Listen for new messages across all conversations for OS notifications
        database.ref(`conversations/${user.uid}`).on('child_changed', (snapshot) => {
            const conversation = snapshot.val();
            if (conversation && conversation.unreadCount > 0 && conversation.lastMessage) {
                // Show OS notification only if app is in background
                database.ref(`users/${conversation.otherUserId}/username`).once('value').then(usernameSnap => {
                    const username = usernameSnap.val() || 'Someone';
                    showMessageNotification(username, conversation.lastMessage);
                });
            }
        });
    }
});

// ========================================
// DM ATTACHMENTS - NOW USING SHARED MEDIA.JS FUNCTIONS
// ========================================

// DM Image Attachments - Media buttons are set up when a conversation is opened
// See setupDmMediaButtons() called in openConversation()

// Function to setup all DM media buttons - now using shared media.js
function setupDmMediaButtons() {
    const messageInput = document.getElementById('messageInput');
    console.log('[DM] Setting up media buttons, messageInput:', messageInput);
    
    // Helper to set active textarea for DMs
    const setDmActive = () => {
        console.log('[DM] Setting active input:', messageInput);
        if (window.setActiveTextarea && messageInput) {
            window.setActiveTextarea(messageInput);
        }
    };
    
    // Setup GIF button - use shared function
    const dmGifBtn = document.getElementById('dmGifBtn');
    console.log('[DM] Setting up GIF button:', dmGifBtn, 'toggleGifPicker:', window.toggleGifPicker);
    if (dmGifBtn && window.toggleGifPicker) {
        dmGifBtn.replaceWith(dmGifBtn.cloneNode(true));
        const newDmGifBtn = document.getElementById('dmGifBtn');
        if (newDmGifBtn) {
            newDmGifBtn.addEventListener('click', () => {
                console.log('[DM] GIF button clicked');
                setDmActive();
                window.toggleGifPicker();
            });
        }
    }
    
    // Setup Sticker button - use shared function
    const dmStickerBtn = document.getElementById('dmStickerBtn');
    console.log('[DM] Setting up Sticker button:', dmStickerBtn);
    if (dmStickerBtn && window.toggleStickerPicker) {
        dmStickerBtn.replaceWith(dmStickerBtn.cloneNode(true));
        const newDmStickerBtn = document.getElementById('dmStickerBtn');
        if (newDmStickerBtn) {
            newDmStickerBtn.addEventListener('click', () => {
                console.log('[DM] Sticker button clicked');
                setDmActive();
                window.toggleStickerPicker();
            });
        }
    }
    
    // Setup Emoji button - use shared function
    const dmEmojiBtn = document.getElementById('dmEmojiBtn');
    console.log('[DM] Setting up Emoji button:', dmEmojiBtn);
    if (dmEmojiBtn && window.toggleEmojiPicker) {
        dmEmojiBtn.replaceWith(dmEmojiBtn.cloneNode(true));
        const newDmEmojiBtn = document.getElementById('dmEmojiBtn');
        if (newDmEmojiBtn) {
            newDmEmojiBtn.addEventListener('click', () => {
                console.log('[DM] Emoji button clicked');
                setDmActive();
                window.toggleEmojiPicker();
            });
        }
    }
    
    // Setup Attachment button - use shared function
    const dmAttachImageBtn = document.getElementById('dmAttachImageBtn');
    const dmImageInput = document.getElementById('dmImageInput');
    
    if (dmAttachImageBtn && dmImageInput && window.handleImageSelect) {
        dmAttachImageBtn.replaceWith(dmAttachImageBtn.cloneNode(true));
        const newDmAttachImageBtn = document.getElementById('dmAttachImageBtn');
        if (newDmAttachImageBtn) {
            newDmAttachImageBtn.addEventListener('click', () => {
                setDmActive();
                dmImageInput.click();
            });
        }
        
        // Re-attach change listener to image input - use shared function
        dmImageInput.replaceWith(dmImageInput.cloneNode(true));
        const newDmImageInput = document.getElementById('dmImageInput');
        if (newDmImageInput) {
            newDmImageInput.addEventListener('change', (e) => {
                setDmActive();
                window.handleImageSelect(e);
            });
        }
    }
}
