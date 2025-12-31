// Script to inspect productTypes structure
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

async function inspectProductTypes() {
  try {
    console.log("🔍 Inspecting productTypes structure...\n");

    const productTypesSnapshot = await getDocs(collection(db, "productTypes"));
    console.log(`Found ${productTypesSnapshot.docs.length} productTypes\n`);

    productTypesSnapshot.docs.forEach((doc, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`ProductType ${index + 1}: ${doc.id}`);
      console.log(`${'='.repeat(60)}`);
      const data = doc.data();
      console.log(JSON.stringify(data, null, 2));
    });

    console.log("\n\n🔍 Inspecting catalogue structure...\n");

    const catalogueSnapshot = await getDocs(collection(db, "catalogue"));
    console.log(`Found ${catalogueSnapshot.docs.length} catalogue items\n`);

    catalogueSnapshot.docs.slice(0, 3).forEach((doc, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Catalogue Item ${index + 1}: ${doc.id}`);
      console.log(`${'='.repeat(60)}`);
      const data = doc.data();
      console.log(JSON.stringify(data, null, 2));
    });

    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the inspection
inspectProductTypes();
