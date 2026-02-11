// ============================================================================
// Yappin' Groups System
// Topic-based groups with real-time group chat, member management,
// admin controls, invite links, and group yap feeds
// ============================================================================

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentGroupId = null;
let groupChatListener = null;
let groupTypingListener = null;
let groupDisappearingTimer = 0;
let groupExpiryCleanupInterval = null;
const GROUP_MESSAGE_PAGE_SIZE = 50;

const GROUP_DISAPPEARING_OPTIONS = [
    { label: 'Off', value: 0, icon: 'fa-infinity' },
    { label: '5s', value: 5 * 1000, icon: 'fa-bolt' },
    { label: '30s', value: 30 * 1000, icon: 'fa-hourglass-start' },
    { label: '1m', value: 60 * 1000, icon: 'fa-hourglass-half' },
    { label: '5m', value: 5 * 60 * 1000, icon: 'fa-hourglass-end' },
    { label: '1h', value: 60 * 60 * 1000, icon: 'fa-clock' },
    { label: '24h', value: 24 * 60 * 60 * 1000, icon: 'fa-calendar-day' },
];

// ---------------------------------------------------------------------------
// Group CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new group
 * @param {Object} groupData - { name, description, topic, isPublic, imageFile }
 * @returns {Promise<string>} Group ID
 */
async function createGroup(groupData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const { name, description, topic, isPublic, imageFile } = groupData;

    if (!name || name.trim().length < 3 || name.trim().length > 50)
        throw new Error('Group name must be 3-50 characters');
    if (!description || description.trim().length < 10 || description.trim().length > 500)
        throw new Error('Description must be 10-500 characters');
    if (!topic || topic.trim().length < 3 || topic.trim().length > 50)
        throw new Error('Topic must be 3-50 characters');

    let imageURL = null;
    if (imageFile) imageURL = await uploadGroupImage(imageFile);

    const groupId = database.ref('groups').push().key;
    const inviteCode = generateInviteCode();
    const group = {
        name: name.trim(),
        description: description.trim(),
        topic: topic.trim(),
        isPublic: isPublic === true,
        createdBy: user.uid,
        createdAt: Date.now(),
        memberCount: 1,
        inviteCode
    };
    if (imageURL) group.imageURL = imageURL;

    const updates = {};
    updates[`groups/${groupId}`] = group;
    updates[`groupMembers/${groupId}/${user.uid}`] = { joinedAt: Date.now(), role: 'admin' };
    updates[`userGroups/${user.uid}/${groupId}`] = true;
    updates[`groupInviteCodes/${inviteCode}`] = groupId;

    await database.ref().update(updates);
    showSnackbar(window.t ? window.t('success') : 'Group created!', 'success');
    return groupId;
}

/** Generate a short invite code */
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

/**
 * Upload group image to Firebase Storage
 * @param {File} imageFile
 * @returns {Promise<string>} Download URL
 */
async function uploadGroupImage(imageFile) {
    if (!imageFile) throw new Error('No image file provided');
    if (imageFile.size > 5 * 1024 * 1024) throw new Error('Image must be less than 5MB');
    if (!imageFile.type.startsWith('image/')) throw new Error('File must be an image');

    const fileName = `group_${Date.now()}_${imageFile.name}`;
    const ref = storage.ref(`group-images/${fileName}`);
    const snapshot = await ref.put(imageFile);
    return snapshot.ref.getDownloadURL();
}

/**
 * Update group settings (admin only)
 * @param {string} groupId
 * @param {Object} updates - { name, description, topic, isPublic }
 */
