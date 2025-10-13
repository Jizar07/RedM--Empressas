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

// Helper function for server-specific prices directory
function getPricesDir(serverId?: string): string {
  if (serverId) {
    return path.join(process.cwd(), 'data', 'worker-prices', serverId);
  }
  return path.join(process.cwd(), 'data', 'worker-prices');
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
    const serverId = req.query.serverId as string | undefined;
    const { firmId } = req.params;
    const pricesDir = getPricesDir(serverId);
    const filePath = path.join(pricesDir, `${firmId}.json`);

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const prices = JSON.parse(data);
      console.log(`📊 Retrieved worker prices for firm ${firmId}:`, prices);
      return res.json({ ...prices, serverId: serverId || 'legacy' });
    } else {
      console.log(`📊 No custom prices for firm ${firmId}, returning defaults`);
      return res.json({ ...DEFAULT_PRICES, serverId: serverId || 'legacy' });
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
    const { serverId, plantPrice, animalPrice, animalCost, updatedBy } = req.body;

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

    const pricesDir = getPricesDir(serverId);
    // Ensure directory exists
    if (!fs.existsSync(pricesDir)) {
      fs.mkdirSync(pricesDir, { recursive: true });
    }

    const filePath = path.join(pricesDir, `${firmId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(prices, null, 2));

    console.log(`💾 Updated worker prices for firm ${firmId}:`, prices);
    return res.json({ success: true, prices, serverId: serverId || 'legacy' });
  } catch (error) {
    console.error('❌ Error updating worker prices:', error);
    return res.status(500).json({ error: 'Failed to update prices' });
  }
});

/**
 * Get prices for all firms (admin endpoint)
 */
router.get('/worker-prices/all', authenticate, (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const pricesDir = getPricesDir(serverId);
    const allPrices: Record<string, WorkerPrices> = {};

    if (fs.existsSync(pricesDir)) {
      const files = fs.readdirSync(pricesDir);

      files.forEach(file => {
        if (file.endsWith('.json')) {
          const firmId = file.replace('.json', '');
          const filePath = path.join(pricesDir, file);
          const data = fs.readFileSync(filePath, 'utf8');
          allPrices[firmId] = JSON.parse(data);
        }
      });
    }

    console.log(`📊 Retrieved prices for ${Object.keys(allPrices).length} firms`);
    return res.json({ prices: allPrices, serverId: serverId || 'legacy' });
  } catch (error) {
    console.error('❌ Error getting all worker prices:', error);
    return res.status(500).json({ error: 'Failed to retrieve all prices' });
  }
});

export default router;