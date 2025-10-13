import { Router, Request, Response } from 'express';
import { BotClient } from '../../bot/BotClient';

const router = Router();

/**
 * Check if bot is present in specified guilds
 * GET /api/guilds/check-bot-presence?guildIds=xxx,yyy,zzz
 */
router.get('/check-bot-presence', async (req: Request, res: Response) => {
  try {
    const { guildIds } = req.query;

    if (!guildIds || typeof guildIds !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'guildIds query parameter is required (comma-separated list)'
      });
    }

    const bot: BotClient = (global as any).botClient;
    if (!bot || !bot.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Bot is not ready'
      });
    }

    // Split guild IDs and check bot presence
    const ids = guildIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
    const presence: Record<string, boolean> = {};

    for (const guildId of ids) {
      // Check if bot is in this guild
      const guild = bot.guilds.cache.get(guildId);
      presence[guildId] = !!guild;
    }

    res.json({
      success: true,
      presence,
      totalChecked: ids.length,
      botPresent: Object.values(presence).filter(Boolean).length
    });
  } catch (error) {
    console.error('Error checking bot presence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check bot presence'
    });
  }
});

/**
 * Get list of guilds where bot is present
 * GET /api/guilds/bot-guilds
 */
router.get('/bot-guilds', async (_req: Request, res: Response) => {
  try {
    const bot: BotClient = (global as any).botClient;
    if (!bot || !bot.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Bot is not ready'
      });
    }

    const guilds = bot.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      memberCount: guild.memberCount
    }));

    res.json({
      success: true,
      guilds,
      totalGuilds: guilds.length
    });
  } catch (error) {
    console.error('Error fetching bot guilds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot guilds'
    });
  }
});

export default router;
