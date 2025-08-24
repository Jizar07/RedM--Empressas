import { Router, Request, Response } from 'express';
import { TextChannel } from 'discord.js';

const router = Router();

// Removed farm keywords filtering - now sending ALL messages

function filterByDateRange(messages: any[], startDate: string, endDate: string): any[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return messages.filter(msg => {
    const msgDate = new Date(msg.createdTimestamp);
    return msgDate >= start && msgDate <= end;
  });
}

// 1. Bot Status Endpoint
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
      version: "0.001"
    });

  } catch (error: any) {
    console.error('Status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 2. Historical Messages Endpoint
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

    console.log(`📚 Fetching historical messages from channel ${channelId}`);
    
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
    // Removed default filtering - send ALL messages

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
    console.error('Channel history endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. Real-time Channel Status Endpoint
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
    console.error('Channel status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. Recent Messages Endpoint
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
    console.error('Recent messages endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 5. Discord User Information Endpoint
router.post('/users/info', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = req.app.locals.bot;
    const { userIds = null, includeChannels = true, includeRoles = true, includeActivity = true } = req.body;

    // Use the configured guild ID from environment variables
    const guild = bot.guilds.cache.get(process.env.DISCORD_GUILD_ID!);
    if (!guild) {
      res.status(404).json({
        success: false,
        error: `Guild not found. Looking for guild ID: ${process.env.DISCORD_GUILD_ID}`
      });
      return;
    }

    // Fetch all members with force refresh to ensure we get latest data including nicknames
    const members = await guild.members.fetch({ cache: false, force: true });
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
        nickname: member.nickname || null, // Server-specific nickname
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
    console.error('Users info endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 6. Send Online Family Members to Discord Channel
router.post('/discord/send-online-members', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = req.app.locals.bot;
    const { channelId } = req.body;

    if (!channelId) {
      res.status(400).json({
        success: false,
        error: 'channelId is required'
      });
      return;
    }

    // Get the target channel
    const channel = bot.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      res.status(404).json({
        success: false,
        error: 'Channel not found or is not a text channel'
      });
      return;
    }

    // Get online family members data
    const axios = require('axios');
    
    try {
      // Get both game players and Discord members
      const [playersResponse, membersResponse] = await Promise.all([
        axios.get('http://localhost:3050/api/internal/server-players'),
        axios.post('http://localhost:3050/api/users/info', {
          includeChannels: false,
          includeRoles: true,
          includeActivity: true
        })
      ]);

      if (!playersResponse.data || !membersResponse.data.success) {
        throw new Error('Failed to fetch required data');
      }

      const players = playersResponse.data;
      const discordMembers = membersResponse.data.users;

      // Use the same matching algorithm as frontend
      const SIMILARITY_THRESHOLD = 0.6;
      
      const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
          matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
          matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
          for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        
        return matrix[str2.length][str1.length];
      };

      const calculateSimilarity = (str1: string, str2: string): number => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
      };

      const normalizeName = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .trim();
      };

      // Match players with Discord members
      const familyMembers: any[] = [];
      
      for (const player of players) {
        let matchingMember: any = undefined;
        let bestSimilarity = 0;

        for (const member of discordMembers) {
          const steamName = player.name;
          const discordUsername = member.username;
          
          const normalizedSteamName = normalizeName(steamName);
          const normalizedDiscordName = normalizeName(discordUsername);
          
          // Exact match
          if (normalizedSteamName === normalizedDiscordName) {
            matchingMember = member;
            bestSimilarity = 1.0;
            break;
          }
          
          // Partial match
          if (normalizedSteamName.includes(normalizedDiscordName) || 
              normalizedDiscordName.includes(normalizedSteamName)) {
            const similarity = calculateSimilarity(normalizedSteamName, normalizedDiscordName);
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              matchingMember = member;
            }
          }
          
          // Fuzzy similarity
          const similarity = calculateSimilarity(normalizedSteamName, normalizedDiscordName);
          if (similarity >= SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            matchingMember = member;
          }
        }

        if (matchingMember) {
          familyMembers.push({
            discordName: matchingMember.username,
            displayName: matchingMember.displayName,
            nickname: matchingMember.nickname,
            gamePlayerName: player.name,
            gamePlayerId: player.id,
            ping: player.ping,
            avatarURL: matchingMember.avatarURL,
            roles: matchingMember.roles?.map((role: any) => role.name) || []
          });
        }
      }

      // Create Discord embed
      const { EmbedBuilder } = require('discord.js');
      
      const embed = new EmbedBuilder()
        .setColor('#10B981')
        .setTitle('🎮 Online Family Members')
        .setDescription(`**${familyMembers.length}** family members currently online`)
        .setTimestamp()
        .setFooter({ 
          text: 'Black Golden Dashboard',
          iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
        });

      if (familyMembers.length === 0) {
        embed.addFields({
          name: '📭 No Family Members Online',
          value: 'No family members are currently playing on the server.',
          inline: false
        });
      } else {
        // Group members by 10 for better formatting
        const chunks = [];
        for (let i = 0; i < familyMembers.length; i += 10) {
          chunks.push(familyMembers.slice(i, i + 10));
        }

        chunks.forEach((chunk, index) => {
          const memberList = chunk.map(member => {
            const discordName = member.nickname || member.displayName;
            const roles = member.roles.length > 0 ? ` • ${member.roles.slice(0, 2).join(', ')}` : '';
            return `**${discordName}**\n└ *${member.gamePlayerName}* (${member.ping}ms)${roles}`;
          }).join('\n\n');

          embed.addFields({
            name: index === 0 ? '👥 Online Members' : `👥 Online Members (${index + 1})`,
            value: memberList,
            inline: true
          });
        });
      }

      // Send the embed to the channel
      await channel.send({ embeds: [embed] });

      res.json({
        success: true,
        message: `Sent online family members list to #${channel.name}`,
        membersCount: familyMembers.length
      });

    } catch (dataError: any) {
      console.error('Error fetching online family members data:', dataError);
      res.status(500).json({
        success: false,
        error: `Failed to fetch member data: ${dataError.message}`
      });
      return;
    }

  } catch (error: any) {
    console.error('Discord send online members endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;