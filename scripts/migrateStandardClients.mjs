// Migration script to update existing standard design clients with new architecture
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  addDoc,
  serverTimestamp
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

async function migrateStandardClients() {
  try {
    console.log("🔄 Starting migration of standard design clients...\n");

    // Step 1: Fetch all catalogue items for reference
    console.log("📚 Fetching catalogue items...");
    const catalogueSnapshot = await getDocs(collection(db, "catalogue"));
    const catalogueItems = catalogueSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✓ Found ${catalogueItems.length} catalogue items\n`);

    // Step 2: Fetch all productTypes for reference
    console.log("📦 Fetching existing productTypes...");
    const productTypesSnapshot = await getDocs(collection(db, "productTypes"));
    const productTypes = productTypesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✓ Found ${productTypes.length} existing productTypes\n`);

    // Step 3: Find all standard design clients
    console.log("👥 Fetching standard design clients...");
    const clientsQuery = query(
      collection(db, "clients"),
      where("designType", "==", "standart")
    );
    const clientsSnapshot = await getDocs(clientsQuery);
    const standardClients = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✓ Found ${standardClients.length} standard design clients\n`);

    if (standardClients.length === 0) {
      console.log("✓ No standard design clients to migrate");
      process.exit(0);
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Step 4: Process each standard client
    for (const client of standardClients) {
      console.log(`\n📋 Processing client: ${client.name || client.restaurant} (${client.id})`);

      try {
        // Skip if already migrated
        if (client.catalogueItemID && client.productTypeID) {
          console.log(`  ⏭ Already migrated, skipping...`);
          skippedCount++;
          continue;
        }

        // Extract client's product info
        const clientGramm = client.gram || client.gramm;
        const clientProductID = client.productID_2;
        const clientPackageID = client.packageID;

        if (!clientGramm || !clientProductID || !clientPackageID) {
          console.log(`  ⚠ Missing product info (gramm: ${clientGramm}, productID: ${clientProductID}, packageID: ${clientPackageID})`);
          errorCount++;
          continue;
        }

        console.log(`  Product: ${clientProductID}, Package: ${clientPackageID}, Gramm: ${clientGramm}`);

        // Find matching catalogue item
        const matchingCatalogueItem = catalogueItems.find(item => {
          // Match by product and package (we don't have productID/packageID in catalogue yet)
          // This is a best-effort match
          return item.possibleGramms && item.possibleGramms.includes(clientGramm);
        });

        if (!matchingCatalogueItem) {
          console.log(`  ⚠ No matching catalogue item found`);
          errorCount++;
          continue;
        }

        console.log(`  ✓ Matched catalogue item: ${matchingCatalogueItem.productName} (${matchingCatalogueItem.id})`);

        // Find or create matching productType
        let productType = productTypes.find(pt =>
          pt.catalogueItemID === matchingCatalogueItem.id &&
          pt.gramm === clientGramm
        );

        let productTypeId;

        if (productType) {
          console.log(`  ✓ Found existing productType: ${productType.id}`);
          productTypeId = productType.id;
        } else {
          console.log(`  ℹ No existing productType found, creating new one...`);

          // Create new productType
          const newProductType = {
            catalogueItemID: matchingCatalogueItem.id,
            name: matchingCatalogueItem.productName,
            productCode: matchingCatalogueItem.productCode,
            imageURL: matchingCatalogueItem.imageURL || '',
            usedMaterial: matchingCatalogueItem.usedMaterial,
            packageType: matchingCatalogueItem.packageType,
            gramm: clientGramm,
            shellNum: '',
            totalKG: 0,
            paperRemaining: 0,
            notifyWhen: 50,
            productID_2: clientProductID,
            packageID: clientPackageID,
            createdAt: serverTimestamp(),
            createdByMigration: true
          };

          const productTypeRef = await addDoc(collection(db, "productTypes"), newProductType);
          productTypeId = productTypeRef.id;
          console.log(`  ✓ Created new productType: ${productTypeId}`);

          // Add empty paperInfo
          await addDoc(collection(db, "productTypes", productTypeId, "paperInfo"), {
            paperRemaining: 0,
            dateCreated: serverTimestamp()
          });
        }

        // Update client with new fields
        const updateData = {
          catalogueItemID: matchingCatalogueItem.id,
          productTypeID: productTypeId,
          productCode: matchingCatalogueItem.productCode,
          productName: matchingCatalogueItem.productName,
          packageType: matchingCatalogueItem.packageType,
          usedMaterial: matchingCatalogueItem.usedMaterial,
          imageURL: matchingCatalogueItem.imageURL || '',
          gramm: clientGramm, // Standardize to gramm
          migratedAt: serverTimestamp()
        };

        await updateDoc(doc(db, "clients", client.id), updateData);

        console.log(`  ✅ Client migrated successfully`);
        migratedCount++;

      } catch (error) {
        console.error(`  ❌ Error migrating client ${client.id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Migration Summary:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total clients found:     ${standardClients.length}`);
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`⏭ Skipped (already done): ${skippedCount}`);
    console.log(`❌ Errors:                ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

    process.exit(0);

  } catch (error) {
    console.error("❌ Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateStandardClients();
