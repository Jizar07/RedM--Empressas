'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Package, AlertTriangle, TrendingUp, Clock, ArrowRight,
  Check, AlertCircle, Eye, ChevronRight, Beaker, MapPin
} from 'lucide-react';
import VeterinariaItemTracker, {
  VeterinariaWorkerTracking,
  VeterinariaItem,
  RecipeAttempt
} from '@/services/VeterinariaItemTracker';

interface VeterinariaWorkerDetailsModalProps {
  workerId: string;
  workerName: string;
  onClose: () => void;
}

export default function VeterinariaWorkerDetailsModal({
  workerId,
  workerName,
  onClose
}: VeterinariaWorkerDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<VeterinariaWorkerTracking | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'flow' | 'recipes' | 'timeline'>('overview');

  useEffect(() => {
    loadTrackingData();
  }, [workerId]);

  const loadTrackingData = async () => {
    setLoading(true);
    try {
      const data = await VeterinariaItemTracker.trackWorkerActivity(workerId, workerName);
      setTracking(data);
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getItemDisplayName = (itemName: string): string => {
    const nameMap: Record<string, string> = {
      'embalagem': 'Embalagem',
      'rotulo': 'Rótulo',
      'garrafadevidro': 'Garrafa de Vidro',
      'capsula_plastica': 'Cápsula Plástica',
      'seringa_de_vidro': 'Seringa de Vidro',
      'libidgel_bovino': 'Libidgel Bovino',
      'libidgel_suino': 'Libidgel Suíno',
      'libidgel_aviario': 'Libidgel Aviário',
      'libidgel_caprino': 'Libidgel Caprino'
    };
    return nameMap[itemName] || itemName;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados de rastreamento...</p>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">Erro ao carregar dados</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Rastreamento de Materiais - Veterinária</h2>
            <p className="text-green-100 mt-1">Trabalhador: {workerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Itens Retirados</p>
              <p className="text-2xl font-bold text-gray-900">{tracking.totalItemsTaken}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Itens Depositados</p>
              <p className="text-2xl font-bold text-green-600">{tracking.totalItemsDeposited}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Itens Faltando</p>
              <p className="text-2xl font-bold text-red-600">{tracking.totalItemsMissing}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Última Atividade</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(tracking.lastActivity)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                selectedTab === 'overview'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="inline-block h-4 w-4 mr-2" />
              Resumo
            </button>
            <button
              onClick={() => setSelectedTab('flow')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                selectedTab === 'flow'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowRight className="inline-block h-4 w-4 mr-2" />
              Fluxo de Materiais
            </button>
            <button
              onClick={() => setSelectedTab('recipes')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                selectedTab === 'recipes'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Beaker className="inline-block h-4 w-4 mr-2" />
              Receitas
            </button>
            <button
              onClick={() => setSelectedTab('timeline')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                selectedTab === 'timeline'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="inline-block h-4 w-4 mr-2" />
              Linha do Tempo
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Material Balance */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Balanço de Materiais</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Retirado</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Depositado</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Usado em Receitas</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Devolvido</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Faltando</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.from(tracking.veterinariaItems.values()).map((item) => (
                        <tr key={item.itemName} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {getItemDisplayName(item.itemName)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">
                            {item.takenFromVet}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="text-green-600 font-medium">
                              {item.depositedToBercario + item.depositedToFazenda}
                            </span>
                            {(item.depositedToBercario > 0 || item.depositedToFazenda > 0) && (
                              <div className="text-xs text-gray-500">
                                {item.depositedToBercario > 0 && `Bercário: ${item.depositedToBercario}`}
                                {item.depositedToBercario > 0 && item.depositedToFazenda > 0 && ' | '}
                                {item.depositedToFazenda > 0 && `Fazenda: ${item.depositedToFazenda}`}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-blue-600">
                            {item.usedInRecipes}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-purple-600">
                            {item.returnedToVet}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {item.missing > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {item.missing} ⚠️
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                0 ✓
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suspicious Activities */}
              {tracking.suspiciousActivities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                    Atividades Suspeitas
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      {tracking.suspiciousActivities.map((activity, idx) => (
                        <li key={idx} className="flex items-start">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Flow Tab */}
          {selectedTab === 'flow' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Fluxo de Materiais da Veterinária</h3>
              {Array.from(tracking.veterinariaItems.values()).map((item) => (
                <div key={item.itemName} className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{getItemDisplayName(item.itemName)}</h4>

                  <div className="flex items-center justify-between mb-4">
                    {/* Source */}
                    <div className="text-center">
                      <div className="bg-green-100 rounded-lg p-3">
                        <Package className="h-6 w-6 text-green-600 mx-auto" />
                        <p className="text-sm font-medium text-gray-900 mt-1">Veterinária</p>
                        <p className="text-lg font-bold text-green-600">{item.takenFromVet}</p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex-1 px-4">
                      <div className="relative">
                        <div className="h-1 bg-gray-300 rounded"></div>
                        <ArrowRight className="h-6 w-6 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white" />
                      </div>
                    </div>

                    {/* Destinations */}
                    <div className="flex space-x-3">
                      {item.depositedToBercario > 0 && (
                        <div className="text-center">
                          <div className="bg-blue-100 rounded-lg p-3">
                            <MapPin className="h-6 w-6 text-blue-600 mx-auto" />
                            <p className="text-sm font-medium text-gray-900 mt-1">Bercário</p>
                            <p className="text-lg font-bold text-blue-600">{item.depositedToBercario}</p>
                          </div>
                        </div>
                      )}

                      {item.depositedToFazenda > 0 && (
                        <div className="text-center">
                          <div className="bg-orange-100 rounded-lg p-3">
                            <MapPin className="h-6 w-6 text-orange-600 mx-auto" />
                            <p className="text-sm font-medium text-gray-900 mt-1">Fazenda</p>
                            <p className="text-lg font-bold text-orange-600">{item.depositedToFazenda}</p>
                          </div>
                        </div>
                      )}

                      {item.returnedToVet > 0 && (
                        <div className="text-center">
                          <div className="bg-purple-100 rounded-lg p-3">
                            <Package className="h-6 w-6 text-purple-600 mx-auto" />
                            <p className="text-sm font-medium text-gray-900 mt-1">Devolvido</p>
                            <p className="text-lg font-bold text-purple-600">{item.returnedToVet}</p>
                          </div>
                        </div>
                      )}

                      {item.missing > 0 && (
                        <div className="text-center">
                          <div className="bg-red-100 rounded-lg p-3">
                            <AlertTriangle className="h-6 w-6 text-red-600 mx-auto" />
                            <p className="text-sm font-medium text-gray-900 mt-1">Faltando</p>
                            <p className="text-lg font-bold text-red-600">{item.missing}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recipes Tab */}
          {selectedTab === 'recipes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Tentativas de Receitas</h3>
              {tracking.recipeAttempts.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Beaker className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhuma tentativa de receita detectada</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {tracking.recipeAttempts.map((attempt, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{attempt.recipeName}</h4>
                        {attempt.isComplete ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Pronto para Produzir
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Em Progresso
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {attempt.ingredientsRequired.map((ing, ingIdx) => (
                          <div key={ingIdx} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {getItemDisplayName(ing.itemName)}
                            </span>
                            <div className="flex items-center">
                              <span className={`text-sm font-medium ${
                                ing.collected >= ing.quantity ? 'text-green-600' : 'text-gray-900'
                              }`}>
                                {ing.collected}/{ing.quantity}
                              </span>
                              {ing.collected >= ing.quantity && (
                                <Check className="h-4 w-4 text-green-600 ml-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {attempt.isComplete && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-green-600 font-medium">
                            ✓ Todos os ingredientes coletados - Pode produzir 10x {attempt.recipeName}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {selectedTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Linha do Tempo - Materiais da Veterinária</h3>
              <div className="space-y-2">
                {Array.from(tracking.veterinariaItems.values())
                  .flatMap(item => item.transactions)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 50)
                  .map((transaction, idx) => (
                    <div key={idx} className="flex items-center space-x-4 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="text-xs text-gray-500 min-w-[100px]">
                        {formatDate(transaction.timestamp)}
                      </div>

                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.action === 'take' ? 'bg-red-100 text-red-800' :
                        transaction.action === 'deposit' ? 'bg-green-100 text-green-800' :
                        transaction.action === 'return' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.action === 'take' ? 'Retirou' :
                         transaction.action === 'deposit' ? 'Depositou' :
                         transaction.action === 'return' ? 'Devolveu' :
                         'Usou'}
                      </div>

                      <div className="flex-1">
                        <span className="font-medium text-sm text-gray-900">
                          {transaction.quantity}x {getItemDisplayName(transaction.itemName)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600">
                        {transaction.action === 'take' && (
                          <span className="flex items-center">
                            <span className="text-green-600">Veterinária</span>
                          </span>
                        )}
                        {transaction.action === 'deposit' && (
                          <span className="flex items-center">
                            <span className="text-green-600">Veterinária</span>
                            <ChevronRight className="h-4 w-4 mx-1" />
                            <span className={
                              transaction.destination === 'bercario' ? 'text-blue-600' :
                              transaction.destination === 'fazenda' ? 'text-orange-600' :
                              'text-gray-600'
                            }>
                              {transaction.destination === 'bercario' ? 'Bercário' :
                               transaction.destination === 'fazenda' ? 'Fazenda' :
                               transaction.destination}
                            </span>
                          </span>
                        )}
                        {transaction.action === 'return' && (
                          <span className="text-purple-600">Devolvido à Veterinária</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}