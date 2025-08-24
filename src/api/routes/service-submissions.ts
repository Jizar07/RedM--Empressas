import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import OCRService from '../../services/OCRService';
import { EmbedBuilder } from 'discord.js';
import type { BotClient } from '../../bot/BotClient';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'screenshots');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${file.originalname}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

interface Receipt {
  receiptId: string;
  timestamp: string;
  playerName: string;
  serviceType: 'animal' | 'plant';
  quantity: number;
  animalType?: string;
  plantName?: string;
  farmIncome?: number;
  farmCost: number;
  farmProfit: number;
  playerPayment: number;
  penalty?: number;
  playerDebt?: number;
  status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL' | 'VERIFIED';
  screenshotPath: string;
  extractedText?: string;
}

// Generate unique receipt ID
function generateReceiptId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const counter = Math.floor(Math.random() * 999) + 1;
  return `${dateStr}${counter.toString().padStart(3, '0')}`;
}

// Save receipt to player folder
async function saveReceipt(receipt: Receipt): Promise<void> {
  try {
    const playerDir = path.join(process.cwd(), 'data', 'players', receipt.playerName);
    const receiptsDir = path.join(playerDir, 'receipts');
    
    // Create directories
    await fs.mkdir(receiptsDir, { recursive: true });
    
    // Save receipt JSON
    const receiptPath = path.join(receiptsDir, `${receipt.receiptId}.json`);
    await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
    
    // Update player summary
    const summaryPath = path.join(playerDir, 'summary.json');
    let summary = {
      playerName: receipt.playerName,
      totalEarnings: 0,
      totalServices: 0,
      animalServices: 0,
      plantServices: 0,
      lastService: receipt.timestamp
    };
    
    try {
      const existingSummary = await fs.readFile(summaryPath, 'utf-8');
      summary = JSON.parse(existingSummary);
    } catch {
      // File doesn't exist yet
    }
    
    // Update summary
    summary.totalEarnings += receipt.playerPayment;
    summary.totalServices += 1;
    if (receipt.serviceType === 'animal') {
      summary.animalServices += 1;
    } else {
      summary.plantServices += 1;
    }
    summary.lastService = receipt.timestamp;
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('Error saving receipt:', error);
    throw error;
  }
}

// Send receipt to Discord
async function sendDiscordReceipt(bot: BotClient, receipt: Receipt): Promise<void> {
  try {
    // Get receipts channel (configure this in your environment)
    const channelId = process.env.RECEIPTS_CHANNEL_ID || '1404492813290442902';
    const channel = bot.channels.cache.get(channelId) as any;
    
    if (!channel) {
      console.error('Receipts channel not found');
      return;
    }
    
    // Create embed based on service type
    const embed = new EmbedBuilder()
      .setTitle(`📋 Service Receipt #${receipt.receiptId}`)
      .setTimestamp(new Date(receipt.timestamp))
      .setFooter({ text: 'Farm Service System' });
    
    if (receipt.serviceType === 'animal') {
      // Set color based on status
      const color = receipt.status === 'OPTIMAL' ? 0x00FF00 : 
                   receipt.status === 'SUBOPTIMAL' ? 0xFFFF00 : 0xFF0000;
      embed.setColor(color);
      
      embed.addFields(
        { name: 'Player', value: receipt.playerName, inline: true },
        { name: 'Service', value: 'Animal Delivery', inline: true },
        { name: 'Status', value: receipt.status, inline: true },
        { name: 'Animals Delivered', value: `${receipt.quantity} ${receipt.animalType}`, inline: true },
        { name: 'Farm Income', value: `$${receipt.farmIncome?.toFixed(2)}`, inline: true },
        { name: 'Player Payment', value: `$${receipt.playerPayment.toFixed(2)}`, inline: true }
      );
      
      if (receipt.penalty && receipt.penalty > 0) {
        embed.addFields({
          name: '⚠️ Penalty',
          value: `-$${receipt.penalty.toFixed(2)} (animals under age 50)`,
          inline: false
        });
      }
      
      if (receipt.playerDebt && receipt.playerDebt > 0) {
        embed.addFields({
          name: '❌ Player Debt',
          value: `$${receipt.playerDebt.toFixed(2)} owed to farm`,
          inline: false
        });
      }
    } else {
      // Plant service
      embed.setColor(0x00FF00);
      embed.addFields(
        { name: 'Player', value: receipt.playerName, inline: true },
        { name: 'Service', value: 'Plant Deposit', inline: true },
        { name: 'Status', value: 'VERIFIED', inline: true },
        { name: 'Plant Type', value: receipt.plantName || 'Unknown', inline: true },
        { name: 'Quantity', value: receipt.quantity.toString(), inline: true },
        { name: 'Player Payment', value: `$${receipt.playerPayment.toFixed(2)}`, inline: true }
      );
    }
    
    // Send embed to channel
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending Discord receipt:', error);
  }
}

