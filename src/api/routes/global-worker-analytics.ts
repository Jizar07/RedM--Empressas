import { Router, Request, Response } from 'express';
import { GlobalWorkerTracker } from '../../services/GlobalWorkerTracker';
import { RecipeValidator } from '../../services/RecipeValidator';
import { RealTimeMonitoringService } from '../../services/RealTimeMonitoringService';

const router = Router();
const globalTracker = GlobalWorkerTracker.getInstance();
const recipeValidator = RecipeValidator.getInstance();
const realTimeMonitoring = RealTimeMonitoringService.getInstance();

/**
 * Get comprehensive global analytics
 * GET /api/global-worker-analytics/overview
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    // Use enriched data that includes WorkerActivityService sync
    const enrichedData = globalTracker.getEnrichedWorkerData();

    return res.json({
      success: true,
      data: enrichedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Global Analytics Overview Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve global analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get detailed worker profile with all activities
 * GET /api/global-worker-analytics/worker/:workerId
 */
router.get('/worker/:workerId', async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const { includeActivities = 'true', includeTransfers = 'true', includeRecipes = 'true', limit = '100' } = req.query;

    const workerProfile = globalTracker.getWorkerProfile(workerId);
    if (!workerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found',
        workerId
      });
    }

    // Get additional data based on query parameters
    const response: any = {
      profile: workerProfile,
      analytics: {
        behaviorAnalysis: recipeValidator.analyzeWorkerBehavior(workerId),
        anomalies: recipeValidator.detectAnomalies(workerId)
      }
    };

    if (includeActivities === 'true') {
      const activities = globalTracker.getWorkerActivities(workerId);
      response.activities = activities.slice(0, parseInt(limit as string));
    }

    if (includeTransfers === 'true') {
      response.crossFirmTransfers = globalTracker.getWorkerCrossFirmTransfers(workerId);
    }

    if (includeRecipes === 'true') {
      response.recipeAttempts = globalTracker.getWorkerRecipeAttempts(workerId);
    }

    return res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Worker Profile Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve worker profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get crafting prediction for a worker's recent activities
 * POST /api/global-worker-analytics/predict-crafting
 */
