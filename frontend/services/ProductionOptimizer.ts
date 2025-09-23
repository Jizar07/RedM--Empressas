import { Recipe, Material } from '../components/Recipes';
import { InventoryItem } from '../types/inventory';

export interface MaterialRequirement {
  item: string;
  quantidade: number;
  nome: string;
  precoUnitario: number;
  custoTotal: number;
  disponivel: number;
  faltante: number;
}

export interface MaterialGap {
  item: string;
  nome: string;
  quantidadeNecessaria: number;
  quantidadeDisponivel: number;
  faltante: number;
  custoParaComprar: number;
}

export interface ProductionScenario {
  recipe: Recipe;
  profitPerUnit: number;
  totalPossibleProduction: number;
  totalProfit: number;
  requiredMaterials: MaterialRequirement[];
  availableMaterials: InventoryItem[];
  missingMaterials: MaterialGap[];
  productionViability: 'high' | 'medium' | 'low' | 'impossible';
  roiPercentage: number;
  totalCost: number;
  totalRevenue: number;
  breakEvenUnits: number;
  recommendedProduction: number;
}

export interface OptimizationSettings {
  minimumProfitMargin: number;
  preferredCategories: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  maxInvestment: number;
  priorityMetric: 'profit' | 'roi' | 'volume';
}

export class ProductionOptimizer {
  private priceList: Record<string, { preco_min: number; preco_max: number; nome: string }> = {};
  private inventory: InventoryItem[] = [];
  private recipes: Recipe[] = [];
  private settings: OptimizationSettings;

  constructor(
    priceList: Record<string, { preco_min: number; preco_max: number; nome: string }>,
    inventory: InventoryItem[],
    recipes: Recipe[],
    settings?: Partial<OptimizationSettings>
  ) {
    this.priceList = priceList;
    this.inventory = inventory;
    this.recipes = recipes;
    this.settings = {
      minimumProfitMargin: 0.15, // 15% minimum profit margin
      preferredCategories: ['CAIXAS', 'VETERINARIA', 'ARTESANATO'],
      riskTolerance: 'moderate',
      maxInvestment: 10000,
      priorityMetric: 'profit',
      ...settings
    };
  }

  /**
   * Main optimization function - analyzes all recipes and returns ranked scenarios
   */
  public optimizeProduction(): ProductionScenario[] {
    const scenarios: ProductionScenario[] = [];

    for (const recipe of this.recipes) {
      const scenario = this.analyzeRecipe(recipe);
      if (scenario.productionViability !== 'impossible') {
        scenarios.push(scenario);
      }
    }

    return this.rankScenarios(scenarios);
  }

  /**
   * Get recommendations based on current inventory
   */
  public getSmartRecommendations(limit: number = 5): ProductionScenario[] {
    const allScenarios = this.optimizeProduction();

    return allScenarios
      .filter(scenario =>
        scenario.productionViability === 'high' &&
        scenario.profitPerUnit > 0 &&
        scenario.roiPercentage >= (this.settings.minimumProfitMargin * 100)
      )
      .slice(0, limit);
  }

  /**
   * Analyze a specific recipe for profitability and feasibility
   */
  private analyzeRecipe(recipe: Recipe): ProductionScenario {
    const requiredMaterials = this.calculateMaterialRequirements(recipe);
    const missingMaterials = this.identifyMaterialGaps(requiredMaterials);
    const totalCost = this.calculateTotalCost(requiredMaterials);
    const sellingPrice = this.getSellingPrice(recipe);
    const totalRevenue = sellingPrice * recipe.produz;
    const totalProfit = totalRevenue - totalCost;
    const profitPerUnit = totalProfit / recipe.produz;
    const roiPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    // Calculate how many units we can actually produce
    const totalPossibleProduction = this.calculateMaxProduction(recipe, requiredMaterials);

    // Determine viability
    const viability = this.assessViability(
      missingMaterials,
      profitPerUnit,
      roiPercentage,
      totalCost
    );

    // Calculate recommended production amount
    const recommendedProduction = this.calculateRecommendedProduction(
      totalPossibleProduction,
      viability,
      totalCost
    );

    return {
      recipe,
      profitPerUnit,
      totalPossibleProduction,
      totalProfit: profitPerUnit * recommendedProduction,
      requiredMaterials,
      availableMaterials: this.getAvailableMaterials(recipe),
      missingMaterials,
      productionViability: viability,
      roiPercentage,
      totalCost,
      totalRevenue: sellingPrice * recommendedProduction,
      breakEvenUnits: sellingPrice > 0 ? Math.ceil(totalCost / sellingPrice) : 0,
      recommendedProduction
    };
  }

