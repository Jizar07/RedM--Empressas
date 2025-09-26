import { ActivityIntentAnalyzer, ActivityIntent, ActivityCluster, WorkerInventorySnapshot } from './ActivityIntentAnalyzer';
import { EnhancedTransaction, EnhancedWorkerSession, WorkerSpecialization, ProductivityMetrics, PredictiveInsights } from '../types/EnhancedWorkerSession';
import { MultiSourceRecipeService, Recipe } from './MultiSourceRecipeService';

export class WorkerActivityClusteringService {
  private static instance: WorkerActivityClusteringService | null = null;
  private intentAnalyzer: ActivityIntentAnalyzer;
  private recipeService: MultiSourceRecipeService;

  constructor() {
    this.intentAnalyzer = ActivityIntentAnalyzer.getInstance();
    this.recipeService = MultiSourceRecipeService.getInstance();
  }

  public static getInstance(): WorkerActivityClusteringService {
    if (!WorkerActivityClusteringService.instance) {
      WorkerActivityClusteringService.instance = new WorkerActivityClusteringService();
    }
    return WorkerActivityClusteringService.instance;
  }

  /**
   * Enhanced worker session analysis with intelligent clustering
   */
  public analyzeWorkerSession(session: any): EnhancedWorkerSession {
    // Convert existing transactions to inventory snapshots
    const inventorySnapshots = this.convertTransactionsToSnapshots(session);

    // Analyze current intent
    const currentIntent = this.intentAnalyzer.analyzeWorkerIntent(
      inventorySnapshots.filter(s => s.purpose === 'taken'),
      30
    );

    // Cluster related activities
    const activityClusters = this.intentAnalyzer.clusterActivities(inventorySnapshots);

    // Enhance transactions with intelligence
    const enhancedTransactions = this.enhanceTransactions(session, currentIntent, activityClusters);

    // Calculate specializations
    const workerSpecializations = this.calculateWorkerSpecializations(enhancedTransactions);

    // Calculate productivity metrics
    const productivityMetrics = this.calculateProductivityMetrics(enhancedTransactions, activityClusters);

    // Generate predictive insights
    const predictiveInsights = this.generatePredictiveInsights(currentIntent, activityClusters, enhancedTransactions);

    // Find active recipes
    const activeRecipes = currentIntent.relatedRecipes || [];

    // Calculate session efficiency
    const sessionEfficiency = this.calculateSessionEfficiency(activityClusters, enhancedTransactions);

    // Calculate total value created
    const totalValueCreated = this.calculateTotalValueCreated(enhancedTransactions);

    // Analyze time spent by activity
    const timeSpentByActivity = this.analyzeTimeSpentByActivity(activityClusters);

    return {
      // Existing fields
      workerId: session.workerId,
      workerName: session.workerName,
      channelId: session.channelId,
      sessionId: session.sessionId,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      status: session.status,

      // Enhanced transaction arrays
      plantTransactions: enhancedTransactions.filter(t => t.type.includes('plants') || t.type.includes('seed')),
      animalTransactions: enhancedTransactions.filter(t => t.type.includes('animal')),
      inventoryTransactions: enhancedTransactions.filter(t => t.type.includes('item')),
      craftingTransactions: enhancedTransactions.filter(t => t.type === 'crafting_completed'),

      // Intelligence layer
      currentIntent,
      activityClusters,
      activeRecipes,
      workerSpecializations,
      productivityMetrics,
      predictiveInsights,

      // Performance tracking
      sessionEfficiency,
      completedGoals: this.extractCompletedGoals(activityClusters),
      abandonedActivities: this.extractAbandonedActivities(activityClusters),
      totalValueCreated,

      // Quality metrics
      errorCount: this.calculateErrorCount(enhancedTransactions),
      helpRequestCount: 0, // Would be implemented based on Discord interactions
      innovationCount: this.calculateInnovationCount(enhancedTransactions),

      // Time analysis
      timeSpentByActivity,

      // Social/collaboration tracking
      collaborations: [], // Would be populated by analyzing cross-worker interactions

      // Learning and development
      newSkillsLearned: this.identifyNewSkills(enhancedTransactions, workerSpecializations),
      challengesEncountered: this.identifyChallenges(activityClusters),
      improvementOpportunities: this.identifyImprovementOpportunities(productivityMetrics, activityClusters),

      // Manager insights
      managerNotes: [],
      performanceFlags: this.generatePerformanceFlags(productivityMetrics, sessionEfficiency),
      nextActions: predictiveInsights.recommendations
    };
  }

