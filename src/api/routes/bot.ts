import { Router } from 'express';
import { BotClient } from '../../bot/BotClient';
import { authenticateUser, requireAdmin } from '../middleware/auth';

const router = Router();

// Get bot stats - requires authentication
router.get('/stats', authenticateUser, async (req, res, next) => {
  try {
    const bot: BotClient = req.app.locals.bot;
    
    res.json({
      ready: bot.isReady(),
      uptime: bot.uptime,
      guilds: bot.guilds.cache.size,
      users: bot.users.cache.size,
      channels: bot.channels.cache.size,
      commands: bot.commands.size,
      ping: bot.ws.ping,
    });
  } catch (error) {
    next(error);
  }
});

// Get guild info - requires admin permissions (sensitive info)
router.get('/guilds', authenticateUser, requireAdmin, async (req, res, next) => {
  try {
    const bot: BotClient = req.app.locals.bot;
    
    const guilds = bot.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL(),
    }));
    
    res.json(guilds);
  } catch (error) {
    next(error);
  }
});

export default router;