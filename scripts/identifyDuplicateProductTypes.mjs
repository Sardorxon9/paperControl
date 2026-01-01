// Script to identify duplicate productTypes
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
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

async function identifyDuplicates() {
  try {
    console.log("🔍 Identifying duplicate productTypes...\n");

    // Fetch all productTypes
    const productTypesSnapshot = await getDocs(collection(db, "productTypes"));
    const productTypes = productTypesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📦 Found ${productTypes.length} productTypes\n`);

    // Group by catalogueItemID + gramm
    const groupedByKey = {};

    productTypes.forEach(pt => {
      const key = `${pt.catalogueItemID || 'NO_CATALOGUE'}_${pt.gramm || 'NO_GRAMM'}`;
      if (!groupedByKey[key]) {
        groupedByKey[key] = [];
      }
      groupedByKey[key].push(pt);
    });

    // Find duplicates
    console.log("📊 Analyzing for duplicates...\n");

    let duplicateGroups = [];
    let totalDuplicates = 0;

    Object.keys(groupedByKey).forEach(key => {
      const group = groupedByKey[key];
      if (group.length > 1) {
        duplicateGroups.push({ key, items: group });
        totalDuplicates += group.length - 1; // -1 because we keep one
      }
    });

    if (duplicateGroups.length === 0) {
      console.log("✅ No duplicates found! All productTypes are unique.\n");
      process.exit(0);
    }

    console.log(`⚠️  Found ${duplicateGroups.length} duplicate groups (${totalDuplicates} duplicates)\n`);
    console.log(`${'='.repeat(80)}\n`);

    duplicateGroups.forEach((group, index) => {
      console.log(`Duplicate Group ${index + 1}:`);
      console.log(`Key: ${group.key}`);
      console.log(`Count: ${group.items.length} items\n`);

      group.items.forEach((item, i) => {
        console.log(`  ${i + 1}. ID: ${item.id}`);
        console.log(`     CatalogueID: ${item.catalogueItemID || 'N/A'}`);
        console.log(`     Gramm: ${item.gramm || 'N/A'}`);
        console.log(`     ShellNum: ${item.shellNum || 'N/A'}`);
        console.log(`     TotalKG: ${item.totalKG || 0}`);
        console.log(`     ProductCode: ${item.productCode || 'N/A'}`);
        console.log(`     CreatedAt: ${item.createdAt?.toDate?.() || 'N/A'}`);
        console.log(`     CreatedByMigration: ${item.createdByMigration || 'No'}`);
        console.log();
      });

      console.log(`${'='.repeat(80)}\n`);
    });

    // Summary
    console.log("\n📋 Summary:");
    console.log(`Total productTypes: ${productTypes.length}`);
    console.log(`Duplicate groups: ${duplicateGroups.length}`);
    console.log(`Total duplicates to remove: ${totalDuplicates}`);
    console.log(`After cleanup: ${productTypes.length - totalDuplicates} productTypes\n`);

    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the identification
identifyDuplicates();
