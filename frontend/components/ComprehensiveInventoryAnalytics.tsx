'use client';

import React, { useState, useEffect } from 'react';
import {
  Package, TrendingUp, TrendingDown, Users, BarChart3,
  ArrowUpCircle, ArrowDownCircle, Boxes, Activity
} from 'lucide-react';

interface CategoryStats {
  category: string;
  totalAdded: number;
  totalRemoved: number;
  netChange: number;
  uniqueItems: number;
  items: {
    [itemName: string]: {
      added: number;
      removed: number;
      net: number;
    };
  };
}

interface WorkerCategoryActivity {
  workerId: string;
  workerName: string;
  categories: {
    [category: string]: {
      added: number;
      removed: number;
      net: number;
    };
  };
  totalActivities: number;
}

interface TopItem {
  name: string;
  added: number;
  removed: number;
  net: number;
  category: string;
}

interface ComprehensiveData {
  overview: {
    totalSessions: number;
    totalTransactions: number;
    totalCategories: number;
    totalWorkers: number;
  };
  byCategory: CategoryStats[];
  byWorker: WorkerCategoryActivity[];
  topItems: TopItem[];
  timestamp: string;
}

const categoryIcons: { [key: string]: { icon: React.ReactNode; color: string } } = {
  plantas: { icon: <Package className="w-5 h-5" />, color: 'from-green-500 to-green-600' },
  materiais: { icon: <Boxes className="w-5 h-5" />, color: 'from-blue-500 to-blue-600' },
  produtos: { icon: <BarChart3 className="w-5 h-5" />, color: 'from-purple-500 to-purple-600' },
  caixas: { icon: <Package className="w-5 h-5" />, color: 'from-orange-500 to-orange-600' },
  animais: { icon: <Activity className="w-5 h-5" />, color: 'from-red-500 to-red-600' },
  sementes: { icon: <Package className="w-5 h-5" />, color: 'from-yellow-500 to-yellow-600' },
  outros: { icon: <Boxes className="w-5 h-5" />, color: 'from-gray-500 to-gray-600' }
};

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
    <div className={`bg-gradient-to-r ${color} p-6 rounded-lg text-white shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
        </div>
        <div className="text-white/80 flex items-center justify-center w-12 h-12">{icon}</div>
      </div>
    </div>
  );
};

export default function ComprehensiveInventoryAnalytics() {
  const [data, setData] = useState<ComprehensiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'categories' | 'workers' | 'items'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory-analytics/comprehensive');
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading inventory analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8 text-gray-400">
        <p>Não foi possível carregar os dados de análise.</p>
      </div>
    );
  }

  // Check if there's no data yet
  const hasNoData = data.overview.totalTransactions === 0 && data.byCategory.length === 0;

  if (hasNoData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Análise Abrangente de Inventário</h2>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Atualizar
          </button>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Sessões"
            value={data.overview.totalSessions.toLocaleString('pt-BR')}
            icon={<Activity className="w-6 h-6" />}
            color="from-blue-500 to-blue-600"
            subtitle="Sessões de trabalhadores"
          />
          <MetricCard
            title="Trabalhadores"
            value={data.overview.totalWorkers.toLocaleString('pt-BR')}
            icon={<Users className="w-6 h-6" />}
            color="from-orange-500 to-orange-600"
            subtitle="Registrados no sistema"
          />
          <MetricCard
            title="Total de Transações"
            value="0"
            icon={<BarChart3 className="w-6 h-6" />}
            color="from-gray-500 to-gray-600"
            subtitle="Aguardando dados"
          />
          <MetricCard
            title="Categorias Ativas"
            value="0"
            icon={<Boxes className="w-6 h-6" />}
            color="from-gray-500 to-gray-600"
            subtitle="Aguardando dados"
          />
        </div>

        {/* Empty State Message */}
        <div className="bg-[#1a1f2e] rounded-lg p-12 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-full mb-4">
              <Package className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Sistema de Rastreamento Ativo</h3>
            <p className="text-gray-400 text-lg">
              O sistema de análise por categoria está pronto e aguardando dados.
            </p>
            <div className="bg-[#0f1419] rounded-lg p-6 text-left space-y-3 mt-6">
              <p className="text-white font-semibold mb-2">📊 O que será rastreado:</p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span><strong>Plantas:</strong> Todas as plantas adicionadas/removidas do inventário</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span><strong>Materiais:</strong> Couros, águas, e outros materiais de produção</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span><strong>Produtos:</strong> Álcool industrial e produtos acabados</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span><strong>Caixas:</strong> Caixas de verduras, agro, e outros transportes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span><strong>Sementes:</strong> Sementes de milho, trigo, junco, etc</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span><strong>Animais:</strong> Movimentações de animais no inventário</span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  <strong className="text-blue-400">💡 Nota:</strong> Os dados começarão a aparecer assim que os trabalhadores
                  adicionarem ou removerem items do inventário usando o Discord. Todas as transações serão
                  automaticamente classificadas por categoria.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Análise Abrangente de Inventário</h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-700">
        {[
          { id: 'overview', label: 'Visão Geral' },
          { id: 'categories', label: 'Por Categoria' },
          { id: 'workers', label: 'Por Trabalhador' },
          { id: 'items', label: 'Top Items' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total de Sessões"
              value={data.overview.totalSessions.toLocaleString('pt-BR')}
              icon={<Activity className="w-6 h-6" />}
              color="from-blue-500 to-blue-600"
              subtitle="Sessões processadas"
            />
            <MetricCard
              title="Total de Transações"
              value={data.overview.totalTransactions.toLocaleString('pt-BR')}
              icon={<BarChart3 className="w-6 h-6" />}
              color="from-green-500 to-green-600"
              subtitle="Movimentações no inventário"
            />
            <MetricCard
              title="Categorias Ativas"
              value={data.overview.totalCategories}
              icon={<Boxes className="w-6 h-6" />}
              color="from-purple-500 to-purple-600"
              subtitle="Tipos diferentes de items"
            />
            <MetricCard
              title="Trabalhadores"
              value={data.overview.totalWorkers.toLocaleString('pt-BR')}
              icon={<Users className="w-6 h-6" />}
              color="from-orange-500 to-orange-600"
              subtitle="Trabalhadores ativos"
            />
          </div>

          {/* Category Summary */}
          <div className="bg-[#1a1f2e] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Resumo por Categoria</h3>
            <div className="space-y-3">
              {data.byCategory.map((category) => {
                const categoryInfo = categoryIcons[category.category] || categoryIcons.outros;
                const netChangePercent = category.totalAdded > 0
                  ? ((category.netChange / category.totalAdded) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div key={category.category} className="bg-[#0f1419] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 bg-gradient-to-r ${categoryInfo.color} rounded-lg`}>
                          {categoryInfo.icon}
                        </div>
                        <div>
                          <h4 className="text-white font-medium capitalize">{category.category}</h4>
                          <p className="text-sm text-gray-400">{category.uniqueItems} items únicos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Adicionado</p>
                            <p className="text-green-400 font-semibold">
                              <ArrowUpCircle className="inline w-4 h-4 mr-1" />
                              {category.totalAdded.toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Removido</p>
                            <p className="text-red-400 font-semibold">
                              <ArrowDownCircle className="inline w-4 h-4 mr-1" />
                              {category.totalRemoved.toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Saldo</p>
                            <p className={`font-bold ${category.netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {category.netChange >= 0 ? '+' : ''}{category.netChange.toLocaleString('pt-BR')}
                              <span className="text-xs ml-1">({netChangePercent}%)</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {selectedTab === 'categories' && (
        <div className="space-y-4">
          {data.byCategory.map((category) => {
            const categoryInfo = categoryIcons[category.category] || categoryIcons.outros;
            const topItems = Object.entries(category.items)
              .map(([name, stats]) => ({ name, ...stats }))
              .sort((a, b) => (b.added + b.removed) - (a.added + a.removed))
              .slice(0, 10);

            return (
              <div key={category.category} className="bg-[#1a1f2e] rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 bg-gradient-to-r ${categoryInfo.color} rounded-lg`}>
                    {categoryInfo.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white capitalize">{category.category}</h3>
                    <p className="text-sm text-gray-400">
                      {category.uniqueItems} items • {(category.totalAdded + category.totalRemoved).toLocaleString('pt-BR')} transações
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 text-gray-400 font-medium">Item</th>
                        <th className="text-right py-2 text-gray-400 font-medium">Adicionado</th>
                        <th className="text-right py-2 text-gray-400 font-medium">Removido</th>
                        <th className="text-right py-2 text-gray-400 font-medium">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f1419] transition-colors">
                          <td className="py-3 text-white">{item.name}</td>
                          <td className="py-3 text-right text-green-400">+{item.added.toLocaleString('pt-BR')}</td>
                          <td className="py-3 text-right text-red-400">-{item.removed.toLocaleString('pt-BR')}</td>
                          <td className={`py-3 text-right font-semibold ${item.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.net >= 0 ? '+' : ''}{item.net.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workers Tab */}
      {selectedTab === 'workers' && (
        <div className="space-y-4">
          {data.byWorker.slice(0, 20).map((worker, idx) => (
            <div key={worker.workerId} className="bg-[#1a1f2e] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
                    #{idx + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{worker.workerName}</h3>
                    <p className="text-sm text-gray-400">{worker.totalActivities} transações</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(worker.categories).map(([category, stats]) => {
                  const categoryInfo = categoryIcons[category] || categoryIcons.outros;
                  return (
                    <div key={category} className="bg-[#0f1419] rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`p-1 bg-gradient-to-r ${categoryInfo.color} rounded`}>
                          {categoryInfo.icon}
                        </div>
                        <span className="text-xs text-gray-400 capitalize">{category}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">
                          <span className="text-green-400">↑{stats.added}</span> /
                          <span className="text-red-400 ml-1">↓{stats.removed}</span>
                        </p>
                        <p className={`text-sm font-semibold ${stats.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          Saldo: {stats.net >= 0 ? '+' : ''}{stats.net}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Items Tab */}
      {selectedTab === 'items' && (
        <div className="bg-[#1a1f2e] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top 20 Items Mais Movimentados</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400 font-medium">Rank</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Item</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Categoria</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Adicionado</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Removido</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Saldo</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((item, idx) => {
                  const categoryInfo = categoryIcons[item.category] || categoryIcons.outros;
                  const totalActivity = item.added + item.removed;

                  return (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f1419] transition-colors">
                      <td className="py-3">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-black' :
                          idx === 1 ? 'bg-gray-400 text-black' :
                          idx === 2 ? 'bg-orange-500 text-black' :
                          'bg-gray-700 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 text-white font-medium">{item.name}</td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1 bg-gradient-to-r ${categoryInfo.color} rounded`}>
                            {categoryInfo.icon}
                          </div>
                          <span className="text-gray-300 capitalize text-sm">{item.category}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-green-400 font-semibold">
                        +{item.added.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 text-right text-red-400 font-semibold">
                        -{item.removed.toLocaleString('pt-BR')}
                      </td>
                      <td className={`py-3 text-right font-bold ${item.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.net >= 0 ? '+' : ''}{item.net.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 text-right text-blue-400 font-semibold">
                        {totalActivity.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
