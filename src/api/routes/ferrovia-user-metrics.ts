import { Router, Request, Response } from 'express';
import { BoxOriginAnalyzer } from '../../services/BoxOriginAnalyzer';
import SupplyChainService from '../../services/SupplyChainService';

const router = Router();

// Get user performance metrics for Ferrovia fraud detection
router.get('/user-metrics', async (_req: Request, res: Response) => {
  try {
    const boxOriginAnalyzer = BoxOriginAnalyzer.getInstance();
    const supplyChainService = SupplyChainService.getInstance();

    // Get all active sessions to find unique users
    const allSessions = await supplyChainService.getAllActiveSessions();
    const uniqueUsers = new Map<string, { userId: string; userName: string }>();

    // Extract unique users
    allSessions.forEach(session => {
      if (!uniqueUsers.has(session.workerId)) {
        uniqueUsers.set(session.workerId, {
          userId: session.workerId,
          userName: session.workerName
        });
      }
    });

    // Calculate metrics for each user
    const userMetrics = Array.from(uniqueUsers.values()).map(user => {
      return boxOriginAnalyzer.calculateUserRisk(user.userId, user.userName);
    });

    // Sort by suspicion level and external box percentage
    userMetrics.sort((a, b) => {
      const suspicionOrder = { high: 3, medium: 2, low: 1 };
      const suspicionDiff = suspicionOrder[b.suspicionLevel] - suspicionOrder[a.suspicionLevel];

      if (suspicionDiff !== 0) {
        return suspicionDiff;
      }

      return b.externalBoxPercentage - a.externalBoxPercentage;
    });

    res.json({ metrics: userMetrics });
  } catch (error) {
    console.error('Error generating Ferrovia user metrics:', error);
    res.status(500).json({
      error: 'Failed to generate user metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get detailed analysis for a specific user
router.get('/user-metrics/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const boxOriginAnalyzer = BoxOriginAnalyzer.getInstance();
    const supplyChainService = SupplyChainService.getInstance();

    // Get user sessions
    const userSessions = await supplyChainService.getSessionsByWorkerId(userId);
    if (userSessions.length === 0) {
      res.status(404).json({ error: 'User not found or no sessions available' });
      return;
    }

    const userName = userSessions[0].workerName;
    const userMetrics = boxOriginAnalyzer.calculateUserRisk(userId, userName);

    // Get detailed analysis for each session
    const sessionAnalyses = userSessions.map(session => {
      const analysis = boxOriginAnalyzer.analyzeSession(session);
      const timeline = boxOriginAnalyzer.createDetailedTimeline(session);

      return {
        sessionId: session.sessionId,
        startDate: session.startTime,
        lastActivity: session.lastActivity,
        status: session.status,
        analysis,
        timeline
      };
    });

    res.json({
      userMetrics,
      sessionAnalyses,
      totalSessions: userSessions.length
    });
  } catch (error) {
    console.error('Error getting user detailed metrics:', error);
    res.status(500).json({
      error: 'Failed to get user detailed metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get fraud detection summary
router.get('/fraud-summary', async (_req: Request, res: Response) => {
  try {
    const boxOriginAnalyzer = BoxOriginAnalyzer.getInstance();
    const supplyChainService = SupplyChainService.getInstance();

    // Get all sessions for summary statistics
    const allSessions = await supplyChainService.getAllActiveSessions();

    let totalFarmLoss = 0;
    let totalExternalBoxes = 0;
    let highRiskSessions = 0;
    let mediumRiskSessions = 0;
    let totalSessions = allSessions.length;

    // Analyze each session
    allSessions.forEach(session => {
      const analysis = boxOriginAnalyzer.analyzeSession(session);
      totalFarmLoss += analysis.farmRevenueImpact;
      totalExternalBoxes += analysis.externalBoxesSuspected;

      if (analysis.suspicionLevel === 'high') {
        highRiskSessions++;
      } else if (analysis.suspicionLevel === 'medium') {
        mediumRiskSessions++;
      }
    });

    // Get unique users
    const uniqueUsers = new Map();
    allSessions.forEach(session => {
      uniqueUsers.set(session.workerId, session.workerName);
    });

    const summary = {
      totalSessions,
      totalUsers: uniqueUsers.size,
      totalFarmLoss,
      totalExternalBoxes,
      highRiskSessions,
      mediumRiskSessions,
      lowRiskSessions: totalSessions - highRiskSessions - mediumRiskSessions,
      fraudDetectionRate: totalSessions > 0 ? ((highRiskSessions + mediumRiskSessions) / totalSessions * 100) : 0
    };

    res.json({ summary });
  } catch (error) {
    console.error('Error generating fraud summary:', error);
    res.status(500).json({
      error: 'Failed to generate fraud summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;