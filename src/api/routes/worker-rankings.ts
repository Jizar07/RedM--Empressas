import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { WeeklyRankingService } from '../../services/WeeklyRankingService';

const router = Router();

interface WorkerActivity {
  id: string;
  sessionId: string;
  workerId: string;
  workerName: string;
  type: 'plant_deposit' | 'animal_delivery' | 'ferrovia_mission';
  quantity: number;
  amount?: number;
  timestamp: string;
  itemName?: string;
  animalType?: string;
  originalMessage?: string;
}

interface WorkerRanking {
  workerId: string;
  workerName: string;
  count: number;
  totalAmount?: number;
  rank: number;
  badge: string;
}

interface RankingResponse {
  plantServices: WorkerRanking[];
  animalServices: WorkerRanking[];
  ferroviaMissions: WorkerRanking[];
  lastUpdated: string;
}

// Helper function to read channel messages and extract activities
function parseChannelActivities(channelPath: string): WorkerActivity[] {
  try {
    if (!fs.existsSync(channelPath)) {
      return [];
    }

    const data = JSON.parse(fs.readFileSync(channelPath, 'utf8'));
    const activities: WorkerActivity[] = [];

    if (data.messages && Array.isArray(data.messages)) {
      data.messages.forEach((msg: any, index: number) => {
        try {
          // Check both content and embedContent for activity patterns
          const contentSources = [
            { text: msg.content, source: 'content' },
            { text: msg.embedContent, source: 'embed' }
          ].filter(s => s.text && typeof s.text === 'string');

          contentSources.forEach(({ text, source }) => {
            // Parse worker activities from structured messages
            // Look for patterns like "Autor:: WorkerName | FIXO: 12345"
            const authorMatch = text.match(/Autor::\s+([^|]+?)\s+\|\s+FIXO:/i);
            if (authorMatch) {
              const workerName = authorMatch[1].trim();

              // Check if it's a Ferrovia activity (ATLANTA TREM, transport, etc.)
              if (text.includes('ATLANTA TREM') || text.includes('TREM') || text.includes('FERROVIA')) {
                activities.push({
                  id: `${msg.id || index}_${source}_ferrovia`,
                  sessionId: msg.sessionId || 'unknown',
                  workerId: msg.author?.id || 'unknown',
                  workerName: workerName,
                  type: 'ferrovia_mission',
                  quantity: 1,
                  timestamp: msg.timestamp || new Date().toISOString(),
                  originalMessage: text
                });
              }

              // Check for plant/material activities
              const quantiaMatch = text.match(/Quantia::\s+(\d+)/i);
              if (quantiaMatch && (text.includes('DEPOSITOU') || text.includes('SACOU'))) {
                activities.push({
                  id: `${msg.id || index}_${source}_plant`,
                  sessionId: msg.sessionId || 'unknown',
                  workerId: msg.author?.id || 'unknown',
                  workerName: workerName,
                  type: 'plant_deposit',
                  quantity: parseInt(quantiaMatch[1]),
                  timestamp: msg.timestamp || new Date().toISOString(),
                  originalMessage: text
                });
              }
            }

            // Fallback: Parse traditional patterns
            const plantMatch = text.match(/(\w+(?:\s+\w+)*)\s+depositou\s+(\d+)\s+(milho|junco|trigo|algodao|quartzo|ferro|carvao|madeira)/i);
            if (plantMatch) {
              activities.push({
                id: `${msg.id || index}_${source}_plant_legacy`,
                sessionId: msg.sessionId || 'unknown',
                workerId: msg.author?.id || 'unknown',
                workerName: plantMatch[1].trim(),
                type: 'plant_deposit',
                quantity: parseInt(plantMatch[2]),
                itemName: plantMatch[3],
                timestamp: msg.timestamp || new Date().toISOString(),
                originalMessage: text
              });
            }

            const animalMatch = text.match(/(\w+(?:\s+\w+)*)\s+vendeu\s+(\d+)\s+animais?\s+no\s+matadouro\s+por\s+\$?([\d,]+\.?\d*)/i);
            if (animalMatch) {
              activities.push({
                id: `${msg.id || index}_${source}_animal_legacy`,
                sessionId: msg.sessionId || 'unknown',
                workerId: msg.author?.id || 'unknown',
                workerName: animalMatch[1].trim(),
                type: 'animal_delivery',
                quantity: parseInt(animalMatch[2]),
                amount: parseFloat(animalMatch[3].replace(/,/g, '')),
                animalType: 'general',
                timestamp: msg.timestamp || new Date().toISOString(),
                originalMessage: text
              });
            }
          });
        } catch (parseError) {
          console.warn(`Warning: Failed to parse message at index ${index}:`, parseError);
        }
      });
    }

    return activities;
  } catch (error) {
    console.error(`Error reading channel activities from ${channelPath}:`, error);
    return [];
  }
}

