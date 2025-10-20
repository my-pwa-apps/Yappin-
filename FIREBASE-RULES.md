# Firebase Security Rules Documentation

## Overview
These rules provide a balance between security and social media functionality. All operations require authentication, and users can only modify their own data.

## Rules Breakdown

### Users (`/users/{uid}`)
- **Read**: All authenticated users (needed for viewing profiles)
- **Write**: Only the user themselves
- **Use**: Store user profiles with username, bio, followers count, etc.

### Usernames (`/usernames/{username}`)
- **Read**: All authenticated users (needed for username lookups)
- **Write**: Only when creating new username or if already owned
- **Use**: Map lowercase usernames to user IDs for uniqueness checks

### Yaps (`/yaps/{yapId}`)
- **Read**: All authenticated users (public timeline)
- **Write**: Owner only, or when creating new yap
- **Use**: Store all yaps with content, likes, reyaps counts

### User Yaps (`/userYaps/{uid}/{yapId}`)
- **Read**: All authenticated users (user timelines)
- **Write**: Owner only
- **Use**: Denormalized yaps per user for efficient timeline queries

### Likes (`/likes/{yapId}/{uid}`)
- **Read**: All authenticated users
- **Write**: User can only create/delete their own likes
- **Use**: Track which users liked which yaps

### User Likes (`/userLikes/{uid}/{yapId}`)
- **Read**: All authenticated users
- **Write**: Owner only
- **Use**: Reverse index - which yaps a user has liked

### Reyaps (`/reyaps/{yapId}/{uid}`)
- **Read**: All authenticated users
- **Write**: User can only create/delete their own reyaps
- **Use**: Track which users reyapped which yaps

### User Reyaps (`/userReyaps/{uid}/{yapId}`)
- **Read**: All authenticated users
- **Write**: Owner only
- **Use**: Reverse index - which yaps a user has reyapped

### Following (`/following/{uid}`)
- **Read**: All authenticated users (to see who follows whom)
- **Write**: Owner only
- **Use**: List of users that this user follows

### Followers (`/followers/{uid}/{followerUid}`)
- **Read**: All authenticated users
- **Write**: The follower themselves
- **Use**: List of users following this user

### Notifications (`/notifications/{uid}`)
- **Read**: Owner only (private notifications)
- **Write**: Any authenticated user (to send notifications)
- **Use**: User notifications for mentions, likes, follows

### Hashtags (`/hashtags`)
- **Read**: All authenticated users
- **Write**: All authenticated users
- **Use**: Index yaps by hashtags

### Trending (`/trending`)
- **Read**: All authenticated users
- **Write**: All authenticated users
- **Use**: Track trending hashtags with counts

### User Bookmarks (`/userBookmarks/{uid}`)
- **Read**: Owner only (private bookmarks)
- **Write**: Owner only
- **Use**: Store user's bookmarked yaps

## Security Considerations

### ✅ What's Protected
- Users can only modify their own data
- Private data (notifications, bookmarks) only readable by owner
- Username uniqueness enforced
- All operations require authentication

### ⚠️ Considerations
- All yaps are publicly readable (by design for social media)
- User profiles are publicly readable (needed for @ mentions)
- Consider adding rate limiting at application level
- Consider adding data validation rules

## Deploying Rules

### Using Firebase CLI
```bash
firebase deploy --only database:rules
```

### Using Firebase Console
1. Go to Firebase Console → Realtime Database → Rules
2. Copy content from `firebase.rules.json`
3. Click "Publish"

### Testing Rules
```bash
firebase emulators:start --only database
```

## Example Queries

### Read user's timeline
```javascript
database.ref(`userYaps/${userId}`).once('value')
```

### Create a yap
```javascript
const updates = {};
updates[`yaps/${yapId}`] = yapData;
updates[`userYaps/${userId}/${yapId}`] = yapData;
database.ref().update(updates);
```

### Like a yap
```javascript
const updates = {};
updates[`likes/${yapId}/${userId}`] = true;
updates[`userLikes/${userId}/${yapId}`] = true;
database.ref().update(updates);
```

## Future Enhancements

- Add data validation (e.g., yap length limits)
- Add rate limiting rules
- Add user blocking functionality
- Add private account support
- Add content reporting rules
