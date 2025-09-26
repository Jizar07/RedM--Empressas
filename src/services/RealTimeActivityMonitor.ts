import { EventEmitter } from 'events';
import { ActivityIntentAnalyzer, ActivityIntent } from './ActivityIntentAnalyzer';
import { WorkerActivityClusteringService } from './WorkerActivityClusteringService';
import { EnhancedWorkerSession, EnhancedTransaction } from '../types/EnhancedWorkerSession';

export interface ActivityAlert {
  id: string;
  workerId: string;
  workerName: string;
  type: 'waste_detected' | 'recipe_abandoned' | 'efficiency_drop' | 'resource_conflict' | 'long_idle' | 'help_needed' | 'innovation_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  data?: any; // Additional context data
  recommendations: string[];
}

export interface WorkerStatus {
  workerId: string;
  workerName: string;
  status: 'active' | 'idle' | 'warning' | 'error';
  lastActivity: string;
  currentActivity: string;
  efficiency: number;
  alerts: ActivityAlert[];
  estimatedCompletion?: string;
}

export interface MonitoringStats {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  workersWithAlerts: number;
  totalAlerts: number;
  criticalAlerts: number;
  averageEfficiency: number;
  totalValueGenerated: number;
}

export class RealTimeActivityMonitor extends EventEmitter {
  private static instance: RealTimeActivityMonitor | null = null;
  private intentAnalyzer: ActivityIntentAnalyzer;
  private clusteringService: WorkerActivityClusteringService;
  private monitoredWorkers: Map<string, EnhancedWorkerSession> = new Map();
  private activeAlerts: Map<string, ActivityAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastActivityCheck: Map<string, string> = new Map(); // workerId -> timestamp

  // Configuration
  private config = {
    idleThresholdMinutes: 15,
    efficiencyWarningThreshold: 0.4,
    wasteAlertThreshold: 0.3, // 30% waste triggers alert
    recipeTimeoutMinutes: 45,
    resourceConflictCheckInterval: 5000, // 5 seconds
    monitoringInterval: 30000 // 30 seconds
  };

  constructor() {
    super();
    this.intentAnalyzer = ActivityIntentAnalyzer.getInstance();
    this.clusteringService = WorkerActivityClusteringService.getInstance();
  }

  public static getInstance(): RealTimeActivityMonitor {
    if (!RealTimeActivityMonitor.instance) {
      RealTimeActivityMonitor.instance = new RealTimeActivityMonitor();
    }
    return RealTimeActivityMonitor.instance;
  }

