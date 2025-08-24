import { Router, Request, Response } from 'express';
import MessageManagerService from '../../services/MessageManagerService';

const router = Router();

interface WebhookRequest extends Request {
  body: {
    messageType?: string;
    title?: string;
    description?: string;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    color?: number;
    timestamp?: string;
    channelId?: string;
  };
}

let messageManager: MessageManagerService | null = null;

export function setMessageManager(manager: MessageManagerService): void {
  messageManager = manager;
}

router.post('/update-message', async (req: WebhookRequest, res: Response): Promise<void> => {
  try {
    if (!messageManager) {
      res.status(500).json({ 
        success: false, 
        error: 'Message manager not initialized' 
      });
      return;
    }

    const { channelId, ...messageData } = req.body;

    if (!channelId) {
      res.status(400).json({ 
        success: false, 
        error: 'channelId is required' 
      });
      return;
    }

    await messageManager.updateOrCreateMessage(channelId, messageData);

    console.log(`📨 Webhook message processed for channel ${channelId}, type: ${messageData.messageType || 'default'}`);

    res.json({ 
      success: true, 
      message: 'Message updated successfully',
      channelId,
      messageType: messageData.messageType || 'default'
    });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook message' 
    });
  }
});

router.delete('/delete-message', async (req: WebhookRequest, res: Response): Promise<void> => {
  try {
    if (!messageManager) {
      res.status(500).json({ 
        success: false, 
        error: 'Message manager not initialized' 
      });
      return;
    }

    const { channelId, messageType } = req.body;

    if (!channelId) {
      res.status(400).json({ 
        success: false, 
        error: 'channelId is required' 
      });
      return;
    }

    await messageManager.deleteMessage(channelId, messageType || 'default');

    res.json({ 
      success: true, 
      message: 'Message deleted successfully',
      channelId,
      messageType: messageType || 'default'
    });

  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete message' 
    });
  }
});

router.get('/managed-messages', (_req: Request, res: Response): void => {
  try {
    if (!messageManager) {
      res.status(500).json({ 
        success: false, 
        error: 'Message manager not initialized' 
      });
      return;
    }

    const messages = messageManager.getManagedMessages();
    
    res.json({ 
      success: true, 
      messages 
    });

  } catch (error) {
    console.error('❌ Error getting managed messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get managed messages' 
    });
  }
});

router.delete('/clear-channel/:channelId', (req: Request, res: Response): void => {
  try {
    if (!messageManager) {
      res.status(500).json({ 
        success: false, 
        error: 'Message manager not initialized' 
      });
      return;
    }

    const { channelId } = req.params;
    messageManager.clearChannel(channelId);
    
    res.json({ 
      success: true, 
      message: `Cleared managed messages for channel ${channelId}` 
    });

  } catch (error) {
    console.error('❌ Error clearing channel:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear channel' 
    });
  }
});

router.post('/channel-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📨 Received channel logs request:', JSON.stringify(req.body, null, 2));

    // Handle test requests
    if (req.body.test) {
      console.log('✅ Test request received successfully');
      res.json({ 
        success: true, 
        message: 'Test endpoint working',
        received: req.body
      });
      return;
    }

    const { channelId, messages, systemEndpoint } = req.body;

    if (!channelId || !messages || !Array.isArray(messages)) {
      res.status(400).json({ 
        success: false, 
        error: 'channelId and messages array are required' 
      });
      return;
    }

    if (!systemEndpoint) {
      res.status(400).json({ 
        success: false, 
        error: 'systemEndpoint is required' 
      });
      return;
    }

    // Process messages to detect messageType and format for your system
    const processedMessages = messages.map((msg: any) => {
      const content = msg.content || '';
      let messageType = 'UNKNOWN';
      
      // Auto-detect message types based on content patterns
      if (content.includes('INSERIR ITEM') || content.includes('inserir item')) {
        messageType = 'INSERIR ITEM';
      } else if (content.includes('REMOVER ITEM') || content.includes('remover item')) {
        messageType = 'REMOVER ITEM';
      } else if (content.includes('FARM') || content.includes('farm')) {
        messageType = 'FARM';
      }

      return {
        id: msg.id,
        author: msg.author?.displayName || msg.author?.username || 'Unknown',
        content: content,
        timestamp: msg.timestamp,
        messageType: messageType
      };
    });

    // Send to your external system endpoint
    const { default: axios } = await import('axios');
    await axios.post(systemEndpoint, {
      channelId,
      messages: processedMessages,
      source: 'discord_bot',
      parsedAt: new Date().toISOString()
    });

    console.log(`📨 Channel logs sent to system: ${processedMessages.length} messages from channel ${channelId}`);

    res.json({ 
      success: true, 
      message: 'Channel logs processed and sent to system',
      channelId,
      messagesProcessed: processedMessages.length
    });

  } catch (error) {
    console.error('❌ Error processing channel logs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process channel logs' 
    });
  }
});

export default router;