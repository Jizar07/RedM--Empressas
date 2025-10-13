import { Router, Request, Response } from 'express';
import WorkerChannelService from '../../services/WorkerChannelService';
import path from 'path';

const router = Router();

// Global worker channel service instance
let workerChannelService: WorkerChannelService | null = null;

// Helper function to get server-specific paths
function getServerPaths(serverId?: string) {
  const basePath = process.cwd();

  if (serverId) {
    return {
      registrations: path.join(basePath, 'data', 'registrations', serverId, 'registrations.json'),
      archivedSessions: path.join(basePath, 'data', 'worker-sessions', serverId, 'archived'),
      payments: path.join(basePath, 'data', 'worker-sessions', serverId, 'payments'),
      ferroviaEmbeds: path.join(basePath, 'data', 'ferrovia-embeds', serverId, 'active-embeds.json')
    };
  } else {
    // Legacy paths
    return {
      registrations: path.join(basePath, 'data', 'registrations.json'),
      archivedSessions: path.join(basePath, 'data', 'worker-sessions', 'archived'),
      payments: path.join(basePath, 'data', 'worker-sessions', 'payments'),
      ferroviaEmbeds: path.join(basePath, 'data', 'ferrovia-embeds', 'active-embeds.json')
    };
  }
}

// Initialize the service with Discord client
export function initializeWorkerChannelService(client: any) {
  workerChannelService = WorkerChannelService.getInstance(client);
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
    const serverId = req.body.serverId as string | undefined;
    console.log(`📨 Received worker activity: ${transactionData.workerName} - ${transactionData.type} [Server: ${serverId || 'legacy'}]`);

    // Validate required fields
    if (!transactionData.workerName || !transactionData.type || !transactionData.timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: workerName, type, timestamp'
      });
    }

    // Process the transaction with serverId
    const success = await workerChannelService.processWorkerTransaction({
      workerName: transactionData.workerName,
      type: transactionData.type,
      itemName: transactionData.itemName,
      animalType: transactionData.animalType,
      quantity: transactionData.quantity || 0,
      amount: transactionData.amount,
      timestamp: new Date(transactionData.timestamp),
      originalMessage: transactionData.originalMessage
    }, serverId);

    if (success) {
      console.log(`✅ Successfully processed worker activity for ${transactionData.workerName}`);
      return res.json({
        success: true,
        message: 'Worker activity processed successfully',
        workerName: transactionData.workerName,
        type: transactionData.type,
        serverId: serverId || 'legacy'
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

    const serverId = req.query.serverId as string | undefined;
    const mapping = workerChannelService.getWorkerChannel(req.params.workerId, serverId);

    if (mapping) {
      return res.json({ success: true, mapping, serverId: serverId || 'legacy' });
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

    const { workerId, workerName, channelId, registrationId, serverId } = req.body;

    if (!workerId || !workerName || !channelId) {
      return res.status(400).json({ error: 'Missing required fields: workerId, workerName, channelId' });
    }

    workerChannelService.registerWorkerChannel(workerId, workerName, channelId, registrationId, serverId);

    console.log(`📝 Registered worker channel mapping: ${workerName} (${workerId}) → ${channelId} [Server: ${serverId || 'legacy'}]`);
    return res.json({
      success: true,
      message: 'Worker channel mapping registered successfully',
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error('❌ Error registering worker mapping:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all worker mappings
router.get('/mappings', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const serverId = req.query.serverId as string | undefined;
    const mappings = workerChannelService.getAllWorkerMappings(serverId);
    const activeCount = workerChannelService.getActiveWorkersCount(serverId);

    return res.json({
      success: true,
      mappings,
      activeCount,
      total: Object.keys(mappings).length,
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error('❌ Error getting worker mappings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active worker sessions
router.get('/sessions', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const serverId = req.query.serverId as string | undefined;
    const activityService = workerChannelService.getActivityService();
    const activeSessions = activityService.getAllActiveSessions(serverId);
    const activeCount = activityService.getActiveSessionsCount(serverId);

    return res.json({
      success: true,
      sessions: activeSessions,
      activeCount,
      total: activeSessions.length,
      serverId: serverId || 'legacy'
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

    const { managerId, managerName, serverId } = req.body;
    const workerId = req.params.workerId;

    if (!managerId || !managerName) {
      return res.status(400).json({ error: 'Missing required fields: managerId, managerName' });
    }

    const activityService = workerChannelService.getActivityService();
    const success = await activityService.payWorker(workerId, managerId, managerName, serverId);

    if (success) {
      console.log(`💰 Worker ${workerId} paid by ${managerName} [Server: ${serverId || 'legacy'}]`);
      return res.json({
        success: true,
        message: 'Worker paid successfully',
        serverId: serverId || 'legacy'
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
    const { newItemName, newQuantity, newAmount, serverId } = req.body;

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
      parsedAmount,
      serverId
    );

    if (success) {
      console.log(`✏️ Transaction ${transactionId} edited for worker ${workerId} [Server: ${serverId || 'legacy'}]`);
      return res.json({
        success: true,
        message: 'Transaction edited successfully',
        serverId: serverId || 'legacy'
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
    const serverId = req.query.serverId as string | undefined;

    const activityService = workerChannelService.getActivityService();
    const success = await activityService.deleteTransaction(workerId, transactionId, serverId);

    if (success) {
      console.log(`🗑️ Transaction ${transactionId} deleted for worker ${workerId} [Server: ${serverId || 'legacy'}]`);
      return res.json({
        success: true,
        message: 'Transaction deleted successfully',
        serverId: serverId || 'legacy'
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

// Get all registered workers with activity summary
router.get('/all-workers', authenticateBot, async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const serverId = req.query.serverId as string | undefined;
    const paths = getServerPaths(serverId);

    // Load registered workers
    if (!fs.existsSync(paths.registrations)) {
      return res.json({
        success: true,
        workers: [],
        total: 0,
        activeCount: 0,
        serverId: serverId || 'legacy'
      });
    }

    const registrations = JSON.parse(fs.readFileSync(paths.registrations, 'utf8'));

    // Get active sessions
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const activityService = workerChannelService.getActivityService();
    const activeSessions = activityService.getAllActiveSessions(serverId);

    // Use server-specific paths
    const archivedDir = paths.archivedSessions;
    const paymentsDir = paths.payments;

    // Deduplicate registrations by Discord ID (keep most recent)
    const deduplicatedRegistrations = new Map();
    registrations.forEach((reg: any) => {
      if (!deduplicatedRegistrations.has(reg.userId) ||
          new Date(reg.registeredAt) > new Date(deduplicatedRegistrations.get(reg.userId).registeredAt)) {
        deduplicatedRegistrations.set(reg.userId, reg);
      }
    });

    // Create worker summary for each unique registered user
    const allWorkers = Array.from(deduplicatedRegistrations.values()).map((reg: any) => {
      const activeSession = activeSessions.find(s => s.workerId === reg.userId);

      // Count archived sessions for this worker
      let archivedCount = 0;
      let totalPaid = 0;

      if (fs.existsSync(archivedDir)) {
        const archivedFiles = fs.readdirSync(archivedDir);
        archivedFiles.forEach((file: string) => {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(archivedDir, file), 'utf8'));
            if (content.workerId === reg.userId) {
              archivedCount++;
            }
          } catch (e) {
            // Skip invalid files
          }
        });
      }

      if (fs.existsSync(paymentsDir)) {
        const paymentFiles = fs.readdirSync(paymentsDir);
        paymentFiles.forEach((file: string) => {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(paymentsDir, file), 'utf8'));
            if (content.workerId === reg.userId) {
              totalPaid += content.totalCredits || 0;
            }
          } catch (e) {
            // Skip invalid files
          }
        });
      }

      return {
        userId: reg.userId,
        userName: reg.ingameName,
        registeredAt: reg.registeredAt,
        functionName: reg.functionName,
        hasActiveSession: !!activeSession,
        activeSessionId: activeSession?.sessionId,
        totalPaid,
        archivedSessions: archivedCount,
        lastActivity: activeSession?.lastActivity || null
      };
    });

    return res.json({
      success: true,
      workers: allWorkers,
      total: allWorkers.length,
      activeCount: activeSessions.length,
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error('❌ Error getting all workers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed worker data including embeds/receipts
router.get('/worker-details/:workerId', authenticateBot, async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const { workerId } = req.params;
    const serverId = req.query.serverId as string | undefined;
    const paths = getServerPaths(serverId);

    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    // Get registration data
    if (!fs.existsSync(paths.registrations)) {
      return res.status(404).json({
        success: false,
        error: 'No registrations found for this server'
      });
    }

    const registrations = JSON.parse(fs.readFileSync(paths.registrations, 'utf8'));

    // Try to find registration by direct Discord ID match first
    let registration = registrations.find((r: any) => r.userId === workerId);
    let actualWorkerId = workerId;

    // If not found and workerId looks like a generated name-based ID, try to match by ingameName
    if (!registration && workerId.includes('_')) {
      // Convert ID like "smith_ramirez" back to "Smith Ramirez" for matching
      const nameFromId = workerId.split('_').map(part =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join(' ');

      registration = registrations.find((r: any) =>
        r.ingameName && r.ingameName.toLowerCase() === nameFromId.toLowerCase()
      );

      if (registration) {
        actualWorkerId = registration.userId; // Use the Discord ID for subsequent lookups
        console.log(`🔗 Mapped name-based ID "${workerId}" to Discord ID "${actualWorkerId}" for ${registration.ingameName}`);
      }
    }

    // Get active session using the actual worker ID
    const activityService = workerChannelService.getActivityService();
    const activeSession = activityService.getWorkerSession(actualWorkerId, serverId);

    // Get archived sessions (use server-specific path)
    const archivedSessions: any[] = [];
    if (fs.existsSync(paths.archivedSessions)) {
      const files = fs.readdirSync(paths.archivedSessions);
      files.forEach((file: string) => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(paths.archivedSessions, file), 'utf8'));
          if (content.workerId === actualWorkerId) {
            archivedSessions.push(content);
          }
        } catch (e) {
          // Skip invalid files
        }
      });
    }

    // Get payment records (use server-specific path)
    const paymentRecords: any[] = [];
    if (fs.existsSync(paths.payments)) {
      const files = fs.readdirSync(paths.payments);
      files.forEach((file: string) => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(paths.payments, file), 'utf8'));
          if (content.workerId === actualWorkerId) {
            paymentRecords.push(content);
          }
        } catch (e) {
          // Skip invalid files
        }
      });
    }

    // Get Ferrovia session data (use server-specific path)
    let ferroviaSession = null;
    if (fs.existsSync(paths.ferroviaEmbeds)) {
      const ferroviaData = JSON.parse(fs.readFileSync(paths.ferroviaEmbeds, 'utf8'));
      ferroviaSession = ferroviaData[actualWorkerId] || null;
    }

    // Calculate statistics
    const totalPlants = activeSession
      ? activeSession.plantTransactions.filter((t: any) => t.type === 'plant_deposited').reduce((sum: number, t: any) => sum + t.quantity, 0)
      : 0;

    const totalAnimals = activeSession
      ? activeSession.animalTransactions.filter((t: any) => t.type === 'delivery_completed').length
      : 0;

    const totalEarnings = paymentRecords.reduce((sum, record) => sum + (record.totalCredits || 0), 0) + (activeSession?.totalCredits || 0);

    return res.json({
      success: true,
      workerId: actualWorkerId, // Return the resolved Discord ID
      originalWorkerId: workerId, // Include original for reference
      registration,
      activeSession,
      statistics: {
        totalEarnings,
        totalPlants,
        totalAnimals,
        sessionsCount: archivedSessions.length + (activeSession ? 1 : 0),
        lastActive: activeSession?.lastActivity || null
      },
      history: {
        payments: paymentRecords,
        archivedSessions,
        ferroviaSession
      },
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error('❌ Error getting worker details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reload all sessions from disk and recalculate embeds
router.post('/reload-and-recalculate', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const activityService = workerChannelService.getActivityService();

    console.log(`🔄 API: Reloading all sessions from disk and recalculating embeds...`);

    // Step 1: Reload sessions from disk
    const reloadResult = activityService.reloadAllSessions();
    console.log(`✅ Reloaded ${reloadResult.loaded} sessions from ${reloadResult.servers.length} servers`);

    // Step 2: Recalculate all embeds with correct pricing
    const recalcResult = await activityService.recalculateAllActiveSessions();

    if (recalcResult.errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: 'Reload and recalculation completed with some errors',
        reloaded: reloadResult.loaded,
        servers: reloadResult.servers,
        updated: recalcResult.updated,
        errors: recalcResult.errors
      });
    }

    return res.json({
      success: true,
      message: 'All sessions reloaded and embeds recalculated successfully',
      reloaded: reloadResult.loaded,
      servers: reloadResult.servers,
      updated: recalcResult.updated
    });

  } catch (error) {
    console.error('❌ Error reloading and recalculating:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recalculate ALL active session embeds with correct server-specific pricing
router.post('/recalculate-all-embeds', authenticateBot, async (req: Request, res: Response) => {
  try {
    if (!workerChannelService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const activityService = workerChannelService.getActivityService();

    console.log(`🔄 API: Recalculating all active session embeds with correct pricing...`);

    const result = await activityService.recalculateAllActiveSessions();

    if (result.errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: 'Recalculation completed with some errors',
        updated: result.updated,
        errors: result.errors
      });
    }

    return res.json({
      success: true,
      message: 'All embeds recalculated successfully',
      updated: result.updated
    });

  } catch (error) {
    console.error('❌ Error recalculating embeds:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;