async function updateGroupSettings(groupId, settingsData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');
    await requireAdmin(groupId, user.uid);

    const allowed = ['name', 'description', 'topic', 'isPublic'];
    const updates = {};
    for (const key of allowed) {
        if (settingsData[key] !== undefined) {
            updates[`groups/${groupId}/${key}`] = typeof settingsData[key] === 'string'
                ? settingsData[key].trim()
                : settingsData[key];
        }
    }
    if (Object.keys(updates).length > 0) {
        await database.ref().update(updates);
        showSnackbar('Group settings updated', 'success');
    }
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

async function joinGroup(groupId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const groupSnap = await database.ref(`groups/${groupId}`).once('value');
    if (!groupSnap.exists()) throw new Error('Group not found');

    const memberSnap = await database.ref(`groupMembers/${groupId}/${user.uid}`).once('value');
    if (memberSnap.exists()) throw new Error('Already a member');

    const updates = {};
    updates[`groupMembers/${groupId}/${user.uid}`] = { joinedAt: Date.now(), role: 'member' };
    updates[`userGroups/${user.uid}/${groupId}`] = true;
    await database.ref().update(updates);

    // Atomic increment
    await database.ref(`groups/${groupId}/memberCount`).transaction(c => (c || 0) + 1);
    showSnackbar('Joined group!', 'success');
}

async function leaveGroup(groupId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const memberSnap = await database.ref(`groupMembers/${groupId}/${user.uid}`).once('value');
    if (!memberSnap.exists()) throw new Error('Not a member');

    const groupSnap = await database.ref(`groups/${groupId}`).once('value');
    const groupData = groupSnap.val();

    // Prevent sole admin from leaving
    if (memberSnap.val().role === 'admin') {
        const membersSnap = await database.ref(`groupMembers/${groupId}`).once('value');
        let adminCount = 0;
        membersSnap.forEach(s => { if (s.val().role === 'admin') adminCount++; });
        if (adminCount <= 1) throw new Error('Promote another member to admin before leaving');
    }

    const updates = {};
    updates[`groupMembers/${groupId}/${user.uid}`] = null;
    updates[`userGroups/${user.uid}/${groupId}`] = null;
    await database.ref().update(updates);

    await database.ref(`groups/${groupId}/memberCount`).transaction(c => Math.max(0, (c || 1) - 1));
    showSnackbar('Left group', 'success');
}

async function joinGroupByInviteCode(code) {
    const codeSnap = await database.ref(`groupInviteCodes/${code}`).once('value');
    if (!codeSnap.exists()) throw new Error('Invalid invite code');
    return joinGroup(codeSnap.val());
}

// ---------------------------------------------------------------------------
// Admin Management
// ---------------------------------------------------------------------------

async function requireAdmin(groupId, uid) {
    const snap = await database.ref(`groupMembers/${groupId}/${uid}`).once('value');
    if (!snap.exists() || snap.val().role !== 'admin') throw new Error('Admin access required');
}

async function promoteMember(groupId, targetUid) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');
    await requireAdmin(groupId, user.uid);
    await database.ref(`groupMembers/${groupId}/${targetUid}/role`).set('admin');
    notifyUser(targetUid, 'promoted_to_admin', { groupId });
    showSnackbar('Member promoted to admin', 'success');
}

async function demoteMember(groupId, targetUid) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');
    await requireAdmin(groupId, user.uid);
    if (targetUid === user.uid) throw new Error('Cannot demote yourself');
    await database.ref(`groupMembers/${groupId}/${targetUid}/role`).set('member');
    showSnackbar('Admin demoted to member', 'success');
}

async function removeMember(groupId, targetUid) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');
    await requireAdmin(groupId, user.uid);
    if (targetUid === user.uid) throw new Error('Cannot remove yourself');

    const updates = {};
    updates[`groupMembers/${groupId}/${targetUid}`] = null;
    updates[`userGroups/${targetUid}/${groupId}`] = null;
    await database.ref().update(updates);

    await database.ref(`groups/${groupId}/memberCount`).transaction(c => Math.max(0, (c || 1) - 1));
    showSnackbar('Member removed', 'success');
}

