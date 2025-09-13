import { Router, Request, Response } from 'express';
import SupplyChainService, { SupplyChainTransactionType, WorkerRole } from '../../services/SupplyChainService';

const router = Router();

// Global supply chain service instance
let supplyChainService: SupplyChainService | null = null;

// Initialize the service
function initializeSupplyChainService() {
  supplyChainService = new SupplyChainService();
  console.log('🔧 SupplyChainService initialized');
}

// Middleware to check bot token
function authenticateBot(req: Request, res: Response, next: any) {
  const botToken = Array.isArray(req.headers['x-bot-token']) ? req.headers['x-bot-token'][0] : req.headers['x-bot-token'];
  const expectedToken = process.env.BOT_WEBHOOK_TOKEN || process.env.DISCORD_TOKEN;
  
  if (!botToken || botToken !== expectedToken) {
    console.log(`❌ Supply chain API auth failed`);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  next();
}

// Create or get session for a worker
router.post('/session', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ 
        success: false, 
        error: 'Supply chain service not initialized' 
      });
    }

    const { workerId, workerName, role } = req.body;
    
    if (!workerId || !workerName || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: workerId, workerName, role' 
      });
    }

    if (!['manager', 'worker'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Role must be either "manager" or "worker"' 
      });
    }

    const session = await supplyChainService.createOrGetSession(workerId, workerName, role as WorkerRole);
    
    return res.json({ 
      success: true, 
      session 
    });

  } catch (error) {
    console.error('❌ Error creating/getting supply chain session:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get session by worker ID
router.get('/session/:workerId', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const session = supplyChainService.getSession(req.params.workerId);
    
    if (session) {
      return res.json({ success: true, session });
    } else {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

  } catch (error) {
    console.error('❌ Error getting supply chain session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all active sessions
router.get('/sessions', authenticateBot, async (_req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const sessions = supplyChainService.getAllActiveSessions();
    const analytics = supplyChainService.getAnalytics();
    
    return res.json({ 
      success: true, 
      sessions,
      analytics,
      total: sessions.length
    });

  } catch (error) {
    console.error('❌ Error getting supply chain sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add transaction to session
router.post('/transaction', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ 
        success: false, 
        error: 'Supply chain service not initialized' 
      });
    }

    const { workerId, type, itemName, quantity, amount, discordMessageId, originalMessage } = req.body;
    
    if (!workerId || !type || !itemName || quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: workerId, type, itemName, quantity' 
      });
    }

    const validTypes: SupplyChainTransactionType[] = [
      'PLANTS_WITHDRAWN', 'BOXES_CREATED', 'BOXES_WITHDRAWN', 
      'FERROVIA_MISSION_COMPLETED', 'REVENUE_COLLECTED', 'REVENUE_DISTRIBUTED'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid transaction type' 
      });
    }

    const success = await supplyChainService.addTransaction(workerId, {
      type,
      itemName,
      quantity: parseInt(quantity),
      amount: amount ? parseFloat(amount) : undefined,
      discordMessageId,
      originalMessage
    });

    if (success) {
      return res.json({ 
        success: true, 
        message: 'Transaction added successfully' 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }

  } catch (error) {
    console.error('❌ Error adding supply chain transaction:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get accountability summary for a worker
router.get('/accountability/:workerId', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const summary = supplyChainService.getAccountabilitySummary(req.params.workerId);
    
    if (summary) {
      return res.json({ success: true, summary });
    } else {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

  } catch (error) {
    console.error('❌ Error getting accountability summary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sessions with outstanding responsibilities
router.get('/responsibilities', authenticateBot, async (_req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const sessions = supplyChainService.getSessionsWithResponsibilities();
    const overdueSessions = supplyChainService.getOverdueSessions();
    
    return res.json({ 
      success: true, 
      sessionsWithResponsibilities: sessions,
      overdueSessions,
      totalWithResponsibilities: sessions.length,
      totalOverdue: overdueSessions.length
    });

  } catch (error) {
    console.error('❌ Error getting responsibility data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate revenue distribution for boxes
router.post('/revenue-distribution', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const { boxCount, role } = req.body;
    
    if (!boxCount || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: boxCount, role' 
      });
    }

    if (!['manager', 'worker'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Role must be either "manager" or "worker"' 
      });
    }

    const distribution = supplyChainService.calculateRevenueDistribution(parseInt(boxCount), role as WorkerRole);
    
    return res.json({ 
      success: true, 
      distribution 
    });

  } catch (error) {
    console.error('❌ Error calculating revenue distribution:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive session
router.delete('/session/:workerId', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const { reason } = req.body;
    const success = await supplyChainService.archiveSession(req.params.workerId, reason || 'Manual archive');
    
    if (success) {
      return res.json({ 
        success: true, 
        message: 'Session archived successfully' 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }

  } catch (error) {
    console.error('❌ Error archiving supply chain session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics
router.get('/analytics', authenticateBot, async (_req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const analytics = supplyChainService.getAnalytics();
    
    return res.json({ 
      success: true, 
      analytics 
    });

  } catch (error) {
    console.error('❌ Error getting supply chain analytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Check and update overdue sessions (maintenance endpoint)
router.post('/maintenance/check-overdue', authenticateBot, async (_req: Request, res: Response) => {
  try {
    if (!supplyChainService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    await supplyChainService.checkAndUpdateOverdueSessions();
    
    return res.json({ 
      success: true, 
      message: 'Overdue check completed' 
    });

  } catch (error) {
    console.error('❌ Error checking overdue sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { initializeSupplyChainService };
export default router;