router.post('/predict-crafting', async (req: Request, res: Response) => {
  try {
    const { workerId, timeWindowMinutes = 45 } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        error: 'workerId is required'
      });
    }

    // Get recent withdrawals
    const recentWithdrawals = globalTracker.getWorkerActivities(workerId)
      .filter(a =>
        a.activityType === 'item_removed' &&
        Date.now() - a.timestamp.getTime() < timeWindowMinutes * 60 * 1000
      )
      .slice(0, 20);

    if (recentWithdrawals.length === 0) {
      return res.json({
        success: true,
        data: {
          prediction: null,
          message: 'No recent item withdrawals found'
        }
      });
    }

    const craftingPrediction = await recipeValidator.validateCraftingIntent(workerId, recentWithdrawals);

    return res.json({
      success: true,
      data: {
        prediction: craftingPrediction,
        recentWithdrawals: recentWithdrawals.length,
        timeWindow: timeWindowMinutes
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Crafting Prediction Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to predict crafting intent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cross-firm activity analysis
 * GET /api/global-worker-analytics/cross-firm-analysis
 */
router.get('/cross-firm-analysis', async (req: Request, res: Response) => {
  try {
    const { timeRange = '24h' } = req.query;
    // Note: firmIds and workerIds parameters removed as unused

    // Parse time range
    let timeWindowMs: number;
    switch (timeRange) {
      case '1h':
        timeWindowMs = 60 * 60 * 1000;
        break;
      case '6h':
        timeWindowMs = 6 * 60 * 60 * 1000;
        break;
      case '24h':
        timeWindowMs = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        timeWindowMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeWindowMs = 24 * 60 * 60 * 1000;
    }

    const cutoffTime = Date.now() - timeWindowMs;

    // Get all cross-firm transfers in time range
    globalTracker.getGlobalAnalytics();
    const allWorkerProfiles = Array.from([...Array(100).keys()]) // Simplified iteration
      .map(i => globalTracker.getWorkerProfile(i.toString()))
      .filter(profile => profile !== null);

    const crossFirmAnalysis = {
      summary: {
        totalTransfers: 0,
        uniqueWorkers: new Set(),
        firmPairs: new Map(),
        itemTypes: new Map(),
        timeRange: timeRange,
        averageTransferTime: 0
      },
      topTransferRoutes: [],
      mostActiveWorkers: [],
      itemFlowPatterns: {},
      suspiciousActivities: []
    };

    let totalTransferTime = 0;
    let transferCount = 0;

    // Analyze each worker's transfers
    for (const profile of allWorkerProfiles as any[]) {
      const recentTransfers = profile.crossFirmTransfers.filter((transfer: any) =>
        transfer.timestamp.getTime() >= cutoffTime
      );

      if (recentTransfers.length === 0) continue;

      crossFirmAnalysis.summary.uniqueWorkers.add(profile.workerId);
      crossFirmAnalysis.summary.totalTransfers += recentTransfers.length;

      for (const transfer of recentTransfers) {
        // Track firm pairs
        const pairKey = `${transfer.sourceActivity.firmName} → ${transfer.destinationActivity.firmName}`;
        crossFirmAnalysis.summary.firmPairs.set(pairKey,
          (crossFirmAnalysis.summary.firmPairs.get(pairKey) || 0) + 1
        );

        // Track item types
        for (const item of transfer.itemsTransferred) {
          crossFirmAnalysis.summary.itemTypes.set(item.itemName,
            (crossFirmAnalysis.summary.itemTypes.get(item.itemName) || 0) + item.quantity
          );
        }

        // Calculate transfer time
        totalTransferTime += transfer.timeWindow;
        transferCount++;
      }
    }

    // Calculate averages
    crossFirmAnalysis.summary.averageTransferTime = transferCount > 0
      ? totalTransferTime / transferCount
      : 0;

    // Convert Maps to objects for JSON response
    const response = {
      ...crossFirmAnalysis,
      summary: {
        ...crossFirmAnalysis.summary,
        uniqueWorkers: crossFirmAnalysis.summary.uniqueWorkers.size,
        firmPairs: Object.fromEntries(crossFirmAnalysis.summary.firmPairs),
        itemTypes: Object.fromEntries(crossFirmAnalysis.summary.itemTypes)
      }
    };

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cross-Firm Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze cross-firm activities',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get anomaly detection results for all workers or specific worker
 * GET /api/global-worker-analytics/anomalies
 */
router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const { workerId, severity, anomalyType, limit = '50' } = req.query;

    let allAnomalies: any[] = [];

    if (workerId) {
      // Get anomalies for specific worker
      const workerAnomalies = recipeValidator.detectAnomalies(workerId as string);
      allAnomalies = workerAnomalies;
    } else {
      // Get anomalies for all workers (simplified approach)
      globalTracker.getGlobalAnalytics();

      // In a real implementation, we would iterate through all known worker IDs
      // For now, we'll return a placeholder structure
      allAnomalies = []; // Would be populated with all worker anomalies
    }

    // Filter by severity if specified
    if (severity) {
      allAnomalies = allAnomalies.filter(anomaly => anomaly.severity === severity);
    }

    // Filter by anomaly type if specified
    if (anomalyType) {
      allAnomalies = allAnomalies.filter(anomaly => anomaly.anomalyType === anomalyType);
    }

    // Limit results
    allAnomalies = allAnomalies.slice(0, parseInt(limit as string));

    // Sort by severity and timestamp
    const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    allAnomalies.sort((a, b) => {
      const severityDiff = (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
                          (severityOrder[a.severity as keyof typeof severityOrder] || 0);
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    const summary = {
      total: allAnomalies.length,
      bySeverity: {
        critical: allAnomalies.filter(a => a.severity === 'critical').length,
        high: allAnomalies.filter(a => a.severity === 'high').length,
        medium: allAnomalies.filter(a => a.severity === 'medium').length,
        low: allAnomalies.filter(a => a.severity === 'low').length
      },
      byType: {} as any
    };

    // Count by type
    for (const anomaly of allAnomalies) {
      summary.byType[anomaly.anomalyType] = (summary.byType[anomaly.anomalyType] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        summary,
        anomalies: allAnomalies
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Anomaly Detection Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve anomaly detection results',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get activity timeline for debugging and analysis
 * GET /api/global-worker-analytics/timeline
 */
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const {
      workerId,
      firmId,
      timeRange = '24h',
      activityTypes,
      itemName,
      limit = '200'
    } = req.query;

    // Parse time range
    let timeWindowMs: number;
    switch (timeRange) {
      case '1h':
        timeWindowMs = 60 * 60 * 1000;
        break;
      case '6h':
        timeWindowMs = 6 * 60 * 60 * 1000;
        break;
      case '24h':
        timeWindowMs = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        timeWindowMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeWindowMs = 24 * 60 * 60 * 1000;
    }

    const cutoffTime = Date.now() - timeWindowMs;

    let activities: any[] = [];

    if (workerId) {
      activities = globalTracker.getWorkerActivities(workerId as string);
    } else {
      // Get activities from global analytics (simplified)
      globalTracker.getGlobalAnalytics();
      // In a real implementation, we would aggregate all activities
      activities = []; // Would be populated with filtered activities
    }

    // Apply filters
    activities = activities.filter(activity => {
      // Time filter
      if (activity.timestamp.getTime() < cutoffTime) return false;

      // Firm filter
      if (firmId && activity.firmId !== firmId) return false;

      // Activity type filter
      if (activityTypes) {
        const types = (activityTypes as string).split(',');
        if (!types.includes(activity.activityType)) return false;
      }

      // Item name filter
      if (itemName && !activity.itemName.toLowerCase().includes((itemName as string).toLowerCase())) {
        return false;
      }

      return true;
    });

    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    activities = activities.slice(0, parseInt(limit as string));

    const summary = {
      totalActivities: activities.length,
      timeRange,
      filters: { workerId, firmId, activityTypes, itemName },
      activityBreakdown: {
        item_added: activities.filter(a => a.activityType === 'item_added').length,
        item_removed: activities.filter(a => a.activityType === 'item_removed').length
      },
      firmBreakdown: {} as any,
      itemBreakdown: {} as any
    };

    // Calculate breakdowns
    for (const activity of activities) {
      summary.firmBreakdown[activity.firmName] = (summary.firmBreakdown[activity.firmName] || 0) + 1;
      summary.itemBreakdown[activity.itemName] = (summary.itemBreakdown[activity.itemName] || 0) + activity.quantity;
    }

    res.json({
      success: true,
      data: {
        summary,
        timeline: activities
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Timeline Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve activity timeline',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get real-time monitoring metrics
 * GET /api/global-worker-analytics/monitoring/metrics
 */
router.get('/monitoring/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = realTimeMonitoring.getMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Monitoring Metrics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve monitoring metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get real-time alerts
 * GET /api/global-worker-analytics/monitoring/alerts
 */
router.get('/monitoring/alerts', async (req: Request, res: Response) => {
  try {
    const {
      severity,
      type,
      resolved = 'false',
      limit = '50'
    } = req.query;

    const options: any = {
      limit: parseInt(limit as string)
    };

    if (severity && severity !== 'all') {
      options.severity = severity as string;
    }

    if (type && type !== 'all') {
      options.type = type as string;
    }

    if (resolved !== 'all') {
      options.resolved = resolved === 'true';
    }

    const alerts = realTimeMonitoring.getAlerts(options);

    // Calculate alert statistics
    const stats = {
      total: alerts.length,
      unresolved: alerts.filter(a => !a.resolved).length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      byType: {} as any
    };

    // Count by type
    for (const alert of alerts) {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        alerts,
        statistics: stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Monitoring Alerts Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve monitoring alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Resolve an alert
 * POST /api/global-worker-analytics/monitoring/alerts/:alertId/resolve
 */
router.post('/monitoring/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy = 'system' } = req.body;

    const success = realTimeMonitoring.resolveAlert(alertId, resolvedBy);

    if (success) {
      return res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or already resolved'
      });
    }
  } catch (error) {
    console.error('❌ Alert Resolution Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update monitoring thresholds
 * POST /api/global-worker-analytics/monitoring/thresholds
 */
router.post('/monitoring/thresholds', async (req: Request, res: Response) => {
  try {
    const newThresholds = req.body;

    // Validate threshold values
    const validFields = [
      'maxActivitiesPerMinute',
      'maxTransfersPerMinute',
      'maxAnomaliesPerHour',
      'maxResponseTimeMs',
      'minWorkerEfficiency',
      'maxRecipeAttemptDuration',
      'maxCrossFirmTransferTime'
    ];

    const filteredThresholds: any = {};
    for (const [key, value] of Object.entries(newThresholds)) {
      if (validFields.includes(key) && typeof value === 'number' && value > 0) {
        filteredThresholds[key] = value;
      }
    }

    if (Object.keys(filteredThresholds).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid threshold values provided'
      });
    }

    realTimeMonitoring.updateThresholds(filteredThresholds);

    return res.json({
      success: true,
      message: 'Thresholds updated successfully',
      data: {
        updated: filteredThresholds,
        current: realTimeMonitoring.getThresholds()
      }
    });
  } catch (error) {
    console.error('❌ Threshold Update Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update thresholds',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get current monitoring thresholds
 * GET /api/global-worker-analytics/monitoring/thresholds
 */
router.get('/monitoring/thresholds', async (_req: Request, res: Response) => {
  try {
    const thresholds = realTimeMonitoring.getThresholds();

    res.json({
      success: true,
      data: thresholds,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Thresholds Fetch Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve thresholds',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get system health status
 * GET /api/global-worker-analytics/monitoring/health
 */
router.get('/monitoring/health', async (_req: Request, res: Response) => {
  try {
    const metrics = realTimeMonitoring.getMetrics();
    const isHealthy = realTimeMonitoring.isHealthy();

    const healthStatus = {
      status: metrics.systemHealth,
      healthy: isHealthy,
      uptime: metrics.uptime,
      lastActivity: metrics.lastActivityTime,
      metrics: {
        activitiesPerMinute: metrics.activitiesPerMinute,
        transfersPerMinute: metrics.transfersPerMinute,
        recipesPerMinute: metrics.recipesPerMinute,
        anomaliesPerHour: metrics.anomaliesPerHour,
        averageResponseTime: metrics.averageResponseTime
      },
      thresholds: realTimeMonitoring.getThresholds()
    };

    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health Check Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;