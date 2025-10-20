// PWA Initialization and Service Worker Registration

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('[PWA] Service Worker registered successfully:', registration.scope);
                
                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available
                                showUpdateNotification();
                            }
                        });
                    }
                });
            })
            .catch(err => {
                console.error('[PWA] Service Worker registration failed:', err);
            });
    });
    
    // Handle service worker controller change
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
} else {
    console.warn('[PWA] Service Workers are not supported in this browser');
}

// Show update notification
function showUpdateNotification() {
    if (typeof showSnackbar === 'function') {
        const message = 'New version available!';
        showSnackbar(message, 'default', 10000);
        
        // Create reload button
        const snackbar = document.getElementById('snackbar');
        if (snackbar && !snackbar.querySelector('.reload-btn')) {
            const reloadBtn = document.createElement('button');
            reloadBtn.className = 'reload-btn';
            reloadBtn.textContent = 'Reload';
            reloadBtn.style.cssText = 'margin-left: 10px; padding: 5px 10px; background: white; color: var(--primary-color); border: none; border-radius: 4px; cursor: pointer;';
            reloadBtn.onclick = () => window.location.reload();
            snackbar.appendChild(reloadBtn);
        }
    }
}

// PWA Install prompt handling
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show custom install UI
    showInstallPromotion();
});

// Show install promotion
function showInstallPromotion() {
    // Create install banner if it doesn't exist
    const existingBanner = document.getElementById('install-banner');
    if (existingBanner) return;
    
    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary-color);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 90%;
        animation: slideUp 0.3s ease;
    `;
    
    banner.innerHTML = `
        <span><i class="fas fa-download"></i> Install Yappin' for a better experience</span>
        <button id="install-btn" style="
            background: white;
            color: var(--primary-color);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
        ">Install</button>
        <button id="dismiss-install" style="
            background: transparent;
            color: white;
            border: none;
            padding: 8px;
            cursor: pointer;
            font-size: 20px;
        ">×</button>
    `;
    
    document.body.appendChild(banner);
    
    // Handle install button click
    document.getElementById('install-btn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[PWA] User response to install prompt:', outcome);
            deferredPrompt = null;
        }
        banner.remove();
    });
    
    // Handle dismiss button
    document.getElementById('dismiss-install').addEventListener('click', () => {
        banner.remove();
        // Store dismissal in localStorage (don't show again for 7 days)
        localStorage.setItem('installPromptDismissed', Date.now().toString());
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (banner.parentElement) {
            banner.remove();
        }
    }, 10000);
}

// Check if install prompt was recently dismissed
window.addEventListener('load', () => {
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDaysInMs) {
            // Don't show install prompt yet
            return;
        } else {
            // Clear old dismissal
            localStorage.removeItem('installPromptDismissed');
        }
    }
});

// Handle app installed event
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed successfully');
    deferredPrompt = null;
    
    if (typeof showSnackbar === 'function') {
        showSnackbar('Yappin\' installed successfully! 🎉', 'success', 3000);
    }
    
    // Track installation in analytics if available
    if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_install', {
            event_category: 'engagement',
            event_label: 'PWA Installed'
        });
    }
});

// Detect if running as PWA
function isRunningAsPWA() {
    // Check if display-mode is standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    
    // Check if running in iOS PWA mode
    if (window.navigator.standalone === true) {
        return true;
    }
    
    return false;
}

// Add PWA-specific styling if running as PWA
if (isRunningAsPWA()) {
    document.body.classList.add('pwa-mode');
    console.log('[PWA] Running as installed PWA');
}

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('[PWA] Back online');
    if (typeof showSnackbar === 'function') {
        showSnackbar('Connection restored', 'success', 2000);
    }
    // Sync pending data if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
            return registration.sync.register('sync-data');
        }).catch(err => console.error('[PWA] Background sync registration failed:', err));
    }
});

window.addEventListener('offline', () => {
    console.log('[PWA] Gone offline');
    if (typeof showSnackbar === 'function') {
        showSnackbar('You are offline. Some features may be limited.', 'error', 5000);
    }
});

// Check initial connection status
if (!navigator.onLine) {
    window.addEventListener('load', () => {
        if (typeof showSnackbar === 'function') {
            showSnackbar('You are currently offline', 'error', 3000);
        }
    });
}

// Add connection status indicator
function updateConnectionStatus() {
    const statusIndicator = document.getElementById('connection-status');
    if (statusIndicator) {
        if (navigator.onLine) {
            statusIndicator.classList.remove('offline');
            statusIndicator.classList.add('online');
        } else {
            statusIndicator.classList.remove('online');
            statusIndicator.classList.add('offline');
        }
    }
}

// Export utility functions
window.isRunningAsPWA = isRunningAsPWA;
window.updateConnectionStatus = updateConnectionStatus;
