import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'nb8o8FTWZnagPaCcDUpncySdbEy1'; // Replace with the UID of the user you created

admin.auth().setCustomUserClaims(uid, {
  admin: true,
  superAdmin: true
}).then(() => {
  console.log('Successfully set admin claims');
  
  // Create the user document in Firestore
  return admin.firestore().doc(`users/${uid}`).set({
    email: 'lolade132@gmail.com', // Replace with your admin email
    userType: 'admin',
    role: 'superadmin',
    isAdmin: true,
    isSuperAdmin: true,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  });
}).then(() => {
  console.log('Successfully created admin document');
  process.exit();
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
