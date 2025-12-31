// Migration script to add catalogueItemID to existing productTypes
// This establishes the "foreign key" relationship between productTypes and catalogue
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
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

async function fixProductTypesCatalogue() {
  try {
    console.log("🔄 Starting migration to add catalogueItemID to productTypes...\n");

    // Step 1: Fetch all catalogue items for reference
    console.log("📚 Fetching catalogue items...");
    const catalogueSnapshot = await getDocs(collection(db, "catalogue"));
    const catalogueItems = catalogueSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✓ Found ${catalogueItems.length} catalogue items\n`);

    // Step 2: Fetch all productTypes
    console.log("📦 Fetching productTypes...");
    const productTypesSnapshot = await getDocs(collection(db, "productTypes"));
    const productTypes = productTypesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✓ Found ${productTypes.length} productTypes\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let noMatchCount = 0;

    // Step 3: Process each productType
    for (const productType of productTypes) {
      console.log(`\n📋 Processing productType: ${productType.name || productType.id}`);

      try {
        // Skip if already has catalogueItemID
        if (productType.catalogueItemID) {
          console.log(`  ⏭ Already has catalogueItemID: ${productType.catalogueItemID}, skipping...`);
          skippedCount++;
          continue;
        }

        const ptGramm = productType.gramm || productType.gram;
        const ptProductCode = productType.productCode;
        const ptUsedMaterial = productType.usedMaterial;

        console.log(`  ProductCode: ${ptProductCode}, Gramm: ${ptGramm}, Material: ${ptUsedMaterial}`);

        // Find matching catalogue item
        let matchingCatalogueItem = null;

        // Strategy 1: Try exact match by productCode + gramm
        if (ptProductCode && ptGramm) {
          matchingCatalogueItem = catalogueItems.find(item =>
            item.productCode === ptProductCode &&
            item.possibleGramms &&
            item.possibleGramms.includes(ptGramm)
          );

          if (matchingCatalogueItem) {
            console.log(`  ✓ Matched by productCode + gramm`);
          }
        }

        // Strategy 2: Try match by usedMaterial + gramm
        if (!matchingCatalogueItem && ptUsedMaterial && ptGramm) {
          matchingCatalogueItem = catalogueItems.find(item =>
            item.usedMaterial === ptUsedMaterial &&
            item.possibleGramms &&
            item.possibleGramms.includes(ptGramm)
          );

          if (matchingCatalogueItem) {
            console.log(`  ✓ Matched by usedMaterial + gramm`);
          }
        }

        // Strategy 3: Try match by name similarity + gramm
        if (!matchingCatalogueItem && productType.name && ptGramm) {
          const ptNameLower = productType.name.toLowerCase();
          matchingCatalogueItem = catalogueItems.find(item => {
            const catalogueNameLower = (item.productName || '').toLowerCase();
            return catalogueNameLower.includes(ptNameLower) &&
              item.possibleGramms &&
              item.possibleGramms.includes(ptGramm);
          });

          if (matchingCatalogueItem) {
            console.log(`  ✓ Matched by name similarity + gramm`);
          }
        }

        if (!matchingCatalogueItem) {
          console.log(`  ⚠ No matching catalogue item found`);
          noMatchCount++;
          continue;
        }

        console.log(`  ✓ Matched catalogue item: ${matchingCatalogueItem.productName} (${matchingCatalogueItem.id})`);

        // Update productType with catalogue reference
        const updateData = {
          catalogueItemID: matchingCatalogueItem.id,
          imageURL: matchingCatalogueItem.imageURL || productType.imageURL || '',
          productCode: matchingCatalogueItem.productCode || productType.productCode,
          usedMaterial: matchingCatalogueItem.usedMaterial || productType.usedMaterial,
          packageType: matchingCatalogueItem.packageType || productType.packageType,
        };

        await updateDoc(doc(db, "productTypes", productType.id), updateData);

        console.log(`  ✅ ProductType updated successfully`);
        updatedCount++;

      } catch (error) {
        console.error(`  ❌ Error updating productType ${productType.id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Migration Summary:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total productTypes found:     ${productTypes.length}`);
    console.log(`✅ Successfully updated:       ${updatedCount}`);
    console.log(`⏭ Skipped (already has ref):  ${skippedCount}`);
    console.log(`⚠ No catalogue match found:   ${noMatchCount}`);
    console.log(`❌ Errors:                     ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

    process.exit(0);

  } catch (error) {
    console.error("❌ Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
fixProductTypesCatalogue();
