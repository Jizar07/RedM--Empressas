import { Router, Request, Response } from 'express';
import { ChannelType } from 'discord.js';

const router = Router();

// GET /api/discord-channels - Get all channels for a Discord server
router.get('/', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    // Get bot client from global
    const bot = (global as any).botClient;

    if (!bot || !bot.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Bot is not ready'
      });
    }

    // Fetch guild
    const guild = await bot.guilds.fetch(serverId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Guild not found'
      });
    }

    // Fetch all channels
    const channels = await guild.channels.fetch();

    // Filter and format channels
    const formattedChannels = channels
      .filter(channel => channel && channel.type === ChannelType.GuildText)
      .map(channel => ({
        id: channel!.id,
        name: channel!.name,
        type: channel!.type,
        parentId: channel!.parentId,
        position: channel!.position
      }))
      .sort((a, b) => a.position - b.position);

    res.json({
      success: true,
      channels: formattedChannels
    });
  } catch (error: any) {
    console.error('Error fetching Discord channels:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
