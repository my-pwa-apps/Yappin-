# Deploy Firebase Rules

## Important: Deploy Updated Rules to Firebase

The Firebase rules have been updated to fix the indexing warning and invite codes permissions.

### Option 1: Firebase Console (Easiest)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Realtime Database** → **Rules** tab
4. Copy the contents of `firebase.rules.json` 
5. Paste into the editor
6. Click **Publish**

### Option 2: Firebase CLI
If you have Firebase CLI installed:
```bash
firebase deploy --only database
```

### Option 3: Manual Copy-Paste
Copy the entire contents of `firebase.rules.json` and paste it into the Firebase Console Rules editor.

## What Changed
1. ✅ Added `.indexOn` for `timestamp` in `userYaps` (fixes performance warning)
2. ✅ Fixed `inviteCodes` permissions (individual codes readable by anyone for validation)
3. ✅ Added `users/{uid}/inviteCodes` for storing user's code references

## After Deploying
The Firebase indexing warning will disappear and invite codes will work properly.
