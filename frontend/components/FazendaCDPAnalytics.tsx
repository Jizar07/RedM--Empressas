'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, Package, DollarSign, 
  Activity, Clock, Star, AlertTriangle, Wheat, PiggyBank,
  Target, Calendar, Award, Zap
} from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda' | 'compra';
  categoria?: 'inventario' | 'financeiro' | 'sistema';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess?: boolean;
  displayText?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
  channelId?: string;
}

interface FazendaCDPAnalyticsProps {
  firm: FirmConfig;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
  loading?: boolean;
  subtitle?: string;
  trend?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  loading = false, 
  subtitle,
  trend
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-300',
    green: 'from-green-500 to-green-600 border-green-300',
    yellow: 'from-yellow-500 to-yellow-600 border-yellow-300',
    red: 'from-red-500 to-red-600 border-red-300',
    purple: 'from-purple-500 to-purple-600 border-purple-300',
    orange: 'from-orange-500 to-orange-600 border-orange-300'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 rounded-lg text-white shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            ) : (
              value
            )}
          </p>
          {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className="flex items-center mt-2">
              {trend > 0 ? <TrendingUp size={16} /> : trend < 0 ? <TrendingDown size={16} /> : null}
              <span className="ml-1 text-sm">
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="text-white/80 flex items-center justify-center w-12 h-12">{icon}</div>
      </div>
    </div>
  );
};

