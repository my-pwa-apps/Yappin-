// Browser-based migration script to add replyTo field to existing replies
// Run this in the browser console while logged into Yappin'

async function migrateRepliesInBrowser() {
  console.log('🔄 Starting reply migration...');
  
  if (!window.database || !window.auth) {
    console.error('❌ Firebase not initialized. Make sure you are on Yappin\' and logged in.');
    return;
  }
  
  if (!auth.currentUser) {
    console.error('❌ Not authenticated. Please log in first.');
    return;
  }
  
  try {
    // Get all yapReplies
    const yapRepliesSnapshot = await database.ref('yapReplies').once('value');
    const yapReplies = yapRepliesSnapshot.val();
    
    if (!yapReplies) {
      console.log('ℹ️  No yapReplies found');
      return;
    }
    
    let updateCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const updates = {};
    
    console.log('📊 Analyzing replies...');
    
    // Iterate through parent yaps
    for (const parentYapId in yapReplies) {
      const replies = yapReplies[parentYapId];
      
      // Iterate through reply IDs
      for (const replyId in replies) {
        try {
          // Check if reply exists and get its data
          const replySnapshot = await database.ref(`yaps/${replyId}`).once('value');
          
          if (replySnapshot.exists()) {
            const replyData = replySnapshot.val();
            
            // Check if replyTo field is missing or incorrect
            if (!replyData.replyTo || replyData.replyTo !== parentYapId) {
              console.log(`  ✏️  Will update: ${replyId} -> parent ${parentYapId}`);
              updates[`yaps/${replyId}/replyTo`] = parentYapId;
              updateCount++;
            } else {
              skipCount++;
            }
          }
        } catch (err) {
          console.warn(`  ⚠️  Error checking reply ${replyId}:`, err.message);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`  - ${updateCount} replies need replyTo field`);
    console.log(`  - ${skipCount} replies already correct`);
    console.log(`  - ${errorCount} errors encountered`);
    
    if (updateCount > 0) {
      console.log('\n💾 Applying updates...');
      await database.ref().update(updates);
      console.log('✅ Migration complete!');
      console.log('🔄 Please refresh the page to see updated permissions.');
    } else {
      console.log('✅ No updates needed - all replies have replyTo field');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Auto-run the migration
migrateRepliesInBrowser();
