import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Middleware to authenticate requests
const authenticate = (req: Request, res: Response, next: any): void => {
  const botToken = Array.isArray(req.headers['x-bot-token']) 
    ? req.headers['x-bot-token'][0] 
    : req.headers['x-bot-token'];
  
  if (!botToken || botToken !== process.env.DISCORD_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};

interface WorkerPrices {
  plantPrice: number;
  animalPrice: number;
  animalCost: number;
  updatedAt: string;
  updatedBy?: string;
}

const PRICES_DIR = path.join(process.cwd(), 'data', 'worker-prices');

// Ensure directory exists
if (!fs.existsSync(PRICES_DIR)) {
  fs.mkdirSync(PRICES_DIR, { recursive: true });
}

// Default prices (fallback if no custom prices set)
const DEFAULT_PRICES: WorkerPrices = {
  plantPrice: 2.50,
  animalPrice: 40.00,
  animalCost: 20.00,
  updatedAt: new Date().toISOString()
};

/**
 * Get worker prices for a specific firm
 */
router.get('/firms/:firmId/worker-prices', authenticate, (req: Request, res: Response) => {
  try {
    const { firmId } = req.params;
    const filePath = path.join(PRICES_DIR, `${firmId}.json`);
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const prices = JSON.parse(data);
      console.log(`📊 Retrieved worker prices for firm ${firmId}:`, prices);
      return res.json(prices);
    } else {
      console.log(`📊 No custom prices for firm ${firmId}, returning defaults`);
      return res.json(DEFAULT_PRICES);
    }
  } catch (error) {
    console.error('❌ Error getting worker prices:', error);
    return res.status(500).json({ error: 'Failed to retrieve prices' });
  }
});

/**
 * Update worker prices for a specific firm
 */
router.post('/firms/:firmId/worker-prices', authenticate, (req: Request, res: Response) => {
  try {
    const { firmId } = req.params;
    const { plantPrice, animalPrice, animalCost, updatedBy } = req.body;
    
    // Validate input
    if (typeof plantPrice !== 'number' || plantPrice <= 0) {
      return res.status(400).json({ error: 'Invalid plant price' });
    }
    if (typeof animalPrice !== 'number' || animalPrice <= 0) {
      return res.status(400).json({ error: 'Invalid animal price' });
    }
    
    const prices: WorkerPrices = {
      plantPrice,
      animalPrice,
      animalCost: animalCost || 20.00, // Default animal cost
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    
    const filePath = path.join(PRICES_DIR, `${firmId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(prices, null, 2));
    
    console.log(`💾 Updated worker prices for firm ${firmId}:`, prices);
    return res.json({ success: true, prices });
  } catch (error) {
    console.error('❌ Error updating worker prices:', error);
    return res.status(500).json({ error: 'Failed to update prices' });
  }
});

/**
 * Get prices for all firms (admin endpoint)
 */
router.get('/worker-prices/all', authenticate, (_req: Request, res: Response) => {
  try {
    const allPrices: Record<string, WorkerPrices> = {};
    
    if (fs.existsSync(PRICES_DIR)) {
      const files = fs.readdirSync(PRICES_DIR);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const firmId = file.replace('.json', '');
          const filePath = path.join(PRICES_DIR, file);
          const data = fs.readFileSync(filePath, 'utf8');
          allPrices[firmId] = JSON.parse(data);
        }
      });
    }
    
    console.log(`📊 Retrieved prices for ${Object.keys(allPrices).length} firms`);
    return res.json(allPrices);
  } catch (error) {
    console.error('❌ Error getting all worker prices:', error);
    return res.status(500).json({ error: 'Failed to retrieve all prices' });
  }
});

export default router;