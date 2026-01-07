import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIk3XXtIDaUiCGGfZVSr50lPsvhbWb4YQ",
  authDomain: "papercontrol-5b31f.firebaseapp.com",
  projectId: "papercontrol-5b31f",
  storageBucket: "papercontrol-5b31f.firebasestorage.app",
  messagingSenderId: "743803718982",
  appId: "1:743803718982:web:ce24c41e9e41a0dfbf15e3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchCatalogueData() {
  try {
    console.log('Fetching catalogue data from Firestore...');

    const querySnapshot = await getDocs(collection(db, 'catalogue'));
    const catalogueData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Found ${catalogueData.length} products in catalogue`);

    // Save to JSON file
    fs.writeFileSync(
      'catalogue_data.json',
      JSON.stringify(catalogueData, null, 2),
      'utf-8'
    );

    console.log('Data saved to catalogue_data.json');

    // Also create a sample of 10 products
    const sample = catalogueData.slice(0, 10);
    fs.writeFileSync(
      'catalogue_sample_10.json',
      JSON.stringify(sample, null, 2),
      'utf-8'
    );

    console.log('Sample of 10 products saved to catalogue_sample_10.json');

    // Print summary
    console.log('\n=== Data Summary ===');
    console.log(`Total products: ${catalogueData.length}`);

    // Count by package type
    const packageTypes = {};
    catalogueData.forEach(product => {
      const type = product.packageType || 'unknown';
      packageTypes[type] = (packageTypes[type] || 0) + 1;
    });
    console.log('\nProducts by package type:');
    Object.entries(packageTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Count by material
    const materials = {};
    catalogueData.forEach(product => {
      const material = product.usedMaterial || 'unknown';
      materials[material] = (materials[material] || 0) + 1;
    });
    console.log('\nProducts by material:');
    Object.entries(materials).forEach(([material, count]) => {
      console.log(`  ${material}: ${count}`);
    });

    // Show sample product structure
    if (catalogueData.length > 0) {
      console.log('\n=== Sample Product Structure ===');
      console.log(JSON.stringify(catalogueData[0], null, 2));
    }

  } catch (error) {
    console.error('Error fetching catalogue data:', error);
    process.exit(1);
  }
}

fetchCatalogueData();
