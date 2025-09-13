import { Router, Request, Response } from 'express';
import WorkerChannelService from '../../services/WorkerChannelService';

const router = Router();

// Global worker channel service instance
let workerChannelService: WorkerChannelService | null = null;

// Initialize the service with Discord client
export function initializeWorkerChannelService(client: any) {
  workerChannelService = new WorkerChannelService(client);
  console.log('🔧 WorkerChannelService initialized with Discord client');
}

// Middleware to check bot token
function authenticateBot(req: Request, res: Response, next: any): void {
  const botToken = Array.isArray(req.headers['x-bot-token']) ? req.headers['x-bot-token'][0] : req.headers['x-bot-token'];
  const expectedToken = process.env.BOT_WEBHOOK_TOKEN || process.env.DISCORD_TOKEN;
  
  console.log(`🔐 Auth Debug - Received token: "${botToken ? botToken.substring(0, 10) + '...' : 'undefined'}"`);
  console.log(`🔐 Auth Debug - Expected token: "${expectedToken ? expectedToken.substring(0, 10) + '...' : 'undefined'}"`);
  console.log(`🔐 Auth Debug - BOT_WEBHOOK_TOKEN exists: ${!!process.env.BOT_WEBHOOK_TOKEN}`);
  console.log(`🔐 Auth Debug - DISCORD_TOKEN exists: ${!!process.env.DISCORD_TOKEN}`);
  
  if (!botToken || botToken !== expectedToken) {
    console.log(`❌ Auth failed - tokens don't match`);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  console.log(`✅ Auth success`);
  next();
}

// Process worker activity transaction
router.post('/', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ 
        success: false, 
        error: 'Worker channel service not initialized' 
      });
    }

    const transactionData = req.body;
    console.log(`📨 Received worker activity: ${transactionData.workerName} - ${transactionData.type}`);

    // Validate required fields
    if (!transactionData.workerName || !transactionData.type || !transactionData.timestamp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: workerName, type, timestamp' 
      });
    }

    // Process the transaction
    const success = await workerChannelService.processWorkerTransaction({
      workerName: transactionData.workerName,
      type: transactionData.type,
      itemName: transactionData.itemName,
      animalType: transactionData.animalType,
      quantity: transactionData.quantity || 0,
      amount: transactionData.amount,
      timestamp: new Date(transactionData.timestamp),
      originalMessage: transactionData.originalMessage
    });

    if (success) {
      console.log(`✅ Successfully processed worker activity for ${transactionData.workerName}`);
      return res.json({ 
        success: true, 
        message: 'Worker activity processed successfully',
        workerName: transactionData.workerName,
        type: transactionData.type
      });
    } else {
      console.log(`⚠️ Worker activity processing failed for ${transactionData.workerName}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Worker not found or processing failed',
        workerName: transactionData.workerName
      });
    }

  } catch (error) {
    console.error('❌ Error processing worker activity:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get worker channel mapping
router.get('/mapping/:workerId', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const mapping = workerChannelService.getWorkerChannel(req.params.workerId);
    
    if (mapping) {
      return res.json({ success: true, mapping });
    } else {
      return res.status(404).json({ success: false, error: 'Worker mapping not found' });
    }

  } catch (error) {
    console.error('❌ Error getting worker mapping:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register worker channel mapping
router.post('/mapping', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const { workerId, workerName, channelId, registrationId } = req.body;
    
    if (!workerId || !workerName || !channelId) {
      return res.status(400).json({ error: 'Missing required fields: workerId, workerName, channelId' });
    }

    workerChannelService.registerWorkerChannel(workerId, workerName, channelId, registrationId);
    
    console.log(`📝 Registered worker channel mapping: ${workerName} (${workerId}) → ${channelId}`);
    return res.json({ 
      success: true, 
      message: 'Worker channel mapping registered successfully' 
    });

  } catch (error) {
    console.error('❌ Error registering worker mapping:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all worker mappings
router.get('/mappings', authenticateBot, async (_req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const mappings = workerChannelService.getAllWorkerMappings();
    const activeCount = workerChannelService.getActiveWorkersCount();
    
    return res.json({ 
      success: true, 
      mappings,
      activeCount,
      total: mappings.length
    });

  } catch (error) {
    console.error('❌ Error getting worker mappings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active worker sessions
router.get('/sessions', authenticateBot, async (_req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const activityService = workerChannelService.getActivityService();
    const activeSessions = activityService.getAllActiveSessions();
    const activeCount = activityService.getActiveSessionsCount();
    
    return res.json({ 
      success: true, 
      sessions: activeSessions,
      activeCount,
      total: activeSessions.length
    });

  } catch (error) {
    console.error('❌ Error getting active sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Pay worker (for manager interface)
router.post('/pay/:workerId', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const { managerId, managerName } = req.body;
    const workerId = req.params.workerId;
    
    if (!managerId || !managerName) {
      return res.status(400).json({ error: 'Missing required fields: managerId, managerName' });
    }

    const activityService = workerChannelService.getActivityService();
    const success = await activityService.payWorker(workerId, managerId, managerName);
    
    if (success) {
      console.log(`💰 Worker ${workerId} paid by ${managerName}`);
      return res.json({ 
        success: true, 
        message: 'Worker paid successfully' 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        error: 'Worker session not found or already paid' 
      });
    }

  } catch (error) {
    console.error('❌ Error paying worker:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit transaction (global save)
router.put('/transaction/:workerId/:transactionId', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const { workerId, transactionId } = req.params;
    const { newItemName, newQuantity, newAmount } = req.body;
    
    // Validate that at least one field is provided
    if ((!newItemName || newItemName.trim() === '') && newQuantity === undefined && newAmount === undefined) {
      return res.status(400).json({ error: 'At least one of newItemName, newQuantity, or newAmount is required' });
    }

    // Parse and validate optional numeric fields
    let parsedQuantity: number | undefined;
    let parsedAmount: number | undefined;

    if (newQuantity !== undefined) {
      parsedQuantity = parseInt(newQuantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({ error: 'newQuantity must be a positive integer' });
      }
    }

    if (newAmount !== undefined) {
      parsedAmount = parseFloat(newAmount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ error: 'newAmount must be a valid number >= 0' });
      }
    }

    const activityService = workerChannelService.getActivityService();
    const success = await activityService.editTransaction(
      workerId, 
      transactionId, 
      newItemName ? newItemName.trim() : undefined,
      parsedQuantity,
      parsedAmount
    );
    
    if (success) {
      console.log(`✏️ Transaction ${transactionId} edited for worker ${workerId}`);
      return res.json({ 
        success: true, 
        message: 'Transaction edited successfully' 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found or edit failed' 
      });
    }

  } catch (error) {
    console.error('❌ Error editing transaction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transaction (global save)
router.delete('/transaction/:workerId/:transactionId', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const { workerId, transactionId } = req.params;

    const activityService = workerChannelService.getActivityService();
    const success = await activityService.deleteTransaction(workerId, transactionId);
    
    if (success) {
      console.log(`🗑️ Transaction ${transactionId} deleted for worker ${workerId}`);
      return res.json({ 
        success: true, 
        message: 'Transaction deleted successfully' 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found or delete failed' 
      });
    }

  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;