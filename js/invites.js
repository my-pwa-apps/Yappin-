/**
 * Invites Module
 * Handles invite code generation, management, and validation
 */

import { showSnackbar } from './ui.js';

// Constants
const INVITE_CODE_LENGTH = 8;
const MAX_INVITES_PER_USER = 10;

/**
 * Generate a random invite code
 */
function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking characters
    let code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generate a new invite code for current user
 */
export async function generateNewInviteCode() {
    if (typeof auth === 'undefined' || !auth.currentUser) {
        showSnackbar('Please sign in to generate invite codes', 'error');
        return;
    }

    const uid = auth.currentUser.uid;
    
    try {
        // Check how many invite codes the user already has
        const userCodesSnapshot = await database.ref(`inviteCodes`).orderByChild('createdBy').equalTo(uid).once('value');
        const existingCodes = userCodesSnapshot.val();
        const codeCount = existingCodes ? Object.keys(existingCodes).length : 0;
        
        if (codeCount >= MAX_INVITES_PER_USER) {
            showSnackbar(`Maximum ${MAX_INVITES_PER_USER} invite codes allowed`, 'error');
            return;
        }
        
        // Generate unique code
        let code = generateRandomCode();
        let codeExists = true;
        
        // Check if code already exists (very unlikely but possible)
        while (codeExists) {
            const codeSnapshot = await database.ref(`inviteCodes/${code}`).once('value');
            if (!codeSnapshot.exists()) {
                codeExists = false;
            } else {
                code = generateRandomCode();
            }
        }
        
        // Create the invite code
        const inviteData = {
            code: code,
            createdBy: uid,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            used: false,
            usedBy: null,
            usedAt: null
        };
        
        await database.ref(`inviteCodes/${code}`).set(inviteData);
        
        showSnackbar('Invite code generated!', 'success');
        loadInviteCodes(); // Reload the list
        
    } catch (error) {
        console.error('[Invites] Error generating invite code:', error);
        showSnackbar('Failed to generate invite code', 'error');
    }
}

/**
 * Load invite codes for current user
 */
export async function loadInviteCodes() {
    const inviteCodesList = document.getElementById('inviteCodesList');
    if (!inviteCodesList) return;
    
    if (typeof auth === 'undefined' || !auth.currentUser) {
        inviteCodesList.innerHTML = '<p class="no-results">Please sign in to view invite codes</p>';
        return;
    }
    
    const uid = auth.currentUser.uid;
    
    try {
        inviteCodesList.innerHTML = '<p class="loading-text">Loading invite codes...</p>';
        
        const snapshot = await database.ref('inviteCodes').orderByChild('createdBy').equalTo(uid).once('value');
        const codes = snapshot.val();
        
        if (!codes || Object.keys(codes).length === 0) {
            inviteCodesList.innerHTML = '<p class="no-results">No invite codes yet. Generate one to invite friends!</p>';
            return;
        }
        
        inviteCodesList.innerHTML = '';
        
        // Convert to array and sort by creation date (newest first)
        const codesArray = Object.values(codes).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        codesArray.forEach(invite => {
            const inviteElement = document.createElement('div');
            inviteElement.className = 'invite-code-item';
            
            const statusClass = invite.used ? 'used' : 'available';
            const statusText = invite.used ? 'Used' : 'Available';
            
            let usageInfo = '';
            if (invite.used && invite.usedBy) {
                usageInfo = `<p class="invite-usage">Used by: @${invite.usedBy}</p>`;
            }
            
            const createdDate = invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : 'Unknown';
            
            inviteElement.innerHTML = `
                <div class="invite-code-header">
                    <span class="invite-code-value">${invite.code}</span>
                    <span class="invite-code-status ${statusClass}">${statusText}</span>
                </div>
                <p class="invite-created-date">Created: ${createdDate}</p>
                ${usageInfo}
                ${!invite.used ? `
                    <button class="btn btn-copy" data-code="${invite.code}">
                        <i class="fas fa-copy"></i> Copy Code
                    </button>
                ` : ''}
            `;
            
            inviteCodesList.appendChild(inviteElement);
            
            // Add copy functionality
            if (!invite.used) {
                const copyBtn = inviteElement.querySelector('.btn-copy');
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => copyInviteCode(invite.code));
                }
            }
        });
        
    } catch (error) {
        console.error('[Invites] Error loading invite codes:', error);
        inviteCodesList.innerHTML = '<p class="error-text">Failed to load invite codes</p>';
    }
}

/**
 * Copy invite code to clipboard
 */
export async function copyInviteCode(code) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(code);
            showSnackbar('Invite code copied to clipboard!', 'success');
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                showSnackbar('Invite code copied!', 'success');
            } catch (err) {
                console.error('[Invites] Fallback copy failed:', err);
                showSnackbar('Failed to copy code', 'error');
            }
            
            document.body.removeChild(textArea);
        }
    } catch (error) {
        console.error('[Invites] Error copying invite code:', error);
        showSnackbar('Failed to copy code', 'error');
    }
}

/**
 * Validate an invite code during signup
 */
export async function validateInviteCode(code) {
    if (!code || code.trim().length === 0) {
        return { valid: false, error: 'Please enter an invite code' };
    }
    
    const normalizedCode = code.trim().toUpperCase();
    
    try {
        const snapshot = await database.ref(`inviteCodes/${normalizedCode}`).once('value');
        
        if (!snapshot.exists()) {
            return { valid: false, error: 'Invalid invite code' };
        }
        
        const inviteData = snapshot.val();
        
        if (inviteData.used) {
            return { valid: false, error: 'This invite code has already been used' };
        }
        
        return { valid: true, code: normalizedCode };
        
    } catch (error) {
        console.error('[Invites] Error validating invite code:', error);
        return { valid: false, error: 'Failed to validate invite code. Please try again.' };
    }
}

/**
 * Mark an invite code as used
 */
export async function markInviteCodeAsUsed(code, username) {
    if (!code || !username) return;
    
    try {
        await database.ref(`inviteCodes/${code}`).update({
            used: true,
            usedBy: username,
            usedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        console.log('[Invites] Invite code marked as used:', code);
        
    } catch (error) {
        console.error('[Invites] Error marking invite code as used:', error);
    }
}

/**
 * Initialize invite system event listeners
 */
export function initializeInvites() {
    // Generate invite code button
    const generateBtn = document.querySelector('.generate-invite-btn');
    if (generateBtn) {
        // Remove onclick attribute if exists
        generateBtn.removeAttribute('onclick');
        generateBtn.addEventListener('click', generateNewInviteCode);
    }
    
    console.log('[Invites] Module initialized');
}

// Backward compatibility - expose functions globally
window.generateNewInviteCode = generateNewInviteCode;
window.loadInviteCodes = loadInviteCodes;
window.copyInviteCode = copyInviteCode;
window.validateInviteCode = validateInviteCode;
window.markInviteCodeAsUsed = markInviteCodeAsUsed;
window.initializeInvites = initializeInvites;

console.log('[Invites] Module loaded');
