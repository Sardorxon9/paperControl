import fs from 'fs';

const data = JSON.parse(fs.readFileSync('firexport_basic_1767775861772.json', 'utf-8'));

const lightData = data.map(item => {
  const cleaned = {
    id: item['Document ID'],
    productName: item.productName,
    productCode: item.productCode,
    packageType: item.packageType,
    usedMaterial: item.usedMaterial,
    imageURL: item.imageURL,
    paperDocID: item.paperDocID,
    possibleGramms: item.possibleGramms
  };

  // Add additional images only if they exist and are not empty/0
  if (item.imageURL2 && item.imageURL2 !== '' && item.imageURL2 !== 0) {
    cleaned.imageURL2 = item.imageURL2;
  }
  if (item.imageURL3 && item.imageURL3 !== '' && item.imageURL3 !== 0) {
    cleaned.imageURL3 = item.imageURL3;
  }
  if (item.imageURL4 && item.imageURL4 !== '' && item.imageURL4 !== 0) {
    cleaned.imageURL4 = item.imageURL4;
  }
  if (item.imageURL5 && item.imageURL5 !== '' && item.imageURL5 !== 0) {
    cleaned.imageURL5 = item.imageURL5;
  }

  return cleaned;
});

fs.writeFileSync('catalogue_data_light.json', JSON.stringify(lightData, null, 2), 'utf-8');

const originalSize = JSON.stringify(data).length;
const lightSize = JSON.stringify(lightData).length;
const reduction = ((1 - lightSize/originalSize) * 100).toFixed(1);

console.log('✓ Light version created: catalogue_data_light.json');
console.log('');
console.log('Original size: ' + originalSize + ' bytes');
console.log('Light size: ' + lightSize + ' bytes');
console.log('Reduction: ' + reduction + '%');
console.log('');
console.log('Total products: ' + lightData.length);
console.log('');

// Stats
const byPackage = {};
const byMaterial = {};
lightData.forEach(p => {
  byPackage[p.packageType] = (byPackage[p.packageType] || 0) + 1;
  byMaterial[p.usedMaterial] = (byMaterial[p.usedMaterial] || 0) + 1;
});

console.log('By Package Type:');
Object.entries(byPackage).forEach(([k,v]) => console.log('  ' + k + ': ' + v));
console.log('');
console.log('By Material:');
Object.entries(byMaterial).forEach(([k,v]) => console.log('  ' + k + ': ' + v));
