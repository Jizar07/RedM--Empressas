import { Router, Request, Response } from 'express';
import { TextChannel } from 'discord.js';
import RedMService from '../../services/RedMService';

const router = Router();

// Internal API routes for system-to-system communication (NO AUTHENTICATION REQUIRED)

function filterByDateRange(messages: any[], startDate: string, endDate: string): any[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return messages.filter(msg => {
    const msgDate = new Date(msg.createdTimestamp);
    return msgDate >= start && msgDate <= end;
  });
}

// Internal Bot Status Endpoint (bypasses auth)
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = req.app.locals.bot;
    
    if (!bot) {
      res.status(500).json({
        success: false,
        error: 'Bot not initialized'
      });
      return;
    }

    const guild = bot.guilds.cache.get(process.env.DISCORD_GUILD_ID!);
    const channelId = '1404583987778949130';

    res.json({
      success: true,
      online: bot.isReady(),
      botId: bot.user?.id,
      guildId: guild?.id,
      uptime: process.uptime() * 1000,
      connectedChannels: [channelId],
      lastActivity: new Date().toISOString(),
      version: "0.001-internal"
    });

  } catch (error: any) {
    console.error('Internal status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Internal Historical Messages Endpoint (bypasses auth)
router.post('/channel/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = req.app.locals.bot;
    const { channelId, startDate, endDate, limit = 1000, includeEmbeds = true, filterKeywords } = req.body;

    if (!channelId) {
      res.status(400).json({
        success: false,
        error: 'channelId is required'
      });
      return;
    }

    const channel = bot.channels.cache.get(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      res.status(404).json({
        success: false,
        error: 'Channel not found or is not a text channel'
      });
      return;
    }

    console.log(`🤖 INTERNAL API: Fetching historical messages from channel ${channelId}`);
    
    // Fetch messages
    const messages = await channel.messages.fetch({ limit: Math.min(limit, 100) });
    const allMessages = Array.from(messages.values());

    // Filter by date range if provided
    let filteredMessages = allMessages;
    if (startDate && endDate) {
      filteredMessages = filterByDateRange(allMessages, startDate, endDate);
    }

    // Filter by keywords if provided
    if (filterKeywords && Array.isArray(filterKeywords)) {
      filteredMessages = filteredMessages.filter((msg: any) => 
        filterKeywords.some((keyword: string) => msg.content.includes(keyword))
      );
    }

    // Format messages
    const formattedMessages = filteredMessages.map((msg: any) => {
      // Extract game date from embed or content
      let gameDate = null;
      if (msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        if (embed.fields) {
          const dateField = embed.fields.find((field: any) => field.name.includes('Data'));
          if (dateField) {
            gameDate = dateField.value.replace(/```prolog\n|```/g, '').trim();
          }
        }
      }

      return {
        id: msg.id,
        content: msg.content || (msg.embeds.length > 0 ? `Embed: ${msg.embeds[0].title || 'No title'}` : ''),
        author: msg.author.username,
        timestamp: msg.createdAt.toISOString(),
        gameDate: gameDate,
        embeds: includeEmbeds ? msg.embeds.map((embed: any) => embed.toJSON()) : []
      };
    });

    res.json({
      success: true,
      messages: formattedMessages,
      totalCount: formattedMessages.length,
      hasMore: formattedMessages.length >= limit,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });

  } catch (error: any) {
    console.error('Internal channel history endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Internal Channel Status Endpoint (bypasses auth)
router.post('/channel/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = req.app.locals.bot;
    const { channelId, includeLastMessages = 10, includeUserActivity = true } = req.body;

    if (!channelId) {
      res.status(400).json({
        success: false,
        error: 'channelId is required'
      });
      return;
    }

    const channel = bot.channels.cache.get(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      res.status(404).json({
        success: false,
        error: 'Channel not found or is not a text channel'
      });
      return;
    }

    // Get recent messages
    const recentMessages = await channel.messages.fetch({ limit: includeLastMessages });
    const lastMessages = Array.from(recentMessages.values()).map(msg => ({
      id: msg.id,
      content: msg.content || (msg.embeds.length > 0 ? `Embed: ${msg.embeds[0].title || 'No title'}` : ''),
      author: msg.author.username,
      timestamp: msg.createdAt.toISOString()
    }));

    // Get active users if requested
    let activeUsers: any[] = [];
    if (includeUserActivity) {
      const guild = channel.guild;
      const members = await guild.members.fetch();
      
      activeUsers = Array.from(members.values())
        .filter(member => !member.user.bot)
        .slice(0, 25) // Limit to 25 users
        .map(member => ({
          id: member.user.id,
          username: member.user.username,
          lastSeen: new Date().toISOString(), // Discord doesn't provide exact last seen
          isOnline: member.presence?.status === 'online' || false
        }));
    }

    res.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        memberCount: channel.guild.memberCount
      },
      lastMessages,
      activeUsers,
      messageCount: channel.lastMessageId ? parseInt(channel.lastMessageId) : 0,
      lastActivity: lastMessages.length > 0 ? lastMessages[0].timestamp : new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Internal channel status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Internal Recent Messages Endpoint (bypasses auth)
router.post('/channel/recent', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = req.app.locals.bot;
    const { channelId, limit = 100, includeEmbeds = true } = req.body;

    if (!channelId) {
      res.status(400).json({
        success: false,
        error: 'channelId is required'
      });
      return;
    }

    const channel = bot.channels.cache.get(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      res.status(404).json({
        success: false,
        error: 'Channel not found or is not a text channel'
      });
      return;
    }

    // Fetch recent messages
    const messages = await channel.messages.fetch({ limit });
    const messageArray = Array.from(messages.values());

    // Send ALL messages - no filtering
    const farmMessages = messageArray;

    const formattedMessages = farmMessages.map(msg => {
      // Extract game date from embed
      let gameDate = null;
      if (msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        if (embed.fields) {
          const dateField = embed.fields.find((field: any) => field.name.includes('Data'));
          if (dateField) {
            gameDate = dateField.value.replace(/```prolog\n|```/g, '').trim();
          }
        }
      }

      return {
        id: msg.id,
        content: msg.content || (msg.embeds.length > 0 ? `Embed: ${msg.embeds[0].title || 'No title'}` : ''),
        author: msg.author.username,
        timestamp: msg.createdAt.toISOString(),
        gameDate: gameDate,
        embeds: includeEmbeds ? msg.embeds.map((embed: any) => embed.toJSON()) : []
      };
    });

    res.json({
      success: true,
      messages: formattedMessages,
      oldestMessageId: formattedMessages.length > 0 ? formattedMessages[formattedMessages.length - 1].id : null,
      newestMessageId: formattedMessages.length > 0 ? formattedMessages[0].id : null
    });

  } catch (error: any) {
    console.error('Internal recent messages endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Internal Discord User Information Endpoint (bypasses auth)
router.post('/users/info', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = req.app.locals.bot;
    const { userIds = null, includeChannels = true, includeRoles = true, includeActivity = true } = req.body;

    const guild = bot.guilds.cache.get(process.env.DISCORD_GUILD_ID!);
    if (!guild) {
      res.status(404).json({
        success: false,
        error: 'No guild found'
      });
      return;
    }

    // Fetch all members
    const members = await guild.members.fetch();
    let targetMembers = Array.from(members.values());

    // Filter by specific user IDs if provided
    if (userIds && Array.isArray(userIds)) {
      targetMembers = targetMembers.filter((member: any) => userIds.includes(member.user.id));
    }

    // Filter out bots and limit to 50 users
    targetMembers = targetMembers
      .filter((member: any) => !member.user.bot)
      .slice(0, 50);

    const users = targetMembers.map((member: any) => {
      const user = member.user;
      const userData: any = {
        id: user.id,
        username: user.username,
        displayName: member.displayName || user.username,
        avatarURL: user.displayAvatarURL(),
        joinedAt: member.joinedAt?.toISOString() || null,
        lastSeen: new Date().toISOString()
      };

      if (includeRoles) {
        userData.roles = member.roles.cache
          .filter((role: any) => role.name !== '@everyone')
          .map((role: any) => ({
            id: role.id,
            name: role.name,
            color: role.hexColor
          }));
      }

      if (includeChannels) {
        userData.channels = ['1404583987778949130']; // Main farm channel
      }

      if (includeActivity) {
        userData.presence = {
          status: member.presence?.status || 'offline',
          activity: member.presence?.activities[0]?.name || null
        };
      }

      return userData;
    });

    const response: any = {
      success: true,
      users
    };

    if (includeChannels) {
      response.channels = guild.channels.cache
        .filter((channel: any) => channel.isTextBased())
        .map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          type: 'text'
        }));
    }

    if (includeRoles) {
      response.roles = guild.roles.cache
        .filter((role: any) => role.name !== '@everyone')
        .map((role: any) => ({
          id: role.id,
          name: role.name,
          memberCount: role.members.size
        }));
    }

    response.serverInfo = {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount
    };

    res.json(response);

  } catch (error: any) {
    console.error('Internal users info endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Internal Server Status (no auth required)
router.get('/server-status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const serverInfo = await RedMService.getServerInfo();
    res.json(serverInfo);
  } catch (error) {
    console.error('Internal server status error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch server status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Internal Players List (no auth required)
router.get('/server-players', async (_req: Request, res: Response): Promise<void> => {
  try {
    const players = await RedMService.getServerPlayers();
    res.json(players);
  } catch (error) {
    console.error('Internal server players error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch server players',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;