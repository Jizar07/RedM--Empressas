import { MultiSourceRecipeService, Recipe, Material } from './MultiSourceRecipeService';
import ItemTranslationService from './ItemTranslationService';

export interface ActivityIntent {
  type: 'crafting' | 'planting' | 'animal_care' | 'maintenance' | 'unknown';
  confidence: 'high' | 'medium' | 'low' | 'none';
  purpose: string;
  relatedRecipes: RecipeMatch[];
  nextExpectedActions: string[];
  efficiency: number; // 0-1 score based on how optimal the material taking is
}

export interface RecipeMatch {
  recipe: Recipe;
  matchPercentage: number; // How much of the recipe materials were taken
  missingMaterials: Material[];
  excessMaterials: { itemName: string; excess: number; portugueseName: string }[];
  timeWindow: number; // Minutes since first material was taken
  status: 'just_started' | 'in_progress' | 'nearly_complete' | 'complete' | 'over_gathered';
}

export interface WorkerInventorySnapshot {
  itemName: string;
  quantity: number;
  timestamp: string;
  purpose?: 'taken' | 'deposited' | 'crafted';
  portugueseName: string;
}

export interface ActivityCluster {
  clusterId: string;
  startTime: string;
  endTime?: string;
  primaryIntent: ActivityIntent;
  relatedActivities: string[]; // Transaction IDs
  completionStatus: 'active' | 'completed' | 'abandoned' | 'paused';
  efficiency: number;
}

export class ActivityIntentAnalyzer {
  private static instance: ActivityIntentAnalyzer | null = null;
  private recipeService: MultiSourceRecipeService;
  private translationService: ItemTranslationService;

  constructor() {
    this.recipeService = MultiSourceRecipeService.getInstance();
    this.translationService = ItemTranslationService.getInstance();
  }

  public static getInstance(): ActivityIntentAnalyzer {
    if (!ActivityIntentAnalyzer.instance) {
      ActivityIntentAnalyzer.instance = new ActivityIntentAnalyzer();
    }
    return ActivityIntentAnalyzer.instance;
  }

  /**
   * Analyze a worker's recent inventory activities to detect crafting intent
   */
  public analyzeWorkerIntent(
    recentActivities: WorkerInventorySnapshot[],
    timeWindowMinutes: number = 30
  ): ActivityIntent {
    if (!recentActivities.length) {
      return this.createUnknownIntent('No recent activities');
    }

    // Filter activities within time window
    const now = new Date();
    const windowStart = new Date(now.getTime() - (timeWindowMinutes * 60 * 1000));

    const relevantActivities = recentActivities.filter(activity =>
      new Date(activity.timestamp) >= windowStart
    );

    if (!relevantActivities.length) {
      return this.createUnknownIntent('No activities within time window');
    }

    // Group by activity type
    const takenItems = relevantActivities.filter(a => a.purpose === 'taken');
    const depositedItems = relevantActivities.filter(a => a.purpose === 'deposited');

    // Analyze crafting intent
    if (takenItems.length > 0) {
      const craftingIntent = this.analyzeCraftingIntent(takenItems);
      if (craftingIntent.confidence !== 'none') {
        return craftingIntent;
      }
    }

    // Analyze planting intent
    if (takenItems.some(item => this.isSeedItem(item.itemName))) {
      return this.analyzePlantingIntent(takenItems);
    }

    // Analyze animal care intent
    if (takenItems.some(item => this.isAnimalCareItem(item.itemName)) ||
        depositedItems.some(item => this.isAnimalProduct(item.itemName))) {
      return this.analyzeAnimalCareIntent(takenItems, depositedItems);
    }

    return this.createUnknownIntent('Could not determine specific intent');
  }

  /**
   * Analyze if taken materials match any recipes
   */
  private analyzeCraftingIntent(takenItems: WorkerInventorySnapshot[]): ActivityIntent {
    const allRecipes = this.recipeService.getAllRecipes();
    const recipeMatches: RecipeMatch[] = [];

    // Check each recipe for material matches
    for (const recipe of allRecipes) {
      const match = this.calculateRecipeMatch(recipe, takenItems);
      if (match.matchPercentage > 0) {
        recipeMatches.push(match);
      }
    }

    if (!recipeMatches.length) {
      return this.createUnknownIntent('No recipe matches found');
    }

    // Sort by match percentage
    recipeMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const bestMatch = recipeMatches[0];

    // Determine confidence based on match quality
    let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
    if (bestMatch.matchPercentage >= 0.8) confidence = 'high';
    else if (bestMatch.matchPercentage >= 0.5) confidence = 'medium';
    else if (bestMatch.matchPercentage >= 0.2) confidence = 'low';

    const nextActions = this.generateNextExpectedActions(bestMatch);
    const efficiency = this.calculateCraftingEfficiency(bestMatch, takenItems);

    return {
      type: 'crafting',
      confidence,
      purpose: `Crafting ${bestMatch.recipe.portugueseName} (${Math.round(bestMatch.matchPercentage * 100)}% materials gathered)`,
      relatedRecipes: recipeMatches.slice(0, 3), // Top 3 matches
      nextExpectedActions: nextActions,
      efficiency
    };
  }

