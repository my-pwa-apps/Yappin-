// Authentication Controller

// DOM Elements
const authContainer = document.getElementById('authContainer');
const contentContainer = document.getElementById('contentContainer');
const userBtn = document.getElementById('userBtn');
const userDropdown = document.getElementById('userDropdown');
const profileLink = document.getElementById('profileLink');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authBtns = document.querySelectorAll('.auth-btn');

// Current user state
let currentUser = null;

// Initialize auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        currentUser = user;
        
        // Update UI
        authContainer.classList.add('hidden');
        contentContainer.classList.remove('hidden');
        userBtn.classList.remove('hidden');
        
        // Check if user profile exists, if not create one
        checkUserProfile(user);
        
        // Load the timeline
        loadTimeline();
    } else {
        // User is signed out
        currentUser = null;
        
        // Cleanup real-time listeners
        if (typeof realtimeListeners !== 'undefined') {
            realtimeListeners.forEach(listener => listener.off());
            realtimeListeners = [];
        }
        
        // Update UI
        authContainer.classList.remove('hidden');
        contentContainer.classList.add('hidden');
        userBtn.classList.add('hidden');
        userDropdown.classList.add('hidden');
    }
});

// Toggle between login and signup forms
authBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        authBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Show corresponding form
        const formId = btn.getAttribute('data-form');
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.add('hidden');
        });
        document.getElementById(formId).classList.remove('hidden');
    });
});

// User dropdown toggle
userBtn.addEventListener('click', () => {
    userDropdown.classList.toggle('hidden');
});

// Close dropdown when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!userBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
    }
});

// Login form submit handler
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';
    
    // Sign in with email and password
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Clear form
            loginForm.reset();
            showSnackbar('Logged in successfully!', 'success');
        })
        .catch(error => {
            // Handle errors with user-friendly messages
            let errorMessage = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                case 'auth/invalid-login-credentials':
                    errorMessage = 'Incorrect email or password.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showSnackbar(errorMessage, 'error');
            console.error('Login error:', error);
        })
        .finally(() => {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
});

// Signup form submit handler
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const inviteCode = document.getElementById('signupInviteCode').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    // Validate invite code
    if (!inviteCode) {
        showSnackbar('Please enter an invite code', 'error');
        return;
    }
    
    // Validate username using utils
    const usernameValidation = window.utils ? 
        window.utils.validateUsername(username) : 
        { valid: username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username), message: 'Invalid username' };
    
    if (!usernameValidation.valid) {
        showSnackbar(usernameValidation.message, 'error');
        return;
    }
    
    // Validate email
    const emailValid = window.utils ? 
        window.utils.isValidEmail(email) : 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    if (!emailValid) {
        showSnackbar('Please enter a valid email address', 'error');
        return;
    }
    
    // Validate password match
    if (password !== confirmPassword) {
        showSnackbar('Passwords do not match', 'error');
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        showSnackbar('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';
    
    // Validate invite code first
    validateInviteCode(inviteCode)
        .then(isValid => {
            if (!isValid) {
                throw new Error('Invalid or expired invite code. Please ask a friend for a valid invite.');
            }
            
            // Check if username is available
            return checkUsernameAvailability(username);
        })
        .then(isAvailable => {
            if (!isAvailable) {
                throw new Error('Username is already taken');
            }
            
            // Create user with email and password
            return auth.createUserWithEmailAndPassword(email, password);
        })
        .then(userCredential => {
            // Mark invite code as used
            return markInviteCodeAsUsed(inviteCode, userCredential.user.uid)
                .then(() => userCredential);
        })
        .then(userCredential => {
            // Create user profile
            return createUserProfile(userCredential.user, username)
                .then(() => userCredential);
        })
        .then(userCredential => {
            // Generate 3 invite codes for the new user
            const invitePromises = [
                generateInviteCode(userCredential.user.uid),
                generateInviteCode(userCredential.user.uid),
                generateInviteCode(userCredential.user.uid)
            ];
            return Promise.all(invitePromises);
        })
        .then(codes => {
            // Clear form
            signupForm.reset();
            showSnackbar('Account created successfully! Check your profile for invite codes to share.', 'success', 5000);
        })
        .catch(error => {
            // Handle errors with user-friendly messages
            let errorMessage = 'Signup failed. Please try again.';
            
            if (error.message && error.message.includes('permission_denied')) {
                errorMessage = 'Unable to create account. Please check Firebase rules are deployed.';
            } else {
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'This email is already registered. Please login instead.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address.';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = 'Email/password accounts are not enabled.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Password should be at least 6 characters.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your connection.';
                        break;
                    default:
                        if (error.message) {
                            errorMessage = error.message;
                        }
                }
            }
            
            showSnackbar(errorMessage, 'error', 5000);
            console.error('Signup error:', error);
        })
        .finally(() => {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .catch(error => {
            console.error('Logout error:', error);
            showSnackbar(`Error: ${error.message}`);
        });
});

// Validate invite code
function validateInviteCode(code) {
    return database.ref('inviteCodes').child(code).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                return false;
            }
            
            const inviteData = snapshot.val();
            
            // Check if already used
            if (inviteData.used) {
                return false;
            }
            
            // Check if expired (optional: 30 days validity)
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            if (inviteData.createdAt < thirtyDaysAgo) {
                return false;
            }
            
            return true;
        });
}

