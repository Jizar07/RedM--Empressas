import { EventEmitter } from 'events';
import { GlobalWorkerTracker, ItemActivity, CrossFirmTransfer, RecipeAttempt } from './GlobalWorkerTracker';
import { RecipeValidator } from './RecipeValidator';

export interface RealTimeAlert {
  id: string;
  type: 'anomaly' | 'performance' | 'security' | 'system' | 'prediction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  workerId?: string;
  workerName?: string;
  firmIds: string[];
  timestamp: Date;
  data?: any;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface MonitoringMetrics {
  activitiesPerMinute: number;
  transfersPerMinute: number;
  recipesPerMinute: number;
  anomaliesPerHour: number;
  averageResponseTime: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastActivityTime: Date;
}

export interface PerformanceThresholds {
  maxActivitiesPerMinute: number;
  maxTransfersPerMinute: number;
  maxAnomaliesPerHour: number;
  maxResponseTimeMs: number;
  minWorkerEfficiency: number;
  maxRecipeAttemptDuration: number; // minutes
  maxCrossFirmTransferTime: number; // minutes
}

export class RealTimeMonitoringService extends EventEmitter {
  private static instance: RealTimeMonitoringService | null = null;
  private globalTracker: GlobalWorkerTracker;
  private recipeValidator: RecipeValidator;

  // Monitoring state
  private alerts: Map<string, RealTimeAlert> = new Map();
  private metrics: MonitoringMetrics;
  private thresholds: PerformanceThresholds;
  private startTime: Date;

  // Timers and intervals
  private metricsUpdateInterval: NodeJS.Timeout | null = null;
  private anomalyCheckInterval: NodeJS.Timeout | null = null;
  private alertCleanupInterval: NodeJS.Timeout | null = null;

  // Activity tracking for metrics - using circular buffers for bounded memory
  private activityHistory: { timestamp: Date; count: number }[] = [];
  private transferHistory: { timestamp: Date; count: number }[] = [];
  private recipeHistory: { timestamp: Date; count: number }[] = [];
  private responseTimeHistory: number[] = [];

  // Configuration
  private readonly METRICS_UPDATE_INTERVAL = 30 * 1000; // 30 seconds
  private readonly ANOMALY_CHECK_INTERVAL = 60 * 1000; // 1 minute
  private readonly ALERT_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly HISTORY_RETENTION_MINUTES = 60;
  private readonly MAX_RESPONSE_TIME_SAMPLES = 100;
  private readonly MAX_HISTORY_ENTRIES = 120; // Max entries before forcing cleanup (2x retention period)

  constructor() {
    super();
    this.globalTracker = GlobalWorkerTracker.getInstance();
    this.recipeValidator = RecipeValidator.getInstance();
    this.startTime = new Date();

    // Initialize metrics
    this.metrics = {
      activitiesPerMinute: 0,
      transfersPerMinute: 0,
      recipesPerMinute: 0,
      anomaliesPerHour: 0,
      averageResponseTime: 0,
      systemHealth: 'healthy',
      uptime: 0,
      lastActivityTime: new Date()
    };

    // Initialize thresholds
    this.thresholds = {
      maxActivitiesPerMinute: 100,
      maxTransfersPerMinute: 20,
      maxAnomaliesPerHour: 10,
      maxResponseTimeMs: 5000,
      minWorkerEfficiency: 0.6,
      maxRecipeAttemptDuration: 45,
      maxCrossFirmTransferTime: 15
    };

    this.initializeMonitoring();
  }

  public static getInstance(): RealTimeMonitoringService {
    if (!RealTimeMonitoringService.instance) {
      RealTimeMonitoringService.instance = new RealTimeMonitoringService();
    }
    return RealTimeMonitoringService.instance;
  }