  /**
   * Calculate how well taken materials match a specific recipe
   */
  private calculateRecipeMatch(recipe: Recipe, takenItems: WorkerInventorySnapshot[]): RecipeMatch {
    const requiredMaterials = recipe.requirements;
    const takenMaterialsMap = new Map<string, number>();

    // Build map of taken materials
    takenItems.forEach(item => {
      const existing = takenMaterialsMap.get(item.itemName) || 0;
      takenMaterialsMap.set(item.itemName, existing + item.quantity);
    });

    let matchedMaterials = 0;
    let totalRequiredMaterials = requiredMaterials.length;
    const missingMaterials: Material[] = [];
    const excessMaterials: { itemName: string; excess: number; portugueseName: string }[] = [];

    // Check each required material
    for (const required of requiredMaterials) {
      const takenQuantity = takenMaterialsMap.get(required.itemName) || 0;

      if (takenQuantity > 0) {
        matchedMaterials++;

        // Check for excess
        if (takenQuantity > required.quantity) {
          excessMaterials.push({
            itemName: required.itemName,
            excess: takenQuantity - required.quantity,
            portugueseName: required.portugueseName
          });
        }
      } else {
        // Missing material
        missingMaterials.push(required);
      }
    }

    const matchPercentage = totalRequiredMaterials > 0 ? matchedMaterials / totalRequiredMaterials : 0;

    // Determine status
    let status: RecipeMatch['status'] = 'just_started';
    if (matchPercentage >= 1.0) status = 'complete';
    else if (matchPercentage >= 0.8) status = 'nearly_complete';
    else if (matchPercentage >= 0.3) status = 'in_progress';

    if (excessMaterials.length > 0 && matchPercentage >= 1.0) {
      status = 'over_gathered';
    }

    // Calculate time window (assuming items were taken recently)
    const timeWindow = takenItems.length > 0 ? 5 : 0; // Simplified for now

    return {
      recipe,
      matchPercentage,
      missingMaterials,
      excessMaterials,
      timeWindow,
      status
    };
  }

  /**
   * Generate next expected actions based on recipe match
   */
  private generateNextExpectedActions(match: RecipeMatch): string[] {
    const actions: string[] = [];

    if (match.missingMaterials.length > 0) {
      actions.push(`Take ${match.missingMaterials.map(m => `${m.quantity} ${m.portugueseName}`).join(', ')}`);
    }

    if (match.matchPercentage >= 0.8) {
      actions.push(`Begin crafting ${match.recipe.portugueseName}`);
      actions.push(`Expect to produce ${match.recipe.outputQuantity} units`);
    }

    if (match.status === 'complete') {
      actions.push(`Ready to craft - all materials gathered`);
    }

    return actions;
  }

  /**
   * Calculate crafting efficiency score
   */
  private calculateCraftingEfficiency(match: RecipeMatch, takenItems: WorkerInventorySnapshot[]): number {
    let efficiency = match.matchPercentage;

    // Reduce efficiency for excess materials (waste)
    if (match.excessMaterials.length > 0) {
      const wasteRatio = match.excessMaterials.length / match.recipe.requirements.length;
      efficiency *= (1 - wasteRatio * 0.3);
    }

    // Boost efficiency for complete material gathering
    if (match.status === 'complete') {
      efficiency *= 1.2;
    }

    return Math.min(1.0, Math.max(0.0, efficiency));
  }

  /**
   * Analyze planting intent
   */
  private analyzePlantingIntent(takenItems: WorkerInventorySnapshot[]): ActivityIntent {
    const seedItems = takenItems.filter(item => this.isSeedItem(item.itemName));
    const totalSeeds = seedItems.reduce((sum, item) => sum + item.quantity, 0);

    const confidence = seedItems.length > 0 ? 'high' : 'none';
    const seedTypes = [...new Set(seedItems.map(item => item.portugueseName))];

    return {
      type: 'planting',
      confidence,
      purpose: `Planting ${seedTypes.join(', ')} (${totalSeeds} seeds total)`,
      relatedRecipes: [],
      nextExpectedActions: [
        'Go to planting area',
        'Plant seeds in designated plots',
        'Water planted seeds'
      ],
      efficiency: seedItems.length > 0 ? 0.8 : 0.0
    };
  }

