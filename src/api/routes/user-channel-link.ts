import { Router, Request, Response } from 'express';
import { authenticateUser, requireModerator, AuthenticatedRequest } from '../middleware/auth';
import UserChannelLinkService from '../../services/UserChannelLinkService';
import { BotClient } from '../../bot/BotClient';

const router = Router();

// Test user-channel linking for a specific category
router.post('/compare', authenticateUser, requireModerator, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { categoryId, guildId, similarityThreshold = 0.7 } = req.body;
    
    if (!categoryId) {
      res.status(400).json({ error: 'Category ID is required' });
      return;
    }
    
    const botClient = req.app.get('botClient') as BotClient;
    if (!botClient || !botClient.isReady()) {
      res.status(503).json({ error: 'Bot client not ready' });
      return;
    }
    
    // Set the client for the service
    UserChannelLinkService.setClient(botClient);
    
    // Use provided guildId or default from environment
    const targetGuildId = guildId || process.env.DISCORD_GUILD_ID;
    if (!targetGuildId) {
      res.status(400).json({ error: 'Guild ID not configured' });
      return;
    }
    
    console.log(`🔍 Starting user-channel comparison for category ${categoryId} in guild ${targetGuildId}`);
    
    // Perform the comparison
    const matches = await UserChannelLinkService.compareUsersWithChannels(
      targetGuildId,
      categoryId,
      Number(similarityThreshold)
    );
    
    // Generate a detailed report
    const report = UserChannelLinkService.generateComparisonReport(matches);
    
    console.log('📊 Comparison Report:\n', report);
    
    res.json({
      success: true,
      categoryId,
      guildId: targetGuildId,
      similarityThreshold,
      summary: {
        totalUsers: matches.length,
        exactMatches: matches.filter(m => m.matchType === 'exact').length,
        partialMatches: matches.filter(m => m.matchType === 'partial').length,
        noMatches: matches.filter(m => m.matchType === 'none').length,
        matchRate: ((matches.filter(m => m.matchType !== 'none').length / matches.length) * 100).toFixed(1) + '%'
      },
      matches,
      report
    });
    
  } catch (error: any) {
    console.error('❌ Error in user-channel comparison:', error);
    res.status(500).json({ 
      error: 'Failed to compare users with channels',
      details: error.message 
    });
  }
});

// Internal endpoint for system-to-system communication (no auth required)
router.post('/internal/compare', async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, guildId, similarityThreshold = 0.7 } = req.body;
    
    if (!categoryId) {
      res.status(400).json({ error: 'Category ID is required' });
      return;
    }
    
    const botClient = req.app.get('botClient') as BotClient;
    if (!botClient || !botClient.isReady()) {
      res.status(503).json({ error: 'Bot client not ready' });
      return;
    }
    
    // Set the client for the service
    UserChannelLinkService.setClient(botClient);
    
    // Use provided guildId or default from environment
    const targetGuildId = guildId || process.env.DISCORD_GUILD_ID;
    if (!targetGuildId) {
      res.status(400).json({ error: 'Guild ID not configured' });
      return;
    }
    
    console.log(`🔍 [INTERNAL] Starting user-channel comparison for category ${categoryId}`);
    
    // Perform the comparison
    const matches = await UserChannelLinkService.compareUsersWithChannels(
      targetGuildId,
      categoryId,
      Number(similarityThreshold)
    );
    
    // Generate a detailed report
    const report = UserChannelLinkService.generateComparisonReport(matches);
    
    res.json({
      success: true,
      categoryId,
      guildId: targetGuildId,
      matches,
      report
    });
    
  } catch (error: any) {
    console.error('❌ [INTERNAL] Error in user-channel comparison:', error);
    res.status(500).json({ 
      error: 'Failed to compare users with channels',
      details: error.message 
    });
  }
});

// Get channels in a category
router.get('/category/:categoryId/channels', authenticateUser, requireModerator, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const { guildId } = req.query;
    
    const botClient = req.app.get('botClient') as BotClient;
    if (!botClient || !botClient.isReady()) {
      res.status(503).json({ error: 'Bot client not ready' });
      return;
    }
    
    UserChannelLinkService.setClient(botClient);
    
    const targetGuildId = (guildId as string) || process.env.DISCORD_GUILD_ID;
    if (!targetGuildId) {
      res.status(400).json({ error: 'Guild ID not configured' });
      return;
    }
    
    const channels = await UserChannelLinkService.getChannelsInCategory(targetGuildId, categoryId);
    
    res.json({
      success: true,
      categoryId,
      channelCount: channels.length,
      channels: channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        position: channel.position,
        createdAt: channel.createdAt
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Error getting channels in category:', error);
    res.status(500).json({ 
      error: 'Failed to get channels in category',
      details: error.message 
    });
  }
});

export default router;