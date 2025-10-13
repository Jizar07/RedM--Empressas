import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

interface FarmServiceConfig {
  enabled: boolean;
  farmCost: number;
  farmProfitRequired: number;
  optimalAnimalIncome: number;
  plantPrices: {
    basic: number;
    other: number;
  };
  basicPlants: string[];
  animalTypes: string[];
  discordSettings: {
    enabled: boolean;
    channelId: string;
    embedColor: string;
  };
  ocrSettings: {
    enabled: boolean;
    language: string;
    preprocessImages: boolean;
  };
  fileSettings: {
    maxFileSize: number;
    allowedFormats: string[];
    retentionDays: number;
  };
}

const defaultConfig: FarmServiceConfig = {
  enabled: true,
  farmCost: 90,
  farmProfitRequired: 10,
  optimalAnimalIncome: 160,
  plantPrices: {
    basic: 0.15,
    other: 0.20
  },
  basicPlants: ['Milho', 'Trigo', 'Junco'],
  animalTypes: ['Bovino', 'Avino', 'Ovino', 'Cabrino', 'Suino', 'Equino'],
  discordSettings: {
    enabled: true,
    channelId: process.env.RECEIPTS_CHANNEL_ID || '1404492813290442902',
    embedColor: '#00FF00'
  },
  ocrSettings: {
    enabled: true,
    language: 'por',
    preprocessImages: true
  },
  fileSettings: {
    maxFileSize: 5,
    allowedFormats: ['jpeg', 'jpg', 'png', 'gif'],
    retentionDays: 30
  }
};

// Helper function to get server-specific config path
function getConfigPath(serverId?: string): string {
  if (serverId) {
    return path.join(process.cwd(), 'data', 'farm-service-config', serverId, 'config.json');
  }
  // Legacy path
  return path.join(process.cwd(), 'data', 'farm-service-config.json');
}

// Get farm service configuration
router.get('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const configPath = getConfigPath(serverId);
    let config = defaultConfig;

    try {
      // Try to read existing config
      const configData = await fs.readFile(configPath, 'utf-8');
      const existingConfig = JSON.parse(configData);
      config = { ...defaultConfig, ...existingConfig };
    } catch {
      // Config file doesn't exist, use defaults
      console.log(`Farm service config file not found for server ${serverId || 'legacy'}, using defaults`);
    }

    res.json({
      ...config,
      serverId: serverId || 'legacy'
    });
  } catch (error: any) {
    console.error('Error getting farm service config:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Save farm service configuration
router.post('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverId, ...config } = req.body;
    const configPath = getConfigPath(serverId);

    // Validate config structure
    if (!config || typeof config !== 'object') {
      res.status(400).json({
        error: 'Invalid configuration data'
      });
      return;
    }

    // Ensure data directory exists
    const dataDir = path.dirname(configPath);
    await fs.mkdir(dataDir, { recursive: true });

    // Save configuration
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Update environment variable if Discord channel changed (only for legacy)
    if (!serverId && config.discordSettings?.channelId) {
      process.env.RECEIPTS_CHANNEL_ID = config.discordSettings.channelId;
    }

    res.json({
      success: true,
      message: 'Farm service configuration saved successfully',
      serverId: serverId || 'legacy'
    });
  } catch (error: any) {
    console.error('Error saving farm service config:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Get farm service statistics
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const playersDir = serverId
      ? path.join(process.cwd(), 'data', 'players', serverId)
      : path.join(process.cwd(), 'data', 'players');

    const stats = {
      totalPlayers: 0,
      totalServices: 0,
      totalEarnings: 0,
      animalServices: 0,
      plantServices: 0,
      averageEarnings: 0,
      serverId: serverId || 'legacy'
    };

    try {
      const players = await fs.readdir(playersDir);
      stats.totalPlayers = players.length;

      for (const player of players) {
        try {
          const summaryPath = path.join(playersDir, player, 'summary.json');
          const summaryData = await fs.readFile(summaryPath, 'utf-8');
          const summary = JSON.parse(summaryData);

          stats.totalServices += summary.totalServices || 0;
          stats.totalEarnings += summary.totalEarnings || 0;
          stats.animalServices += summary.animalServices || 0;
          stats.plantServices += summary.plantServices || 0;
        } catch {
          // Player summary doesn't exist
        }
      }

      stats.averageEarnings = stats.totalPlayers > 0 ? stats.totalEarnings / stats.totalPlayers : 0;
    } catch {
      // Players directory doesn't exist - return empty stats
      console.log(`Players directory not found for server ${serverId || 'legacy'}`);
    }

    res.json(stats);
  } catch (error: any) {
    console.error('Error getting farm service stats:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Reset farm service data (admin only)
router.delete('/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const configPath = getConfigPath(serverId);

    const playersDir = serverId
      ? path.join(process.cwd(), 'data', 'players', serverId)
      : path.join(process.cwd(), 'data', 'players');

    const uploadsDir = serverId
      ? path.join(process.cwd(), 'uploads', 'screenshots', serverId)
      : path.join(process.cwd(), 'uploads', 'screenshots');

    // Remove all player data
    try {
      await fs.rm(playersDir, { recursive: true, force: true });
      console.log(`Removed player data for server ${serverId || 'legacy'}`);
    } catch {
      // Directory doesn't exist
    }

    // Remove all screenshots
    try {
      await fs.rm(uploadsDir, { recursive: true, force: true });
      console.log(`Removed screenshots for server ${serverId || 'legacy'}`);
    } catch {
      // Directory doesn't exist
    }

    // Reset configuration to defaults
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));

    res.json({
      success: true,
      message: 'Farm service data reset successfully',
      serverId: serverId || 'legacy'
    });
  } catch (error: any) {
    console.error('Error resetting farm service data:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

export default router;