  private initializeMonitoring(): void {
    console.log('🔥 RealTimeMonitoringService: Initializing monitoring system...');

    // Start monitoring intervals
    this.metricsUpdateInterval = setInterval(() => {
      this.updateMetrics();
    }, this.METRICS_UPDATE_INTERVAL);

    this.anomalyCheckInterval = setInterval(() => {
      this.checkForAnomalies();
    }, this.ANOMALY_CHECK_INTERVAL);

    this.alertCleanupInterval = setInterval(() => {
      this.cleanupOldAlerts();
    }, this.ALERT_CLEANUP_INTERVAL);

    console.log('✅ RealTimeMonitoringService: Monitoring system started');
  }

  /**
   * Track new activity for real-time monitoring
   */
  public trackActivity(activity: ItemActivity): void {
    try {
      console.log(`📊 RealTimeMonitoring: Tracking activity - ${activity.workerName} ${activity.activityType} ${activity.itemName}`);

      // Update activity metrics
      this.updateActivityHistory();
      this.metrics.lastActivityTime = new Date();

      // Check for immediate anomalies
      this.checkActivityForImmedateAnomalies(activity);

      // Check for performance thresholds
      this.checkPerformanceThresholds();

      // Emit real-time event
      this.emit('activity', activity);

      // Check if this triggers any predictions
      this.checkCraftingPredictions(activity);

    } catch (error) {
      console.error('❌ RealTimeMonitoringService: Error tracking activity:', error);
      this.createAlert({
        type: 'system',
        severity: 'medium',
        title: 'Activity Tracking Error',
        message: `Error processing activity from ${activity.workerName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        firmIds: [activity.firmId]
      });
    }
  }

  /**
   * Track cross-firm transfer for monitoring
   */
  public trackCrossFirmTransfer(transfer: CrossFirmTransfer): void {
    try {
      console.log(`🔄 RealTimeMonitoring: Tracking cross-firm transfer - ${transfer.workerName} moved items between firms`);

      // Update transfer metrics
      this.updateTransferHistory();

      // Check for transfer anomalies
      this.checkTransferForAnomalies(transfer);

      // Emit real-time event
      this.emit('transfer', transfer);

      // Check if transfer time exceeds threshold
      if (transfer.timeWindow > this.thresholds.maxCrossFirmTransferTime) {
        this.createAlert({
          type: 'performance',
          severity: 'medium',
          title: 'Slow Cross-Firm Transfer',
          message: `Transfer took ${transfer.timeWindow} minutes, exceeding threshold of ${this.thresholds.maxCrossFirmTransferTime} minutes`,
          workerId: transfer.workerId,
          workerName: transfer.workerName,
          firmIds: [transfer.sourceActivity.firmId, transfer.destinationActivity.firmId],
          data: { transfer }
        });
      }

    } catch (error) {
      console.error('❌ RealTimeMonitoringService: Error tracking transfer:', error);
    }
  }

  /**
   * Track recipe attempt for monitoring
   */
  public trackRecipeAttempt(attempt: RecipeAttempt): void {
    try {
      console.log(`🧪 RealTimeMonitoring: Tracking recipe attempt - ${attempt.workerName} attempting ${attempt.recipeName}`);

      // Update recipe metrics
      this.updateRecipeHistory();

      // Check for recipe anomalies
      this.checkRecipeForAnomalies(attempt);

      // Emit real-time event
      this.emit('recipe', attempt);

    } catch (error) {
      console.error('❌ RealTimeMonitoringService: Error tracking recipe:', error);
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(alertData: Omit<RealTimeAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: RealTimeAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.set(alert.id, alert);

    console.log(`🚨 RealTimeMonitoring: Created ${alert.severity} alert - ${alert.title}`);

    // Emit alert event for real-time notifications
    this.emit('alert', alert);

    // For critical alerts, also log to console with more visibility
    if (alert.severity === 'critical') {
      console.error(`🔥 CRITICAL ALERT: ${alert.title} - ${alert.message}`);
    }
  }

  /**
   * Update system metrics
   */
  private updateMetrics(): void {
    try {
      // Calculate rates from history
      this.metrics.activitiesPerMinute = this.calculateRateFromHistory(this.activityHistory);
      this.metrics.transfersPerMinute = this.calculateRateFromHistory(this.transferHistory);
      this.metrics.recipesPerMinute = this.calculateRateFromHistory(this.recipeHistory);

      // Calculate anomalies per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.metrics.anomaliesPerHour = Array.from(this.alerts.values())
        .filter(alert => alert.type === 'anomaly' && alert.timestamp >= oneHourAgo)
        .length;

      // Calculate average response time
      if (this.responseTimeHistory.length > 0) {
        this.metrics.averageResponseTime = this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length;
      }

      // Calculate uptime
      this.metrics.uptime = Date.now() - this.startTime.getTime();

      // Determine system health
      this.metrics.systemHealth = this.calculateSystemHealth();

      // Clean up old history
      this.cleanupHistory();

      // Emit metrics update
      this.emit('metrics', this.metrics);

      console.log(`📊 RealTimeMonitoring: Metrics updated - Health: ${this.metrics.systemHealth}, Activities: ${this.metrics.activitiesPerMinute}/min`);

    } catch (error) {
      console.error('❌ RealTimeMonitoringService: Error updating metrics:', error);
    }
  }

  /**
   * Check for global anomalies across all workers
   */
  private async checkForAnomalies(): Promise<void> {
    try {
      // This is a simplified approach - in reality we'd need to iterate through known worker IDs
      this.globalTracker.getGlobalAnalytics();

      // Check system-wide anomalies
      if (this.metrics.activitiesPerMinute > this.thresholds.maxActivitiesPerMinute) {
        this.createAlert({
          type: 'anomaly',
          severity: 'high',
          title: 'High Activity Volume',
          message: `System processing ${this.metrics.activitiesPerMinute} activities per minute, exceeding threshold of ${this.thresholds.maxActivitiesPerMinute}`,
          firmIds: ['system']
        });
      }

      if (this.metrics.transfersPerMinute > this.thresholds.maxTransfersPerMinute) {
        this.createAlert({
          type: 'anomaly',
          severity: 'medium',
          title: 'High Transfer Volume',
          message: `System processing ${this.metrics.transfersPerMinute} cross-firm transfers per minute, exceeding threshold of ${this.thresholds.maxTransfersPerMinute}`,
          firmIds: ['system']
        });
      }

    } catch (error) {
      console.error('❌ RealTimeMonitoringService: Error checking anomalies:', error);
    }
  }

  /**
   * Check activity for immediate anomalies
   */
  private checkActivityForImmedateAnomalies(activity: ItemActivity): void {
    // Check for excessive quantities
    if (activity.quantity > 1000) {
      this.createAlert({
        type: 'anomaly',
        severity: 'medium',
        title: 'Large Quantity Activity',
        message: `${activity.workerName} ${activity.activityType === 'item_added' ? 'added' : 'removed'} ${activity.quantity}x ${activity.itemName} - unusually large quantity`,
        workerId: activity.workerId,
        workerName: activity.workerName,
        firmIds: [activity.firmId],
        data: { activity }
      });
    }

    // Check for rare items
    const rareItems = ['diamond', 'emerald', 'ruby', 'gold', 'platinum'];
    if (rareItems.some(item => activity.itemName.toLowerCase().includes(item))) {
      this.createAlert({
        type: 'security',
        severity: 'high',
        title: 'Rare Item Activity',
        message: `${activity.workerName} ${activity.activityType === 'item_added' ? 'added' : 'removed'} rare item: ${activity.itemName}`,
        workerId: activity.workerId,
        workerName: activity.workerName,
        firmIds: [activity.firmId],
        data: { activity }
      });
    }
  }

  /**
   * Check transfer for anomalies
   */
  private checkTransferForAnomalies(transfer: CrossFirmTransfer): void {
    // Check for frequent transfers by same worker
    const recentTransfers = Array.from(this.transferHistory)
      .filter(t => t.timestamp >= new Date(Date.now() - 10 * 60 * 1000));

    if (recentTransfers.length > 10) {
      this.createAlert({
        type: 'anomaly',
        severity: 'medium',
        title: 'Frequent Cross-Firm Transfers',
        message: `${transfer.workerName} has performed ${recentTransfers.length} transfers in the last 10 minutes`,
        workerId: transfer.workerId,
        workerName: transfer.workerName,
        firmIds: [transfer.sourceActivity.firmId, transfer.destinationActivity.firmId],
        data: { transfer, recentCount: recentTransfers.length }
      });
    }
  }

  /**
   * Check recipe for anomalies
   */
  private checkRecipeForAnomalies(attempt: RecipeAttempt): void {
    // Check for long-running recipe attempts
    const durationMinutes = (Date.now() - attempt.startTime.getTime()) / (1000 * 60);

    if (durationMinutes > this.thresholds.maxRecipeAttemptDuration && attempt.status === 'in_progress') {
      this.createAlert({
        type: 'performance',
        severity: 'low',
        title: 'Long Recipe Attempt',
        message: `Recipe "${attempt.recipeName}" has been in progress for ${durationMinutes.toFixed(1)} minutes`,
        workerId: attempt.workerId,
        workerName: attempt.workerName,
        firmIds: [attempt.firmId],
        data: { attempt, duration: durationMinutes }
      });
    }

    // Check for low efficiency
    if (attempt.efficiency < this.thresholds.minWorkerEfficiency && attempt.status === 'completed') {
      this.createAlert({
        type: 'performance',
        severity: 'low',
        title: 'Low Recipe Efficiency',
        message: `Recipe "${attempt.recipeName}" completed with ${(attempt.efficiency * 100).toFixed(1)}% efficiency`,
        workerId: attempt.workerId,
        workerName: attempt.workerName,
        firmIds: [attempt.firmId],
        data: { attempt }
      });
    }
  }

  /**
   * Check for crafting predictions
   */
  private async checkCraftingPredictions(activity: ItemActivity): Promise<void> {
    if (activity.activityType === 'item_removed') {
      try {
        // Get recent withdrawals for prediction
        const recentWithdrawals = this.globalTracker.getWorkerActivities(activity.workerId)
          .filter(a =>
            a.activityType === 'item_removed' &&
            Date.now() - a.timestamp.getTime() < 30 * 60 * 1000
          )
          .slice(0, 15);

        if (recentWithdrawals.length >= 2) {
          const prediction = await this.recipeValidator.validateCraftingIntent(activity.workerId, recentWithdrawals);

          if (prediction.predictionConfidence > 0.7) {
            this.createAlert({
              type: 'prediction',
              severity: 'low',
              title: 'High Crafting Confidence',
              message: `${activity.workerName} is likely crafting "${prediction.possibleRecipes[0]?.recipe.name || 'unknown'}" (${(prediction.predictionConfidence * 100).toFixed(1)}% confidence)`,
              workerId: activity.workerId,
              workerName: activity.workerName,
              firmIds: [activity.firmId],
              data: { prediction }
            });
          }
        }
      } catch (error) {
        console.error('❌ RealTimeMonitoringService: Error checking crafting predictions:', error);
      }
    }
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(): void {
    if (this.metrics.averageResponseTime > this.thresholds.maxResponseTimeMs) {
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        title: 'High Response Time',
        message: `Average response time is ${this.metrics.averageResponseTime.toFixed(0)}ms, exceeding threshold of ${this.thresholds.maxResponseTimeMs}ms`,
        firmIds: ['system']
      });
    }
  }

  /**
   * Calculate system health based on metrics
   */
  private calculateSystemHealth(): MonitoringMetrics['systemHealth'] {
    const criticalAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.severity === 'critical' && !alert.resolved)
      .length;

    const highAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.severity === 'high' && !alert.resolved)
      .length;

    if (criticalAlerts > 0) return 'critical';
    if (highAlerts > 3 || this.metrics.anomaliesPerHour > this.thresholds.maxAnomaliesPerHour) return 'warning';
    return 'healthy';
  }

  /**
   * Helper functions for metrics calculation - with circular buffer limits
   */
  private updateActivityHistory(): void {
    this.activityHistory.push({ timestamp: new Date(), count: 1 });
    // Enforce max size to prevent unbounded growth
    if (this.activityHistory.length > this.MAX_HISTORY_ENTRIES) {
      this.cleanupHistory();
    }
  }

  private updateTransferHistory(): void {
    this.transferHistory.push({ timestamp: new Date(), count: 1 });
    // Enforce max size to prevent unbounded growth
    if (this.transferHistory.length > this.MAX_HISTORY_ENTRIES) {
      this.cleanupHistory();
    }
  }

  private updateRecipeHistory(): void {
    this.recipeHistory.push({ timestamp: new Date(), count: 1 });
    // Enforce max size to prevent unbounded growth
    if (this.recipeHistory.length > this.MAX_HISTORY_ENTRIES) {
      this.cleanupHistory();
    }
  }

  private calculateRateFromHistory(history: { timestamp: Date; count: number }[]): number {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    return history.filter(entry => entry.timestamp >= oneMinuteAgo)
      .reduce((sum, entry) => sum + entry.count, 0);
  }

  private cleanupHistory(): void {
    const cutoff = new Date(Date.now() - this.HISTORY_RETENTION_MINUTES * 60 * 1000);

    this.activityHistory = this.activityHistory.filter(entry => entry.timestamp >= cutoff);
    this.transferHistory = this.transferHistory.filter(entry => entry.timestamp >= cutoff);
    this.recipeHistory = this.recipeHistory.filter(entry => entry.timestamp >= cutoff);

    if (this.responseTimeHistory.length > this.MAX_RESPONSE_TIME_SAMPLES) {
      this.responseTimeHistory = this.responseTimeHistory.slice(-this.MAX_RESPONSE_TIME_SAMPLES);
    }
  }

  private cleanupOldAlerts(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < oneWeekAgo) {
        this.alerts.delete(alertId);
      }
    }

    console.log(`🧹 RealTimeMonitoring: Cleaned up old alerts, ${this.alerts.size} alerts remaining`);
  }

  /**
   * Public API methods
   */
  public getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  public getAlerts(options: {
    severity?: string;
    type?: string;
    resolved?: boolean;
    limit?: number;
  } = {}): RealTimeAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (options.severity) {
      alerts = alerts.filter(alert => alert.severity === options.severity);
    }

    if (options.type) {
      alerts = alerts.filter(alert => alert.type === options.type);
    }

    if (options.resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === options.resolved);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  public resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    this.alerts.set(alertId, alert);
    this.emit('alertResolved', alert);

    console.log(`✅ RealTimeMonitoring: Alert resolved - ${alert.title} by ${resolvedBy}`);
    return true;
  }

  public updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('⚙️ RealTimeMonitoring: Thresholds updated:', newThresholds);
  }

  public getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  public isHealthy(): boolean {
    return this.metrics.systemHealth === 'healthy';
  }

  /**
   * Shutdown monitoring
   */
  public shutdown(): void {
    console.log('🛑 RealTimeMonitoringService: Shutting down...');

    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }

    if (this.anomalyCheckInterval) {
      clearInterval(this.anomalyCheckInterval);
    }

    if (this.alertCleanupInterval) {
      clearInterval(this.alertCleanupInterval);
    }

    this.removeAllListeners();

    console.log('✅ RealTimeMonitoringService: Shutdown complete');
  }
}