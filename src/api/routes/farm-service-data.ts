import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

interface Receipt {
  receiptId: string;
  timestamp: string;
  playerName: string;
  serviceType: 'animal' | 'planta';
  quantity: number;
  animalType?: string;
  plantName?: string;
  playerPayment: number;
  status: string;
  approved: boolean;
  paid?: boolean;
  paidAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
}

interface PlayerSummary {
  playerName: string;
  totalEarnings: number;
  totalServices: number;
  animalServices: number;
  plantServices: number;
  lastService: string;
}

// Get all farm service data (overview)
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const playersDir = path.join(process.cwd(), 'data', 'players');
    
    if (!fs.existsSync(playersDir)) {
      res.json({
        totalPlayers: 0,
        totalEarnings: 0,
        totalServices: 0,
        totalAnimalServices: 0,
        totalPlantServices: 0,
        players: []
      });
      return;
    }

    const playerDirs = fs.readdirSync(playersDir);
    const players: PlayerSummary[] = [];
    let totalEarnings = 0;
    let totalServices = 0;
    let totalAnimalServices = 0;
    let totalPlantServices = 0;

    for (const playerDir of playerDirs) {
      try {
        const summaryPath = path.join(playersDir, playerDir, 'summary.json');
        if (fs.existsSync(summaryPath)) {
          const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
          players.push(summary);
          totalEarnings += summary.totalEarnings;
          totalServices += summary.totalServices;
          totalAnimalServices += summary.animalServices;
          totalPlantServices += summary.plantServices;
        }
      } catch (error) {
        console.error(`Error reading summary for ${playerDir}:`, error);
      }
    }

    // Sort players by total earnings (highest first)
    players.sort((a, b) => b.totalEarnings - a.totalEarnings);

    res.json({
      totalPlayers: players.length,
      totalEarnings,
      totalServices,
      totalAnimalServices,
      totalPlantServices,
      players
    });
  } catch (error) {
    console.error('Error getting farm service overview:', error);
    res.status(500).json({ error: 'Failed to load overview data' });
  }
});

// Get recent receipts
router.get('/recent-receipts', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const playersDir = path.join(process.cwd(), 'data', 'players');
    
    if (!fs.existsSync(playersDir)) {
      res.json([]);
      return;
    }

    const allReceipts: Receipt[] = [];
    const playerDirs = fs.readdirSync(playersDir);

    for (const playerDir of playerDirs) {
      try {
        const receiptsDir = path.join(playersDir, playerDir, 'receipts');
        if (fs.existsSync(receiptsDir)) {
          const receiptFiles = fs.readdirSync(receiptsDir);
          
          for (const receiptFile of receiptFiles) {
            if (receiptFile.endsWith('.json')) {
              const receiptPath = path.join(receiptsDir, receiptFile);
              const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
              allReceipts.push(receipt);
            }
          }
        }
      } catch (error) {
        console.error(`Error reading receipts for ${playerDir}:`, error);
      }
    }

    // Sort by timestamp (newest first) and limit
    allReceipts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json(allReceipts.slice(0, limit));
  } catch (error) {
    console.error('Error getting recent receipts:', error);
    res.status(500).json({ error: 'Failed to load recent receipts' });
  }
});

// Get receipts for specific player
router.get('/player/:playerName/receipts', async (req: Request, res: Response) => {
  try {
    const playerName = req.params.playerName;
    const receiptsDir = path.join(process.cwd(), 'data', 'players', playerName, 'receipts');
    
    if (!fs.existsSync(receiptsDir)) {
      res.json([]);
      return;
    }

    const receiptFiles = fs.readdirSync(receiptsDir);
    const receipts: Receipt[] = [];

    for (const receiptFile of receiptFiles) {
      if (receiptFile.endsWith('.json')) {
        try {
          const receiptPath = path.join(receiptsDir, receiptFile);
          const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
          receipts.push(receipt);
        } catch (error) {
          console.error(`Error reading receipt ${receiptFile}:`, error);
        }
      }
    }

    // Sort by timestamp (newest first)
    receipts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json(receipts);
  } catch (error) {
    console.error('Error getting player receipts:', error);
    res.status(500).json({ error: 'Failed to load player receipts' });
  }
});

