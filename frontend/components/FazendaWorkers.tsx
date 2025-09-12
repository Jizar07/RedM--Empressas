'use client';

import React, { useState } from 'react';
import { Users, TrendingUp, DollarSign, Activity, Star, Award, Clock, BarChart3, User, Settings, Edit, Eye, Trash2 } from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import FazendaCDPWorkersManagement from './FazendaCDPWorkersManagement';

interface FazendaWorkersProps {
  firm: FirmConfig;
}

// Using types from inventory.ts and useInventoryManager hook

export default function FazendaWorkers({ firm }: FazendaWorkersProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [showSettings, setShowSettings] = useState(false);
  const [plantPrice, setPlantPrice] = useState(2.50); // Default price per plant
  const [animalPrice, setAnimalPrice] = useState(40.00); // Default price per animal
  const [showAdvancedManagement, setShowAdvancedManagement] = useState(false);
  const [selectedWorkerForView, setSelectedWorkerForView] = useState<any>(null);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [selectedWorkerForEdit, setSelectedWorkerForEdit] = useState<any>(null);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);
  const [pricesChanged, setPricesChanged] = useState(false);
  
  // Use the unified inventory manager hook
  const {
    inventoryData,
    loading,
    error,
    isReady
  } = useInventoryManager({ firm });

  // Load prices from localStorage on mount
  React.useEffect(() => {
    const storageKey = `${firm.id}_worker_prices`;
    const savedPrices = localStorage.getItem(storageKey);
    if (savedPrices) {
      try {
        const prices = JSON.parse(savedPrices);
        setPlantPrice(prices.plantPrice || 2.50);
        setAnimalPrice(prices.animalPrice || 40.00);
      } catch (error) {
        console.warn('Failed to load saved prices:', error);
      }
    }
  }, [firm.id]);

  // Save prices to localStorage and backend when they change
  const savePrices = React.useCallback(async (newPlantPrice?: number, newAnimalPrice?: number) => {
    const storageKey = `${firm.id}_worker_prices`;
    const prices = {
      plantPrice: newPlantPrice !== undefined ? newPlantPrice : plantPrice,
      animalPrice: newAnimalPrice !== undefined ? newAnimalPrice : animalPrice
    };
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(prices));
    
    // Save to backend API
    try {
      const response = await fetch(`http://localhost:3050/api/firms/${firm.id}/worker-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Token': process.env.NEXT_PUBLIC_BOT_WEBHOOK_TOKEN || process.env.NEXT_PUBLIC_DISCORD_TOKEN || 'your-bot-token'
        },
        body: JSON.stringify({
          plantPrice: prices.plantPrice,
          animalPrice: prices.animalPrice,
          animalCost: 20.00, // Default animal cost
          updatedBy: 'FazendaWorkers UI'
        })
      });
      
      if (response.ok) {
        console.log('✅ Worker prices synced to backend');
      } else {
        console.error('❌ Failed to sync prices to backend');
      }
    } catch (error) {
      console.error('❌ Error syncing prices to backend:', error);
    }
  }, [firm.id, plantPrice, animalPrice]);

  // Handle price changes without auto-save
  const handlePlantPriceChange = (value: number) => {
    setPlantPrice(value);
    setPricesChanged(true);
  };

  const handleAnimalPriceChange = (value: number) => {
    setAnimalPrice(value);
    setPricesChanged(true);
  };

  // Manual save function
  const handleSavePrices = () => {
    savePrices(plantPrice, animalPrice);
    setPricesChanged(false);
  };

  const periods = [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: 'all', label: 'Todo o período' }
  ];

  // Get worker data from inventory manager analytics
  const workerStats = Object.values(inventoryData.analytics.workers || {}).sort(
    (a, b) => b.totalTransactions - a.totalTransactions
  );
  
  // Helper function to identify category types
  const isPlantCategory = (categoria: string): boolean => {
    const plantCategories = ['seed', 'plant', 'corn', 'bulrush', 'semente', 'milho', 'junco'];
    return plantCategories.some(plant => categoria.toLowerCase().includes(plant.toLowerCase()));
  };

  const isAnimalCategory = (categoria: string): boolean => {
    const animalCategories = ['animal', 'cow', 'pig', 'sheep', 'horse', 'bovino', 'ovino', 'suino'];
    return animalCategories.some(animal => categoria.toLowerCase().includes(animal.toLowerCase()));
  };

  // Calculate summary stats from real data
  const totalWorkers = workerStats.length;
  const totalPayment = workerStats.reduce((sum, worker) => {
    // Calculate payments owed based on work completion tracking
    return sum + Object.entries(worker.categorias || {}).reduce((catSum, [categoria, cat]) => {
      const itemsWithdrawn = cat.removed || 0; // Items taken from inventory
      
      if (isPlantCategory(categoria)) {
        // Plant logic: 1 seed taken = 10 plants expected = 10 × plantPrice payment
        return catSum + (itemsWithdrawn * 10 * plantPrice);
      } else if (isAnimalCategory(categoria)) {
        // Animal logic: 4 animals taken = 1 delivery service = animalPrice payment
        return catSum + ((itemsWithdrawn / 4) * animalPrice);
      } else {
        // Other categories: use plant price as fallback
        return catSum + (itemsWithdrawn * plantPrice);
      }
    }, 0);
  }, 0);
  const totalActivities = workerStats.reduce((sum, worker) => sum + worker.totalTransactions, 0);
  const avgPaymentPerWorker = totalWorkers > 0 ? totalPayment / totalWorkers : 0;

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
              <p className="text-sm font-medium text-gray-600">Total a Pagar</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalPayment.toFixed(2)}</p>
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
              <p className="text-2xl font-bold text-gray-900">R$ {avgPaymentPerWorker.toFixed(2)}</p>
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
                    onChange={(e) => handlePlantPriceChange(parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => handleAnimalPriceChange(parseFloat(e.target.value) || 0)}
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
            
            {/* Save Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSavePrices}
                disabled={!pricesChanged}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  pricesChanged 
                    ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {pricesChanged ? '💾 Salvar Preços' : '✅ Preços Salvos'}
              </button>
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
              <div className="grid grid-cols-8 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                <div className="text-left">Rank</div>
                <div className="text-left">Trabalhador</div>
                <div className="text-left">Status</div>
                <div className="text-left">Transações</div>
                <div className="text-left">Itens +/-</div>
                <div className="text-left">Performance</div>
                <div className="text-left">Primeira Ativ</div>
                <div className="text-left">Ações</div>
              </div>
              
              {workerStats.map((worker, index) => (
                <div key={worker.userId} className="grid grid-cols-8 gap-4 py-3 border-t border-gray-200 text-sm">
                  <div className="flex items-center space-x-2">
                    <Star className={`h-4 w-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-300'}`} />
                    <span className="font-medium">#{index + 1}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">{worker.userName}</span>
                  </div>
                  <div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Ativo</span>
                  </div>
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-orange-500" />
                    <span className="font-medium">{worker.totalTransactions}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600">+{worker.itemsAdded}</span> / 
                    <span className="text-red-600 ml-1">-{worker.itemsRemoved}</span>
                    <div className="text-xs text-gray-500">Net: {worker.netItems}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-blue-600">{(worker.averagePerDay || 0).toFixed(1)}/dia</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-xs">
                      {worker.firstActivity ? 
                        new Date(worker.firstActivity).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
                        : '--'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setSelectedWorkerForView(worker);
                        setShowWorkerModal(true);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedWorkerForEdit(worker);
                        setShowEditWorkerModal(true);
                      }}
                      className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                      title="Editar trabalhador"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
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

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🏆 Top Performers</h3>
          <button
            onClick={() => setShowAdvancedManagement(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Gestão Avançada
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workerStats.slice(0, 3).map((worker, index) => {
            const rank = index + 1;
            return (
              <div key={worker.userId} className={`p-4 rounded-lg border-2 ${
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
                    <p className="font-medium text-gray-900">#{rank} {worker.userName}</p>
                    <p className="text-sm text-gray-600">{worker.totalTransactions} transações</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      {(worker.averagePerDay || 0).toFixed(1)} ativ/dia
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Fill empty spots if less than 3 workers */}
          {Array.from({ length: Math.max(0, 3 - workerStats.length) }).map((_, index) => (
            <div key={`empty-${index}`} className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <Award className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-400">#{workerStats.length + index + 1} --</p>
                  <p className="text-sm text-gray-400">Aguardando dados</p>
                  <p className="text-sm font-medium text-gray-400 mt-1">-- ativ/dia</p>
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

      {/* Advanced Management Modal */}
      {showAdvancedManagement && (
        <FazendaCDPWorkersManagement
          firm={firm}
          onClose={() => setShowAdvancedManagement(false)}
        />
      )}

      {/* Worker Details Modal */}
      {showWorkerModal && selectedWorkerForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                👤 Detalhes do Trabalhador: {selectedWorkerForView.userName}
              </h2>
              <button
                onClick={() => {
                  setShowWorkerModal(false);
                  setSelectedWorkerForView(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedWorkerForView.totalTransactions}</div>
                  <div className="text-sm text-blue-800">Total Transações</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">+{selectedWorkerForView.itemsAdded}</div>
                  <div className="text-sm text-green-800">Itens Adicionados</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">-{selectedWorkerForView.itemsRemoved}</div>
                  <div className="text-sm text-red-800">Itens Removidos</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{(selectedWorkerForView.averagePerDay || 0).toFixed(1)}</div>
                  <div className="text-sm text-purple-800">Média/Dia</div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">📅 Período de Atividade</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Primeira Atividade:</strong> {selectedWorkerForView.firstActivity ? new Date(selectedWorkerForView.firstActivity).toLocaleString('pt-BR') : 'N/A'}</div>
                  <div><strong>Última Atividade:</strong> {selectedWorkerForView.lastActivity ? new Date(selectedWorkerForView.lastActivity).toLocaleString('pt-BR') : 'N/A'}</div>
                  <div><strong>Saldo Líquido:</strong> <span className={`font-medium ${selectedWorkerForView.netItems >= 0 ? 'text-green-600' : 'text-red-600'}`}>{selectedWorkerForView.netItems > 0 ? '+' : ''}{selectedWorkerForView.netItems}</span> itens</div>
                </div>
              </div>

              {/* Category Breakdown */}
              {selectedWorkerForView.categorias && Object.keys(selectedWorkerForView.categorias).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">📊 Atividades por Categoria</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedWorkerForView.categorias).map(([categoria, stats]: [string, any]) => (
                      <div key={categoria} className="flex items-center justify-between bg-white rounded p-2">
                        <span className="font-medium capitalize">{categoria}</span>
                        <div className="text-sm">
                          <span className="text-green-600">+{stats.added || 0}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-red-600">-{stats.removed || 0}</span>
                          <span className="text-gray-400 mx-1">=</span>
                          <span className={`font-medium ${(stats.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.net > 0 ? '+' : ''}{stats.net || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAdvancedManagement(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Abrir Gestão Avançada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Worker Edit Modal */}
      {showEditWorkerModal && selectedWorkerForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                ✏️ Editar Trabalhador: {selectedWorkerForEdit.userName}
              </h2>
              <button
                onClick={() => {
                  setShowEditWorkerModal(false);
                  setSelectedWorkerForEdit(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Quick Stats Overview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📊 Estatísticas Atuais</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{selectedWorkerForEdit.totalTransactions}</div>
                    <div className="text-gray-600">Total Transações</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{(selectedWorkerForEdit.averagePerDay || 0).toFixed(1)}</div>
                    <div className="text-gray-600">Média/Dia</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${selectedWorkerForEdit.netItems >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedWorkerForEdit.netItems > 0 ? '+' : ''}{selectedWorkerForEdit.netItems}
                    </div>
                    <div className="text-gray-600">Itens Líquidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {selectedWorkerForEdit.lastActivity ? 
                        new Date(selectedWorkerForEdit.lastActivity).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
                        : '--'
                      }
                    </div>
                    <div className="text-gray-600">Última Atividade</div>
                  </div>
                </div>
              </div>

              {/* Worker Settings Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-600" />
                  Configurações do Trabalhador
                </h3>
                
                {/* Worker Status */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status do Trabalhador
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option value="active">🟢 Ativo</option>
                      <option value="inactive">🔴 Inativo</option>
                      <option value="on-vacation">🏖️ De Férias</option>
                      <option value="suspended">⏸️ Suspenso</option>
                    </select>
                  </div>

                  {/* Role Assignment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cargo/Função
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option value="worker">👷 Trabalhador</option>
                      <option value="supervisor">👨‍💼 Supervisor</option>
                      <option value="manager">🧑‍💻 Gerente</option>
                      <option value="trainee">🎓 Estagiário</option>
                    </select>
                  </div>

                  {/* Performance Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avaliação de Performance
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className="text-yellow-400 hover:text-yellow-500 text-xl"
                          onClick={() => {}}
                        >
                          ⭐
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-gray-600">(4.2/5)</span>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas do Supervisor
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                      placeholder="Adicione notas sobre o desempenho, comportamento ou observações do trabalhador..."
                    />
                  </div>
                </div>
              </div>

              {/* Activity Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  Configurações de Atividade
                </h3>
                
                <div className="space-y-4">
                  {/* Activity Tracking */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Rastreamento de Atividade</label>
                      <p className="text-xs text-gray-500">Monitorar todas as ações deste trabalhador</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500 transition-colors">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>

                  {/* Notification Settings */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Notificações de Inatividade</label>
                      <p className="text-xs text-gray-500">Alertar se ficar inativo por mais de 3 dias</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                    </button>
                  </div>

                  {/* Performance Alerts */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Alertas de Performance</label>
                      <p className="text-xs text-gray-500">Notificar se performance cair abaixo de 2.0/dia</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500 transition-colors">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  💾 Salvar Alterações
                </button>
                
                <button
                  onClick={() => {
                    setSelectedWorkerForView(selectedWorkerForEdit);
                    setShowWorkerModal(true);
                    setShowEditWorkerModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver Detalhes
                </button>
                
                <button
                  onClick={() => {
                    setShowAdvancedManagement(true);
                    setShowEditWorkerModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Gestão Avançada
                </button>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-amber-600 text-lg">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Importante</p>
                    <p className="text-xs text-amber-700 mt-1">
                      As alterações feitas aqui afetarão como este trabalhador é monitorado e avaliado no sistema. 
                      Certifique-se de salvar as mudanças antes de fechar esta janela.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}