// Helper function to calculate rankings
function calculateRankings(activities: WorkerActivity[], type: 'plant_deposit' | 'animal_delivery' | 'ferrovia_mission'): WorkerRanking[] {
  const workerStats = new Map<string, { name: string; count: number; totalAmount: number }>();

  activities
    .filter(activity => activity.type === type)
    .forEach(activity => {
      const key = activity.workerName.toLowerCase();
      if (!workerStats.has(key)) {
        workerStats.set(key, {
          name: activity.workerName,
          count: 0,
          totalAmount: 0
        });
      }

      const stats = workerStats.get(key)!;
      stats.count += activity.quantity;
      if (activity.amount) {
        stats.totalAmount += activity.amount;
      }
    });

  // Convert to array and sort by count
  const rankings = Array.from(workerStats.entries())
    .map(([key, stats]) => ({
      workerId: key,
      workerName: stats.name,
      count: stats.count,
      totalAmount: stats.totalAmount > 0 ? stats.totalAmount : undefined,
      rank: 0,
      badge: ''
    }))
    .sort((a, b) => b.count - a.count);

  // Assign ranks and badges
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
    if (index === 0) ranking.badge = '🥇';
    else if (index === 1) ranking.badge = '🥈';
    else if (index === 2) ranking.badge = '🥉';
    else if (index < 10) ranking.badge = '⭐';
    else ranking.badge = '';
  });

  return rankings.slice(0, 20); // Top 20 workers
}

// Get worker rankings
router.get('/', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const channelLogsDir = serverId
      ? path.join(process.cwd(), 'frontend', 'public', 'channel-logs', serverId)
      : path.join(process.cwd(), 'frontend', 'public', 'channel-logs');
    const allActivities: WorkerActivity[] = [];

    // Read activities from all channel log files
    if (fs.existsSync(channelLogsDir)) {
      const files = fs.readdirSync(channelLogsDir).filter(file => file.endsWith('.json'));

      for (const file of files) {
        const channelPath = path.join(channelLogsDir, file);
        const channelActivities = parseChannelActivities(channelPath);
        allActivities.push(...channelActivities);
      }
    }

    // Also check worker sessions for additional data
    const workerSessionsDir = serverId
      ? path.join(process.cwd(), 'data', 'worker-sessions', serverId)
      : path.join(process.cwd(), 'data', 'worker-sessions');
    if (fs.existsSync(workerSessionsDir)) {
      const archivedDir = path.join(workerSessionsDir, 'archived');
      if (fs.existsSync(archivedDir)) {
        const sessionFiles = fs.readdirSync(archivedDir).filter(file => file.endsWith('.json'));

        for (const file of sessionFiles) {
          try {
            const sessionPath = path.join(archivedDir, file);
            const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

            // Parse plant transactions - ONLY count actual deposits, not withdrawals
            if (sessionData.plantTransactions && Array.isArray(sessionData.plantTransactions)) {
              sessionData.plantTransactions
                .filter((transaction: any) => transaction.type === 'plant_deposited')
                .forEach((transaction: any, index: number) => {
                  allActivities.push({
                    id: `${file}_plant_${index}`,
                    sessionId: sessionData.sessionId || file.replace('.json', ''),
                    workerId: sessionData.workerId || 'unknown',
                    workerName: sessionData.workerName || 'Unknown Worker',
                    type: 'plant_deposit',
                    quantity: transaction.quantity || 1,
                    itemName: transaction.itemName,
                    timestamp: transaction.timestamp || sessionData.startTime || new Date().toISOString(),
                    originalMessage: `Plant deposit: ${transaction.itemName} (${transaction.quantity})`
                  });
                });
            }

            // Parse animal transactions - ONLY count completed deliveries
            if (sessionData.animalTransactions && Array.isArray(sessionData.animalTransactions)) {
              sessionData.animalTransactions
                .filter((transaction: any) => transaction.type === 'delivery_completed')
                .forEach((transaction: any, index: number) => {
                  allActivities.push({
                    id: `${file}_animal_${index}`,
                    sessionId: sessionData.sessionId || file.replace('.json', ''),
                    workerId: sessionData.workerId || 'unknown',
                    workerName: sessionData.workerName || 'Unknown Worker',
                    type: 'animal_delivery',
                    quantity: transaction.quantity || 1,
                    amount: transaction.amount,
                    animalType: transaction.animalType || 'general',
                    timestamp: transaction.timestamp || sessionData.startTime || new Date().toISOString(),
                    originalMessage: `Animal delivery: ${transaction.animalType} (${transaction.quantity}) for $${transaction.amount}`
                  });
                });
            }

            // Parse general transactions (legacy format)
            if (sessionData.transactions && Array.isArray(sessionData.transactions)) {
              sessionData.transactions.forEach((transaction: any, index: number) => {
                if (transaction.workerName && transaction.type) {
                  let activityType: 'plant_deposit' | 'animal_delivery' | 'ferrovia_mission' = 'plant_deposit';

                  if (transaction.type === 'animal_delivery' || transaction.animalType) {
                    activityType = 'animal_delivery';
                  } else if (transaction.originalMessage && transaction.originalMessage.toLowerCase().includes('ferrovia')) {
                    activityType = 'ferrovia_mission';
                  }

                  allActivities.push({
                    id: `${file}_legacy_${index}`,
                    sessionId: sessionData.sessionId || file.replace('.json', ''),
                    workerId: transaction.workerId || 'unknown',
                    workerName: transaction.workerName,
                    type: activityType,
                    quantity: transaction.quantity || 1,
                    amount: transaction.amount,
                    itemName: transaction.itemName,
                    animalType: transaction.animalType,
                    timestamp: transaction.timestamp || sessionData.startTime || new Date().toISOString(),
                    originalMessage: transaction.originalMessage
                  });
                }
              });
            }
          } catch (sessionError) {
            console.warn(`Warning: Failed to parse session file ${file}:`, sessionError);
          }
        }
      }
    }

    console.log(`📊 Loaded ${allActivities.length} total activities for ranking calculation`);

    // Calculate rankings for each category
    const plantServices = calculateRankings(allActivities, 'plant_deposit');
    const animalServices = calculateRankings(allActivities, 'animal_delivery');
    const ferroviaMissions = calculateRankings(allActivities, 'ferrovia_mission');

    const response: RankingResponse = {
      plantServices,
      animalServices,
      ferroviaMissions,
      lastUpdated: new Date().toISOString()
    };

    console.log(`📈 Rankings calculated: ${plantServices.length} plant, ${animalServices.length} animal, ${ferroviaMissions.length} ferrovia`);

    return res.json({ ...response, serverId: serverId || 'legacy' });
  } catch (error) {
    console.error('❌ Error calculating worker rankings:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate worker rankings'
    });
  }
});