async function deleteGroup(groupId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');
    await requireAdmin(groupId, user.uid);

    const membersSnap = await database.ref(`groupMembers/${groupId}`).once('value');
    const groupSnap = await database.ref(`groups/${groupId}`).once('value');
    const inviteCode = groupSnap.val()?.inviteCode;

    const updates = {};
    updates[`groups/${groupId}`] = null;
    updates[`groupMembers/${groupId}`] = null;
    updates[`groupYaps/${groupId}`] = null;
    updates[`groupMessages/${groupId}`] = null;
    updates[`groupJoinRequests/${groupId}`] = null;
    if (inviteCode) updates[`groupInviteCodes/${inviteCode}`] = null;

    if (membersSnap.exists()) {
        membersSnap.forEach(s => { updates[`userGroups/${s.key}/${groupId}`] = null; });
    }

    await database.ref().update(updates);
    showSnackbar('Group deleted', 'success');
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadMyGroups() {
    const user = auth.currentUser;
    if (!user) return [];

    const snap = await database.ref(`userGroups/${user.uid}`).once('value');
    if (!snap.exists()) return [];

    const ids = Object.keys(snap.val());
    const snaps = await Promise.all(ids.map(id => database.ref(`groups/${id}`).once('value')));

    return snaps
        .map((s, i) => s.exists() ? { id: ids[i], ...s.val() } : null)
        .filter(Boolean)
        .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
}

async function loadPublicGroups(limit = 20) {
    const snap = await database.ref('groups').orderByChild('isPublic').equalTo(true).limitToFirst(limit).once('value');
    if (!snap.exists()) return [];
    const groups = [];
    snap.forEach(s => groups.push({ id: s.key, ...s.val() }));
    return groups.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
}

async function loadGroupMembers(groupId) {
    const snap = await database.ref(`groupMembers/${groupId}`).once('value');
    if (!snap.exists()) return [];

    const members = [];
    const promises = [];
    snap.forEach(s => {
        const uid = s.key;
        const data = s.val();
        promises.push(
            database.ref(`users/${uid}`).once('value').then(uSnap => {
                if (uSnap.exists()) {
                    const u = uSnap.val();
                    members.push({
                        uid, username: u.username, displayName: u.displayName,
                        photoURL: u.photoURL, role: data.role, joinedAt: data.joinedAt
                    });
                }
            })
        );
    });
    await Promise.all(promises);

    return members.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.joinedAt - b.joinedAt;
    });
}

// ---------------------------------------------------------------------------
// Group Yaps (post-style content within groups)
// ---------------------------------------------------------------------------

async function postGroupYap(groupId, yapData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const memberSnap = await database.ref(`groupMembers/${groupId}/${user.uid}`).once('value');
    if (!memberSnap.exists()) throw new Error('Must be a member');

    const { content, mediaFiles, mediaUrls: providedUrls } = yapData;
    if (!content && !mediaFiles?.length && !providedUrls?.length)
        throw new Error('Please add text or images');
    if (content && content.length > 280)
        throw new Error('Must be 280 characters or less');

    let mediaUrls = [];
    if (providedUrls?.length > 0) {
        mediaUrls = providedUrls.map(item => typeof item === 'string' ? item : item.url);
    } else if (mediaFiles?.length > 0) {
        mediaUrls = await Promise.all(mediaFiles.map(file => {
            const ref = storage.ref(`group-yaps/yap_${Date.now()}_${file.name}`);
            return ref.put(file).then(s => s.ref.getDownloadURL());
        }));
    }

    const userSnap = await database.ref(`users/${user.uid}`).once('value');
    const userData = userSnap.val();

    const yapId = database.ref('groupYaps').push().key;
    const yap = {
        uid: user.uid,
        username: userData.username,
        displayName: userData.displayName || null,
        userPhotoURL: userData.photoURL || null,
        timestamp: Date.now(),
        likes: 0, reyaps: 0, replies: 0,
        groupId
    };
    if (content) yap.text = content;
    if (mediaUrls.length > 0) yap.media = mediaUrls;

    const updates = {};
    updates[`groupYaps/${groupId}/${yapId}`] = yap;
    updates[`yaps/${yapId}`] = { ...yap };
    await database.ref().update(updates);

    notifyGroupMembers(groupId, user.uid, yapId, 'new_yap');
    return yapId;
}

