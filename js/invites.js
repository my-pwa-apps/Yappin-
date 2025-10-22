/**
 * Invites Module
 * Handles email-based invite system with unique signup links
 */

import { showSnackbar } from './ui.js';

// Constants
const INVITE_CODE_LENGTH = 16; // Longer for security
const MAX_INVITES_PER_USER = 10;

/**
 * Generate a cryptographically secure invite token
 */
function generateInviteToken() {
    const array = new Uint8Array(INVITE_CODE_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate email address format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Send email invites to one or more addresses
 */
export async function sendEmailInvites() {
    if (typeof auth === 'undefined' || !auth.currentUser) {
        showSnackbar('Please sign in to send invites', 'error');
        return;
    }

    const emailInput = document.getElementById('inviteEmailInput');
    if (!emailInput) return;
    
    const emailsText = emailInput.value.trim();
    if (!emailsText) {
        showSnackbar('Please enter at least one email address', 'error');
        return;
    }
    
    // Parse emails (comma or newline separated)
    const emails = emailsText.split(/[,\n]+/).map(e => e.trim()).filter(e => e.length > 0);
    
    // Validate all emails
    const invalidEmails = emails.filter(email => !isValidEmail(email));
    if (invalidEmails.length > 0) {
        showSnackbar(`Invalid email(s): ${invalidEmails.join(', ')}`, 'error');
        return;
    }
    
    if (emails.length === 0) {
        showSnackbar('Please enter at least one email address', 'error');
        return;
    }
    
    const uid = auth.currentUser.uid;
    
    try {
        // Check total invites sent by user
        const userInvitesSnapshot = await database.ref(`invites`).orderByChild('createdBy').equalTo(uid).once('value');
        const existingInvites = userInvitesSnapshot.val();
        const inviteCount = existingInvites ? Object.keys(existingInvites).length : 0;
        
        const availableSlots = MAX_INVITES_PER_USER - inviteCount;
        
        if (emails.length > availableSlots) {
            showSnackbar(`You can only send ${availableSlots} more invite(s). Maximum ${MAX_INVITES_PER_USER} total.`, 'error');
            return;
        }
        
        // Get current user info
        const userSnapshot = await database.ref(`users/${uid}`).once('value');
        const userData = userSnapshot.val();
        const inviterName = userData?.displayName || userData?.username || 'A friend';
        
        // Show loading state
        const sendBtn = document.getElementById('sendInvitesBtn');
        const originalBtnText = sendBtn?.innerHTML;
        if (sendBtn) sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        // Create invites for each email
        const invitePromises = emails.map(async (email) => {
            const token = generateInviteToken();
            const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${token}`;
            
            const inviteData = {
                token: token,
                email: email.toLowerCase(),
                createdBy: uid,
                inviterName: inviterName,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                used: false,
                usedBy: null,
                usedAt: null,
                inviteUrl: inviteUrl
            };
            
            await database.ref(`invites/${token}`).set(inviteData);
            
            // In a real app, you'd send the email here via a Cloud Function
            // For now, we'll just store it and show the link
            console.log(`[Invites] Invite created for ${email}: ${inviteUrl}`);
            
            return { email, inviteUrl };
        });
        
        await Promise.all(invitePromises);
        
        // Reset button
        if (sendBtn) sendBtn.innerHTML = originalBtnText;
        
        // Clear input
        emailInput.value = '';
        
        showSnackbar(`${emails.length} invite(s) sent successfully!`, 'success');
        loadInviteCodes(); // Reload to show sent invites
        
    } catch (error) {
        console.error('[Invites] Error sending invites:', error);
        showSnackbar('Failed to send invites', 'error');
        
        // Reset button on error
        const sendBtn = document.getElementById('sendInvitesBtn');
        if (sendBtn) sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Invites';
    }
}

/**
 * Load sent invites for current user
 */
export async function loadInviteCodes() {
    const inviteCodesList = document.getElementById('inviteCodesList');
    if (!inviteCodesList) return;
    
    if (typeof auth === 'undefined' || !auth.currentUser) {
        inviteCodesList.innerHTML = '<p class="no-results">Please sign in to view invites</p>';
        return;
    }
    
    const uid = auth.currentUser.uid;
    
    try {
        inviteCodesList.innerHTML = '<p class="loading-text">Loading sent invites...</p>';
        
        const snapshot = await database.ref('invites').orderByChild('createdBy').equalTo(uid).once('value');
        const invites = snapshot.val();
        
        if (!invites || Object.keys(invites).length === 0) {
            inviteCodesList.innerHTML = '<p class="no-results">No invites sent yet. Enter email addresses above to invite friends!</p>';
            return;
        }
        
        inviteCodesList.innerHTML = '';
        
        // Add header with remaining invites
        const inviteCount = Object.keys(invites).length;
        const remaining = MAX_INVITES_PER_USER - inviteCount;
        const headerDiv = document.createElement('div');
        headerDiv.className = 'invites-header';
        headerDiv.innerHTML = `
            <p class="invites-summary">
                <strong>${inviteCount}</strong> of <strong>${MAX_INVITES_PER_USER}</strong> invites sent
                ${remaining > 0 ? `(<span class="text-success">${remaining} remaining</span>)` : ''}
            </p>
        `;
        inviteCodesList.appendChild(headerDiv);
        
        // Convert to array and sort by creation date (newest first)
        const invitesArray = Object.values(invites).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        invitesArray.forEach(invite => {
            const inviteElement = document.createElement('div');
            inviteElement.className = 'invite-code-item';
            
            const statusClass = invite.used ? 'used' : 'pending';
            const statusText = invite.used ? 'Accepted' : 'Pending';
            
            let usageInfo = '';
            if (invite.used && invite.usedBy) {
                const usedDate = invite.usedAt ? new Date(invite.usedAt).toLocaleDateString() : 'Unknown';
                usageInfo = `<p class="invite-usage"><i class="fas fa-check-circle"></i> Accepted by @${invite.usedBy} on ${usedDate}</p>`;
            }
            
            const createdDate = invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : 'Unknown';
            
            inviteElement.innerHTML = `
                <div class="invite-code-header">
                    <span class="invite-email"><i class="fas fa-envelope"></i> ${invite.email}</span>
                    <span class="invite-code-status ${statusClass}">${statusText}</span>
                </div>
                <p class="invite-created-date">Sent: ${createdDate}</p>
                ${usageInfo}
                ${!invite.used ? `
                    <button class="btn btn-copy btn-sm" data-url="${invite.inviteUrl}">
                        <i class="fas fa-copy"></i> Copy Invite Link
                    </button>
                ` : ''}
            `;
            
            inviteCodesList.appendChild(inviteElement);
            
            // Add copy functionality for invite URL
            if (!invite.used) {
                const copyBtn = inviteElement.querySelector('.btn-copy');
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => copyInviteLink(invite.inviteUrl));
                }
            }
        });
        
    } catch (error) {
        console.error('[Invites] Error loading invites:', error);
        inviteCodesList.innerHTML = '<p class="error-text">Failed to load invites</p>';
    }
}

/**
 * Copy invite link to clipboard
 */
export async function copyInviteLink(url) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            showSnackbar('Invite link copied to clipboard!', 'success');
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                showSnackbar('Invite link copied!', 'success');
            } catch (err) {
                console.error('[Invites] Fallback copy failed:', err);
                showSnackbar('Failed to copy link', 'error');
            }
            
            document.body.removeChild(textArea);
        }
    } catch (error) {
        console.error('[Invites] Error copying invite link:', error);
        showSnackbar('Failed to copy link', 'error');
    }
}

/**
 * Legacy function for backward compatibility
 */
export async function copyInviteCode(code) {
    return copyInviteLink(code);
}

/**
 * Validate an invite token from URL parameter
 */
export async function validateInviteToken(token) {
    if (!token || token.trim().length === 0) {
        return { valid: false, error: 'Invalid invite link' };
    }
    
    try {
        const snapshot = await database.ref(`invites/${token}`).once('value');
        
        if (!snapshot.exists()) {
            return { valid: false, error: 'Invalid or expired invite link' };
        }
        
        const inviteData = snapshot.val();
        
        if (inviteData.used) {
            return { valid: false, error: 'This invite has already been used' };
        }
        
        return { 
            valid: true, 
            token: token,
            email: inviteData.email,
            inviterName: inviteData.inviterName
        };
        
    } catch (error) {
        console.error('[Invites] Error validating invite token:', error);
        return { valid: false, error: 'Failed to validate invite. Please try again.' };
    }
}

/**
 * Check for invite token in URL and pre-fill signup
 */
export function checkInviteToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    
    if (inviteToken) {
        // Store in sessionStorage for signup process
        sessionStorage.setItem('inviteToken', inviteToken);
        
        // Validate and show welcome message
        validateInviteToken(inviteToken).then(result => {
            if (result.valid) {
                const signupEmail = document.getElementById('signupEmail');
                if (signupEmail && result.email) {
                    signupEmail.value = result.email;
                    signupEmail.readOnly = true; // Lock email to invited address
                }
                
                showSnackbar(`Welcome! You've been invited by ${result.inviterName}`, 'success', 5000);
                
                // Switch to signup tab if exists
                const signupTab = document.getElementById('signupTab');
                if (signupTab) signupTab.click();
            } else {
                showSnackbar(result.error, 'error');
                sessionStorage.removeItem('inviteToken');
            }
        });
    }
}

/**
 * Mark an invite as used
 */
export async function markInviteAsUsed(token, username) {
    if (!token || !username) return;
    
    try {
        await database.ref(`invites/${token}`).update({
            used: true,
            usedBy: username,
            usedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        console.log('[Invites] Invite marked as used:', token);
        
    } catch (error) {
        console.error('[Invites] Error marking invite as used:', error);
    }
}

/**
 * Legacy function for backward compatibility
 */
export async function markInviteCodeAsUsed(code, username) {
    return markInviteAsUsed(code, username);
}

/**
 * Initialize invite system event listeners
 */
export function initializeInvites() {
    // Send invites button
    const sendBtn = document.getElementById('sendInvitesBtn');
    if (sendBtn) {
        sendBtn.removeAttribute('onclick');
        sendBtn.addEventListener('click', sendEmailInvites);
    }
    
    // Check for invite token in URL
    checkInviteToken();
    
    console.log('[Invites] Module initialized');
}

// Backward compatibility - expose functions globally
window.sendEmailInvites = sendEmailInvites;
window.loadInviteCodes = loadInviteCodes;
window.copyInviteLink = copyInviteLink;
window.copyInviteCode = copyInviteCode;
window.validateInviteToken = validateInviteToken;
window.checkInviteToken = checkInviteToken;
window.markInviteAsUsed = markInviteAsUsed;
window.markInviteCodeAsUsed = markInviteCodeAsUsed;
window.initializeInvites = initializeInvites;

console.log('[Invites] Module loaded');
