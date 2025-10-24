// Migration script to add replyTo field to existing replies
// Run this once to fix old replies that don't have the replyTo field

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://yappin-5f73b-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function migrateReplies() {
  console.log('Starting reply migration...');
  
  try {
    // Get all yapReplies
    const yapRepliesSnapshot = await db.ref('yapReplies').once('value');
    const yapReplies = yapRepliesSnapshot.val();
    
    if (!yapReplies) {
      console.log('No yapReplies found');
      return;
    }
    
    let updateCount = 0;
    let skipCount = 0;
    const updates = {};
    
    // Iterate through parent yaps
    for (const parentYapId in yapReplies) {
      const replies = yapReplies[parentYapId];
      
      // Iterate through reply IDs
      for (const replyId in replies) {
        // Check if reply exists and get its data
        const replySnapshot = await db.ref(`yaps/${replyId}`).once('value');
        
        if (replySnapshot.exists()) {
          const replyData = replySnapshot.val();
          
          // Check if replyTo field is missing or incorrect
          if (!replyData.replyTo || replyData.replyTo !== parentYapId) {
            console.log(`Updating reply ${replyId} -> parent ${parentYapId}`);
            updates[`yaps/${replyId}/replyTo`] = parentYapId;
            updateCount++;
          } else {
            skipCount++;
          }
        }
      }
    }
    
    console.log(`\nFound ${updateCount} replies to update, ${skipCount} already correct`);
    
    if (updateCount > 0) {
      console.log('Applying updates...');
      await db.ref().update(updates);
      console.log('✅ Migration complete!');
    } else {
      console.log('✅ No updates needed');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await admin.app().delete();
  }
}

migrateReplies();
