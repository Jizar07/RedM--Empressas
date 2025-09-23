import { Router, Request, Response } from 'express';
import MessageManagerService from '../../services/MessageManagerService';
import FarmMessageParser from '../../services/FarmMessageParser';
import SupplyChainService from '../../services/SupplyChainService';
import FerroviaSessionService from '../../services/FerroviaSessionService';
import DiscordRoleService from '../../services/DiscordRoleService';

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
let storedExtensionMessages: any[] = []; // Store extension messages for dashboard
let supplyChainService: SupplyChainService | null = null;
let ferroviaSessionService: FerroviaSessionService | null = null;
let discordRoleService: DiscordRoleService | null = null;

export function setMessageManager(manager: MessageManagerService): void {
  messageManager = manager;
}

export function setFerroviaSessionService(service: FerroviaSessionService): void {
  ferroviaSessionService = service;
}

export function getFerroviaSessionService(): FerroviaSessionService | null {
  return ferroviaSessionService;
}

export function setDiscordRoleService(service: DiscordRoleService): void {
  discordRoleService = service;
}

// Initialize supply chain service when module loads
if (!supplyChainService) {
  supplyChainService = SupplyChainService.getInstance();
  console.log('🔧 SupplyChainService initialized in webhook receiver');
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

// New endpoint specifically for browser extension messages
router.post('/channel-messages', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔗 Browser extension message received:', {
      channelId: req.body.channelId,
      messageCount: req.body.messages?.length || 0,
      source: req.body.source || 'unknown'
    });

    const { channelId, messages } = req.body;

    if (!channelId || !messages || !Array.isArray(messages)) {
      res.status(400).json({ 
        success: false, 
        error: 'channelId and messages array are required' 
      });
      return;
    }

    // Process messages using unified parser
    const processedMessages = await Promise.all(messages.map(async (msg: any) => {
      // Use unified parser for consistent processing
      const parsed = FarmMessageParser.parseMessage(msg);

      // Add Discord role detection if we have user ID and role service is available
      let detectedRole: 'manager' | 'worker' | 'unknown' = 'unknown';
      if (discordRoleService && msg.author?.id) {
        try {
          const roleResult = await discordRoleService.detectUserRole(msg.author.id);
          detectedRole = roleResult.role;
          console.log(`🎭 Role detected for ${parsed.autor}: ${detectedRole}`);
        } catch (error) {
          console.warn(`⚠️ Could not detect role for ${parsed.autor}:`, error);
        }
      }

      return {
        ...parsed,
        workerRole: detectedRole,
        channelId: msg.channelId,
        discordTimestamp: msg.discordTimestamp,
        discordUserId: msg.author?.id, // Store Discord user ID for reference
        source: msg.source || 'browser_extension'
      };
    }));

    // Process supply chain activities
    for (const parsedMsg of processedMessages) {
      if (parsedMsg.categoria === 'supply_chain' && parsedMsg.parseSuccess && supplyChainService) {
        try {
          // Extract worker ID from message - for now use author name as worker ID
          const workerId = parsedMsg.autor.replace(/\s+/g, '_').toLowerCase();
          const workerName = parsedMsg.autor;

          // Use detected role from Discord role detection
          let role: 'manager' | 'worker' = 'worker'; // Default to worker if role detection failed
          if (parsedMsg.workerRole === 'manager') {
            role = 'manager';
          } else if (parsedMsg.workerRole === 'worker') {
            role = 'worker';
          }
          // If workerRole is 'unknown', we keep the default 'worker'
          
          // Create or get worker session
          await supplyChainService.createOrGetSession(workerId, workerName, role);
          
          // Add transaction if it's a valid supply chain transaction type
          if (parsedMsg.supplyChainType && parsedMsg.supplyChainType !== 'REVENUE_DISTRIBUTED') {
            const transactionData = {
              type: parsedMsg.supplyChainType,
              itemName: parsedMsg.item || 'Unknown Item',
              quantity: parsedMsg.quantidade || 0,
              amount: parsedMsg.valor,
              discordMessageId: parsedMsg.id,
              originalMessage: parsedMsg.content
            };
            
            await supplyChainService.addTransaction(workerId, transactionData);
            console.log(`📦 Supply chain transaction added: ${parsedMsg.supplyChainType} by ${workerName}`);
            
            // Update Ferrovia session embed if available
            if (ferroviaSessionService) {
              await ferroviaSessionService.onFerroviaActivity(workerId, workerName, parsedMsg.channelId);
              console.log(`🚂 Ferrovia session embed updated for ${workerName}`);
            }
          }
        } catch (error) {
          console.error('❌ Error processing supply chain activity:', error);
        }
      }
    }

    // Store messages for dashboard access (keep last 1000 messages)
    storedExtensionMessages = [...storedExtensionMessages, ...processedMessages].slice(-1000);
    
    // Log to console for now - you can extend this to save to file or database
    console.log('📝 Extension Messages:');
    processedMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.autor}] ${msg.content.substring(0, 100)}...`);
    });

    res.json({ 
      success: true, 
      message: 'Extension messages processed successfully',
      channelId,
      messagesReceived: processedMessages.length,
      totalStored: storedExtensionMessages.length
    });

  } catch (error) {
    console.error('❌ Error processing extension messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process extension messages' 
    });
  }
});

// GET endpoint for dashboard to retrieve stored extension messages
router.get('/channel-messages', (_req: Request, res: Response): void => {
  try {
    console.log('📊 Dashboard requesting extension messages:', storedExtensionMessages.length, 'available');
    
    res.json({
      success: true,
      messages: storedExtensionMessages,
      count: storedExtensionMessages.length,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error retrieving extension messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve extension messages' 
    });
  }
});

// Force refresh Ferrovia embed based on existing session data
router.post('/refresh-ferrovia-embed', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ferroviaSessionService || !supplyChainService) {
      res.status(503).json({ 
        success: false, 
        error: 'Services not initialized' 
      });
      return;
    }

    const { workerId, channelId } = req.body;

    if (!workerId || !channelId) {
      res.status(400).json({ 
        success: false, 
        error: 'workerId and channelId are required' 
      });
      return;
    }

    // Get the existing session to get worker name
    const session = supplyChainService.getSession(workerId);
    
    if (!session) {
      res.status(404).json({ 
        success: false, 
        error: 'Worker session not found' 
      });
      return;
    }

    // Force refresh the Ferrovia embed
    console.log(`🔄 Force refreshing Ferrovia embed for worker ${session.workerName} (${workerId})`);
    await ferroviaSessionService.createOrUpdateEmbed(workerId, session.workerName, channelId);
    console.log(`✅ Ferrovia embed refreshed for ${session.workerName}`);

    res.json({ 
      success: true, 
      message: `Ferrovia embed refreshed for ${session.workerName}`,
      workerId,
      workerName: session.workerName,
      channelId
    });

  } catch (error) {
    console.error('❌ Error refreshing Ferrovia embed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh Ferrovia embed' 
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

// Test endpoint for animal delivery detection
router.post('/test-animal-delivery', async (req: Request, res: Response): Promise<void> => {
  try {
    const testMessage = req.body.message || `REGISTRO - REGISTRO - fazenda_143
