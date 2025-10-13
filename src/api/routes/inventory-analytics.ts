import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Helper function for server-specific paths
function getWorkerSessionsPaths(serverId?: string) {
  const basePath = process.cwd();
  if (serverId) {
    return {
      archived: path.join(basePath, 'data', 'worker-sessions', serverId, 'archived'),
      active: path.join(basePath, 'data', 'worker-sessions', serverId, 'active-sessions.json')
    };
  }
  return {
    archived: path.join(basePath, 'data', 'worker-sessions', 'archived'),
    active: path.join(basePath, 'data', 'worker-sessions', 'active-sessions.json')
  };
}

interface CategoryStats {
  category: string;
  totalAdded: number;
  totalRemoved: number;
  netChange: number;
  uniqueItems: number;
  items: {
    [itemName: string]: {
      added: number;
      removed: number;
      net: number;
    };
  };
}

interface WorkerCategoryActivity {
  workerId: string;
  workerName: string;
  categories: {
    [category: string]: {
      added: number;
      removed: number;
      net: number;
    };
  };
  totalActivities: number;
}

/**
 * Get inventory analytics by category
 * GET /api/inventory-analytics/by-category
 */
router.get('/by-category', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const categoryStats: { [category: string]: CategoryStats } = {};

    // Read all archived sessions
    const paths = getWorkerSessionsPaths(serverId);
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

          if (sessionData.inventoryTransactions && Array.isArray(sessionData.inventoryTransactions)) {
            processInventoryTransactions(sessionData.inventoryTransactions, categoryStats);
          }
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
        if (sessionData.inventoryTransactions && Array.isArray(sessionData.inventoryTransactions)) {
          processInventoryTransactions(sessionData.inventoryTransactions, categoryStats);
        }
      }
    }

    // Convert to array and sort by total activity
    const categoriesArray = Object.values(categoryStats).sort((a, b) =>
      (b.totalAdded + b.totalRemoved) - (a.totalAdded + a.totalRemoved)
    );

    return res.json({
      success: true,
      data: categoriesArray,
      totalCategories: categoriesArray.length,
      timestamp: new Date().toISOString(),
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error('❌ Error getting inventory analytics by category:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get comprehensive analytics combining all data
 * GET /api/inventory-analytics/comprehensive
 */
router.get('/comprehensive', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const categoryStats: { [category: string]: CategoryStats } = {};
    const workerStats: { [workerId: string]: WorkerCategoryActivity } = {};
    let totalSessions = 0;
    let totalTransactions = 0;

    const paths = getWorkerSessionsPaths(serverId);
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
          totalSessions++;

          if (sessionData.inventoryTransactions && Array.isArray(sessionData.inventoryTransactions)) {
            totalTransactions += sessionData.inventoryTransactions.length;
            processInventoryTransactions(sessionData.inventoryTransactions, categoryStats);
            processWorkerInventoryActivity(
              sessionData.workerId,
              sessionData.workerName,
              sessionData.inventoryTransactions,
              workerStats
            );
          }
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
        totalSessions++;

        if (sessionData.inventoryTransactions && Array.isArray(sessionData.inventoryTransactions)) {
          totalTransactions += sessionData.inventoryTransactions.length;
          processInventoryTransactions(sessionData.inventoryTransactions, categoryStats);
          processWorkerInventoryActivity(
            sessionData.workerId,
            sessionData.workerName,
            sessionData.inventoryTransactions,
            workerStats
          );
        }
      }
    }

    // Convert to arrays and sort
    const categoriesArray = Object.values(categoryStats).sort((a, b) =>
      (b.totalAdded + b.totalRemoved) - (a.totalAdded + a.totalRemoved)
    );

    const workersArray = Object.values(workerStats).sort((a, b) =>
      b.totalActivities - a.totalActivities
    );

    // Calculate top items across all categories
    const allItems: { [itemName: string]: { added: number; removed: number; net: number; category: string } } = {};

    for (const category of Object.values(categoryStats)) {
      for (const [itemName, itemStats] of Object.entries(category.items)) {
        if (!allItems[itemName]) {
          allItems[itemName] = {
            added: 0,
            removed: 0,
            net: 0,
            category: category.category
          };
        }
        allItems[itemName].added += itemStats.added;
        allItems[itemName].removed += itemStats.removed;
        allItems[itemName].net += itemStats.net;
      }
    }

    const topItems = Object.entries(allItems)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => (b.added + b.removed) - (a.added + a.removed))
      .slice(0, 20);

    return res.json({
      success: true,
      data: {
        overview: {
          totalSessions,
          totalTransactions,
          totalCategories: categoriesArray.length,
          totalWorkers: workersArray.length
        },
        byCategory: categoriesArray,
        byWorker: workersArray.slice(0, 20), // Top 20 workers
        topItems,
        timestamp: new Date().toISOString()
      },
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error('❌ Error getting comprehensive inventory analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve comprehensive analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get specific category breakdown
 * GET /api/inventory-analytics/category/:categoryName
 */
router.get('/category/:categoryName', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const { categoryName } = req.params;
    const categoryStats: CategoryStats = {
      category: categoryName,
      totalAdded: 0,
      totalRemoved: 0,
      netChange: 0,
      uniqueItems: 0,
      items: {}
    };

    const paths = getWorkerSessionsPaths(serverId);
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

          if (sessionData.inventoryTransactions && Array.isArray(sessionData.inventoryTransactions)) {
            const categoryTransactions = sessionData.inventoryTransactions.filter(
              (t: any) => t.itemCategory === categoryName
            );
            processInventoryTransactions(categoryTransactions, { [categoryName]: categoryStats });
          }
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
        if (sessionData.inventoryTransactions && Array.isArray(sessionData.inventoryTransactions)) {
          const categoryTransactions = sessionData.inventoryTransactions.filter(
            (t: any) => t.itemCategory === categoryName
          );
          processInventoryTransactions(categoryTransactions, { [categoryName]: categoryStats });
        }
      }
    }

    // Convert items to array and sort by activity
    const itemsArray = Object.entries(categoryStats.items)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => (b.added + b.removed) - (a.added + a.removed));

    return res.json({
      success: true,
      data: {
        category: categoryName,
        totalAdded: categoryStats.totalAdded,
        totalRemoved: categoryStats.totalRemoved,
        netChange: categoryStats.netChange,
        items: itemsArray,
        uniqueItems: itemsArray.length
      },
      timestamp: new Date().toISOString(),
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error(`❌ Error getting category ${req.params.categoryName} analytics:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve category analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get worker-specific inventory activity
 * GET /api/inventory-analytics/worker/:workerId
 */
router.get('/worker/:workerId', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const { workerId } = req.params;
    const workerActivity: WorkerCategoryActivity = {
      workerId,
      workerName: 'Unknown',
      categories: {},
      totalActivities: 0
    };

    const paths = getWorkerSessionsPaths(serverId);
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

          if (sessionData.workerId === workerId && sessionData.inventoryTransactions) {
            workerActivity.workerName = sessionData.workerName;
            processWorkerInventoryTransactions(sessionData.inventoryTransactions, workerActivity);
          }
        } catch (error) {
          console.warn(`Warning: Failed to parse session file ${file}:`, error);
        }
      }
    }

    // Process active sessions
    if (fs.existsSync(activeSessionsFile)) {
      const activeSessions = JSON.parse(fs.readFileSync(activeSessionsFile, 'utf8'));

      if (activeSessions[workerId]) {
        const sessionData = activeSessions[workerId];
        workerActivity.workerName = sessionData.workerName;

        if (sessionData.inventoryTransactions) {
          processWorkerInventoryTransactions(sessionData.inventoryTransactions, workerActivity);
        }
      }
    }

    return res.json({
      success: true,
      data: workerActivity,
      timestamp: new Date().toISOString(),
      serverId: serverId || 'legacy'
    });

  } catch (error) {
    console.error(`❌ Error getting worker ${req.params.workerId} inventory activity:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve worker inventory activity',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions
function processInventoryTransactions(
  transactions: any[],
  categoryStats: { [category: string]: CategoryStats }
): void {
  for (const transaction of transactions) {
    const category = transaction.itemCategory || 'outros';

    if (!categoryStats[category]) {
      categoryStats[category] = {
        category,
        totalAdded: 0,
        totalRemoved: 0,
        netChange: 0,
        uniqueItems: 0,
        items: {}
      };
    }

    const stats = categoryStats[category];
    const itemName = transaction.itemName;

    if (!stats.items[itemName]) {
      stats.items[itemName] = {
        added: 0,
        removed: 0,
        net: 0
      };
    }

    const itemStats = stats.items[itemName];

    if (transaction.type === 'inventory_added') {
      stats.totalAdded += transaction.quantity;
      itemStats.added += transaction.quantity;
    } else if (transaction.type === 'inventory_removed') {
      stats.totalRemoved += transaction.quantity;
      itemStats.removed += transaction.quantity;
    }

    itemStats.net = itemStats.added - itemStats.removed;
    stats.netChange = stats.totalAdded - stats.totalRemoved;
    stats.uniqueItems = Object.keys(stats.items).length;
  }
}

function processWorkerInventoryActivity(
  workerId: string,
  workerName: string,
  transactions: any[],
  workerStats: { [workerId: string]: WorkerCategoryActivity }
): void {
  if (!workerStats[workerId]) {
    workerStats[workerId] = {
      workerId,
      workerName,
      categories: {},
      totalActivities: 0
    };
  }

  const worker = workerStats[workerId];

  for (const transaction of transactions) {
    const category = transaction.itemCategory || 'outros';

    if (!worker.categories[category]) {
      worker.categories[category] = {
        added: 0,
        removed: 0,
        net: 0
      };
    }

    const categoryStats = worker.categories[category];

    if (transaction.type === 'inventory_added') {
      categoryStats.added += transaction.quantity;
    } else if (transaction.type === 'inventory_removed') {
      categoryStats.removed += transaction.quantity;
    }

    categoryStats.net = categoryStats.added - categoryStats.removed;
    worker.totalActivities++;
  }
}

function processWorkerInventoryTransactions(
  transactions: any[],
  workerActivity: WorkerCategoryActivity
): void {
  for (const transaction of transactions) {
    const category = transaction.itemCategory || 'outros';

    if (!workerActivity.categories[category]) {
      workerActivity.categories[category] = {
        added: 0,
        removed: 0,
        net: 0
      };
    }

    const categoryStats = workerActivity.categories[category];

    if (transaction.type === 'inventory_added') {
      categoryStats.added += transaction.quantity;
    } else if (transaction.type === 'inventory_removed') {
      categoryStats.removed += transaction.quantity;
    }

    categoryStats.net = categoryStats.added - categoryStats.removed;
    workerActivity.totalActivities++;
  }
}

export default router;