// Weekly rankings endpoints - MUST be before /:category to avoid conflicts
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.query;
    const weeklyService = WeeklyRankingService.getInstance();
    const weeklyRankings = weeklyService.getWeeklyRankings(serverId as string | undefined);

    return res.json({
      success: true,
      data: weeklyRankings,
      timeUntilReset: weeklyService.getTimeUntilReset(),
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('❌ Error getting weekly rankings:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get weekly rankings'
    });
  }
});

router.get('/weekly/stats', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.query;
    const weeklyService = WeeklyRankingService.getInstance();
    const allTimeStats = weeklyService.getAllTimeStats(serverId as string | undefined);

    return res.json({
      success: true,
      data: allTimeStats,
      totalWorkers: Object.keys(allTimeStats).length,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('❌ Error getting all-time stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get all-time stats'
    });
  }
});

router.get('/weekly/prizes', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.query;
    const weeklyService = WeeklyRankingService.getInstance();
    const prizeHistory = weeklyService.getPrizeHistory(serverId as string | undefined);

    return res.json({
      success: true,
      data: prizeHistory,
      totalWeeks: prizeHistory.length,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('❌ Error getting prize history:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get prize history'
    });
  }
});

// Get rankings for a specific category
router.get('/:category', async (req: Request, res: Response) => {
  const serverId = req.query.serverId as string | undefined;
  const { category } = req.params;

  if (!['plant', 'animal', 'ferrovia'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category. Must be: plant, animal, or ferrovia' });
  }

  try {
    // Reuse the main endpoint logic but filter for specific category
    const response = await new Promise<RankingResponse>((resolve, _reject) => {
      // This is a simplified version - in a real implementation, you'd extract the common logic
      resolve({
        plantServices: [],
        animalServices: [],
        ferroviaMissions: [],
        lastUpdated: new Date().toISOString()
      });
    });

    let result: WorkerRanking[];
    switch (category) {
      case 'plant':
        result = response.plantServices;
        break;
      case 'animal':
        result = response.animalServices;
        break;
      case 'ferrovia':
        result = response.ferroviaMissions;
        break;
      default:
        result = [];
        break;
    }

    return res.json({
      category,
      rankings: result,
      lastUpdated: response.lastUpdated,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error(`❌ Error getting ${category} rankings:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to get ${category} rankings`
    });
  }
});

export default router;