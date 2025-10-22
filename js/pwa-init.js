// PWA Initialization and Service Worker Registration

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
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
            await deferredPrompt.userChoice;
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

// Detect iOS devices
function isIOS() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
}

// Detect if Safari on iOS
function isIOSSafari() {
    const ua = window.navigator.userAgent;
    const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
    const webkit = !!ua.match(/WebKit/i);
    const iOSSafari = iOS && webkit && !ua.match(/CriOS/i) && !ua.match(/FxiOS/i);
    return iOSSafari;
}

// Show iOS-specific install instructions
function showIOSInstallPrompt() {
    // Don't show if already in standalone mode
    if (window.navigator.standalone === true) {
        return;
    }
    
    // Don't show if not Safari
    if (!isIOSSafari()) {
        return;
    }
    
    // Check if already dismissed
    const dismissed = localStorage.getItem('iosInstallPromptDismissed');
    if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDaysInMs) {
            return;
        } else {
            localStorage.removeItem('iosInstallPromptDismissed');
        }
    }
    
    // Create iOS install banner
    const banner = document.createElement('div');
    banner.id = 'ios-install-banner';
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        color: var(--text-primary);
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 1001;
        max-width: 90%;
        width: 350px;
        animation: slideUp 0.3s ease;
    `;
    
    banner.innerHTML = `
        <button id="ios-dismiss-install" style="
            position: absolute;
            top: 10px;
            right: 10px;
            background: transparent;
            color: var(--text-secondary);
            border: none;
            padding: 5px;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
        ">×</button>
        <div style="margin-bottom: 15px;">
            <div style="font-weight: 600; font-size: 18px; margin-bottom: 10px; color: var(--primary-color);">
                <i class="fas fa-mobile-alt"></i> Install Yappin'
            </div>
            <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                Install this app on your home screen for quick and easy access when you're on the go.
            </p>
        </div>
        <div style="background: var(--hover-color); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 8px;">
                <strong>How to install:</strong>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                1. Tap the Share button 
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin: 0 2px;">
                    <path d="M8 0.5L13.5 6H10V11H6V6H2.5L8 0.5Z"/>
                    <rect x="1" y="12" width="14" height="3" rx="1"/>
                </svg>
                in the menu bar<br>
                2. Scroll and tap "Add to Home Screen"<br>
                3. Tap "Add" in the top right corner
            </div>
        </div>
        <button id="ios-install-got-it" style="
            width: 100%;
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 15px;
        ">Got it!</button>
    `;
    
    document.body.appendChild(banner);
    
    // Add slide up animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translate(-50%, 100px);
                opacity: 0;
            }
            to {
                transform: translate(-50%, 0);
                opacity: 1;
            }
        }
        
        body.dark-mode #ios-install-banner {
            background: var(--card-bg);
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }
    `;
    document.head.appendChild(style);
    
    // Handle dismiss button
    document.getElementById('ios-dismiss-install').addEventListener('click', () => {
        banner.remove();
        localStorage.setItem('iosInstallPromptDismissed', Date.now().toString());
    });
    
    // Handle "Got it" button
    document.getElementById('ios-install-got-it').addEventListener('click', () => {
        banner.remove();
        localStorage.setItem('iosInstallPromptDismissed', Date.now().toString());
    });
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
    
    // Show iOS install prompt for iOS Safari users
    if (isIOS() && isIOSSafari()) {
        // Delay showing the prompt by 3 seconds to let the app load first
        setTimeout(() => {
            showIOSInstallPrompt();
        }, 3000);
    }
});

// Handle app installed event
window.addEventListener('appinstalled', () => {
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
}

// Handle online/offline status
window.addEventListener('online', () => {
    // Sync pending data if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
            return registration.sync.register('sync-data');
        }).catch(err => console.error('[PWA] Background sync registration failed:', err));
    }
});

window.addEventListener('offline', () => {
    // Connection lost - badge will show offline status
});

// Export utility functions
window.isRunningAsPWA = isRunningAsPWA;
