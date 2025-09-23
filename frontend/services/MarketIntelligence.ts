import { InventoryItem } from '../types/inventory';

export interface MarketTrend {
  item: string;
  itemName: string;
  currentPrice: number;
  priceHistory: PricePoint[];
  trend: 'bullish' | 'bearish' | 'stable' | 'volatile';
  confidence: number;
  prediction: {
    nextWeekPrice: number;
    nextMonthPrice: number;
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  };
}

export interface PricePoint {
  timestamp: string;
  price: number;
  volume?: number;
}

export interface MarketOpportunity {
  id: string;
  type: 'arbitrage' | 'supply_gap' | 'demand_surge' | 'price_inefficiency';
  item: string;
  itemName: string;
  description: string;
  profitPotential: number;
  timeToAct: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  actionRequired: string;
  parameters: Record<string, any>;
}

export interface CompetitorAnalysis {
  category: string;
  averagePrice: number;
  marketShare: Record<string, number>;
  priceDistribution: {
    low: number;
    average: number;
    high: number;
  };
  competitivePosition: 'price_leader' | 'premium_player' | 'value_provider' | 'niche_player';
  recommendations: string[];
}

export interface DemandForecast {
  item: string;
  itemName: string;
  currentDemand: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  predictedDemand: {
    nextWeek: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    nextMonth: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    seasonalFactor: number;
  };
  demandDrivers: string[];
  correlatedItems: Array<{
    item: string;
    correlation: number;
  }>;
}

export interface MarketReport {
  generatedAt: string;
  marketOverview: {
    totalValue: number;
    topGainers: Array<{ item: string; gain: number }>;
    topLosers: Array<{ item: string; loss: number }>;
    volatilityIndex: number;
    marketSentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  };
  trends: MarketTrend[];
  opportunities: MarketOpportunity[];
  competitorAnalysis: CompetitorAnalysis[];
  demandForecasts: DemandForecast[];
}

export class MarketIntelligence {
  private priceList: Record<string, { preco_min: number; preco_max: number; nome: string }>;
  private inventory: InventoryItem[];
  private historicalData: Record<string, PricePoint[]> = {};

  constructor(
    priceList: Record<string, { preco_min: number; preco_max: number; nome: string }>,
    inventory: InventoryItem[]
  ) {
    this.priceList = priceList;
    this.inventory = inventory;
    this.initializeHistoricalData();
  }

  /**
   * Generate comprehensive market intelligence report
   */
  public generateMarketReport(): MarketReport {
    const trends = this.analyzeMarketTrends();
    const opportunities = this.identifyMarketOpportunities();
    const competitorAnalysis = this.performCompetitorAnalysis();
    const demandForecasts = this.generateDemandForecasts();

    return {
      generatedAt: new Date().toISOString(),
      marketOverview: this.calculateMarketOverview(trends),
      trends,
      opportunities,
      competitorAnalysis,
      demandForecasts
    };
  }

  /**
   * Analyze market trends for all items
   */
  private analyzeMarketTrends(): MarketTrend[] {
    const trends: MarketTrend[] = [];

    Object.entries(this.priceList).forEach(([itemId, priceData]) => {
      const currentPrice = (priceData.preco_min + priceData.preco_max) / 2;
      const priceHistory = this.getOrGeneratePriceHistory(itemId, currentPrice);
      const trend = this.calculateTrend(priceHistory);
      const confidence = this.calculateTrendConfidence(priceHistory, trend);
      const prediction = this.predictFuturePrices(priceHistory, trend);

      trends.push({
        item: itemId,
        itemName: priceData.nome,
        currentPrice,
        priceHistory,
        trend,
        confidence,
        prediction
      });
    });

    return trends.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Identify market opportunities
   */
  private identifyMarketOpportunities(): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = [];

    // Supply gap opportunities
    opportunities.push(...this.findSupplyGapOpportunities());

    // Price inefficiency opportunities
    opportunities.push(...this.findPriceInefficiencies());

    // Demand surge opportunities
    opportunities.push(...this.findDemandSurgeOpportunities());

    // Arbitrage opportunities
    opportunities.push(...this.findArbitrageOpportunities());

    return opportunities.sort((a, b) => b.profitPotential - a.profitPotential);
  }

