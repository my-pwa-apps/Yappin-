// Performance Optimization Utilities for Yappin'

// ========================================
// PERFORMANCE CONFIGURATION
// ========================================
const DEBUG_MODE = false; // Set to true for development, false for production
const ENABLE_PERFORMANCE_MONITORING = true;

// ========================================
// LOGGER - Conditional logging based on debug mode
// ========================================
const Logger = {
    log: (...args) => {
        if (DEBUG_MODE) console.log(...args);
    },
    warn: (...args) => {
        if (DEBUG_MODE) console.warn(...args);
    },
    error: (...args) => {
        // Always log errors
        console.error(...args);
    },
    debug: (...args) => {
        if (DEBUG_MODE) console.log('[DEBUG]', ...args);
    }
};

// Export to window for global access
window.Logger = Logger;

// ========================================
// DEBOUNCE - Limit function execution rate
// ========================================
function debounce(func, delay = 300) {
    let timeoutId;
    return function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ========================================
// THROTTLE - Ensure minimum time between executions
// ========================================
function throttle(func, limit = 300) {
    let inThrottle;
    return function throttled(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========================================
// REQUEST ANIMATION FRAME WRAPPER
// ========================================
function rafBatch(callback) {
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(callback);
    } else {
        setTimeout(callback, 16); // Fallback ~60fps
    }
}

// ========================================
// LAZY IMAGE LOADER
// ========================================
const lazyImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            
            if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                img.classList.add('loaded');
            }
            
            observer.unobserve(img);
        }
    });
}, {
    rootMargin: '50px' // Start loading 50px before visible
});

function lazyLoadImage(img) {
    if ('IntersectionObserver' in window) {
        lazyImageObserver.observe(img);
    } else {
        // Fallback for older browsers
        const src = img.dataset.src;
        if (src) img.src = src;
    }
}

// ========================================
// MEMORY MANAGEMENT
// ========================================
const listenerCache = new WeakMap();

function addCachedListener(element, event, handler) {
    if (!listenerCache.has(element)) {
        listenerCache.set(element, new Map());
    }
    
    const elementListeners = listenerCache.get(element);
    
    // Remove old listener if exists
    if (elementListeners.has(event)) {
        element.removeEventListener(event, elementListeners.get(event));
    }
    
    element.addEventListener(event, handler);
    elementListeners.set(event, handler);
}

function removeCachedListeners(element) {
    if (listenerCache.has(element)) {
        const elementListeners = listenerCache.get(element);
        elementListeners.forEach((handler, event) => {
            element.removeEventListener(event, handler);
        });
        listenerCache.delete(element);
    }
}

// ========================================
// DOM BATCH UPDATES
// ========================================
function batchDOMUpdates(updates) {
    rafBatch(() => {
        updates.forEach(update => update());
    });
}

// ========================================
// FIREBASE QUERY CACHE
// ========================================
const queryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedQuery(key) {
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCachedQuery(key, data) {
    queryCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

function clearQueryCache(pattern) {
    if (pattern) {
        // Clear specific pattern
        for (const [key] of queryCache) {
            if (key.includes(pattern)) {
                queryCache.delete(key);
            }
        }
    } else {
        // Clear all
        queryCache.clear();
    }
}

// ========================================
// VIRTUAL SCROLLING HELPER
// ========================================
class VirtualScroller {
    constructor(container, itemHeight = 100, bufferSize = 5) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.bufferSize = bufferSize;
        this.items = [];
        this.visibleRange = { start: 0, end: 0 };
        
        this.onScroll = throttle(this.calculateVisibleRange.bind(this), 100);
        container.addEventListener('scroll', this.onScroll);
    }
    
    calculateVisibleRange() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;
        
        const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
        const end = Math.min(
            this.items.length,
            Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.bufferSize
        );
        
        if (start !== this.visibleRange.start || end !== this.visibleRange.end) {
            this.visibleRange = { start, end };
            this.render();
        }
    }
    
    setItems(items) {
        this.items = items;
        this.calculateVisibleRange();
    }
    
    render() {
        // Override in implementation
    }
    
    destroy() {
        this.container.removeEventListener('scroll', this.onScroll);
    }
}

// ========================================
// PERFORMANCE METRICS
// ========================================
const performanceMetrics = {
    marks: new Map(),
    measures: new Map()
};

function markPerformance(name) {
    if (!ENABLE_PERFORMANCE_MONITORING) return;
    
    if (window.performance && window.performance.mark) {
        performance.mark(name);
    }
    performanceMetrics.marks.set(name, Date.now());
}

function measurePerformance(name, startMark, endMark) {
    if (!ENABLE_PERFORMANCE_MONITORING) return null;
    
    try {
        if (window.performance && window.performance.measure) {
            performance.measure(name, startMark, endMark);
            const measure = performance.getEntriesByName(name)[0];
            
            if (DEBUG_MODE) {
                Logger.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
            }
            
            performanceMetrics.measures.set(name, measure.duration);
            return measure.duration;
        }
    } catch (e) {
        Logger.warn('Performance measurement failed:', e);
    }
    
    return null;
}

function getPerformanceReport() {
    const report = {
        marks: Array.from(performanceMetrics.marks.entries()),
        measures: Array.from(performanceMetrics.measures.entries())
    };
    
    Logger.log('Performance Report:', report);
    return report;
}

// ========================================
// IMAGE OPTIMIZATION
// ========================================
function optimizeImageLoad(url, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let { width, height } = img;
            
            // Resize if necessary
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                blob => resolve(blob),
                'image/jpeg',
                quality
            );
        };
        
        img.onerror = reject;
        img.src = url;
    });
}

// ========================================
// CLEANUP ON PAGE UNLOAD
// ========================================
window.addEventListener('beforeunload', () => {
    queryCache.clear();
    performanceMetrics.marks.clear();
    performanceMetrics.measures.clear();
});

// ========================================
// EXPORT TO WINDOW
// ========================================
window.PerformanceUtils = {
    Logger,
    debounce,
    throttle,
    rafBatch,
    lazyLoadImage,
    lazyImageObserver,
    addCachedListener,
    removeCachedListeners,
    batchDOMUpdates,
    getCachedQuery,
    setCachedQuery,
    clearQueryCache,
    VirtualScroller,
    markPerformance,
    measurePerformance,
    getPerformanceReport,
    optimizeImageLoad
};

Logger.log('✅ Performance utilities loaded');