// Update receipt
router.put('/receipt/:receiptId', async (req: Request, res: Response) => {
  try {
    const { receiptId } = req.params;
    const updatedData = req.body;
    const playersDir = path.join(process.cwd(), 'data', 'players');
    
    // Find the receipt
    const playerDirs = fs.readdirSync(playersDir);
    let found = false;
    
    for (const playerDir of playerDirs) {
      const receiptPath = path.join(playersDir, playerDir, 'receipts', `${receiptId}.json`);
      
      if (fs.existsSync(receiptPath)) {
        // Update the receipt
        const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
        const updated = { ...receipt, ...updatedData, editedAt: new Date().toISOString() };
        fs.writeFileSync(receiptPath, JSON.stringify(updated, null, 2));
        
        // Update player summary if payment changed
        if (updatedData.playerPayment && updatedData.playerPayment !== receipt.playerPayment) {
          const summaryPath = path.join(playersDir, playerDir, 'summary.json');
          if (fs.existsSync(summaryPath)) {
            const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
            summary.totalEarnings = summary.totalEarnings - receipt.playerPayment + updatedData.playerPayment;
            fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
          }
        }
        
        found = true;
        res.json({ success: true, receipt: updated });
        break;
      }
    }
    
    if (!found) {
      res.status(404).json({ error: 'Receipt not found' });
    }
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
});

// Delete receipt
router.delete('/receipt/:receiptId', async (req: Request, res: Response) => {
  try {
    const { receiptId } = req.params;
    const playersDir = path.join(process.cwd(), 'data', 'players');
    
    // Find and delete the receipt
    const playerDirs = fs.readdirSync(playersDir);
    let found = false;
    
    for (const playerDir of playerDirs) {
      const receiptPath = path.join(playersDir, playerDir, 'receipts', `${receiptId}.json`);
      
      if (fs.existsSync(receiptPath)) {
        // Read receipt before deleting to update summary
        const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
        
        // Delete the receipt file
        fs.unlinkSync(receiptPath);
        
        // Update player summary
        const summaryPath = path.join(playersDir, playerDir, 'summary.json');
        if (fs.existsSync(summaryPath)) {
          const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
          summary.totalEarnings -= receipt.playerPayment;
          summary.totalServices -= 1;
          
          if (receipt.serviceType === 'animal') {
            summary.animalServices -= 1;
          } else {
            summary.plantServices -= 1;
          }
          
          fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        }
        
        found = true;
        res.json({ success: true, message: 'Receipt deleted successfully' });
        break;
      }
    }
    
    if (!found) {
      res.status(404).json({ error: 'Receipt not found' });
    }
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// Get all receipts with filters
router.get('/receipts', async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      serviceType, 
      playerName, 
      startDate, 
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;
    
    const playersDir = path.join(process.cwd(), 'data', 'players');
    
    if (!fs.existsSync(playersDir)) {
      res.json([]);
      return;
    }

    const allReceipts: Receipt[] = [];
    const playerDirs = fs.readdirSync(playersDir);

    for (const playerDir of playerDirs) {
      // Skip if filtering by player and doesn't match
      if (playerName && playerDir !== playerName) continue;
      
      try {
        const receiptsDir = path.join(playersDir, playerDir, 'receipts');
        if (fs.existsSync(receiptsDir)) {
          const receiptFiles = fs.readdirSync(receiptsDir);
          
          for (const receiptFile of receiptFiles) {
            if (receiptFile.endsWith('.json')) {
              const receiptPath = path.join(receiptsDir, receiptFile);
              const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
              
              // Apply filters
              if (status && receipt.status !== status) continue;
              if (serviceType && receipt.serviceType !== serviceType) continue;
              if (startDate && new Date(receipt.timestamp) < new Date(startDate as string)) continue;
              if (endDate && new Date(receipt.timestamp) > new Date(endDate as string)) continue;
              
              allReceipts.push(receipt);
            }
          }
        }
      } catch (error) {
        console.error(`Error reading receipts for ${playerDir}:`, error);
      }
    }

    // Sort receipts
    allReceipts.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'playerPayment':
          compareValue = a.playerPayment - b.playerPayment;
          break;
        case 'quantity':
          compareValue = a.quantity - b.quantity;
          break;
        case 'playerName':
          compareValue = a.playerName.localeCompare(b.playerName);
          break;
        case 'timestamp':
        default:
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      
      return sortOrder === 'desc' ? -compareValue : compareValue;
    });
    
    res.json(allReceipts);
  } catch (error) {
    console.error('Error getting receipts:', error);
    res.status(500).json({ error: 'Failed to load receipts' });
  }
});

export default router;