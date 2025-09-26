import { MultiSourceRecipeService, Recipe } from './MultiSourceRecipeService';
import { GlobalWorkerTracker, ItemActivity } from './GlobalWorkerTracker';

export interface RecipeMatch {
  recipe: Recipe;
  confidence: number; // 0-1 confidence score
  matchedIngredients: {
    itemName: string;
    required: number;
    available: number;
    percentage: number;
  }[];
  missingIngredients: {
    itemName: string;
    required: number;
  }[];
  likelihood: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
}

export interface CraftingPrediction {
  workerId: string;
  workerName: string;
  possibleRecipes: RecipeMatch[];
  withdrawalPattern: ItemActivity[];
  timeWindow: number; // minutes
  predictionConfidence: number;
  suggestedAction: 'likely_crafting' | 'stockpiling' | 'trading' | 'farming' | 'unknown';
}

export interface AnomalyDetection {
  workerId: string;
  workerName: string;
  anomalyType: 'excessive_withdrawal' | 'mismatched_recipe' | 'incomplete_crafting' | 'cross_firm_anomaly' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  activities: ItemActivity[];
  timestamp: Date;
  firmInvolved: string[];
}

export class RecipeValidator {
  private static instance: RecipeValidator | null = null;
  private recipeService: MultiSourceRecipeService;
  private globalTracker: GlobalWorkerTracker;

  // Configuration
  private readonly CRAFTING_TIME_WINDOW = 45 * 60 * 1000; // 45 minutes
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.3;
  private readonly ANOMALY_DETECTION_ENABLED = true;

