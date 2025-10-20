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
    
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
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
    
    // Check if username is available
    checkUsernameAvailability(username)
        .then(isAvailable => {
            if (!isAvailable) {
                throw new Error('Username is already taken');
            }
            
            // Create user with email and password
            return auth.createUserWithEmailAndPassword(email, password);
        })
        .then(userCredential => {
            // Create user profile
            return createUserProfile(userCredential.user, username);
        })
        .then(() => {
            // Clear form
            signupForm.reset();
            showSnackbar('Account created successfully!', 'success');
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
    
    const userData = {
        uid: user.uid,
        username: username,
        lowercaseUsername: lowercaseUsername,
        email: user.email,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        photoURL: user.photoURL || null,
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
