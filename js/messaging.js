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
    const messagesModal = document.getElementById('messagesModal');
    if (!messagesModal) return;

    const modalBody = messagesModal.querySelector('.modal-body');
    if (!modalBody) return;

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
                    <button class="icon-btn" id="dmGifBtn" aria-label="Add GIF" title="Add GIF"><i class="fas fa-file-image"></i></button>
                    <button class="icon-btn" id="dmStickerBtn" aria-label="Add sticker" title="Add sticker"><i class="far fa-grin-squint"></i></button>
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
    const hasAttachments = dmSelectedImages.length > 0 || dmSelectedGifUrl;
    
    if (!text && !hasAttachments) return;

    const user = auth.currentUser;
    if (!user || !currentConversationId || !currentOtherUserId) return;

    // Handle media uploads first if any
    let mediaPromise = Promise.resolve([]);
    if (hasAttachments) {
        const mediaItems = [];
        
        // Add images
        dmSelectedImages.forEach(img => {
            mediaItems.push({ type: 'image', file: img.file });
        });
        
        // Add GIF
        if (dmSelectedGifUrl) {
            mediaItems.push({ type: 'gif', url: dmSelectedGifUrl });
        }
        
        mediaPromise = uploadDmMediaFiles(mediaItems);
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
        // Clear input and attachments immediately
        messageInput.value = '';
        dmSelectedImages = [];
        dmSelectedGifUrl = null;
        renderDmImagePreviews();
        
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
                            <button class="icon-btn" id="dmGifBtn" aria-label="Add GIF" title="Add GIF"><i class="fas fa-file-image"></i></button>
                            <button class="icon-btn" id="dmStickerBtn" aria-label="Add sticker" title="Add sticker"><i class="far fa-grin-squint"></i></button>
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
// DM ATTACHMENTS - IMAGES, GIFS, STICKERS, EMOJIS
// ========================================

let dmSelectedImages = [];
let dmSelectedGifUrl = null;
let dmEmojiPickerElement = null;

// DM Image Attachments
document.addEventListener('DOMContentLoaded', () => {
    // Setup after a small delay to ensure modal is loaded
    setTimeout(() => {
        setupDmAttachments();
    }, 500);
});

// Function to setup all DM media buttons (can be called multiple times)
function setupDmMediaButtons() {
    // Setup GIF button
    const dmGifBtn = document.getElementById('dmGifBtn');
    if (dmGifBtn) {
        // Remove old listener if exists
        dmGifBtn.replaceWith(dmGifBtn.cloneNode(true));
        const newDmGifBtn = document.getElementById('dmGifBtn');
        if (newDmGifBtn) {
            newDmGifBtn.addEventListener('click', toggleDmGifPicker);
        }
    }
    
    // Setup Sticker button
    const dmStickerBtn = document.getElementById('dmStickerBtn');
    if (dmStickerBtn) {
        dmStickerBtn.replaceWith(dmStickerBtn.cloneNode(true));
        const newDmStickerBtn = document.getElementById('dmStickerBtn');
        if (newDmStickerBtn) {
            newDmStickerBtn.addEventListener('click', toggleDmStickerPicker);
        }
    }
    
    // Setup Emoji button
    const dmEmojiBtn = document.getElementById('dmEmojiBtn');
    if (dmEmojiBtn) {
        dmEmojiBtn.replaceWith(dmEmojiBtn.cloneNode(true));
        const newDmEmojiBtn = document.getElementById('dmEmojiBtn');
        if (newDmEmojiBtn) {
            newDmEmojiBtn.addEventListener('click', toggleDmEmojiPicker);
        }
    }
    
    // Setup Attachment button
    const dmAttachImageBtn = document.getElementById('dmAttachImageBtn');
    const dmImageInput = document.getElementById('dmImageInput');
    
    if (dmAttachImageBtn && dmImageInput) {
        dmAttachImageBtn.replaceWith(dmAttachImageBtn.cloneNode(true));
        const newDmAttachImageBtn = document.getElementById('dmAttachImageBtn');
        if (newDmAttachImageBtn) {
            newDmAttachImageBtn.addEventListener('click', () => {
                dmImageInput.click();
            });
        }
        
        // Re-attach change listener to image input
        dmImageInput.replaceWith(dmImageInput.cloneNode(true));
        const newDmImageInput = document.getElementById('dmImageInput');
        if (newDmImageInput) {
            newDmImageInput.addEventListener('change', handleDmImageSelect);
        }
    }
}

function setupDmAttachments() {
    setupDmMediaButtons();
    
    // Setup GIF search (this persists in the modal, so only setup once)
    const dmGifSearch = document.getElementById('dmGifSearch');
    if (dmGifSearch && !dmGifSearch.hasAttribute('data-listener-attached')) {
        dmGifSearch.setAttribute('data-listener-attached', 'true');
        let searchTimeout;
        dmGifSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                loadDmTrendingGifs();
                return;
            }
            
            searchTimeout = setTimeout(() => {
                searchDmGifs(query);
            }, 500);
        });
    }
}