// Mark invite code as used
function markInviteCodeAsUsed(code, newUserId) {
    return database.ref(`inviteCodes/${code}`).update({
        used: true,
        usedBy: newUserId,
        usedAt: firebase.database.ServerValue.TIMESTAMP
    });
}

// Generate invite code for user
function generateInviteCode(userId) {
    // Generate a random 8-character code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const inviteData = {
        createdBy: userId,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        used: false
    };
    
    const updates = {};
    updates[`inviteCodes/${code}`] = inviteData;
    updates[`users/${userId}/inviteCodes/${code}`] = true; // Store reference in user profile
    
    return database.ref().update(updates)
        .then(() => code);
}

// Check if username is available
function checkUsernameAvailability(username) {
    return database.ref('usernames').child(username.toLowerCase()).once('value')
        .then(snapshot => {
            return !snapshot.exists();
        });
}

// Create user profile in database
function createUserProfile(user, username) {
    const lowercaseUsername = username.toLowerCase();
    
    // Generate random avatar if no photo URL provided
    const photoURL = user.photoURL || generateRandomAvatar(user.uid);
    
    const userData = {
        uid: user.uid,
        username: username,
        lowercaseUsername: lowercaseUsername,
        email: user.email,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        photoURL: photoURL,
        bio: '',
        followers: 0,
        following: 0
    };
    
    // Use batched update for atomic write operation
    const updates = {};
    updates[`users/${user.uid}`] = userData;
    updates[`usernames/${lowercaseUsername}`] = user.uid;
    
    return database.ref().update(updates)
        .catch(error => {
            console.error('Error creating user profile:', error);
            throw error;
        });
}

// Check if user profile exists, if not create one
function checkUserProfile(user) {
    return database.ref(`users/${user.uid}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists() && user.email) {
                // No profile exists, create a default one
                const username = user.email.split('@')[0] + generateId().substring(0, 5);
                return createUserProfile(user, username);
            }
            return snapshot.val();
        })
        .catch(error => {
            console.error('Error checking user profile:', error);
        });
}

// Show invite codes modal
window.showInviteCodes = function() {
    if (!auth.currentUser) {
        showSnackbar('Please login to view invite codes', 'error');
        return;
    }
    
    const modal = document.getElementById('inviteCodesModal');
    const codesList = document.getElementById('inviteCodesList');
    
    if (!modal) {
        console.error('[Invite] Modal not found!');
        showSnackbar('Error: Modal not found', 'error');
        return;
    }
    
    // Show modal - use 'show' class not 'hidden'
    modal.classList.remove('hidden');
    modal.classList.add('show');
    
    // Also show modal content
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        setTimeout(() => {
            modalContent.style.transform = 'translateY(0)';
            modalContent.style.opacity = '1';
        }, 10);
    }
    
    // Load invite codes from user's own collection
    codesList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Loading...</p>';
    
    // Get list of codes from user's inviteCodes list
    database.ref(`users/${auth.currentUser.uid}/inviteCodes`).once('value')
        .then(snapshot => {
            const userCodes = snapshot.val();
            
            if (!userCodes || Object.keys(userCodes).length === 0) {
                codesList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No invite codes yet. Generate one below!</p>';
                
                // Auto-generate 3 codes for the user
                const generatePromises = [
                    generateInviteCode(auth.currentUser.uid),
                    generateInviteCode(auth.currentUser.uid),
                    generateInviteCode(auth.currentUser.uid)
                ];
                
                return Promise.all(generatePromises).then(() => {
                    // Refresh the list
                    return database.ref(`users/${auth.currentUser.uid}/inviteCodes`).once('value');
                });
            }
            
            return snapshot;
        })
        .then(snapshot => {
            if (!snapshot) return;
            
            const userCodes = snapshot.val();
            if (!userCodes || Object.keys(userCodes).length === 0) {
                return;
            }
            
            // Fetch details for each code
            const codePromises = Object.keys(userCodes).map(code => 
                database.ref(`inviteCodes/${code}`).once('value')
                    .then(codeSnapshot => ({
                        code: code,
                        data: codeSnapshot.val()
                    }))
            );
            
            return Promise.all(codePromises);
        })
        .then(codes => {
            if (!codes) return;
            
            codesList.innerHTML = '';
            
            codes.forEach(({ code, data }) => {
                if (!data) return; // Skip if code was deleted
                
                const codeItem = document.createElement('div');
                codeItem.style.cssText = 'padding: 15px; background: var(--hover-color); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;';
                
                const status = data.used ? 
                    `<span style="color: var(--text-secondary); font-size: 0.9em;">Used</span>` :
                    '<span style="color: var(--primary-color); font-weight: 600;">Available</span>';
                
                codeItem.innerHTML = `
                    <div>
                        <div style="font-size: 1.2em; font-weight: 700; font-family: monospace; letter-spacing: 2px;">${code}</div>
                        <div style="margin-top: 5px;">${status}</div>
                    </div>
                    ${!data.used ? `<button onclick="copyInviteCode('${code}')" class="btn primary-btn" style="padding: 8px 16px;">Copy</button>` : ''}
                `;
                
                codesList.appendChild(codeItem);
            });
        })
        .catch(error => {
            console.error('[Invite] Error loading invite codes:', error);
            codesList.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Error loading codes: ${error.message}</p>`;
            showSnackbar('Error loading invite codes', 'error');
        });
};