  /**
   * Perform competitor analysis by category
   */
  private performCompetitorAnalysis(): CompetitorAnalysis[] {
    const categories = this.getCategories();
    const analysis: CompetitorAnalysis[] = [];

    categories.forEach(category => {
      const categoryItems = this.getItemsByCategory(category);
      const averagePrice = this.calculateCategoryAveragePrice(categoryItems);
      const priceDistribution = this.calculatePriceDistribution(categoryItems);
      const competitivePosition = this.determineCompetitivePosition(categoryItems, averagePrice);
      const recommendations = this.generateCompetitiveRecommendations(competitivePosition, priceDistribution);

      analysis.push({
        category,
        averagePrice,
        marketShare: this.calculateMarketShare(categoryItems),
        priceDistribution,
        competitivePosition,
        recommendations
      });
    });

    return analysis;
  }

  /**
   * Generate demand forecasts
   */
  private generateDemandForecasts(): DemandForecast[] {
    const forecasts: DemandForecast[] = [];

    Object.entries(this.priceList).forEach(([itemId, priceData]) => {
      const currentDemand = this.assessCurrentDemand(itemId);
      const predictedDemand = this.predictDemand(itemId, currentDemand);
      const demandDrivers = this.identifyDemandDrivers(itemId);
      const correlatedItems = this.findCorrelatedItems(itemId);

      forecasts.push({
        item: itemId,
        itemName: priceData.nome,
        currentDemand,
        predictedDemand,
        demandDrivers,
        correlatedItems
      });
    });

    return forecasts.sort((a, b) => {
      const demandOrder = { 'very_high': 5, 'high': 4, 'medium': 3, 'low': 2, 'very_low': 1 };
      return demandOrder[b.predictedDemand.nextWeek] - demandOrder[a.predictedDemand.nextWeek];
    });
  }

  /**
   * Find supply gap opportunities
   */
  private findSupplyGapOpportunities(): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = [];

    this.inventory.forEach(item => {
      if (item.quantidade === 0) {
        const priceData = this.priceList[item.id];
        if (priceData && priceData.preco_max > 5) {
          opportunities.push({
            id: `supply_gap_${item.id}`,
            type: 'supply_gap',
            item: item.id,
            itemName: item.displayName,
            description: `Item valioso em falta no estoque. Preço médio: $${((priceData.preco_min + priceData.preco_max) / 2).toFixed(2)}`,
            profitPotential: priceData.preco_max * 10, // Estimate 10 units potential
            timeToAct: 'immediate',
            riskLevel: 'low',
            actionRequired: 'Adquirir ou produzir este item para aproveitar a demanda',
            parameters: {
              avgPrice: (priceData.preco_min + priceData.preco_max) / 2,
              recommendedQuantity: 10
            }
          });
        }
      }
    });

