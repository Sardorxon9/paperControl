// Script to cleanup productTypes collection
// Keeps only essential fields and subcollections
// All other data should be fetched from catalogue via catalogueItemID
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteField,
} from "firebase/firestore";

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

async function cleanupProductTypes() {
  try {
    console.log("🔄 Starting cleanup of productTypes collection...\n");

    // Fields to KEEP in productTypes
    const fieldsToKeep = [
      'createdAt',
      'updatedAt',
      'gramm',
      'notifyWhen',
      'packageID',
      'paperRemaining',
      'productCode',
      'shellNum',
      'totalKG',
      'catalogueItemID', // Foreign key to catalogue
      // Subcollections: logs, paperInfo (these are not fields, they're subcollections)
    ];

    // Fetch all productTypes
    console.log("📦 Fetching productTypes...");
    const productTypesSnapshot = await getDocs(collection(db, "productTypes"));
    const productTypes = productTypesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✓ Found ${productTypes.length} productTypes\n`);

    let updatedCount = 0;
    let errorCount = 0;
    let totalFieldsRemoved = 0;

    // Process each productType
    for (const productType of productTypes) {
      console.log(`\n📋 Processing productType: ${productType.id}`);
      console.log(`   Current fields: ${Object.keys(productType).filter(k => k !== 'id').join(', ')}`);

      try {
        // Find fields to remove
        const allFields = Object.keys(productType).filter(k => k !== 'id');
        const fieldsToRemove = allFields.filter(field => !fieldsToKeep.includes(field));

        if (fieldsToRemove.length === 0) {
          console.log(`   ✓ Already clean, no fields to remove`);
          continue;
        }

        console.log(`   🗑️  Removing ${fieldsToRemove.length} fields: ${fieldsToRemove.join(', ')}`);

        // Create update object with deleteField() for each field to remove
        const updateData = {};
        fieldsToRemove.forEach(field => {
          updateData[field] = deleteField();
        });

        // Update the document
        await updateDoc(doc(db, "productTypes", productType.id), updateData);

        console.log(`   ✅ Cleaned successfully`);
        updatedCount++;
        totalFieldsRemoved += fieldsToRemove.length;

      } catch (error) {
        console.error(`   ❌ Error cleaning productType ${productType.id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Cleanup Summary:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total productTypes found:     ${productTypes.length}`);
    console.log(`✅ Successfully cleaned:       ${updatedCount}`);
    console.log(`🗑️  Total fields removed:      ${totalFieldsRemoved}`);
    console.log(`❌ Errors:                     ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

    console.log("✅ Cleanup complete!");
    console.log("\nFields kept in productTypes:");
    console.log("  - " + fieldsToKeep.join("\n  - "));
    console.log("\nSubcollections preserved:");
    console.log("  - logs");
    console.log("  - paperInfo (and all nested subcollections)\n");

    process.exit(0);

  } catch (error) {
    console.error("❌ Fatal error during cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupProductTypes();