  // Caching for performance
  private recipeCache: Map<string, Recipe[]> = new Map();
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.recipeService = MultiSourceRecipeService.getInstance();
    this.globalTracker = GlobalWorkerTracker.getInstance();
  }

  public static getInstance(): RecipeValidator {
    if (!RecipeValidator.instance) {
      RecipeValidator.instance = new RecipeValidator();
    }
    return RecipeValidator.instance;
  }

  /**
   * Validate if recent item withdrawals match known recipes
   */
  public async validateCraftingIntent(workerId: string, recentWithdrawals: ItemActivity[]): Promise<CraftingPrediction> {
    try {
      console.log(`🔍 RecipeValidator: Analyzing crafting intent for worker ${workerId}`);

      const worker = this.globalTracker.getWorkerProfile(workerId);
      if (!worker) {
        throw new Error(`Worker profile not found: ${workerId}`);
      }

      // Filter withdrawals within crafting time window
      const now = Date.now();
      const relevantWithdrawals = recentWithdrawals.filter(activity =>
        activity.activityType === 'item_removed' &&
        now - activity.timestamp.getTime() <= this.CRAFTING_TIME_WINDOW
      );

      console.log(`📊 RecipeValidator: Found ${relevantWithdrawals.length} relevant withdrawals in time window`);

      // Get all possible recipe matches
      const possibleRecipes = await this.findMatchingRecipes(relevantWithdrawals);

      // Calculate prediction confidence
      const predictionConfidence = this.calculatePredictionConfidence(possibleRecipes, relevantWithdrawals);

      // Determine suggested action
      const suggestedAction = this.determineSuggestedAction(possibleRecipes, relevantWithdrawals, predictionConfidence);

      const prediction: CraftingPrediction = {
        workerId,
        workerName: worker.workerName,
        possibleRecipes,
        withdrawalPattern: relevantWithdrawals,
        timeWindow: Math.round(this.CRAFTING_TIME_WINDOW / (60 * 1000)),
        predictionConfidence,
        suggestedAction
      };

      console.log(`✅ RecipeValidator: Generated prediction with ${possibleRecipes.length} possible recipes, confidence: ${predictionConfidence.toFixed(2)}`);
      return prediction;

    } catch (error) {
      console.error('❌ RecipeValidator: Error validating crafting intent:', error);
      throw error;
    }
  }

  /**
   * Find recipes that match the withdrawn items
   */
  private async findMatchingRecipes(withdrawals: ItemActivity[]): Promise<RecipeMatch[]> {
    const allRecipes = this.getCachedRecipes();
    const matches: RecipeMatch[] = [];

    // Group withdrawals by item name and sum quantities
    const withdrawnItems = new Map<string, number>();
    for (const withdrawal of withdrawals) {
      const normalizedName = this.normalizeItemName(withdrawal.itemName);
      withdrawnItems.set(normalizedName, (withdrawnItems.get(normalizedName) || 0) + withdrawal.quantity);
    }

    for (const recipe of allRecipes) {
      const match = this.calculateRecipeMatch(recipe, withdrawnItems);
      if (match.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
        matches.push(match);
      }
    }

    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate how well withdrawn items match a recipe
   */
  private calculateRecipeMatch(recipe: Recipe, withdrawnItems: Map<string, number>): RecipeMatch {
    const matchedIngredients: RecipeMatch['matchedIngredients'] = [];
    const missingIngredients: RecipeMatch['missingIngredients'] = [];
    let totalMatched = 0;
    let totalRequired = recipe.requirements.length;

    for (const requirement of recipe.requirements) {
      const normalizedReqName = this.normalizeItemName(requirement.itemName);
      const normalizedReqNamePt = this.normalizeItemName(requirement.portugueseName);

      // Check both English and Portuguese names
      const availableEn = withdrawnItems.get(normalizedReqName) || 0;
      const availablePt = withdrawnItems.get(normalizedReqNamePt) || 0;
      const available = Math.max(availableEn, availablePt);

      if (available > 0) {
        const percentage = Math.min(available / requirement.quantity, 1);
        matchedIngredients.push({
          itemName: requirement.itemName,
          required: requirement.quantity,
          available,
          percentage
        });
        totalMatched += percentage;
      } else {
        missingIngredients.push({
          itemName: requirement.itemName,
          required: requirement.quantity
        });
      }
    }

    // Calculate confidence score
    const confidence = totalRequired > 0 ? totalMatched / totalRequired : 0;

    // Determine likelihood
    let likelihood: RecipeMatch['likelihood'];
    if (confidence >= 0.9) likelihood = 'very_high';
    else if (confidence >= 0.7) likelihood = 'high';
    else if (confidence >= 0.5) likelihood = 'medium';
    else if (confidence >= 0.3) likelihood = 'low';
    else likelihood = 'very_low';

    return {
      recipe,
      confidence,
      matchedIngredients,
      missingIngredients,
      likelihood
    };
  }

  /**
   * Calculate overall prediction confidence
   */
  private calculatePredictionConfidence(matches: RecipeMatch[], withdrawals: ItemActivity[]): number {
    if (matches.length === 0) return 0;

    const topMatch = matches[0];
    let baseConfidence = topMatch.confidence;

    // Boost confidence if there are multiple good matches (suggests intentional crafting)
    const goodMatches = matches.filter(m => m.confidence >= 0.6);
    if (goodMatches.length > 1) {
      baseConfidence += 0.1;
    }

    // Boost confidence if withdrawals are recent and concentrated
    const timeSpread = this.calculateTimeSpread(withdrawals);
    if (timeSpread < 10 * 60 * 1000) { // Within 10 minutes
      baseConfidence += 0.15;
    }

    // Penalize if too many excess items withdrawn (might be stockpiling)
    const excessRatio = this.calculateExcessRatio(matches[0], withdrawals);
    if (excessRatio > 2) {
      baseConfidence -= 0.2;
    }

    return Math.max(0, Math.min(1, baseConfidence));
  }

  /**
   * Determine suggested action based on analysis
   */
  private determineSuggestedAction(_matches: RecipeMatch[], withdrawals: ItemActivity[], confidence: number): CraftingPrediction['suggestedAction'] {
    if (confidence >= 0.8) {
      return 'likely_crafting';
    }

    if (confidence >= 0.5) {
      // Check if items are commonly used for farming
      const farmingItems = withdrawals.filter(w =>
        w.itemName.toLowerCase().includes('seed') ||
        w.itemName.toLowerCase().includes('semente')
      );

      if (farmingItems.length > withdrawals.length * 0.7) {
        return 'farming';
      }

      return 'likely_crafting';
    }

    // Check for cross-firm transfers
    const firmIds = new Set(withdrawals.map(w => w.firmId));
    if (firmIds.size > 1) {
      return 'trading';
    }

    // Check for excessive quantities (might be stockpiling)
    const avgQuantity = withdrawals.reduce((sum, w) => sum + w.quantity, 0) / withdrawals.length;
    if (avgQuantity > 50) {
      return 'stockpiling';
    }

    return 'unknown';
  }

  /**
   * Detect anomalies in worker behavior
   */
  public detectAnomalies(workerId: string): AnomalyDetection[] {
    if (!this.ANOMALY_DETECTION_ENABLED) return [];

    const anomalies: AnomalyDetection[] = [];
    const worker = this.globalTracker.getWorkerProfile(workerId);

    if (!worker) return anomalies;

    // 1. Excessive withdrawal detection
    const recentActivities = worker.activities.filter(a =>
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const withdrawals = recentActivities.filter(a => a.activityType === 'item_removed');
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.quantity, 0);

    if (totalWithdrawn > 1000) { // Configurable threshold
      anomalies.push({
        workerId,
        workerName: worker.workerName,
        anomalyType: 'excessive_withdrawal',
        severity: 'medium',
        description: `Worker withdrew ${totalWithdrawn} items in 24 hours, significantly above normal`,
        activities: withdrawals,
        timestamp: new Date(),
        firmInvolved: [...new Set(withdrawals.map(w => w.firmName))]
      });
    }

    // 2. Incomplete crafting detection
    const activeAttempts = worker.recipeAttempts.filter(a => a.status === 'in_progress');
    for (const attempt of activeAttempts) {
      const timeSinceStart = Date.now() - attempt.startTime.getTime();
      if (timeSinceStart > 2 * 60 * 60 * 1000) { // 2 hours
        anomalies.push({
          workerId,
          workerName: worker.workerName,
          anomalyType: 'incomplete_crafting',
          severity: 'low',
          description: `Recipe attempt "${attempt.recipeName}" started ${Math.round(timeSinceStart / (60 * 1000))} minutes ago without completion`,
          activities: [], // Could link to related activities
          timestamp: new Date(),
          firmInvolved: [attempt.firmId]
        });
      }
    }

    // 3. Cross-firm anomaly detection
    const recentTransfers = worker.crossFirmTransfers.filter(t =>
      Date.now() - t.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    if (recentTransfers.length > 5) { // Too many transfers
      anomalies.push({
        workerId,
        workerName: worker.workerName,
        anomalyType: 'cross_firm_anomaly',
        severity: 'medium',
        description: `${recentTransfers.length} cross-firm transfers in the last hour - possible item distribution issue`,
        activities: recentTransfers.map(t => t.sourceActivity).concat(recentTransfers.map(t => t.destinationActivity)),
        timestamp: new Date(),
        firmInvolved: [...new Set(recentTransfers.flatMap(t => [t.sourceActivity.firmName, t.destinationActivity.firmName]))]
      });
    }

    return anomalies;
  }

  /**
   * Get comprehensive activity analysis for a worker
   */
  public analyzeWorkerBehavior(workerId: string): {
    craftingSkill: number;
    efficiency: number;
    specializations: string[];
    riskFactors: string[];
    recommendations: string[];
  } {
    const worker = this.globalTracker.getWorkerProfile(workerId);
    if (!worker) {
      return {
        craftingSkill: 0,
        efficiency: 0,
        specializations: [],
        riskFactors: ['Worker profile not found'],
        recommendations: ['Register worker activity to begin analysis']
      };
    }

    // Calculate crafting skill based on successful recipe completions
    const completedRecipes = worker.recipeAttempts.filter(a => a.status === 'completed');
    const totalAttempts = worker.recipeAttempts.length;
    const craftingSkill = totalAttempts > 0 ? completedRecipes.length / totalAttempts : 0;

    // Calculate efficiency based on resource usage
    const efficiency = worker.performanceMetrics.averageEfficiency;

    // Identify specializations (top item categories by activity)
    const categoryActivity = new Map<string, number>();
    for (const activity of worker.activities) {
      categoryActivity.set(activity.itemCategory, (categoryActivity.get(activity.itemCategory) || 0) + 1);
    }

    const specializations = Array.from(categoryActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    // Identify risk factors
    const riskFactors: string[] = [];
    if (worker.performanceMetrics.resourceWasteRate > 0.3) {
      riskFactors.push('High resource waste rate');
    }
    if (worker.performanceMetrics.crossFirmTransfers > worker.performanceMetrics.totalActivities * 0.5) {
      riskFactors.push('Excessive cross-firm transfers');
    }
    if (craftingSkill < 0.5 && totalAttempts > 5) {
      riskFactors.push('Low crafting success rate');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (efficiency < 0.6) {
      recommendations.push('Focus on completing started recipes before beginning new ones');
    }
    if (worker.performanceMetrics.crossFirmTransfers > 10) {
      recommendations.push('Consider consolidating resources in fewer firms');
    }
    if (specializations.length < 2) {
      recommendations.push('Diversify activity types to improve overall utility');
    }

    return {
      craftingSkill,
      efficiency,
      specializations,
      riskFactors,
      recommendations
    };
  }

  // Helper methods

  private getCachedRecipes(): Recipe[] {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.CACHE_DURATION) {
      this.recipeCache.clear();
      this.lastCacheUpdate = now;
    }

    const cacheKey = 'all_recipes';
    if (!this.recipeCache.has(cacheKey)) {
      const recipes = this.recipeService.getAllRecipes();
      this.recipeCache.set(cacheKey, recipes);
    }

    return this.recipeCache.get(cacheKey) || [];
  }

  private normalizeItemName(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  private calculateTimeSpread(activities: ItemActivity[]): number {
    if (activities.length < 2) return 0;

    const times = activities.map(a => a.timestamp.getTime()).sort();
    return times[times.length - 1] - times[0];
  }

  private calculateExcessRatio(match: RecipeMatch, withdrawals: ItemActivity[]): number {
    if (match.matchedIngredients.length === 0) return 0;

    const totalRequired = match.matchedIngredients.reduce((sum, ing) => sum + ing.required, 0);
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.quantity, 0);

    return totalRequired > 0 ? totalWithdrawn / totalRequired : 0;
  }
}