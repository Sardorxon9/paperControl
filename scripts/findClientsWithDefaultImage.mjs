// Script to find all clients with default placeholder images
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  or
} from "firebase/firestore";
import { writeFileSync } from "fs";

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

const DEFAULT_IMAGE_URL = "https://ik.imagekit.io/php1jcf0t/default_placeholder.jpg";

async function findClientsWithDefaultImage() {
  try {
    console.log("🔍 Searching for clients with default placeholder images...\n");

    // Fetch all clients
    const clientsSnapshot = await getDocs(collection(db, "clients"));
    const allClients = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✓ Found ${allClients.length} total clients\n`);

    // Filter clients with default image URLs
    const clientsWithDefaultImage = allClients.filter(client =>
      client.imageURL1 === DEFAULT_IMAGE_URL ||
      client.imageURL2 === DEFAULT_IMAGE_URL
    );

    console.log(`📊 Found ${clientsWithDefaultImage.length} clients with default placeholder images\n`);

    if (clientsWithDefaultImage.length === 0) {
      console.log("✓ No clients found with default placeholder images");
      process.exit(0);
    }

    // Prepare results for display and file output
    const results = clientsWithDefaultImage.map(client => ({
      id: client.id,
      name: client.name || client.restaurant || "N/A",
      imageURL1: client.imageURL1 || "N/A",
      imageURL2: client.imageURL2 || "N/A",
      designType: client.designType || "N/A",
      productCode: client.productCode || "N/A"
    }));

    // Display results in console
    console.log("📋 Clients with default placeholder images:");
    console.log("=".repeat(80));
    results.forEach((client, index) => {
      console.log(`\n${index + 1}. ${client.name} (ID: ${client.id})`);
      console.log(`   imageURL1: ${client.imageURL1}`);
      console.log(`   imageURL2: ${client.imageURL2}`);
      console.log(`   Design Type: ${client.designType}`);
      console.log(`   Product Code: ${client.productCode}`);
    });
    console.log("\n" + "=".repeat(80));

    // Write results to JSON file
    const outputFile = "clients_with_default_images.json";
    writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf8");
    console.log(`\n✅ Results saved to ${outputFile}`);

    // Also create a CSV file
    const csvOutputFile = "clients_with_default_images.csv";
    const csvHeader = "ID,Name,ImageURL1,ImageURL2,DesignType,ProductCode\n";
    const csvRows = results.map(client =>
      `"${client.id}","${client.name}","${client.imageURL1}","${client.imageURL2}","${client.designType}","${client.productCode}"`
    ).join("\n");
    writeFileSync(csvOutputFile, csvHeader + csvRows, "utf8");
    console.log(`✅ Results also saved to ${csvOutputFile}\n`);

    process.exit(0);

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
findClientsWithDefaultImage();
