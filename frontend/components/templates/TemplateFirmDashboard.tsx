'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Package, DollarSign, Plus, Minus, Users, Activity, Settings, BarChart3, Archive } from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { FirmTemplateConfig } from '@/types/firmTemplates';

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

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
  subtitle?: string;
}

interface TemplateFirmDashboardProps {
  firm: FirmConfig;
  template: FirmTemplateConfig;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  loading = false, 
  subtitle 
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-300',
    green: 'from-green-500 to-green-600 border-green-300',
    yellow: 'from-yellow-500 to-yellow-600 border-yellow-300',
    red: 'from-red-500 to-red-600 border-red-300',
    purple: 'from-purple-500 to-purple-600 border-purple-300'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 rounded-lg text-white shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            ) : (
              value
            )}
          </p>
          {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
        </div>
        <div className="text-white/80">{icon}</div>
      </div>
    </div>
  );
};

export default function TemplateFirmDashboard({ firm, template }: TemplateFirmDashboardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  
  // Translation state
  const [itemTranslations, setItemTranslations] = useState<Record<string, string>>({});
  
  // Calculated metrics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(new Set<string>());
  const [bankBalance, setBankBalance] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);

  // Load translations on component mount - check if firm uses global or custom translations
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Check if this firm uses global translations
        if (firm?.display?.itemTranslations === "global") {
          console.log('🌍 Loading global translations for', firm.name);
          const response = await fetch('http://localhost:3050/api/localization/translations');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.custom_overrides) {
              setItemTranslations(data.data.custom_overrides);
              console.log('✅ Loaded', Object.keys(data.data.custom_overrides).length, 'global translations');
            }
          }
        } else if (firm?.display?.itemTranslations && typeof firm.display.itemTranslations === 'object') {
          // Use firm-specific translations
          console.log('🏢 Using firm-specific translations for', firm.name);
          setItemTranslations(firm.display.itemTranslations);
        } else {
          // Fallback to global if no firm specified
          console.log('🔄 Fallback to global translations');
          const response = await fetch('http://localhost:3050/api/localization/translations');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.custom_overrides) {
              setItemTranslations(data.data.custom_overrides);
            }
          }
        }
      } catch (error) {
        console.debug('Localization service not available:', error);
      }
    };
    
    loadTranslations();
  }, [firm]);

  // Get best display name using the same logic as FazendaBW
  const getBestDisplayName = (itemId?: string): string => {
    if (!itemId) return 'Item';
    
    // 1. Try custom translation first (highest priority)
    const customTranslation = itemTranslations[itemId] || itemTranslations[itemId.toLowerCase()];
    if (customTranslation && customTranslation.trim() !== '') {
      return customTranslation;
    }

    // 2. Try variations
    const variations = [
      itemId.replace(/_/g, ' '),
      itemId.replace(/_/g, ' ').toLowerCase()
    ];
    
    for (const variation of variations) {
      const translation = itemTranslations[variation];
      if (translation && translation.trim() !== '') {
        return translation;
      }
    }

    // 3. Fallback to normalized formatting
    return itemId
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };


  // Fetch activities from the API - filtered by firm's channel
  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.messages && Array.isArray(data.messages)) {
          // Messages are already filtered by channel ID on the server
          const firmMessages = data.messages;
          
          // Sort by timestamp (newest first)
          const sortedMessages = firmMessages.sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setActivities(sortedMessages);
          setTotalActivities(sortedMessages.length);
          
          // Calculate metrics from firm-specific data
          calculateMetrics(sortedMessages);
          
          const lastActivity = sortedMessages[0];
          if (lastActivity) {
            setLastUpdate(new Date(lastActivity.timestamp).toLocaleString('pt-BR'));
          }
        } else {
          console.warn('Invalid API response structure:', data);
        }
      } else {
        console.error('Failed to fetch activities:', response.status);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (messages: Activity[]) => {
    let revenue = 0;
    let balance = 0;
    let inventory = 0;
    const workers = new Set<string>();

    messages.forEach((msg: Activity) => {
      // Track workers (excluding system messages)
      if (msg.autor && msg.autor !== 'Sistema' && msg.autor !== 'System') {
        workers.add(msg.autor);
      }

      // Calculate revenue (deposits and sales)
      if (msg.valor && (msg.tipo === 'deposito' || msg.tipo === 'venda' || msg.tipo === 'compra')) {
        revenue += msg.valor;
      }

      // Track bank balance (deposits minus withdrawals)
      if (msg.valor) {
        if (msg.tipo === 'deposito' || msg.tipo === 'venda' || msg.tipo === 'compra') {
          balance += msg.valor;
        } else if (msg.tipo === 'saque') {
          balance -= msg.valor;
        }
      }

      // Count inventory items
      if (msg.categoria === 'inventario' && msg.quantidade) {
        if (msg.tipo === 'adicionar') {
          inventory += msg.quantidade;
        } else if (msg.tipo === 'remover') {
          inventory -= msg.quantidade;
        }
      }
    });

    setTotalRevenue(revenue);
    setBankBalance(balance);
    setInventoryCount(Math.max(0, inventory));
    setActiveWorkers(workers);
  };

  const getActivityIcon = (transaction: Activity): React.ReactNode => {
    const isDeposit = transaction.tipo === 'adicionar' || transaction.tipo === 'deposito';
    const color = isDeposit ? 'text-green-500' : 'text-red-500';
    
    if (transaction.categoria === 'financeiro') {
      return <DollarSign className={color} size={20} />;
    }

    if (transaction.categoria === 'inventario') {
      const itemName = transaction.item?.toLowerCase() || transaction.descricao?.toLowerCase() || '';
      
      // Return emoji icons for specific items based on template config
      if (template.features.customFields?.animalManagement) {
        if (itemName.includes('cow') || itemName.includes('vaca')) return <span className="text-xl">🐄</span>;
        if (itemName.includes('pig') || itemName.includes('porco')) return <span className="text-xl">🐷</span>;
        if (itemName.includes('chicken') || itemName.includes('galinha')) return <span className="text-xl">🐔</span>;
        if (itemName.includes('sheep') || itemName.includes('ovelha')) return <span className="text-xl">🐑</span>;
      }
      
      if (template.features.customFields?.cropManagement) {
        if (itemName.includes('trigo') || itemName.includes('wheat')) return <span className="text-xl">🌾</span>;
        if (itemName.includes('milho') || itemName.includes('corn')) return <span className="text-xl">🌽</span>;
      }

      return <Package className={color} size={20} />;
    }

    return <Activity className="text-gray-500" size={20} />;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Filter activities by type
  const getItemActivities = (): Activity[] => {
    return activities.filter(activity => 
      activity.categoria === 'inventario' &&
      (activity.tipo && ['adicionar', 'remover'].includes(activity.tipo))
    ).slice(0, 20);
  };

  const getMoneyActivities = (): Activity[] => {
    return activities.filter(activity => {
      return activity.categoria === 'financeiro' &&
             (activity.tipo && ['deposito', 'saque', 'venda', 'compra'].includes(activity.tipo) ||
              (activity.valor !== undefined && activity.valor !== null));
    }).slice(0, 20);
  };

  // Get unique inventory managers (people who add/remove animals)
  const getInventoryManagers = (): Set<string> => {
    const managers = new Set<string>();
    activities.forEach(activity => {
      if (activity.categoria === 'inventario' && 
          activity.tipo && ['adicionar', 'remover'].includes(activity.tipo) &&
          activity.autor && activity.autor !== 'Sistema') {
        managers.add(activity.autor);
      }
    });
    return managers;
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [firm.channelId]);

  const dashboardComponent = template.components.find(c => c.id === 'dashboard');
  const showMetrics = dashboardComponent?.settings?.showMetrics ?? true;
  const metricCards = dashboardComponent?.settings?.metricCards || ['revenue', 'activities', 'workers'];

  return (
    <div className="space-y-6" style={{ backgroundColor: template.theme.backgroundColor }}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: template.theme.primaryColor }}>
              {firm.name}
            </h1>
            <p className="text-gray-600">Template: {template.name}</p>
            {lastUpdate && (
              <p className="text-sm text-gray-500">
                Última atualização: {lastUpdate}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Monitorando</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      {showMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {metricCards.includes('revenue') && (
            <MetricCard
              title="Receita Total"
              value={formatCurrency(totalRevenue)}
              icon={<DollarSign className="h-8 w-8" />}
              color="green"
              loading={loading}
              subtitle="Vendas de animais"
            />
          )}
          
          {metricCards.includes('activities') && (
            <MetricCard
              title="Atividades"
              value={totalActivities}
              icon={<Activity className="h-8 w-8" />}
              color="blue"
              loading={loading}
              subtitle="Total de registros"
            />
          )}
          
          {metricCards.includes('workers') && (
            <MetricCard
              title="Clientes"
              value={activeWorkers.size}
              icon={<Users className="h-8 w-8" />}
              color="purple"
              loading={loading}
              subtitle="Compraram animais"
            />
          )}
          
          {metricCards.includes('inventory') && (
            <MetricCard
              title="Inventário"
              value={inventoryCount}
              icon={<Package className="h-8 w-8" />}
              color="yellow"
              loading={loading}
              subtitle="Animais no berçário"
            />
          )}
          
          {metricCards.includes('bankBalance') && (
            <MetricCard
              title="Gerentes de Inventário"
              value={getInventoryManagers().size}
              icon={<Settings className="h-8 w-8" />}
              color="red"
              loading={loading}
              subtitle="Gerenciam animais"
            />
          )}
        </div>
      )}

      {/* Separated Activities Feed */}
      {dashboardComponent?.settings?.showRecentActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Item Activities */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">
                📦 Atividades de Itens ({getItemActivities().length})
              </h3>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : getItemActivities().length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma atividade de itens capturada</p>
              ) : (
                <div className="space-y-2">
                  {getItemActivities().map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                      <div className="flex-shrink-0">{getActivityIcon(activity)}</div>
                      <div className="flex-1 min-w-0">
                        {activity.parseSuccess && activity.tipo && activity.item && activity.quantidade ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">
                              {activity.autor || 'Sistema'}
                            </span>
                            <span className="text-gray-600">
                              {activity.tipo === 'adicionar' ? 'adicionou' : 'removeu'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              activity.tipo === 'adicionar' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {activity.quantidade}x
                            </span>
                            <span className="font-medium text-gray-900">
                              {getBestDisplayName(activity.item)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {activity.autor || 'Sistema'}
                              </span>
                              {!activity.parseSuccess && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                  Não processado
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-gray-600">
                              {activity.displayText || activity.content.substring(0, 150) + 
                                (activity.content.length > 150 ? '...' : '')}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Money Activities */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">
                💰 Atividades de Dinheiro ({getMoneyActivities().length})
              </h3>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {getMoneyActivities().length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma atividade financeira capturada</p>
              ) : (
                <div className="space-y-2">
                  {getMoneyActivities().map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                      <div className="flex-shrink-0">{getActivityIcon(activity)}</div>
                      <div className="flex-1 min-w-0">
                        {activity.parseSuccess && activity.categoria === 'financeiro' && (activity.tipo || activity.valor) ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">
                              {activity.autor || 'Sistema'}
                            </span>
                            {activity.descricao && activity.descricao !== 'Depósito direto' && activity.tipo !== 'saque' && activity.descricao.trim() !== '' ? (
                              <>
                                <span className="text-gray-600">
                                  {activity.descricao}
                                </span>
                                <span className="text-gray-600">por</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  activity.tipo === 'deposito' || activity.tipo === 'venda' || activity.tipo === 'compra'
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  ${typeof activity.valor === 'number' ? activity.valor.toFixed(2) : '0.00'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-600">
                                  {activity.tipo === 'deposito' ? 'depositou' : 
                                   activity.tipo === 'saque' ? 'sacou' :
                                   activity.tipo === 'compra' ? 'gastou' :
                                   activity.tipo === 'venda' ? 'vendeu' :
                                   'transação'}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  activity.tipo === 'deposito' || activity.tipo === 'venda' || activity.tipo === 'compra'
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  ${typeof activity.valor === 'number' ? activity.valor.toFixed(2) : '0.00'}
                                </span>
                              </>
                            )}
                            {activity.confidence && activity.confidence !== 'high' && (
                              <span className="text-xs text-gray-400" title={`Confiança: ${activity.confidence}`}>
                                {activity.confidence === 'medium' ? '?' : '⚠'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {activity.autor || 'Sistema'}
                              </span>
                              {!activity.parseSuccess && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                  Não processado
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-gray-600">
                              {activity.displayText || activity.content.substring(0, 150) + 
                                (activity.content.length > 150 ? '...' : '')}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          📅 {new Date(activity.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}