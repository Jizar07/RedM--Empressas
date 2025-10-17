'use client';

import React, { useState, useEffect } from 'react';
import {
  Package, TrendingUp, Users, BarChart3, DollarSign,
  Wheat, PiggyBank, ShoppingCart, Activity, Trophy, Zap
} from 'lucide-react';
import { useServer } from '@/contexts/ServerContext';

interface PlantStats {
  itemName: string;
  deposited: number;
  seedsTaken: number;
}

interface AnimalStats {
  totalDeliveries: number;
  totalMaterialsGenerated: number;
  totalMaterialValue: number;
  totalAnimalsTaken: number;
  totalCost: number;
}

interface FinancialItem {
  itemName: string;
  quantity: number;
  spent: number;
}

interface WorkerAnalytics {
  workerId: string;
  workerName: string;
  totalSessions: number;
  isManager: boolean;
  plantStats: { [itemName: string]: PlantStats };
  animalStats: AnimalStats;
  financialStats: {
    totalPurchases: number;
    totalSpent: number;
    items: { [itemName: string]: { quantity: number; spent: number } };
  };
  plantRevenue: number;
  animalMaterialProfit: number;
  totalPaid: number;
  fazendaProfit: number;
}

interface ComprehensiveData {
  overview: {
    totalSessions: number;
    totalWorkers: number;
    totalPlantDeposits: number;
    totalSeedsTaken: number;
    totalAnimalDeliveries: number;
    totalAnimalMaterials: number;
    totalAnimalMaterialValue: number;
    totalPlantRevenue: number;
    totalAnimalMaterialProfit: number;
    totalPaidToWorkers: number;
    totalFazendaProfit: number;
    totalPurchases: number;
    totalSpent: number;
  };
  workers: WorkerAnalytics[];
  plants: PlantStats[];
  animals: AnimalStats;
  purchases: FinancialItem[];
  timestamp: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color = 'from-blue-500 to-blue-600',
  subtitle
}) => {
  return (
    <div className={`bg-gradient-to-r ${color} p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/90">{title}</p>
          <p className="text-3xl font-bold mt-2 text-white">{value}</p>
          {subtitle && <p className="text-sm text-white/80 mt-1">{subtitle}</p>}
        </div>
        <div className="text-white/90 flex items-center justify-center w-12 h-12">{icon}</div>
      </div>
    </div>
  );
};

interface ComprehensiveAnalyticsProps {
  firmId?: string;
  firmName?: string;
}

export default function ComprehensiveAnalytics({ firmId, firmName }: ComprehensiveAnalyticsProps = {}) {
  const { selectedServerId } = useServer();
  const [data, setData] = useState<ComprehensiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'workers' | 'plants' | 'animals' | 'purchases'>('overview');
  const [plantCost, setPlantCost] = useState(0);
  const [animalCost, setAnimalCost] = useState(23);

  useEffect(() => {
    if (selectedServerId) {
      loadData();
      loadPaymentConfig();
    }
  }, [firmId, selectedServerId]);

  const loadData = async () => {
    if (!selectedServerId) {
      console.warn('⚠️ [ComprehensiveAnalytics] No server selected');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('serverId', selectedServerId);
      if (firmId) {
        params.set('firmId', firmId);
      }

      const url = `/api/comprehensive-analytics?${params.toString()}`;
      console.log(`🔍 [ComprehensiveAnalytics] Loading data from: ${url}`);
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ [ComprehensiveAnalytics] Loaded data:`, result);
        setData(result.data);
      } else {
        console.error(`❌ [ComprehensiveAnalytics] Failed to load: ${response.status} ${response.statusText}`);
        const errorData = await response.json();
        console.error(`❌ [ComprehensiveAnalytics] Error details:`, errorData);
      }
    } catch (error) {
      console.error('Error loading comprehensive analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentConfig = async () => {
    if (!selectedServerId) return;

    try {
      const response = await fetch(`/api/payment-config?serverId=${selectedServerId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPlantCost(result.data.defaultPrices.plants.costPerUnit || 0);
          setAnimalCost(result.data.defaultPrices.animals.costPerUnit || 23);
        }
      }
    } catch (error) {
      console.error('Error loading payment config:', error);
    }
  };

  if (!selectedServerId) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <p>Por favor, selecione um servidor primeiro.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <p>Não foi possível carregar os dados de análise.</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {firmName ? `Análises - ${firmName}` : 'Análises Abrangentes'}
        </h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <Activity className="w-4 h-4" />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'overview', label: 'Visão Geral', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'workers', label: 'Trabalhadores', icon: <Users className="w-4 h-4" /> },
          { id: 'plants', label: 'Plantas', icon: <Wheat className="w-4 h-4" /> },
          { id: 'animals', label: 'Animais', icon: <PiggyBank className="w-4 h-4" /> },
          { id: 'purchases', label: 'Compras', icon: <ShoppingCart className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-4 py-2 font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
              selectedTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total de Sessões"
              value={data.overview.totalSessions.toLocaleString('pt-BR')}
              icon={<Activity className="w-6 h-6" />}
              color="from-blue-500 to-blue-600"
              subtitle="Sessões de trabalho"
            />
            <MetricCard
              title="Trabalhadores"
              value={data.overview.totalWorkers.toLocaleString('pt-BR')}
              icon={<Users className="w-6 h-6" />}
              color="from-purple-500 to-purple-600"
              subtitle="Únicos ativos"
            />
            <MetricCard
              title="Plantas Depositadas"
              value={data.overview.totalPlantDeposits.toLocaleString('pt-BR')}
              icon={<Wheat className="w-6 h-6" />}
              color="from-green-500 to-green-600"
              subtitle={`${data.overview.totalSeedsTaken.toLocaleString('pt-BR')} sementes`}
            />
            <MetricCard
              title="Lucro da Fazenda"
              value={`$${(data.overview.totalFazendaProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-6 h-6" />}
              color="from-orange-500 to-orange-600"
              subtitle={`Lucro líquido total`}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#1a1f2e] rounded-lg p-6 shadow-md">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                  <Wheat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Produção de Plantas</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Performance geral de cultivo</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Sementes Retiradas</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{data.overview.totalSeedsTaken.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Plantas Depositadas</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{data.overview.totalPlantDeposits.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Taxa de Conversão</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {data.overview.totalSeedsTaken > 0
                      ? `${((data.overview.totalPlantDeposits / data.overview.totalSeedsTaken) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1f2e] rounded-lg p-6 shadow-md">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                  <PiggyBank className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lucro da Fazenda</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Detalhamento financeiro</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Receita de Plantas</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">${(data.overview.totalPlantRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Receita de Animais</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">${(data.overview.totalAnimalMaterialProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Pago aos Trabalhadores</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold">-${(data.overview.totalPaidToWorkers || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400 font-bold">Lucro Líquido</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                    ${(data.overview.totalFazendaProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Purchases Overview */}
          {data.overview.totalPurchases > 0 && (
            <div className="bg-white dark:bg-[#1a1f2e] rounded-lg p-6 shadow-md">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Compras no Berçário</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Despesas com items</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Gasto</span>
                <span className="text-red-600 dark:text-red-400 font-bold text-xl">${data.overview.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600 dark:text-gray-400">Items Comprados</span>
                <span className="text-gray-900 dark:text-white font-semibold">{data.overview.totalPurchases}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workers Tab */}
      {selectedTab === 'workers' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Trabalhadores por Lucro da Fazenda</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Rank</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Nome</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Sessões</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Plantas</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Animais</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Pago</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Custo</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Lucro Fazenda</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Lucro Esperado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workers.slice(0, 20).map((worker, idx) => {
                    const totalPlants = Object.values(worker.plantStats).reduce((sum, p) => sum + p.deposited, 0);
                    const totalAnimals = worker.animalStats.totalDeliveries;

                    // Calculate cost using config values
                    const cost = (totalPlants * plantCost) + (totalAnimals * animalCost);

                    // Calculate expected profit: revenue - cost
                    const expectedProfit = (worker.plantRevenue || 0) + (worker.animalMaterialProfit || 0) - cost;

                    return (
                      <tr key={worker.workerId} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#0f1419] transition-colors">
                        <td className="py-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            idx === 0 ? 'bg-yellow-500 text-black' :
                            idx === 1 ? 'bg-gray-400 text-black' :
                            idx === 2 ? 'bg-orange-500 text-black' :
                            'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 text-gray-900 dark:text-white font-medium">
                          {worker.workerName}
                          {worker.isManager && <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-1 rounded">Manager</span>}
                        </td>
                        <td className="py-3 text-right text-gray-700 dark:text-gray-300">{worker.totalSessions}</td>
                        <td className="py-3 text-right text-green-600 dark:text-green-400">{totalPlants.toLocaleString('pt-BR')}</td>
                        <td className="py-3 text-right text-orange-600 dark:text-orange-400">{worker.animalStats.totalDeliveries}</td>
                        <td className="py-3 text-right text-red-600 dark:text-red-400">
                          ${(worker.totalPaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right text-orange-600 dark:text-orange-400">
                          ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right text-green-600 dark:text-green-400 font-bold">
                          ${(worker.fazendaProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right text-blue-600 dark:text-blue-400 font-bold">
                          ${expectedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plants Tab */}
      {selectedTab === 'plants' && (
        <div className="bg-white dark:bg-[#1a1f2e] rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatísticas de Plantas</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Planta</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Sementes Retiradas</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Plantas Depositadas</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {data.plants.map((plant, idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#0f1419] transition-colors">
                    <td className="py-3 text-gray-900 dark:text-white font-medium capitalize">{plant.itemName}</td>
                    <td className="py-3 text-right text-gray-700 dark:text-gray-300">{plant.seedsTaken.toLocaleString('pt-BR')}</td>
                    <td className="py-3 text-right text-green-600 dark:text-green-400 font-semibold">{plant.deposited.toLocaleString('pt-BR')}</td>
                    <td className="py-3 text-right text-blue-600 dark:text-blue-400">
                      {plant.seedsTaken > 0 ? `${((plant.deposited / plant.seedsTaken) * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Animals Tab */}
      {selectedTab === 'animals' && (
        <div className="bg-white dark:bg-[#1a1f2e] rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Estatísticas de Animais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-[#0f1419] rounded-lg p-6">
              <h4 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500 dark:text-yellow-400" />
                Performance
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total de Entregas</span>
                  <span className="text-gray-900 dark:text-white font-bold text-xl">{data.animals.totalDeliveries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Materiais Gerados</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">{(data.animals.totalMaterialsGenerated || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Valor dos Materiais</span>
                  <span className="text-green-600 dark:text-green-400 font-bold text-xl">
                    ${(data.animals.totalMaterialValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {data.animals.totalAnimalsTaken > 0 && (
              <div className="bg-gray-50 dark:bg-[#0f1419] rounded-lg p-6">
                <h4 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-orange-500 dark:text-orange-400" />
                  Custos
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Animais Retirados</span>
                    <span className="text-gray-900 dark:text-white font-bold text-xl">{data.animals.totalAnimalsTaken}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Custo Total</span>
                    <span className="text-red-600 dark:text-red-400 font-bold text-xl">${data.animals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Lucro Líquido</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">
                      ${((data.animals.totalMaterialValue || 0) - (data.animals.totalCost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchases Tab */}
      {selectedTab === 'purchases' && (
        <div className="bg-white dark:bg-[#1a1f2e] rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compras no Berçário</h3>
          {data.purchases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Item</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Quantidade</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Gasto Total</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Preço Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchases.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#0f1419] transition-colors">
                      <td className="py-3 text-gray-900 dark:text-white font-medium">{item.itemName}</td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                      <td className="py-3 text-right text-red-600 dark:text-red-400 font-semibold">
                        ${item.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right text-blue-600 dark:text-blue-400">
                        ${(item.spent / item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma compra registrada</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
