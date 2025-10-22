# Firebase OAuth Setup Guide

This guide explains how to configure social authentication providers (Google, Facebook, Apple, Microsoft) for Yappin'.

## Prerequisites

- Firebase project created
- Firebase Authentication enabled in Firebase Console

## 1. Google Sign-In

### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Click **Google** provider
5. Toggle **Enable**
6. Click **Save**

**Note:** Google OAuth is pre-configured with Firebase and requires no additional setup.

---

## 2. Facebook Login

### Steps:
1. Create a Facebook App at [Facebook Developers](https://developers.facebook.com/)
2. In your Facebook App, go to **Settings** → **Basic**
3. Copy your **App ID** and **App Secret**
4. In Firebase Console:
   - Go to **Authentication** → **Sign-in method**
   - Click **Facebook**
   - Toggle **Enable**
   - Paste **App ID** and **App Secret**
   - Copy the OAuth redirect URI provided by Firebase
5. Back in Facebook App:
   - Go to **Products** → **Facebook Login** → **Settings**
   - Add the OAuth redirect URI to **Valid OAuth Redirect URIs**
   - Save changes
6. Click **Save** in Firebase Console

### App Settings:
- **App Domains**: Add your domain (e.g., `yappin.app`)
- **Privacy Policy URL**: Required for Facebook review
- **Terms of Service URL**: Required for Facebook review

---

## 3. Apple Sign-In

### Steps:
1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/) (Requires paid membership)
2. Create an App ID:
   - Go to **Certificates, Identifiers & Profiles**
   - Create a new **App ID**
   - Enable **Sign In with Apple** capability
3. Create a Service ID:
   - Go to **Identifiers** → **Services IDs**
   - Create a new Service ID
   - Enable **Sign In with Apple**
   - Configure with your website domain
4. Create a Key:
   - Go to **Keys**
   - Create a new key with **Sign In with Apple** enabled
   - Download the `.p8` key file (can only download once!)
5. In Firebase Console:
   - Go to **Authentication** → **Sign-in method**
   - Click **Apple**
   - Toggle **Enable**
   - Enter:
     - **Service ID** (e.g., `com.yourapp.service`)
     - **Apple Team ID** (found in Apple Developer account)
     - **Key ID** (from the key you created)
     - **Private Key** (content of the .p8 file)
   - Copy the OAuth redirect URI
6. Back in Apple Developer:
   - Configure your Service ID with the OAuth redirect URI
7. Click **Save** in Firebase Console

### Requirements:
- Paid Apple Developer membership ($99/year)
- Website domain (for production)

---

## 4. Microsoft Sign-In

### Steps:
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
   - Name: "Yappin"
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Click **Register**
4. Copy the **Application (client) ID**
5. Create a Client Secret:
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Add description and expiry
   - Copy the secret **value** (visible only once!)
6. Configure Redirect URIs:
   - Go to **Authentication**
   - Click **Add a platform** → **Web**
   - Add the Firebase OAuth redirect URI
   - Save
7. In Firebase Console:
   - Go to **Authentication** → **Sign-in method**
   - Click **Microsoft**
   - Toggle **Enable**
   - Enter:
     - **Application (client) ID**
     - **Client secret value**
   - Copy the OAuth redirect URI provided by Firebase
8. Add redirect URI to Azure (step 6)
9. Click **Save** in Firebase Console

### Account Types Supported:
- Personal Microsoft accounts (Outlook.com, Hotmail.com, Live.com)
- Work/School accounts (Office 365)

---

## 5. Update Firebase Security Rules

Since social auth users won't have the traditional signup flow, update your rules to handle OAuth users:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".write": "$uid === auth.uid",
        ".read": "auth != null"
      }
    },
    "invites": {
      ".read": "auth != null",
      "$token": {
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 6. Testing Social Authentication

### Test Flow:
1. Open your app in incognito/private browsing
2. Click a social login button
3. Complete the OAuth flow in the popup
4. Verify user is created in Firebase Authentication
5. Check that user profile is created in database

### Common Issues:

**Popup Blocked:**
- Users must allow popups for your domain
- Add error handling: `auth/popup-blocked`

**Email Already Exists:**
- If user signed up with email/password first
- Firebase returns: `auth/account-exists-with-different-credential`
- Solution: Enable account linking or prompt user to use original sign-in method

**Redirect URI Mismatch:**
- Ensure OAuth redirect URIs match exactly in provider settings
- Check for trailing slashes, http vs https

---

## 7. Production Checklist

### All Providers:
- [ ] Configure authorized domains in Firebase Console
- [ ] Add production domain to provider settings
- [ ] Test OAuth flow on production URL
- [ ] Set up proper error handling
- [ ] Monitor authentication logs

### Facebook Specific:
- [ ] Submit app for Facebook review (if using permissions beyond email)
- [ ] Set app to "Live" mode (not Development)
- [ ] Configure App Domains with production URL

### Apple Specific:
- [ ] Verify website domain ownership
- [ ] Configure proper Service ID with production domain
- [ ] Test on Safari and other browsers

### Microsoft Specific:
- [ ] Configure application branding
- [ ] Set redirect URIs for production
- [ ] Test with both personal and work accounts

---

## 8. Invite System with OAuth

When users sign in with OAuth providers, they bypass the traditional email/password signup. To handle invites:

1. **Invite Link Flow:**
   - User receives invite via email with unique link
   - Link contains token: `https://yappin.app?invite=abc123xyz`
   - Token stored in sessionStorage when page loads
   - User clicks social login button
   - After OAuth succeeds, `checkUserProfile()` validates invite token

2. **First-time OAuth Users:**
   - If user has invite token → allow account creation
   - If no invite token → show error and sign out
   - Mark invite as used after successful profile creation

3. **Returning Users:**
   - Check if profile exists in database
   - If exists → allow login
   - If not exists → require valid invite token

---

## Security Best Practices

1. **Never expose secrets in client code**
   - Client secrets belong in Firebase Console only
   - Private keys (.p8) never leave Firebase

2. **Validate all OAuth tokens server-side**
   - Use Firebase Admin SDK for verification
   - Don't trust client-provided auth tokens

3. **Handle token expiration**
   - OAuth access tokens expire
   - Firebase handles refresh automatically

4. **Implement rate limiting**
   - Prevent abuse of OAuth endpoints
   - Use Firebase App Check for additional security

5. **Monitor authentication logs**
   - Check Firebase Console regularly
   - Set up alerts for suspicious activity

---

## Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Facebook Login Docs](https://developers.facebook.com/docs/facebook-login)
- [Apple Sign-In Docs](https://developer.apple.com/sign-in-with-apple/)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Google Identity Platform](https://developers.google.com/identity)

---

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review provider-specific documentation
3. Test in incognito mode to avoid cache issues
4. Verify all credentials and URIs are correct
