// Migration script to establish bidirectional link between productTypes and catalogue
// Uses the existing paperDocID in catalogue to update productTypes with catalogueItemID
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
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

async function linkProductTypesToCatalogue() {
  try {
    console.log("🔄 Starting migration to link productTypes with catalogue...\n");

    // Step 1: Fetch all catalogue items
    console.log("📚 Fetching catalogue items...");
    const catalogueSnapshot = await getDocs(collection(db, "catalogue"));
    const catalogueItems = catalogueSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✓ Found ${catalogueItems.length} catalogue items\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let noPaperDocCount = 0;

    // Step 2: Process each catalogue item that has a paperDocID
    for (const catalogueItem of catalogueItems) {
      console.log(`\n📋 Processing catalogue: ${catalogueItem.productName} (${catalogueItem.id})`);

      try {
        // Skip if no paperDocID
        if (!catalogueItem.paperDocID || catalogueItem.paperDocID === 'n/a') {
          console.log(`  ⏭ No paperDocID, skipping...`);
          noPaperDocCount++;
          continue;
        }

        const productTypeId = catalogueItem.paperDocID;
        console.log(`  → Linking to productType: ${productTypeId}`);

        // Update productType with catalogue reference
        const updateData = {
          catalogueItemID: catalogueItem.id,
          imageURL: catalogueItem.imageURL || '',
          productCode: catalogueItem.productCode || '',
          usedMaterial: catalogueItem.usedMaterial || '',
          packageType: catalogueItem.packageType || '',
          productName: catalogueItem.productName || '',
        };

        await updateDoc(doc(db, "productTypes", productTypeId), updateData);

        console.log(`  ✅ ProductType updated successfully`);
        console.log(`     - Added catalogueItemID: ${catalogueItem.id}`);
        console.log(`     - Added imageURL: ${catalogueItem.imageURL ? 'Yes' : 'No'}`);
        console.log(`     - Added productCode: ${catalogueItem.productCode || 'N/A'}`);
        updatedCount++;

      } catch (error) {
        console.error(`  ❌ Error updating productType:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Migration Summary:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total catalogue items found:  ${catalogueItems.length}`);
    console.log(`✅ Successfully updated:       ${updatedCount}`);
    console.log(`⏭ No paperDocID (skipped):    ${noPaperDocCount}`);
    console.log(`❌ Errors:                     ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

    console.log("✅ Migration complete! ProductTypes now have catalogueItemID references.");
    console.log("   Images should now display in the Standard Rolls table.\n");

    process.exit(0);

  } catch (error) {
    console.error("❌ Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
linkProductTypesToCatalogue();