  /**
   * Start real-time monitoring
   */
  public startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log('Starting real-time activity monitoring...');

    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle();
    }, this.config.monitoringInterval);

    // Emit monitoring started event
    this.emit('monitoring_started', {
      timestamp: new Date().toISOString(),
      config: this.config
    });
  }

  /**
   * Stop real-time monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Stopped real-time activity monitoring');
    this.emit('monitoring_stopped', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add or update a worker session for monitoring
   */
  public updateWorkerSession(session: any): void {
    const enhancedSession = this.clusteringService.analyzeWorkerSession(session);
    const workerId = enhancedSession.workerId;

    const previousSession = this.monitoredWorkers.get(workerId);
    this.monitoredWorkers.set(workerId, enhancedSession);

    // Check for new activities
    this.checkForActivityChanges(enhancedSession, previousSession);

    // Update last activity tracking
    this.lastActivityCheck.set(workerId, enhancedSession.lastActivity);

    // Emit worker updated event
    this.emit('worker_updated', {
      workerId,
      session: enhancedSession,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Remove a worker from monitoring
   */
  public removeWorkerFromMonitoring(workerId: string): void {
    this.monitoredWorkers.delete(workerId);
    this.lastActivityCheck.delete(workerId);

    // Clear worker-specific alerts
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.workerId === workerId) {
        this.activeAlerts.delete(alertId);
      }
    }

    this.emit('worker_removed', {
      workerId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current worker statuses
   */
  public getWorkerStatuses(): WorkerStatus[] {
    const statuses: WorkerStatus[] = [];

    for (const [workerId, session] of this.monitoredWorkers.entries()) {
      const workerAlerts = Array.from(this.activeAlerts.values())
        .filter(alert => alert.workerId === workerId && !alert.resolved);

      const status = this.determineWorkerStatus(session, workerAlerts);

      statuses.push({
        workerId: session.workerId,
        workerName: session.workerName,
        status,
        lastActivity: session.lastActivity,
        currentActivity: session.currentIntent?.purpose || 'Unknown',
        efficiency: session.sessionEfficiency,
        alerts: workerAlerts,
        estimatedCompletion: session.predictiveInsights.estimatedCompletionTime
      });
    }

    return statuses;
  }

  /**
   * Get monitoring statistics
   */
  public getMonitoringStats(): MonitoringStats {
    const workers = Array.from(this.monitoredWorkers.values());
    const alerts = Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);

    return {
      totalWorkers: workers.length,
      activeWorkers: workers.filter(w => w.status === 'active').length,
      idleWorkers: workers.filter(w => this.isWorkerIdle(w)).length,
      workersWithAlerts: new Set(alerts.map(a => a.workerId)).size,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      averageEfficiency: workers.length > 0
        ? workers.reduce((sum, w) => sum + w.sessionEfficiency, 0) / workers.length
        : 0,
      totalValueGenerated: workers.reduce((sum, w) => sum + w.totalValueCreated, 0)
    };
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): ActivityAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert_resolved', {
        alert,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Main monitoring cycle
   */
  private performMonitoringCycle(): void {
    for (const [workerId, session] of this.monitoredWorkers.entries()) {
      this.checkWorkerIdle(session);
      this.checkEfficiencyDrop(session);
      this.checkWasteDetection(session);
      this.checkRecipeAbandonment(session);
      this.checkResourceConflicts(session);
      this.checkInnovationDetection(session);
    }

    // Emit monitoring cycle completed
    this.emit('monitoring_cycle_completed', {
      timestamp: new Date().toISOString(),
      stats: this.getMonitoringStats()
    });
  }

  /**
   * Check for activity changes between sessions
   */
  private checkForActivityChanges(current: EnhancedWorkerSession, previous?: EnhancedWorkerSession): void {
    if (!previous) return;

    // Check for intent changes
    if (current.currentIntent?.type !== previous.currentIntent?.type) {
      this.emit('intent_changed', {
        workerId: current.workerId,
        workerName: current.workerName,
        previousIntent: previous.currentIntent,
        currentIntent: current.currentIntent,
        timestamp: new Date().toISOString()
      });
    }

    // Check for new completed goals
    const newGoals = current.completedGoals.filter(goal =>
      !previous.completedGoals.includes(goal)
    );
    if (newGoals.length > 0) {
      this.emit('goals_completed', {
        workerId: current.workerId,
        workerName: current.workerName,
        newGoals,
        timestamp: new Date().toISOString()
      });
    }

    // Check for new abandoned activities
    const newAbandonments = current.abandonedActivities.filter(activity =>
      !previous.abandonedActivities.includes(activity)
    );
    if (newAbandonments.length > 0) {
      this.createAlert({
        workerId: current.workerId,
        workerName: current.workerName,
        type: 'recipe_abandoned',
        severity: 'medium',
        title: 'Activities Abandoned',
        description: `Worker abandoned ${newAbandonments.length} activities`,
        data: { abandonedActivities: newAbandonments },
        recommendations: [
          'Check if worker needs assistance',
          'Review activity complexity',
          'Consider providing additional resources'
        ]
      });
    }
  }

  /**
   * Check if worker has been idle too long
   */
  private checkWorkerIdle(session: EnhancedWorkerSession): void {
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const minutesIdle = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

    if (minutesIdle > this.config.idleThresholdMinutes) {
      this.createAlert({
        workerId: session.workerId,
        workerName: session.workerName,
        type: 'long_idle',
        severity: minutesIdle > 30 ? 'high' : 'medium',
        title: 'Worker Idle',
        description: `Worker has been idle for ${minutesIdle.toFixed(1)} minutes`,
        data: { minutesIdle },
        recommendations: [
          'Check if worker needs new tasks',
          'Verify worker availability',
          'Consider reassigning activities'
        ]
      });
    }
  }

  /**
   * Check for efficiency drops
   */
  private checkEfficiencyDrop(session: EnhancedWorkerSession): void {
    if (session.sessionEfficiency < this.config.efficiencyWarningThreshold) {
      this.createAlert({
        workerId: session.workerId,
        workerName: session.workerName,
        type: 'efficiency_drop',
        severity: session.sessionEfficiency < 0.2 ? 'critical' : 'high',
        title: 'Low Efficiency Detected',
        description: `Worker efficiency is ${(session.sessionEfficiency * 100).toFixed(1)}%`,
        data: { efficiency: session.sessionEfficiency },
        recommendations: [
          'Review current activities for complexity',
          'Provide additional training or support',
          'Check for resource availability issues'
        ]
      });
    }
  }

  /**
   * Check for material waste
   */
  private checkWasteDetection(session: EnhancedWorkerSession): void {
    const wasteScore = session.productivityMetrics.wasteScore;
    if (wasteScore < (1 - this.config.wasteAlertThreshold)) {
      this.createAlert({
        workerId: session.workerId,
        workerName: session.workerName,
        type: 'waste_detected',
        severity: wasteScore < 0.5 ? 'high' : 'medium',
        title: 'Material Waste Detected',
        description: `High waste level detected (${((1 - wasteScore) * 100).toFixed(1)}% waste)`,
        data: { wasteScore },
        recommendations: [
          'Review material requirements before taking items',
          'Use recipe calculator to verify quantities needed',
          'Consider returning excess materials to inventory'
        ]
      });
    }
  }

  /**
   * Check for recipe abandonment
   */
  private checkRecipeAbandonment(session: EnhancedWorkerSession): void {
    if (session.currentIntent?.type === 'crafting' && session.currentIntent.relatedRecipes.length > 0) {
      const recipe = session.currentIntent.relatedRecipes[0];
      const startTime = new Date();

      // This would be properly calculated based on when materials were first taken
      if (recipe.timeWindow > this.config.recipeTimeoutMinutes) {
        this.createAlert({
          workerId: session.workerId,
          workerName: session.workerName,
          type: 'recipe_abandoned',
          severity: 'medium',
          title: 'Recipe May Be Abandoned',
          description: `Recipe ${recipe.recipe.portugueseName} started ${recipe.timeWindow} minutes ago`,
          data: { recipe: recipe.recipe, timeWindow: recipe.timeWindow },
          recommendations: [
            'Check if worker needs help completing recipe',
            'Verify all required materials are available',
            'Consider providing step-by-step guidance'
          ]
        });
      }
    }
  }

  /**
   * Check for resource conflicts between workers
   */
  private checkResourceConflicts(session: EnhancedWorkerSession): void {
    // Check if multiple workers need the same resources
    const neededResources = session.predictiveInsights.resourceNeeds;

    for (const resource of neededResources) {
      const conflictingWorkers = [];

      for (const [otherId, otherSession] of this.monitoredWorkers.entries()) {
        if (otherId === session.workerId) continue;

        const hasConflict = otherSession.predictiveInsights.resourceNeeds.some(
          otherResource => otherResource.itemName === resource.itemName &&
                          otherResource.urgency === 'high'
        );

        if (hasConflict) {
          conflictingWorkers.push(otherSession.workerName);
        }
      }

      if (conflictingWorkers.length > 0) {
        this.createAlert({
          workerId: session.workerId,
          workerName: session.workerName,
          type: 'resource_conflict',
          severity: 'medium',
          title: 'Resource Conflict Detected',
          description: `Multiple workers need ${resource.itemName}`,
          data: {
            resourceName: resource.itemName,
            conflictingWorkers,
            quantity: resource.quantity
          },
          recommendations: [
            'Coordinate resource allocation between workers',
            'Consider priority levels for urgent tasks',
            'Check inventory levels for this resource'
          ]
        });
      }
    }
  }

  /**
   * Check for innovation (unusually high efficiency with new approaches)
   */
  private checkInnovationDetection(session: EnhancedWorkerSession): void {
    if (session.innovationCount > 0) {
      this.createAlert({
        workerId: session.workerId,
        workerName: session.workerName,
        type: 'innovation_detected',
        severity: 'low',
        title: 'Innovation Detected',
        description: `Worker found ${session.innovationCount} innovative approaches`,
        data: { innovationCount: session.innovationCount },
        recommendations: [
          'Document the innovative approach',
          'Share with other workers',
          'Consider updating standard procedures'
        ]
      });
    }
  }

  /**
   * Create and track an alert
   */
  private createAlert(alertData: Omit<ActivityAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: ActivityAlert = {
      ...alertData,
      id: alertId,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    // Check for duplicate alerts (same type, worker, within 5 minutes)
    const existingAlert = Array.from(this.activeAlerts.values()).find(existing =>
      existing.workerId === alert.workerId &&
      existing.type === alert.type &&
      !existing.resolved &&
      (new Date(alert.timestamp).getTime() - new Date(existing.timestamp).getTime()) < 300000
    );

    if (!existingAlert) {
      this.activeAlerts.set(alertId, alert);

      // Emit alert created event
      this.emit('alert_created', {
        alert,
        timestamp: new Date().toISOString()
      });

      // Auto-resolve low severity alerts after some time
      if (alert.severity === 'low') {
        setTimeout(() => {
          this.resolveAlert(alertId);
        }, 300000); // 5 minutes
      }
    }
  }

  /**
   * Determine worker status based on session and alerts
   */
  private determineWorkerStatus(session: EnhancedWorkerSession, alerts: ActivityAlert[]): WorkerStatus['status'] {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const highAlerts = alerts.filter(a => a.severity === 'high');

    if (criticalAlerts.length > 0) return 'error';
    if (highAlerts.length > 0) return 'warning';
    if (this.isWorkerIdle(session)) return 'idle';
    return 'active';
  }

  /**
   * Check if worker is currently idle
   */
  private isWorkerIdle(session: EnhancedWorkerSession): boolean {
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const minutesIdle = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

    return minutesIdle > this.config.idleThresholdMinutes;
  }

  /**
   * Update monitoring configuration
   */
  public updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };

    this.emit('config_updated', {
      config: this.config,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current configuration
   */
  public getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Generate monitoring report
   */
  public generateMonitoringReport(): any {
    const stats = this.getMonitoringStats();
    const alerts = this.getActiveAlerts();
    const workerStatuses = this.getWorkerStatuses();

    return {
      reportTimestamp: new Date().toISOString(),
      summary: stats,
      workerStatuses,
      activeAlerts: alerts,
      topPerformers: workerStatuses
        .filter(w => w.status === 'active')
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 5),
      workersNeedingAttention: workerStatuses
        .filter(w => w.status === 'warning' || w.status === 'error')
        .sort((a, b) => b.alerts.length - a.alerts.length),
      recommendations: this.generateGlobalRecommendations(stats, alerts, workerStatuses)
    };
  }

  /**
   * Generate global recommendations based on monitoring data
   */
  private generateGlobalRecommendations(
    stats: MonitoringStats,
    alerts: ActivityAlert[],
    workers: WorkerStatus[]
  ): string[] {
    const recommendations: string[] = [];

    if (stats.averageEfficiency < 0.6) {
      recommendations.push('Team efficiency is below optimal - consider providing additional training');
    }

    if (stats.criticalAlerts > 0) {
      recommendations.push('Address critical alerts immediately to prevent work stoppage');
    }

    const idleWorkerCount = workers.filter(w => w.status === 'idle').length;
    if (idleWorkerCount > stats.totalWorkers * 0.3) {
      recommendations.push('High number of idle workers - review task allocation and resource availability');
    }

    const wasteAlerts = alerts.filter(a => a.type === 'waste_detected');
    if (wasteAlerts.length > 0) {
      recommendations.push('Material waste detected across multiple workers - review training on resource management');
    }

    const resourceConflicts = alerts.filter(a => a.type === 'resource_conflict');
    if (resourceConflicts.length > 0) {
      recommendations.push('Resource conflicts detected - implement better coordination system');
    }

    return recommendations;
  }
}

export default RealTimeActivityMonitor;