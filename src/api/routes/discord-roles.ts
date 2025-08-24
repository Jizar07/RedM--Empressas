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
    
    // Get bot client instance
    const client = (global as any).botClient as BotClient;
    
    if (!client || !client.isReady()) {
      return res.status(503).json({ error: 'Bot is not ready' });
    }

    // Fetch guild
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Fetch all roles
    const roles = await guild.roles.fetch();
    
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

    return res.json({
      guildId,
      guildName: guild.name,
      roles: formattedRoles
    });

  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    return res.status(500).json({ error: 'Failed to fetch Discord roles' });
  }
});

export default router;