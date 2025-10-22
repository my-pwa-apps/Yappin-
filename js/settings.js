/**
 * Settings Module
 * Handles the comprehensive settings modal with tabs for Profile, Social, and App settings
 */

import { toggleModal, showSnackbar } from './ui.js';
import { showFollowers, showFollowing, showFollowRequests, showInviteCodes } from './modals.js';
import { updateDisplayName, selectProfilePicture, uploadProfilePicture } from './profile.js';

// Settings state
let currentTab = 'profile';
let autoHideEnabled = localStorage.getItem('autoHideEnabled') === 'true';

/**
 * Initialize settings modal
 */
export function initializeSettings() {
    const settingsModal = document.getElementById('settingsModal');
    const tabs = document.querySelectorAll('.settings-tab');
    const closeBtn = document.getElementById('closeSettingsBtn');
    
    if (!settingsModal) {
        console.error('[Settings] Settings modal not found');
        return;
    }

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettings);
    }

    // Profile tab event listeners
    setupProfileTab();
    
    // Social tab event listeners
    setupSocialTab();
    
    // App tab event listeners
    setupAppTab();

    // Load saved settings
    loadSettings();

    console.log('[Settings] Settings module initialized');
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.settings-tab-content').forEach(content => {
        content.classList.remove('active');
        content.classList.add('hidden');
    });
    
    const activeContent = document.getElementById(`${tabName}Tab`);
    if (activeContent) {
        activeContent.classList.remove('hidden');
        activeContent.classList.add('active');
    }
}

/**
 * Setup Profile Tab event listeners
 */
function setupProfileTab() {
    const saveDisplayNameBtn = document.getElementById('saveDisplayNameBtn');
    const selectPictureBtn = document.getElementById('selectPictureBtn');
    const uploadPictureBtn = document.getElementById('uploadProfilePictureBtn');
    const requireApprovalCheckbox = document.getElementById('requireApprovalCheckbox');
    const neverAllowReyapsCheckbox = document.getElementById('neverAllowReyapsCheckbox');
    const logoutBtn = document.getElementById('logoutBtn');

    if (saveDisplayNameBtn) {
        saveDisplayNameBtn.addEventListener('click', updateDisplayName);
    }
    
    if (selectPictureBtn) {
        selectPictureBtn.addEventListener('click', selectProfilePicture);
    }
    
    if (uploadPictureBtn) {
        uploadPictureBtn.addEventListener('click', uploadProfilePicture);
    }
    
    if (requireApprovalCheckbox) {
        requireApprovalCheckbox.addEventListener('change', toggleAccountPrivacy);
    }
    
    if (neverAllowReyapsCheckbox) {
        neverAllowReyapsCheckbox.addEventListener('change', toggleReyapPermission);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof logout === 'function') {
                logout();
            } else if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().signOut();
            }
        });
    }
}

/**
 * Setup Social Tab event listeners
 */
function setupSocialTab() {
    const showFollowersBtn = document.getElementById('showFollowersBtn');
    const showFollowingBtn = document.getElementById('showFollowingBtn');
    const showFollowRequestsBtn = document.getElementById('showFollowRequestsBtn');
    const showInviteCodesBtn = document.getElementById('showInviteCodesBtn');

    if (showFollowersBtn) {
        showFollowersBtn.addEventListener('click', () => {
            closeSettings();
            showFollowers();
        });
    }
    
    if (showFollowingBtn) {
        showFollowingBtn.addEventListener('click', () => {
            closeSettings();
            showFollowing();
        });
    }
    
    if (showFollowRequestsBtn) {
        showFollowRequestsBtn.addEventListener('click', () => {
            closeSettings();
            showFollowRequests();
        });
    }
    
    if (showInviteCodesBtn) {
        showInviteCodesBtn.addEventListener('click', () => {
            closeSettings();
            showInviteCodes();
        });
    }
}

/**
 * Setup App Tab event listeners
 */
function setupAppTab() {
    const languageSelect = document.getElementById('languageSelect');
    const darkModeCheckbox = document.getElementById('darkModeToggleCheckbox');
    const autoHideCheckbox = document.getElementById('autoHideCheckbox');
    const pushNotificationsCheckbox = document.getElementById('pushNotificationsCheckbox');

    if (languageSelect) {
        // Set current language
        if (typeof window.getCurrentLanguage === 'function') {
            languageSelect.value = window.getCurrentLanguage();
        }
        languageSelect.addEventListener('change', changeLanguage);
    }
    
    if (darkModeCheckbox) {
        darkModeCheckbox.addEventListener('change', toggleDarkMode);
    }
    
    if (autoHideCheckbox) {
        autoHideCheckbox.addEventListener('change', toggleAutoHide);
    }
    
    if (pushNotificationsCheckbox) {
        pushNotificationsCheckbox.addEventListener('change', togglePushNotifications);
    }
}