// Main submission endpoint
router.post('/', upload.single('screenshot'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Screenshot is required'
      });
      return;
    }
    
    const {
      playerName,
      serviceType,
      animalType,
      plantType,
      customPlantName,
      quantity
    } = req.body;
    
    // Validate required fields
    if (!playerName || !serviceType || !quantity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }
    
    const quantityNum = parseInt(quantity);
    const screenshotPath = req.file.path;
    
    let receipt: Receipt;
    
    if (serviceType === 'animal') {
      // Process animal service
      const ocrResult = await OCRService.processAnimalScreenshot(screenshotPath);
      
      if (!ocrResult.valid) {
        res.status(400).json({
          success: false,
          error: ocrResult.message || 'Invalid screenshot'
        });
        return;
      }
      
      receipt = {
        receiptId: generateReceiptId(),
        timestamp: new Date().toISOString(),
        playerName,
        serviceType: 'animal',
        quantity: ocrResult.quantity,
        animalType,
        farmIncome: ocrResult.farmIncome,
        farmCost: 90,
        farmProfit: 10,
        playerPayment: ocrResult.playerPayment,
        penalty: ocrResult.penalty,
        playerDebt: ocrResult.playerDebt,
        status: ocrResult.status,
        screenshotPath: screenshotPath,
        extractedText: ocrResult.extractedText
      };
    } else {
      // Process plant service with enhanced inventory verification
      const plantName = plantType === 'other' ? customPlantName : plantType;
      const ocrResult = await OCRService.processPlantScreenshot(
        screenshotPath,
        plantName,
        quantityNum
      );
      
      // Check if inventory verification failed
      if (!ocrResult.valid) {
        res.status(400).json({
          success: false,
          error: `Inventory verification failed: ${ocrResult.extractedText || 'Could not verify inventory in screenshot'}`
        });
        return;
      }
      
      receipt = {
        receiptId: generateReceiptId(),
        timestamp: new Date().toISOString(),
        playerName,
        serviceType: 'plant',
        quantity: quantityNum,
        plantName,
        farmCost: 0,
        farmProfit: 0,
        playerPayment: ocrResult.playerPayment,
        status: 'VERIFIED',
        screenshotPath: screenshotPath,
        extractedText: ocrResult.extractedText
      };
    }
    
    // Save receipt to player folder
    await saveReceipt(receipt);
    
    // Send to Discord if bot is available
    const bot = req.app.locals.bot;
    if (bot) {
      await sendDiscordReceipt(bot, receipt);
    }
    
    // Return success response
    res.json({
      success: true,
      receipt: {
        ...receipt,
        screenshotPath: `/uploads/screenshots/${path.basename(screenshotPath)}`
      }
    });
    
  } catch (error: any) {
    console.error('Service submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get player history
router.get('/player/:playerName', async (req: Request, res: Response): Promise<void> => {
  try {
    const { playerName } = req.params;
    const playerDir = path.join(process.cwd(), 'data', 'players', playerName);
    
    // Check if player exists
    try {
      await fs.access(playerDir);
    } catch {
      res.status(404).json({
        success: false,
        error: 'Player not found'
      });
      return;
    }
    
    // Read summary
    const summaryPath = path.join(playerDir, 'summary.json');
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf-8'));
    
    // Read recent receipts
    const receiptsDir = path.join(playerDir, 'receipts');
    const receiptFiles = await fs.readdir(receiptsDir);
    const receipts = [];
    
    // Get last 10 receipts
    const recentFiles = receiptFiles.slice(-10);
    for (const file of recentFiles) {
      const receiptPath = path.join(receiptsDir, file);
      const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf-8'));
      receipts.push(receipt);
    }
    
    res.json({
      success: true,
      summary,
      receipts: receipts.reverse() // Most recent first
    });
    
  } catch (error: any) {
    console.error('Error fetching player history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get all recent receipts
router.get('/recent', async (_req: Request, res: Response): Promise<void> => {
  try {
    const playersDir = path.join(process.cwd(), 'data', 'players');
    const allReceipts: Receipt[] = [];
    
    // Check if players directory exists
    try {
      await fs.access(playersDir);
    } catch {
      res.json({
        success: true,
        receipts: []
      });
      return;
    }
    
    // Read all player directories
    const players = await fs.readdir(playersDir);
    
    for (const player of players) {
      const receiptsDir = path.join(playersDir, player, 'receipts');
      
      try {
        const receiptFiles = await fs.readdir(receiptsDir);
        
        for (const file of receiptFiles) {
          const receiptPath = path.join(receiptsDir, file);
          const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf-8'));
          allReceipts.push(receipt);
        }
      } catch {
        // Player has no receipts yet
      }
    }
    
    // Sort by timestamp and return last 20
    allReceipts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    res.json({
      success: true,
      receipts: allReceipts.slice(0, 20)
    });
    
  } catch (error: any) {
    console.error('Error fetching recent receipts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;