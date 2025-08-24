import { Router, Response } from 'express';
import ChannelParserService from '../../services/ChannelParserService';
import { BotClient } from '../../bot/BotClient';
import { authenticateUser, requireModerator, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

interface ParseChannelRequest {
  channelId: string;
  webhookUrl: string;
  limit?: number;
  filterUser?: string;
  filterKeyword?: string;
  startDate?: string;
  endDate?: string;
}

router.post('/parse', authenticateUser, requireModerator, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      channelId,
      webhookUrl,
      limit = 100,
      filterUser,
      filterKeyword,
      startDate,
      endDate
    }: ParseChannelRequest = req.body;

    if (!channelId || !webhookUrl) {
      res.status(400).json({
        error: 'channelId and webhookUrl are required'
      });
      return;
    }

    // Get the bot client (this would need to be passed from your main app)
    const client = req.app.get('botClient') as BotClient;
    
    if (!client) {
      res.status(500).json({
        error: 'Bot client not available'
      });
      return;
    }

    const parser = new ChannelParserService(client);
    
    // Parse messages from channel
    let messages = await parser.parseChannelMessages(channelId, limit);
    
    // Apply filters if specified
    if (filterUser) {
      messages = await parser.filterMessagesByUser(messages, filterUser);
    }
    
    if (filterKeyword) {
      messages = await parser.filterMessagesByKeyword(messages, filterKeyword);
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      messages = await parser.filterMessagesByDateRange(messages, start, end);
    }
    
    if (messages.length === 0) {
      res.status(404).json({
        error: 'No messages found matching criteria',
        channelId,
        filtersApplied: {
          filterUser,
          filterKeyword,
          startDate,
          endDate
        }
      });
      return;
    }

    // Send to webhook
    await parser.sendToWebhook(webhookUrl, channelId, messages);
    
    // Log the action
    console.log(`Channel ${channelId} parsed by ${req.user?.username} (${req.user?.discordId}). Messages: ${messages.length}, Webhook: ${webhookUrl}`);
    
    res.json({
      success: true,
      channelId,
      messagesParsed: messages.length,
      filtersApplied: {
        filterUser,
        filterKeyword,
        startDate,
        endDate
      },
      parsedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in channel parser API:', error);
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

router.get('/preview/:channelId', authenticateUser, requireModerator, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const { limit = 10 } = req.query;

    const client = req.app.get('botClient') as BotClient;
    
    if (!client) {
      res.status(500).json({
        error: 'Bot client not available'
      });
      return;
    }

    const parser = new ChannelParserService(client);
    const messages = await parser.parseChannelMessages(channelId, Number(limit));
    
    res.json({
      channelId,
      messages,
      totalMessages: messages.length,
      previewedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in channel preview API:', error);
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;