async function loadGroupYaps(groupId, limit = 50) {
    const snap = await database.ref(`groupYaps/${groupId}`)
        .orderByChild('timestamp').limitToLast(limit).once('value');
    if (!snap.exists()) return [];
    const yaps = [];
    snap.forEach(s => yaps.push({ id: s.key, ...s.val() }));
    return yaps.sort((a, b) => b.timestamp - a.timestamp);
}

// ---------------------------------------------------------------------------
// Group Real-Time Chat
// ---------------------------------------------------------------------------

async function sendGroupMessage(groupId, text, mediaUrls = []) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');
    if (!text?.trim() && mediaUrls.length === 0) return;

    const memberSnap = await database.ref(`groupMembers/${groupId}/${user.uid}`).once('value');
    if (!memberSnap.exists()) throw new Error('Must be a member');

    const userSnap = await database.ref(`users/${user.uid}`).once('value');
    const userData = userSnap.val();

    const msgData = {
        senderId: user.uid,
        senderName: userData.displayName || `@${userData.username}`,
        senderPhoto: userData.photoURL || null,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    if (text?.trim()) msgData.text = text.trim();
    if (mediaUrls.length > 0) msgData.media = mediaUrls;
    if (groupDisappearingTimer > 0) msgData.expiresAt = Date.now() + groupDisappearingTimer;

    await database.ref(`groupMessages/${groupId}`).push(msgData);

    // Update group last activity
    await database.ref(`groups/${groupId}/lastActivity`).set(firebase.database.ServerValue.TIMESTAMP);
}

function loadGroupChat(groupId, container) {
    if (!container) return;
    container.innerHTML = '<div class="messages-loading"><i class="fas fa-spinner fa-spin"></i> Loading chat\u2026</div>';

    // Cleanup previous listener
    if (groupChatListener) {
        database.ref(`groupMessages/${currentGroupId}`).off('child_added', groupChatListener);
        groupChatListener = null;
    }
    currentGroupId = groupId;

    const ref = database.ref(`groupMessages/${groupId}`);
    ref.orderByChild('timestamp').limitToLast(GROUP_MESSAGE_PAGE_SIZE).once('value').then(snap => {
        container.innerHTML = '';
        if (!snap.exists()) {
            container.innerHTML = '<div class="no-messages"><i class="fas fa-users"></i> No messages yet. Start the conversation!</div>';
        } else {
            snap.forEach(child => renderGroupMessage(container, child.key, child.val()));
        }
        requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
        startGroupExpiryCleanup();

        // Listen for new
        groupChatListener = ref.orderByChild('timestamp').startAt(Date.now()).on('child_added', (newSnap) => {
            renderGroupMessage(container, newSnap.key, newSnap.val());
            requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
        });
    }).catch(() => {
        container.innerHTML = '<div class="messages-error"><i class="fas fa-exclamation-triangle"></i> Failed to load chat</div>';
    });
}

