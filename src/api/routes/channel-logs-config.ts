import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const router = Router();

interface ChannelLogMapping {
  id: string;
  serverId: string; // Discord guild/server ID this mapping belongs to
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

// Load full config from file
async function loadFullConfig(): Promise<ChannelLogsConfig> {
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

// Load config filtered by serverId
async function loadConfig(serverId?: string): Promise<ChannelLogsConfig> {
  const fullConfig = await loadFullConfig();

  // If no serverId provided, return all mappings (backward compatibility)
  if (!serverId) {
    return fullConfig;
  }

  // Filter mappings by serverId
  const filteredMappings = fullConfig.mappings.filter(m => m.serverId === serverId);

  return {
    mappings: filteredMappings,
    lastUpdated: fullConfig.lastUpdated
  };
}

// Save config to file (updates specific server's mappings)
async function saveConfig(mappings: ChannelLogMapping[], serverId?: string): Promise<void> {
  await ensureDataDirectory();

  const fullConfig = await loadFullConfig();

  if (!serverId) {
    // If no serverId, replace all mappings (backward compatibility)
    fullConfig.mappings = mappings;
  } else {
    // Remove old mappings for this server
    fullConfig.mappings = fullConfig.mappings.filter(m => m.serverId !== serverId);

    // Add new mappings for this server
    fullConfig.mappings.push(...mappings);
  }

  fullConfig.lastUpdated = new Date().toISOString();
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(fullConfig, null, 2));
}

// GET /api/channel-logs/config - Get current configuration
router.get('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const config = await loadConfig(serverId);
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
    const { mappings, serverId } = req.body;

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

      // Ensure serverId is present in each mapping
      if (serverId && !mapping.serverId) {
        mapping.serverId = serverId;
      }
    }

    await saveConfig(mappings, serverId);

    console.log(`📁 Channel logs configuration updated for ${serverId ? `server ${serverId}` : 'all servers'}: ${mappings.length} mappings`);

    res.json({
      success: true,
      message: 'Configuration saved successfully',
      mappings: mappings.length,
      serverId: serverId || 'all'
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