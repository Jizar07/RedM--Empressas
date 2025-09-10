require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

async function syncFromPaidReceipts() {
  try {
    const frontendUrl = 'http://localhost:3051';
    const paidReceiptsDir = path.join(process.cwd(), 'data', 'paid-receipts');
    
    // Get all paid receipt files
    const files = await fs.readdir(paidReceiptsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} paid receipts to sync`);
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(paidReceiptsDir, file);
        const receiptData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        
        if (receiptData.finalizedBy && receiptData.totalEarnings > 0) {
          console.log(`Syncing: ${receiptData.playerName} - $${receiptData.totalEarnings}`);
          
          const paymentData = {
            userId: receiptData.channelId || 'unknown', // Use channel ID as fallback
            userName: receiptData.playerName,
            payment: receiptData.totalEarnings,
            serviceType: receiptData.services?.[0]?.serviceType || 'mixed',
            itemType: `${receiptData.totalServices} services`,
            quantity: receiptData.totalServices,
            receiptId: `receipt_${receiptData.channelId}_${Date.now()}`,
            approvedBy: 'System',
            paidBy: receiptData.finalizedBy,
            timestamp: receiptData.finalizedAt || receiptData.lastUpdated,
            description: `Payment for ${receiptData.totalServices} services`
          };

          const response = await fetch(`${frontendUrl}/api/webhook/farm-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
          });

          if (response.ok) {
            console.log(`✅ Synced ${receiptData.playerName} payment`);
          } else {
            console.error(`❌ Failed to sync ${receiptData.playerName}: ${response.status}`);
          }
        }
        
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
    
    console.log('Finished syncing paid receipts');
    process.exit(0);
    
  } catch (error) {
    console.error('Error syncing from paid receipts:', error);
    process.exit(1);
  }
}

syncFromPaidReceipts();