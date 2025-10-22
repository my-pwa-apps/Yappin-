// Profile Module
// Handles profile management (display name, picture upload, settings)

import { showSnackbar } from './ui.js';

// Update Display Name
export function updateDisplayName() {
    const user = auth.currentUser;
    if (!user) {
        showSnackbar('Please sign in to update your profile', 'error');
        return;
    }
    
    const displayNameInput = document.getElementById('displayNameInput');
    if (!displayNameInput) return;
    
    const displayName = displayNameInput.value.trim();
    
    // Validate display name
    if (displayName && (displayName.length < 1 || displayName.length > 50)) {
        showSnackbar('Display name must be 1-50 characters', 'error');
        return;
    }
    
    // Update in database
    const updates = {};
    if (displayName) {
        updates[`users/${user.uid}/displayName`] = displayName;
    } else {
        updates[`users/${user.uid}/displayName`] = null; // Remove if empty
    }
    
    database.ref().update(updates).then(() => {
        showSnackbar('Display name updated successfully', 'success');
    }).catch(error => {
        (window.PerformanceUtils?.Logger || console).error('[ERROR] Failed to update display name:', error);
        showSnackbar('Failed to update display name', 'error');
    });
}

// Select Profile Picture
export function selectProfilePicture() {
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput) {
        fileInput.click();
    }
}

// Upload Profile Picture
export function uploadProfilePicture() {
    if (!auth.currentUser) {
        showSnackbar('Please login to upload a profile picture', 'error');
        return;
    }
    
    const fileInput = document.getElementById('profilePictureInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showSnackbar('Please select a file', 'error');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showSnackbar('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showSnackbar('File size must be less than 5MB', 'error');
        return;
    }
    
    // Show loading state
    const uploadBtn = document.getElementById('uploadProfilePictureBtn');
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    // Convert to base64 (no Firebase Storage needed)
    const reader = new FileReader();
    
    reader.onload = (e) => {
        // Compress image
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max dimensions for profile picture
            const maxSize = 400;
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
            
            // Convert to base64 with compression
            const base64 = canvas.toDataURL('image/jpeg', 0.9);
            
            // Update user profile with base64 image
            database.ref(`users/${auth.currentUser.uid}/photoURL`).set(base64)
                .then(() => {
                    showSnackbar('Profile picture updated successfully', 'success');
                    
                    // Update preview
                    const preview = document.getElementById('profilePicturePreview');
                    if (preview) {
                        preview.src = base64;
                    }
                    
                    // Reset upload button
                    if (uploadBtn) {
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
                    }
                    
                    // Clear file input
                    fileInput.value = '';
                    
                    // Update userBtn avatar (desktop menu)
                    const userBtn = document.getElementById('userBtn');
                    if (userBtn) {
                        userBtn.innerHTML = `<img src="${base64}" alt="User avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.src='./images/default-avatar.svg'">`;
                    }
                    
                    // Update header profile avatar (mobile)
                    const headerAvatarImg = document.getElementById('headerAvatarImg');
                    if (headerAvatarImg) {
                        headerAvatarImg.src = base64;
                    }
                    
                    // Reload timeline to show updated avatar on existing posts
                    if (typeof loadTimeline === 'function') {
                        loadTimeline();
                    }
                })
                .catch(error => {
                    (window.PerformanceUtils?.Logger || console).error('Error updating profile picture:', error);
                    showSnackbar('Error updating profile picture: ' + error.message, 'error');
                    if (uploadBtn) {
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
                    }
                });
        };
        
        img.onerror = () => {
            showSnackbar('Failed to load image', 'error');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
            }
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        showSnackbar('Failed to read file', 'error');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
        }
    };
    
    reader.readAsDataURL(file);
}

// Make functions globally available
window.updateDisplayName = updateDisplayName;
window.selectProfilePicture = selectProfilePicture;
window.uploadProfilePicture = uploadProfilePicture;