  /**
   * Convert existing transaction format to inventory snapshots
   */
  private convertTransactionsToSnapshots(session: any): WorkerInventorySnapshot[] {
    const snapshots: WorkerInventorySnapshot[] = [];

    // Process plant transactions
    if (session.plantTransactions) {
      session.plantTransactions.forEach((tx: any) => {
        snapshots.push({
          itemName: tx.itemName,
          quantity: tx.quantity,
          timestamp: tx.timestamp,
          purpose: tx.type.includes('taken') ? 'taken' : 'deposited',
          portugueseName: tx.itemName // Would be translated properly
        });
      });
    }

    // Process animal transactions
    if (session.animalTransactions) {
      session.animalTransactions.forEach((tx: any) => {
        snapshots.push({
          itemName: tx.animalType,
          quantity: tx.quantity,
          timestamp: tx.timestamp,
          purpose: tx.type.includes('taken') ? 'taken' : 'deposited',
          portugueseName: tx.animalType
        });
      });
    }

    return snapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Enhance existing transactions with intelligence
   */
  private enhanceTransactions(
    session: any,
    currentIntent: ActivityIntent,
    clusters: ActivityCluster[]
  ): EnhancedTransaction[] {
    const enhanced: EnhancedTransaction[] = [];

    // Enhance plant transactions
    if (session.plantTransactions) {
      session.plantTransactions.forEach((tx: any, index: number) => {
        const cluster = this.findClusterForTimestamp(clusters, tx.timestamp);
        enhanced.push({
          ...tx,
          detectedIntent: cluster?.primaryIntent || currentIntent,
          relatedRecipe: this.findRelatedRecipe(tx.itemName, currentIntent),
          completionStatus: this.determineCompletionStatus(tx, currentIntent),
          efficiency: this.calculateTransactionEfficiency(tx, currentIntent),
          activityCluster: cluster?.clusterId,
          purposes: this.determinePurposes(tx, currentIntent),
          wasteLevel: this.assessWasteLevel(tx, currentIntent),
          timeToComplete: this.calculateTimeToComplete(tx, session.plantTransactions, index)
        });
      });
    }

    // Enhance animal transactions
    if (session.animalTransactions) {
      session.animalTransactions.forEach((tx: any, index: number) => {
        const cluster = this.findClusterForTimestamp(clusters, tx.timestamp);
        enhanced.push({
          ...tx,
          detectedIntent: cluster?.primaryIntent || currentIntent,
          relatedRecipe: undefined, // Animals typically don't directly relate to recipes
          completionStatus: 'completed', // Animal transactions are usually immediate
          efficiency: 0.8, // Default efficiency for animal care
          activityCluster: cluster?.clusterId,
          purposes: ['animal_care', 'resource_collection'],
          wasteLevel: 'none',
          timeToComplete: 5 // Typical time for animal transaction
        });
      });
    }

    return enhanced;
  }

  /**
   * Calculate worker specializations based on activity patterns
   */
  private calculateWorkerSpecializations(transactions: EnhancedTransaction[]): WorkerSpecialization[] {
    const specializations: WorkerSpecialization[] = [];
    const activityCounts = new Map<string, number>();
    const efficiencyTotals = new Map<string, number>();

    // Count activities by type and calculate average efficiency
    transactions.forEach(tx => {
      const activityType = this.categorizeTransactionActivity(tx);
      activityCounts.set(activityType, (activityCounts.get(activityType) || 0) + 1);
      efficiencyTotals.set(activityType,
        (efficiencyTotals.get(activityType) || 0) + (tx.efficiency || 0));
    });

    // Create specializations
    for (const [area, count] of activityCounts.entries()) {
      const averageEfficiency = (efficiencyTotals.get(area) || 0) / count;
      const skillLevel = Math.min(1.0, (count * averageEfficiency) / 10); // Normalize to 0-1

      specializations.push({
        area: area as any,
        skillLevel,
        totalActivities: count,
        averageEfficiency,
        preferredRecipes: this.findPreferredRecipes(transactions, area),
        improvementAreas: averageEfficiency < 0.7 ? [area] : []
      });
    }

    return specializations.sort((a, b) => b.skillLevel - a.skillLevel);
  }

  /**
   * Calculate comprehensive productivity metrics
   */
  private calculateProductivityMetrics(
    transactions: EnhancedTransaction[],
    clusters: ActivityCluster[]
  ): ProductivityMetrics {
    if (!transactions.length) {
      return {
        activitiesPerHour: 0,
        completionRate: 0,
        averageEfficiency: 0,
        resourceUtilizationScore: 0,
        wasteScore: 0,
        specializationScore: 0
      };
    }

    // Calculate time span
    const startTime = new Date(Math.min(...transactions.map(t => new Date(t.timestamp).getTime())));
    const endTime = new Date(Math.max(...transactions.map(t => new Date(t.timestamp).getTime())));
    const hoursSpan = Math.max(1, (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));

    // Activities per hour
    const activitiesPerHour = transactions.length / hoursSpan;

    // Completion rate
    const completedCount = transactions.filter(t => t.completionStatus === 'completed').length;
    const completionRate = completedCount / transactions.length;

    // Average efficiency
    const averageEfficiency = transactions.reduce((sum, t) => sum + (t.efficiency || 0), 0) / transactions.length;

    // Resource utilization (how well materials are used)
    const resourceUtilizationScore = this.calculateResourceUtilization(transactions);

    // Waste score (lower is better)
    const wasteCount = transactions.filter(t => t.wasteLevel && t.wasteLevel !== 'none').length;
    const wasteScore = Math.max(0, 1 - (wasteCount / transactions.length));

    // Specialization score (how focused the worker is)
    const specializationScore = this.calculateSpecializationScore(transactions);

    return {
      activitiesPerHour,
      completionRate,
      averageEfficiency,
      resourceUtilizationScore,
      wasteScore,
      specializationScore
    };
  }

  /**
   * Generate predictive insights about worker's next actions
   */
  private generatePredictiveInsights(
    currentIntent: ActivityIntent,
    clusters: ActivityCluster[],
    transactions: EnhancedTransaction[]
  ): PredictiveInsights {
    const insights: PredictiveInsights = {
      likelyNextActivities: [],
      resourceNeeds: [],
      riskFactors: [],
      recommendations: []
    };

    // Base predictions on current intent
    if (currentIntent.type === 'crafting' && currentIntent.relatedRecipes.length > 0) {
      const recipe = currentIntent.relatedRecipes[0];

      insights.likelyNextActivities = currentIntent.nextExpectedActions;

      // Estimate completion time
      if (recipe.status !== 'complete') {
        const remainingSteps = recipe.missingMaterials.length + 1; // +1 for crafting step
        const avgTimePerStep = 10; // minutes
        const estimatedMinutes = remainingSteps * avgTimePerStep;
        insights.estimatedCompletionTime = new Date(Date.now() + estimatedMinutes * 60000).toISOString();
      }

      // Resource needs
      insights.resourceNeeds = recipe.missingMaterials.map(material => ({
        itemName: material.itemName,
        quantity: material.quantity,
        urgency: recipe.matchPercentage > 0.8 ? 'high' : 'medium'
      }));

      // Risk factors
      if (recipe.excessMaterials.length > 0) {
        insights.riskFactors.push('Material waste detected - took more than needed');
      }
      if (recipe.timeWindow > 30) {
        insights.riskFactors.push('Long gap between material gathering - may forget recipe');
      }
    }

    // Generate recommendations
    insights.recommendations = this.generateRecommendations(currentIntent, clusters, transactions);

    return insights;
  }

  /**
   * Helper methods for calculations
   */
  private findClusterForTimestamp(clusters: ActivityCluster[], timestamp: string): ActivityCluster | undefined {
    const txTime = new Date(timestamp).getTime();
    return clusters.find(cluster => {
      const startTime = new Date(cluster.startTime).getTime();
      const endTime = cluster.endTime ? new Date(cluster.endTime).getTime() : Date.now();
      return txTime >= startTime && txTime <= endTime;
    });
  }

  private findRelatedRecipe(itemName: string, intent: ActivityIntent): string | undefined {
    if (intent.type === 'crafting' && intent.relatedRecipes.length > 0) {
      const recipe = intent.relatedRecipes[0].recipe;
      const hasItem = recipe.requirements.some(req => req.itemName === itemName);
      return hasItem ? recipe.id : undefined;
    }
    return undefined;
  }

  private determineCompletionStatus(tx: any, intent: ActivityIntent): EnhancedTransaction['completionStatus'] {
    if (intent.type === 'crafting' && intent.relatedRecipes.length > 0) {
      const recipe = intent.relatedRecipes[0];
      switch (recipe.status) {
        case 'complete': return 'completed';
        case 'nearly_complete': return 'in_progress';
        case 'in_progress': return 'in_progress';
        case 'just_started': return 'started';
        default: return 'started';
      }
    }
    return 'completed';
  }

  private calculateTransactionEfficiency(tx: any, intent: ActivityIntent): number {
    if (intent.type === 'crafting' && intent.relatedRecipes.length > 0) {
      return intent.relatedRecipes[0].matchPercentage * intent.efficiency;
    }
    return 0.7; // Default efficiency
  }

  private determinePurposes(tx: any, intent: ActivityIntent): string[] {
    const purposes: string[] = [];

    if (intent.type === 'crafting' && intent.relatedRecipes.length > 0) {
      purposes.push(`${intent.relatedRecipes[0].recipe.portugueseName} Production`);
    }

    if (intent.type === 'planting') {
      purposes.push('Crop Production');
    }

    if (intent.type === 'animal_care') {
      purposes.push('Animal Husbandry');
    }

    return purposes.length > 0 ? purposes : ['General Farm Work'];
  }

  private assessWasteLevel(tx: any, intent: ActivityIntent): EnhancedTransaction['wasteLevel'] {
    if (intent.type === 'crafting' && intent.relatedRecipes.length > 0) {
      const recipe = intent.relatedRecipes[0];
      if (recipe.excessMaterials.length > 0) {
        const wasteRatio = recipe.excessMaterials.length / recipe.recipe.requirements.length;
        if (wasteRatio > 0.5) return 'high';
        if (wasteRatio > 0.2) return 'medium';
        return 'low';
      }
    }
    return 'none';
  }

  private calculateTimeToComplete(tx: any, allTransactions: any[], currentIndex: number): number {
    if (currentIndex < allTransactions.length - 1) {
      const currentTime = new Date(tx.timestamp).getTime();
      const nextTime = new Date(allTransactions[currentIndex + 1].timestamp).getTime();
      return Math.max(1, (nextTime - currentTime) / (1000 * 60)); // Minutes
    }
    return 5; // Default time
  }

  private categorizeTransactionActivity(tx: EnhancedTransaction): string {
    if (tx.type.includes('plant') || tx.type.includes('seed')) return 'planting';
    if (tx.type.includes('animal')) return 'animal_care';
    if (tx.type.includes('crafting')) return 'crafting';
    return 'logistics';
  }

  private findPreferredRecipes(transactions: EnhancedTransaction[], area: string): string[] {
    return transactions
      .filter(tx => this.categorizeTransactionActivity(tx) === area && tx.relatedRecipe)
      .map(tx => tx.relatedRecipe!)
      .filter((recipe, index, arr) => arr.indexOf(recipe) === index) // Unique
      .slice(0, 3); // Top 3
  }

  private calculateResourceUtilization(transactions: EnhancedTransaction[]): number {
    const totalTransactions = transactions.length;
    const efficientTransactions = transactions.filter(t => (t.efficiency || 0) > 0.7).length;
    return totalTransactions > 0 ? efficientTransactions / totalTransactions : 0;
  }

  private calculateSpecializationScore(transactions: EnhancedTransaction[]): number {
    const activityCounts = new Map<string, number>();
    transactions.forEach(tx => {
      const activity = this.categorizeTransactionActivity(tx);
      activityCounts.set(activity, (activityCounts.get(activity) || 0) + 1);
    });

    if (activityCounts.size === 0) return 0;

    const total = transactions.length;
    const maxCount = Math.max(...activityCounts.values());
    return maxCount / total; // Higher score means more specialized
  }

  private calculateSessionEfficiency(clusters: ActivityCluster[], transactions: EnhancedTransaction[]): number {
    if (!clusters.length) return 0.5;

    const avgClusterEfficiency = clusters.reduce((sum, c) => sum + c.efficiency, 0) / clusters.length;
    const avgTransactionEfficiency = transactions.reduce((sum, t) => sum + (t.efficiency || 0), 0) / transactions.length;

    return (avgClusterEfficiency + avgTransactionEfficiency) / 2;
  }

  private calculateTotalValueCreated(transactions: EnhancedTransaction[]): number {
    // Simplified value calculation - would be more sophisticated in practice
    return transactions.reduce((total, tx) => {
      if (tx.completionStatus === 'completed') {
        if (tx.amount) return total + tx.amount;
        return total + (tx.quantity * 2.5); // Estimated value per item
      }
      return total;
    }, 0);
  }

  private analyzeTimeSpentByActivity(clusters: ActivityCluster[]): any {
    const timeSpent = {
      planting: 0,
      animalCare: 0,
      crafting: 0,
      logistics: 0,
      idle: 0
    };

    clusters.forEach(cluster => {
      if (!cluster.endTime) return;

      const duration = (new Date(cluster.endTime).getTime() - new Date(cluster.startTime).getTime()) / (1000 * 60);

      switch (cluster.primaryIntent.type) {
        case 'planting':
          timeSpent.planting += duration;
          break;
        case 'animal_care':
          timeSpent.animalCare += duration;
          break;
        case 'crafting':
          timeSpent.crafting += duration;
          break;
        default:
          timeSpent.logistics += duration;
      }
    });

    return timeSpent;
  }

  private extractCompletedGoals(clusters: ActivityCluster[]): string[] {
    return clusters
      .filter(c => c.completionStatus === 'completed')
      .map(c => c.primaryIntent.purpose);
  }

  private extractAbandonedActivities(clusters: ActivityCluster[]): string[] {
    return clusters
      .filter(c => c.completionStatus === 'abandoned')
      .map(c => c.primaryIntent.purpose);
  }

  private calculateErrorCount(transactions: EnhancedTransaction[]): number {
    return transactions.filter(t => t.wasteLevel === 'high' || (t.efficiency || 0) < 0.3).length;
  }

  private calculateInnovationCount(transactions: EnhancedTransaction[]): number {
    // Look for unusual but efficient activity patterns
    return transactions.filter(t => (t.efficiency || 0) > 0.9 && t.purposes?.includes('optimization')).length;
  }

  private identifyNewSkills(transactions: EnhancedTransaction[], specializations: WorkerSpecialization[]): string[] {
    const currentAreas = new Set(specializations.map(s => s.area));
    const transactionAreas = new Set(transactions.map(t => this.categorizeTransactionActivity(t)));

    const newAreas = Array.from(transactionAreas).filter(area => !currentAreas.has(area as any));
    return newAreas.map(area => `Started ${area} activities`);
  }

  private identifyChallenges(clusters: ActivityCluster[]): string[] {
    const challenges: string[] = [];

    const abandonedClusters = clusters.filter(c => c.completionStatus === 'abandoned');
    if (abandonedClusters.length > 0) {
      challenges.push(`${abandonedClusters.length} activities were abandoned`);
    }

    const lowEfficiencyClusters = clusters.filter(c => c.efficiency < 0.5);
    if (lowEfficiencyClusters.length > 0) {
      challenges.push('Low efficiency in some activities');
    }

    return challenges;
  }

  private identifyImprovementOpportunities(metrics: ProductivityMetrics, clusters: ActivityCluster[]): string[] {
    const opportunities: string[] = [];

    if (metrics.completionRate < 0.8) {
      opportunities.push('Focus on completing started activities');
    }

    if (metrics.wasteScore < 0.7) {
      opportunities.push('Reduce material waste by taking only what is needed');
    }

    if (metrics.averageEfficiency < 0.6) {
      opportunities.push('Learn more efficient techniques for common tasks');
    }

    return opportunities;
  }

  private generatePerformanceFlags(metrics: ProductivityMetrics, sessionEfficiency: number): any[] {
    const flags: any[] = [];

    if (sessionEfficiency > 0.8 && metrics.completionRate > 0.9) {
      flags.push('excellent');
    } else if (sessionEfficiency > 0.6 && metrics.completionRate > 0.7) {
      flags.push('good');
    } else if (sessionEfficiency < 0.4 || metrics.completionRate < 0.5) {
      flags.push('needs_attention');
    }

    if (metrics.averageEfficiency < 0.5) {
      flags.push('training_needed');
    }

    return flags;
  }

  private generateRecommendations(
    intent: ActivityIntent,
    clusters: ActivityCluster[],
    transactions: EnhancedTransaction[]
  ): string[] {
    const recommendations: string[] = [];

    if (intent.type === 'crafting' && intent.relatedRecipes.length > 0) {
      const recipe = intent.relatedRecipes[0];
      if (recipe.status === 'nearly_complete') {
        recommendations.push('Complete current recipe - you are almost done');
      }
      if (recipe.excessMaterials.length > 0) {
        recommendations.push('You have excess materials - consider what else you can make');
      }
    }

    const recentErrors = transactions.filter(t => t.wasteLevel === 'high').length;
    if (recentErrors > 2) {
      recommendations.push('Be more careful with material quantities to reduce waste');
    }

    const abandonedCount = clusters.filter(c => c.completionStatus === 'abandoned').length;
    if (abandonedCount > 1) {
      recommendations.push('Try to complete activities you start to improve efficiency');
    }

    return recommendations;
  }
}

export default WorkerActivityClusteringService;