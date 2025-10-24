# Giphy API Setup

## Getting a Free Giphy API Key

To enable GIF functionality in Yappin', you need to get a free API key from Giphy:

### Steps:

1. **Visit Giphy Developers Portal**
   - Go to https://developers.giphy.com/
   
2. **Create an Account**
   - Click "Create an Account" or "Log In" if you already have one
   - Sign up with your email or GitHub account

3. **Create a New App**
   - Go to your Dashboard
   - Click "Create an App"
   - Choose "API" (not SDK)
   - Fill in the details:
     - App Name: `Yappin' PWA` (or whatever you prefer)
     - App Description: `Social media PWA for sharing yaps`
     - Select "I agree to the Giphy API Terms"
   - Click "Create App"

4. **Get Your API Key**
   - Your API key will be displayed on the app's page
   - Copy the API Key (it's a long alphanumeric string)

5. **Add Key to Yappin'**
   - Open `js/media.js`
   - Find line 10: `const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY_HERE';`
   - Replace `YOUR_GIPHY_API_KEY_HERE` with your actual API key
   - Save the file

### Example:

```javascript
// Before:
const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY_HERE';

// After:
const GIPHY_API_KEY = 'abc123xyz789YourActualKeyHere';
```

### API Limits (Free Tier):

- **42 requests per hour per IP address**
- **1000 requests per day**
- Perfect for development and small-scale apps

### Troubleshooting:

- **401 Unauthorized**: Your API key is invalid or not configured
- **429 Too Many Requests**: You've hit the rate limit
- **403 Forbidden**: Your app may need to be verified

### Alternative: Use Static GIFs

If you don't want to use the Giphy API, you can:
1. Remove the GIF picker functionality
2. Or implement a local GIF library
3. Or use a different GIF API service

---

**Important:** Never commit your API key to public repositories. Consider using environment variables for production.
