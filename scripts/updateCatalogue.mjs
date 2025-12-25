// Script to add new products and update existing catalogue items
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, where } from "firebase/firestore";

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

// New products to add
const newProducts = [
  {
    "productName": "Сахар Белый в Стик упаковках",
    "packageType": "Стик",
    "usedMaterial": "Белый сахар",
    "productCode": "ST-OQ-300-1-UZM",
    "marketPlace": true,
    "imageURL": "https://ik.imagekit.io/php1jcf0t/default_placeholder.jpg",
    "paperDocID": "pCN1988gA6GBEk3qsO2J",
    "comment": "n/a"
  },
  {
    "productName": "Сахар Белый в Стик упаковках",
    "packageType": "Стик",
    "usedMaterial": "Белый сахар",
    "productCode": "ST-OQ-300-2-UZM",
    "marketPlace": true,
    "imageURL": "https://ik.imagekit.io/php1jcf0t/default_placeholder.jpg",
    "paperDocID": "lLK6qCl0TMZupamtSQD8",
    "comment": "n/a"
  }
];

// Specific paperDocID mappings for existing products
const specificPaperDocIDs = {
  "SH-SLIV-01": "5OaZ2sVoi1LAl2fGLKQd"
};

async function updateCatalogue() {
  try {
    console.log("Starting catalogue update...\n");

    // Step 1: Add new products
    console.log("=== Adding New Products ===");
    for (const product of newProducts) {
      const docRef = await addDoc(collection(db, "catalogue"), product);
      console.log(`✓ Added: ${product.productCode} (ID: ${docRef.id})`);
    }
    console.log(`\n✓ Successfully added ${newProducts.length} new products\n`);

    // Step 2: Update all existing products to add paperDocID and comment fields
    console.log("=== Updating Existing Products ===");
    const catalogueRef = collection(db, "catalogue");
    const snapshot = await getDocs(catalogueRef);

    let updatedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const productCode = data.productCode;

      // Determine paperDocID value
      let paperDocID = "n/a";
      if (specificPaperDocIDs[productCode]) {
        paperDocID = specificPaperDocIDs[productCode];
      }

      // Update document with new fields (only if they don't exist)
      const updateData = {};

      if (!data.hasOwnProperty('paperDocID')) {
        updateData.paperDocID = paperDocID;
      }

      if (!data.hasOwnProperty('comment')) {
        updateData.comment = "n/a";
      }

      // Only update if there are fields to add
      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(db, "catalogue", docSnapshot.id), updateData);
        console.log(`✓ Updated: ${productCode} - Added fields: ${Object.keys(updateData).join(", ")}`);
        updatedCount++;
      } else {
        console.log(`- Skipped: ${productCode} (already has all fields)`);
      }
    }

    console.log(`\n✓ Successfully updated ${updatedCount} existing products`);
    console.log(`\n=== Summary ===`);
    console.log(`Total products in catalogue: ${snapshot.size}`);
    console.log(`New products added: ${newProducts.length}`);
    console.log(`Existing products updated: ${updatedCount}`);

    process.exit(0);

  } catch (error) {
    console.error("Error updating catalogue:", error);
    process.exit(1);
  }
}

// Run the update function
updateCatalogue();