  /**
   * Analyze animal care intent
   */
  private analyzeAnimalCareIntent(
    takenItems: WorkerInventorySnapshot[],
    depositedItems: WorkerInventorySnapshot[]
  ): ActivityIntent {
    const animalCareItems = takenItems.filter(item => this.isAnimalCareItem(item.itemName));
    const animalProducts = depositedItems.filter(item => this.isAnimalProduct(item.itemName));

    let purpose = '';
    let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';

    if (animalProducts.length > 0) {
      purpose = `Collecting animal products: ${animalProducts.map(p => p.portugueseName).join(', ')}`;
      confidence = 'high';
    } else if (animalCareItems.length > 0) {
      purpose = `Animal care with: ${animalCareItems.map(i => i.portugueseName).join(', ')}`;
      confidence = 'medium';
    }

    return {
      type: 'animal_care',
      confidence,
      purpose,
      relatedRecipes: [],
      nextExpectedActions: [
        'Visit animal areas',
        'Feed/care for animals',
        'Collect products (milk, eggs, etc.)'
      ],
      efficiency: (animalCareItems.length + animalProducts.length) > 0 ? 0.7 : 0.0
    };
  }

  /**
   * Helper methods for item classification
   */
  private isSeedItem(itemName: string): boolean {
    const seedKeywords = ['semente', 'seed', 'bulrush', 'wheat', 'corn'];
    const lowerName = itemName.toLowerCase();
    return seedKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isAnimalCareItem(itemName: string): boolean {
    const animalCareKeywords = ['racao', 'feed', 'bucket', 'balde', 'wateringcan'];
    const lowerName = itemName.toLowerCase();
    return animalCareKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isAnimalProduct(itemName: string): boolean {
    const productKeywords = ['leite', 'milk', 'ovos', 'eggs', 'carne', 'meat', 'couro', 'leather'];
    const lowerName = itemName.toLowerCase();
    return productKeywords.some(keyword => lowerName.includes(keyword));
  }

  /**
   * Create a fallback intent when analysis fails
   */
  private createUnknownIntent(reason: string): ActivityIntent {
    return {
      type: 'unknown',
      confidence: 'none',
      purpose: `Unknown activity: ${reason}`,
      relatedRecipes: [],
      nextExpectedActions: [],
      efficiency: 0.0
    };
  }

  /**
   * Cluster related activities into meaningful work sessions
   */
  public clusterActivities(
    activities: WorkerInventorySnapshot[],
    maxGapMinutes: number = 15
  ): ActivityCluster[] {
    if (!activities.length) return [];

    const clusters: ActivityCluster[] = [];
    let currentCluster: WorkerInventorySnapshot[] = [];
    let lastActivityTime: Date | null = null;

    for (const activity of activities) {
      const activityTime = new Date(activity.timestamp);

      if (lastActivityTime &&
          (activityTime.getTime() - lastActivityTime.getTime()) > (maxGapMinutes * 60 * 1000)) {
        // Gap too large, finalize current cluster
        if (currentCluster.length > 0) {
          clusters.push(this.createClusterFromActivities(currentCluster));
          currentCluster = [];
        }
      }

      currentCluster.push(activity);
      lastActivityTime = activityTime;
    }

    // Finalize last cluster
    if (currentCluster.length > 0) {
      clusters.push(this.createClusterFromActivities(currentCluster));
    }

    return clusters;
  }

  /**
   * Create an activity cluster from a group of related activities
   */
  private createClusterFromActivities(activities: WorkerInventorySnapshot[]): ActivityCluster {
    const sortedActivities = activities.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startTime = sortedActivities[0].timestamp;
    const endTime = sortedActivities[sortedActivities.length - 1].timestamp;
    const primaryIntent = this.analyzeWorkerIntent(activities);

    return {
      clusterId: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime,
      endTime,
      primaryIntent,
      relatedActivities: activities.map((_, index) => `activity_${index}`), // Simplified
      completionStatus: this.determineClusterStatus(primaryIntent),
      efficiency: primaryIntent.efficiency
    };
  }

  /**
   * Determine if a cluster represents completed work
   */
  private determineClusterStatus(intent: ActivityIntent): ActivityCluster['completionStatus'] {
    if (intent.type === 'crafting' && intent.relatedRecipes.length > 0) {
      const bestMatch = intent.relatedRecipes[0];
      if (bestMatch.status === 'complete') return 'completed';
      if (bestMatch.matchPercentage < 0.2) return 'abandoned';
      return 'active';
    }

    if (intent.confidence === 'high') return 'active';
    if (intent.confidence === 'none') return 'abandoned';
    return 'active';
  }
}

export default ActivityIntentAnalyzer;