/**
 * Open settings modal
 */
export function showSettings(tab = 'profile') {
    const settingsModal = document.getElementById('settingsModal');
    if (!settingsModal) return;
    
    // Switch to requested tab
    switchTab(tab);
    
    // Show modal
    toggleModal(settingsModal, true);
    
    // Load current user data
    loadUserData();
}

/**
 * Close settings modal
 */
export function closeSettings() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        toggleModal(settingsModal, false);
    }
}

/**
 * Load user data into the profile form
 */
function loadUserData() {
    if (typeof auth === 'undefined' || !auth.currentUser) return;
    
    const user = auth.currentUser;
    const uid = user.uid;
    
    // Load display name, username, and photoURL separately to avoid permission issues
    Promise.all([
        database.ref(`users/${uid}/displayName`).once('value'),
        database.ref(`users/${uid}/username`).once('value'),
        database.ref(`users/${uid}/photoURL`).once('value'),
        database.ref(`users/${uid}/requireApproval`).once('value'),
        database.ref(`users/${uid}/neverAllowReyaps`).once('value')
    ]).then(([displayNameSnap, usernameSnap, photoSnap, requireApprovalSnap, neverAllowReyapsSnap]) => {
        const displayNameInput = document.getElementById('displayNameInput');
        const usernameDisplay = document.getElementById('usernameDisplay');
        const profilePicturePreview = document.getElementById('profilePicturePreview');
        const requireApprovalCheckbox = document.getElementById('requireApprovalCheckbox');
        const neverAllowReyapsCheckbox = document.getElementById('neverAllowReyapsCheckbox');
        
        if (displayNameInput) {
            displayNameInput.value = displayNameSnap.val() || '';
        }
        
        if (usernameDisplay) {
            usernameDisplay.value = usernameSnap.val() || '';
        }
        
        if (profilePicturePreview) {
            const photoURL = photoSnap.val();
            if (photoURL) {
                profilePicturePreview.src = photoURL;
            } else {
                // Use default avatar or generate one
                profilePicturePreview.src = './images/default-avatar.svg';
            }
        }
        
        if (requireApprovalCheckbox) {
            requireApprovalCheckbox.checked = requireApprovalSnap.val() || false;
        }
        
        if (neverAllowReyapsCheckbox) {
            neverAllowReyapsCheckbox.checked = neverAllowReyapsSnap.val() || false;
        }
    }).catch(error => {
        console.error('[Settings] Error loading user data:', error);
    });
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    // Load dark mode setting
    const darkModeCheckbox = document.getElementById('darkModeToggleCheckbox');
    if (darkModeCheckbox) {
        const isDarkMode = document.body.classList.contains('dark-mode');
        darkModeCheckbox.checked = isDarkMode;
    }
    
    // Load auto-hide setting
    const autoHideCheckbox = document.getElementById('autoHideCheckbox');
    if (autoHideCheckbox) {
        autoHideCheckbox.checked = autoHideEnabled;
    }
    
    // Apply auto-hide if enabled
    if (autoHideEnabled) {
        enableAutoHide();
    }
    
    // Load push notifications setting
    const pushNotificationsCheckbox = document.getElementById('pushNotificationsCheckbox');
    if (pushNotificationsCheckbox) {
        const pushEnabled = localStorage.getItem('pushNotificationsEnabled') === 'true';
        pushNotificationsCheckbox.checked = pushEnabled;
    }
}

/**
 * Toggle account privacy
 */
function toggleAccountPrivacy() {
    if (typeof auth === 'undefined' || !auth.currentUser) return;
    
    const checkbox = document.getElementById('requireApprovalCheckbox');
    const requireApproval = checkbox.checked;
    const uid = auth.currentUser.uid;
    
    database.ref(`users/${uid}/requireApproval`).set(requireApproval)
        .then(() => {
            showSnackbar(requireApproval ? 'Account is now private' : 'Account is now public', 'success');
        })
        .catch(error => {
            console.error('[Settings] Error updating privacy:', error);
            showSnackbar('Failed to update privacy setting', 'error');
            checkbox.checked = !requireApproval;
        });
}

/**
 * Toggle reyap permission
 */
