import { ProductionOptimizer, ProductionScenario, OptimizationSettings } from './ProductionOptimizer';
import { Recipe } from '../components/Recipes';
import { InventoryItem } from '../types/inventory';

export interface SmartRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'immediate_profit' | 'inventory_optimization' | 'market_opportunity' | 'resource_management';
  action: RecommendationAction;
  impact: {
    profitPotential: number;
    timeToExecute: string;
    resourcesRequired: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  scenario?: ProductionScenario;
}

export interface RecommendationAction {
  type: 'craft_now' | 'acquire_materials' | 'sell_surplus' | 'expand_production' | 'optimize_inventory';
  target: string;
  parameters: Record<string, any>;
}

export interface MarketInsight {
  item: string;
  itemName: string;
  currentPrice: number;
  priceRange: { min: number; max: number };
  profitMargin: number;
  demandLevel: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  recommendation: 'buy' | 'sell' | 'hold' | 'craft';
  reasoning: string;
}

export interface InventoryAlert {
  type: 'low_stock' | 'overstock' | 'zero_stock' | 'price_opportunity' | 'expiring_soon';
  item: string;
  itemName: string;
  currentQuantity: number;
  recommendedQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
}

export class SmartRecommendationEngine {
  private optimizer: ProductionOptimizer;
  private inventory: InventoryItem[];
  private priceList: Record<string, { preco_min: number; preco_max: number; nome: string }>;
  private recipes: Recipe[];

  constructor(
    optimizer: ProductionOptimizer,
    inventory: InventoryItem[],
    priceList: Record<string, { preco_min: number; preco_max: number; nome: string }>,
    recipes: Recipe[]
  ) {
    this.optimizer = optimizer;
    this.inventory = inventory;
    this.priceList = priceList;
    this.recipes = recipes;
  }

  /**
   * Generate comprehensive smart recommendations
   */
  public generateRecommendations(): SmartRecommendation[] {
    if (!this.inventory || !Array.isArray(this.inventory)) {
      console.warn('⚠️ Cannot generate recommendations - inventory not available');
      return [];
    }

    if (!this.recipes || this.recipes.length === 0) {
      console.warn('⚠️ Cannot generate recommendations - no recipes available');
      return [];
    }

    const recommendations: SmartRecommendation[] = [];

    try {
      // 1. Immediate profit opportunities
      recommendations.push(...this.getImmediateProfitRecommendations());

      // 2. Inventory optimization suggestions
      recommendations.push(...this.getInventoryOptimizationRecommendations());

      // 3. Market opportunity analysis
      recommendations.push(...this.getMarketOpportunityRecommendations());

      // 4. Resource management suggestions
      recommendations.push(...this.getResourceManagementRecommendations());
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }

    return this.prioritizeRecommendations(recommendations);
  }

  /**
   * Get immediate profit opportunities based on current inventory
   */
  private getImmediateProfitRecommendations(): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const scenarios = this.optimizer.getSmartRecommendations(10);

    scenarios.forEach((scenario, index) => {
      if (scenario.productionViability === 'high' && scenario.missingMaterials.length === 0) {
        recommendations.push({
          id: `immediate_profit_${scenario.recipe.id}`,
          title: `Lucro Imediato: ${scenario.recipe.nome}`,
          description: `Produza ${scenario.recommendedProduction} unidades para lucro de $${scenario.totalProfit.toFixed(2)} (ROI: ${scenario.roiPercentage.toFixed(1)}%)`,
          priority: index < 3 ? 'urgent' : 'high',
          category: 'immediate_profit',
          action: {
            type: 'craft_now',
            target: scenario.recipe.id,
            parameters: {
              quantity: scenario.recommendedProduction,
              expectedProfit: scenario.totalProfit,
              requiredMaterials: scenario.requiredMaterials
            }
          },
          impact: {
            profitPotential: scenario.totalProfit,
            timeToExecute: this.estimateProductionTime(scenario.recipe),
            resourcesRequired: scenario.requiredMaterials.map(m => `${m.nome} (${m.quantidade})`),
            riskLevel: 'low'
          },
          scenario
        });
      }
    });

