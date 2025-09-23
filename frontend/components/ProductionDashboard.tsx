'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Target,
  Lightbulb,
  Package,
  ShoppingCart,
  Settings,
  RefreshCw,
  Filter,
  ArrowUpDown
} from 'lucide-react';

import { ProductionOptimizer, ProductionScenario, OptimizationSettings as OptimizerSettings } from '../services/ProductionOptimizer';
import { SmartRecommendationEngine, SmartRecommendation } from '../services/SmartRecommendationEngine';
import { useInventoryManager } from '../hooks/useInventoryManager';
import { useFirmAccess } from '../hooks/useFirmAccess';
import OptimizationSettings from './OptimizationSettings';

interface ProductionDashboardProps {
  recipes: any[];
  priceList: Record<string, { preco_min: number; preco_max: number; nome: string }>;
}

interface DashboardMetrics {
  totalProfitPotential: number;
  immediateOpportunities: number;
  inventoryValue: number;
  productionEfficiency: number;
  topRecommendation: SmartRecommendation | null;
}

export const ProductionDashboard: React.FC<ProductionDashboardProps> = ({
  recipes,
  priceList
}) => {

  const { accessibleFirms, loading: firmsLoading } = useFirmAccess();
  const [enhancedPriceList, setEnhancedPriceList] = useState(priceList);
  const [nameMappings, setNameMappings] = useState<Record<string, string>>({});
  const [globalNames, setGlobalNames] = useState<Record<string, string>>({});
  const [combinedInventory, setCombinedInventory] = useState<any[]>([]);

  // Define all firms we want to pull inventory from
  const inventoryFirms = React.useMemo(() => {
    const firms = [
      {
        id: 'fazenda-cabra-da-peste',
        name: 'Fazenda Cabra da Peste',
        channelId: '1414735729082499072',
        display: { itemTranslations: 'global' }
      },
      {
        id: 'bercario',
        name: 'Berçário',
        channelId: '1412325130926948362',
        display: { itemTranslations: 'global' }
      },
      {
        id: 'veterinaria',
        name: 'Veterinária',
        channelId: '1406811401036497036',
        display: { itemTranslations: 'global' }
      },
      {
        id: 'ferrovia',
        name: 'Ferrovia',
        channelId: '1414735729082499072', // Update with correct channel if different
        display: { itemTranslations: 'global' }
      }
    ];

    // Add any accessible firms that aren't in the default list
    if (accessibleFirms && accessibleFirms.length > 0) {
      accessibleFirms.forEach(firm => {
        if (!firms.find(f => f.id === firm.id)) {
          firms.push(firm);
        }
      });
    }

    return firms;
  }, [accessibleFirms]);

  // Load inventory from main firm (for now, we'll enhance this later)
  const mainFirm = inventoryFirms[0];
  const {
    inventoryData: inventory,
    loading: inventoryLoading,
    error: inventoryError
  } = useInventoryManager({ firm: mainFirm });

  // State management
  const [scenarios, setScenarios] = useState<ProductionScenario[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProfitPotential: 0,
    immediateOpportunities: 0,
    inventoryValue: 0,
    productionEfficiency: 0,
    topRecommendation: null
  });

  const [settings, setSettings] = useState<OptimizerSettings>({
    minimumProfitMargin: 0.15,
    preferredCategories: ['CAIXAS', 'VETERINARIA', 'ARTESANATO'],
    riskTolerance: 'moderate',
    maxInvestment: 10000,
    priorityMetric: 'profit'
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'scenarios' | 'market'>('overview');
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'profit' | 'roi' | 'viability'>('profit');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Load global naming system (simplified)
  useEffect(() => {
    loadGlobalNames();
  }, []);

  const loadGlobalNames = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/localization/translations');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.custom_overrides) {
          setGlobalNames(data.data.custom_overrides);
        }
      }
    } catch (error) {
      console.log('⚠️ Global naming system not available, using fallback');
      // Set some basic fallbacks
      setGlobalNames({
        'corn': 'milho',
        'wood': 'madeira',
        'iron': 'ferro',
        'coal': 'carvao'
      });
    }
  };

  // Load inventory from multiple channels
  useEffect(() => {
    if (!inventory?.items) return;

    // For now, use the main firm's inventory
    const items = Object.values(inventory.items);

    // Apply name mappings to inventory items
    const mappedItems = items.map(item => {
      // Check if there's a name mapping for this item
      const mappedName = nameMappings[item.id] ||
                        nameMappings[item.nome] ||
                        globalNames[item.id] ||
                        globalNames[item.nome];

      if (mappedName) {
        return {
          ...item,
          mappedId: mappedName,
          originalId: item.id
        };
      }
      return item;
    });

    setCombinedInventory(mappedItems);
  }, [inventory, nameMappings, globalNames]);

  // Transform inventory data to array format expected by optimizers
  const inventoryArray = useMemo(() => {
    // Use combined inventory if available
    if (combinedInventory.length > 0) {
      return combinedInventory;
    }

    // Use main inventory if available
    if (inventory?.items && Object.keys(inventory.items).length > 0) {
      const items = Object.values(inventory.items);
      return items;
    }

    // Always use mock data if no real inventory - use consistent Portuguese names
    return [
      { id: 'milho', nome: 'milho', displayName: 'Milho', quantidade: 1500, categoria: 'plantas' },
      { id: 'wood', nome: 'wood', displayName: 'Madeira', quantidade: 800, categoria: 'materiais' },
      { id: 'ferro', nome: 'ferro', displayName: 'Ferro', quantidade: 300, categoria: 'materiais' },
      { id: 'carvao', nome: 'carvao', displayName: 'Carvão', quantidade: 400, categoria: 'materiais' },
      { id: 'quartzo', nome: 'quartzo', displayName: 'Quartzo', quantidade: 150, categoria: 'materiais' },
      { id: 'algodao', nome: 'algodao', displayName: 'Algodão', quantidade: 200, categoria: 'materiais' },
      { id: 'trigo', nome: 'trigo', displayName: 'Trigo', quantidade: 1200, categoria: 'plantas' },
      { id: 'junco', nome: 'junco', displayName: 'Junco', quantidade: 900, categoria: 'plantas' }
    ];
  }, [combinedInventory, inventory?.items]);

  // Initialize optimizers
  const optimizer = useMemo(() => {
    if (inventoryArray.length === 0 || !recipes || recipes.length === 0) {
      return null;
    }
    return new ProductionOptimizer(enhancedPriceList, inventoryArray, recipes, settings);
  }, [inventoryArray, recipes, enhancedPriceList, settings]);

  const recommendationEngine = useMemo(() => {
    if (!optimizer) return null;
    return new SmartRecommendationEngine(optimizer, inventoryArray, enhancedPriceList, recipes);
  }, [optimizer, inventoryArray, enhancedPriceList, recipes]);

  // Load data with timeout
  useEffect(() => {
    if (!optimizer || !recommendationEngine) {
      return;
    }

    setLoading(true);

    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⏰ Data loading timeout, using partial data');
      setLoading(false);
    }, 5000);

    try {
      // Get optimization scenarios
      const optimizedScenarios = optimizer.optimizeProduction();
      setScenarios(optimizedScenarios);

      // Get smart recommendations
      const smartRecommendations = recommendationEngine.generateRecommendations();
      setRecommendations(smartRecommendations);

      // Calculate metrics
      const newMetrics = calculateMetrics(optimizedScenarios, smartRecommendations, inventoryArray, enhancedPriceList);
      setMetrics(newMetrics);

    } catch (error) {
      console.error('❌ Error loading production data:', error);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  }, [optimizer, recommendationEngine, inventoryArray, enhancedPriceList]);

  // Filter and sort scenarios
  const filteredScenarios = useMemo(() => {
    let filtered = scenarios.filter(scenario =>
      filterCategory === 'all' || scenario.recipe.categoria === filterCategory
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'profit':
          return b.totalProfit - a.totalProfit;
        case 'roi':
          return b.roiPercentage - a.roiPercentage;
        case 'viability':
          const viabilityOrder = { 'high': 3, 'medium': 2, 'low': 1, 'impossible': 0 };
          return viabilityOrder[b.productionViability] - viabilityOrder[a.productionViability];
        default:
          return 0;
      }
    });
  }, [scenarios, sortBy, filterCategory]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = [...new Set(recipes.map(r => r.categoria))];
    return ['all', ...cats];
  }, [recipes]);

  if (inventoryError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-red-600">
          <AlertTriangle className="h-8 w-8" />
          <div className="text-center">
            <p className="font-medium">Erro ao carregar dados do inventário</p>
            <p className="text-sm text-gray-600">{inventoryError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (firmsLoading || inventoryLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Analisando oportunidades de produção...
        </div>
      </div>
    );
  }

  if (!optimizer || !recommendationEngine) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p>Aguardando dados do inventário e receitas para análise...</p>
            <p className="text-sm mt-1 text-yellow-600">
              Inventário: {inventoryArray.length} itens • Receitas: {recipes.length}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sistema de Otimização de Produção</h1>
            <p className="text-blue-100 mt-1">
              Análise inteligente para maximizar lucros e eficiência
            </p>
          </div>
          <div className="text-right">
            <div className="text-blue-100 text-sm">
              {inventoryArray.length} itens no inventário • {recipes.length} receitas
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          title="Potencial de Lucro"
          value={`$${metrics.totalProfitPotential.toFixed(2)}`}
          change={metrics.totalProfitPotential > 1000 ? 'high' : 'medium'}
          color="green"
        />
        <MetricCard
          icon={Target}
          title="Oportunidades Imediatas"
          value={metrics.immediateOpportunities.toString()}
          change={metrics.immediateOpportunities > 5 ? 'high' : 'medium'}
          color="blue"
        />
        <MetricCard
          icon={Package}
          title="Valor do Inventário"
          value={`$${metrics.inventoryValue.toFixed(2)}`}
          change="neutral"
          color="purple"
        />
        <MetricCard
          icon={BarChart3}
          title="Eficiência"
          value={`${metrics.productionEfficiency.toFixed(1)}%`}
          change={metrics.productionEfficiency > 75 ? 'high' : 'medium'}
          color="orange"
        />
      </div>

      {/* Top Recommendation Alert */}
      {metrics.topRecommendation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">
                {metrics.topRecommendation.title}
              </h3>
              <p className="text-green-800 mt-1">
                {metrics.topRecommendation.description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-green-700">
                <span>💰 Lucro: ${metrics.topRecommendation.impact.profitPotential.toFixed(2)}</span>
                <span>⏱️ Tempo: {metrics.topRecommendation.impact.timeToExecute}</span>
                <span>📊 Risco: {metrics.topRecommendation.impact.riskLevel}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
            { id: 'recommendations', label: 'Recomendações', icon: Lightbulb },
            { id: 'scenarios', label: 'Cenários', icon: Target },
            { id: 'market', label: 'Mercado', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab
            scenarios={filteredScenarios.slice(0, 5)}
            recommendations={recommendations.slice(0, 3)}
            metrics={metrics}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab
            recommendations={recommendations}
            optimizer={optimizer}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenariosTab
            scenarios={filteredScenarios}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            categories={categories}
          />
        )}

        {activeTab === 'market' && (
          <MarketTab
            priceList={priceList}
            inventory={inventory}
            scenarios={scenarios}
          />
        )}
      </div>

      {/* Settings Component */}
      <OptimizationSettings
        currentPrices={enhancedPriceList}
        onPriceUpdate={setEnhancedPriceList}
        onNameMappingUpdate={setNameMappings}
      />
    </div>
  );
};