function toggleReyapPermission() {
    if (typeof auth === 'undefined' || !auth.currentUser) return;
    
    const checkbox = document.getElementById('neverAllowReyapsCheckbox');
    const neverAllowReyaps = checkbox.checked;
    const uid = auth.currentUser.uid;
    
    database.ref(`users/${uid}/neverAllowReyaps`).set(neverAllowReyaps)
        .then(() => {
            showSnackbar(neverAllowReyaps ? 'Reyaps disabled on your posts' : 'Reyaps enabled on your posts', 'success');
        })
        .catch(error => {
            console.error('[Settings] Error updating reyap permission:', error);
            showSnackbar('Failed to update reyap setting', 'error');
            checkbox.checked = !neverAllowReyaps;
        });
}

/**
 * Change language
 */
function changeLanguage() {
    const languageSelect = document.getElementById('languageSelect');
    const selectedLang = languageSelect.value;
    
    if (typeof window.setLanguage === 'function') {
        window.setLanguage(selectedLang);
        showSnackbar(selectedLang === 'nl' ? 'Taal gewijzigd naar Nederlands' : 'Language changed to English', 'success');
    }
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    const checkbox = document.getElementById('darkModeToggleCheckbox');
    const isDarkMode = checkbox.checked;
    
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Update other dark mode toggles if they exist
    const otherToggle = document.getElementById('darkModeToggle');
    if (otherToggle && otherToggle.tagName === 'INPUT') {
        otherToggle.checked = isDarkMode;
    }
    
    showSnackbar(`${isDarkMode ? 'Dark' : 'Light'} mode enabled`, 'success');
}

/**
 * Toggle auto-hide header/footer
 */
function toggleAutoHide() {
    const checkbox = document.getElementById('autoHideCheckbox');
    autoHideEnabled = checkbox.checked;
    
    localStorage.setItem('autoHideEnabled', autoHideEnabled);
    
    if (autoHideEnabled) {
        enableAutoHide();
        showSnackbar('Auto-hide enabled', 'success');
    } else {
        disableAutoHide();
        showSnackbar('Auto-hide disabled', 'success');
    }
}

/**
 * Enable auto-hide header/footer on scroll
 */
function enableAutoHide() {
    const header = document.querySelector('header');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (!header || !mobileNav) return;
    
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    const handleScroll = () => {
        const currentScrollY = window.scrollY;
        
        // Only apply on mobile (768px or less)
        if (window.innerWidth <= 768) {
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down - hide
                header.style.transform = 'translateY(-100%)';
                mobileNav.style.transform = 'translateY(100%)';
            } else {
                // Scrolling up - show
                header.style.transform = 'translateY(0)';
                mobileNav.style.transform = 'translateY(0)';
            }
        } else {
            // Reset on desktop
            header.style.transform = 'translateY(0)';
            mobileNav.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    };
    
    const onScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(handleScroll);
            ticking = true;
        }
    };
    
    // Add transition
    header.style.transition = 'transform 0.3s ease';
    mobileNav.style.transition = 'transform 0.3s ease';
    
    // Store the function so we can remove it later
    window._autoHideScrollHandler = onScroll;
    
    // Add event listener
    window.addEventListener('scroll', onScroll, { passive: true });
}

/**
 * Disable auto-hide header/footer
 */
function disableAutoHide() {
    const header = document.querySelector('header');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (header) {
        header.style.transform = 'translateY(0)';
    }
    
    if (mobileNav) {
        mobileNav.style.transform = 'translateY(0)';
    }
    
    // Remove event listener
    if (window._autoHideScrollHandler) {
        window.removeEventListener('scroll', window._autoHideScrollHandler);
        delete window._autoHideScrollHandler;
    }
}

/**
 * Toggle push notifications
 */
function togglePushNotifications() {
    const checkbox = document.getElementById('pushNotificationsCheckbox');
    const enabled = checkbox.checked;
    
    localStorage.setItem('pushNotificationsEnabled', enabled);
    
    if (enabled && 'Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showSnackbar('Push notifications enabled', 'success');
            } else {
                checkbox.checked = false;
                localStorage.setItem('pushNotificationsEnabled', 'false');
                showSnackbar('Notification permission denied', 'error');
            }
        });
    } else {
        showSnackbar('Push notifications disabled', 'success');
    }
}

// Backward compatibility - expose functions globally
window.initializeSettings = initializeSettings;
window.showSettings = showSettings;
window.closeSettings = closeSettings;

// Redirect old profile modal calls to new settings modal
window.showProfile = () => showSettings('profile');
window.closeProfileModal = closeSettings;

console.log('[Settings] Module loaded');
