import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const CONFIG_PATH = path.join(process.cwd(), 'data', 'moderation-config.json');

interface ModerationConfig {
  clearCommand: {
    enabled: boolean;
    defaultLimit: number;
    requireReason: boolean;
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

function ensureDataDir() {
  const dataDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadConfig(): ModerationConfig {
  ensureDataDir();
  
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading moderation config:', error);
      return defaultConfig;
    }
  }
  
  return defaultConfig;
}

function saveConfig(config: ModerationConfig): void {
  ensureDataDir();
  
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving moderation config:', error);
    throw error;
  }
}

// Get moderation configuration
router.get('/config', (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting moderation config:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// Update moderation configuration
router.post('/config', (req: Request, res: Response) => {
  try {
    const config: ModerationConfig = req.body;
    saveConfig(config);
    
    // Emit config update event for the bot to reload
    if (req.app.locals.bot) {
      req.app.locals.bot.emit('moderationConfigUpdate', config);
    }
    
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving moderation config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

export default router;
export { loadConfig, ModerationConfig };