// Close invite modal
window.closeInviteModal = function() {
    const modal = document.getElementById('inviteCodesModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'translateY(20px)';
            modalContent.style.opacity = '0';
        }
    }
};

// Copy invite code to clipboard
window.copyInviteCode = function(code) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code)
            .then(() => showSnackbar('Invite code copied to clipboard!', 'success'))
            .catch(() => showSnackbar('Failed to copy code', 'error'));
    } else {
        showSnackbar('Clipboard not supported', 'error');
    }
};

// Generate new invite code
window.generateNewInviteCode = function() {
    if (!auth.currentUser) {
        showSnackbar('Please login to generate invite codes', 'error');
        return;
    }
    
    generateInviteCode(auth.currentUser.uid)
        .then(code => {
            showSnackbar(`New invite code generated: ${code}`, 'success', 5000);
            // Refresh the list
            showInviteCodes();
        })
        .catch(error => {
            console.error('Error generating invite code:', error);
            showSnackbar('Error generating invite code', 'error');
        });
};

// Generate random avatar URL using DiceBear API
function generateRandomAvatar(seed) {
    // Use user's UID or username as seed for consistency
    const style = 'avataaars'; // Options: avataaars, bottts, identicon, initials, personas
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// Upload profile picture
window.uploadProfilePicture = function() {
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
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    }
    
    // Upload to Firebase Storage
    const storageRef = storage.ref(`profile-pictures/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            // Progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (uploadBtn) {
                uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${Math.round(progress)}%`;
            }
        },
        (error) => {
            // Error
            console.error('Error uploading profile picture:', error);
            showSnackbar('Error uploading profile picture: ' + error.message, 'error');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
            }
        },
        () => {
            // Success
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                // Update user profile with new photo URL
                return database.ref(`users/${auth.currentUser.uid}/photoURL`).set(downloadURL)
                    .then(() => {
                        showSnackbar('Profile picture updated successfully', 'success');
                        
                        // Update preview
                        const preview = document.getElementById('profilePicturePreview');
                        if (preview) {
                            preview.src = downloadURL;
                        }
                        
                        // Reset upload button
                        if (uploadBtn) {
                            uploadBtn.disabled = false;
                            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
                        }
                        
                        // Clear file input
                        fileInput.value = '';
                        
                        // Reload timeline to show updated avatar
                        if (typeof loadTimeline === 'function') {
                            loadTimeline();
                        }
                    });
            });
        }
    );
};

// Trigger file input click
window.selectProfilePicture = function() {
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput) {
        fileInput.click();
    }
};

// Preview selected image
window.previewProfilePicture = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePicturePreview');
            if (preview) {
                preview.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
};
