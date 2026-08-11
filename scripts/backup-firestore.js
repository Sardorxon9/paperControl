const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  projectId: 'paper-control-6bce2'
});

const db = admin.firestore();

const COLLECTIONS = ['clients', 'all-invoices', 'products'];

async function backupCollection(collectionName) {
  console.log(`Backing up "${collectionName}"...`);
  const snapshot = await db.collection(collectionName).get();
  const data = {};

  for (const doc of snapshot.docs) {
    data[doc.id] = doc.data();

    // Also grab subcollections
    const subcollections = await doc.ref.listCollections();
    if (subcollections.length > 0) {
      data[doc.id].__subcollections = {};
      for (const subcol of subcollections) {
        const subSnap = await subcol.get();
        data[doc.id].__subcollections[subcol.id] = {};
        for (const subDoc of subSnap.docs) {
          data[doc.id].__subcollections[subcol.id][subDoc.id] = subDoc.data();
        }
      }
    }
  }

  console.log(`  → ${snapshot.size} documents`);
  return data;
}

async function main() {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '..', 'backups', timestamp);
  fs.mkdirSync(backupDir, { recursive: true });

  for (const col of COLLECTIONS) {
    const data = await backupCollection(col);
    const filePath = path.join(backupDir, `${col}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  → Saved to ${filePath}`);
  }

  console.log(`\nBackup complete! Files in: ${backupDir}`);
}

main().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
