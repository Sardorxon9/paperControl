/**
 * Migration Script: Copy missing invoices from clients/{id}/invoices to all-invoices collection
 *
 * This script:
 * 1. Fetches all invoices from all-invoices collection (already migrated)
 * 2. Fetches all invoices from clients/{clientId}/invoices subcollections
 * 3. Compares invoice numbers to find missing ones
 * 4. Copies missing invoices to all-invoices with proper clientId and orgName
 *
 * Run with: node migrate-invoices.js
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query
} = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoYiTk7tqrpDKOvG9mDHHTlfP77MZ4sKA",
  authDomain: "paper-control-6bce2.firebaseapp.com",
  projectId: "paper-control-6bce2",
  storageBucket: "paper-control-6bce2.firebasestorage.app",
  messagingSenderId: "155530303186",
  appId: "1:155530303186:web:b51bf32911852967dcbf0b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateInvoices() {
  console.log('🚀 Starting invoice migration...\n');

  try {
    // Step 1: Get all existing invoice numbers from all-invoices
    console.log('📋 Step 1: Fetching existing invoices from all-invoices collection...');
    const allInvoicesSnapshot = await getDocs(collection(db, 'all-invoices'));
    const existingInvoiceNumbers = new Set();

    allInvoicesSnapshot.forEach(doc => {
      const invoiceNumber = doc.data().invoiceNumber;
      if (invoiceNumber) {
        existingInvoiceNumbers.add(invoiceNumber);
      }
    });

    console.log(`✅ Found ${existingInvoiceNumbers.size} existing invoices in all-invoices\n`);

    // Step 2: Get all clients
    console.log('📋 Step 2: Fetching all clients...');
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    console.log(`✅ Found ${clientsSnapshot.size} clients\n`);

    // Step 3: For each client, fetch their invoices
    console.log('📋 Step 3: Scanning client invoices and copying missing ones...\n');

    let totalScanned = 0;
    let totalMigrated = 0;
    const migrationErrors = [];

    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      const clientOrgName = clientData.displayOrgName || clientData.orgName || '';

      console.log(`  Checking client: ${clientOrgName || clientId}...`);

      // Get all invoices for this client
      const clientInvoicesSnapshot = await getDocs(
        collection(db, `clients/${clientId}/invoices`)
      );

      let clientMigrated = 0;

      for (const invoiceDoc of clientInvoicesSnapshot.docs) {
        totalScanned++;
        const invoiceData = invoiceDoc.data();
        const invoiceNumber = invoiceData.invoiceNumber;

        // Check if this invoice is already in all-invoices
        if (!existingInvoiceNumbers.has(invoiceNumber)) {
          try {
            // Copy to all-invoices with clientId and orgName
            const allInvoicesData = {
              ...invoiceData,
              clientId: clientId,
              orgName: clientOrgName
            };

            await addDoc(collection(db, 'all-invoices'), allInvoicesData);

            existingInvoiceNumbers.add(invoiceNumber); // Prevent duplicates in this run
            totalMigrated++;
            clientMigrated++;

            console.log(`    ✅ Migrated invoice: ${invoiceNumber}`);
          } catch (error) {
            console.error(`    ❌ Error migrating invoice ${invoiceNumber}:`, error.message);
            migrationErrors.push({
              clientId,
              invoiceNumber,
              error: error.message
            });
          }
        }
      }

      if (clientMigrated > 0) {
        console.log(`    📊 Migrated ${clientMigrated} invoices from this client`);
      } else {
        console.log(`    ✓ No missing invoices for this client`);
      }
      console.log('');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total invoices scanned: ${totalScanned}`);
    console.log(`Already in all-invoices: ${totalScanned - totalMigrated}`);
    console.log(`Newly migrated: ${totalMigrated}`);
    console.log(`Errors: ${migrationErrors.length}`);
    console.log('='.repeat(60));

    if (migrationErrors.length > 0) {
      console.log('\n❌ Errors encountered:');
      migrationErrors.forEach(err => {
        console.log(`  - Client ${err.clientId}, Invoice ${err.invoiceNumber}: ${err.error}`);
      });
    }

    if (totalMigrated > 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n✅ No new invoices to migrate. All invoices are up to date!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateInvoices()
  .then(() => {
    console.log('\n✅ Script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
