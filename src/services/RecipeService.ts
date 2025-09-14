import ItemTranslationService from './ItemTranslationService';

// Define recipe requirements for each box type (for 25 units)
interface Recipe {
  boxName: string;
  portugueseName: string;
  batchSize: number; // How many boxes this recipe makes
  requirements: {
    [plantName: string]: number; // Internal plant name -> quantity needed
  };
}

interface ExpectedProduction {
  boxType: string;
  portugueseName: string;
  expectedQuantity: number;
  status: 'pending' | 'complete' | 'partial' | 'overdelivered';
  deliveredQuantity: number;
}

interface ResponsibilityCalculation {
  totalPlantsWithdrawn: { [plantName: string]: number };
  expectedProductions: ExpectedProduction[];
  canMakeMultipleRecipes: boolean;
  remainingPlants: { [plantName: string]: number };
}

export class RecipeService {
  private itemTranslationService: ItemTranslationService;
  private recipes: Recipe[] = [];

  constructor() {
    this.itemTranslationService = ItemTranslationService.getInstance();
    this.initializeRecipes();
  }

  private initializeRecipes(): void {
    this.recipes = [
      {
        boxName: 'caixadelegumes',
        portugueseName: 'Caixa de Legumes',
        batchSize: 25,
        requirements: {
          'bay_bolete': 50,
          'wheat': 50,
          'red_sage': 50, // Papoula
          'bulrush': 50   // Junco
        }
      },
      {
        boxName: 'caixadeverduras',
        portugueseName: 'Caixa de Verduras',
        batchSize: 25,
        requirements: {
          'corn': 100,
          'wheat': 50,
          'bulrush': 50 // Junco
        }
      },
      {
        boxName: 'caixadeervas',
        portugueseName: 'Caixa de Ervas',
        batchSize: 25,
        requirements: {
          'alaskan_ginseng': 25,
          'american_ginseng': 25,
          'prairie_poppy': 25,     // Papoula de Prado
          'oleander_sage': 25,     // Salvia Oleandro
          'oregano': 100
        }
      },
      {
        boxName: 'caixadefrutas',
        portugueseName: 'Caixa de Frutas',
        batchSize: 25,
        requirements: {
          'apple': 25,            // Maçã
          'peach': 50,            // Pêssego
          'banana': 100,
          'english_mace': 25      // Macerela Inglesa
        }
      }
    ];
  }

  // Calculate what can be produced with withdrawn plants
  public calculateExpectedProduction(plantsWithdrawn: { [plantName: string]: number }): ResponsibilityCalculation {
    const expectedProductions: ExpectedProduction[] = [];
    const remainingPlants = { ...plantsWithdrawn };
    let canMakeMultipleRecipes = false;

    // Try each recipe to see what can be made
    for (const recipe of this.recipes) {
      const maxBatches = this.calculateMaxBatches(plantsWithdrawn, recipe);
      
      if (maxBatches > 0) {
        expectedProductions.push({
          boxType: recipe.boxName,
          portugueseName: recipe.portugueseName,
          expectedQuantity: maxBatches * recipe.batchSize,
          status: 'pending',
          deliveredQuantity: 0
        });

        // Check if we can make multiple different recipes
        if (expectedProductions.length > 1) {
          canMakeMultipleRecipes = true;
        }
      }
    }

    // Calculate optimal production (prioritize by efficiency or user preference)
    const optimalProduction = this.calculateOptimalProduction(expectedProductions);

    return {
      totalPlantsWithdrawn: plantsWithdrawn,
      expectedProductions: optimalProduction,
      canMakeMultipleRecipes,
      remainingPlants
    };
  }

  // Calculate maximum batches that can be made for a specific recipe
  private calculateMaxBatches(availablePlants: { [plantName: string]: number }, recipe: Recipe): number {
    let maxBatches = Infinity;

    for (const [plantName, requiredAmount] of Object.entries(recipe.requirements)) {
      const available = availablePlants[plantName] || 0;
      const possibleBatches = Math.floor(available / requiredAmount);
      maxBatches = Math.min(maxBatches, possibleBatches);
    }

    return maxBatches === Infinity ? 0 : maxBatches;
  }

