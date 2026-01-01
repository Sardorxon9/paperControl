// Migration script for invoice type updates and standard client cleanup
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Step A: Add type="custom" to all existing invoices
async function addTypeToInvoices() {
  console.log("\n" + "=".repeat(60));
  console.log("STEP A: Adding type='custom' to all existing invoices");
  console.log("=".repeat(60) + "\n");

  try {
    const invoicesSnapshot = await getDocs(collection(db, "all-invoices"));
    const totalInvoices = invoicesSnapshot.docs.length;

    console.log(`📋 Found ${totalInvoices} invoices in all-invoices collection`);

    if (totalInvoices === 0) {
      console.log("✓ No invoices to migrate");
      return { success: 0, skipped: 0, errors: 0 };
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const invoiceDoc of invoicesSnapshot.docs) {
      const invoiceData = invoiceDoc.data();

      try {
        // Skip if already has type field
        if (invoiceData.type) {
          console.log(`  ⏭ Invoice ${invoiceDoc.id} already has type: ${invoiceData.type}`);
          skippedCount++;
          continue;
        }

        // Add type="custom" to invoice
        await updateDoc(doc(db, "all-invoices", invoiceDoc.id), {
          type: "custom"
        });

        console.log(`  ✅ Updated invoice ${invoiceDoc.id} with type='custom'`);
        successCount++;

      } catch (error) {
        console.error(`  ❌ Error updating invoice ${invoiceDoc.id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⏭ Skipped (already migrated): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log("-".repeat(60));

    return { success: successCount, skipped: skippedCount, errors: errorCount };

  } catch (error) {
    console.error("❌ Fatal error in Step A:", error);
    throw error;
  }
}

// Step B: Backup standard design clients
async function backupStandardClients() {
  console.log("\n" + "=".repeat(60));
  console.log("STEP B: Backing up standard design clients");
  console.log("=".repeat(60) + "\n");

  try {
    const standardClientsQuery = query(
      collection(db, "clients"),
      where("designType", "==", "standart")
    );

    const standardClientsSnapshot = await getDocs(standardClientsQuery);
    const totalClients = standardClientsSnapshot.docs.length;

    console.log(`📋 Found ${totalClients} standard design clients`);

    if (totalClients === 0) {
      console.log("✓ No standard design clients to backup");
      return { count: 0, filePath: null };
    }

    // Prepare backup data
    const backupData = {
      backupDate: new Date().toISOString(),
      totalClients: totalClients,
      clients: []
    };

    for (const clientDoc of standardClientsSnapshot.docs) {
      const clientData = clientDoc.data();

      // Fetch branches if they exist
      let branches = [];
      try {
        const branchesSnapshot = await getDocs(
          collection(db, `clients/${clientDoc.id}/branches`)
        );
        branches = branchesSnapshot.docs.map(branchDoc => ({
          id: branchDoc.id,
          ...branchDoc.data()
        }));
      } catch (error) {
        console.log(`  ⚠ No branches found for client ${clientDoc.id}`);
      }

      // Fetch invoices if they exist
      let invoices = [];
      try {
        const invoicesSnapshot = await getDocs(
          collection(db, `clients/${clientDoc.id}/invoices`)
        );
        invoices = invoicesSnapshot.docs.map(invoiceDoc => ({
          id: invoiceDoc.id,
          ...invoiceDoc.data()
        }));
      } catch (error) {
        console.log(`  ⚠ No invoices found for client ${clientDoc.id}`);
      }

      backupData.clients.push({
        id: clientDoc.id,
        ...clientData,
        branches: branches,
        invoices: invoices
      });

      console.log(`  ✅ Backed up client: ${clientData.name || clientData.restaurant} (ID: ${clientDoc.id})`);
    }

    // Save to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `standard-clients-backup-${timestamp}.json`;
    const backupFilePath = path.join(__dirname, backupFileName);

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log("\n" + "-".repeat(60));
    console.log(`✅ Backup saved to: ${backupFilePath}`);
    console.log(`📊 Total clients backed up: ${totalClients}`);
    console.log("-".repeat(60));

    return { count: totalClients, filePath: backupFilePath };

  } catch (error) {
    console.error("❌ Fatal error in Step B:", error);
    throw error;
  }
}

// Step C: Delete standard design clients
async function deleteStandardClients() {
  console.log("\n" + "=".repeat(60));
  console.log("STEP C: Deleting standard design clients");
  console.log("=".repeat(60) + "\n");

  try {
    const standardClientsQuery = query(
      collection(db, "clients"),
      where("designType", "==", "standart")
    );

    const standardClientsSnapshot = await getDocs(standardClientsQuery);
    const totalClients = standardClientsSnapshot.docs.length;

    console.log(`📋 Found ${totalClients} standard design clients to delete`);

    if (totalClients === 0) {
      console.log("✓ No standard design clients to delete");
      return { deleted: 0, errors: 0 };
    }

    let deletedCount = 0;
    let errorCount = 0;

    for (const clientDoc of standardClientsSnapshot.docs) {
      const clientData = clientDoc.data();

      try {
        // Delete branches subcollection first
        try {
          const branchesSnapshot = await getDocs(
            collection(db, `clients/${clientDoc.id}/branches`)
          );
          for (const branchDoc of branchesSnapshot.docs) {
            await deleteDoc(doc(db, `clients/${clientDoc.id}/branches`, branchDoc.id));
          }
          console.log(`    🗑 Deleted ${branchesSnapshot.docs.length} branches`);
        } catch (error) {
          console.log(`    ⚠ No branches to delete for client ${clientDoc.id}`);
        }

        // Delete invoices subcollection
        try {
          const invoicesSnapshot = await getDocs(
            collection(db, `clients/${clientDoc.id}/invoices`)
          );
          for (const invoiceDoc of invoicesSnapshot.docs) {
            await deleteDoc(doc(db, `clients/${clientDoc.id}/invoices`, invoiceDoc.id));
          }
          console.log(`    🗑 Deleted ${invoicesSnapshot.docs.length} invoices`);
        } catch (error) {
          console.log(`    ⚠ No invoices to delete for client ${clientDoc.id}`);
        }

        // Delete the client document
        await deleteDoc(doc(db, "clients", clientDoc.id));

        console.log(`  ✅ Deleted client: ${clientData.name || clientData.restaurant} (ID: ${clientDoc.id})`);
        deletedCount++;

      } catch (error) {
        console.error(`  ❌ Error deleting client ${clientDoc.id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`✅ Successfully deleted: ${deletedCount} clients`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log("-".repeat(60));

    return { deleted: deletedCount, errors: errorCount };

  } catch (error) {
    console.error("❌ Fatal error in Step C:", error);
    throw error;
  }
}

// Main migration function
async function runMigration() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 INVOICE & CLIENT MIGRATION SCRIPT");
  console.log("=".repeat(60));
  console.log("This script will:");
  console.log("  1. Add type='custom' to all existing invoices");
  console.log("  2. Backup all standard design clients to JSON");
  console.log("  3. Delete all standard design clients");
  console.log("=".repeat(60) + "\n");

  const results = {
    stepA: null,
    stepB: null,
    stepC: null
  };

  try {
    // Step A: Add type to invoices
    results.stepA = await addTypeToInvoices();

    // Step B: Backup standard clients
    results.stepB = await backupStandardClients();

    // Step C: Delete standard clients
    if (results.stepB.count > 0) {
      console.log("\n⚠️  WARNING: About to delete standard design clients!");
      console.log("Backup has been saved. Proceeding with deletion in 3 seconds...\n");

      // Wait 3 seconds before deletion
      await new Promise(resolve => setTimeout(resolve, 3000));

      results.stepC = await deleteStandardClients();
    } else {
      console.log("\nℹ️  No standard clients to delete, skipping Step C");
      results.stepC = { deleted: 0, errors: 0 };
    }

    // Final Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log("\nStep A - Invoice Type Migration:");
    console.log(`  ✅ Updated: ${results.stepA.success}`);
    console.log(`  ⏭ Skipped: ${results.stepA.skipped}`);
    console.log(`  ❌ Errors: ${results.stepA.errors}`);

    console.log("\nStep B - Client Backup:");
    console.log(`  📁 Clients backed up: ${results.stepB.count}`);
    if (results.stepB.filePath) {
      console.log(`  💾 Backup file: ${results.stepB.filePath}`);
    }

    console.log("\nStep C - Client Deletion:");
    console.log(`  🗑 Clients deleted: ${results.stepC.deleted}`);
    console.log(`  ❌ Errors: ${results.stepC.errors}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Migration completed successfully!");
    console.log("=".repeat(60) + "\n");

    process.exit(0);

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ MIGRATION FAILED");
    console.error("=".repeat(60));
    console.error(error);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }
}

// Run the migration
runMigration();
