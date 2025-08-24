import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const router = Router();

interface ChannelLogMapping {
  id: string;
  channelId: string;
  channelName?: string;
  systemEndpoint: string;
  enabled: boolean;
  messageTypes: string[];
  description?: string;
}

interface ChannelLogsConfig {
  mappings: ChannelLogMapping[];
  lastUpdated: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'channel-logs-config.json');

// Ensure data directory exists
async function ensureDataDirectory(): Promise<void> {
  const dataDir = path.dirname(CONFIG_FILE_PATH);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load config from file
async function loadConfig(): Promise<ChannelLogsConfig> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default config if file doesn't exist
    return {
      mappings: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

// Save config to file
async function saveConfig(config: ChannelLogsConfig): Promise<void> {
  await ensureDataDirectory();
  config.lastUpdated = new Date().toISOString();
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
}

// GET /api/channel-logs/config - Get current configuration
router.get('/config', async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await loadConfig();
    res.json(config);
  } catch (error) {
    console.error('Error loading channel logs config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load configuration' 
    });
  }
});

// POST /api/channel-logs/config - Save configuration
router.post('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
      res.status(400).json({ 
        success: false, 
        error: 'mappings must be an array' 
      });
      return;
    }

    // Validate each mapping
    for (const mapping of mappings) {
      if (!mapping.id || !mapping.channelId || !mapping.systemEndpoint) {
        res.status(400).json({ 
          success: false, 
          error: 'Each mapping must have id, channelId, and systemEndpoint' 
        });
        return;
      }

      if (!Array.isArray(mapping.messageTypes)) {
        res.status(400).json({ 
          success: false, 
          error: 'messageTypes must be an array' 
        });
        return;
      }
    }

    const config: ChannelLogsConfig = {
      mappings,
      lastUpdated: new Date().toISOString()
    };

    await saveConfig(config);

    console.log(`📁 Channel logs configuration updated: ${mappings.length} mappings`);

    res.json({ 
      success: true, 
      message: 'Configuration saved successfully',
      mappings: mappings.length
    });

  } catch (error) {
    console.error('Error saving channel logs config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save configuration' 
    });
  }
});

// POST /api/channel-logs/test-endpoint - Test if an endpoint is reachable
router.post('/test-endpoint', async (req: Request, res: Response): Promise<void> => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      res.status(400).json({ 
        success: false, 
        error: 'endpoint is required' 
      });
      return;
    }

    // Send a test payload matching the expected format
    const testPayload = {
      channelId: 'test_channel_123',
      messages: [{
        id: 'test_msg_123',
        author: 'Test User',
        content: 'Test message content',
        timestamp: new Date().toISOString(),
        messageType: 'TEST'
      }],
      source: 'discord_bot_test',
      test: true
    };

    const response = await axios.post(endpoint, testPayload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot-ChannelLogsTest/1.0'
      }
    });

    console.log(`✅ Endpoint test successful: ${endpoint} responded with status ${response.status}`);

    res.json({ 
      success: true, 
      message: 'Endpoint test successful',
      status: response.status,
      responseTime: Date.now()
    });

  } catch (error: any) {
    console.error(`❌ Endpoint test failed: ${req.body.endpoint}`, error.message);
    
    res.status(500).json({ 
      success: false, 
      error: 'Endpoint test failed',
      details: error.message,
      code: error.code
    });
  }
});

// GET /api/channel-logs/status - Get status of channel log monitoring
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await loadConfig();
    const enabledMappings = config.mappings.filter(m => m.enabled);
    
    res.json({
      success: true,
      totalMappings: config.mappings.length,
      enabledMappings: enabledMappings.length,
      lastUpdated: config.lastUpdated,
      channels: enabledMappings.map(m => ({
        channelId: m.channelId,
        endpoint: m.systemEndpoint,
        messageTypes: m.messageTypes,
        description: m.description
      }))
    });

  } catch (error) {
    console.error('Error getting channel logs status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get status' 
    });
  }
});

export default router;
export { loadConfig, ChannelLogMapping, ChannelLogsConfig };