  // Calculate optimal production strategy (can be enhanced with user preferences)
  private calculateOptimalProduction(
    possibleProductions: ExpectedProduction[]
  ): ExpectedProduction[] {
    // For now, return the recipe that uses the most plants efficiently
    // This can be enhanced to consider user preferences or priority orders
    
    if (possibleProductions.length === 0) {
      return [];
    }

    // Sort by expected quantity (prioritize higher production)
    return possibleProductions.sort((a, b) => b.expectedQuantity - a.expectedQuantity).slice(0, 1);
  }

  // Update production status when boxes are delivered
  public updateProductionStatus(
    expectedProductions: ExpectedProduction[],
    boxesDelivered: { [boxType: string]: number }
  ): ExpectedProduction[] {
    return expectedProductions.map(production => {
      const delivered = boxesDelivered[production.boxType] || 0;
      production.deliveredQuantity = delivered;

      if (delivered === 0) {
        production.status = 'pending';
      } else if (delivered === production.expectedQuantity) {
        production.status = 'complete';
      } else if (delivered < production.expectedQuantity) {
        production.status = 'partial';
      } else {
        production.status = 'overdelivered';
      }

      return production;
    });
  }

  // Calculate plants consumed by box production
  public calculatePlantsConsumedByBoxes(boxesProduced: { [boxType: string]: number }): { [plantName: string]: number } {
    const plantsConsumed: { [plantName: string]: number } = {};

    for (const [boxType, quantity] of Object.entries(boxesProduced)) {
      const recipe = this.recipes.find(r => r.boxName === boxType);
      if (!recipe) continue;

      const batches = Math.floor(quantity / recipe.batchSize);
      
      for (const [plantName, requiredPerBatch] of Object.entries(recipe.requirements)) {
        plantsConsumed[plantName] = (plantsConsumed[plantName] || 0) + (batches * requiredPerBatch);
      }
    }

    return plantsConsumed;
  }

  // Get recipe details for a specific box type
  public getRecipeDetails(boxType: string): Recipe | undefined {
    return this.recipes.find(r => r.boxName === boxType);
  }

  // Get all available recipes
  public getAllRecipes(): Recipe[] {
    return [...this.recipes];
  }

  // Format responsibility display for embed
  public formatResponsibilityDisplay(calculation: ResponsibilityCalculation): {
    plantsWithdrawn: string[];
    expectedProduction: string[];
    responsibilityStatus: string;
  } {
    // Format plants withdrawn
    const plantsWithdrawn = Object.entries(calculation.totalPlantsWithdrawn).map(([plant, quantity]) => {
      const translatedName = this.itemTranslationService.getPortugueseName(plant);
      return `• ${quantity} ${translatedName}`;
    });

    // Format expected production with status icons
    const expectedProduction = calculation.expectedProductions.map(production => {
      const statusIcon = this.getStatusIcon(production.status);
      const deliveryInfo = production.status === 'partial' 
        ? ` (${production.deliveredQuantity}/${production.expectedQuantity})`
        : production.status === 'overdelivered'
        ? ` (${production.deliveredQuantity}/${production.expectedQuantity} - Excesso)`
        : '';
      
      return `• ${production.expectedQuantity} ${production.portugueseName} ${statusIcon}${deliveryInfo}`;
    });

    // Determine overall responsibility status
    const responsibilityStatus = this.calculateOverallResponsibilityStatus(calculation.expectedProductions);

    return {
      plantsWithdrawn,
      expectedProduction,
      responsibilityStatus
    };
  }

  private getStatusIcon(status: ExpectedProduction['status']): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'complete': return '✅';
      case 'partial': return '🔄';
      case 'overdelivered': return '📈';
      default: return '❓';
    }
  }

  private calculateOverallResponsibilityStatus(productions: ExpectedProduction[]): string {
    if (productions.length === 0) {
      return '✅ NENHUMA RESPONSABILIDADE';
    }

    const allComplete = productions.every(p => p.status === 'complete');
    if (allComplete) {
      return '✅ RESPONSABILIDADES QUITADAS';
    }

    const hasPartial = productions.some(p => p.status === 'partial');
    const hasPending = productions.some(p => p.status === 'pending');

    if (hasPartial || hasPending) {
      return '⚠️ RESPONSABILIDADES PENDENTES';
    }

    return '❌ RESPONSABILIDADES INCONSISTENTES';
  }
}

export default RecipeService;