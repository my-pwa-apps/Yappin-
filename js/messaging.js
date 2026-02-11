// ============================================================================
// Yappin' Secure Messaging System
// P2P & Group real-time messaging with read receipts, typing indicators,
// online presence, message reactions, and media sharing
// ============================================================================

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentConversationId = null;
let currentOtherUserId = null;
let currentConversationType = null; // 'dm' or 'group'
let messagesListener = null;
let typingListener = null;
let presenceListener = null;
let typingTimeout = null;
let lastRenderedMessageKey = null;
let isLoadingMore = false;
let disappearingTimer = 0; // 0 = off, value in ms
let expiryCleanupInterval = null;
const MESSAGE_PAGE_SIZE = 40;
const TYPING_TIMEOUT_MS = 3000;
const EXPIRY_CHECK_INTERVAL_MS = 5000;

/** Duration options for disappearing messages */
const DISAPPEARING_OPTIONS = [
    { label: 'Off', value: 0, icon: 'fa-infinity' },
    { label: '5s', value: 5 * 1000, icon: 'fa-bolt' },
    { label: '30s', value: 30 * 1000, icon: 'fa-hourglass-start' },
    { label: '1m', value: 60 * 1000, icon: 'fa-hourglass-half' },
    { label: '5m', value: 5 * 60 * 1000, icon: 'fa-hourglass-end' },
    { label: '1h', value: 60 * 60 * 1000, icon: 'fa-clock' },
    { label: '24h', value: 24 * 60 * 60 * 1000, icon: 'fa-calendar-day' },
];

// Cache for user profiles to avoid redundant fetches
const userProfileCache = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a consistent conversation ID for two users */
function getConversationId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

/** Random avatar fallback */
function generateRandomAvatar(seed) {
    return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
}