// Helper components
interface MetricCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: string;
  change: 'high' | 'medium' | 'low' | 'neutral';
  color: 'green' | 'blue' | 'purple' | 'orange';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, title, value, change, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  const changeClasses = {
    high: 'text-green-600',
    medium: 'text-yellow-600',
    low: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <Icon className="h-6 w-6" />
        <span className={`text-xs font-medium ${changeClasses[change]}`}>
          {change === 'high' ? '↗️' : change === 'medium' ? '→' : change === 'low' ? '↘️' : '○'}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{title}</p>
      </div>
    </div>
  );
};

// Tab Components
const OverviewTab: React.FC<{
  scenarios: ProductionScenario[];
  recommendations: SmartRecommendation[];
  metrics: DashboardMetrics;
}> = ({ scenarios, recommendations, metrics }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Top Oportunidades</h3>
      <div className="space-y-4">
        {scenarios.map((scenario, index) => (
          <div key={scenario.recipe.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium">{scenario.recipe.nome}</h4>
              <p className="text-sm text-gray-600">
                Lucro: ${scenario.totalProfit.toFixed(2)} | ROI: {scenario.roiPercentage.toFixed(1)}%
              </p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              scenario.productionViability === 'high' ? 'bg-green-100 text-green-800' :
              scenario.productionViability === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {scenario.productionViability}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Recomendações Urgentes</h3>
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div key={rec.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
            <div className={`p-1 rounded-full ${
              rec.priority === 'urgent' ? 'bg-red-100' :
              rec.priority === 'high' ? 'bg-orange-100' :
              'bg-blue-100'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                rec.priority === 'urgent' ? 'text-red-600' :
                rec.priority === 'high' ? 'text-orange-600' :
                'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">{rec.title}</h4>
              <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RecommendationsTab: React.FC<{
  recommendations: SmartRecommendation[];
  optimizer: ProductionOptimizer;
}> = ({ recommendations, optimizer }) => (
  <div className="space-y-4">
    {recommendations.map((rec) => (
      <div key={rec.id} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                rec.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {rec.priority.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">{rec.category.replace('_', ' ').toUpperCase()}</span>
            </div>
            <h3 className="text-lg font-semibold">{rec.title}</h3>
            <p className="text-gray-600 mt-1">{rec.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">${rec.impact.profitPotential.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Lucro Potencial</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{rec.impact.timeToExecute}</p>
            <p className="text-sm text-gray-600">Tempo</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-semibold ${
              rec.impact.riskLevel === 'low' ? 'text-green-600' :
              rec.impact.riskLevel === 'medium' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {rec.impact.riskLevel.toUpperCase()}
            </p>
            <p className="text-sm text-gray-600">Risco</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{rec.impact.resourcesRequired.length}</p>
            <p className="text-sm text-gray-600">Recursos</p>
          </div>
        </div>

        {rec.impact.resourcesRequired.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Recursos Necessários:</h4>
            <div className="flex flex-wrap gap-2">
              {rec.impact.resourcesRequired.map((resource, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {resource}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <span className="font-medium">Tempo:</span> {rec.impact.timeToExecute} |
          <span className="font-medium ml-2">Risco:</span> {rec.impact.riskLevel}
        </div>
      </div>
    ))}
  </div>
);

const ScenariosTab: React.FC<{
  scenarios: ProductionScenario[];
  sortBy: string;
  setSortBy: (sort: any) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  categories: string[];
}> = ({ scenarios, sortBy, setSortBy, filterCategory, setFilterCategory, categories }) => (
  <div className="space-y-4">
    {/* Filters */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Todas Categorias' : cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-gray-500" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="profit">Maior Lucro</option>
          <option value="roi">Maior ROI</option>
          <option value="viability">Melhor Viabilidade</option>
        </select>
      </div>
    </div>

    {/* Scenarios Table */}
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Receita
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Categoria
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lucro Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ROI
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Produção
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Viabilidade
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {scenarios.map((scenario) => (
            <tr key={scenario.recipe.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">{scenario.recipe.nome}</div>
                  <div className="text-sm text-gray-500">Produz {scenario.recipe.produz} unidades</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {scenario.recipe.categoria}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">${scenario.totalProfit.toFixed(2)}</div>
                <div className="text-sm text-gray-500">${scenario.profitPerUnit.toFixed(2)}/unidade</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`text-sm font-medium ${
                  scenario.roiPercentage > 50 ? 'text-green-600' :
                  scenario.roiPercentage > 20 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {scenario.roiPercentage.toFixed(1)}%
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{scenario.recommendedProduction} unidades</div>
                <div className="text-sm text-gray-500">Máx: {scenario.totalPossibleProduction}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  scenario.productionViability === 'high' ? 'bg-green-100 text-green-800' :
                  scenario.productionViability === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  scenario.productionViability === 'low' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {scenario.productionViability}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="text-gray-600">
                  {scenario.missingMaterials.length > 0 ? (
                    <span className="text-red-600">
                      Faltam {scenario.missingMaterials.length} materiais
                    </span>
                  ) : (
                    <span className="text-green-600">
                      ✅ Pronto para produzir
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MarketTab: React.FC<{
  priceList: Record<string, { preco_min: number; preco_max: number; nome: string }>;
  inventory: any[];
  scenarios: ProductionScenario[];
}> = ({ priceList, inventory, scenarios }) => {
  const marketData = Object.entries(priceList)
    .map(([id, data]) => {
      const avgPrice = (data.preco_min + data.preco_max) / 2;
      const inventoryItem = inventory.find(item => item.id === id);
      const quantity = inventoryItem ? inventoryItem.quantidade : 0;
      const value = quantity * avgPrice;

      return {
        id,
        name: data.nome,
        price: avgPrice,
        priceRange: data.preco_max - data.preco_min,
        quantity,
        value,
        volatility: data.preco_max > 0 ? (data.preco_max - data.preco_min) / data.preco_max : 0
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Itens Mais Valiosos no Inventário</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marketData.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{item.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  item.volatility > 0.5 ? 'bg-red-100 text-red-800' :
                  item.volatility > 0.2 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.volatility > 0.5 ? 'Alta Volatilidade' :
                   item.volatility > 0.2 ? 'Volatilidade Média' :
                   'Preço Estável'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Preço Médio:</span>
                  <span className="font-medium">${item.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantidade:</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor Total:</span>
                  <span className="font-medium text-green-600">${item.value.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate metrics
function calculateMetrics(
  scenarios: ProductionScenario[],
  recommendations: SmartRecommendation[],
  inventory: any[],
  priceList: Record<string, { preco_min: number; preco_max: number; nome: string }>
): DashboardMetrics {
  const totalProfitPotential = scenarios
    .filter(s => s.productionViability !== 'impossible')
    .reduce((sum, s) => sum + s.totalProfit, 0);

  const immediateOpportunities = scenarios
    .filter(s => s.productionViability === 'high' && s.missingMaterials.length === 0)
    .length;

  const inventoryValue = inventory.reduce((sum, item) => {
    const priceData = priceList[item.id];
    if (priceData) {
      const avgPrice = (priceData.preco_min + priceData.preco_max) / 2;
      return sum + (item.quantidade * avgPrice);
    }
    return sum;
  }, 0);

  const viableScenarios = scenarios.filter(s => s.productionViability !== 'impossible');
  const productionEfficiency = viableScenarios.length > 0
    ? (viableScenarios.filter(s => s.productionViability === 'high').length / viableScenarios.length) * 100
    : 0;

  const topRecommendation = recommendations.find(r => r.priority === 'urgent') || recommendations[0] || null;

  return {
    totalProfitPotential,
    immediateOpportunities,
    inventoryValue,
    productionEfficiency,
    topRecommendation
  };
}

export default ProductionDashboard;