function renderGroupMessage(container, key, msg) {
    if (container.querySelector(`[data-msg-key="${key}"]`)) return;
    const placeholder = container.querySelector('.no-messages');
    if (placeholder) placeholder.remove();

    // Skip expired messages
    if (msg.expiresAt && msg.expiresAt <= Date.now()) {
        if (currentGroupId) database.ref(`groupMessages/${currentGroupId}/${key}`).remove().catch(() => {});
        return;
    }

    const user = auth.currentUser;
    const isOwn = msg.senderId === user?.uid;
    const el = document.createElement('div');
    el.className = `message-bubble group-message ${isOwn ? 'message-own' : 'message-other'}${msg.expiresAt ? ' message-disappearing' : ''}`;
    el.dataset.msgKey = key;
    if (msg.expiresAt) el.dataset.expiresAt = msg.expiresAt;

    let html = '';
    if (!isOwn) {
        const avatar = msg.senderPhoto || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(msg.senderId)}`;
        html += `<div class="group-msg-sender">
            <img src="${avatar}" class="group-msg-avatar" loading="lazy" alt="">
            <span class="group-msg-name">${sanitizeText(msg.senderName)}</span>
        </div>`;
    }
    if (msg.text) html += `<div class="message-content">${linkifyGroupText(sanitizeText(msg.text))}</div>`;
    if (msg.media?.length > 0) {
        html += '<div class="message-media">';
        msg.media.forEach(item => {
            const url = typeof item === 'string' ? item : item.url;
            html += `<img src="${url}" alt="Media" class="message-image" loading="lazy">`;
        });
        html += '</div>';
    }
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    html += `<div class="message-footer">`;
    if (msg.expiresAt) {
        const remaining = msg.expiresAt - Date.now();
        html += `<span class="disappearing-indicator"><i class="fas fa-fire"></i> <span class="disappearing-badge">${formatGroupCountdown(remaining)}</span></span>`;
    }
    html += `<span class="message-time">${time}</span></div>`;

    el.innerHTML = html;
    container.appendChild(el);
}

function sanitizeText(text) {
    if (!text) return '';
    return window.utils?.sanitizeHTML
        ? window.utils.sanitizeHTML(text)
        : text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function linkifyGroupText(text) {
    return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>');
}

function cleanupGroupChat() {
    if (groupChatListener && currentGroupId) {
        database.ref(`groupMessages/${currentGroupId}`).off('child_added', groupChatListener);
        groupChatListener = null;
    }
    if (groupTypingListener) {
        groupTypingListener();
        groupTypingListener = null;
    }
    if (groupExpiryCleanupInterval) {
        clearInterval(groupExpiryCleanupInterval);
        groupExpiryCleanupInterval = null;
    }
    groupDisappearingTimer = 0;
}

// Group typing indicator
function setGroupTyping(groupId, isTyping) {
    const user = auth.currentUser;
    if (!user || !groupId) return;
    database.ref(`typing/group_${groupId}/${user.uid}`).set(isTyping ? true : null);
}

// ---------------------------------------------------------------------------
// Group Disappearing Messages
// ---------------------------------------------------------------------------

function formatGroupCountdown(ms) {
    if (ms <= 0) return '0s';
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.ceil(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.ceil(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.ceil(h / 24)}d`;
}

function toggleGroupDisappearingPicker(btnEl) {
    const existing = document.querySelector('.disappearing-picker');
    if (existing) { existing.remove(); return; }
    if (!btnEl) return;

    const picker = document.createElement('div');
    picker.className = 'disappearing-picker';

    GROUP_DISAPPEARING_OPTIONS.forEach(opt => {
        const item = document.createElement('button');
        item.className = `disappearing-option${groupDisappearingTimer === opt.value ? ' active' : ''}`;
        item.innerHTML = `<i class="fas ${opt.icon}"></i> ${opt.label}`;
        item.onclick = (e) => {
            e.stopPropagation();
            setGroupDisappearingTimer(opt.value, btnEl);
            picker.remove();
        };
        picker.appendChild(item);
    });

    const wrapper = btnEl.closest('.group-chat-input-wrapper') || btnEl.parentElement;
    wrapper.style.position = 'relative';
    wrapper.appendChild(picker);

    setTimeout(() => {
        document.addEventListener('click', function handler() { picker.remove(); document.removeEventListener('click', handler); }, { once: true });
    }, 10);
}

