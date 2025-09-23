import { ProductionOptimizer, ProductionScenario } from './ProductionOptimizer';
import { SmartRecommendationEngine, SmartRecommendation } from './SmartRecommendationEngine';
import { MarketIntelligence, MarketReport } from './MarketIntelligence';
import { InventoryItem } from '../types/inventory';

export interface AutomatedPlan {
  id: string;
  name: string;
  description: string;
  planType: 'daily' | 'weekly' | 'monthly' | 'custom';
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  estimatedProfit: number;
  estimatedCost: number;
  roi: number;
  steps: PlanStep[];
  requiredResources: ResourceRequirement[];
  riskAssessment: RiskAssessment;
  schedule: PlanSchedule;
  status: 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PlanStep {
  id: string;
  order: number;
  action: 'acquire' | 'produce' | 'sell' | 'optimize' | 'wait';
  target: string;
  targetName: string;
  quantity: number;
  estimatedCost: number;
  estimatedRevenue: number;
  estimatedTime: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  notes?: string;
}

export interface ResourceRequirement {
  resource: string;
  resourceName: string;
  quantityNeeded: number;
  quantityAvailable: number;
  acquisitionPlan?: {
    method: 'purchase' | 'produce' | 'trade';
    estimatedCost: number;
    timeRequired: string;
  };
}

export interface RiskAssessment {
  overallRisk: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    probability: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  contingencyPlans: Array<{
    scenario: string;
    response: string;
    impact: string;
  }>;
}

export interface PlanSchedule {
  startDate: string;
  endDate: string;
  milestones: Array<{
    name: string;
    date: string;
    description: string;
    completed: boolean;
  }>;
  checkpoints: Array<{
    date: string;
    type: 'review' | 'adjustment' | 'validation';
    description: string;
  }>;
}

export interface PlanMetrics {
  profitabilityScore: number;
  feasibilityScore: number;
  riskScore: number;
  timeEfficiencyScore: number;
  resourceUtilizationScore: number;
  overallScore: number;
}

export interface AutomationSettings {
  autoApprove: boolean;
  maxInvestmentPerPlan: number;
  minProfitMargin: number;
  maxRiskLevel: 'low' | 'medium' | 'high';
  planningHorizon: 'daily' | 'weekly' | 'monthly';
  priorityWeights: {
    profit: number;
    risk: number;
    time: number;
    feasibility: number;
  };
}

export class AutomatedPlanning {
  private optimizer: ProductionOptimizer;
  private recommendationEngine: SmartRecommendationEngine;
  private marketIntelligence: MarketIntelligence;
  private inventory: InventoryItem[];
  private settings: AutomationSettings;

  constructor(
    optimizer: ProductionOptimizer,
    recommendationEngine: SmartRecommendationEngine,
    marketIntelligence: MarketIntelligence,
    inventory: InventoryItem[],
    settings?: Partial<AutomationSettings>
  ) {
    this.optimizer = optimizer;
    this.recommendationEngine = recommendationEngine;
    this.marketIntelligence = marketIntelligence;
    this.inventory = inventory;
    this.settings = {
      autoApprove: false,
      maxInvestmentPerPlan: 5000,
      minProfitMargin: 0.15,
      maxRiskLevel: 'medium',
      planningHorizon: 'weekly',
      priorityWeights: {
        profit: 0.4,
        risk: 0.2,
        time: 0.2,
        feasibility: 0.2
      },
      ...settings
    };
  }