  /**
   * Calculate material requirements for a recipe
   */
  private calculateMaterialRequirements(recipe: Recipe): MaterialRequirement[] {
    return recipe.materiais.map(material => {
      const precoUnitario = this.getMaterialPrice(material.item);
      const custoTotal = precoUnitario * material.quantidade;
      const disponivel = this.getAvailableQuantity(material.item);
      const faltante = Math.max(0, material.quantidade - disponivel);

      return {
        item: material.item,
        quantidade: material.quantidade,
        nome: material.nome,
        precoUnitario,
        custoTotal,
        disponivel,
        faltante
      };
    });
  }

  /**
   * Identify materials that are missing or insufficient
   */
  private identifyMaterialGaps(requirements: MaterialRequirement[]): MaterialGap[] {
    return requirements
      .filter(req => req.faltante > 0)
      .map(req => ({
        item: req.item,
        nome: req.nome,
        quantidadeNecessaria: req.quantidade,
        quantidadeDisponivel: req.disponivel,
        faltante: req.faltante,
        custoParaComprar: req.precoUnitario * req.faltante
      }));
  }

  /**
   * Calculate total cost for a recipe
   */
  private calculateTotalCost(requirements: MaterialRequirement[]): number {
    return requirements.reduce((total, req) => total + req.custoTotal, 0);
  }

  /**
   * Get selling price for a recipe output
   */
  private getSellingPrice(recipe: Recipe): number {
    // Try to find the recipe output in price list
    const priceData = this.findPriceData(recipe.id, recipe.nome);

    if (priceData) {
      // Use average of min/max price
      return (priceData.preco_min + priceData.preco_max) / 2;
    }

    // Fallback pricing based on category and complexity
    return this.estimateSellingPrice(recipe);
  }

  /**
   * Find price data for an item
   */
  private findPriceData(id: string, name: string): { preco_min: number; preco_max: number } | null {
    // Direct ID match
    if (this.priceList[id]) {
      return this.priceList[id];
    }

    // Search by name variations
    const searchTerms = [
      name.toLowerCase(),
      id.toLowerCase(),
      name.toLowerCase().replace(/\s+/g, '_'),
      name.toLowerCase().replace(/[áàâã]/g, 'a').replace(/[éêë]/g, 'e').replace(/[íîï]/g, 'i').replace(/[óôõ]/g, 'o').replace(/[úûü]/g, 'u').replace(/[ç]/g, 'c')
    ];

    for (const [itemId, itemData] of Object.entries(this.priceList)) {
      const itemName = itemData.nome.toLowerCase();
      const itemIdLower = itemId.toLowerCase();

      if (searchTerms.some(term =>
        itemName.includes(term) ||
        itemIdLower.includes(term) ||
        term.includes(itemName) ||
        term.includes(itemIdLower)
      )) {
        return itemData;
      }
    }

    return null;
  }

  /**
   * Estimate selling price when not in price list
   */
  private estimateSellingPrice(recipe: Recipe): number {
    const basePrices = {
      'CAIXAS': 35.0,        // Boxes are high-value
      'VETERINARIA': 25.0,   // Veterinary products are premium
      'ARTESANATO': 15.0,    // Crafted items medium value
      'PROCESSAMENTO': 8.0,  // Processed goods
      'MINERACAO': 12.0      // Mining products
    };

    const basePrice = basePrices[recipe.categoria] || 10.0;

    // Adjust by complexity (number of materials and quantities)
    const complexityMultiplier = 1 + (recipe.materiais.length * 0.1) + (recipe.materiais.reduce((sum, m) => sum + m.quantidade, 0) * 0.01);

    return basePrice * complexityMultiplier;
  }

  /**
   * Get material price from price list or fallback
   */
  private getMaterialPrice(itemId: string): number {
    const priceData = this.findPriceData(itemId, itemId);

    if (priceData) {
      return (priceData.preco_min + priceData.preco_max) / 2;
    }

    // Fallback prices for common materials (Portuguese names only)
    const fallbackPrices: Record<string, number> = {
      'milho': 0.10, 'junco': 0.10, 'trigo': 0.10,
      'madeira': 0.15, 'ferro': 0.25, 'carvao': 0.20,
      'agua': 0.05, 'quartzo': 0.40, 'algodao': 0.25, 'fibras': 0.20
    };

    return fallbackPrices[itemId] || fallbackPrices[itemId.toLowerCase()] || 1.0;
  }

  /**
   * Get available quantity for an item in inventory
   */
  private getAvailableQuantity(itemId: string): number {
    if (!this.inventory || !Array.isArray(this.inventory)) {
      console.warn('⚠️ Inventory not available or not an array');
      return 0;
    }

    const inventoryItem = this.inventory.find(item =>
      item && (
        item.id === itemId ||
        item.nome === itemId ||
        item.displayName === itemId ||
        item.mappedId === itemId ||
        item.originalId === itemId ||
        item.id?.toLowerCase() === itemId.toLowerCase() ||
        item.nome?.toLowerCase() === itemId.toLowerCase() ||
        item.mappedId?.toLowerCase() === itemId.toLowerCase()
      )
    );

    if (inventoryItem) {
      return inventoryItem.quantidade;
    }
    return 0;
  }

