// UI Utility Functions
// Reusable functions for UI operations

/**
 * Show a snackbar notification
 * Already exists as global function, but documented here for reference
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', or 'default'
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
// window.showSnackbar = function(message, type = 'default', duration = 3000) { ... }

/**
 * Toggle modal visibility
 * @param {HTMLElement} modal - The modal element
 * @param {boolean} show - True to show, false to hide
 */
function toggleModal(modal, show) {
    if (!modal) return;
    
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Add animation
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            setTimeout(() => {
                modalContent.style.transform = 'translateY(0)';
                modalContent.style.opacity = '1';
            }, 10);
        }
    } else {
        modal.classList.remove('show');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Reset animation
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = '';
            modalContent.style.opacity = '';
        }
    }
}

/**
 * Close a modal by ID
 * @param {string} modalId - The modal ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        toggleModal(modal, false);
    }
}

/**
 * Open a modal by ID
 * @param {string} modalId - The modal ID
 * @param {Function} onOpen - Optional callback after opening
 */
function openModal(modalId, onOpen = null) {
    const modal = document.getElementById(modalId);
    if (modal) {
        toggleModal(modal, true);
        if (onOpen && typeof onOpen === 'function') {
            onOpen(modal);
        }
    }
}

/**
 * Show confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmText - Confirm button text (default: "Confirm")
 * @param {string} cancelText - Cancel button text (default: "Cancel")
 * @returns {Promise<boolean>} - True if confirmed, false if cancelled
 */
function showConfirmDialog(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const confirmBtn = document.getElementById('confirmModalConfirm');
        const cancelBtn = document.getElementById('confirmModalCancel');
        
        if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
            console.error('Confirm modal elements not found');
            resolve(false);
            return;
        }
        
        // Set content
        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        
        // Event handlers
        const handleConfirm = () => {
            cleanup();
            toggleModal(modal, false);
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            toggleModal(modal, false);
            resolve(false);
        };
        
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        
        // Show modal
        toggleModal(modal, true);
    });
}

/**
 * Clear textarea and related UI elements
 * @param {string} textareaId - The textarea ID
 * @param {string} imagePreviewId - The image preview container ID (optional)
 * @param {string} checkboxId - The checkbox ID (optional)
 */
function clearComposeArea(textareaId, imagePreviewId = null, checkboxId = null) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        textarea.value = '';
        delete textarea.dataset.replyTo;
    }
    
    if (imagePreviewId) {
        const imagePreview = document.getElementById(imagePreviewId);
        if (imagePreview) {
            imagePreview.innerHTML = '';
            imagePreview.classList.add('hidden');
        }
    }
    
    if (checkboxId) {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.checked = true;
        }
    }
    
    // Update character count if function exists
    if (typeof updateCharacterCount === 'function') {
        updateCharacterCount();
    }
}

/**
 * Clear reply context and UI
 */
function clearReplyContext() {
    // Clear global reply context
    window.replyContext = null;
    
    // Hide reply indicator
    const replyIndicator = document.getElementById('replyIndicator');
    if (replyIndicator) {
        replyIndicator.style.display = 'none';
        replyIndicator.innerHTML = '';
    }
    
    // Clear textarea dataset
    const textareas = ['yapText', 'modalYapText'];
    textareas.forEach(id => {
        const textarea = document.getElementById(id);
        if (textarea) {
            delete textarea.dataset.replyTo;
            // Clear mention if it was auto-added for reply
            if (textarea.value.startsWith('@')) {
                textarea.value = '';
            }
        }
    });
    
    // Update character count
    if (typeof updateCharacterCount === 'function') {
        updateCharacterCount();
    }
}

/**
 * Set up reply context and UI
 * @param {string} yapId - Parent yap ID
 * @param {string} username - Parent yap author username
 * @param {string} content - Parent yap content (truncated for display)
 * @param {string} textareaId - Textarea ID to focus
 */
function setupReplyContext(yapId, username, content, textareaId = 'modalYapText') {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
        console.error('Textarea not found:', textareaId);
        return;
    }
    
    // Store reply context
    window.replyContext = {
        yapId: yapId,
        username: username
    };
    
    // Pre-fill with @username mention
    textarea.value = `@${username} `;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    
    // Update character count
    if (typeof updateCharacterCount === 'function') {
        updateCharacterCount();
    }
    
    // Show reply indicator
    let replyIndicator = document.getElementById('replyIndicator');
    if (!replyIndicator) {
        replyIndicator = document.createElement('div');
        replyIndicator.id = 'replyIndicator';
        replyIndicator.style.cssText = 'padding: 8px 12px; margin-bottom: 8px; background: var(--bg-secondary); border-radius: 8px; font-size: 14px; color: var(--text-secondary);';
        textarea.parentElement.insertBefore(replyIndicator, textarea);
    }
    
    const truncatedContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
    replyIndicator.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>Replying to @${username}: "${truncatedContent}"</span>
            <button onclick="window.uiUtils.clearReplyContext()" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    replyIndicator.style.display = 'block';
}

/**
 * Show loading spinner in container
 * @param {HTMLElement|string} container - Container element or ID
 * @param {string} message - Optional loading message
 */
function showLoadingSpinner(container, message = 'Loading...') {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;
    
    el.innerHTML = `
        <div class="loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px;">
            <div class="loading-spinner" style="width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 16px; color: var(--text-secondary);">${message}</p>
        </div>
    `;
}

/**
 * Show empty state message in container
 * @param {HTMLElement|string} container - Container element or ID
 * @param {string} message - Empty state message
 * @param {string} icon - Font Awesome icon class (optional)
 */
function showEmptyState(container, message, icon = null) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;
    
    const iconHtml = icon ? `<i class="${icon}" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px;"></i>` : '';
    
    el.innerHTML = `
        <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
            ${iconHtml}
            <p style="color: var(--text-secondary); font-size: 16px;">${message}</p>
        </div>
    `;
}

/**
 * Show error message in container
 * @param {HTMLElement|string} container - Container element or ID
 * @param {string} message - Error message
 */
function showError(container, message) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;
    
    el.innerHTML = `
        <div class="error-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: var(--error-color, #f56565); margin-bottom: 16px;"></i>
            <p style="color: var(--text-secondary); font-size: 16px;">${message}</p>
        </div>
    `;
}

// Export all functions
if (typeof window !== 'undefined') {
    window.uiUtils = {
        toggleModal,
        closeModal,
        openModal,
        showConfirmDialog,
        clearComposeArea,
        clearReplyContext,
        setupReplyContext,
        showLoadingSpinner,
        showEmptyState,
        showError
    };
}