function handleDmImageSelect(e) {
    console.log('[DM] Image select triggered', e.target.files);
    
    if (!e.target.files || e.target.files.length === 0) {
        console.log('[DM] No files selected');
        return;
    }
    
    const files = Array.from(e.target.files);
    console.log('[DM] Files to process:', files.length);
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            console.log('[DM] Adding image:', file.name);
            dmSelectedImages.push({ file });
        }
    });
    
    console.log('[DM] Total selected images:', dmSelectedImages.length);
    renderDmImagePreviews();
}

function renderDmImagePreviews() {
    const container = document.getElementById('dmImagePreviewContainer');
    if (!container) {
        console.log('[DM] Preview container not found');
        return;
    }
    
    console.log('[DM] Rendering previews for', dmSelectedImages.length, 'images');
    
    if (dmSelectedImages.length === 0 && !dmSelectedGifUrl) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.innerHTML = '';
    
    // Show regular images
    dmSelectedImages.forEach((img, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button class="remove-image" onclick="removeDmImage(${index})" aria-label="Remove image">×</button>
            `;
            console.log('[DM] Preview rendered for image', index);
        };
        reader.onerror = (error) => {
            console.error('[DM] Error reading file:', error);
        };
        reader.readAsDataURL(img.file);
        
        container.appendChild(preview);
    });
    
    // Show GIF if selected
    if (dmSelectedGifUrl) {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${dmSelectedGifUrl}" alt="Selected GIF">
            <button class="remove-image" onclick="removeDmGif()" aria-label="Remove GIF">×</button>
        `;
        container.appendChild(preview);
    }
}

window.removeDmImage = function(index) {
    dmSelectedImages.splice(index, 1);
    renderDmImagePreviews();
};

window.removeDmGif = function() {
    dmSelectedGifUrl = null;
    renderDmImagePreviews();
};

// DM GIF Picker
function toggleDmGifPicker() {
    const picker = document.getElementById('dmGifPicker');
    if (!picker) return;
    
    const isHidden = picker.classList.contains('hidden');
    
    // Close other pickers
    closeDmStickerPicker();
    if (dmEmojiPickerElement) dmEmojiPickerElement.classList.add('hidden');
    
    if (isHidden) {
        picker.classList.remove('hidden');
        loadDmTrendingGifs();
        const search = document.getElementById('dmGifSearch');
        if (search) search.focus();
    } else {
        picker.classList.add('hidden');
    }
}

window.closeDmGifPicker = function() {
    const picker = document.getElementById('dmGifPicker');
    if (picker) picker.classList.add('hidden');
};

function loadDmTrendingGifs() {
    const results = document.getElementById('dmGifResults');
    if (!results) return;
    
    results.innerHTML = '<div class="loading-text">Loading trending GIFs...</div>';
    
    const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
    const TENOR_API_URL = 'https://tenor.googleapis.com/v2';
    
    fetch(`${TENOR_API_URL}/featured?key=${TENOR_API_KEY}&client_key=yappin&limit=20`)
        .then(response => response.json())
        .then(data => {
            displayDmGifs(data.results);
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Failed to load GIFs:', error);
            results.innerHTML = '<div class="error-text">Failed to load GIFs</div>';
        });
}

function searchDmGifs(query) {
    const results = document.getElementById('dmGifResults');
    if (!query || !results) return;
    
    results.innerHTML = '<div class="loading-text">Searching...</div>';
    
    const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
    const TENOR_API_URL = 'https://tenor.googleapis.com/v2';
    
    fetch(`${TENOR_API_URL}/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=yappin&limit=20`)
        .then(response => response.json())
        .then(data => {
            displayDmGifs(data.results);
        })
        .catch(error => {
            (window.PerformanceUtils?.Logger || console).error('Failed to search GIFs:', error);
            results.innerHTML = '<div class="error-text">Search failed</div>';
        });
}

function displayDmGifs(gifs) {
    const results = document.getElementById('dmGifResults');
    if (!results) return;
    
    if (!gifs || gifs.length === 0) {
        results.innerHTML = '<div class="no-results">No GIFs found</div>';
        return;
    }
    
    results.innerHTML = '';
    
    gifs.forEach(gif => {
        const gifElement = document.createElement('div');
        gifElement.className = 'gif-item';
        
        const img = document.createElement('img');
        img.src = gif.media_formats.tinygif.url;
        img.alt = gif.content_description || 'GIF';
        img.loading = 'lazy';
        
        gifElement.appendChild(img);
        
        gifElement.addEventListener('click', () => {
            selectDmGif(gif.media_formats.gif.url);
        });
        
        results.appendChild(gifElement);
    });
}

function selectDmGif(gifUrl) {
    dmSelectedGifUrl = gifUrl;
    renderDmImagePreviews();
    closeDmGifPicker();
    showSnackbar('GIF added!', 'success');
}

// DM Sticker Picker
function toggleDmStickerPicker() {
    const picker = document.getElementById('dmStickerPicker');
    if (!picker) return;
    
    const isHidden = picker.classList.contains('hidden');
    
    // Close other pickers
    closeDmGifPicker();
    if (dmEmojiPickerElement) dmEmojiPickerElement.classList.add('hidden');
    
    if (isHidden) {
        picker.classList.remove('hidden');
        loadDmStickers();
    } else {
        picker.classList.add('hidden');
    }
}

window.closeDmStickerPicker = function() {
    const picker = document.getElementById('dmStickerPicker');
    if (picker) picker.classList.add('hidden');
};

function loadDmStickers() {
    const grid = document.getElementById('dmStickerGrid');
    if (!grid) return;
    
    const stickers = [
        '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🌟', '⭐',
        '✨', '💫', '💥', '💢', '💦', '💨', '🔥', '⚡',
        '🌈', '☀️', '🌙', '⛅', '☁️', '🌊', '❄️', '⛄',
        '🎵', '🎶', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻',
        '🍕', '🍔', '🍟', '🌭', '🍿', '🧈', '🍞', '🥐',
        '🎂', '🍰', '🧁', '🍪', '🍩', '🍫', '🍬', '🍭',
        '☕', '🍵', '🥤', '🧃', '🧋', '🍷', '🍺', '🍻',
        '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏',
        '🎮', '🕹️', '👾', '🎯', '🎲', '🎰', '🎳', '🎪',
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
        '✈️', '🚀', '🛸', '🚁', '⛵', '🚤', '🛥️', '⛴️',
        '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨',
        '💕', '💞', '💓', '💗', '💖', '💘', '💝', '❤️',
        '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
        '👍', '👎', '👊', '✊', '🤝', '👏', '🙌', '🙏',
        '💪', '🦾', '🤳', '✍️', '🤙', '🤘', '🤟', '✌️'
    ];
    
    grid.innerHTML = '';
    
    stickers.forEach(sticker => {
        const stickerElement = document.createElement('button');
        stickerElement.className = 'sticker-item';
        stickerElement.textContent = sticker;
        stickerElement.title = `Add ${sticker} sticker`;
        
        stickerElement.addEventListener('click', () => {
            insertDmSticker(sticker);
        });
        
        grid.appendChild(stickerElement);
    });
}

function insertDmSticker(sticker) {
    const messageInput = document.getElementById('messageInput');
    
    if (messageInput) {
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const text = messageInput.value;
        
        messageInput.value = text.substring(0, start) + ` ${sticker} ` + text.substring(end);
        
        const newPosition = start + sticker.length + 2;
        messageInput.selectionStart = newPosition;
        messageInput.selectionEnd = newPosition;
        messageInput.focus();
    }
    
    closeDmStickerPicker();
}

// DM Emoji Picker
function toggleDmEmojiPicker() {
    if (!dmEmojiPickerElement) {
        createDmEmojiPicker();
    }
    
    if (dmEmojiPickerElement.classList.contains('hidden')) {
        // Close other pickers
        closeDmGifPicker();
        closeDmStickerPicker();
        
        dmEmojiPickerElement.classList.remove('hidden');
    } else {
        dmEmojiPickerElement.classList.add('hidden');
    }
}

function createDmEmojiPicker() {
    const commonEmojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
        '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
        '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
        '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
        '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
        '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
        '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
        '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
        '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
        '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
        '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
        '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩',
        '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺',
        '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
        '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗',
        '💘', '💝', '💖', '💌', '💟', '❣️', '💬', '💭',
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
        '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
        '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
        '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️'
    ];
    
    dmEmojiPickerElement = document.createElement('div');
    dmEmojiPickerElement.className = 'emoji-picker hidden';
    
    commonEmojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn-item';
        btn.textContent = emoji;
        btn.onclick = () => insertDmEmoji(emoji);
        dmEmojiPickerElement.appendChild(btn);
    });
    
    const inputWrapper = document.querySelector('.conversation-input-wrapper');
    if (inputWrapper) {
        inputWrapper.appendChild(dmEmojiPickerElement);
    }
    
    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        const dmEmojiBtn = document.getElementById('dmEmojiBtn');
        if (dmEmojiPickerElement && 
            !dmEmojiPickerElement.contains(e.target) && 
            dmEmojiBtn && !dmEmojiBtn.contains(e.target)) {
            dmEmojiPickerElement.classList.add('hidden');
        }
    });
}

function insertDmEmoji(emoji) {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const start = messageInput.selectionStart;
    const end = messageInput.selectionEnd;
    const text = messageInput.value;
    
    messageInput.value = text.substring(0, start) + emoji + text.substring(end);
    messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
    messageInput.focus();
}

// Upload media files for DMs
function uploadDmMediaFiles(mediaItems) {
    const promises = [];
    
    for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        
        // If it's a GIF URL, just return it as-is
        if (item.type === 'gif') {
            promises.push(Promise.resolve({ type: 'gif', url: item.url }));
            continue;
        }
        
        // Otherwise it's an image file - convert to base64
        const file = item.file || item;
        promises.push(new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                // Compress large images
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Max dimensions to keep database size reasonable
                    const maxSize = 1200;
                    if (width > height && width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to base64 with compression (0.8 quality)
                    const base64 = canvas.toDataURL('image/jpeg', 0.8);
                    resolve({ type: 'image', url: base64 });
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        }));
    }
    
    return Promise.all(promises);
}