  /**
   * Generate automated production plans based on current state
   */
  public async generateAutomatedPlans(): Promise<AutomatedPlan[]> {
    const plans: AutomatedPlan[] = [];

    // Get current intelligence
    const scenarios = this.optimizer.optimizeProduction();
    const recommendations = this.recommendationEngine.generateRecommendations();
    const marketReport = this.marketIntelligence.generateMarketReport();

    // Generate different types of plans
    plans.push(...this.generateProfitMaximizationPlans(scenarios, recommendations));
    plans.push(...this.generateInventoryOptimizationPlans(recommendations));
    plans.push(...this.generateMarketOpportunityPlans(marketReport));
    plans.push(...this.generateRiskMitigationPlans(scenarios, recommendations));

    // Score and rank plans
    const scoredPlans = plans.map(plan => ({
      plan,
      metrics: this.calculatePlanMetrics(plan)
    }));

    return scoredPlans
      .sort((a, b) => b.metrics.overallScore - a.metrics.overallScore)
      .map(item => item.plan)
      .slice(0, 10); // Return top 10 plans
  }

  /**
   * Generate profit maximization plans
   */
  private generateProfitMaximizationPlans(
    scenarios: ProductionScenario[],
    recommendations: SmartRecommendation[]
  ): AutomatedPlan[] {
    const plans: AutomatedPlan[] = [];

    // High-profit, low-risk scenarios
    const highProfitScenarios = scenarios
      .filter(s =>
        s.productionViability === 'high' &&
        s.totalProfit > 100 &&
        s.roiPercentage > 30
      )
      .slice(0, 3);

    highProfitScenarios.forEach((scenario, index) => {
      const plan = this.createProductionPlan(
        `profit_max_${scenario.recipe.id}`,
        `Maximização de Lucro: ${scenario.recipe.nome}`,
        `Plano focado em maximizar lucros através da produção de ${scenario.recipe.nome}`,
        scenario,
        'high'
      );

      plans.push(plan);
    });

    return plans;
  }