CAIXA ORGANIZAÇÃO - DEPÓSITO
Valor depositado:: $160.0
Ação:: Thiago Bennett vendeu 4 animais no matadouro
Saldo após depósito:: $7032.81
Data:: 14/09/2025 - 08:37:32`;

    console.log('🧪 Testing animal delivery detection with message:', testMessage);

    // Simulate the detection logic
    const isAnimalDelivery = testMessage.includes('CAIXA ORGANIZAÇÃO - DEPÓSITO') &&
                             testMessage.includes('vendeu') &&
                             testMessage.includes('animais no matadouro');

    if (isAnimalDelivery) {
      const acaoMatch = testMessage.match(/Ação::\s*(.+?)\s+vendeu\s+(\d+)\s+animais/);
      const valorMatch = testMessage.match(/Valor depositado::\s*\$?([\d.]+)/);

      if (acaoMatch && valorMatch) {
        const workerName = acaoMatch[1].trim();
        const quantity = parseInt(acaoMatch[2]);
        const amount = parseFloat(valorMatch[1]);

        res.json({
          detected: true,
          type: 'animal_delivery',
          workerName,
          quantity,
          amount,
          message: `Successfully detected: ${workerName} sold ${quantity} animals for $${amount}`
        });
        return;
      }
    }

    res.json({
      detected: false,
      message: 'Not detected as animal delivery'
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

export default router;