/** Sanitize text for safe HTML insertion */
function sanitizeText(text) {
    if (!text) return '';
    return window.utils?.sanitizeHTML
        ? window.utils.sanitizeHTML(text)
        : text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

/** Format timestamp for message display */
function formatMessageTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

/** Fetch user profile with caching */
async function getCachedUserProfile(uid) {
    if (userProfileCache.has(uid)) return userProfileCache.get(uid);
    try {
        const [uSnap, dSnap, pSnap] = await Promise.all([
            database.ref(`users/${uid}/username`).once('value'),
            database.ref(`users/${uid}/displayName`).once('value'),
            database.ref(`users/${uid}/photoURL`).once('value')
        ]);
        const profile = { username: uSnap.val(), displayName: dSnap.val(), photoURL: pSnap.val() };
        userProfileCache.set(uid, profile);
        setTimeout(() => userProfileCache.delete(uid), 5 * 60 * 1000);
        return profile;
    } catch {
        return { username: 'unknown', displayName: null, photoURL: null };
    }
}

/** Get display name from profile */
function getDisplayName(profile) {
    return profile.displayName || `@${profile.username || 'unknown'}`;
}

// ---------------------------------------------------------------------------
// Conversation view HTML template (single source of truth)
// ---------------------------------------------------------------------------
function getConversationViewHTML() {
    return `
        <div class="conversations-list" id="conversationsList"></div>
        <div class="conversation-view hidden" id="conversationView">
            <div class="conversation-header" id="conversationHeader"></div>
            <div class="conversation-messages" id="conversationMessages"></div>
            <div class="typing-indicator hidden" id="typingIndicator">
                <div class="typing-dots"><span></span><span></span><span></span></div>
                <span class="typing-text" id="typingText"></span>
            </div>
            <div id="dmImagePreviewContainer" class="image-preview-container hidden"></div>
            <div class="conversation-input-wrapper">
                <div class="conversation-input-actions">
                    <input type="file" id="dmImageInput" accept="image/*" multiple class="hidden-input">
                    <button class="icon-btn" id="dmAttachImageBtn" aria-label="Attach image" title="Attach image"><i class="far fa-image"></i></button>
                    <button class="icon-btn" id="dmGifBtn" aria-label="Add GIF" title="Add GIF"><span class="gif-text">GIF</span></button>
                    <button class="icon-btn" id="dmStickerBtn" aria-label="Add sticker" title="Add sticker"><i class="fas fa-note-sticky"></i></button>
                    <button class="icon-btn" id="dmEmojiBtn" aria-label="Add emoji" title="Add emoji"><i class="far fa-smile"></i></button>
                    <button class="icon-btn" id="dmDisappearingBtn" aria-label="Disappearing messages" title="Disappearing messages"><i class="far fa-clock"></i></button>
                </div>
                <div class="conversation-input">
                    <input type="text" id="messageInput" placeholder="Type a message..." class="input-field" autocomplete="off">
                    <button id="sendMessageBtn" class="btn btn-primary send-btn" aria-label="Send"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Online Presence
// ---------------------------------------------------------------------------
function setupPresence() {
    const user = auth.currentUser;
    if (!user) return;

    const presenceRef = database.ref(`presence/${user.uid}`);
    const connectedRef = database.ref('.info/connected');

    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            presenceRef.set({ online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });
            presenceRef.onDisconnect().set({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
        }
    });
}

function watchPresence(uid, callback) {
    const ref = database.ref(`presence/${uid}`);
    const handler = ref.on('value', (snap) => {
        callback(snap.val() || { online: false, lastSeen: null });
    });
    return () => ref.off('value', handler);
}

// ---------------------------------------------------------------------------
// Typing Indicators
// ---------------------------------------------------------------------------
function setTyping(conversationId, isTyping) {
    const user = auth.currentUser;
    if (!user || !conversationId) return;
    database.ref(`typing/${conversationId}/${user.uid}`).set(isTyping ? true : null);
}

function watchTyping(conversationId, callback) {
    const user = auth.currentUser;
    if (!user) return null;
    const ref = database.ref(`typing/${conversationId}`);
    const handler = ref.on('value', (snap) => {
        const data = snap.val() || {};
        callback(Object.keys(data).filter(uid => uid !== user.uid));
    });
    return () => ref.off('value', handler);
}

function handleTypingInput() {
    if (!currentConversationId) return;
    setTyping(currentConversationId, true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => setTyping(currentConversationId, false), TYPING_TIMEOUT_MS);
}

// ---------------------------------------------------------------------------
// Load & Display Conversations
// ---------------------------------------------------------------------------
function loadConversations() {
    const user = auth.currentUser;
    if (!user) return;
    database.ref(`conversations/${user.uid}`).on('value', (snap) => {
        displayConversations(snap.val() || {});
    });
}

function displayConversations(conversations) {
    const modal = document.getElementById('messagesModal');
    if (!modal) return;
    const body = modal.querySelector('.modal-body');
    if (!body) return;

    // Don't overwrite active conversation view
    const cv = document.getElementById('conversationView');
    if (cv && !cv.classList.contains('hidden')) {
        const list = document.getElementById('conversationsList');
        if (list) renderConversationItems(list, conversations);
        return;
    }

    const ids = Object.keys(conversations);
    if (ids.length === 0) {
        body.innerHTML = `
            <div class="messages-empty-state">
                <i class="fas fa-comments messages-empty-icon"></i>
                <h3>No Conversations Yet</h3>
                <p class="messages-empty-subtitle">Start a conversation from someone's profile or search for users.</p>
                <button class="btn primary-btn" onclick="showSearch()" style="margin-top:12px">
                    <i class="fas fa-search"></i> Find People
                </button>
            </div>
        `;
        return;
    }

    body.innerHTML = getConversationViewHTML();
    renderConversationItems(document.getElementById('conversationsList'), conversations);
}

async function renderConversationItems(container, conversations) {
    if (!container) return;
    container.innerHTML = '';

    // Sort by last message time descending
    const entries = Object.entries(conversations).sort((a, b) =>
        (b[1].lastMessageTime || 0) - (a[1].lastMessageTime || 0)
    );

    for (const [convId, conv] of entries) {
        const profile = await getCachedUserProfile(conv.otherUserId);
        const displayText = getDisplayName(profile);
        const avatar = profile.photoURL || generateRandomAvatar(conv.otherUserId);
        const unread = conv.unreadCount > 0;
        const lastMsg = conv.lastMessage || '';
        const preview = lastMsg.length > 50 ? lastMsg.substring(0, 50) + '\u2026' : lastMsg;
        const timeStr = conv.lastMessageTime ? formatMessageTime(conv.lastMessageTime) : '';

        const item = document.createElement('div');
        item.className = `conversation-item${unread ? ' conversation-unread' : ''}`;
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.onclick = () => openConversation(convId, conv.otherUserId, 'dm');
        item.onkeydown = (e) => { if (e.key === 'Enter') openConversation(convId, conv.otherUserId, 'dm'); };

        item.innerHTML = `
            <div class="conversation-avatar-wrapper">
                <img src="${avatar}" alt="${sanitizeText(displayText)}" class="conversation-avatar" loading="lazy">
                <span class="presence-dot" data-uid="${conv.otherUserId}"></span>
            </div>
            <div class="conversation-info">
                <div class="conversation-top-row">
                    <span class="conversation-name${unread ? ' unread' : ''}">${sanitizeText(displayText)}</span>
                    <span class="conversation-time">${timeStr}</span>
                </div>
                <div class="conversation-bottom-row">
                    <span class="conversation-preview">${sanitizeText(preview)}</span>
                    ${unread ? `<span class="conversation-badge">${conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(item);

        // Live presence dot
        watchPresence(conv.otherUserId, (status) => {
            const dot = item.querySelector('.presence-dot');
            if (dot) dot.classList.toggle('online', status.online);
        });
    }
}

// ---------------------------------------------------------------------------
// Open Conversation
// ---------------------------------------------------------------------------
async function openConversation(conversationId, otherUserId, type = 'dm') {
    cleanupConversation();
    currentConversationId = conversationId;
    currentOtherUserId = otherUserId;
    currentConversationType = type;

    const list = document.getElementById('conversationsList');
    const view = document.getElementById('conversationView');
    if (list) list.classList.add('hidden');
    if (view) view.classList.remove('hidden');

    // Build header
    const profile = await getCachedUserProfile(otherUserId);
    const displayText = getDisplayName(profile);
    const avatar = profile.photoURL || generateRandomAvatar(otherUserId);
    const header = document.getElementById('conversationHeader');
    if (header) {
        header.innerHTML = `
            <button class="btn-back" id="conversationBackBtn" aria-label="Back"><i class="fas fa-arrow-left"></i></button>
            <div class="conversation-avatar-wrapper">
                <img src="${avatar}" alt="${sanitizeText(displayText)}" class="conversation-header-avatar" loading="lazy">
                <span class="presence-dot header-presence" id="headerPresenceDot"></span>
            </div>
            <div class="conversation-header-info">
                <div class="conversation-header-name">${sanitizeText(displayText)}</div>
                <div class="conversation-header-status" id="headerStatus">
                    ${profile.displayName ? `<span class="conversation-header-username">@${sanitizeText(profile.username)}</span>` : ''}
                </div>
            </div>
            <div class="conversation-header-actions">
                <button class="icon-btn" id="conversationInfoBtn" aria-label="Info" title="Conversation info"><i class="fas fa-info-circle"></i></button>
            </div>
        `;
        document.getElementById('conversationBackBtn')?.addEventListener('click', closeConversation);
    }

    // Live presence in header
    presenceListener = watchPresence(otherUserId, (status) => {
        const dot = document.getElementById('headerPresenceDot');
        const statusEl = document.getElementById('headerStatus');
        if (dot) dot.classList.toggle('online', status.online);
        if (statusEl) {
            const prefix = profile.displayName
                ? `<span class="conversation-header-username">@${sanitizeText(profile.username)}</span> &middot; `
                : '';
            statusEl.innerHTML = status.online
                ? `${prefix}<span class="status-online">online</span>`
                : status.lastSeen
                    ? `${prefix}<span class="status-lastseen">last seen ${formatMessageTime(status.lastSeen)}</span>`
                    : prefix;
        }
    });

    // Mark as read
    const user = auth.currentUser;
    if (user) {
        database.ref(`conversations/${user.uid}/${conversationId}/unreadCount`).set(0);
        updateMessagesBadge();
    }

    loadMessages(conversationId);

    // Typing indicator watcher
    typingListener = watchTyping(conversationId, async (typingUids) => {
        const indicator = document.getElementById('typingIndicator');
        const textEl = document.getElementById('typingText');
        if (!indicator || !textEl) return;
        if (typingUids.length > 0) {
            const names = await Promise.all(typingUids.map(async uid => getDisplayName(await getCachedUserProfile(uid))));
            textEl.textContent = names.length === 1 ? `${names[0]} is typing\u2026` : `${names.join(', ')} are typing\u2026`;
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
    });

    // Input setup
    setTimeout(() => {
        setupDmMediaButtons();
        const input = document.getElementById('messageInput');
        if (input) {
            input.addEventListener('input', handleTypingInput);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            });
            input.focus();
        }
        document.getElementById('sendMessageBtn')?.addEventListener('click', sendMessage);
    }, 50);
}

// ---------------------------------------------------------------------------
// Close / Cleanup
// ---------------------------------------------------------------------------
function cleanupConversation() {
    if (messagesListener && currentConversationId) {
        database.ref(`messages/${currentConversationId}`).off('child_added', messagesListener);
        messagesListener = null;
    }
    if (typingListener) { typingListener(); typingListener = null; }
    if (presenceListener) { presenceListener(); presenceListener = null; }
    if (currentConversationId) setTyping(currentConversationId, false);
    clearTimeout(typingTimeout);
    lastRenderedMessageKey = null;
    stopExpiryCleanup();
    disappearingTimer = 0;
}

window.closeConversation = function() {
    cleanupConversation();
    const list = document.getElementById('conversationsList');
    const view = document.getElementById('conversationView');
    if (list) list.classList.remove('hidden');
    if (view) view.classList.add('hidden');
    currentConversationId = null;
    currentOtherUserId = null;
    currentConversationType = null;
};

// ---------------------------------------------------------------------------
// Messages: Load, Render, Send
// ---------------------------------------------------------------------------
function loadMessages(conversationId) {
    const container = document.getElementById('conversationMessages');
    if (!container) return;
    container.innerHTML = '<div class="messages-loading"><i class="fas fa-spinner fa-spin"></i> Loading messages\u2026</div>';

    const ref = database.ref(`messages/${conversationId}`);

    ref.orderByChild('timestamp').limitToLast(MESSAGE_PAGE_SIZE).once('value').then(snap => {
        container.innerHTML = '';
        if (!snap.exists()) {
            container.innerHTML = '<div class="no-messages"><i class="fas fa-lock"></i> Messages are secured. Say hi!</div>';
        } else {
            let lastKey = null;
            snap.forEach(child => { lastKey = child.key; renderMessage(child.key, child.val()); });
            lastRenderedMessageKey = lastKey;
        }
        scrollToBottom(container);
        markMessagesRead(conversationId);
        startExpiryCleanup();

        // Listen for new messages from this point on
        messagesListener = ref.orderByChild('timestamp').startAt(Date.now()).on('child_added', (newSnap) => {
            renderMessage(newSnap.key, newSnap.val());
            scrollToBottom(container);
            markMessagesRead(conversationId);
        });
    }).catch(() => {
        container.innerHTML = '<div class="messages-error"><i class="fas fa-exclamation-triangle"></i> Failed to load messages</div>';
    });

    // Infinite scroll for older messages
    const throttledScroll = window.utils?.throttle
        ? window.utils.throttle(() => { if (container.scrollTop < 80 && !isLoadingMore) loadOlderMessages(conversationId, container); }, 500)
        : () => {};
    container.addEventListener('scroll', throttledScroll);
}

async function loadOlderMessages(conversationId, container) {
    if (isLoadingMore) return;
    const firstMsg = container.querySelector('.message-bubble');
    if (!firstMsg) return;
    const firstKey = firstMsg.dataset.msgKey;
    if (!firstKey) return;

    isLoadingMore = true;
    try {
        const snap = await database.ref(`messages/${conversationId}`).orderByKey().endBefore(firstKey).limitToLast(MESSAGE_PAGE_SIZE).once('value');
        if (snap.exists()) {
            const prevHeight = container.scrollHeight;
            const fragment = document.createDocumentFragment();
            snap.forEach(child => fragment.appendChild(createMessageElement(child.key, child.val())));
            container.insertBefore(fragment, container.firstChild);
            container.scrollTop = container.scrollHeight - prevHeight;
        }
    } catch { /* ignore scroll errors */ }
    isLoadingMore = false;
}

function scrollToBottom(el) {
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

function markMessagesRead(conversationId) {
    const user = auth.currentUser;
    if (!user) return;
    database.ref(`conversations/${user.uid}/${conversationId}/unreadCount`).set(0);
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------
function renderMessage(key, msg) {
    const container = document.getElementById('conversationMessages');
    if (!container) return;
    const placeholder = container.querySelector('.no-messages');
    if (placeholder) placeholder.remove();
    if (container.querySelector(`[data-msg-key="${key}"]`)) return; // no dupes
    container.appendChild(createMessageElement(key, msg));
}

function createMessageElement(key, msg) {
    const user = auth.currentUser;
    const isOwn = msg.senderId === user?.uid;

    // Skip already-expired messages
    if (msg.expiresAt && msg.expiresAt <= Date.now()) {
        // Clean up from DB silently
        if (currentConversationId) database.ref(`messages/${currentConversationId}/${key}`).remove().catch(() => {});
        const ghost = document.createElement('div');
        ghost.style.display = 'none';
        return ghost;
    }

    const el = document.createElement('div');
    el.className = `message-bubble ${isOwn ? 'message-own' : 'message-other'}${msg.expiresAt ? ' message-disappearing' : ''}`;
    el.dataset.msgKey = key;
    if (msg.expiresAt) el.dataset.expiresAt = msg.expiresAt;

    let html = '';

    // Text
    if (msg.text) {
        html += `<div class="message-content">${linkifyText(sanitizeText(msg.text))}</div>`;
    }

    // Media
    if (msg.media?.length > 0) {
        html += '<div class="message-media">';
        msg.media.forEach(item => {
            const url = typeof item === 'string' ? item : item.url;
            const type = typeof item === 'string' ? 'image' : (item.type || 'image');
            html += type === 'gif'
                ? `<img src="${url}" alt="GIF" class="message-gif" loading="lazy">`
                : `<img src="${url}" alt="Image" class="message-image" loading="lazy">`;
        });
        html += '</div>';
    }

    // Footer: time + disappearing badge + read receipt
    html += `<div class="message-footer">`;
    if (msg.expiresAt) {
        const remaining = msg.expiresAt - Date.now();
        html += `<span class="disappearing-indicator"><i class="fas fa-fire"></i> <span class="disappearing-badge">${formatCountdown(remaining)}</span></span>`;
    }
    html += `<span class="message-time">${formatMessageTime(msg.timestamp)}</span>`;
    if (isOwn) {
        html += msg.read
            ? '<i class="fas fa-check-double read-receipt read"></i>'
            : '<i class="fas fa-check read-receipt"></i>';
    }
    html += '</div>';

    // Reactions
    if (msg.reactions) {
        html += '<div class="message-reactions">';
        const counts = {};
        Object.values(msg.reactions).forEach(r => { counts[r] = (counts[r] || 0) + 1; });
        Object.entries(counts).forEach(([emoji, count]) => {
            const mine = msg.reactions[user?.uid] === emoji;
            html += `<button class="reaction-chip${mine ? ' reaction-mine' : ''}" data-key="${key}" data-emoji="${emoji}">${emoji} ${count}</button>`;
        });
        html += '</div>';
    }

    el.innerHTML = html;

    // Reaction chip clicks
    el.querySelectorAll('.reaction-chip').forEach(chip => {
        chip.addEventListener('click', () => toggleReaction(chip.dataset.key, chip.dataset.emoji));
    });

    // Context menu (desktop right-click, mobile long-press)
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); showMessageActions(key, msg, isOwn, el); });
    let pressTimer;
    el.addEventListener('touchstart', () => { pressTimer = setTimeout(() => showMessageActions(key, msg, isOwn, el), 500); }, { passive: true });
    el.addEventListener('touchend', () => clearTimeout(pressTimer));
    el.addEventListener('touchmove', () => clearTimeout(pressTimer));

    return el;
}

/** Convert URLs in text to clickable links */
function linkifyText(text) {
    return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>');
}

// ---------------------------------------------------------------------------
// Message Actions (react, copy, delete)
// ---------------------------------------------------------------------------
function showMessageActions(key, msg, isOwn, anchorEl) {
    document.querySelectorAll('.message-action-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'message-action-menu';

    const actions = [
        { icon: 'far fa-smile', label: 'React', fn: () => showReactionPicker(key) },
        { icon: 'far fa-copy', label: 'Copy', fn: () => copyMessageText(msg.text) },
    ];
    if (isOwn) {
        actions.push({ icon: 'fas fa-trash', label: 'Delete', fn: () => deleteMessage(key), danger: true });
    }

    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.className = `message-action-btn${a.danger ? ' danger' : ''}`;
        btn.innerHTML = `<i class="${a.icon}"></i> ${a.label}`;
        btn.onclick = () => { a.fn(); menu.remove(); };
        menu.appendChild(btn);
    });

    anchorEl.style.position = 'relative';
    menu.style.position = 'absolute';
    menu.style.top = '0';
    menu.style[isOwn ? 'left' : 'right'] = '0';
    anchorEl.appendChild(menu);

    setTimeout(() => {
        document.addEventListener('click', function handler() { menu.remove(); document.removeEventListener('click', handler); }, { once: true });
    }, 10);
}

function showReactionPicker(msgKey) {
    const quickEmojis = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'];
    const msgEl = document.querySelector(`[data-msg-key="${msgKey}"]`);
    if (!msgEl) return;
    document.querySelectorAll('.reaction-picker').forEach(p => p.remove());

    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    quickEmojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'reaction-pick-btn';
        btn.textContent = emoji;
        btn.onclick = () => { toggleReaction(msgKey, emoji); picker.remove(); };
        picker.appendChild(btn);
    });
    msgEl.appendChild(picker);

    setTimeout(() => {
        document.addEventListener('click', function handler() { picker.remove(); document.removeEventListener('click', handler); }, { once: true });
    }, 10);
}

function toggleReaction(msgKey, emoji) {
    const user = auth.currentUser;
    if (!user || !currentConversationId) return;
    const ref = database.ref(`messages/${currentConversationId}/${msgKey}/reactions/${user.uid}`);
    ref.once('value').then(snap => snap.val() === emoji ? ref.remove() : ref.set(emoji));
}

function copyMessageText(text) {
    if (!text) return;
    if (window.utils?.copyToClipboard) {
        window.utils.copyToClipboard(text);
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    }
    showSnackbar('Copied to clipboard', 'success');
}

async function deleteMessage(msgKey) {
    if (!currentConversationId) return;
    const confirmed = window.uiUtils?.showConfirmDialog
        ? await window.uiUtils.showConfirmDialog('Delete Message', 'This message will be permanently deleted.', 'Delete', 'Cancel')
        : confirm('Delete this message?');
    if (!confirmed) return;
    try {
        await database.ref(`messages/${currentConversationId}/${msgKey}`).remove();
        document.querySelector(`[data-msg-key="${msgKey}"]`)?.remove();
        showSnackbar('Message deleted', 'success');
    } catch {
        showSnackbar('Failed to delete message', 'error');
    }
}

// ---------------------------------------------------------------------------
// Send Message
// ---------------------------------------------------------------------------
window.sendMessage = function() {
    const input = document.getElementById('messageInput');
    if (!input) return;

    const text = input.value.trim();
    const mediaAttachments = window.getMediaAttachments ? window.getMediaAttachments() : [];
    if (!text && mediaAttachments.length === 0) return;

    const user = auth.currentUser;
    if (!user || !currentConversationId || !currentOtherUserId) return;

    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) sendBtn.disabled = true;

    // Stop typing
    setTyping(currentConversationId, false);
    clearTimeout(typingTimeout);

    const mediaPromise = mediaAttachments.length > 0 && window.uploadMediaFiles
        ? window.uploadMediaFiles(mediaAttachments)
        : Promise.resolve([]);

    mediaPromise.then(mediaUrls => {
        const msgData = {
            senderId: user.uid,
            receiverId: currentOtherUserId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };
        if (text) msgData.text = text;
        if (mediaUrls?.length > 0) msgData.media = mediaUrls;
        if (disappearingTimer > 0) msgData.expiresAt = Date.now() + disappearingTimer;
        return database.ref(`messages/${currentConversationId}`).push(msgData);
    }).then((msgRef) => {
        const lastMsg = text || '\u{1F4CE} Media';
        const updates = {};

        // Sender
        updates[`conversations/${user.uid}/${currentConversationId}/lastMessage`] = lastMsg;
        updates[`conversations/${user.uid}/${currentConversationId}/lastMessageTime`] = firebase.database.ServerValue.TIMESTAMP;
        updates[`conversations/${user.uid}/${currentConversationId}/otherUserId`] = currentOtherUserId;

        // Receiver
        updates[`conversations/${currentOtherUserId}/${currentConversationId}/lastMessage`] = lastMsg;
        updates[`conversations/${currentOtherUserId}/${currentConversationId}/lastMessageTime`] = firebase.database.ServerValue.TIMESTAMP;
        updates[`conversations/${currentOtherUserId}/${currentConversationId}/otherUserId`] = user.uid;
        updates[`conversations/${currentOtherUserId}/${currentConversationId}/unreadCount`] = firebase.database.ServerValue.increment(1);

        // Notification
        updates[`notifications/${currentOtherUserId}/${msgRef.key}`] = {
            type: 'message',
            from: user.uid,
            fromUsername: user.displayName || 'Someone',
            message: lastMsg,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };

        return database.ref().update(updates);
    }).then(() => {
        input.value = '';
        if (window.clearImages) window.clearImages();
        const dmImageInput = document.getElementById('dmImageInput');
        if (dmImageInput) dmImageInput.value = '';
        input.focus();
    }).catch(() => {
        showSnackbar('Failed to send message', 'error');
    }).finally(() => {
        if (sendBtn) sendBtn.disabled = false;
    });
};

// ---------------------------------------------------------------------------
// Start Conversation (from profile/search/timeline)
// ---------------------------------------------------------------------------
window.startConversation = function(otherUserId) {
    const user = auth.currentUser;
    if (!user) { showSnackbar('Please sign in to send messages', 'error'); return; }
    if (otherUserId === user.uid) { showSnackbar('You cannot message yourself', 'error'); return; }

    Promise.all([
        database.ref(`following/${user.uid}/${otherUserId}`).once('value'),
        database.ref(`following/${otherUserId}/${user.uid}`).once('value')
    ]).then(([iFollow, theyFollow]) => {
        if (!iFollow.exists() || !theyFollow.exists()) {
            showSnackbar('You can only message people you mutually follow', 'error');
            return;
        }
        const conversationId = getConversationId(user.uid, otherUserId);
        const modal = document.getElementById('messagesModal');
        if (!modal) return;
        toggleModal(modal, true);
        setTimeout(() => {
            const body = modal.querySelector('.modal-body');
            if (!body) return;
            body.innerHTML = getConversationViewHTML();
            openConversation(conversationId, otherUserId, 'dm');
        }, 150);
    }).catch(() => {
        showSnackbar('Failed to start conversation', 'error');
    });
};

// ---------------------------------------------------------------------------
// Unread Badge
// ---------------------------------------------------------------------------
function updateMessagesBadge() {
    const user = auth.currentUser;
    if (!user) return;
    database.ref(`conversations/${user.uid}`).once('value').then(snap => {
        let total = 0;
        if (snap.exists()) snap.forEach(c => { total += c.val().unreadCount || 0; });
        const badge = document.getElementById('messagesBadge');
        if (badge) {
            badge.textContent = total > 99 ? '99+' : total;
            badge.classList.toggle('hidden', total === 0);
        }
    }).catch(() => {});
}

// ---------------------------------------------------------------------------
// OS Notifications
// ---------------------------------------------------------------------------
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showMessageNotification(fromUsername, messageText) {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(`@${fromUsername}`, {
            body: messageText,
            icon: './images/icons/icon-192x192.png',
            badge: './images/icons/icon-192x192.png',
            tag: 'yappin-message',
            requireInteraction: false
        });
        n.onclick = function() { window.focus(); this.close(); };
    }
}

// ---------------------------------------------------------------------------
// Disappearing Messages
// ---------------------------------------------------------------------------

/** Show/hide the disappearing timer picker dropdown */
function toggleDisappearingPicker() {
    const existing = document.querySelector('.disappearing-picker');
    if (existing) { existing.remove(); return; }

    const btn = document.getElementById('dmDisappearingBtn');
    if (!btn) return;

    const picker = document.createElement('div');
    picker.className = 'disappearing-picker';

    DISAPPEARING_OPTIONS.forEach(opt => {
        const item = document.createElement('button');
        item.className = `disappearing-option${disappearingTimer === opt.value ? ' active' : ''}`;
        item.innerHTML = `<i class="fas ${opt.icon}"></i> ${opt.label}`;
        item.onclick = (e) => {
            e.stopPropagation();
            setDisappearingTimer(opt.value);
            picker.remove();
        };
        picker.appendChild(item);
    });

    const wrapper = btn.closest('.conversation-input-actions') || btn.parentElement;
    wrapper.style.position = 'relative';
    wrapper.appendChild(picker);

    setTimeout(() => {
        document.addEventListener('click', function handler() { picker.remove(); document.removeEventListener('click', handler); }, { once: true });
    }, 10);
}

/** Set the disappearing timer and update UI */
function setDisappearingTimer(ms) {
    disappearingTimer = ms;
    const btn = document.getElementById('dmDisappearingBtn');
    if (!btn) return;
    if (ms > 0) {
        btn.classList.add('disappearing-active');
        btn.innerHTML = '<i class="fas fa-clock"></i>';
        const label = DISAPPEARING_OPTIONS.find(o => o.value === ms)?.label || '';
        btn.title = `Disappearing: ${label}`;
        showSnackbar(`Disappearing messages: ${label}`, 'success', 2000);
    } else {
        btn.classList.remove('disappearing-active');
        btn.innerHTML = '<i class="far fa-clock"></i>';
        btn.title = 'Disappearing messages';
        showSnackbar('Disappearing messages off', 'default', 2000);
    }
}

/** Remove expired messages from the DOM and database */
function cleanupExpiredMessages() {
    const now = Date.now();
    document.querySelectorAll('.message-bubble[data-expires-at]').forEach(el => {
        const expiresAt = parseInt(el.dataset.expiresAt, 10);
        if (expiresAt && expiresAt <= now) {
            const key = el.dataset.msgKey;
            el.classList.add('message-expiring');
            setTimeout(() => {
                el.remove();
                // Remove from DB
                if (currentConversationId && key) {
                    database.ref(`messages/${currentConversationId}/${key}`).remove().catch(() => {});
                }
            }, 400);
        } else {
            // Update the countdown display
            updateExpiryCountdown(el, expiresAt);
        }
    });
}

/** Start periodic cleanup interval */
function startExpiryCleanup() {
    stopExpiryCleanup();
    expiryCleanupInterval = setInterval(cleanupExpiredMessages, EXPIRY_CHECK_INTERVAL_MS);
}

/** Stop periodic cleanup */
function stopExpiryCleanup() {
    if (expiryCleanupInterval) { clearInterval(expiryCleanupInterval); expiryCleanupInterval = null; }
}

/** Update the countdown text on a disappearing message */
function updateExpiryCountdown(el, expiresAt) {
    const badge = el.querySelector('.disappearing-badge');
    if (!badge) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return;
    badge.textContent = formatCountdown(remaining);
}

/** Format milliseconds to a human-readable countdown */
function formatCountdown(ms) {
    if (ms <= 0) return '0s';
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.ceil(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.ceil(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.ceil(h / 24)}d`;
}

// ---------------------------------------------------------------------------
// DM Media Buttons (shared with media.js)
// ---------------------------------------------------------------------------
function setupDmMediaButtons() {
    const messageInput = document.getElementById('messageInput');
    const setDmActive = () => {
        if (window.setActiveTextarea && messageInput) window.setActiveTextarea(messageInput);
    };
    // Disappearing messages button
    const disappearBtn = document.getElementById('dmDisappearingBtn');
    if (disappearBtn) {
        const freshDisappear = disappearBtn.cloneNode(true);
        disappearBtn.replaceWith(freshDisappear);
        freshDisappear.addEventListener('click', (e) => { e.stopPropagation(); toggleDisappearingPicker(); });
    }
    [
        { id: 'dmGifBtn', fn: 'toggleGifPicker' },
        { id: 'dmStickerBtn', fn: 'toggleStickerPicker' },
        { id: 'dmEmojiBtn', fn: 'toggleEmojiPicker' },
    ].forEach(({ id, fn }) => {
        const btn = document.getElementById(id);
        if (btn && window[fn]) {
            const fresh = btn.cloneNode(true);
            btn.replaceWith(fresh);
            fresh.addEventListener('click', () => { setDmActive(); window[fn](); });
        }
    });

    const attachBtn = document.getElementById('dmAttachImageBtn');
    const fileInput = document.getElementById('dmImageInput');
    if (attachBtn && fileInput) {
        const fb = attachBtn.cloneNode(true);
        attachBtn.replaceWith(fb);
        fb.addEventListener('click', () => { setDmActive(); fileInput.click(); });

        const fi = fileInput.cloneNode(true);
        fileInput.replaceWith(fi);
        fi.addEventListener('change', (e) => { setDmActive(); if (window.handleImageSelect) window.handleImageSelect(e); });
    }
}

// ---------------------------------------------------------------------------
// Auth State & Init
// ---------------------------------------------------------------------------
auth.onAuthStateChanged((user) => {
    if (user) {
        setupPresence();
        updateMessagesBadge();
        requestNotificationPermission();
        database.ref(`conversations/${user.uid}`).on('value', () => updateMessagesBadge());
        database.ref(`conversations/${user.uid}`).on('child_changed', (snap) => {
            const conv = snap.val();
            if (conv?.unreadCount > 0 && conv.lastMessage) {
                getCachedUserProfile(conv.otherUserId).then(p => {
                    showMessageNotification(p.username || 'Someone', conv.lastMessage);
                });
            }
        });
    }
});

// Exports
window.loadConversations = loadConversations;
window.updateMessagesBadge = updateMessagesBadge;
window.getConversationId = getConversationId;
