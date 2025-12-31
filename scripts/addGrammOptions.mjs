// Script to add possibleGramms field to catalogue items based on usedMaterial
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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

// Gramm mapping based on usedMaterial
const grammMapping = {
  "Белый сахар": [4, 5],
  "Коричневый сахар": [4, 5],
  "Сливки": [3],
  "Соль": [3],
  "Сахарозаменитель": [3]
};

async function addGrammOptions() {
  try {
    console.log("Starting to add possibleGramms to catalogue items...\n");

    const catalogueRef = collection(db, "catalogue");
    const snapshot = await getDocs(catalogueRef);

    let updatedCount = 0;
    let skippedCount = 0;
    let notMappedCount = 0;

    console.log(`Found ${snapshot.size} catalogue items\n`);

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const usedMaterial = data.usedMaterial;
      const productCode = data.productCode;

      // Check if usedMaterial has a gramm mapping
      if (grammMapping[usedMaterial]) {
        const possibleGramms = grammMapping[usedMaterial];

        // Update document
        await updateDoc(doc(db, "catalogue", docSnapshot.id), {
          possibleGramms: possibleGramms
        });

        console.log(`✓ Updated: ${productCode} (${usedMaterial}) -> possibleGramms: [${possibleGramms.join(", ")}]`);
        updatedCount++;

      } else if (!grammMapping[usedMaterial]) {
        console.log(`⚠ Not mapped: ${productCode} (${usedMaterial}) - No gramm mapping defined`);
        notMappedCount++;
      } else {
        console.log(`- Skipped: ${productCode} (${usedMaterial})`);
        skippedCount++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total items processed: ${snapshot.size}`);
    console.log(`✓ Updated with possibleGramms: ${updatedCount}`);
    console.log(`⚠ Not mapped (no gramm rule): ${notMappedCount}`);
    console.log(`- Skipped: ${skippedCount}`);

    process.exit(0);

  } catch (error) {
    console.error("Error adding gramm options:", error);
    process.exit(1);
  }
}

// Run the function
addGrammOptions();