function setGroupDisappearingTimer(ms, btnEl) {
    groupDisappearingTimer = ms;
    if (!btnEl) return;
    if (ms > 0) {
        btnEl.classList.add('disappearing-active');
        btnEl.innerHTML = '<i class="fas fa-clock"></i>';
        const label = GROUP_DISAPPEARING_OPTIONS.find(o => o.value === ms)?.label || '';
        btnEl.title = `Disappearing: ${label}`;
        showSnackbar(`Group disappearing messages: ${label}`, 'success', 2000);
    } else {
        btnEl.classList.remove('disappearing-active');
        btnEl.innerHTML = '<i class="far fa-clock"></i>';
        btnEl.title = 'Disappearing messages';
        showSnackbar('Group disappearing messages off', 'default', 2000);
    }
}

function cleanupGroupExpiredMessages() {
    const now = Date.now();
    const container = document.getElementById('groupChatContainer');
    if (!container) return;
    container.querySelectorAll('.message-bubble[data-expires-at]').forEach(el => {
        const expiresAt = parseInt(el.dataset.expiresAt, 10);
        if (expiresAt && expiresAt <= now) {
            const key = el.dataset.msgKey;
            el.classList.add('message-expiring');
            setTimeout(() => {
                el.remove();
                if (currentGroupId && key) {
                    database.ref(`groupMessages/${currentGroupId}/${key}`).remove().catch(() => {});
                }
            }, 400);
        } else {
            const badge = el.querySelector('.disappearing-badge');
            if (badge) badge.textContent = formatGroupCountdown(expiresAt - now);
        }
    });
}

function startGroupExpiryCleanup() {
    if (groupExpiryCleanupInterval) clearInterval(groupExpiryCleanupInterval);
    groupExpiryCleanupInterval = setInterval(cleanupGroupExpiredMessages, 5000);
}

// ---------------------------------------------------------------------------
// Join Requests (private groups)
// ---------------------------------------------------------------------------

async function requestJoinGroup(groupId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');

    const groupSnap = await database.ref(`groups/${groupId}`).once('value');
    if (!groupSnap.exists()) throw new Error('Group not found');
    if (groupSnap.val().isPublic) return joinGroup(groupId);

    const memberSnap = await database.ref(`groupMembers/${groupId}/${user.uid}`).once('value');
    if (memberSnap.exists()) throw new Error('Already a member');

    const reqSnap = await database.ref(`groupJoinRequests/${groupId}/${user.uid}`).once('value');
    if (reqSnap.exists()) throw new Error('Request already pending');

    const userSnap = await database.ref(`users/${user.uid}`).once('value');
    const userData = userSnap.val();

    await database.ref(`groupJoinRequests/${groupId}/${user.uid}`).set({
        username: userData.username,
        displayName: userData.displayName || null,
        photoURL: userData.photoURL || null,
        requestedAt: Date.now(),
        status: 'pending'
    });

    notifyGroupAdmins(groupId, user.uid, 'join_request');
    showSnackbar('Join request sent!', 'success');
}

async function approveJoinRequest(groupId, userId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');
    await requireAdmin(groupId, user.uid);

    const groupSnap = await database.ref(`groups/${groupId}`).once('value');

    const updates = {};
    updates[`groupMembers/${groupId}/${userId}`] = { joinedAt: Date.now(), role: 'member' };
    updates[`userGroups/${userId}/${groupId}`] = true;
    updates[`groupJoinRequests/${groupId}/${userId}`] = null;
    await database.ref().update(updates);

    await database.ref(`groups/${groupId}/memberCount`).transaction(c => (c || 0) + 1);
    notifyUser(userId, 'join_request_approved', { groupId, groupName: groupSnap.val()?.name });
    showSnackbar('Request approved', 'success');
}

async function rejectJoinRequest(groupId, userId) {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in');
    await requireAdmin(groupId, user.uid);
    await database.ref(`groupJoinRequests/${groupId}/${userId}`).remove();
    showSnackbar('Request rejected', 'success');
}