export default function FazendaCDPAnalytics({ firm }: FazendaCDPAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [currentTab, setCurrentTab] = useState<'overview' | 'farm' | 'workers' | 'production' | 'financial'>('overview');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Load activities from the channel
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            setActivities(data.messages);
          }
        }
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, [firm.channelId]);

  // Filter data by period
  const getFilteredData = (data: Activity[]) => {
    if (selectedPeriod === 'all') return data;
    
    const now = new Date();
    const daysAgo = selectedPeriod === '7d' ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    return data.filter(item => new Date(item.timestamp) >= cutoffDate);
  };

  // Categorize items by farm type
  const categorizeItem = (itemName: string): 'animal' | 'crop' | 'feed' | 'material' | 'product' | 'other' => {
    const name = itemName.toLowerCase();
    
    // Animals
    if (name.includes('cow') || name.includes('vaca') || name.includes('pig') || 
        name.includes('porco') || name.includes('chicken') || name.includes('galinha') ||
        name.includes('sheep') || name.includes('ovelha') || name.includes('donkey') ||
        name.includes('burro') || name.includes('goat') || name.includes('cabra')) {
      return 'animal';
    }
    
    // Crops
    if (name.includes('trigo') || name.includes('wheat') || name.includes('milho') || 
        name.includes('corn') || name.includes('semente') || name.includes('seed') ||
        name.includes('plant') || name.includes('planta') || name.includes('bulrush') ||
        name.includes('junco')) {
      return 'crop';
    }
    
    // Feed
    if (name.includes('racao') || name.includes('feed') || name.includes('hay') || 
        name.includes('feno') || name.includes('portion')) {
      return 'feed';
    }
    
    // Products
    if (name.includes('leite') || name.includes('milk') || name.includes('ovo') || 
        name.includes('egg') || name.includes('carne') || name.includes('meat') ||
        name.includes('queijo') || name.includes('cheese')) {
      return 'product';
    }
    
    // Materials
    if (name.includes('wood') || name.includes('madeira') || name.includes('ferro') || 
        name.includes('iron') || name.includes('stone') || name.includes('pedra')) {
      return 'material';
    }
    
    return 'other';
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    const filteredActivities = getFilteredData(activities);
    
    // Animal Analytics
    const animalActivities = filteredActivities.filter(a => 
      a.categoria === 'inventario' && a.item && categorizeItem(a.item) === 'animal'
    );
    
    const animalStats = animalActivities.reduce((acc, activity) => {
      const itemName = activity.item || 'unknown';
      if (!acc[itemName]) acc[itemName] = { added: 0, removed: 0, current: 0 };
      
      if (activity.tipo === 'adicionar') {
        acc[itemName].added += activity.quantidade || 0;
      } else if (activity.tipo === 'remover') {
        acc[itemName].removed += activity.quantidade || 0;
      }
      acc[itemName].current = acc[itemName].added - acc[itemName].removed;
      
      return acc;
    }, {} as Record<string, any>);

    // Crop Analytics
    const cropActivities = filteredActivities.filter(a => 
      a.categoria === 'inventario' && a.item && categorizeItem(a.item) === 'crop'
    );
    
    const cropStats = cropActivities.reduce((acc, activity) => {
      const itemName = activity.item || 'unknown';
      if (!acc[itemName]) acc[itemName] = { planted: 0, harvested: 0, inField: 0 };
      
      if (activity.tipo === 'adicionar') {
        acc[itemName].planted += activity.quantidade || 0;
      } else if (activity.tipo === 'remover') {
        acc[itemName].harvested += activity.quantidade || 0;
      }
      acc[itemName].inField = acc[itemName].planted - acc[itemName].harvested;
      
      return acc;
    }, {} as Record<string, any>);

    // Financial Analytics
    const financialActivities = filteredActivities.filter(a => a.categoria === 'financeiro');
    const totalRevenue = financialActivities
      .filter(a => a.tipo === 'venda' || a.tipo === 'deposito')
      .reduce((sum, a) => sum + (a.valor || 0), 0);
    
    const totalExpenses = financialActivities
      .filter(a => a.tipo === 'compra' || a.tipo === 'saque')
      .reduce((sum, a) => sum + (a.valor || 0), 0);
    
    const netProfit = totalRevenue - totalExpenses;

    // Worker Analytics
    const workerStats = filteredActivities.reduce((acc, activity) => {
      if (activity.autor && activity.autor !== 'Sistema') {
        if (!acc[activity.autor]) {
          acc[activity.autor] = { 
            activities: 0, 
            animals: 0, 
            crops: 0, 
            financial: 0,
            revenue: 0 
          };
        }
        
        acc[activity.autor].activities++;
        
        if (activity.categoria === 'inventario' && activity.item) {
          const category = categorizeItem(activity.item);
          if (category === 'animal') acc[activity.autor].animals++;
          if (category === 'crop') acc[activity.autor].crops++;
        }
        
        if (activity.categoria === 'financeiro') {
          acc[activity.autor].financial++;
          if (activity.tipo === 'venda' || activity.tipo === 'deposito') {
            acc[activity.autor].revenue += activity.valor || 0;
          }
        }
      }
      return acc;
    }, {} as Record<string, any>);

    // Top performers
    const topWorkers = Object.entries(workerStats)
      .sort(([,a]: any, [,b]: any) => b.activities - a.activities)
      .slice(0, 5);

    // Production metrics
    const totalAnimals = Object.values(animalStats)
      .reduce((sum: number, stat: any) => sum + stat.current, 0);
    
    const totalCrops = Object.values(cropStats)
      .reduce((sum: number, stat: any) => sum + stat.inField, 0);

    // Activity trends by day
    const dailyActivity = filteredActivities.reduce((acc, activity) => {
      const date = new Date(activity.timestamp).toLocaleDateString('pt-BR');
      if (!acc[date]) acc[date] = { count: 0, revenue: 0 };
      
      acc[date].count++;
      if (activity.categoria === 'financeiro' && (activity.tipo === 'venda' || activity.tipo === 'deposito')) {
        acc[date].revenue += activity.valor || 0;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return {
      totalAnimals,
      totalCrops,
      totalRevenue,
      totalExpenses,
      netProfit,
      animalStats,
      cropStats,
      workerStats,
      topWorkers,
      dailyActivity,
      totalActivities: filteredActivities.length,
      activeWorkers: Object.keys(workerStats).length
    };
  }, [activities, selectedPeriod]);

  const tabs = [
    { id: 'overview', name: '📊 Visão Geral', icon: BarChart3 },
    { id: 'farm', name: '🚜 Fazenda', icon: Wheat },
    { id: 'workers', name: '👨‍🌾 Trabalhadores', icon: Users },
    { id: 'production', name: '📦 Produção', icon: Package },
    { id: 'financial', name: '💰 Financeiro', icon: DollarSign }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🐐 Fazenda Cabra da Peste - Analytics
        </h2>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="all">Todos os dados</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    currentTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Main KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="🐄 Total de Animais"
                  value={analytics.totalAnimals}
                  subtitle="Em estoque"
                  icon={<span className="text-2xl">🐄</span>}
                  color="green"
                  loading={loading}
                />
                
                <MetricCard
                  title="🌾 Total de Cultivos"
                  value={analytics.totalCrops}
                  subtitle="Em campo"
                  icon={<span className="text-2xl">🌾</span>}
                  color="yellow"
                  loading={loading}
                />
                
                <MetricCard
                  title="💰 Receita Total"
                  value={`$${analytics.totalRevenue.toFixed(2)}`}
                  subtitle="Vendas & depósitos"
                  icon={<DollarSign size={24} />}
                  color="blue"
                  loading={loading}
                />
                
                <MetricCard
                  title="📈 Lucro Líquido"
                  value={`$${analytics.netProfit.toFixed(2)}`}
                  subtitle="Receita - Despesas"
                  icon={<TrendingUp size={24} />}
                  color={analytics.netProfit >= 0 ? 'green' : 'red'}
                  loading={loading}
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Trabalhadores Ativos</p>
                      <p className="text-2xl font-bold">{analytics.activeWorkers}</p>
                    </div>
                    <Users className="text-blue-500" size={32} />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total de Atividades</p>
                      <p className="text-2xl font-bold">{analytics.totalActivities}</p>
                    </div>
                    <Activity className="text-purple-500" size={32} />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Despesas Totais</p>
                      <p className="text-2xl font-bold">${analytics.totalExpenses.toFixed(2)}</p>
                    </div>
                    <PiggyBank className="text-red-500" size={32} />
                  </div>
                </div>
              </div>

              {/* Daily Activity Chart */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">📅 Atividade Diária</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {Object.entries(analytics.dailyActivity).slice(-7).map(([date, data]: any) => (
                    <div key={date} className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-xs text-gray-600">{date}</div>
                      <div className="text-lg font-bold mt-1">{data.count}</div>
                      <div className="text-xs text-green-600">${data.revenue.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'farm' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">🚜 Gestão da Fazenda</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Animal Management */}
                <div className="bg-white rounded-lg border p-6">
                  <h4 className="font-semibold mb-4">🐄 Gestão de Animais</h4>
                  <div className="space-y-3">
                    {Object.entries(analytics.animalStats).slice(0, 5).map(([animal, stats]: any) => (
                      <div key={animal} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium capitalize">{animal.replace(/_/g, ' ')}</div>
                          <div className="text-sm text-gray-600">
                            +{stats.added} | -{stats.removed}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{stats.current}</div>
                          <div className="text-xs text-gray-500">atual</div>
                        </div>
                      </div>
                    ))}
                    {Object.keys(analytics.animalStats).length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        Nenhuma atividade animal registrada
                      </p>
                    )}
                  </div>
                </div>

                {/* Crop Management */}
                <div className="bg-white rounded-lg border p-6">
                  <h4 className="font-semibold mb-4">🌾 Gestão de Cultivos</h4>
                  <div className="space-y-3">
                    {Object.entries(analytics.cropStats).slice(0, 5).map(([crop, stats]: any) => (
                      <div key={crop} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <div className="font-medium capitalize">{crop.replace(/_/g, ' ')}</div>
                          <div className="text-sm text-gray-600">
                            {stats.planted} plantado | {stats.harvested} colhido
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-yellow-600">{stats.inField}</div>
                          <div className="text-xs text-gray-500">em campo</div>
                        </div>
                      </div>
                    ))}
                    {Object.keys(analytics.cropStats).length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        Nenhuma atividade de cultivo registrada
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'workers' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">👨‍🌾 Analytics de Trabalhadores</h3>
              
              {/* Top Workers */}
              <div className="bg-white rounded-lg border p-6">
                <h4 className="font-semibold mb-4">🏆 Top Trabalhadores</h4>
                <div className="space-y-3">
                  {analytics.topWorkers.map(([worker, stats]: any, index) => (
                    <div key={worker} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{worker}</div>
                          <div className="text-sm text-gray-600">
                            🐄 {stats.animals} | 🌾 {stats.crops} | 💰 ${stats.revenue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">{stats.activities}</div>
                        <div className="text-xs text-gray-500">atividades</div>
                      </div>
                    </div>
                  ))}
                  {analytics.topWorkers.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma atividade de trabalhador registrada
                    </p>
                  )}
                </div>
              </div>

              {/* Worker Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analytics.workerStats).map(([worker, stats]: any) => (
                  <div key={worker} className="bg-white rounded-lg border p-4">
                    <div className="font-medium mb-3">{worker}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Atividades:</span>
                        <span className="font-medium">{stats.activities}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Animais:</span>
                        <span className="font-medium">{stats.animals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cultivos:</span>
                        <span className="font-medium">{stats.crops}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Receita:</span>
                        <span className="font-medium text-green-600">${stats.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'production' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">📦 Analytics de Produção</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="🐄 Produção Animal"
                  value={analytics.totalAnimals}
                  subtitle="Total em estoque"
                  icon={<span className="text-2xl">🐄</span>}
                  color="green"
                />
                
                <MetricCard
                  title="🌾 Produção Agrícola"
                  value={analytics.totalCrops}
                  subtitle="Total em campo"
                  icon={<span className="text-2xl">🌾</span>}
                  color="yellow"
                />
                
                <MetricCard
                  title="📊 Taxa de Produção"
                  value={`${((analytics.totalActivities / (analytics.activeWorkers || 1)).toFixed(1))}`}
                  subtitle="Atividades/Trabalhador"
                  icon={<Target size={24} />}
                  color="purple"
                />
                
                <MetricCard
                  title="⚡ Eficiência"
                  value={analytics.totalActivities > 100 ? 'Alta' : analytics.totalActivities > 50 ? 'Média' : 'Baixa'}
                  subtitle="Baseado em atividades"
                  icon={<Zap size={24} />}
                  color="orange"
                />
              </div>

              {/* Detailed Production Stats */}
              <div className="bg-white rounded-lg border p-6">
                <h4 className="font-semibold mb-4">📈 Detalhes de Produção</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-2xl mb-2">🐄</div>
                    <div className="font-bold">{Object.keys(analytics.animalStats).length}</div>
                    <div className="text-xs text-gray-600">Tipos de Animais</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-2xl mb-2">🌾</div>
                    <div className="font-bold">{Object.keys(analytics.cropStats).length}</div>
                    <div className="text-xs text-gray-600">Tipos de Cultivos</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-2xl mb-2">👨‍🌾</div>
                    <div className="font-bold">{analytics.activeWorkers}</div>
                    <div className="text-xs text-gray-600">Trabalhadores</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-bold">{analytics.totalActivities}</div>
                    <div className="text-xs text-gray-600">Atividades</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'financial' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">💰 Analytics Financeiro</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="💵 Receita"
                  value={`$${analytics.totalRevenue.toFixed(2)}`}
                  subtitle="Total de entradas"
                  icon={<TrendingUp size={24} />}
                  color="green"
                />
                
                <MetricCard
                  title="💸 Despesas"
                  value={`$${analytics.totalExpenses.toFixed(2)}`}
                  subtitle="Total de saídas"
                  icon={<TrendingDown size={24} />}
                  color="red"
                />
                
                <MetricCard
                  title="📈 Lucro Líquido"
                  value={`$${analytics.netProfit.toFixed(2)}`}
                  subtitle={analytics.netProfit >= 0 ? 'Lucro' : 'Prejuízo'}
                  icon={<DollarSign size={24} />}
                  color={analytics.netProfit >= 0 ? 'blue' : 'red'}
                />
              </div>

              {/* Revenue by Worker */}
              <div className="bg-white rounded-lg border p-6">
                <h4 className="font-semibold mb-4">💰 Receita por Trabalhador</h4>
                <div className="space-y-3">
                  {Object.entries(analytics.workerStats)
                    .sort(([,a]: any, [,b]: any) => b.revenue - a.revenue)
                    .slice(0, 10)
                    .map(([worker, stats]: any) => (
                      <div key={worker} className="flex items-center justify-between p-3 bg-green-50 rounded">
                        <span className="font-medium">{worker}</span>
                        <span className="font-bold text-green-600">${stats.revenue.toFixed(2)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}