  /**
   * Get available materials for a recipe
   */
  private getAvailableMaterials(recipe: Recipe): InventoryItem[] {
    if (!this.inventory || !Array.isArray(this.inventory)) {
      console.warn('⚠️ Inventory not available in getAvailableMaterials');
      return [];
    }

    return recipe.materiais
      .map(material => this.inventory.find(item =>
        item && (
          item.id === material.item ||
          item.nome === material.item ||
          item.displayName === material.item ||
          item.id?.toLowerCase() === material.item.toLowerCase() ||
          item.nome?.toLowerCase() === material.item.toLowerCase()
        )
      ))
      .filter((item): item is InventoryItem => item !== undefined);
  }

  /**
   * Calculate maximum possible production with current inventory
   */
  private calculateMaxProduction(recipe: Recipe, requirements: MaterialRequirement[]): number {
    let maxProduction = Infinity;

    for (const req of requirements) {
      if (req.disponivel === 0 && req.quantidade > 0) {
        return 0; // Can't produce anything without this material
      }

      const possibleUnits = Math.floor(req.disponivel / req.quantidade);
      maxProduction = Math.min(maxProduction, possibleUnits);
    }

    return maxProduction === Infinity ? 0 : maxProduction;
  }

  /**
   * Assess production viability
   */
  private assessViability(
    missingMaterials: MaterialGap[],
    profitPerUnit: number,
    roiPercentage: number,
    totalCost: number
  ): 'high' | 'medium' | 'low' | 'impossible' {
    // Impossible if no profit or excessive cost
    if (profitPerUnit <= 0 || totalCost > this.settings.maxInvestment) {
      return 'impossible';
    }

    // High viability: good profit, low/no missing materials
    if (roiPercentage >= 30 && missingMaterials.length <= 1) {
      return 'high';
    }

    // Medium viability: decent profit, some missing materials
    if (roiPercentage >= 15 && missingMaterials.length <= 3) {
      return 'medium';
    }

    // Low viability: marginal profit or many missing materials
    if (roiPercentage >= 5) {
      return 'low';
    }

    return 'impossible';
  }

  /**
   * Calculate recommended production amount
   */
  private calculateRecommendedProduction(
    maxPossible: number,
    viability: string,
    totalCost: number
  ): number {
    if (viability === 'impossible' || maxPossible === 0) {
      return 0;
    }

    // Adjust based on risk tolerance and viability
    const riskMultipliers = {
      'conservative': { 'high': 0.7, 'medium': 0.5, 'low': 0.3 },
      'moderate': { 'high': 0.9, 'medium': 0.7, 'low': 0.5 },
      'aggressive': { 'high': 1.0, 'medium': 0.9, 'low': 0.7 }
    };

    const multiplier = riskMultipliers[this.settings.riskTolerance][viability as keyof typeof riskMultipliers['conservative']] || 0.5;

    return Math.floor(maxPossible * multiplier);
  }

  /**
   * Rank scenarios by profitability and other factors
   */
  private rankScenarios(scenarios: ProductionScenario[]): ProductionScenario[] {
    return scenarios.sort((a, b) => {
      // Primary sort by priority metric
      switch (this.settings.priorityMetric) {
        case 'profit':
          return b.totalProfit - a.totalProfit;
        case 'roi':
          return b.roiPercentage - a.roiPercentage;
        case 'volume':
          return b.recommendedProduction - a.recommendedProduction;
        default:
          return b.totalProfit - a.totalProfit;
      }
    });
  }

  /**
   * Get detailed analysis for a specific recipe
   */
  public analyzeSpecificRecipe(recipeId: string): ProductionScenario | null {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return null;

    return this.analyzeRecipe(recipe);
  }

  /**
   * Calculate what materials need to be purchased for optimal production
   */
  public calculateShoppingList(scenarios: ProductionScenario[], budget: number = this.settings.maxInvestment): MaterialGap[] {
    const consolidatedNeeds: Record<string, MaterialGap> = {};
    let totalCost = 0;

    for (const scenario of scenarios) {
      if (scenario.productionViability === 'impossible') continue;

      for (const gap of scenario.missingMaterials) {
        if (totalCost + gap.custoParaComprar > budget) continue;

        if (consolidatedNeeds[gap.item]) {
          consolidatedNeeds[gap.item].faltante += gap.faltante;
          consolidatedNeeds[gap.item].custoParaComprar += gap.custoParaComprar;
        } else {
          consolidatedNeeds[gap.item] = { ...gap };
        }

        totalCost += gap.custoParaComprar;
      }
    }

    return Object.values(consolidatedNeeds)
      .sort((a, b) => b.custoParaComprar - a.custoParaComprar);
  }
}