async function loadJoinRequests(groupId) {
    const snap = await database.ref(`groupJoinRequests/${groupId}`).once('value');
    if (!snap.exists()) return [];
    const requests = [];
    snap.forEach(s => requests.push({ userId: s.key, ...s.val() }));
    return requests.sort((a, b) => b.requestedAt - a.requestedAt);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

async function searchGroups(query) {
    if (!query?.trim()) return loadPublicGroups();
    const term = query.toLowerCase().trim();
    const all = await loadPublicGroups(100);
    return all.filter(g =>
        (g.name || '').toLowerCase().includes(term) ||
        (g.topic || '').toLowerCase().includes(term) ||
        (g.description || '').toLowerCase().includes(term)
    );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function notifyGroupMembers(groupId, excludeUid, yapId, type) {
    try {
        const [membersSnap, groupSnap] = await Promise.all([
            database.ref(`groupMembers/${groupId}`).once('value'),
            database.ref(`groups/${groupId}`).once('value')
        ]);
        if (!membersSnap.exists()) return;
        const groupData = groupSnap.val();
        const updates = {};
        membersSnap.forEach(s => {
            if (s.key !== excludeUid) {
                const nid = database.ref('notifications').push().key;
                updates[`notifications/${s.key}/${nid}`] = {
                    type, from: excludeUid, groupId, groupName: groupData.name,
                    yapId, timestamp: Date.now(), read: false
                };
            }
        });
        if (Object.keys(updates).length > 0) await database.ref().update(updates);
    } catch { /* silent fail for notifications */ }
}

async function notifyGroupAdmins(groupId, userId, type) {
    try {
        const [membersSnap, groupSnap] = await Promise.all([
            database.ref(`groupMembers/${groupId}`).once('value'),
            database.ref(`groups/${groupId}`).once('value')
        ]);
        if (!membersSnap.exists()) return;
        const groupData = groupSnap.val();
        const updates = {};
        membersSnap.forEach(s => {
            if (s.val().role === 'admin') {
                const nid = database.ref('notifications').push().key;
                updates[`notifications/${s.key}/${nid}`] = {
                    type, from: userId, groupId, groupName: groupData.name,
                    timestamp: Date.now(), read: false
                };
            }
        });
        if (Object.keys(updates).length > 0) await database.ref().update(updates);
    } catch { /* silent */ }
}

async function notifyUser(userId, type, data) {
    try {
        const nid = database.ref('notifications').push().key;
        await database.ref(`notifications/${userId}/${nid}`).set({
            type, ...data, timestamp: Date.now(), read: false
        });
    } catch { /* silent */ }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
window.createGroup = createGroup;
window.joinGroup = joinGroup;
window.leaveGroup = leaveGroup;
window.joinGroupByInviteCode = joinGroupByInviteCode;
window.loadMyGroups = loadMyGroups;
window.loadPublicGroups = loadPublicGroups;
window.loadGroupMembers = loadGroupMembers;
window.deleteGroup = deleteGroup;
window.uploadGroupImage = uploadGroupImage;
window.updateGroupSettings = updateGroupSettings;
window.promoteMember = promoteMember;
window.demoteMember = demoteMember;
window.removeMember = removeMember;
window.postGroupYap = postGroupYap;
window.loadGroupYaps = loadGroupYaps;
window.sendGroupMessage = sendGroupMessage;
window.loadGroupChat = loadGroupChat;
window.cleanupGroupChat = cleanupGroupChat;
window.setGroupTyping = setGroupTyping;
window.toggleGroupDisappearingPicker = toggleGroupDisappearingPicker;
window.requestJoinGroup = requestJoinGroup;
window.approveJoinRequest = approveJoinRequest;
window.rejectJoinRequest = rejectJoinRequest;
window.loadJoinRequests = loadJoinRequests;
window.searchGroups = searchGroups;
