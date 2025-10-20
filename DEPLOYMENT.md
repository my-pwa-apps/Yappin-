# Yappin' Deployment Guide

## 🚀 Quick Start Deployment

### Prerequisites
- Node.js and npm installed
- Firebase CLI installed: `npm install -g firebase-tools`
- GitHub account (for GitHub Pages) or other hosting service

## 1️⃣ Firebase Setup

### Initial Setup
```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init
```

When prompted, select:
- ✅ Realtime Database (for rules)
- ✅ Hosting (optional, or use GitHub Pages)

### Deploy Firebase Rules

**Important**: Your current Firebase rules are too restrictive and causing signup errors!

```bash
# Deploy just the database rules
firebase deploy --only database
```

Or manually in Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (yappin-d355d)
3. Go to **Realtime Database** → **Rules** tab
4. Copy the content from `firebase.rules.json`
5. Click **Publish**

### Verify Rules Deployed
After deploying, test by:
1. Try signing up with a new account
2. Check browser console for errors
3. Should see "Account created successfully!" message

## 2️⃣ GitHub Pages Deployment

### Current Status
✅ Already deployed at: https://my-pwa-apps.github.io/Yappin-/

### Update Deployment
```bash
# Stage all changes
git add .

# Commit changes
git commit -m "Fix: Add autocomplete, improve Firebase rules, enhance error messages"

# Push to main branch
git push origin main
```

GitHub Actions will automatically deploy to GitHub Pages if configured.

### Manual Deploy (if needed)
```bash
# Build if you have a build process
# npm run build

# Deploy to gh-pages branch
git subtree push --prefix . origin gh-pages
```

## 3️⃣ Environment Configuration

### For Production
Create a `.env` file (not committed to git):
```env
FIREBASE_API_KEY=AIzaSyC9Uq8vj0-b7vgwqHcqKuLAPcZW5QlPpOw
FIREBASE_AUTH_DOMAIN=yappin-d355d.firebaseapp.com
FIREBASE_DATABASE_URL=https://yappin-d355d-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_PROJECT_ID=yappin-d355d
FIREBASE_STORAGE_BUCKET=yappin-d355d.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=703937348268
FIREBASE_APP_ID=1:703937348268:web:dab16bf3f6ea68f4745509
```

### Security Note
Your Firebase API key is public-facing (this is normal), but make sure:
- ✅ Firebase rules are properly configured
- ✅ App Check is enabled (optional, for production)
- ✅ Quota limits are set in Firebase Console

## 4️⃣ Testing Checklist

### Before Deploying
- [ ] Test signup with new account
- [ ] Test login with existing account
- [ ] Test creating a yap
- [ ] Test liking/reyapping
- [ ] Test follow/unfollow
- [ ] Test offline mode
- [ ] Test PWA installation
- [ ] Run Lighthouse audit (target 90+ PWA score)

### After Deploying
- [ ] Verify all features work on production URL
- [ ] Test on mobile devices
- [ ] Check browser console for errors
- [ ] Verify service worker is registered
- [ ] Test offline functionality
- [ ] Check Firebase usage/quota

## 5️⃣ Monitoring & Maintenance

### Firebase Console Monitoring
1. **Authentication** → Check user count and auth methods
2. **Realtime Database** → Monitor usage and data structure
3. **Storage** → Check storage usage (for profile images)
4. **Usage and Billing** → Monitor free tier limits

### Common Issues

#### "Permission Denied" Errors
**Cause**: Firebase rules not deployed or too restrictive
**Fix**: Deploy rules from `firebase.rules.json`
```bash
firebase deploy --only database
```

#### Service Worker Not Updating
**Cause**: Browser cache or old service worker
**Fix**: 
- Update cache version in `service-worker.js` (increment `CACHE_VERSION`)
- Clear browser cache
- Unregister old service worker in DevTools

#### PWA Not Installable
**Cause**: HTTPS required, manifest issues, or service worker not registered
**Fix**:
- Ensure served over HTTPS (GitHub Pages provides this)
- Check `manifest.json` is accessible
- Verify service worker registered in DevTools

## 6️⃣ Firebase Quotas (Free Tier)

### Spark Plan Limits
- **Realtime Database**: 100 simultaneous connections
- **Storage**: 5GB
- **Authentication**: Unlimited users
- **Hosting**: 10GB/month bandwidth

### When to Upgrade
Consider Blaze (pay-as-you-go) when:
- More than 100 concurrent users
- Need more than 5GB storage
- Require Cloud Functions
- Want automatic backups

## 7️⃣ Production Optimizations

### Enable in Firebase Console

#### App Check (Recommended)
Protects against abuse:
1. Go to Firebase Console → App Check
2. Register your domain
3. Add App Check token to requests

#### Security Enhancements
```javascript
// Add to firebase-config.js
const appCheck = firebase.appCheck();
appCheck.activate('SITE_KEY', true);
```

#### Performance Monitoring
```html
<!-- Add to index.html -->
<script src="https://www.gstatic.com/firebasejs/9.19.1/firebase-performance-compat.js"></script>
```

### Cache Headers
If using custom hosting, set cache headers:
```
# Static assets
Cache-Control: public, max-age=31536000, immutable

# HTML files
Cache-Control: no-cache

# Service Worker
Cache-Control: no-cache
```

## 8️⃣ Rollback Procedure

### If Something Goes Wrong

```bash
# Rollback Firebase rules
firebase deploy --only database --force

# Rollback code
git revert HEAD
git push origin main

# Or restore previous commit
git reset --hard <previous-commit-hash>
git push -f origin main
```

## 📞 Support Resources

- **Firebase Docs**: https://firebase.google.com/docs
- **PWA Guide**: https://web.dev/progressive-web-apps/
- **GitHub Pages Docs**: https://docs.github.com/en/pages
- **Project Issues**: Check FIREBASE-RULES.md for detailed rule documentation

## ✅ Deployment Complete!

Once deployed:
1. Share URL: https://my-pwa-apps.github.io/Yappin-/
2. Test on multiple devices
3. Monitor Firebase Console for usage
4. Collect user feedback
5. Iterate and improve!

---

**Current Status**: Firebase rules need to be deployed to fix signup errors. Follow step 1 above! 🚀
