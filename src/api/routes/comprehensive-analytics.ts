import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import PaymentConfigService from '../../services/PaymentConfigService';

const router = Router();

// Helper function for server-specific paths
function getServerPaths(serverId?: string) {
  const basePath = process.cwd();
  if (serverId) {
    return {
      registrations: path.join(basePath, 'data', 'registrations', serverId, 'registrations.json'),
      payments: path.join(basePath, 'data', 'worker-sessions', serverId, 'payments'),
      archived: path.join(basePath, 'data', 'worker-sessions', serverId, 'archived'),
      active: path.join(basePath, 'data', 'worker-sessions', serverId, 'active-sessions.json')
    };
  }
  return {
    registrations: path.join(basePath, 'data', 'registrations.json'),
    payments: path.join(basePath, 'data', 'worker-sessions', 'payments'),
    archived: path.join(basePath, 'data', 'worker-sessions', 'archived'),
    active: path.join(basePath, 'data', 'worker-sessions', 'active-sessions.json')
  };
}

interface PlantStats {
  itemName: string;
  deposited: number;
  seedsTaken: number;
}

interface AnimalStats {
  totalDeliveries: number;
  totalMaterialsGenerated: number;
  totalMaterialValue: number;
  totalAnimalsTaken: number;
  totalCost: number;
}

interface FinancialStats {
  totalPurchases: number;
  totalSpent: number;
  items: { [itemName: string]: { quantity: number; spent: number } };
}

interface WorkerAnalytics {
  workerId: string;
  workerName: string;
  totalSessions: number;
  isManager: boolean;
  plantStats: { [itemName: string]: PlantStats };
  animalStats: AnimalStats;
  financialStats: FinancialStats;
  plantRevenue: number;
  animalMaterialProfit: number;
  totalPaid: number;
  fazendaProfit: number;
}

