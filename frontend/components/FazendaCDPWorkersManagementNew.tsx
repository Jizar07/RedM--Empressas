'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, Plus, Edit, Trash2, Eye, Crown, User,
  Activity, DollarSign, Package, TrendingUp, Clock,
  X, Save, AlertTriangle, BarChart3, Award, Star,
  ArrowUp, ArrowDown, ChevronsUpDown, Trophy
} from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import { WorkerInventoryStats } from '@/types/inventory';
import WorkerRankings from './WorkerRankings';

interface FazendaCDPWorkersManagementProps {
  firm: FirmConfig;
  onClose?: () => void; // Optional since it's not always a modal
}

type WorkerRole = 'manager' | 'worker';

interface WorkerProfile {
  userId: string;
  userName: string;
  role: WorkerRole;
  notes: string;
  addedAt: string;
  addedBy: string;
}

export default function FazendaCDPWorkersManagement({
  firm,
  onClose
}: FazendaCDPWorkersManagementProps) {
  const isModal = !!onClose; // Determine if this is being used as a modal
  const [activeTab, setActiveTab] = useState<'management' | 'rankings'>('management');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | WorkerRole>('all');
  const [sortBy, setSortBy] = useState<'name' | 'activities' | 'role' | 'added' | 'performance' | 'lastActivity'>('activities');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [selectedWorkerStats, setSelectedWorkerStats] = useState<WorkerInventoryStats | null>(null);
  const [workerProfiles, setWorkerProfiles] = useState<Map<string, WorkerProfile>>(new Map());

  // Use the unified inventory manager hook
  const {
    inventoryData,
    loading,
    error,
    isReady
  } = useInventoryManager({ firm });

  // Create ranking map based on performance (totalTransactions)
  const workerRankings = useMemo(() => {
    const allWorkers = Object.values(inventoryData.analytics.workers || {});
    const sortedByPerformance = [...allWorkers].sort((a, b) => b.totalTransactions - a.totalTransactions);

    const rankMap = new Map();
    sortedByPerformance.forEach((worker, index) => {
      rankMap.set(worker.userId, index + 1);
    });

    return rankMap;
  }, [inventoryData.analytics.workers]);

  // Get worker data from inventory manager analytics (sorted by current criteria)
  const workerStats = useMemo(() => {
    return Object.values(inventoryData.analytics.workers || {}).sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return sortDirection === 'asc'
            ? a.userName.localeCompare(b.userName)
            : b.userName.localeCompare(a.userName);
        case 'activities':
          return sortDirection === 'asc'
            ? a.totalTransactions - b.totalTransactions
            : b.totalTransactions - a.totalTransactions;
        case 'role':
          const roleA = workerProfiles.get(a.userId)?.role || 'worker';
          const roleB = workerProfiles.get(b.userId)?.role || 'worker';
          return sortDirection === 'asc'
            ? roleA.localeCompare(roleB)
            : roleB.localeCompare(roleA);
        case 'added':
          const addedA = workerProfiles.get(a.userId)?.addedAt || a.firstActivity;
          const addedB = workerProfiles.get(b.userId)?.addedAt || b.firstActivity;
          return sortDirection === 'asc'
            ? new Date(addedA).getTime() - new Date(addedB).getTime()
            : new Date(addedB).getTime() - new Date(addedA).getTime();
        case 'performance':
          return sortDirection === 'asc'
            ? a.averagePerDay - b.averagePerDay
            : b.averagePerDay - a.averagePerDay;
        case 'lastActivity':
          const lastA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const lastB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          return sortDirection === 'asc'
            ? lastA - lastB
            : lastB - lastA;
        default:
          return b.totalTransactions - a.totalTransactions;
      }
    });
  }, [inventoryData.analytics.workers, sortBy, sortDirection, workerProfiles]);

  // Filter workers based on search and role
  const filteredWorkers = useMemo(() => {
    return workerStats.filter(worker => {
      const matchesSearch = searchTerm === '' ||
        worker.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.userId.toLowerCase().includes(searchTerm.toLowerCase());

      const profile = workerProfiles.get(worker.userId);
      const workerRole = profile?.role || 'worker';
      const matchesRole = selectedRole === 'all' || workerRole === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [workerStats, searchTerm, selectedRole, workerProfiles]);

  // Load worker profiles from localStorage
  React.useEffect(() => {
    const storageKey = `fazenda-cabra-da-peste_worker-profiles`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const profilesArray = JSON.parse(stored);
        const profilesMap = new Map(profilesArray.map((p: WorkerProfile) => [p.userId, p]));
        setWorkerProfiles(profilesMap);
      } catch (error) {
        console.error('Error loading worker profiles:', error);
      }
    }
  }, []);

  // Helper functions
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const SortIndicator = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-purple-600" />
      : <ArrowDown className="h-4 w-4 text-purple-600" />;
  };

  const getWorkerRole = (userId: string): WorkerRole => {
    return workerProfiles.get(userId)?.role || 'worker';
  };

  const getRoleIcon = (role: WorkerRole) => {
    return role === 'manager' ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const getRoleColor = (role: WorkerRole) => {
    return role === 'manager'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-blue-100 text-blue-800';
  };

  const showWorkerAnalytics = (worker: WorkerInventoryStats) => {
    setSelectedWorkerStats(worker);
    setShowAnalyticsModal(true);
  };

  const showWorkerDetails = (worker: WorkerInventoryStats) => {
    setSelectedWorkerStats(worker);
    setShowDetailModal(true);
  };

  const addWorker = (userName: string, role: WorkerRole, notes: string) => {
    const newProfile: WorkerProfile = {
      userId: `manual_${Date.now()}`,
      userName,
      role,
      notes,
      addedAt: new Date().toISOString(),
      addedBy: 'Manual'
    };

    const newProfiles = new Map(workerProfiles);
    newProfiles.set(newProfile.userId, newProfile);
    saveProfiles(newProfiles);
  };

  const saveProfiles = (profiles: Map<string, WorkerProfile>) => {
    const storageKey = `fazenda-cabra-da-peste_worker-profiles`;
    const profilesArray = Array.from(profiles.values());
    localStorage.setItem(storageKey, JSON.stringify(profilesArray));
    setWorkerProfiles(profiles);
  };

  const updateWorkerProfile = (userId: string, updates: Partial<WorkerProfile>) => {
    const newProfiles = new Map(workerProfiles);
    const existing = newProfiles.get(userId) || {
      userId,
      userName: workerStats.find(w => w.userId === userId)?.userName || 'Unknown',
      role: 'worker' as WorkerRole,
      notes: '',
      addedAt: new Date().toISOString(),
      addedBy: 'Auto-discovered'
    };

    newProfiles.set(userId, { ...existing, ...updates });
    saveProfiles(newProfiles);
  };

  const deleteWorker = (userId: string) => {
    const newProfiles = new Map(workerProfiles);
    newProfiles.delete(userId);
    saveProfiles(newProfiles);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const content = (
    <>
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex space-x-1 p-2">
          <button
            onClick={() => setActiveTab('management')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === 'management'
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="font-medium">Gestão de Trabalhadores</span>
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === 'rankings'
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="font-medium">Rankings</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'management' ? (
        <>
          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Trabalhadores
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Nome ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Função
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'all' | WorkerRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todas as Funções</option>
              <option value="manager">Gerentes</option>
              <option value="worker">Trabalhadores</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="activities">Atividades</option>
              <option value="name">Nome</option>
              <option value="role">Função</option>
              <option value="performance">Performance</option>
              <option value="lastActivity">Última Atividade</option>
              <option value="added">Data de Adição</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total de Trabalhadores</p>
              <p className="text-2xl font-bold text-blue-900">{filteredWorkers.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Gerentes</p>
              <p className="text-2xl font-bold text-purple-900">
                {filteredWorkers.filter(w => getWorkerRole(w.userId) === 'manager').length}
              </p>
            </div>
            <Crown className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Transações</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredWorkers.reduce((sum, w) => sum + w.totalTransactions, 0)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Média Atividade/Dia</p>
              <p className="text-2xl font-bold text-orange-900">
                {filteredWorkers.length > 0
                  ? (filteredWorkers.reduce((sum, w) => sum + (w.averagePerDay || 0), 0) / filteredWorkers.length).toFixed(1)
                  : '0'
                }
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">📊 Lista Completa de Trabalhadores ({filteredWorkers.length})</h3>
        </div>

        <div className="p-4">
          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedRole !== 'all' ? 'Nenhum trabalhador encontrado' : 'Nenhum trabalhador'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedRole !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Os trabalhadores aparecerão automaticamente quando houver atividades'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-40"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Trabalhador
                        <SortIndicator column="name" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-32"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-1">
                        Função
                        <SortIndicator column="role" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-20"
                      onClick={() => handleSort('activities')}
                    >
                      <div className="flex items-center gap-1">
                        Transações
                        <SortIndicator column="activities" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Itens
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-20"
                      onClick={() => handleSort('performance')}
                    >
                      <div className="flex items-center gap-1">
                        Performance
                        <SortIndicator column="performance" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-24"
                      onClick={() => handleSort('lastActivity')}
                    >
                      <div className="flex items-center gap-1">
                        Última Atividade
                        <SortIndicator column="lastActivity" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkers.map((worker, index) => {
                    const profile = workerProfiles.get(worker.userId);
                    const role = getWorkerRole(worker.userId);

                    return (
                      <tr key={worker.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {(() => {
                              // Get the actual performance rank for this worker
                              const actualRank = workerRankings.get(worker.userId) || 0;
                              const isPerformanceSort = sortBy === 'activities' || sortBy === 'performance';

                              if (isPerformanceSort && sortDirection === 'desc') {
                                // Performance ranking with special icons - using actual rank
                                return (
                                  <>
                                    <Star className={`h-4 w-4 mr-2 ${
                                      actualRank === 1 ? 'text-yellow-500' :
                                      actualRank === 2 ? 'text-gray-400' :
                                      actualRank === 3 ? 'text-amber-600' : 'text-gray-300'
                                    }`} />
                                    <span className="text-sm font-medium text-gray-900">#{actualRank}</span>
                                  </>
                                );
                              } else {
                                // All other sorts: show actual performance rank
                                return (
                                  <>
                                    <User className="h-4 w-4 mr-2 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">#{actualRank}</span>
                                  </>
                                );
                              }
                            })()}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                {getRoleIcon(role)}
                              </div>
                            </div>
                            <div className="ml-3 min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900">{worker.userName}</div>
                              <div className="text-xs text-gray-500">{worker.userId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                            {getRoleIcon(role)}
                            <span className="ml-1">
                              {role === 'manager' ? 'Gerente' : 'Trabalhador'}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-medium text-gray-900">{worker.totalTransactions}</span>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <div className="text-center">
                            <div className="text-xs">
                              <span className="text-green-600">+{worker.itemsAdded}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-red-600">-{worker.itemsRemoved}</span>
                            </div>
                            <div className="text-xs text-gray-500">Net: {worker.netItems}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm text-blue-600">{(worker.averagePerDay || 0).toFixed(1)}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-gray-500">
                          {worker.lastActivity
                            ? new Date(worker.lastActivity).toLocaleDateString('pt-BR', {
                                month: 'short',
                                day: 'numeric'
                              })
                            : '--'
                          }
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => showWorkerDetails(worker)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                              title="Ver Detalhes e Embeds"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => showWorkerAnalytics(worker)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="Analytics"
                            >
                              <BarChart3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWorker(profile || {
                                  userId: worker.userId,
                                  userName: worker.userName,
                                  role: 'worker',
                                  notes: '',
                                  addedAt: worker.firstActivity,
                                  addedBy: 'Auto-discovered'
                                });
                                setShowEditModal(true);
                              }}
                              className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Worker Analytics Modal */}
      {showAnalyticsModal && selectedWorkerStats && (
        <WorkerAnalyticsModal
          worker={selectedWorkerStats}
          workerProfile={workerProfiles.get(selectedWorkerStats.userId)}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedWorkerStats(null);
          }}
        />
      )}

      {/* Worker Detail Modal */}
      {showDetailModal && selectedWorkerStats && (
        <WorkerDetailModal
          worker={selectedWorkerStats}
          workerProfile={workerProfiles.get(selectedWorkerStats.userId)}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedWorkerStats(null);
          }}
        />
      )}
        </>
      ) : (
        <WorkerRankings />
      )}
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">👥 Gestão Avançada de Trabalhadores</h2>
                <p className="text-purple-100">{firm.name} - Sistema Completo</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Non-modal version
  return (
    <div className="space-y-6">
      {content}
    </div>
  );
}

// Worker Analytics Modal Component
interface WorkerAnalyticsModalProps {
  worker: WorkerInventoryStats;
  workerProfile?: WorkerProfile;
  onClose: () => void;
}

function WorkerAnalyticsModal({ worker, workerProfile, onClose }: WorkerAnalyticsModalProps) {
  const role = workerProfile?.role || 'worker';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                {role === 'manager' ? <Crown className="h-6 w-6 text-purple-600" /> : <User className="h-6 w-6 text-purple-600" />}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{worker.userName}</h3>
                <p className="text-sm text-gray-600">
                  {role === 'manager' ? 'Gerente' : 'Trabalhador'} • Analytics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-600">Total Atividades</p>
              <p className="text-2xl font-bold text-blue-900">{worker.totalTransactions}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-green-600">Itens Adicionados</p>
              <p className="text-2xl font-bold text-green-900">{worker.itemsAdded}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-600">Itens Removidos</p>
              <p className="text-2xl font-bold text-red-900">{worker.itemsRemoved}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Worker Detail Modal Component with Backend Integration
interface WorkerDetailModalProps {
  worker: WorkerInventoryStats;
  workerProfile?: WorkerProfile;
  onClose: () => void;
}

interface WorkerDetailData {
  workerId: string;
  registration?: any;
  activeSession?: any;
  statistics: {
    totalEarnings: number;
    totalPlants: number;
    totalAnimals: number;
    sessionsCount: number;
    lastActive: string | null;
  };
  history: {
    payments: any[];
    archivedSessions: any[];
    ferroviaSession?: any;
  };
}

function WorkerDetailModal({ worker, workerProfile, onClose }: WorkerDetailModalProps) {
  const [detailData, setDetailData] = React.useState<WorkerDetailData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const role = workerProfile?.role || 'worker';

  React.useEffect(() => {
    fetchWorkerDetails();
  }, [worker.userId]);

  const fetchWorkerDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3050/api/worker-activity/worker-details/${worker.userId}`, {
        headers: {
          'x-bot-token': process.env.NEXT_PUBLIC_DISCORD_TOKEN || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch worker details: ${response.status}`);
      }

      const data = await response.json();
      setDetailData(data);
    } catch (err) {
      console.error('Error fetching worker details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load worker details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{worker.userName}</h3>
                <p className="text-sm text-gray-600">
                  {role === 'manager' ? 'Gerente' : 'Trabalhador'} • Detalhes Completos & Discord Embeds
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* EXISTING WORKER DATA - Always show this first */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              Dados do Sistema (Frontend)
            </h4>

            {/* Summary Stats from existing data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Transações</p>
                    <p className="text-2xl font-bold text-blue-900">{worker.totalTransactions}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Itens Adicionados</p>
                    <p className="text-2xl font-bold text-green-900">{worker.itemsAdded}</p>
                  </div>
                  <Package className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Itens Removidos</p>
                    <p className="text-2xl font-bold text-red-900">{worker.itemsRemoved}</p>
                  </div>
                  <Package className="h-8 w-8 text-red-500" />
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Média/Dia</p>
                    <p className="text-2xl font-bold text-purple-900">{worker.averagePerDay.toFixed(1)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Primeira Atividade:</span>
                  <p className="font-medium">
                    {worker.firstActivity ? new Date(worker.firstActivity).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Última Atividade:</span>
                  <p className="font-medium">
                    {worker.lastActivity ? new Date(worker.lastActivity).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Saldo de Itens:</span>
                  <p className="font-medium">{worker.netItems}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total de Categorias:</span>
                  <p className="font-medium">{Object.keys(worker.categorias || {}).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* DISCORD BOT DATA - Show loading/error/data below the existing data */}
          <div className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Eye className="h-5 w-5 text-green-500 mr-2" />
              Dados do Discord Bot (Backend)
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <span className="ml-3 text-gray-600">Carregando dados do Discord bot...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700">Erro ao carregar dados do Discord: {error}</span>
                  <button
                    onClick={fetchWorkerDetails}
                    className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            ) : detailData ? (
              <>
              {/* Registration Information */}
              {detailData.registration && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Crown className="h-5 w-5 text-yellow-500 mr-2" />
                    Informações de Registro
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Nome no Jogo</p>
                        <p className="text-gray-900">{detailData.registration.ingameName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Função</p>
                        <p className="text-gray-900">{detailData.registration.functionName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Registrado em</p>
                        <p className="text-gray-900">
                          {new Date(detailData.registration.registeredAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Summary */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
                  Estatísticas Gerais
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600">Total Ganho</p>
                    <p className="text-xl font-bold text-green-900">
                      ${detailData.statistics.totalEarnings.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-600">Plantas</p>
                    <p className="text-xl font-bold text-blue-900">{detailData.statistics.totalPlants}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-purple-600">Animais</p>
                    <p className="text-xl font-bold text-purple-900">{detailData.statistics.totalAnimals}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-yellow-600">Sessões</p>
                    <p className="text-xl font-bold text-yellow-900">{detailData.statistics.sessionsCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">Última Atividade</p>
                    <p className="text-sm font-bold text-gray-900">
                      {detailData.statistics.lastActive
                        ? new Date(detailData.statistics.lastActive).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Session */}
              {detailData.activeSession && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 text-green-500 mr-2" />
                    Sessão Ativa (Discord Embed)
                  </h4>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-green-700">ID da Sessão</p>
                        <p className="text-gray-900 font-mono text-sm">{detailData.activeSession.sessionId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700">Total de Créditos</p>
                        <p className="text-gray-900 text-lg font-bold">
                          ${detailData.activeSession.totalCredits?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700">Última Atividade</p>
                        <p className="text-gray-900">
                          {new Date(detailData.activeSession.lastActivity).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Plant Transactions */}
                    {detailData.activeSession.plantTransactions?.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">🌾 Transações de Plantas</h5>
                        <div className="max-h-32 overflow-y-auto">
                          {detailData.activeSession.plantTransactions.map((transaction: any, index: number) => (
                            <div key={index} className="text-sm text-gray-700 py-1">
                              {transaction.type === 'seed_taken' ? '🌱' :
                                transaction.itemName.toLowerCase().includes('junco') || transaction.itemName.toLowerCase().includes('bulrush') ? '🫘' :
                                transaction.itemName.toLowerCase().includes('trigo') || transaction.itemName.toLowerCase().includes('wheat') ? '🌾' :
                                transaction.itemName.toLowerCase().includes('milho') || transaction.itemName.toLowerCase().includes('corn') ? '🌽' :
                                '🌾'} {transaction.itemName} x{transaction.quantity}
                              <span className="text-gray-500 ml-2">
                                {new Date(transaction.timestamp).toLocaleTimeString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Animal Transactions */}
                    {detailData.activeSession.animalTransactions?.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">🐄 Transações de Animais</h5>
                        <div className="max-h-32 overflow-y-auto">
                          {detailData.activeSession.animalTransactions.map((transaction: any, index: number) => (
                            <div key={index} className="text-sm text-gray-700 py-1">
                              {transaction.type === 'animals_taken' ? '🚚' : '💰'} {transaction.quantity} animais
                              {transaction.amount && ` - $${transaction.amount.toFixed(2)}`}
                              <span className="text-gray-500 ml-2">
                                {new Date(transaction.timestamp).toLocaleTimeString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment History */}
              {detailData.history.payments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                    Histórico de Pagamentos
                  </h4>
                  <div className="space-y-3">
                    {detailData.history.payments.slice(0, 5).map((payment: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">
                              ${payment.totalCredits?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(payment.paidAt || payment.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              Pago por: {payment.paidBy || 'Sistema'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                {/* No Data Message */}
                {!detailData.activeSession && detailData.history.payments.length === 0 && (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      Nenhuma sessão ativa ou pagamentos do Discord bot para este trabalhador.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Nenhum dado do Discord bot disponível.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}