    return recommendations;
  }

  /**
   * Get inventory optimization recommendations
   */
  private getInventoryOptimizationRecommendations(): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const alerts = this.analyzeInventoryAlerts();

    // Convert critical alerts to recommendations
    alerts.forEach(alert => {
      if (alert.urgency === 'critical' || alert.urgency === 'high') {
        let actionType: RecommendationAction['type'] = 'optimize_inventory';
        let title = '';
        let description = alert.suggestion;

        switch (alert.type) {
          case 'zero_stock':
            actionType = 'acquire_materials';
            title = `Estoque Zerado: ${alert.itemName}`;
            break;
          case 'low_stock':
            actionType = 'acquire_materials';
            title = `Estoque Baixo: ${alert.itemName}`;
            break;
          case 'overstock':
            actionType = 'sell_surplus';
            title = `Excesso de Estoque: ${alert.itemName}`;
            break;
          case 'price_opportunity':
            actionType = 'sell_surplus';
            title = `Oportunidade de Preço: ${alert.itemName}`;
            break;
        }

        recommendations.push({
          id: `inventory_${alert.type}_${alert.item}`,
          title,
          description,
          priority: alert.urgency === 'critical' ? 'urgent' : 'high',
          category: 'inventory_optimization',
          action: {
            type: actionType,
            target: alert.item,
            parameters: {
              currentQuantity: alert.currentQuantity,
              recommendedQuantity: alert.recommendedQuantity,
              alertType: alert.type
            }
          },
          impact: {
            profitPotential: this.calculateInventoryOpportunityValue(alert),
            timeToExecute: '5-15 minutos',
            resourcesRequired: [],
            riskLevel: alert.type === 'price_opportunity' ? 'medium' : 'low'
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Get market opportunity recommendations
   */
  private getMarketOpportunityRecommendations(): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const insights = this.analyzeMarketInsights();

    insights.forEach(insight => {
      if (insight.profitMargin > 50 && insight.recommendation === 'craft') {
        // Find recipes that produce this item
        const relevantRecipes = this.recipes.filter(recipe =>
          recipe.nome.toLowerCase().includes(insight.itemName.toLowerCase()) ||
          recipe.id.toLowerCase().includes(insight.item.toLowerCase())
        );

        relevantRecipes.forEach(recipe => {
          const scenario = this.optimizer.analyzeSpecificRecipe(recipe.id);
          if (scenario && scenario.productionViability !== 'impossible') {
            recommendations.push({
              id: `market_opportunity_${recipe.id}`,
              title: `Oportunidade de Mercado: ${recipe.nome}`,
              description: `Preço alto ($${insight.currentPrice.toFixed(2)}) com margem de ${insight.profitMargin.toFixed(1)}%. ${insight.reasoning}`,
              priority: insight.profitMargin > 100 ? 'urgent' : 'high',
              category: 'market_opportunity',
              action: {
                type: 'craft_now',
                target: recipe.id,
                parameters: {
                  marketPrice: insight.currentPrice,
                  profitMargin: insight.profitMargin,
                  demandLevel: insight.demandLevel
                }
              },
              impact: {
                profitPotential: scenario.totalProfit,
                timeToExecute: this.estimateProductionTime(recipe),
                resourcesRequired: scenario.requiredMaterials.map(m => m.nome),
                riskLevel: insight.demandLevel === 'very_high' ? 'low' : 'medium'
              },
              scenario
            });
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Get resource management recommendations - prioritize production opportunities
   */
  private getResourceManagementRecommendations(): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];

    // First, look for production opportunities with excess materials
    this.inventory.forEach(item => {
      const productionOpportunities = this.findProductionOpportunitiesForMaterial(item.id);

      if (productionOpportunities.length > 0 && item.quantidade > 50) {
        const bestOpportunity = productionOpportunities[0];

        // Calculate how many times we could produce this recipe
        const materialInRecipe = bestOpportunity.recipe.materiais.find(m =>
          m.item === item.id || m.item.toLowerCase() === item.id.toLowerCase()
        );

        if (materialInRecipe) {
          const possibleProductions = Math.floor(item.quantidade / materialInRecipe.quantidade);
          const recommendedProductions = Math.min(possibleProductions, bestOpportunity.recommendedProduction);

          if (recommendedProductions > 0) {
            recommendations.push({
              id: `production_opportunity_${item.id}_${bestOpportunity.recipe.id}`,
              title: `Oportunidade de Produção: ${bestOpportunity.recipe.nome}`,
              description: `Você tem ${item.quantidade} ${item.displayName}. Produza ${recommendedProductions} unidades de ${bestOpportunity.recipe.nome} para lucro de $${(bestOpportunity.profitPerUnit * recommendedProductions).toFixed(2)}`,
              priority: bestOpportunity.roiPercentage > 50 ? 'urgent' : 'high',
              category: 'resource_management',
              action: {
                type: 'craft_now',
                target: bestOpportunity.recipe.id,
                parameters: {
                  quantity: recommendedProductions,
                  availableMaterial: item.quantidade,
                  materialName: item.displayName,
                  expectedProfit: bestOpportunity.profitPerUnit * recommendedProductions
                }
              },
              impact: {
                profitPotential: bestOpportunity.profitPerUnit * recommendedProductions,
                timeToExecute: this.estimateProductionTime(bestOpportunity.recipe),
                resourcesRequired: bestOpportunity.requiredMaterials.map(m => m.nome),
                riskLevel: bestOpportunity.productionViability === 'high' ? 'low' : 'medium'
              },
              scenario: bestOpportunity
            });
          }
        }
      }
    });

    // Only add waste reduction recommendations for materials with no production opportunities
    const materialEfficiency = this.analyzeMaterialEfficiency();
    materialEfficiency.forEach(analysis => {
      if (analysis.wastePercentage > 20) {
        recommendations.push({
          id: `resource_efficiency_${analysis.material}`,
          title: `Otimização de Recursos: ${analysis.materialName}`,
          description: `${analysis.wastePercentage.toFixed(1)}% de desperdício detectado. ${analysis.suggestion}`,
          priority: analysis.wastePercentage > 50 ? 'high' : 'medium',
          category: 'resource_management',
          action: {
            type: 'optimize_inventory',
            target: analysis.material,
            parameters: {
              wastePercentage: analysis.wastePercentage,
              suggestion: analysis.suggestion,
              optimalQuantity: analysis.optimalQuantity
            }
          },
          impact: {
            profitPotential: analysis.potentialSavings,
            timeToExecute: '10-30 minutos',
            resourcesRequired: [],
            riskLevel: 'low'
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Analyze inventory for alerts and issues
   */
  private analyzeInventoryAlerts(): InventoryAlert[] {
    const alerts: InventoryAlert[] = [];

    this.inventory.forEach(item => {
      // Zero stock alert
      if (item.quantidade === 0 && this.isImportantMaterial(item.id)) {
        alerts.push({
          type: 'zero_stock',
          item: item.id,
          itemName: item.displayName,
          currentQuantity: 0,
          recommendedQuantity: this.getRecommendedStockLevel(item.id),
          urgency: 'critical',
          suggestion: `Material essencial esgotado. Adquira pelo menos ${this.getRecommendedStockLevel(item.id)} unidades.`
        });
      }

      // Low stock alert
      const recommendedLevel = this.getRecommendedStockLevel(item.id);
      if (item.quantidade > 0 && item.quantidade < recommendedLevel * 0.2) {
        alerts.push({
          type: 'low_stock',
          item: item.id,
          itemName: item.displayName,
          currentQuantity: item.quantidade,
          recommendedQuantity: recommendedLevel,
          urgency: 'high',
          suggestion: `Estoque baixo. Considere adquirir mais ${recommendedLevel - item.quantidade} unidades.`
        });
      }

      // Overstock alert
      if (item.quantidade > recommendedLevel * 3) {
        alerts.push({
          type: 'overstock',
          item: item.id,
          itemName: item.displayName,
          currentQuantity: item.quantidade,
          recommendedQuantity: recommendedLevel,
          urgency: 'medium',
          suggestion: `Excesso de estoque. Considere vender ${item.quantidade - recommendedLevel} unidades.`
        });
      }

      // Price opportunity
      const priceData = this.priceList[item.id];
      if (priceData && item.quantidade > 10) {
        const avgPrice = (priceData.preco_min + priceData.preco_max) / 2;
        if (avgPrice > 5) { // High-value items
          alerts.push({
            type: 'price_opportunity',
            item: item.id,
            itemName: item.displayName,
            currentQuantity: item.quantidade,
            recommendedQuantity: Math.floor(item.quantidade * 0.7),
            urgency: 'medium',
            suggestion: `Item valioso em estoque. Preço médio: $${avgPrice.toFixed(2)}. Considere vender parte do estoque.`
          });
        }
      }
    });

    return alerts.sort((a, b) => {
      const urgencyOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }

  /**
   * Analyze market insights for items
   */
  private analyzeMarketInsights(): MarketInsight[] {
    const insights: MarketInsight[] = [];

    Object.entries(this.priceList).forEach(([itemId, priceData]) => {
      const avgPrice = (priceData.preco_min + priceData.preco_max) / 2;
      const priceRange = priceData.preco_max - priceData.preco_min;
      const inventoryItem = this.inventory.find(item => item.id === itemId);

      // Calculate profit margin potential
      const productionCost = this.estimateProductionCost(itemId);
      const profitMargin = productionCost > 0 ? ((avgPrice - productionCost) / productionCost) * 100 : 0;

      // Determine demand level based on price range and market position
      let demandLevel: MarketInsight['demandLevel'] = 'medium';
      if (avgPrice > 20) demandLevel = 'high';
      if (avgPrice > 50) demandLevel = 'very_high';
      if (avgPrice < 2) demandLevel = 'low';
      if (avgPrice < 0.5) demandLevel = 'very_low';

      // Generate recommendation
      let recommendation: MarketInsight['recommendation'] = 'hold';
      let reasoning = '';

      if (profitMargin > 100) {
        recommendation = 'craft';
        reasoning = 'Margem de lucro muito alta. Excelente oportunidade de produção.';
      } else if (profitMargin > 50) {
        recommendation = 'craft';
        reasoning = 'Boa margem de lucro. Considere aumentar produção.';
      } else if (inventoryItem && inventoryItem.quantidade > 50 && avgPrice > 5) {
        recommendation = 'sell';
        reasoning = 'Alto estoque de item valioso. Oportunidade de venda.';
      } else if (profitMargin < 10 && avgPrice < 2) {
        recommendation = 'buy';
        reasoning = 'Preço baixo para material útil. Considere adquirir.';
      }

      insights.push({
        item: itemId,
        itemName: priceData.nome,
        currentPrice: avgPrice,
        priceRange: { min: priceData.preco_min, max: priceData.preco_max },
        profitMargin,
        demandLevel,
        recommendation,
        reasoning
      });
    });

    return insights
      .filter(insight => insight.profitMargin > 20 || insight.recommendation !== 'hold')
      .sort((a, b) => b.profitMargin - a.profitMargin);
  }

  /**
   * Analyze material efficiency - prioritize production opportunities over waste reduction
   */
  private analyzeMaterialEfficiency(): Array<{
    material: string;
    materialName: string;
    wastePercentage: number;
    suggestion: string;
    potentialSavings: number;
    optimalQuantity: number;
  }> {
    const efficiency: Array<{
      material: string;
      materialName: string;
      wastePercentage: number;
      suggestion: string;
      potentialSavings: number;
      optimalQuantity: number;
    }> = [];

    this.inventory.forEach(item => {
      // First, check if this material can be used in profitable recipes
      const productionOpportunities = this.findProductionOpportunitiesForMaterial(item.id);

      if (productionOpportunities.length > 0) {
        // Skip waste analysis if material has production opportunities
        return;
      }

      const usageInRecipes = this.calculateMaterialUsage(item.id);
      const optimalQuantity = usageInRecipes.totalUsage * 1.2; // 20% buffer
      const currentQuantity = item.quantidade;

      // Only flag as waste if no production opportunities AND excessive stock
      if (currentQuantity > optimalQuantity && usageInRecipes.recipeCount === 0) {
        const wastePercentage = ((currentQuantity - optimalQuantity) / currentQuantity) * 100;
        const priceData = this.priceList[item.id];
        const itemValue = priceData ? (priceData.preco_min + priceData.preco_max) / 2 : 1;
        const potentialSavings = (currentQuantity - optimalQuantity) * itemValue;

        efficiency.push({
          material: item.id,
          materialName: item.displayName,
          wastePercentage,
          suggestion: `Material sem uso em receitas. Considere vender ${currentQuantity - Math.ceil(optimalQuantity)} unidades.`,
          potentialSavings,
          optimalQuantity: Math.ceil(optimalQuantity)
        });
      }
    });

    return efficiency.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Find production opportunities for a specific material
   */
  private findProductionOpportunitiesForMaterial(materialId: string): ProductionScenario[] {
    const opportunities: ProductionScenario[] = [];

    // Find recipes that use this material
    const relevantRecipes = this.recipes.filter(recipe =>
      recipe.materiais.some(material =>
        material.item === materialId ||
        material.item.toLowerCase() === materialId.toLowerCase() ||
        material.nome.toLowerCase().includes(materialId.toLowerCase()) ||
        materialId.toLowerCase().includes(material.item.toLowerCase())
      )
    );

    // Analyze each recipe for production viability
    relevantRecipes.forEach(recipe => {
      const scenario = this.optimizer.analyzeSpecificRecipe(recipe.id);
      if (scenario && scenario.productionViability !== 'impossible' && scenario.profitPerUnit > 0) {
        opportunities.push(scenario);
      }
    });

    return opportunities.sort((a, b) => b.totalProfit - a.totalProfit);
  }

  /**
   * Calculate how much a material is used across all recipes
   */
  private calculateMaterialUsage(materialId: string): { totalUsage: number; recipeCount: number } {
    let totalUsage = 0;
    let recipeCount = 0;

    this.recipes.forEach(recipe => {
      const material = recipe.materiais.find(m =>
        m.item === materialId || m.nome.toLowerCase().includes(materialId.toLowerCase())
      );

      if (material) {
        totalUsage += material.quantidade;
        recipeCount++;
      }
    });

    return { totalUsage, recipeCount };
  }

  /**
   * Prioritize recommendations based on impact and urgency
   */
  private prioritizeRecommendations(recommendations: SmartRecommendation[]): SmartRecommendation[] {
    return recommendations.sort((a, b) => {
      // Priority order
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by profit potential
      return b.impact.profitPotential - a.impact.profitPotential;
    });
  }

  /**
   * Helper methods
   */
  private isImportantMaterial(itemId: string): boolean {
    const usage = this.calculateMaterialUsage(itemId);
    return usage.recipeCount >= 2 || usage.totalUsage >= 10;
  }

  private getRecommendedStockLevel(itemId: string): number {
    const usage = this.calculateMaterialUsage(itemId);
    return Math.max(usage.totalUsage * 2, 20); // At least 2x usage or 20 units
  }

  private estimateProductionCost(itemId: string): number {
    // Find recipes that produce this item
    const producingRecipes = this.recipes.filter(recipe =>
      recipe.id === itemId || recipe.nome.toLowerCase().includes(itemId.toLowerCase())
    );

    if (producingRecipes.length === 0) return 0;

    // Use the cheapest production method
    const costs = producingRecipes.map(recipe => {
      const materialCosts = recipe.materiais.reduce((total, material) => {
        const priceData = this.priceList[material.item];
        const price = priceData ? (priceData.preco_min + priceData.preco_max) / 2 : 1;
        return total + (price * material.quantidade);
      }, 0);

      return materialCosts / recipe.produz; // Cost per unit produced
    });

    return Math.min(...costs);
  }

  private estimateProductionTime(recipe: Recipe): string {
    const complexity = recipe.materiais.length + recipe.materiais.reduce((sum, m) => sum + m.quantidade / 10, 0);

    if (complexity < 5) return '5-15 minutos';
    if (complexity < 15) return '15-45 minutos';
    return '45-90 minutos';
  }

  private calculateInventoryOpportunityValue(alert: InventoryAlert): number {
    const priceData = this.priceList[alert.item];
    if (!priceData) return 0;

    const avgPrice = (priceData.preco_min + priceData.preco_max) / 2;

    switch (alert.type) {
      case 'overstock':
        return (alert.currentQuantity - alert.recommendedQuantity) * avgPrice * 0.8; // 80% of value when selling surplus
      case 'price_opportunity':
        return alert.currentQuantity * avgPrice * 0.3; // 30% profit margin
      default:
        return avgPrice * alert.recommendedQuantity * 0.1; // 10% efficiency gain
    }
  }
}