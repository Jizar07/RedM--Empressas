'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Package, DollarSign, Plus, Minus, Users, Activity, Settings, BarChart3, Archive, MapPin } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda' | 'compra' | 'entrega';
  categoria?: 'inventario' | 'financeiro' | 'sistema';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess?: boolean;
  displayText?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
  channelId?: string;
  deliveryCount?: number;
  boxesDelivered?: number;
  missao?: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
  subtitle?: string;
}

interface FerroviaDashboardProps {
  firm: FirmConfig;
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          <div className="ml-4 flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 text-white`}>
        <div className="flex items-center">
          <div className="p-2 bg-white bg-opacity-20 rounded-lg">
            {icon}
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-white opacity-90">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-white opacity-75 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FerroviaDashboard({ firm }: FerroviaDashboardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  // Metrics
  const [totalMissions, setTotalMissions] = useState(0);
  const [totalBoxesDelivered, setTotalBoxesDelivered] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(new Set<string>());
  const [bankBalance, setBankBalance] = useState(0);

  // Fetch activities from the API - filtered by firm's channel
  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];
        
        // Sort by timestamp (newest first)
        const sortedMessages = messages.sort((a: Activity, b: Activity) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setActivities(sortedMessages);
        setLastUpdate(data.lastUpdated || new Date().toISOString());
        
        // Calculate metrics from firm-specific data
        calculateMetrics(sortedMessages);
      } else {
        console.error('Failed to fetch activities:', response.status);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (activities: Activity[]) => {
    // Delivery missions
    const deliveryActivities = activities.filter(a => a.tipo === 'entrega');
    setTotalMissions(deliveryActivities.length);
    
    // Total boxes delivered
    const totalBoxes = deliveryActivities.reduce((sum, activity) => 
      sum + (activity.boxesDelivered || 0), 0);
    setTotalBoxesDelivered(totalBoxes);
    
    // Withdrawals
    const withdrawalActivities = activities.filter(a => a.tipo === 'saque');
    const totalWithdrawn = withdrawalActivities.reduce((sum, activity) => 
      sum + (activity.valor || 0), 0);
    setTotalWithdrawals(totalWithdrawn);
    
    // Active workers (anyone who did missions or withdrawals)
    const workers = new Set<string>();
    [...deliveryActivities, ...withdrawalActivities].forEach(activity => {
      if (activity.autor && activity.autor !== 'Sistema') {
        workers.add(activity.autor);
      }
    });
    setActiveWorkers(workers);
    
    // Bank balance from latest financial activity
    setBankBalance(extractBankBalance(activities));
  };

  // Extract bank balance from Discord messages
  const extractBankBalance = (activities: Activity[]): number => {
    // Look for latest transaction with "Saldo após" information
    const financialActivities = activities
      .filter(activity => activity.categoria === 'financeiro' && activity.content)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    for (const activity of financialActivities) {
      // Check for "Saldo após depósito:" or "Saldo após saque:" (handle multiline)
      const balanceMatch = activity.content?.match(/Saldo após (?:depósito|saque):\s*\$?([0-9,.]+)/s) || 
                          activity.content?.match(/Saldo após (?:depósito|saque):[^\$]*\$([0-9,.]+)/s);
      if (balanceMatch) {
        const balance = parseFloat(balanceMatch[1].replace(',', ''));
        if (!isNaN(balance)) {
          console.log('🏦 Found bank balance:', balance, 'from message:', activity.content.substring(0, 100));
          return balance;
        }
      }
    }
    
    console.log('🏦 No bank balance found in', financialActivities.length, 'financial activities');
    return 0; // Default if no balance found
  };

  // Get delivery completion activities for "Missões Completas"
  const getMissionActivities = (): Activity[] => {
    const missionActivities = activities.filter(activity => 
      activity.tipo === 'entrega' // Delivery completions
    );
    return missionActivities.slice(0, 100); // Latest 100
  };

  // Get ONLY withdrawal activities for money activities
  const getWithdrawalActivities = (): Activity[] => {
    const withdrawalActivities = activities.filter(activity => 
      activity.categoria === 'financeiro' &&
      activity.tipo === 'saque' // ONLY withdrawals
    );
    return withdrawalActivities.slice(0, 100); // Latest 100
  };

  const getActivityIcon = (activity: Activity) => {
    if (activity.tipo === 'entrega') {
      return <MapPin className="h-5 w-5 text-green-600" />;
    }
    if (activity.tipo === 'saque') {
      return <Minus className="h-5 w-5 text-red-600" />;
    }
    return <Activity className="h-5 w-5 text-gray-400" />;
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [firm.channelId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const missionActivities = getMissionActivities();
  const withdrawalActivities = getWithdrawalActivities();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{firm.name}</h1>
          <p className="text-gray-600">Painel de controle da ferrovia</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Última atualização:</p>
          <p>{lastUpdate ? new Date(lastUpdate).toLocaleString('pt-BR') : 'Nunca'}</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Missões Completadas"
          value={totalMissions}
          icon={<MapPin className="h-8 w-8" />}
          color="green"
          loading={loading}
        />
        
        <MetricCard
          title="Caixas Entregues"
          value={totalBoxesDelivered.toLocaleString()}
          icon={<Package className="h-8 w-8" />}
          color="blue"
          loading={loading}
        />
        
        <MetricCard
          title="Total Sacado"
          value={`$${totalWithdrawals.toFixed(2)}`}
          icon={<DollarSign className="h-8 w-8" />}
          color="red"
          loading={loading}
        />
        
        <MetricCard
          title="Trabalhadores Ativos"
          value={activeWorkers.size}
          icon={<Users className="h-8 w-8" />}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Activities Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mission Activities */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">
              🚂 Missões Completas ({missionActivities.length})
            </h3>
          </div>
          
          <div className="p-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : missionActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma missão completa capturada</p>
            ) : (
              <div className="space-y-2">
                {missionActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                    <div className="flex-shrink-0">{getActivityIcon(activity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {activity.autor || 'Sistema'}
                        </span>
                        <span className="text-gray-600">completou missão</span>
                        {activity.missao && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            #{activity.missao}
                          </span>
                        )}
                        <span className="text-gray-600">com</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          {activity.boxesDelivered || activity.quantidade || 0} caixas
                        </span>
                        <span className="text-gray-600">por</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          ${typeof activity.valor === 'number' ? activity.valor.toFixed(2) : '0.00'}
                        </span>
                      </div>
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

        {/* Money Activities */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">
              💰 Atividades de Dinheiro ({withdrawalActivities.length})
            </h3>
          </div>
          
          <div className="p-4 max-h-96 overflow-y-auto">
            {withdrawalActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum saque capturado</p>
            ) : (
              <div className="space-y-2">
                {withdrawalActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                    <div className="flex-shrink-0">{getActivityIcon(activity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {activity.autor || 'Sistema'}
                        </span>
                        <span className="text-gray-600">sacou</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          ${typeof activity.valor === 'number' ? activity.valor.toFixed(2) : '0.00'}
                        </span>
                        <span className="text-gray-600">da cooperativa</span>
                      </div>
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
    </div>
  );
}