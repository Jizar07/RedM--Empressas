import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Helper function for server-specific config path
function getConfigPath(serverId?: string): string {
  if (serverId) {
    return path.join(process.cwd(), 'data', 'moderation-config', serverId, 'moderation-config.json');
  }
  return path.join(process.cwd(), 'data', 'moderation-config.json');
}

interface ModerationConfig {
  clearCommand: {
    enabled: boolean;
    defaultLimit: number;
    requireReason: boolean;
    excludePinnedByDefault: boolean;
    logChannel?: string;
  };
  automod: {
    enabled: boolean;
    filterBadWords: boolean;
    maxMentions: number;
    maxEmojis: number;
    capsPercentage: number;
    spamInterval: number;
    customWords: string[];
  };
  autoReply: {
    enabled: boolean;
    triggers: Array<{
      id: string;
      keywords: string[];
      response: string;
      exactMatch: boolean;
    }>;
  };
}

const defaultConfig: ModerationConfig = {
  clearCommand: {
    enabled: true,
    defaultLimit: 50,
    requireReason: false,
    excludePinnedByDefault: true,
    logChannel: ''
  },
  automod: {
    enabled: false,
    filterBadWords: true,
    maxMentions: 5,
    maxEmojis: 10,
    capsPercentage: 70,
    spamInterval: 3000,
    customWords: []
  },
  autoReply: {
    enabled: false,
    triggers: []
  }
};

function ensureDataDir(configPath: string) {
  const dataDir = path.dirname(configPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadConfig(serverId?: string): ModerationConfig {
  const configPath = getConfigPath(serverId);
  ensureDataDir(configPath);

  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading moderation config:', error);
      return defaultConfig;
    }
  }

  return defaultConfig;
}

function saveConfig(config: ModerationConfig, serverId?: string): void {
  const configPath = getConfigPath(serverId);
  ensureDataDir(configPath);

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving moderation config:', error);
    throw error;
  }
}

// Get moderation configuration
router.get('/config', (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const config = loadConfig(serverId);
    res.json({ ...config, serverId: serverId || 'legacy' });
  } catch (error) {
    console.error('Error getting moderation config:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// Update moderation configuration
router.post('/config', (req: Request, res: Response) => {
  try {
    const { serverId, ...config } = req.body;
    saveConfig(config as ModerationConfig, serverId);

    // Emit config update event for the bot to reload
    if (req.app.locals.bot) {
      req.app.locals.bot.emit('moderationConfigUpdate', config, serverId);
    }

    res.json({
      success: true,
      message: 'Configuration saved successfully',
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('Error saving moderation config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

export default router;
export { loadConfig, ModerationConfig };