  /**
   * Generate inventory optimization plans
   */
  private generateInventoryOptimizationPlans(recommendations: SmartRecommendation[]): AutomatedPlan[] {
    const plans: AutomatedPlan[] = [];

    const inventoryRecs = recommendations.filter(r => r.category === 'inventory_optimization');

    if (inventoryRecs.length > 0) {
      const plan: AutomatedPlan = {
        id: `inventory_optimization_${Date.now()}`,
        name: 'Otimização de Inventário',
        description: 'Plano abrangente para otimizar níveis de estoque e reduzir desperdícios',
        planType: 'weekly',
        priority: 'medium',
        estimatedDuration: '3-5 dias',
        estimatedProfit: inventoryRecs.reduce((sum, r) => sum + r.impact.profitPotential, 0),
        estimatedCost: inventoryRecs.length * 50, // Estimated operational cost
        roi: 0,
        steps: this.createInventoryOptimizationSteps(inventoryRecs),
        requiredResources: [],
        riskAssessment: this.assessInventoryOptimizationRisk(),
        schedule: this.createSchedule('weekly'),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      plan.roi = ((plan.estimatedProfit - plan.estimatedCost) / plan.estimatedCost) * 100;
      plans.push(plan);
    }

    return plans;
  }

  /**
   * Generate market opportunity plans
   */
  private generateMarketOpportunityPlans(marketReport: MarketReport): AutomatedPlan[] {
    const plans: AutomatedPlan[] = [];

    const highValueOpportunities = marketReport.opportunities
      .filter(o => o.profitPotential > 200 && o.riskLevel !== 'very_high')
      .slice(0, 2);

    highValueOpportunities.forEach(opportunity => {
      const plan: AutomatedPlan = {
        id: `market_opportunity_${opportunity.id}`,
        name: `Oportunidade de Mercado: ${opportunity.itemName}`,
        description: opportunity.description,
        planType: opportunity.timeToAct === 'immediate' ? 'daily' : 'weekly',
        priority: opportunity.timeToAct === 'immediate' ? 'high' : 'medium',
        estimatedDuration: this.getTimeToActDuration(opportunity.timeToAct),
        estimatedProfit: opportunity.profitPotential,
        estimatedCost: opportunity.profitPotential * 0.3, // Estimate 30% cost
        roi: 0,
        steps: this.createMarketOpportunitySteps(opportunity),
        requiredResources: this.calculateMarketOpportunityResources(opportunity),
        riskAssessment: this.assessMarketOpportunityRisk(opportunity),
        schedule: this.createSchedule(opportunity.timeToAct === 'immediate' ? 'daily' : 'weekly'),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      plan.roi = ((plan.estimatedProfit - plan.estimatedCost) / plan.estimatedCost) * 100;
      plans.push(plan);
    });

    return plans;
  }

  /**
   * Generate risk mitigation plans
   */
  private generateRiskMitigationPlans(
    scenarios: ProductionScenario[],
    recommendations: SmartRecommendation[]
  ): AutomatedPlan[] {
    const plans: AutomatedPlan[] = [];

    // Look for high-risk scenarios that need mitigation
    const riskyScenar
ios = scenarios.filter(s =>
      s.missingMaterials.length > 3 ||
      s.productionViability === 'low'
    );

    if (riskyScenar
ios.length > 0) {
      const plan: AutomatedPlan = {
        id: `risk_mitigation_${Date.now()}`,
        name: 'Mitigação de Riscos',
        description: 'Plano para reduzir riscos operacionais e melhorar viabilidade de produção',
        planType: 'monthly',
        priority: 'medium',
        estimatedDuration: '2-3 semanas',
        estimatedProfit: 0, // Focus on risk reduction, not immediate profit
        estimatedCost: 500, // Estimated cost for risk mitigation measures
        roi: 0,
        steps: this.createRiskMitigationSteps(riskyScenar
ios),
        requiredResources: this.calculateRiskMitigationResources(riskyScenar
ios),
        riskAssessment: this.assessRiskMitigationPlan(),
        schedule: this.createSchedule('monthly'),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      plans.push(plan);
    }

    return plans;
  }

  /**
   * Create a production plan from a scenario
   */
  private createProductionPlan(
    id: string,
    name: string,
    description: string,
    scenario: ProductionScenario,
    priority: 'high' | 'medium' | 'low'
  ): AutomatedPlan {
    const steps: PlanStep[] = [];
    let stepOrder = 1;

    // Step 1: Acquire missing materials
    scenario.missingMaterials.forEach(material => {
      steps.push({
        id: `${id}_acquire_${material.item}`,
        order: stepOrder++,
        action: 'acquire',
        target: material.item,
        targetName: material.nome,
        quantity: material.faltante,
        estimatedCost: material.custoParaComprar,
        estimatedRevenue: 0,
        estimatedTime: '30-60 minutos',
        dependencies: [],
        status: 'pending'
      });
    });

    // Step 2: Produce the item
    steps.push({
      id: `${id}_produce`,
      order: stepOrder++,
      action: 'produce',
      target: scenario.recipe.id,
      targetName: scenario.recipe.nome,
      quantity: scenario.recommendedProduction,
      estimatedCost: scenario.totalCost,
      estimatedRevenue: scenario.totalRevenue,
      estimatedTime: this.estimateProductionTime(scenario.recipe),
      dependencies: scenario.missingMaterials.map(m => `${id}_acquire_${m.item}`),
      status: 'pending'
    });

    // Step 3: Optimize and sell
    steps.push({
      id: `${id}_sell`,
      order: stepOrder++,
      action: 'sell',
      target: scenario.recipe.id,
      targetName: scenario.recipe.nome,
      quantity: scenario.recommendedProduction,
      estimatedCost: 0,
      estimatedRevenue: scenario.totalRevenue,
      estimatedTime: '15-30 minutos',
      dependencies: [`${id}_produce`],
      status: 'pending'
    });

    return {
      id,
      name,
      description,
      planType: 'daily',
      priority,
      estimatedDuration: this.calculateTotalDuration(steps),
      estimatedProfit: scenario.totalProfit,
      estimatedCost: scenario.totalCost + scenario.missingMaterials.reduce((sum, m) => sum + m.custoParaComprar, 0),
      roi: scenario.roiPercentage,
      steps,
      requiredResources: scenario.missingMaterials.map(m => ({
        resource: m.item,
        resourceName: m.nome,
        quantityNeeded: m.faltante,
        quantityAvailable: m.quantidadeDisponivel,
        acquisitionPlan: {
          method: 'purchase',
          estimatedCost: m.custoParaComprar,
          timeRequired: '30-60 minutos'
        }
      })),
      riskAssessment: this.assessProductionRisk(scenario),
      schedule: this.createSchedule('daily'),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate plan metrics for scoring
   */
  private calculatePlanMetrics(plan: AutomatedPlan): PlanMetrics {
    const profitabilityScore = Math.min(100, (plan.roi / 100) * 100);
    const feasibilityScore = this.calculateFeasibilityScore(plan);
    const riskScore = this.calculateRiskScore(plan.riskAssessment);
    const timeEfficiencyScore = this.calculateTimeEfficiencyScore(plan);
    const resourceUtilizationScore = this.calculateResourceUtilizationScore(plan);

    const overallScore = (
      profitabilityScore * this.settings.priorityWeights.profit +
      feasibilityScore * this.settings.priorityWeights.feasibility +
      riskScore * this.settings.priorityWeights.risk +
      timeEfficiencyScore * this.settings.priorityWeights.time
    );

    return {
      profitabilityScore,
      feasibilityScore,
      riskScore,
      timeEfficiencyScore,
      resourceUtilizationScore,
      overallScore
    };
  }

  /**
   * Helper methods for plan creation
   */
  private createInventoryOptimizationSteps(recommendations: SmartRecommendation[]): PlanStep[] {
    const steps: PlanStep[] = [];

    recommendations.forEach((rec, index) => {
      steps.push({
        id: `inventory_step_${index}`,
        order: index + 1,
        action: 'optimize',
        target: rec.action.target,
        targetName: rec.title,
        quantity: 1,
        estimatedCost: 0,
        estimatedRevenue: rec.impact.profitPotential,
        estimatedTime: rec.impact.timeToExecute,
        dependencies: [],
        status: 'pending',
        notes: rec.description
      });
    });

    return steps;
  }

  private createMarketOpportunitySteps(opportunity: any): PlanStep[] {
    const steps: PlanStep[] = [];

    switch (opportunity.type) {
      case 'supply_gap':
        steps.push({
          id: `supply_gap_acquire`,
          order: 1,
          action: 'acquire',
          target: opportunity.item,
          targetName: opportunity.itemName,
          quantity: opportunity.parameters?.recommendedQuantity || 10,
          estimatedCost: opportunity.parameters?.avgPrice * 10 || 100,
          estimatedRevenue: 0,
          estimatedTime: '1-2 horas',
          dependencies: [],
          status: 'pending'
        });
        break;

      case 'price_inefficiency':
        steps.push({
          id: `price_inefficiency_monitor`,
          order: 1,
          action: 'wait',
          target: opportunity.item,
          targetName: opportunity.itemName,
          quantity: 1,
          estimatedCost: 0,
          estimatedRevenue: 0,
          estimatedTime: 'Contínuo',
          dependencies: [],
          status: 'pending',
          notes: 'Monitorar preços para oportunidades de arbitragem'
        });
        break;

      default:
        steps.push({
          id: `generic_opportunity`,
          order: 1,
          action: 'optimize',
          target: opportunity.item,
          targetName: opportunity.itemName,
          quantity: 1,
          estimatedCost: 0,
          estimatedRevenue: opportunity.profitPotential,
          estimatedTime: '1-3 horas',
          dependencies: [],
          status: 'pending'
        });
    }

    return steps;
  }

  private createRiskMitigationSteps(scenarios: ProductionScenario[]): PlanStep[] {
    const steps: PlanStep[] = [];

    scenarios.forEach((scenario, index) => {
      scenario.missingMaterials.forEach((material, materialIndex) => {
        steps.push({
          id: `risk_mitigation_${index}_${materialIndex}`,
          order: steps.length + 1,
          action: 'acquire',
          target: material.item,
          targetName: material.nome,
          quantity: material.faltante * 2, // Extra buffer for risk mitigation
          estimatedCost: material.custoParaComprar * 2,
          estimatedRevenue: 0,
          estimatedTime: '1-2 horas',
          dependencies: [],
          status: 'pending',
          notes: 'Buffer adicional para mitigar riscos de falta de material'
        });
      });
    });

    return steps;
  }

  private calculateMarketOpportunityResources(opportunity: any): ResourceRequirement[] {
    return [{
      resource: opportunity.item,
      resourceName: opportunity.itemName,
      quantityNeeded: opportunity.parameters?.recommendedQuantity || 1,
      quantityAvailable: 0,
      acquisitionPlan: {
        method: 'purchase',
        estimatedCost: opportunity.profitPotential * 0.3,
        timeRequired: '1-2 horas'
      }
    }];
  }

  private calculateRiskMitigationResources(scenarios: ProductionScenario[]): ResourceRequirement[] {
    const resources: ResourceRequirement[] = [];

    scenarios.forEach(scenario => {
      scenario.missingMaterials.forEach(material => {
        resources.push({
          resource: material.item,
          resourceName: material.nome,
          quantityNeeded: material.faltante * 2,
          quantityAvailable: material.quantidadeDisponivel,
          acquisitionPlan: {
            method: 'purchase',
            estimatedCost: material.custoParaComprar * 2,
            timeRequired: '1-2 horas'
          }
        });
      });
    });

    return resources;
  }

  private assessProductionRisk(scenario: ProductionScenario): RiskAssessment {
    const riskFactors = [];

    if (scenario.missingMaterials.length > 0) {
      riskFactors.push({
        factor: 'Materiais em falta',
        impact: 'high' as const,
        probability: 'medium' as const,
        mitigation: 'Adquirir materiais antes de iniciar produção'
      });
    }

    if (scenario.roiPercentage < 20) {
      riskFactors.push({
        factor: 'ROI baixo',
        impact: 'medium' as const,
        probability: 'high' as const,
        mitigation: 'Revisar custos e otimizar processo'
      });
    }

    return {
      overallRisk: riskFactors.length > 2 ? 'high' : riskFactors.length > 0 ? 'medium' : 'low',
      riskFactors,
      contingencyPlans: [
        {
          scenario: 'Falta de materiais críticos',
          response: 'Adiar produção e adquirir materiais',
          impact: 'Atraso de 1-2 dias'
        },
        {
          scenario: 'Preços de venda abaixo do esperado',
          response: 'Reter produção até melhores condições de mercado',
          impact: 'Redução de 10-20% no lucro'
        }
      ]
    };
  }

  private assessInventoryOptimizationRisk(): RiskAssessment {
    return {
      overallRisk: 'low',
      riskFactors: [
        {
          factor: 'Impacto operacional',
          impact: 'low',
          probability: 'low',
          mitigation: 'Implementar mudanças gradualmente'
        }
      ],
      contingencyPlans: [
        {
          scenario: 'Resistência à mudança',
          response: 'Treinamento e comunicação clara',
          impact: 'Atraso na implementação'
        }
      ]
    };
  }

  private assessMarketOpportunityRisk(opportunity: any): RiskAssessment {
    const riskLevel = opportunity.riskLevel === 'very_high' ? 'high' :
                     opportunity.riskLevel === 'high' ? 'medium' : 'low';

    return {
      overallRisk: riskLevel,
      riskFactors: [
        {
          factor: 'Volatilidade de mercado',
          impact: 'medium',
          probability: 'medium',
          mitigation: 'Monitorar condições de mercado continuamente'
        }
      ],
      contingencyPlans: [
        {
          scenario: 'Mudança súbita de mercado',
          response: 'Ajustar estratégia ou cancelar operação',
          impact: 'Perda limitada ao investimento inicial'
        }
      ]
    };
  }

  private assessRiskMitigationPlan(): RiskAssessment {
    return {
      overallRisk: 'very_low',
      riskFactors: [],
      contingencyPlans: [
        {
          scenario: 'Custo excessivo de materiais',
          response: 'Priorizar materiais mais críticos',
          impact: 'Implementação parcial do plano'
        }
      ]
    };
  }

  private createSchedule(planType: string): PlanSchedule {
    const now = new Date();
    const endDate = new Date(now);

    switch (planType) {
      case 'daily':
        endDate.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        endDate.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(now.getMonth() + 1);
        break;
    }

    return {
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      milestones: [
        {
          name: 'Início da execução',
          date: now.toISOString(),
          description: 'Início da execução do plano',
          completed: false
        },
        {
          name: 'Revisão intermediária',
          date: new Date((now.getTime() + endDate.getTime()) / 2).toISOString(),
          description: 'Revisão do progresso e ajustes',
          completed: false
        },
        {
          name: 'Conclusão',
          date: endDate.toISOString(),
          description: 'Conclusão do plano',
          completed: false
        }
      ],
      checkpoints: [
        {
          date: new Date((now.getTime() + endDate.getTime()) / 2).toISOString(),
          type: 'review',
          description: 'Revisar progresso e ajustar se necessário'
        }
      ]
    };
  }

  private calculateTotalDuration(steps: PlanStep[]): string {
    // Simplified duration calculation
    const totalSteps = steps.length;
    if (totalSteps <= 3) return '2-4 horas';
    if (totalSteps <= 6) return '4-8 horas';
    if (totalSteps <= 10) return '1-2 dias';
    return '2-5 dias';
  }

  private estimateProductionTime(recipe: any): string {
    const complexity = recipe.materiais.length;
    if (complexity <= 3) return '30-60 minutos';
    if (complexity <= 6) return '1-2 horas';
    return '2-4 horas';
  }

  private getTimeToActDuration(timeToAct: string): string {
    switch (timeToAct) {
      case 'immediate': return '1-4 horas';
      case 'short_term': return '1-3 dias';
      case 'medium_term': return '1-2 semanas';
      case 'long_term': return '1-4 semanas';
      default: return '1-2 dias';
    }
  }

  private calculateFeasibilityScore(plan: AutomatedPlan): number {
    let score = 100;

    // Reduce score based on resource availability
    plan.requiredResources.forEach(resource => {
      const availability = resource.quantityAvailable / resource.quantityNeeded;
      if (availability < 0.5) score -= 20;
      else if (availability < 1) score -= 10;
    });

    // Reduce score based on plan complexity
    if (plan.steps.length > 10) score -= 15;
    else if (plan.steps.length > 5) score -= 5;

    return Math.max(0, score);
  }

  private calculateRiskScore(riskAssessment: RiskAssessment): number {
    const riskLevels = { 'very_low': 100, 'low': 80, 'medium': 60, 'high': 40, 'very_high': 20 };
    return riskLevels[riskAssessment.overallRisk];
  }

  private calculateTimeEfficiencyScore(plan: AutomatedPlan): number {
    // Higher score for shorter duration plans
    if (plan.estimatedDuration.includes('horas')) return 100;
    if (plan.estimatedDuration.includes('1') && plan.estimatedDuration.includes('dia')) return 80;
    if (plan.estimatedDuration.includes('dias')) return 60;
    if (plan.estimatedDuration.includes('semana')) return 40;
    return 20;
  }

  private calculateResourceUtilizationScore(plan: AutomatedPlan): number {
    let score = 100;

    plan.requiredResources.forEach(resource => {
      if (resource.quantityAvailable === 0) score -= 20;
      else if (resource.quantityAvailable < resource.quantityNeeded) score -= 10;
    });

    return Math.max(0, score);
  }
}