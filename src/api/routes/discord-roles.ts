import express from 'express';
import { BotClient } from '../../bot/BotClient';

const router = express.Router();

// Test route
router.get('/test', (_req, res) => {
  res.json({ message: 'Discord roles API is working' });
});

// Get Discord server roles
router.get('/roles/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    console.log(`🔍 Fetching Discord roles for guild: ${guildId}`);
    
    // Get bot client instance
    const client = (global as any).botClient as BotClient;
    
    if (!client || !client.isReady()) {
      console.error('❌ Bot client is not ready');
      return res.status(503).json({ 
        error: 'Bot is not ready',
        details: 'The Discord bot is not connected or not ready to process requests'
      });
    }

    // Fetch guild
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.error(`❌ Guild not found: ${guildId}`);
      return res.status(404).json({ 
        error: 'Guild not found',
        details: `No guild found with ID: ${guildId}`
      });
    }

    console.log(`✅ Found guild: ${guild.name}`);

    // Fetch all roles
    const roles = await guild.roles.fetch();
    console.log(`📝 Found ${roles.size} roles in guild`);
    
    // Filter out @everyone role and bot roles, format for frontend
    const formattedRoles = roles
      .filter(role => role.name !== '@everyone' && !role.managed)
      .sort((a, b) => b.position - a.position) // Sort by position (highest first)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        permissions: role.permissions.toArray(),
        mentionable: role.mentionable
      }));

    console.log(`🎭 Returning ${formattedRoles.length} filtered roles`);

    return res.json({
      guildId,
      guildName: guild.name,
      roles: formattedRoles
    });

  } catch (error: any) {
    console.error('❌ Error fetching Discord roles:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch Discord roles',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;