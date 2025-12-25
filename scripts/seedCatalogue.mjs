// Seed script to populate Firestore catalogue collection
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function seedCatalogue() {
  try {
    console.log("Starting to seed catalogue collection...\n");

    // Read the product list from list.json
    const listPath = join(__dirname, "..", "list.json");
    const productsData = readFileSync(listPath, "utf-8");
    const products = JSON.parse(productsData);

    console.log(`Found ${products.length} products to insert\n`);

    let insertedCount = 0;

    // Insert each product into Firestore
    for (const product of products) {
      const docData = {
        productName: product.productName,
        packageType: product.packageType,
        usedMaterial: product.usedMaterial,
        productCode: product.productCode,
        marketPlace: product.marketPlace,
        imageURL: product.imageURL
      };

      // Add document to catalogue collection
      const docRef = await addDoc(collection(db, "catalogue"), docData);
      insertedCount++;

      console.log(`[${insertedCount}/${products.length}] Inserted: ${product.productCode} - ${product.productName}`);
    }

    console.log(`\n✓ Successfully inserted ${insertedCount} products into the catalogue collection!`);
    process.exit(0);

  } catch (error) {
    console.error("Error seeding catalogue:", error);
    process.exit(1);
  }
}

// Run the seed function
seedCatalogue();