    return opportunities;
  }

  /**
   * Find price inefficiencies
   */
  private findPriceInefficiencies(): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = [];

    Object.entries(this.priceList).forEach(([itemId, priceData]) => {
      const priceRange = priceData.preco_max - priceData.preco_min;
      const avgPrice = (priceData.preco_min + priceData.preco_max) / 2;
      const volatility = priceRange / avgPrice;

      if (volatility > 0.4) { // High price volatility
        opportunities.push({
          id: `price_inefficiency_${itemId}`,
          type: 'price_inefficiency',
          item: itemId,
          itemName: priceData.nome,
          description: `Alta volatilidade de preços (${(volatility * 100).toFixed(1)}%). Oportunidade de arbitragem temporal.`,
          profitPotential: priceRange * 5, // Estimate 5 units profit potential
          timeToAct: 'short_term',
          riskLevel: 'medium',
          actionRequired: 'Comprar nos momentos de preço baixo e vender nos picos',
          parameters: {
            volatility,
            minPrice: priceData.preco_min,
            maxPrice: priceData.preco_max,
            avgPrice
          }
        });
      }
    });

    return opportunities;
  }

  /**
   * Find demand surge opportunities
   */
  private findDemandSurgeOpportunities(): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = [];

    // High-value items with good inventory position
    this.inventory.forEach(item => {
      const priceData = this.priceList[item.id];
      if (priceData && item.quantidade > 20 && priceData.preco_max > 10) {
        opportunities.push({
          id: `demand_surge_${item.id}`,
          type: 'demand_surge',
          item: item.id,
          itemName: item.displayName,
          description: `Alto estoque de item valioso. Posição forte para atender demanda crescente.`,
          profitPotential: item.quantidade * priceData.preco_max * 0.3, // 30% margin
          timeToAct: 'medium_term',
          riskLevel: 'low',
          actionRequired: 'Manter estoque e aguardar aumentos de demanda para maximizar preços',
          parameters: {
            currentStock: item.quantidade,
            maxPrice: priceData.preco_max,
            estimatedMargin: 0.3
          }
        });
      }
    });

    return opportunities;
  }

  /**
   * Find arbitrage opportunities
   */
  private findArbitrageOpportunities(): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = [];

    // Cross-category price differences
    const categories = this.getCategories();

    categories.forEach(category => {
      const categoryItems = this.getItemsByCategory(category);
      const avgCategoryPrice = this.calculateCategoryAveragePrice(categoryItems);

      categoryItems.forEach(item => {
        const itemPrice = (item.preco_min + item.preco_max) / 2;
        const priceDeviation = (itemPrice - avgCategoryPrice) / avgCategoryPrice;

        if (Math.abs(priceDeviation) > 0.5) { // 50% deviation from category average
          opportunities.push({
            id: `arbitrage_${item.id}`,
            type: 'arbitrage',
            item: item.id,
            itemName: item.nome,
            description: `Preço ${priceDeviation > 0 ? 'acima' : 'abaixo'} da média da categoria (${(Math.abs(priceDeviation) * 100).toFixed(1)}%)`,
            profitPotential: Math.abs(itemPrice - avgCategoryPrice) * 5,
            timeToAct: 'immediate',
            riskLevel: priceDeviation > 0 ? 'low' : 'medium',
            actionRequired: priceDeviation > 0 ? 'Vender para aproveitar preço premium' : 'Comprar enquanto preço está baixo',
            parameters: {
              itemPrice,
              categoryAverage: avgCategoryPrice,
              deviation: priceDeviation
            }
          });
        }
      });
    });

    return opportunities;
  }

  /**
   * Helper methods for calculations
   */
  private initializeHistoricalData(): void {
    // Generate synthetic historical data for demonstration
    // In production, this would come from actual trading data
    Object.entries(this.priceList).forEach(([itemId, priceData]) => {
      this.historicalData[itemId] = this.generateSyntheticPriceHistory(priceData);
    });
  }

  private generateSyntheticPriceHistory(priceData: { preco_min: number; preco_max: number }): PricePoint[] {
    const points: PricePoint[] = [];
    const avgPrice = (priceData.preco_min + priceData.preco_max) / 2;
    const volatility = (priceData.preco_max - priceData.preco_min) / avgPrice;

    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Generate price with some random walk and mean reversion
      const randomFactor = (Math.random() - 0.5) * volatility;
      const meanReversion = (avgPrice - (points[points.length - 1]?.price || avgPrice)) * 0.1;
      const price = Math.max(
        priceData.preco_min,
        Math.min(
          priceData.preco_max,
          (points[points.length - 1]?.price || avgPrice) + avgPrice * randomFactor + meanReversion
        )
      );

      points.push({
        timestamp: date.toISOString(),
        price: parseFloat(price.toFixed(2))
      });
    }

    return points;
  }

  private getOrGeneratePriceHistory(itemId: string, currentPrice: number): PricePoint[] {
    return this.historicalData[itemId] || [];
  }

  private calculateTrend(priceHistory: PricePoint[]): 'bullish' | 'bearish' | 'stable' | 'volatile' {
    if (priceHistory.length < 2) return 'stable';

    const firstPrice = priceHistory[0].price;
    const lastPrice = priceHistory[priceHistory.length - 1].price;
    const change = (lastPrice - firstPrice) / firstPrice;

    // Calculate volatility
    const prices = priceHistory.map(p => p.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / avgPrice;

    if (volatility > 0.2) return 'volatile';
    if (change > 0.1) return 'bullish';
    if (change < -0.1) return 'bearish';
    return 'stable';
  }

  private calculateTrendConfidence(priceHistory: PricePoint[], trend: string): number {
    if (priceHistory.length < 5) return 0.3;

    // Calculate confidence based on trend consistency
    const prices = priceHistory.map(p => p.price);
    let consistentMoves = 0;

    for (let i = 1; i < prices.length; i++) {
      const direction = prices[i] > prices[i - 1];
      const expectedDirection = trend === 'bullish';

      if (trend === 'stable' || trend === 'volatile') {
        consistentMoves += 0.5; // Neutral for stable/volatile trends
      } else if (direction === expectedDirection) {
        consistentMoves++;
      }
    }

    return Math.min(1.0, consistentMoves / (prices.length - 1));
  }

  private predictFuturePrices(priceHistory: PricePoint[], trend: string): { nextWeekPrice: number; nextMonthPrice: number; recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' } {
    if (priceHistory.length === 0) {
      return { nextWeekPrice: 0, nextMonthPrice: 0, recommendation: 'hold' };
    }

    const currentPrice = priceHistory[priceHistory.length - 1].price;
    let weekMultiplier = 1;
    let monthMultiplier = 1;
    let recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' = 'hold';

    switch (trend) {
      case 'bullish':
        weekMultiplier = 1.05;
        monthMultiplier = 1.15;
        recommendation = 'buy';
        break;
      case 'bearish':
        weekMultiplier = 0.95;
        monthMultiplier = 0.85;
        recommendation = 'sell';
        break;
      case 'volatile':
        weekMultiplier = 1 + (Math.random() - 0.5) * 0.1;
        monthMultiplier = 1 + (Math.random() - 0.5) * 0.2;
        recommendation = 'hold';
        break;
      default:
        recommendation = 'hold';
    }

    return {
      nextWeekPrice: parseFloat((currentPrice * weekMultiplier).toFixed(2)),
      nextMonthPrice: parseFloat((currentPrice * monthMultiplier).toFixed(2)),
      recommendation
    };
  }

  private calculateMarketOverview(trends: MarketTrend[]): MarketReport['marketOverview'] {
    const totalValue = this.inventory.reduce((sum, item) => {
      const priceData = this.priceList[item.id];
      return sum + (priceData ? ((priceData.preco_min + priceData.preco_max) / 2) * item.quantidade : 0);
    }, 0);

    const topGainers = trends
      .filter(t => t.trend === 'bullish')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(t => ({ item: t.itemName, gain: t.confidence * 100 }));

    const topLosers = trends
      .filter(t => t.trend === 'bearish')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(t => ({ item: t.itemName, loss: t.confidence * 100 }));

    const volatilityIndex = trends.reduce((sum, t) => sum + (t.trend === 'volatile' ? 1 : 0), 0) / trends.length;

    const bullishCount = trends.filter(t => t.trend === 'bullish').length;
    const bearishCount = trends.filter(t => t.trend === 'bearish').length;
    const netSentiment = (bullishCount - bearishCount) / trends.length;

    let marketSentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    if (netSentiment > 0.3) marketSentiment = 'very_bullish';
    else if (netSentiment > 0.1) marketSentiment = 'bullish';
    else if (netSentiment > -0.1) marketSentiment = 'neutral';
    else if (netSentiment > -0.3) marketSentiment = 'bearish';
    else marketSentiment = 'very_bearish';

    return {
      totalValue,
      topGainers,
      topLosers,
      volatilityIndex,
      marketSentiment
    };
  }

  private getCategories(): string[] {
    // Extract categories from price list or use default categories
    return ['FAZENDAS', 'ESTABLOS', 'FERRARIAS', 'ALIMENTACAO', 'ARMARIAS', 'FOGOS'];
  }

  private getItemsByCategory(category: string): Array<{ id: string; preco_min: number; preco_max: number; nome: string }> {
    return Object.entries(this.priceList)
      .filter(([_, item]) => item.nome.toLowerCase().includes(category.toLowerCase()) ||
                            category === 'FAZENDAS' && (item.nome.includes('animal') || item.nome.includes('leite') || item.nome.includes('carne')))
      .map(([id, item]) => ({ id, ...item }));
  }

  private calculateCategoryAveragePrice(items: Array<{ preco_min: number; preco_max: number }>): number {
    if (items.length === 0) return 0;
    const avgPrices = items.map(item => (item.preco_min + item.preco_max) / 2);
    return avgPrices.reduce((sum, price) => sum + price, 0) / avgPrices.length;
  }

  private calculatePriceDistribution(items: Array<{ preco_min: number; preco_max: number }>): { low: number; average: number; high: number } {
    if (items.length === 0) return { low: 0, average: 0, high: 0 };

    const avgPrices = items.map(item => (item.preco_min + item.preco_max) / 2).sort((a, b) => a - b);

    return {
      low: avgPrices[0],
      average: avgPrices[Math.floor(avgPrices.length / 2)],
      high: avgPrices[avgPrices.length - 1]
    };
  }

  private determineCompetitivePosition(items: Array<{ preco_min: number; preco_max: number }>, avgPrice: number): 'price_leader' | 'premium_player' | 'value_provider' | 'niche_player' {
    const distribution = this.calculatePriceDistribution(items);

    if (avgPrice <= distribution.low * 1.1) return 'price_leader';
    if (avgPrice >= distribution.high * 0.9) return 'premium_player';
    if (avgPrice <= distribution.average * 0.9) return 'value_provider';
    return 'niche_player';
  }

  private generateCompetitiveRecommendations(position: string, distribution: any): string[] {
    const recommendations: string[] = [];

    switch (position) {
      case 'price_leader':
        recommendations.push('Manter vantagem de custo para sustentar preços baixos');
        recommendations.push('Focar em volume e eficiência operacional');
        break;
      case 'premium_player':
        recommendations.push('Investir em qualidade e diferenciação');
        recommendations.push('Comunicar valor agregado para justificar preços premium');
        break;
      case 'value_provider':
        recommendations.push('Equilibrar preço e qualidade');
        recommendations.push('Focar em otimização de custos sem sacrificar qualidade');
        break;
      default:
        recommendations.push('Definir estratégia de posicionamento clara');
        recommendations.push('Analisar oportunidades de diferenciação');
    }

    return recommendations;
  }

  private calculateMarketShare(items: Array<{ id: string }>): Record<string, number> {
    // Simplified market share calculation
    const totalItems = items.length;
    const marketShare: Record<string, number> = {};

    items.forEach(item => {
      marketShare[item.id] = 1 / totalItems; // Equal share for simplicity
    });

    return marketShare;
  }

  private assessCurrentDemand(itemId: string): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    const priceData = this.priceList[itemId];
    if (!priceData) return 'low';

    const avgPrice = (priceData.preco_min + priceData.preco_max) / 2;
    const priceRange = priceData.preco_max - priceData.preco_min;
    const volatility = priceRange / avgPrice;

    // High volatility and high price suggests high demand
    if (avgPrice > 20 && volatility > 0.3) return 'very_high';
    if (avgPrice > 10 && volatility > 0.2) return 'high';
    if (avgPrice > 5) return 'medium';
    if (avgPrice > 1) return 'low';
    return 'very_low';
  }

  private predictDemand(itemId: string, currentDemand: string): {
    nextWeek: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    nextMonth: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    seasonalFactor: number;
  } {
    // Simplified demand prediction
    const seasonalFactor = Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 30)) * 0.2 + 1; // Monthly cycle

    return {
      nextWeek: currentDemand, // Assume stable short-term
      nextMonth: currentDemand, // Simplified for demo
      seasonalFactor
    };
  }

  private identifyDemandDrivers(itemId: string): string[] {
    const priceData = this.priceList[itemId];
    if (!priceData) return [];

    const drivers: string[] = [];

    if (priceData.nome.includes('animal') || priceData.nome.includes('leite')) {
      drivers.push('Demanda por produtos agropecuários');
      drivers.push('Sazonalidade da produção animal');
    }

    if (priceData.nome.includes('ferro') || priceData.nome.includes('metal')) {
      drivers.push('Construção e infraestrutura');
      drivers.push('Demanda industrial');
    }

    if (drivers.length === 0) {
      drivers.push('Demanda geral do mercado');
    }

    return drivers;
  }

  private findCorrelatedItems(itemId: string): Array<{ item: string; correlation: number }> {
    // Simplified correlation analysis
    const correlations: Array<{ item: string; correlation: number }> = [];
    const baseItem = this.priceList[itemId];

    if (!baseItem) return correlations;

    Object.entries(this.priceList).forEach(([id, item]) => {
      if (id === itemId) return;

      // Simple correlation based on price similarity and name similarity
      const priceCorrelation = 1 - Math.abs((baseItem.preco_min + baseItem.preco_max) - (item.preco_min + item.preco_max)) / Math.max(baseItem.preco_max, item.preco_max);
      const nameCorrelation = this.calculateNameSimilarity(baseItem.nome, item.nome);
      const correlation = (priceCorrelation + nameCorrelation) / 2;

      if (correlation > 0.3) {
        correlations.push({
          item: item.nome,
          correlation: parseFloat(correlation.toFixed(2))
        });
      }
    });

    return correlations.sort((a, b) => b.correlation - a.correlation).slice(0, 3);
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    const words1 = name1.toLowerCase().split(' ');
    const words2 = name2.toLowerCase().split(' ');

    let commonWords = 0;
    words1.forEach(word1 => {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        commonWords++;
      }
    });

    return commonWords / Math.max(words1.length, words2.length);
  }
}