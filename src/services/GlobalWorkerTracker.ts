import { MultiSourceRecipeService } from './MultiSourceRecipeService';
import { RealTimeMonitoringService } from './RealTimeMonitoringService';

// Enhanced activity types for comprehensive tracking
export interface ItemActivity {
  id: string;
  workerId: string;
  workerName: string;
  firmId: string;
  firmName: string;
  activityType: 'item_added' | 'item_removed';
  itemName: string;
  quantity: number;
  timestamp: Date;
  originalMessage: string;

  // Enhanced categorization
  itemCategory: 'material' | 'plant' | 'seed' | 'animal' | 'tool' | 'food' | 'crafted_item' | 'box' | 'other';

  // Purpose detection
  detectedPurpose: 'crafting' | 'farming' | 'trading' | 'storage' | 'unknown';
  relatedRecipes: string[]; // Recipe IDs that this item could be used for

  // Cross-firm tracking
  sourceFirm?: string; // If transferred from another firm
  destinationFirm?: string; // If transferred to another firm
}

export interface CrossFirmTransfer {
  id: string;
  workerId: string;
  workerName: string;
  sourceActivity: ItemActivity;
  destinationActivity: ItemActivity;
  itemsTransferred: {
    itemName: string;
    quantity: number;
  }[];
  detectedPurpose: string;
  timeWindow: number; // Minutes between source and destination
  timestamp: Date;
}

export interface RecipeAttempt {
  id: string;
  workerId: string;
  workerName: string;
  recipeId: string;
  recipeName: string;
  firmId: string;

  // Tracking ingredients
  ingredientsWithdrawn: {
    itemName: string;
    quantityNeeded: number;
    quantityWithdrawn: number;
    timestamp: Date;
  }[];

  // Status tracking
  status: 'in_progress' | 'completed' | 'abandoned' | 'failed';
  startTime: Date;
  completionTime?: Date;
  efficiency: number; // Percentage of ingredients actually used

  // Output tracking
  expectedOutput?: {
    itemName: string;
    quantity: number;
  };
  actualOutput?: {
    itemName: string;
    quantity: number;
    timestamp: Date;
  };
}

export interface WorkerGlobalProfile {
  workerId: string;
  workerName: string;

  // Activity timeline across all firms
  activities: ItemActivity[];
  crossFirmTransfers: CrossFirmTransfer[];
  recipeAttempts: RecipeAttempt[];

  // Analytics
  firmContributions: {
    [firmId: string]: {
      itemsAdded: number;
      itemsRemoved: number;
      recipesCompleted: number;
      efficiency: number;
    };
  };

  specializations: {
    category: string;
    proficiency: number;
    completionRate: number;
  }[];

  performanceMetrics: {
    totalActivities: number;
    crossFirmTransfers: number;
    craftingSuccessRate: number;
    resourceWasteRate: number;
    averageEfficiency: number;
  };
}

export class GlobalWorkerTracker {
  private static instance: GlobalWorkerTracker | null = null;
  private recipeService: MultiSourceRecipeService;
  private realTimeMonitoring: RealTimeMonitoringService | null = null;

  // Data storage
  private activities: Map<string, ItemActivity> = new Map(); // activityId -> activity
  private workerProfiles: Map<string, WorkerGlobalProfile> = new Map(); // workerId -> profile
  private activeRecipeAttempts: Map<string, RecipeAttempt[]> = new Map(); // workerId -> attempts
  private crossFirmTransfers: Map<string, CrossFirmTransfer> = new Map(); // transferId -> transfer

  // Configuration
  private readonly RECIPE_ATTEMPT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly CROSS_FIRM_DETECTION_WINDOW = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.recipeService = MultiSourceRecipeService.getInstance();

