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
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda';
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
  
  // Calculated metrics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(new Set<string>());
  const [bankBalance, setBankBalance] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);

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
      if (msg.valor && (msg.tipo === 'deposito' || msg.tipo === 'venda')) {
        revenue += msg.valor;
      }

      // Track bank balance (deposits minus withdrawals)
      if (msg.valor) {
        if (msg.tipo === 'deposito' || msg.tipo === 'venda') {
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
              subtitle="Vendas + Depósitos"
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
              title="Trabalhadores"
              value={activeWorkers.size}
              icon={<Users className="h-8 w-8" />}
              color="purple"
              loading={loading}
              subtitle="Ativos no período"
            />
          )}
          
          {metricCards.includes('inventory') && (
            <MetricCard
              title="Inventário"
              value={inventoryCount}
              icon={<Package className="h-8 w-8" />}
              color="yellow"
              loading={loading}
              subtitle="Itens em estoque"
            />
          )}
          
          {metricCards.includes('bankBalance') && template.features.customFields?.bankingEnabled && (
            <MetricCard
              title="Saldo Bancário"
              value={formatCurrency(bankBalance)}
              icon={<Archive className="h-8 w-8" />}
              color="red"
              loading={loading}
              subtitle="Depósitos - Saques"
            />
          )}
        </div>
      )}

      {/* Recent Activity Feed */}
      {dashboardComponent?.settings?.showRecentActivity && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Atividades Recentes</h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Ao vivo</span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: template.theme.primaryColor }}></div>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma atividade encontrada para este canal
                </div>
              ) : (
                activities.slice(0, 20).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.autor || 'Sistema'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {activity.displayText || activity.content}
                      </p>
                      {activity.valor && (
                        <p className="text-xs font-medium" style={{ color: template.theme.primaryColor }}>
                          {formatCurrency(activity.valor)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}