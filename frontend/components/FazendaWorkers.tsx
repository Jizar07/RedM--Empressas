'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Activity, Star, Award, Clock, BarChart3, User, Settings } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface FazendaWorkersProps {
  firm: FirmConfig;
}

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
}

interface InventoryItem {
  id: string;
  nome: string;
  displayName: string;
  categoria: string;
  quantidade: number;
  criado_em?: string;
  atualizado_em?: string;
}

interface WorkerStats {
  name: string;
  totalActivities: number;
  itemActivities: number;
  financialActivities: number;
  totalRevenue: number;
  plantDeposits: number;
  animalDeliveries: number;
  calculatedRevenue: number;
  lastActivity: string | null;
  firstActivity: string | null;
}

export default function FazendaWorkers({ firm }: FazendaWorkersProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeWorkers, setActiveWorkers] = useState(new Set<string>());
  const [workerStats, setWorkerStats] = useState<WorkerStats[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [plantPrice, setPlantPrice] = useState(2.50); // Default price per plant
  const [animalPrice, setAnimalPrice] = useState(40.00); // Default price per animal
  const [inventory, setInventory] = useState<{[key: string]: InventoryItem}>({});
  const [showInventory, setShowInventory] = useState(false);

  const periods = [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: 'all', label: 'Todo o período' }
  ];

  // Item categorization functions (from EstoqueBW)
  const getCategoryForItem = (itemName: string): string => {
    const name = itemName.toLowerCase();
    
    if (name.includes('seed') || name.includes('semente') || name.includes('milho') || name.includes('trigo') || name.includes('junco')) {
      return 'sementes';
    }
    if (name.includes('racao') || name.includes('feed') || name.includes('portion')) {
      return 'racoes';
    }
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('sheep') || name.includes('donkey') || name.includes('goat') || 
        name.includes('vaca') || name.includes('porco') || name.includes('galinha') || name.includes('ovelha') || name.includes('cabra') || name.includes('burro') ||
        name.includes('_male') || name.includes('_female')) {
      return 'animais';
    }
    if (name.includes('plant') || name.includes('planta') || name.includes('trigo') || name.includes('milho')) {
      return 'plantas';
    }
    
    return 'outros';
  };

  const isPlantItem = (itemName: string): boolean => {
    const category = getCategoryForItem(itemName);
    return category === 'plantas' || category === 'sementes';
  };

  const isAnimalItem = (itemName: string): boolean => {
    const category = getCategoryForItem(itemName);
    return category === 'animais';
  };

  const normalizeText = (text: string): string => {
    if (!text) return 'Item';
    
    return text
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhook/channel-messages', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Filter messages for this firm's channel
        const firmMessages = data.messages?.filter((msg: any) => 
          msg.channelId === firm.channelId
        ) || [];
        
        // Process and sort messages
        const sortedMessages = firmMessages
          .map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp || new Date().toISOString()
          }))
          .sort((a: Activity, b: Activity) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

        setActivities(sortedMessages);
        calculateWorkerStats(sortedMessages);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkerStats = (messages: Activity[]) => {
    const workers = new Set<string>();
    const workerData = new Map<string, WorkerStats>();

    messages.forEach((msg: Activity) => {
      // Track workers (excluding system messages)
      if (msg.autor && msg.autor !== 'Sistema' && msg.autor !== 'System') {
        workers.add(msg.autor);

        if (!workerData.has(msg.autor)) {
          workerData.set(msg.autor, {
            name: msg.autor,
            totalActivities: 0,
            itemActivities: 0,
            financialActivities: 0,
            totalRevenue: 0,
            lastActivity: null,
            firstActivity: null
          });
        }

        const worker = workerData.get(msg.autor)!;
        worker.totalActivities++;

        if (msg.categoria === 'inventario') {
          worker.itemActivities++;
        }
        if (msg.categoria === 'financeiro' && msg.valor) {
          worker.financialActivities++;
          if (msg.tipo === 'deposito' || msg.tipo === 'venda') {
            worker.totalRevenue += msg.valor;
          }
        }

        // Update activity timestamps
        const msgTime = new Date(msg.timestamp);
        if (!worker.lastActivity || msgTime > new Date(worker.lastActivity)) {
          worker.lastActivity = msg.timestamp;
        }
        if (!worker.firstActivity || msgTime < new Date(worker.firstActivity)) {
          worker.firstActivity = msg.timestamp;
        }
      }
    });

    setActiveWorkers(workers);
    
    // Convert to array and sort by total activities
    const statsArray = Array.from(workerData.values()).sort((a, b) => 
      b.totalActivities - a.totalActivities
    );
    
    setWorkerStats(statsArray);
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [firm.channelId]);

  // Calculate summary stats
  const totalWorkers = activeWorkers.size;
  const totalRevenue = workerStats.reduce((sum, worker) => sum + worker.totalRevenue, 0);
  const totalActivities = workerStats.reduce((sum, worker) => sum + worker.totalActivities, 0);
  const avgRevenuePerWorker = totalWorkers > 0 ? totalRevenue / totalWorkers : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-lg h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">👥 {firm.name} - Trabalhadores</h1>
            <p className="text-purple-100">Performance e análise de atividades</p>
          </div>
          <div className="text-right">
            <p className="text-purple-100">Total de Trabalhadores</p>
            <p className="text-3xl font-bold">{totalWorkers}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trabalhadores Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{totalWorkers}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Atividades</p>
              <p className="text-2xl font-bold text-gray-900">{totalActivities}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Média por Trabalhador</p>
              <p className="text-2xl font-bold text-gray-900">R$ {avgRevenuePerWorker.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período de Análise
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar Preços
            </button>
          </div>
        </div>
        
        {/* Price Settings Panel */}
        {showSettings && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Configuração de Preços</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Preço por Planta Depositada
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plantPrice}
                    onChange={(e) => setPlantPrice(parseFloat(e.target.value) || 0)}
                    className="pl-8 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="2.50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Valor pago por cada item de planta (bulrush, corn, etc) depositado
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🐄 Preço por Animal Entregue
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={animalPrice}
                    onChange={(e) => setAnimalPrice(parseFloat(e.target.value) || 0)}
                    className="pl-8 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="40.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Valor pago por cada animal entregue no matadouro
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="p-1 bg-blue-100 rounded-full">
                  <DollarSign className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Como funciona</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Os preços configurados serão usados para calcular a receita real baseada nas quantidades de plantas e animais processados pelos trabalhadores, 
                    ao invés de usar apenas os valores brutos dos depósitos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Workers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de Trabalhadores de {firm.name}
          </h2>
        </div>
        
        {workerStats.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Trabalhador Encontrado</h3>
            <p className="text-gray-500 mb-4">
              Os trabalhadores aparecerão aqui quando houver atividades no canal #{firm.channelId}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-7 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                <div className="text-left">Rank</div>
                <div className="text-left">Trabalhador</div>
                <div className="text-left">Status</div>
                <div className="text-left">Atividades</div>
                <div className="text-left">Receita Total</div>
                <div className="text-left">Ativ/Financ</div>
                <div className="text-left">Última Atividade</div>
              </div>
              
              {workerStats.map((worker, index) => (
                <div key={worker.name} className="grid grid-cols-7 gap-4 py-3 border-t border-gray-200 text-sm">
                  <div className="flex items-center space-x-2">
                    <Star className={`h-4 w-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-300'}`} />
                    <span className="font-medium">#{index + 1}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">{worker.name}</span>
                  </div>
                  <div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Ativo</span>
                  </div>
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-orange-500" />
                    <span className="font-medium">{worker.totalActivities}</span>
                  </div>
                  <div className="font-medium text-green-600">R$ {worker.totalRevenue.toFixed(2)}</div>
                  <div className="text-sm">
                    <span className="text-blue-600">{worker.itemActivities}</span> / 
                    <span className="text-green-600 ml-1">{worker.financialActivities}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-xs">
                      {worker.lastActivity ? 
                        new Date(worker.lastActivity).toLocaleDateString('pt-BR') + ' ' +
                        new Date(worker.lastActivity).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '--'
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 bg-purple-50 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-start space-x-3">
            <div className="p-1 bg-purple-100 rounded-full mt-0.5">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-purple-900">Sistema Configurado</p>
              <p className="text-xs text-purple-700 mt-1">
                Trabalhadores serão automaticamente rastreados baseado em atividades Discord no canal #{firm.channelId}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((rank) => (
            <div key={rank} className={`p-4 rounded-lg border-2 ${
              rank === 1 ? 'border-yellow-200 bg-yellow-50' :
              rank === 2 ? 'border-gray-200 bg-gray-50' :
              'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-center space-x-3">
                {rank === 1 ? (
                  <Award className="h-5 w-5 text-yellow-500" />
                ) : rank === 2 ? (
                  <Award className="h-5 w-5 text-gray-400" />
                ) : (
                  <Award className="h-5 w-5 text-amber-600" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-400">#{rank} --</p>
                  <p className="text-sm text-gray-400">Aguardando dados</p>
                  <p className="text-sm font-medium text-gray-400 mt-1">R$ --</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuração dos Trabalhadores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Roles Permitidas</span>
            </div>
            <p className="text-sm text-gray-600">{firm.allowedRoles.length} roles configuradas</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Canal</span>
            </div>
            <p className="text-sm text-gray-600">#{firm.channelId}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Status</span>
            </div>
            <p className="text-sm text-gray-600">
              {firm.monitoring.enabled ? 'Monitoramento Ativo' : 'Monitoramento Inativo'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}