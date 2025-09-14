const fs = require('fs');
const path = require('path');

// Test the exact same logic as the getWorkerPrices method
async function testPriceLoading() {
  const firmId = 'fazenda-cabra-da-peste';

  try {
    console.log(`🔍 Testing price loading for firmId: ${firmId}`);

    const pricesPath = path.join(process.cwd(), 'data', 'worker-prices', `${firmId}.json`);
    console.log(`📁 Checking file path: ${pricesPath}`);

    if (fs.existsSync(pricesPath)) {
      console.log(`✅ File exists, reading content...`);
      const data = fs.readFileSync(pricesPath, 'utf8');
      console.log(`📄 Raw file content:`, data);

      const prices = JSON.parse(data);
      console.log(`🔧 Parsed prices:`, prices);

      const workerPrices = {
        plantPrice: prices.plantPrice || 2.50,
        animalPrice: prices.animalPrice || 40.00,
        animalCost: prices.animalCost || 20.00
      };

      console.log(`💰 Final worker prices:`, workerPrices);

      // Test calculation for Koda Smith
      const kodaPlants = 2079; // Estimated from $5198.9 / $2.50
      const calculatedCredits = kodaPlants * workerPrices.plantPrice;
      console.log(`🧮 Koda Smith calculation:`);
      console.log(`   Plants: ${kodaPlants}`);
      console.log(`   Price per plant: $${workerPrices.plantPrice}`);
      console.log(`   Total credits: $${calculatedCredits.toFixed(2)}`);

    } else {
      console.log(`❌ File does not exist: ${pricesPath}`);

      const defaultPrices = {
        plantPrice: 2.50,
        animalPrice: 40.00,
        animalCost: 20.00
      };

      console.log(`💰 Using default worker prices:`, defaultPrices);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testPriceLoading();