    // Initialize real-time monitoring
    setTimeout(() => {
      this.realTimeMonitoring = RealTimeMonitoringService.getInstance();
      console.log('🔥 GlobalWorkerTracker: Real-time monitoring initialized');
    }, 1000); // Delay to avoid circular dependency
  }

  public static getInstance(): GlobalWorkerTracker {
    if (!GlobalWorkerTracker.instance) {
      GlobalWorkerTracker.instance = new GlobalWorkerTracker();
    }
    return GlobalWorkerTracker.instance;
  }

  /**
   * Track a new item activity (add/remove) from any firm
   */
  public trackItemActivity(activity: Omit<ItemActivity, 'id' | 'itemCategory' | 'detectedPurpose' | 'relatedRecipes'>): void {
    // Generate activity ID
    const activityId = `${activity.workerId}_${activity.firmId}_${Date.now()}`;

    // Enhanced activity with analysis
    const enhancedActivity: ItemActivity = {
      ...activity,
      id: activityId,
      itemCategory: this.categorizeItem(activity.itemName),
      detectedPurpose: this.detectPurpose(activity),
      relatedRecipes: this.findRelatedRecipes(activity.itemName)
    };

    // Store activity
    this.activities.set(activityId, enhancedActivity);

    // Update worker profile
    this.updateWorkerProfile(enhancedActivity);

    // Notify real-time monitoring
    if (this.realTimeMonitoring) {
      this.realTimeMonitoring.trackActivity(enhancedActivity);
    }

    // Check for recipe attempts
    if (enhancedActivity.activityType === 'item_removed') {
      this.checkForRecipeAttempt(enhancedActivity);
    }

    // Check for cross-firm transfers
    this.detectCrossFirmTransfer(enhancedActivity);

    console.log(`🎯 GlobalWorkerTracker: Tracked ${activity.activityType} - ${activity.workerName} ${activity.activityType === 'item_added' ? 'added' : 'removed'} ${activity.quantity}x ${activity.itemName} in ${activity.firmName}`);
  }

  /**
   * Categorize items into enhanced categories
   */
  private categorizeItem(itemName: string): ItemActivity['itemCategory'] {
    const name = itemName.toLowerCase();

    // Materials
    if (name.includes('wood') || name.includes('madeira') ||
        name.includes('metal') || name.includes('ferro') ||
        name.includes('leather') || name.includes('couro') ||
        name.includes('stone') || name.includes('pedra') ||
        name.includes('cascalho') || name.includes('carvao')) {
      return 'material';
    }

    // Plants
    if (name.includes('junco') || name.includes('trigo') || name.includes('milho') ||
        name.includes('bulrush') || name.includes('wheat') || name.includes('corn') ||
        name.includes('milk_weed')) {
      return 'plant';
    }

    // Seeds
    if (name.includes('seed') || name.includes('semente')) {
      return 'seed';
    }

    // Animals
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') ||
        name.includes('vaca') || name.includes('porco') || name.includes('galinha')) {
      return 'animal';
    }

    // Tools
    if (name.includes('hoe') || name.includes('enxada') ||
        name.includes('wateringcan') || name.includes('regador') ||
        name.includes('hammer') || name.includes('martelo') ||
        name.includes('saw') || name.includes('serra')) {
      return 'tool';
    }

    // Food
    if (name.includes('bread') || name.includes('pao') ||
        name.includes('food') || name.includes('comida') ||
        name.includes('racao') || name.includes('feed')) {
      return 'food';
    }

    // Boxes
    if (name.includes('caixa') || name.includes('box')) {
      return 'box';
    }

    // Crafted items (more specific detection needed)
    const craftedItems = ['bandage', 'medicine', 'potion', 'weapon', 'gear'];
    if (craftedItems.some(item => name.includes(item))) {
      return 'crafted_item';
    }

    return 'other';
  }

  /**
   * Enhanced purpose detection using smart analysis
   */
  private detectPurpose(activity: Omit<ItemActivity, 'id' | 'itemCategory' | 'detectedPurpose' | 'relatedRecipes'>): ItemActivity['detectedPurpose'] {
    // Check if item is part of any recipes
    const relatedRecipes = this.findRelatedRecipes(activity.itemName);

    if (activity.activityType === 'item_removed') {
      // Enhanced crafting detection
      if (relatedRecipes.length > 0) {
        // Check recent withdrawals to see if this looks like recipe preparation
        const recentWithdrawals = this.getRecentWithdrawals(activity.workerId, 30); // 30 minutes
        const recipeConfidence = this.calculateCraftingConfidence(recentWithdrawals, relatedRecipes);

        if (recipeConfidence > 0.6) {
          return 'crafting';
        }
      }

      // Farming detection (seeds)
      if (activity.itemName.toLowerCase().includes('seed') || activity.itemName.toLowerCase().includes('semente')) {
        return 'farming';
      }

      // Trading detection (cross-firm context)
      const recentActivities = Array.from(this.activities.values()).filter(a => a.workerId === activity.workerId);
      const hasRecentCrossFirmActivity = recentActivities.some(a =>
        a.firmId !== activity.firmId &&
        Math.abs(a.timestamp.getTime() - activity.timestamp.getTime()) < 10 * 60 * 1000
      );

      if (hasRecentCrossFirmActivity) {
        return 'trading';
      }

      // Storage detection (large quantities or storage-related items)
      if (activity.quantity > 100 || activity.itemName.toLowerCase().includes('box') || activity.itemName.toLowerCase().includes('caixa')) {
        return 'storage';
      }
    }

    return 'unknown';
  }

  /**
   * Find recipes that use a specific item
   */
  private findRelatedRecipes(itemName: string): string[] {
    const allRecipes = this.recipeService.getAllRecipes();
    const relatedRecipes: string[] = [];

    for (const recipe of allRecipes) {
      for (const requirement of recipe.requirements) {
        if (requirement.itemName.toLowerCase() === itemName.toLowerCase() ||
            requirement.portugueseName.toLowerCase() === itemName.toLowerCase()) {
          relatedRecipes.push(recipe.id);
          break;
        }
      }
    }

    return relatedRecipes;
  }

  /**
   * Update worker profile with new activity
   */
  private updateWorkerProfile(activity: ItemActivity): void {
    let profile = this.workerProfiles.get(activity.workerId);

    if (!profile) {
      profile = {
        workerId: activity.workerId,
        workerName: activity.workerName,
        activities: [],
        crossFirmTransfers: [],
        recipeAttempts: [],
        firmContributions: {},
        specializations: [],
        performanceMetrics: {
          totalActivities: 0,
          crossFirmTransfers: 0,
          craftingSuccessRate: 0,
          resourceWasteRate: 0,
          averageEfficiency: 0
        }
      };
    }

    // Add activity
    profile.activities.push(activity);

    // Update firm contributions
    if (!profile.firmContributions[activity.firmId]) {
      profile.firmContributions[activity.firmId] = {
        itemsAdded: 0,
        itemsRemoved: 0,
        recipesCompleted: 0,
        efficiency: 0
      };
    }

    if (activity.activityType === 'item_added') {
      profile.firmContributions[activity.firmId].itemsAdded += activity.quantity;
    } else {
      profile.firmContributions[activity.firmId].itemsRemoved += activity.quantity;
    }

    // Update performance metrics
    profile.performanceMetrics.totalActivities++;

    this.workerProfiles.set(activity.workerId, profile);
  }

  /**
   * Check if an item removal indicates a recipe attempt
   */
  private checkForRecipeAttempt(activity: ItemActivity): void {
    const relatedRecipes = this.recipeService.getAllRecipes().filter(recipe =>
      recipe.requirements.some(req =>
        req.itemName.toLowerCase() === activity.itemName.toLowerCase() ||
        req.portugueseName.toLowerCase() === activity.itemName.toLowerCase()
      )
    );

    if (relatedRecipes.length === 0) return;

    // Check if worker has active recipe attempts
    let attempts = this.activeRecipeAttempts.get(activity.workerId) || [];

    for (const recipe of relatedRecipes) {
      // Check if there's an existing attempt for this recipe
      let existingAttempt = attempts.find(a =>
        a.recipeId === recipe.id &&
        a.status === 'in_progress' &&
        Date.now() - a.startTime.getTime() < this.RECIPE_ATTEMPT_TIMEOUT
      );

      if (!existingAttempt) {
        // Create new recipe attempt
        existingAttempt = {
          id: `${activity.workerId}_${recipe.id}_${Date.now()}`,
          workerId: activity.workerId,
          workerName: activity.workerName,
          recipeId: recipe.id,
          recipeName: recipe.name,
          firmId: activity.firmId,
          ingredientsWithdrawn: [],
          status: 'in_progress',
          startTime: new Date(),
          efficiency: 0
        };
        attempts.push(existingAttempt);

        // Notify real-time monitoring of new recipe attempt
        if (this.realTimeMonitoring) {
          this.realTimeMonitoring.trackRecipeAttempt(existingAttempt);
        }
      }

      // Add ingredient withdrawal
      const requirement = recipe.requirements.find(req =>
        req.itemName.toLowerCase() === activity.itemName.toLowerCase() ||
        req.portugueseName.toLowerCase() === activity.itemName.toLowerCase()
      );

      if (requirement) {
        existingAttempt.ingredientsWithdrawn.push({
          itemName: activity.itemName,
          quantityNeeded: requirement.quantity,
          quantityWithdrawn: activity.quantity,
          timestamp: activity.timestamp
        });
      }
    }

    this.activeRecipeAttempts.set(activity.workerId, attempts);
  }

  /**
   * Detect cross-firm transfers
   */
  private detectCrossFirmTransfer(activity: ItemActivity): void {
    if (activity.activityType !== 'item_added') return;

    // Look for recent item removals of the same item from other firms by the same worker
    const recentActivities = Array.from(this.activities.values())
      .filter(a =>
        a.workerId === activity.workerId &&
        a.activityType === 'item_removed' &&
        a.itemName === activity.itemName &&
        a.firmId !== activity.firmId &&
        activity.timestamp.getTime() - a.timestamp.getTime() <= this.CROSS_FIRM_DETECTION_WINDOW &&
        activity.timestamp.getTime() > a.timestamp.getTime()
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (recentActivities.length > 0) {
      const sourceActivity = recentActivities[0];

      const transferId = `${sourceActivity.id}_to_${activity.id}`;
      const transfer: CrossFirmTransfer = {
        id: transferId,
        workerId: activity.workerId,
        workerName: activity.workerName,
        sourceActivity,
        destinationActivity: activity,
        itemsTransferred: [{
          itemName: activity.itemName,
          quantity: Math.min(activity.quantity, sourceActivity.quantity)
        }],
        detectedPurpose: this.detectTransferPurpose(sourceActivity, activity),
        timeWindow: Math.round((activity.timestamp.getTime() - sourceActivity.timestamp.getTime()) / (1000 * 60)),
        timestamp: activity.timestamp
      };

      this.crossFirmTransfers.set(transferId, transfer);

      // Update worker profile
      const profile = this.workerProfiles.get(activity.workerId);
      if (profile) {
        profile.crossFirmTransfers.push(transfer);
        profile.performanceMetrics.crossFirmTransfers++;
      }

      // Notify real-time monitoring
      if (this.realTimeMonitoring) {
        this.realTimeMonitoring.trackCrossFirmTransfer(transfer);
      }

      console.log(`🔄 CrossFirmTransfer detected: ${activity.workerName} moved ${activity.itemName} from ${sourceActivity.firmName} to ${activity.firmName} (${transfer.detectedPurpose})`);
    }
  }

  /**
   * Detect the purpose of a cross-firm transfer
   */
  private detectTransferPurpose(source: ItemActivity, destination: ItemActivity): string {
    // Business logic for transfer purposes
    if (source.firmName === 'Fazenda' && destination.firmName === 'Bercario') {
      return 'Animal care supplies';
    }
    if (source.firmName === 'Fazenda' && destination.firmName === 'Veterinaria') {
      return 'Medical supplies';
    }
    if (destination.firmName === 'Armaria') {
      return 'Crafting materials';
    }

    return 'Cross-firm resource sharing';
  }

  /**
   * Get comprehensive worker profile
   */
  public getWorkerProfile(workerId: string): WorkerGlobalProfile | null {
    return this.workerProfiles.get(workerId) || null;
  }

  /**
   * Get all tracked activities for a worker
   */
  public getWorkerActivities(workerId: string): ItemActivity[] {
    return Array.from(this.activities.values())
      .filter(a => a.workerId === workerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get cross-firm transfers for a worker
   */
  public getWorkerCrossFirmTransfers(workerId: string): CrossFirmTransfer[] {
    return Array.from(this.crossFirmTransfers.values())
      .filter(t => t.workerId === workerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get active recipe attempts for a worker
   */
  public getWorkerRecipeAttempts(workerId: string): RecipeAttempt[] {
    return this.activeRecipeAttempts.get(workerId) || [];
  }

  /**
   * Get global analytics
   */
  public getGlobalAnalytics() {
    return {
      totalActivities: this.activities.size,
      totalWorkers: this.workerProfiles.size,
      totalCrossFirmTransfers: this.crossFirmTransfers.size,
      activeRecipeAttempts: Array.from(this.activeRecipeAttempts.values()).flat().filter(a => a.status === 'in_progress').length,
      firmActivity: this.getFirmActivitySummary()
    };
  }

  private getFirmActivitySummary() {
    const summary: { [firmId: string]: { adds: number; removes: number; transfers: number } } = {};

    for (const activity of this.activities.values()) {
      if (!summary[activity.firmId]) {
        summary[activity.firmId] = { adds: 0, removes: 0, transfers: 0 };
      }

      if (activity.activityType === 'item_added') {
        summary[activity.firmId].adds++;
      } else {
        summary[activity.firmId].removes++;
      }
    }

    for (const transfer of this.crossFirmTransfers.values()) {
      if (!summary[transfer.sourceActivity.firmId]) {
        summary[transfer.sourceActivity.firmId] = { adds: 0, removes: 0, transfers: 0 };
      }
      summary[transfer.sourceActivity.firmId].transfers++;
    }

    return summary;
  }

  /**
   * Get recent withdrawals for a worker within specified minutes
   */
  private getRecentWithdrawals(workerId: string, minutes: number): ItemActivity[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return Array.from(this.activities.values())
      .filter(activity =>
        activity.workerId === workerId &&
        activity.activityType === 'item_removed' &&
        activity.timestamp.getTime() >= cutoffTime
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Calculate crafting confidence based on recent withdrawals and recipes
   */
  private calculateCraftingConfidence(withdrawals: ItemActivity[], relatedRecipeIds: string[]): number {
    if (withdrawals.length === 0 || relatedRecipeIds.length === 0) return 0;

    const allRecipes = this.recipeService.getAllRecipes();
    let bestConfidence = 0;

    for (const recipeId of relatedRecipeIds) {
      const recipe = allRecipes.find(r => r.id === recipeId);
      if (!recipe) continue;

      // Count how many recipe ingredients were recently withdrawn
      const withdrawnItems = new Map<string, number>();
      for (const withdrawal of withdrawals) {
        const normalizedName = withdrawal.itemName.toLowerCase().trim();
        withdrawnItems.set(normalizedName, (withdrawnItems.get(normalizedName) || 0) + withdrawal.quantity);
      }

      let matchedIngredients = 0;
      let totalIngredients = recipe.requirements.length;

      for (const requirement of recipe.requirements) {
        const reqNameEn = requirement.itemName.toLowerCase().trim();
        const reqNamePt = requirement.portugueseName.toLowerCase().trim();

        const withdrawnEn = withdrawnItems.get(reqNameEn) || 0;
        const withdrawnPt = withdrawnItems.get(reqNamePt) || 0;
        const totalWithdrawn = Math.max(withdrawnEn, withdrawnPt);

        if (totalWithdrawn >= requirement.quantity * 0.5) { // At least 50% of required amount
          matchedIngredients++;
        }
      }

      const recipeConfidence = totalIngredients > 0 ? matchedIngredients / totalIngredients : 0;
      bestConfidence = Math.max(bestConfidence, recipeConfidence);
    }

    return bestConfidence;
  }

  /**
   * Get smart analytics including purpose detection accuracy
   */
  public getSmartAnalytics() {
    const basicAnalytics = this.getGlobalAnalytics();

    // Calculate purpose detection accuracy
    const allActivities = Array.from(this.activities.values());
    const purposeCounts = new Map<string, number>();

    for (const activity of allActivities) {
      purposeCounts.set(activity.detectedPurpose, (purposeCounts.get(activity.detectedPurpose) || 0) + 1);
    }

    // Calculate crafting success rates
    const allAttempts = Array.from(this.activeRecipeAttempts.values()).flat();
    const completedAttempts = allAttempts.filter(a => a.status === 'completed').length;
    const totalAttempts = allAttempts.length;
    const craftingSuccessRate = totalAttempts > 0 ? completedAttempts / totalAttempts : 0;

    return {
      ...basicAnalytics,
      smartAnalytics: {
        purposeDetection: Object.fromEntries(purposeCounts),
        craftingSuccessRate: craftingSuccessRate,
        averageRecipeAttemptDuration: this.calculateAverageRecipeAttemptDuration(),
        topWorkersByActivity: this.getTopWorkersByActivity(10),
        crossFirmEfficiency: this.calculateCrossFirmEfficiency()
      }
    };
  }

  private calculateAverageRecipeAttemptDuration(): number {
    const completedAttempts = Array.from(this.activeRecipeAttempts.values())
      .flat()
      .filter(a => a.status === 'completed' && a.completionTime);

    if (completedAttempts.length === 0) return 0;

    const totalDuration = completedAttempts.reduce((sum, attempt) => {
      const duration = attempt.completionTime!.getTime() - attempt.startTime.getTime();
      return sum + duration;
    }, 0);

    return totalDuration / completedAttempts.length / (60 * 1000); // Return in minutes
  }

  private getTopWorkersByActivity(limit: number): Array<{workerId: string; workerName: string; activityCount: number}> {
    return Array.from(this.workerProfiles.values())
      .map(profile => ({
        workerId: profile.workerId,
        workerName: profile.workerName,
        activityCount: profile.activities.length
      }))
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, limit);
  }

  private calculateCrossFirmEfficiency(): number {
    const allTransfers = Array.from(this.crossFirmTransfers.values());
    if (allTransfers.length === 0) return 0;

    // Calculate efficiency based on time window (shorter = more efficient)
    const averageTimeWindow = allTransfers.reduce((sum, transfer) => sum + transfer.timeWindow, 0) / allTransfers.length;

    // Convert to efficiency score (lower time = higher efficiency)
    return Math.max(0, 1 - (averageTimeWindow / 60)); // Normalize against 60 minutes
  }

  /**
   * Sync with WorkerActivityService data
   * This method reads active worker sessions and converts them to GlobalWorkerTracker activities
   */
  public syncWithWorkerActivityService(): void {
    try {
      const fs = require('fs');
      const path = require('path');

      // Read active worker sessions
      const activeSessionsPath = path.join(process.cwd(), 'data', 'worker-sessions', 'active-sessions.json');

      if (!fs.existsSync(activeSessionsPath)) {
        console.log('⚠️ GlobalWorkerTracker: No active sessions file found');
        return;
      }

      const activeSessionsData = JSON.parse(fs.readFileSync(activeSessionsPath, 'utf8'));
      let syncedActivities = 0;

      // Process each active session
      for (const sessionData of Object.values(activeSessionsData)) {
        const session = sessionData as any;

        // Process plant transactions (deposits = items added)
        if (session.plantTransactions) {
          for (const transaction of session.plantTransactions) {
            if (transaction.type === 'plant_deposited') {
              const activityId = `${session.workerId}_fazenda_${transaction.transactionId}`;

              // Skip if we already have this activity
              if (this.activities.has(activityId)) continue;

              this.trackItemActivity({
                workerId: session.workerId,
                workerName: session.workerName,
                firmId: 'fazenda-cabra-da-peste',
                firmName: 'Fazenda Cabra da Peste',
                activityType: 'item_added',
                itemName: transaction.itemName || 'Unknown Plant',
                quantity: transaction.quantity || 0,
                timestamp: new Date(transaction.timestamp),
                originalMessage: `${session.workerName} depositou ${transaction.quantity} ${transaction.itemName}`
              });

              syncedActivities++;
            }
          }
        }

        // Process animal transactions (deliveries = animals sold)
        if (session.animalTransactions) {
          for (const transaction of session.animalTransactions) {
            if (transaction.type === 'delivery_completed') {
              const activityId = `${session.workerId}_fazenda_${transaction.transactionId}`;

              // Skip if we already have this activity
              if (this.activities.has(activityId)) continue;

              this.trackItemActivity({
                workerId: session.workerId,
                workerName: session.workerName,
                firmId: 'fazenda-cabra-da-peste',
                firmName: 'Fazenda Cabra da Peste',
                activityType: 'item_removed', // Animals sold = removed from inventory
                itemName: transaction.animalType || 'Unknown Animal',
                quantity: 1, // Usually 1 animal per delivery
                timestamp: new Date(transaction.timestamp),
                originalMessage: `${session.workerName} vendeu ${transaction.animalType} no matadouro por $${transaction.amount}`
              });

              syncedActivities++;
            }
          }
        }
      }

      if (syncedActivities > 0) {
        console.log(`🔄 GlobalWorkerTracker: Synced ${syncedActivities} new activities from WorkerActivityService`);
      }

    } catch (error) {
      console.error('❌ GlobalWorkerTracker: Error syncing with WorkerActivityService:', error);
    }
  }

  /**
   * Get enriched worker data combining GlobalWorkerTracker and WorkerActivityService
   */
  public getEnrichedWorkerData() {
    // First sync with latest WorkerActivityService data
    this.syncWithWorkerActivityService();

    // Return enriched analytics
    return {
      profiles: Array.from(this.workerProfiles.values()),
      analytics: this.getSmartAnalytics(),
      lastSync: new Date().toISOString()
    };
  }
}