/**
 * Get comprehensive analytics from existing session data
 * GET /api/comprehensive-analytics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const firmId = req.query.firmId as string | undefined;

    console.log(`🔍 [comprehensive-analytics] Request - serverId: ${serverId}, firmId: ${firmId}`);

    // Load firmId → channelId mapping from firms-config.json
    let targetChannelId: string | undefined;
    if (firmId) {
      try {
        const firmsConfigPath = path.join(process.cwd(), 'data', 'firms-config.json');
        const firmsConfig = JSON.parse(fs.readFileSync(firmsConfigPath, 'utf8'));
        const firm = firmsConfig.firms[firmId];

        if (firm) {
          // Verify firm belongs to the selected server
          if (serverId && firm.serverId !== serverId) {
            console.warn(`⚠️ [comprehensive-analytics] Firm "${firmId}" belongs to server "${firm.serverId}", but serverId "${serverId}" was requested`);
            return res.status(400).json({
              success: false,
              error: 'Firm does not belong to selected server'
            });
          }

          targetChannelId = firm.channelId;
          console.log(`📍 [comprehensive-analytics] Firm "${firmId}" (server: ${firm.serverId}) → channelId: ${targetChannelId}`);
        } else {
          console.warn(`⚠️ [comprehensive-analytics] Firm "${firmId}" not found in firms-config.json`);
          return res.status(404).json({
            success: false,
            error: 'Firm not found'
          });
        }
      } catch (error) {
        console.error(`❌ [comprehensive-analytics] Error loading firms-config.json:`, error);
        return res.status(500).json({
          success: false,
          error: 'Failed to load firm configuration'
        });
      }
    }

    const workerAnalytics: { [workerId: string]: WorkerAnalytics } = {};
    const globalPlantStats: { [itemName: string]: { deposited: number; seedsTaken: number } } = {};
    const globalAnimalStats = {
      totalDeliveries: 0,
      totalMaterialsGenerated: 0,
      totalMaterialValue: 0,
      totalAnimalsTaken: 0,
      totalCost: 0
    };
    const globalFinancialStats: { [itemName: string]: { quantity: number; spent: number } } = {};

    let totalSessions = 0;
    let totalWorkers = 0;

    // Load payment config for cost settings
    const paymentConfig = await PaymentConfigService.getInstance().getConfig(serverId);
    const animalCostPerUnit = paymentConfig.defaultPrices.animals.costPerUnit;

    // Get server-specific paths
    const paths = getServerPaths(serverId);

    // Load registrations to check for manager roles
    const managerRoles = new Set(['❪★❱ Gerentes', '👑│CEO']);
    const managerUserIds = new Set<string>();

    if (fs.existsSync(paths.registrations)) {
      const registrations = JSON.parse(fs.readFileSync(paths.registrations, 'utf8'));
      // TODO: We need to check Discord roles, not registration data
      // For now, marking all as workers (will calculate with 75% split)
    }

    // Load payment data
    const paymentsBySession: { [sessionId: string]: number } = {};

    if (fs.existsSync(paths.payments)) {
      const paymentFiles = fs.readdirSync(paths.payments);
      for (const file of paymentFiles) {
        if (!file.endsWith('.json')) continue;
        try {
          const paymentPath = path.join(paths.payments, file);
          const paymentData = JSON.parse(fs.readFileSync(paymentPath, 'utf8'));
          paymentsBySession[paymentData.sessionId] = paymentData.amount || 0;
        } catch (error) {
          console.warn(`Warning: Failed to parse payment file ${file}:`, error);
        }
      }
    }

    const archivedDir = paths.archived;
    const activeSessionsFile = paths.active;

    // Process archived sessions
    if (fs.existsSync(archivedDir)) {
      const files = fs.readdirSync(archivedDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const sessionPath = path.join(archivedDir, file);
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

          // Skip if firmId specified and channelId doesn't match
          if (targetChannelId && sessionData.channelId !== targetChannelId) {
            console.log(`⏭️ [comprehensive-analytics] Skipping archived session ${file} - channelId mismatch (${sessionData.channelId} !== ${targetChannelId})`);
            continue;
          }

          totalSessions++;

          processSession(sessionData, workerAnalytics, globalPlantStats, globalAnimalStats, globalFinancialStats, paymentsBySession, managerUserIds, animalCostPerUnit);
        } catch (error) {
          console.warn(`Warning: Failed to parse session file ${file}:`, error);
        }
      }
    }

    // Process active sessions
    if (fs.existsSync(activeSessionsFile)) {
      const activeSessions = JSON.parse(fs.readFileSync(activeSessionsFile, 'utf8'));

      for (const session of Object.values(activeSessions)) {
        const sessionData = session as any;

        // Skip if firmId specified and channelId doesn't match
        if (targetChannelId && sessionData.channelId !== targetChannelId) {
          console.log(`⏭️ [comprehensive-analytics] Skipping active session ${sessionData.sessionId} - channelId mismatch (${sessionData.channelId} !== ${targetChannelId})`);
          continue;
        }

        totalSessions++;
        processSession(sessionData, workerAnalytics, globalPlantStats, globalAnimalStats, globalFinancialStats, paymentsBySession, managerUserIds, animalCostPerUnit);
      }
    }

    totalWorkers = Object.keys(workerAnalytics).length;

    console.log(`✅ [comprehensive-analytics] Processed ${totalSessions} sessions for firmId: ${firmId || 'ALL'}, channelId: ${targetChannelId || 'ALL'}`);

    // Convert to arrays and sort by Fazenda's profit
    const workersList = Object.values(workerAnalytics).sort((a, b) => b.fazendaProfit - a.fazendaProfit);
    const plantsList = Object.entries(globalPlantStats)
      .map(([itemName, stats]) => ({ itemName, ...stats }))
      .sort((a, b) => b.deposited - a.deposited);
    const financialList = Object.entries(globalFinancialStats)
      .map(([itemName, stats]) => ({ itemName, ...stats }))
      .sort((a, b) => b.spent - a.spent);

    // Calculate totals
    const totalPlantRevenue = workersList.reduce((sum, w) => sum + w.plantRevenue, 0);
    const totalAnimalMaterialProfit = workersList.reduce((sum, w) => sum + w.animalMaterialProfit, 0);
    const totalPaidToWorkers = workersList.reduce((sum, w) => sum + w.totalPaid, 0);
    const totalFazendaProfit = workersList.reduce((sum, w) => sum + w.fazendaProfit, 0);

    return res.json({
      success: true,
      data: {
        overview: {
          totalSessions,
          totalWorkers,
          totalPlantDeposits: Object.values(globalPlantStats).reduce((sum, s) => sum + s.deposited, 0),
          totalSeedsTaken: Object.values(globalPlantStats).reduce((sum, s) => sum + s.seedsTaken, 0),
          totalAnimalDeliveries: globalAnimalStats.totalDeliveries,
          totalAnimalMaterials: globalAnimalStats.totalMaterialsGenerated,
          totalAnimalMaterialValue: globalAnimalStats.totalMaterialValue,
          totalPlantRevenue,
          totalAnimalMaterialProfit,
          totalPaidToWorkers,
          totalFazendaProfit,
          totalPurchases: Object.values(globalFinancialStats).reduce((sum, s) => sum + s.quantity, 0),
          totalSpent: Object.values(globalFinancialStats).reduce((sum, s) => sum + s.spent, 0)
        },
        workers: workersList,
        plants: plantsList,
        animals: globalAnimalStats,
        purchases: financialList,
        timestamp: new Date().toISOString()
      },
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error('❌ Error getting comprehensive analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve comprehensive analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

function processSession(
  sessionData: any,
  workerAnalytics: { [workerId: string]: WorkerAnalytics },
  globalPlantStats: { [itemName: string]: { deposited: number; seedsTaken: number } },
  globalAnimalStats: { totalDeliveries: number; totalMaterialsGenerated: number; totalMaterialValue: number; totalAnimalsTaken: number; totalCost: number },
  globalFinancialStats: { [itemName: string]: { quantity: number; spent: number } },
  paymentsBySession: { [sessionId: string]: number },
  managerUserIds: Set<string>,
  animalCostPerUnit: number
): void {
  const workerId = sessionData.workerId;
  const workerName = sessionData.workerName;
  const sessionId = sessionData.sessionId;

  if (!workerAnalytics[workerId]) {
    const isManager = managerUserIds.has(workerId);
    workerAnalytics[workerId] = {
      workerId,
      workerName,
      totalSessions: 0,
      isManager,
      plantStats: {},
      animalStats: { totalDeliveries: 0, totalMaterialsGenerated: 0, totalMaterialValue: 0, totalAnimalsTaken: 0, totalCost: 0 },
      financialStats: { totalPurchases: 0, totalSpent: 0, items: {} },
      plantRevenue: 0,
      animalMaterialProfit: 0,
      totalPaid: 0,
      fazendaProfit: 0
    };
  }

  const worker = workerAnalytics[workerId];
  worker.totalSessions++;

  // Track payment for this session
  const sessionPayment = paymentsBySession[sessionId] || 0;
  worker.totalPaid += sessionPayment;

  // Process plant transactions
  let totalPlantsDeposited = 0;
  if (sessionData.plantTransactions && Array.isArray(sessionData.plantTransactions)) {
    for (const transaction of sessionData.plantTransactions) {
      const itemName = transaction.itemName;

      if (!worker.plantStats[itemName]) {
        worker.plantStats[itemName] = { itemName, deposited: 0, seedsTaken: 0 };
      }

      if (!globalPlantStats[itemName]) {
        globalPlantStats[itemName] = { deposited: 0, seedsTaken: 0 };
      }

      if (transaction.type === 'plant_deposited') {
        worker.plantStats[itemName].deposited += transaction.quantity;
        globalPlantStats[itemName].deposited += transaction.quantity;
        totalPlantsDeposited += transaction.quantity;
      } else if (transaction.type === 'seed_taken') {
        worker.plantStats[itemName].seedsTaken += transaction.quantity;
        globalPlantStats[itemName].seedsTaken += transaction.quantity;
      }
    }
  }

  // Calculate plant revenue for Fazenda
  // 2000 plants = $1000 mission
  // Worker keeps $250 (already paid), Fazenda keeps $750
  // Manager keeps $500 (already paid), Fazenda keeps $500
  if (totalPlantsDeposited > 0) {
    const missionsGenerated = totalPlantsDeposited / 2000;
    const fazendaShare = worker.isManager ? 500 : 750;
    const plantRevenue = missionsGenerated * fazendaShare;
    worker.plantRevenue += plantRevenue;
  }

  // Process animal transactions
  if (sessionData.animalTransactions && Array.isArray(sessionData.animalTransactions)) {
    for (const transaction of sessionData.animalTransactions) {
      if (transaction.type === 'delivery_completed') {
        const quantity = transaction.quantity || 0;
        const amount = transaction.amount || 0;

        worker.animalStats.totalDeliveries += quantity;

        // Calculate material value
        // Formula: quantity × 36 × ageMultiplier × 0.694
        // where ageMultiplier = (amount / quantity) / 40
        if (quantity > 0 && amount > 0) {
          const paymentPerAnimal = amount / quantity;
          const ageMultiplier = paymentPerAnimal / 40;
          const materialsReceived = quantity * 36 * ageMultiplier;
          const materialValue = materialsReceived * 0.694;

          // Subtract raising cost from profit
          const raisingCost = quantity * animalCostPerUnit;
          const netProfit = materialValue - raisingCost;

          worker.animalStats.totalMaterialsGenerated += materialsReceived;
          worker.animalStats.totalMaterialValue += materialValue;
          worker.animalMaterialProfit += netProfit;

          globalAnimalStats.totalMaterialsGenerated += materialsReceived;
          globalAnimalStats.totalMaterialValue += materialValue;
        }

        globalAnimalStats.totalDeliveries += quantity;
      } else if (transaction.type === 'animals_taken') {
        worker.animalStats.totalAnimalsTaken += transaction.quantity;
        worker.animalStats.totalCost += transaction.cost || 0;

        globalAnimalStats.totalAnimalsTaken += transaction.quantity;
        globalAnimalStats.totalCost += transaction.cost || 0;
      }
    }
  }

  // Process financial transactions (Bercario purchases)
  if (sessionData.financialTransactions && Array.isArray(sessionData.financialTransactions)) {
    for (const transaction of sessionData.financialTransactions) {
      const itemName = transaction.itemName;

      if (!worker.financialStats.items[itemName]) {
        worker.financialStats.items[itemName] = { quantity: 0, spent: 0 };
      }

      worker.financialStats.items[itemName].quantity += transaction.quantity;
      worker.financialStats.items[itemName].spent += transaction.amount;
      worker.financialStats.totalPurchases += transaction.quantity;
      worker.financialStats.totalSpent += transaction.amount;

      if (!globalFinancialStats[itemName]) {
        globalFinancialStats[itemName] = { quantity: 0, spent: 0 };
      }

      globalFinancialStats[itemName].quantity += transaction.quantity;
      globalFinancialStats[itemName].spent += transaction.amount;
    }
  }

  // Calculate Fazenda's final profit
  // Revenue from plants + Revenue from animal materials - Amount paid to worker
  worker.fazendaProfit = worker.plantRevenue + worker.animalMaterialProfit - worker.totalPaid;
}

export default router;
