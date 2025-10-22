// UI Utilities Module
// Handles snackbar notifications, modals, and UI helper functions

// Utility function to show snackbar notifications
export function showSnackbar(message, type = 'default', duration = 3000) {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        (window.PerformanceUtils?.Logger || console).warn('Snackbar element not found');
        return;
    }
    
    // Clear any existing classes and add new ones
    snackbar.className = '';
    snackbar.classList.add('show');
    if (type) snackbar.classList.add(type);
    
    // Set the message
    snackbar.textContent = message;
    
    // Hide after specified duration
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, duration);
}

// Make globally available for backwards compatibility
window.showSnackbar = showSnackbar;

// Utility function to toggle modal visibility
export function toggleModal(modal, isVisible) {
    if (isVisible) {
        // Don't just remove 'hidden', add 'show' for transition effects
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
        document.body.style.overflow = 'hidden';
        
        // Focus the textarea
        const textarea = modal.querySelector('textarea');
        if (textarea) {
            textarea.focus();
        }
    } else {
        // Hide modal
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 200);
        document.body.style.overflow = '';
    }
}

// Initialize tooltips - Convert title to data-tooltip for Material Design tooltips
export function initializeTooltips() {
    convertTitlesToTooltips(document);
}

// Convert title attributes to data-tooltip
export function convertTitlesToTooltips(root = document) {
    const elements = root.querySelectorAll('[title]:not([data-tooltip])');
    elements.forEach(element => {
        const title = element.getAttribute('title');
        if (title && title.trim()) {
            element.setAttribute('data-tooltip', title);
        }
    });
}

// Make globally available
window.convertTitlesToTooltips = convertTitlesToTooltips;

// Show/hide element utilities
export function show(element) {
    if (element) element.classList.remove('hidden');
}

export function hide(element) {
    if (element) element.classList.add('hidden');
}

export function toggle(element) {
    if (element) element.classList.toggle('hidden');
}
