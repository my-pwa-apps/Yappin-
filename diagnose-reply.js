// Diagnostic script to check a specific problematic reply
// Run in browser console

async function diagnoseReply() {
  const replyId = '-OcBvCBE2OcKz4TjreeG';
  
  console.log(`🔍 Diagnosing reply: ${replyId}`);
  
  if (!firebase || !firebase.database || !firebase.auth) {
    console.error('❌ Firebase not initialized');
    return;
  }
  
  const database = firebase.database();
  const auth = firebase.auth();
  
  if (!auth.currentUser) {
    console.error('❌ Not authenticated');
    return;
  }
  
  console.log(`👤 Current user: ${auth.currentUser.uid}`);
  
  try {
    // Check if reply exists
    console.log('\n1️⃣ Checking if reply exists in /yaps...');
    const replySnap = await database.ref(`yaps/${replyId}`).once('value');
    
    if (!replySnap.exists()) {
      console.error('❌ Reply does not exist in /yaps');
      return;
    }
    
    const replyData = replySnap.val();
    console.log('✅ Reply exists:', replyData);
    
    // Check replyTo field
    console.log('\n2️⃣ Checking replyTo field...');
    if (replyData.replyTo) {
      console.log(`✅ Has replyTo: ${replyData.replyTo}`);
      
      // Check if parent exists
      console.log('\n3️⃣ Checking parent yap...');
      const parentSnap = await database.ref(`yaps/${replyData.replyTo}`).once('value');
      
      if (parentSnap.exists()) {
        const parentData = parentSnap.val();
        console.log('✅ Parent exists:', {
          id: replyData.replyTo,
          uid: parentData.uid,
          username: parentData.username,
          text: parentData.text?.substring(0, 50)
        });
        
        // Check if you can access parent
        console.log('\n4️⃣ Checking parent access permissions...');
        if (parentData.uid === auth.currentUser.uid) {
          console.log('✅ Parent is yours - should have access');
        } else {
          console.log(`⚠️  Parent belongs to: ${parentData.uid}`);
          console.log('   Checking if you follow them...');
          
          const followingSnap = await database.ref(`following/${auth.currentUser.uid}/${parentData.uid}`).once('value');
          if (followingSnap.exists()) {
            console.log('✅ You follow parent author');
          } else {
            console.log('❌ You do NOT follow parent author');
          }
        }
      } else {
        console.error('❌ Parent yap does not exist!');
      }
    } else {
      console.error('❌ Reply is missing replyTo field!');
      console.log('\n💡 Fix: Add replyTo field manually');
      
      // Find where this reply is listed
      console.log('\n5️⃣ Searching yapReplies for this reply...');
      const yapRepliesSnap = await database.ref('yapReplies').once('value');
      const yapReplies = yapRepliesSnap.val();
      
      let foundIn = null;
      for (const parentId in yapReplies) {
        if (yapReplies[parentId][replyId]) {
          foundIn = parentId;
          break;
        }
      }
      
      if (foundIn) {
        console.log(`✅ Found listed under parent: ${foundIn}`);
        console.log(`\n🔧 To fix, run:`);
        console.log(`firebase.database().ref('yaps/${replyId}/replyTo').set('${foundIn}')`);
      } else {
        console.log('❌ Not found in yapReplies index');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

diagnoseReply();
