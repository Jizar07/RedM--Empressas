'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, Plus, Edit, Trash2, Eye, Crown, User,
  Activity, DollarSign, Package, TrendingUp, Clock,
  X, Save, AlertTriangle, BarChart3, Award, Star,
  ArrowUp, ArrowDown, ChevronsUpDown, Trophy, List,
  History, FolderOpen, PieChart, TrendingDown, Calendar,
  Filter, Download, ChevronDown, ChevronUp, Sprout, CheckCircle
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex space-x-1 p-2">
          <button
            onClick={() => setActiveTab('management')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === 'management'
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-gray-700'
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
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-gray-700'
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">📊 Lista Completa de Trabalhadores ({filteredWorkers.length})</h3>
        </div>

        <div className="p-4">
          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm || selectedRole !== 'all' ? 'Nenhum trabalhador encontrado' : 'Nenhum trabalhador'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || selectedRole !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Os trabalhadores aparecerão automaticamente quando houver atividades'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:bg-gray-700 transition-colors w-40"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Trabalhador
                        <SortIndicator column="name" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:bg-gray-700 transition-colors w-32"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-1">
                        Função
                        <SortIndicator column="role" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:bg-gray-700 transition-colors w-20"
                      onClick={() => handleSort('activities')}
                    >
                      <div className="flex items-center gap-1">
                        Transações
                        <SortIndicator column="activities" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                      Itens
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:bg-gray-700 transition-colors w-20"
                      onClick={() => handleSort('performance')}
                    >
                      <div className="flex items-center gap-1">
                        Performance
                        <SortIndicator column="performance" />
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:bg-gray-700 transition-colors w-24"
                      onClick={() => handleSort('lastActivity')}
                    >
                      <div className="flex items-center gap-1">
                        Última Atividade
                        <SortIndicator column="lastActivity" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                  {filteredWorkers.map((worker, index) => {
                    const profile = workerProfiles.get(worker.userId);
                    const role = getWorkerRole(worker.userId);

                    return (
                      <tr key={worker.userId} className="hover:bg-gray-50 dark:bg-gray-700">
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
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">#{actualRank}</span>
                                  </>
                                );
                              } else {
                                // All other sorts: show actual performance rank
                                return (
                                  <>
                                    <User className="h-4 w-4 mr-2 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">#{actualRank}</span>
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
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{worker.userName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{worker.userId}</div>
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
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{worker.totalTransactions}</span>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <div className="text-center">
                            <div className="text-xs">
                              <span className="text-green-600">+{worker.itemsAdded}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-red-600">-{worker.itemsRemoved}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Net: {worker.netItems}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm text-blue-600">{(worker.averagePerDay || 0).toFixed(1)}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">👥 Gestão Avançada de Trabalhadores</h2>
                <p className="text-purple-100">{firm.name} - Sistema Completo</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white dark:bg-gray-800 hover:bg-opacity-20 rounded-lg transition-colors"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                {role === 'manager' ? <Crown className="h-6 w-6 text-purple-600" /> : <User className="h-6 w-6 text-purple-600" />}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{worker.userName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
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
  const [activeTab, setActiveTab] = React.useState<'overview' | 'active-services' | 'awaiting-payment' | 'paid-archive' | 'categories' | 'performance'>('overview');
  const [transactionSearch, setTransactionSearch] = React.useState('');
  const [transactionType, setTransactionType] = React.useState<'all' | 'plant' | 'animal' | 'financial'>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [expandedSessions, setExpandedSessions] = React.useState<Set<string>>(new Set());
  const [expandedPayments, setExpandedPayments] = React.useState<Set<string>>(new Set());
  const [paymentSearchTerm, setPaymentSearchTerm] = React.useState('');
  const itemsPerPage = 50;
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

  // Aggregate all transactions from active and archived sessions
  const allTransactions = React.useMemo(() => {
    if (!detailData) return [];

    const transactions: any[] = [];

    // Active session transactions
    if (detailData.activeSession) {
      if (detailData.activeSession.plantTransactions) {
        detailData.activeSession.plantTransactions.forEach((t: any) => {
          transactions.push({
            ...t,
            sessionId: detailData.activeSession.sessionId,
            category: 'plant',
            sessionStatus: 'active'
          });
        });
      }
      if (detailData.activeSession.animalTransactions) {
        detailData.activeSession.animalTransactions.forEach((t: any) => {
          transactions.push({
            ...t,
            sessionId: detailData.activeSession.sessionId,
            category: 'animal',
            sessionStatus: 'active'
          });
        });
      }
      if (detailData.activeSession.financialTransactions) {
        detailData.activeSession.financialTransactions.forEach((t: any) => {
          transactions.push({
            ...t,
            sessionId: detailData.activeSession.sessionId,
            category: 'financial',
            sessionStatus: 'active'
          });
        });
      }
    }

    // Archived session transactions
    if (detailData.history.archivedSessions) {
      detailData.history.archivedSessions.forEach((session: any) => {
        if (session.plantTransactions) {
          session.plantTransactions.forEach((t: any) => {
            transactions.push({
              ...t,
              sessionId: session.sessionId,
              category: 'plant',
              sessionStatus: session.status
            });
          });
        }
        if (session.animalTransactions) {
          session.animalTransactions.forEach((t: any) => {
            transactions.push({
              ...t,
              sessionId: session.sessionId,
              category: 'animal',
              sessionStatus: session.status
            });
          });
        }
        if (session.financialTransactions) {
          session.financialTransactions.forEach((t: any) => {
            transactions.push({
              ...t,
              sessionId: session.sessionId,
              category: 'financial',
              sessionStatus: session.status
            });
          });
        }
      });
    }

    // Sort by timestamp descending (most recent first)
    return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [detailData]);

  // Filter transactions based on search and type
  const filteredTransactions = React.useMemo(() => {
    let filtered = allTransactions;

    // Filter by type
    if (transactionType !== 'all') {
      filtered = filtered.filter(t => t.category === transactionType);
    }

    // Filter by search term
    if (transactionSearch) {
      const search = transactionSearch.toLowerCase();
      filtered = filtered.filter(t =>
        t.itemName?.toLowerCase().includes(search) ||
        t.type?.toLowerCase().includes(search) ||
        t.sessionId?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [allTransactions, transactionType, transactionSearch]);

  // Paginate transactions
  const paginatedTransactions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Category analysis from frontend data
  const categoryAnalysis = React.useMemo(() => {
    const categories = worker.categorias || {};
    const analysis = Object.entries(categories).map(([name, data]: [string, any]) => ({
      name,
      added: data.added || 0,
      removed: data.removed || 0,
      net: (data.added || 0) - (data.removed || 0)
    }));

    return analysis.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [worker.categorias]);

  // Toggle session expansion
  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{worker.userName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Visão Geral</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('active-services')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'active-services'
                  ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Serviços Ativos</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('awaiting-payment')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'awaiting-payment'
                  ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Aguardando Pagamento</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('paid-archive')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'paid-archive'
                  ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>Histórico Pago</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'categories'
                  ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <PieChart className="h-4 w-4" />
                <span>Categorias</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'performance'
                  ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Performance</span>
              </div>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB CONTENT */}
          {activeTab === 'overview' && (
          <div>
          {/* EXISTING WORKER DATA - Always show this first */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
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
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Primeira Atividade:</span>
                  <p className="font-medium">
                    {worker.firstActivity ? new Date(worker.firstActivity).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Última Atividade:</span>
                  <p className="font-medium">
                    {worker.lastActivity ? new Date(worker.lastActivity).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Saldo de Itens:</span>
                  <p className="font-medium">{worker.netItems}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Total de Categorias:</span>
                  <p className="font-medium">{Object.keys(worker.categorias || {}).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* DISCORD BOT DATA - Show loading/error/data below the existing data */}
          <div className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Eye className="h-5 w-5 text-green-500 mr-2" />
              Dados do Discord Bot (Backend)
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Carregando dados do Discord bot...</span>
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
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Crown className="h-5 w-5 text-yellow-500 mr-2" />
                    Informações de Registro
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome no Jogo</p>
                        <p className="text-gray-900 dark:text-white">{detailData.registration.ingameName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Função</p>
                        <p className="text-gray-900 dark:text-white">{detailData.registration.functionName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Registrado em</p>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(detailData.registration.registeredAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Summary */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
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
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Última Atividade</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
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
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Activity className="h-5 w-5 text-green-500 mr-2" />
                    Sessão Ativa (Discord Embed)
                  </h4>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-green-700">ID da Sessão</p>
                        <p className="text-gray-900 dark:text-white font-mono text-sm">{detailData.activeSession.sessionId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700">Total de Créditos</p>
                        <p className="text-gray-900 dark:text-white text-lg font-bold">
                          ${detailData.activeSession.totalCredits?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700">Última Atividade</p>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(detailData.activeSession.lastActivity).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Plant Transactions */}
                    {detailData.activeSession.plantTransactions?.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">🌾 Transações de Plantas</h5>
                        <div className="max-h-32 overflow-y-auto">
                          {detailData.activeSession.plantTransactions.map((transaction: any, index: number) => (
                            <div key={index} className="text-sm text-gray-700 dark:text-gray-300 py-1">
                              {transaction.type === 'seed_taken' ? '🌱' :
                                transaction.itemName.toLowerCase().includes('junco') || transaction.itemName.toLowerCase().includes('bulrush') ? '🫘' :
                                transaction.itemName.toLowerCase().includes('trigo') || transaction.itemName.toLowerCase().includes('wheat') ? '🌾' :
                                transaction.itemName.toLowerCase().includes('milho') || transaction.itemName.toLowerCase().includes('corn') ? '🌽' :
                                '🌾'} {transaction.itemName} x{transaction.quantity}
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
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
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">🐄 Transações de Animais</h5>
                        <div className="max-h-32 overflow-y-auto">
                          {detailData.activeSession.animalTransactions.map((transaction: any, index: number) => (
                            <div key={index} className="text-sm text-gray-700 dark:text-gray-300 py-1">
                              {transaction.type === 'animals_taken' ? '🚚' : '💰'} {transaction.quantity} animais
                              {transaction.amount && ` - $${transaction.amount.toFixed(2)}`}
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
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
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                    Histórico de Pagamentos
                  </h4>
                  <div className="space-y-3">
                    {detailData.history.payments.slice(0, 5).map((payment: any, index: number) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              ${payment.totalCredits?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {new Date(payment.paidAt || payment.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Pago por: {payment.paidByName || payment.paidBy || 'Sistema'}
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
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                    <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">
                      Nenhuma sessão ativa ou pagamentos do Discord bot para este trabalhador.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-300">Nenhum dado do Discord bot disponível.</p>
              </div>
            )}
          </div>
          </div>
          )}

          {/* Active Services Tab */}
          {activeTab === 'active-services' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">🟢 Serviços Ativos & Monitoramento</h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <span className="ml-3 text-gray-600">Carregando serviços ativos...</span>
                </div>
              ) : detailData?.activeSession ? (
                <div className="space-y-6">
                  {/* Plant Services */}
                  {detailData.activeSession.seedExpectations && detailData.activeSession.seedExpectations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Sprout className="h-5 w-5 mr-2 text-green-600" />
                        🌾 Serviços de Plantas
                      </h4>
                      <div className="space-y-3">
                        {detailData.activeSession.seedExpectations
                          .filter((exp: any) => {
                            // Filter out Adubo3 - it's a material, not a plant service
                            const seedTypeLower = (exp.seedType || '').toLowerCase();
                            return !(seedTypeLower.includes('adubo3') || seedTypeLower.includes('adubo 3'));
                          })
                          .map((expectation: any, idx: number) => {
                          const expectedPlants = expectation.expectedPlantQuantity || 0;
                          const actualPlants = expectation.plantsFulfilled || 0;
                          const completionRate = expectedPlants > 0 ? (actualPlants / expectedPlants) * 100 : 0;
                          const isComplete = expectation.isComplete || completionRate >= 100;
                          const isPending = completionRate === 0;
                          const isIncomplete = completionRate > 0 && completionRate < 100;

                          // Find the timestamp from plantTransactions using transactionId
                          const seedTransaction = detailData.activeSession.plantTransactions?.find(
                            (t: any) => t.transactionId === expectation.transactionId
                          );
                          const takenTimestamp = seedTransaction?.timestamp;

                          // Calculate completion timestamp by simulating FIFO fulfillment
                          let completedTimestamp = null;
                          if (isComplete && detailData.activeSession.seedExpectations && detailData.activeSession.plantTransactions) {
                            // Get all expectations for this plant type in order
                            const allExpectations = detailData.activeSession.seedExpectations
                              .filter((exp: any) => exp.expectedPlantType === expectation.expectedPlantType)
                              .sort((a: any, b: any) => {
                                const aIdx = detailData.activeSession.plantTransactions.findIndex((t: any) => t.transactionId === a.transactionId);
                                const bIdx = detailData.activeSession.plantTransactions.findIndex((t: any) => t.transactionId === b.transactionId);
                                return aIdx - bIdx;
                              });

                            // Find index of current expectation
                            const currentIdx = allExpectations.findIndex((exp: any) => exp.transactionId === expectation.transactionId);

                            // Get all plant deposits for this type
                            const plantDeposits = detailData.activeSession.plantTransactions
                              .filter((t: any) => t.type === 'plant_deposited' && t.itemName === expectation.expectedPlantType)
                              .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                            // Simulate FIFO fulfillment to find which deposit completed this expectation
                            let remainingToFulfill = expectation.expectedPlantQuantity;
                            for (let i = 0; i < currentIdx; i++) {
                              remainingToFulfill += allExpectations[i].expectedPlantQuantity;
                            }

                            let fulfilled = 0;
                            for (const deposit of plantDeposits) {
                              fulfilled += deposit.quantity;
                              if (fulfilled >= remainingToFulfill) {
                                completedTimestamp = deposit.timestamp;
                                break;
                              }
                            }
                          }

                          let statusColor = 'gray';
                          let statusBadge = '⏳ Pendente';
                          let borderColor = 'border-gray-300 dark:border-gray-600';

                          if (isComplete) {
                            statusColor = 'green';
                            statusBadge = '✅ Completo';
                            borderColor = 'border-green-500';
                          } else if (isIncomplete) {
                            statusColor = 'orange';
                            statusBadge = '⚠️ Incompleto';
                            borderColor = 'border-orange-500';
                          }

                          return (
                            <div key={idx} className={`border-l-4 ${borderColor} bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm`}>
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {expectation.seedType || 'Semente'}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full bg-${statusColor}-100 text-${statusColor}-800 dark:bg-${statusColor}-900/20 dark:text-${statusColor}-300`}>
                                      {statusBadge}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Sementes retiradas: <span className="font-semibold">{expectation.seedQuantity}</span>
                                    {expectation.aduboUsed && (
                                      <span className="ml-2 text-green-600 dark:text-green-400">
                                        + {expectation.aduboUsed} Adubo3 🌿
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-4 mt-1 text-xs">
                                    {takenTimestamp && (
                                      <p className="text-gray-500 dark:text-gray-400">
                                        🔽 Retirado: {new Date(takenTimestamp).toLocaleString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                    {completedTimestamp && (
                                      <p className="text-green-600 dark:text-green-400">
                                        ✅ Completo: {new Date(completedTimestamp).toLocaleString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                  </div>
                                  {expectation.aduboCost && expectation.aduboCost > 0 && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                      Custo Adubo3: -${expectation.aduboCost.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {completionRate.toFixed(0)}%
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Conclusão</p>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mb-3">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full ${
                                      isComplete ? 'bg-green-500' : isIncomplete ? 'bg-orange-500' : 'bg-gray-400'
                                    }`}
                                    style={{ width: `${Math.min(completionRate, 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                    Esperado {expectation.aduboUsed ? '(com Adubo3)' : ''}
                                  </p>
                                  <p className="font-semibold text-blue-900 dark:text-blue-300">{expectedPlants} plantas</p>
                                  {expectation.aduboUsed && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">×2 rendimento</p>
                                  )}
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">Depositado</p>
                                  <p className="font-semibold text-green-900 dark:text-green-300">{actualPlants} plantas</p>
                                </div>
                                <div className={`bg-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-50 dark:bg-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-900/20 rounded p-2`}>
                                  <p className={`text-xs text-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-600 dark:text-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-400 mb-1`}>
                                    {isComplete ? 'Completo' : 'Faltando'}
                                  </p>
                                  <p className={`font-semibold text-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-900 dark:text-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-300`}>
                                    {isComplete ? '0 plantas' : `${expectedPlants - actualPlants} plantas`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Animal Services */}
                  {detailData.activeSession.animalExpectations && detailData.activeSession.animalExpectations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-yellow-600" />
                        🐄 Serviços de Animais
                      </h4>
                      <div className="space-y-3">
                        {detailData.activeSession.animalExpectations.map((expectation: any, idx: number) => {
                          const animalsTaken = expectation.animalsTaken || 0;
                          const animalsDelivered = expectation.animalsDelivered || 0;
                          const completionRate = animalsTaken > 0 ? (animalsDelivered / animalsTaken) * 100 : 0;
                          const isComplete = expectation.isComplete || completionRate >= 100;
                          const isPending = completionRate === 0;
                          const isIncomplete = completionRate > 0 && completionRate < 100;

                          // Find timestamps from animalTransactions
                          const takenTransaction = detailData.activeSession.animalTransactions?.find(
                            (t: any) => t.transactionId === expectation.transactionId && t.type === 'animals_taken'
                          );
                          const takenTimestamp = takenTransaction?.timestamp || expectation.takenTimestamp;

                          // Find delivery completed timestamp for this specific expectation
                          let deliveryTimestamp = null;
                          if (isComplete && detailData.activeSession.animalTransactions) {
                            const deliveries = detailData.activeSession.animalTransactions
                              .filter((t: any) => t.type === 'delivery_completed')
                              .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                            // Find which delivery completed this expectation
                            let animalsToFulfill = animalsTaken;
                            let deliveredSoFar = 0;
                            for (const delivery of deliveries) {
                              deliveredSoFar += delivery.quantity;
                              if (deliveredSoFar >= animalsToFulfill) {
                                deliveryTimestamp = delivery.timestamp;
                                break;
                              }
                            }
                          }

                          let statusColor = 'gray';
                          let statusBadge = '⏳ Pendente';
                          let borderColor = 'border-gray-300 dark:border-gray-600';

                          if (isComplete) {
                            statusColor = 'green';
                            statusBadge = '✅ Completo';
                            borderColor = 'border-green-500';
                          } else if (isIncomplete) {
                            statusColor = 'orange';
                            statusBadge = '⚠️ Incompleto';
                            borderColor = 'border-orange-500';
                          }

                          return (
                            <div key={idx} className={`border-l-4 ${borderColor} bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm`}>
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      Serviço de Animais
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full bg-${statusColor}-100 text-${statusColor}-800 dark:bg-${statusColor}-900/20 dark:text-${statusColor}-300`}>
                                      {statusBadge}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Animais retirados: <span className="font-semibold">{animalsTaken}</span>
                                  </p>
                                  <div className="flex items-center gap-4 mt-1 text-xs">
                                    {takenTimestamp && (
                                      <p className="text-gray-500 dark:text-gray-400">
                                        🔽 Retirado: {new Date(takenTimestamp).toLocaleString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                    {deliveryTimestamp && (
                                      <p className="text-green-600 dark:text-green-400">
                                        ✅ Entregues: {new Date(deliveryTimestamp).toLocaleString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {completionRate.toFixed(0)}%
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Conclusão</p>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mb-3">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full ${
                                      isComplete ? 'bg-green-500' : isIncomplete ? 'bg-orange-500' : 'bg-gray-400'
                                    }`}
                                    style={{ width: `${Math.min(completionRate, 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Retirados</p>
                                  <p className="font-semibold text-blue-900 dark:text-blue-300">{animalsTaken} animais</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">Entregues</p>
                                  <p className="font-semibold text-green-900 dark:text-green-300">{animalsDelivered} animais</p>
                                </div>
                                <div className={`bg-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-50 dark:bg-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-900/20 rounded p-2`}>
                                  <p className={`text-xs text-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-600 dark:text-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-400 mb-1`}>
                                    {isComplete ? 'Completo' : 'Faltando'}
                                  </p>
                                  <p className={`font-semibold text-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-900 dark:text-${isComplete ? 'green' : isIncomplete ? 'orange' : 'gray'}-300`}>
                                    {isComplete ? '0 animais' : `${animalsTaken - animalsDelivered} animais`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ferrovia/Unregistered Plants */}
                  {detailData.activeSession.unregisteredPlants && detailData.activeSession.unregisteredPlants.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-purple-600" />
                        🚂 Serviços Ferrovia / Caixas
                      </h4>
                      <div className="space-y-3">
                        {detailData.activeSession.unregisteredPlants.map((plant: any, idx: number) => {
                          return (
                            <div key={idx} className="border-l-4 border-purple-500 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {plant.plantType || 'Planta Não Registrada'}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                                      ⏳ Aguardando Caixas/Dinheiro
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Quantidade retirada: <span className="font-semibold">{plant.quantity}</span>
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Sistema espera caixas ou dinheiro depositado para completar este serviço
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No Active Services Message */}
                  {(() => {
                    const filteredSeeds = (detailData.activeSession.seedExpectations || []).filter((exp: any) => {
                      const seedTypeLower = (exp.seedType || '').toLowerCase();
                      return !(seedTypeLower.includes('adubo3') || seedTypeLower.includes('adubo 3'));
                    });

                    const hasActiveServices =
                      filteredSeeds.length > 0 ||
                      (detailData.activeSession.animalExpectations && detailData.activeSession.animalExpectations.length > 0) ||
                      (detailData.activeSession.unregisteredPlants && detailData.activeSession.unregisteredPlants.length > 0);

                    if (hasActiveServices) return null;

                    return (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 text-center">
                        <Activity className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                        <p className="text-blue-900 dark:text-blue-300 font-medium mb-1">
                          Nenhum serviço ativo no momento
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Serviços aparecerão aqui quando o trabalhador retirar sementes, animais ou plantas
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">Nenhuma sessão ativa</p>
                </div>
              )}
            </div>
          )}

          {/* Awaiting Payment Tab */}
          {activeTab === 'awaiting-payment' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                🟡 Aguardando Pagamento
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                  <span className="ml-3 text-gray-600">Carregando sessão atual...</span>
                </div>
              ) : detailData?.activeSession ? (() => {
                const session = detailData.activeSession;

                // Calculate deductions FIRST (ONLY Adubo3) - from plantTransactions
                let totalDeductions = 0;
                if (session.plantTransactions) {
                  session.plantTransactions.forEach((t: any) => {
                    if (t.type === 'seed_taken' && t.itemName && t.itemName.toLowerCase().includes('adubo3')) {
                      totalDeductions += t.quantity * 0.75; // $0.75 per Adubo3
                    }
                  });
                }

                // Total amount AFTER deductions
                const totalAmount = (session.totalCredits || 0) - totalDeductions;

                // Count services
                const plantServices = (session.seedExpectations || []).filter((exp: any) => {
                  const seedTypeLower = (exp.seedType || '').toLowerCase();
                  return !(seedTypeLower.includes('adubo3') || seedTypeLower.includes('adubo 3'));
                }).length;
                const animalServices = (session.animalExpectations || []).length;
                const ferroviaServices = (session.unregisteredPlants || []).length;

                return (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-6 border border-yellow-300 dark:border-yellow-700">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-yellow-900 dark:text-yellow-300 mb-2">
                            Sessão Atual - Resumo Completo
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            Iniciada: {new Date(session.startTime).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-300">
                            ${totalAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-400">Total a Pagar</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div className="bg-white dark:bg-gray-800 rounded p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">🌾 Plantas</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{plantServices} serviços</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">🐄 Animais</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{animalServices} serviços</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">🚂 Ferrovia</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{ferroviaServices} serviços</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">💸 Deduções</p>
                          <p className="font-semibold text-orange-600 dark:text-orange-400">-${totalDeductions.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Service Details - Reusing Active Services Display */}
                    <div className="space-y-6">
                      {/* Plant Services */}
                      {session.seedExpectations && session.seedExpectations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <Sprout className="h-5 w-5 mr-2 text-green-600" />
                            🌾 Serviços de Plantas
                          </h4>
                          <div className="space-y-3">
                            {session.seedExpectations
                              .filter((exp: any) => {
                                const seedTypeLower = (exp.seedType || '').toLowerCase();
                                return !(seedTypeLower.includes('adubo3') || seedTypeLower.includes('adubo 3'));
                              })
                              .map((expectation: any, idx: number) => {
                                const expectedPlants = expectation.expectedPlantQuantity || 0;
                                const actualPlants = expectation.plantsFulfilled || 0;
                                const completionRate = expectedPlants > 0 ? (actualPlants / expectedPlants) * 100 : 0;
                                const isComplete = expectation.isComplete || completionRate >= 100;

                                // Find timestamps
                                const seedTransaction = session.plantTransactions?.find(
                                  (t: any) => t.transactionId === expectation.transactionId
                                );
                                const takenTimestamp = seedTransaction?.timestamp;

                                return (
                                  <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {expectation.seedType || 'Semente'}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                          {expectation.seedQuantity} sementes
                                          {expectation.aduboUsed && (
                                            <span className="text-green-600 dark:text-green-400"> + {expectation.aduboUsed} Adubo3</span>
                                          )}
                                        </p>
                                        {takenTimestamp && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            🔽 {new Date(takenTimestamp).toLocaleString('pt-BR', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        )}
                                        {expectation.aduboCost && (
                                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                            Custo Adubo3: -${expectation.aduboCost.toFixed(2)}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-lg font-bold ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                                          {actualPlants}/{expectedPlants}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {isComplete ? '✅ Completo' : `⚠️ Faltam ${expectedPlants - actualPlants}`}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Animal Services */}
                      {session.animalExpectations && session.animalExpectations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <DollarSign className="h-5 w-5 mr-2 text-yellow-600" />
                            🐄 Serviços de Animais
                          </h4>
                          <div className="space-y-3">
                            {session.animalExpectations.map((expectation: any, idx: number) => {
                              const animalsTaken = expectation.animalsTaken || 0;
                              const animalsDelivered = expectation.animalsDelivered || 0;
                              const completionRate = animalsTaken > 0 ? (animalsDelivered / animalsTaken) * 100 : 0;
                              const isComplete = expectation.isComplete || completionRate >= 100;

                              // Find timestamps
                              const takenTransaction = session.animalTransactions?.find(
                                (t: any) => t.transactionId === expectation.transactionId && t.type === 'animals_taken'
                              );
                              const takenTimestamp = takenTransaction?.timestamp || expectation.takenTimestamp;

                              return (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        Serviço de Animais
                                      </p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {animalsTaken} animais retirados
                                      </p>
                                      {takenTimestamp && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          🔽 {new Date(takenTimestamp).toLocaleString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className={`text-lg font-bold ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                                        {animalsDelivered}/{animalsTaken}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {isComplete ? '✅ Completo' : `⚠️ Faltam ${animalsTaken - animalsDelivered}`}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ferrovia Services */}
                      {session.unregisteredPlants && session.unregisteredPlants.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <Package className="h-5 w-5 mr-2 text-purple-600" />
                            🚂 Serviços Ferrovia / Caixas
                          </h4>
                          <div className="space-y-3">
                            {session.unregisteredPlants.map((plant: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {plant.plantType || 'Planta Não Registrada'}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Quantidade: {plant.quantity}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Financial Breakdown */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-lg p-6 border-2 border-gray-300 dark:border-gray-600">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2" />
                        💰 Resumo Financeiro Completo
                      </h4>

                      {/* Credits Section */}
                      <div className="mb-4 pb-4 border-b border-gray-300 dark:border-gray-600">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Créditos</p>
                        {(() => {
                          const prices = { plantPrice: 0.25, animalPrice: 40 };
                          let plantTotal = 0;
                          let animalTotal = 0;
                          let ferroviaTotal = 0;

                          // Calculate plant credits
                          if (session.plantTransactions) {
                            session.plantTransactions.forEach((t: any) => {
                              if (t.type === 'plant_deposited') {
                                plantTotal += t.quantity * prices.plantPrice;
                              }
                            });
                          }

                          // Calculate animal credits
                          if (session.animalTransactions) {
                            session.animalTransactions.forEach((t: any) => {
                              if (t.type === 'delivery_completed' && t.amount) {
                                animalTotal += t.amount;
                              }
                            });
                          }

                          // Calculate ferrovia credits
                          if (session.unregisteredPlants) {
                            session.unregisteredPlants.forEach((p: any) => {
                              ferroviaTotal += p.quantity * prices.plantPrice;
                            });
                          }

                          return (
                            <div className="space-y-2 text-sm">
                              {plantTotal > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 dark:text-gray-400">🌾 Serviços de Plantas</span>
                                  <span className="font-semibold text-green-600 dark:text-green-400">+${plantTotal.toFixed(2)}</span>
                                </div>
                              )}
                              {animalTotal > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 dark:text-gray-400">🐄 Serviços de Animais</span>
                                  <span className="font-semibold text-green-600 dark:text-green-400">+${animalTotal.toFixed(2)}</span>
                                </div>
                              )}
                              {ferroviaTotal > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 dark:text-gray-400">🚂 Serviços Ferrovia</span>
                                  <span className="font-semibold text-green-600 dark:text-green-400">+${ferroviaTotal.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="font-semibold text-gray-900 dark:text-white">Subtotal Créditos</span>
                                <span className="font-bold text-green-600 dark:text-green-400">+${(plantTotal + animalTotal + ferroviaTotal).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Deductions Section */}
                      <div className="mb-4 pb-4 border-b border-gray-300 dark:border-gray-600">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Deduções</p>
                        {(() => {
                          const deductions: { label: string; amount: number; timestamp?: string }[] = [];

                          // Adubo3 costs - ONLY DEDUCTION - from plantTransactions
                          if (session.plantTransactions) {
                            session.plantTransactions.forEach((t: any) => {
                              if (t.type === 'seed_taken' && t.itemName && t.itemName.toLowerCase().includes('adubo3')) {
                                const cost = t.quantity * 0.75;
                                deductions.push({
                                  label: `🌿 Adubo3: ${t.quantity} unidades`,
                                  amount: cost,
                                  timestamp: t.timestamp
                                });
                              }
                            });
                          }

                          const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

                          if (deductions.length === 0) {
                            return (
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhuma dedução</p>
                            );
                          }

                          return (
                            <div className="space-y-2 text-sm">
                              {deductions.map((deduction, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <span className="text-gray-600 dark:text-gray-400">{deduction.label}</span>
                                    {deduction.timestamp && (
                                      <span className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                        {new Date(deduction.timestamp).toLocaleString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-semibold text-orange-600 dark:text-orange-400">-${deduction.amount.toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="font-semibold text-gray-900 dark:text-white">Subtotal Deduções</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400">-${totalDeductions.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Final Total */}
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-300 dark:border-yellow-700">
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-gray-900 dark:text-white">Total a Pagar</span>
                          <span className="text-3xl font-bold text-yellow-900 dark:text-yellow-300">${totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">Nenhuma sessão ativa</p>
                </div>
              )}
            </div>
          )}

          {/* Paid Archive Tab */}
          {activeTab === 'paid-archive' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <History className="h-5 w-5 mr-2 text-blue-600" />
                📦 Histórico Pago
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Carregando histórico de pagamentos...</span>
                </div>
              ) : (() => {
                // Get paid sessions and payments
                const paidSessions = detailData?.history?.archivedSessions?.filter(
                  (session: any) => session.status === 'paid'
                ) || [];

                const payments = detailData?.history?.payments || [];

                const togglePayment = (paymentId: string) => {
                  const newExpanded = new Set(expandedPayments);
                  if (newExpanded.has(paymentId)) {
                    newExpanded.delete(paymentId);
                  } else {
                    newExpanded.add(paymentId);
                  }
                  setExpandedPayments(newExpanded);
                };

                // Filter payments by search
                const filteredPayments = payments.filter((payment: any) => {
                  if (!paymentSearchTerm) return true;
                  const search = paymentSearchTerm.toLowerCase();
                  const amount = payment.amount?.toString() || '';
                  const date = new Date(payment.timestamp).toLocaleDateString('pt-BR');
                  const paidBy = payment.paidByName || payment.paidBy || '';
                  return amount.includes(search) || date.includes(search) || paidBy.toLowerCase().includes(search);
                });

                if (payments.length === 0) {
                  return (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">
                        Nenhum pagamento registrado
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Pagamentos concluídos aparecerão aqui
                      </p>
                    </div>
                  );
                }

                // Calculate totals
                const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                const totalPayments = payments.length;

                return (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Total Pago (Histórico)</p>
                          <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                            ${totalPaid.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Total de Pagamentos</p>
                          <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                            {totalPayments}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Buscar Pagamentos
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={paymentSearchTerm}
                          onChange={(e) => setPaymentSearchTerm(e.target.value)}
                          placeholder="Data, valor, ou quem pagou..."
                          className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>

                    {/* Payment Accordion */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Histórico de Pagamentos ({filteredPayments.length})
                      </h4>

                      {filteredPayments.length === 0 ? (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                          <p className="text-gray-600 dark:text-gray-300">
                            Nenhum pagamento encontrado para "{paymentSearchTerm}"
                          </p>
                        </div>
                      ) : (
                        filteredPayments.map((payment: any, idx: number) => {
                          const isExpanded = expandedPayments.has(payment.paymentId || idx.toString());
                          const paymentDate = new Date(payment.timestamp).toLocaleString('pt-BR');

                          // Find associated sessions for this payment
                          const paymentSessions = paidSessions.filter(
                            (session: any) => session.paymentId === payment.paymentId
                          );

                          return (
                            <div key={payment.paymentId || idx} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                              {/* Accordion Header */}
                              <button
                                onClick={() => togglePayment(payment.paymentId || idx.toString())}
                                className="w-full px-5 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded">
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="text-left">
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                      Pagamento #{(payment.paymentId || '').slice(-6) || idx}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {paymentDate}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                      ${payment.amount?.toFixed(2) || '0.00'}
                                    </p>
                                    {(payment.paidByName || payment.paidBy) && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        por {payment.paidByName || payment.paidBy}
                                      </p>
                                    )}
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                              </button>

                              {/* Accordion Content */}
                              {isExpanded && (
                                <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                                  {/* Payment Details */}
                                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                                      Detalhes do Pagamento
                                    </h5>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <p className="text-gray-600 dark:text-gray-400">ID do Pagamento</p>
                                        <p className="font-mono text-xs text-gray-900 dark:text-white">
                                          {payment.paymentId || 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 dark:text-gray-400">Pago por</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                          {payment.paidByName || payment.paidBy || 'Desconhecido'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 dark:text-gray-400">Data/Hora</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                          {paymentDate}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 dark:text-gray-400">Valor Total</p>
                                        <p className="font-bold text-green-600 dark:text-green-400">
                                          ${payment.amount?.toFixed(2) || '0.00'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Associated Sessions */}
                                  {paymentSessions.length > 0 && (
                                    <div>
                                      <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                                        Sessões Incluídas ({paymentSessions.length})
                                      </h5>
                                      <div className="space-y-3">
                                        {paymentSessions.map((session: any, sIdx: number) => (
                                          <div key={sIdx} className="bg-white dark:bg-gray-800 rounded p-3 text-sm">
                                            <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                              Sessão #{(session.sessionId || '').slice(-6)}
                                            </p>

                                            {/* Plant Services */}
                                            {session.seedExpectations && session.seedExpectations.length > 0 && (
                                              <div className="mb-2">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                  🌾 Plantas: {session.seedExpectations.filter((exp: any) => {
                                                    const seedTypeLower = (exp.seedType || '').toLowerCase();
                                                    return !(seedTypeLower.includes('adubo3') || seedTypeLower.includes('adubo 3'));
                                                  }).length} serviço(s)
                                                </p>
                                                {session.seedExpectations
                                                  .filter((exp: any) => {
                                                    // Filter out Adubo3 - it's a material, not a plant service
                                                    const seedTypeLower = (exp.seedType || '').toLowerCase();
                                                    return !(seedTypeLower.includes('adubo3') || seedTypeLower.includes('adubo 3'));
                                                  })
                                                  .map((exp: any, eIdx: number) => (
                                                  <p key={eIdx} className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                                                    • {exp.seedType}: {exp.plantsFulfilled || 0}/{exp.expectedPlantQuantity || 0} plantas
                                                    {exp.aduboUsed && (
                                                      <span className="text-green-600 dark:text-green-400"> (+{exp.aduboUsed} Adubo3, -${(exp.aduboCost || 0).toFixed(2)})</span>
                                                    )}
                                                  </p>
                                                ))}
                                              </div>
                                            )}

                                            {/* Animal Services */}
                                            {session.animalExpectations && session.animalExpectations.length > 0 && (
                                              <div className="mb-2">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                  🐄 Animais: {session.animalExpectations.length} serviço(s)
                                                </p>
                                                {session.animalExpectations.map((exp: any, eIdx: number) => (
                                                  <p key={eIdx} className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                                                    • {exp.animalsTaken} animais retirados → {exp.animalsDelivered} entregues
                                                  </p>
                                                ))}
                                              </div>
                                            )}

                                            {/* Ferrovia Services */}
                                            {session.unregisteredPlants && session.unregisteredPlants.length > 0 && (
                                              <div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                  🚂 Ferrovia: {session.unregisteredPlants.length} serviço(s)
                                                </p>
                                                {session.unregisteredPlants.map((plant: any, pIdx: number) => (
                                                  <p key={pIdx} className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                                                    • {plant.plantType}: {plant.quantity} unidades
                                                  </p>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {paymentSessions.length === 0 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                      Nenhuma sessão associada encontrada
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* OLD CONTENT BELOW - REMOVE THIS COMMENT BLOCK */}
          {false && (
            <div>
              <div className="mb-6">
                <h3>OLD TRANSACTION TAB</h3>

                {/* Filters */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Buscar
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={transactionSearch}
                          onChange={(e) => {
                            setTransactionSearch(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                          }}
                          placeholder="Item, tipo, sessão..."
                          className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>

                    {/* Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tipo
                      </label>
                      <select
                        value={transactionType}
                        onChange={(e) => {
                          setTransactionType(e.target.value as any);
                          setCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      >
                        <option value="all">Todas</option>
                        <option value="plant">🌾 Plantas</option>
                        <option value="animal">🐄 Animais</option>
                        <option value="financial">💰 Financeiro</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Transaction Count */}
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''} encontrada{filteredTransactions.length !== 1 ? 's' : ''}
                    {transactionSearch || transactionType !== 'all' ? ` (filtrado de ${allTransactions.length} total)` : ''}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <span className="ml-3 text-gray-600">Carregando transações...</span>
                </div>
              ) : paginatedTransactions.length > 0 ? (
                <div>
                  {/* Transaction List */}
                  <div className="space-y-2">
                    {paginatedTransactions.map((transaction, index) => (
                      <div key={index} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {/* Icon based on type */}
                              {transaction.category === 'plant' && (
                                <span className="text-lg">
                                  {transaction.type === 'seed_taken' ? '🌱' :
                                   transaction.itemName?.toLowerCase().includes('junco') || transaction.itemName?.toLowerCase().includes('bulrush') ? '🫘' :
                                   transaction.itemName?.toLowerCase().includes('trigo') || transaction.itemName?.toLowerCase().includes('wheat') ? '🌾' :
                                   transaction.itemName?.toLowerCase().includes('milho') || transaction.itemName?.toLowerCase().includes('corn') ? '🌽' : '🌾'}
                                </span>
                              )}
                              {transaction.category === 'animal' && <span className="text-lg">{transaction.type === 'animals_taken' ? '🚚' : '💰'}</span>}
                              {transaction.category === 'financial' && <span className="text-lg">💵</span>}

                              {/* Transaction Details */}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {transaction.itemName ? (
                                    <>
                                      {transaction.itemName}
                                      {transaction.quantity && <span className="text-gray-600 dark:text-gray-300"> x{transaction.quantity}</span>}
                                    </>
                                  ) : transaction.category === 'animal' ? (
                                    `${transaction.quantity} animais`
                                  ) : transaction.category === 'financial' ? (
                                    'Transação Financeira'
                                  ) : (
                                    `Item x${transaction.quantity}`
                                  )}
                                  {transaction.amount && <span className="text-green-600 font-bold"> ${transaction.amount.toFixed(2)}</span>}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {transaction.type?.replace(/_/g, ' ')} • {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Session Badge */}
                          <div className="text-right ml-4">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              transaction.sessionStatus === 'active' ? 'bg-green-100 text-green-800' :
                              transaction.sessionStatus === 'paid' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {transaction.sessionStatus === 'active' ? 'Ativa' :
                               transaction.sessionStatus === 'paid' ? 'Pago' : transaction.sessionStatus}
                            </span>
                            <p className="text-xs text-gray-500 font-mono mt-1">{transaction.sessionId?.slice(-8)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                  <List className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">
                    {transactionSearch || transactionType !== 'all'
                      ? 'Nenhuma transação encontrada com os filtros aplicados'
                      : 'Nenhuma transação disponível'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Sessões de Trabalho</h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <span className="ml-3 text-gray-600">Carregando sessões...</span>
                </div>
              ) : detailData ? (
                <div className="space-y-6">
                  {/* Active Session */}
                  {detailData.activeSession && (
                    <div className="bg-green-50 rounded-lg p-6">
                      <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        Sessão Ativa
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-green-700">ID da Sessão</p>
                          <p className="font-mono text-sm">{detailData.activeSession.sessionId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-700">Créditos Acumulados</p>
                          <p className="text-lg font-bold">${detailData.activeSession.totalCredits?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-700">Status</p>
                          <p className="font-medium">{detailData.activeSession.status}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Archived Sessions */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Sessões Arquivadas ({detailData.history.archivedSessions?.length || 0})
                    </h4>
                    {detailData.history.archivedSessions?.length > 0 ? (
                      <div className="space-y-3">
                        {detailData.history.archivedSessions.map((session: any, index: number) => {
                          const isExpanded = expandedSessions.has(session.sessionId);
                          return (
                          <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="font-mono text-sm text-gray-600 dark:text-gray-300">{session.sessionId}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(session.startTime).toLocaleDateString('pt-BR')} → {new Date(session.completedAt || session.lastActivity).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600">${session.totalCredits?.toFixed(2) || '0.00'}</p>
                                <p className="text-sm text-gray-500">{session.status}</p>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-sm mb-2">
                              <p className="text-gray-600 dark:text-gray-300">
                                🌾 {session.plantTransactions?.length || 0} plantas
                              </p>
                              <p className="text-gray-600 dark:text-gray-300">
                                🐄 {session.animalTransactions?.length || 0} animais
                              </p>
                              <p className="text-gray-600 dark:text-gray-300">
                                💰 {session.financialTransactions?.length || 0} financeiro
                              </p>
                            </div>

                            {/* Expand/Collapse Button */}
                            <button
                              onClick={() => toggleSession(session.sessionId)}
                              className="w-full flex items-center justify-center space-x-2 text-sm text-green-600 dark:text-green-400 hover:underline mt-2 pt-2 border-t border-gray-200 dark:border-gray-600"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <span>{isExpanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}</span>
                            </button>

                            {/* Expanded Transaction Details */}
                            {isExpanded && (
                              <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                                {session.plantTransactions?.length > 0 && (
                                  <div>
                                    <h6 className="font-medium text-sm text-gray-900 dark:text-white mb-2">🌾 Transações de Plantas</h6>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {session.plantTransactions.map((t: any, tIndex: number) => (
                                        <div key={tIndex} className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded">
                                          <span className="font-medium">{t.itemName}</span> x{t.quantity} • {t.type?.replace(/_/g, ' ')} • {new Date(t.timestamp).toLocaleTimeString('pt-BR')}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {session.animalTransactions?.length > 0 && (
                                  <div>
                                    <h6 className="font-medium text-sm text-gray-900 dark:text-white mb-2">🐄 Transações de Animais</h6>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {session.animalTransactions.map((t: any, tIndex: number) => (
                                        <div key={tIndex} className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded">
                                          {t.quantity} animais{t.amount && ` • $${t.amount.toFixed(2)}`} • {t.type?.replace(/_/g, ' ')} • {new Date(t.timestamp).toLocaleTimeString('pt-BR')}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {session.financialTransactions?.length > 0 && (
                                  <div>
                                    <h6 className="font-medium text-sm text-gray-900 dark:text-white mb-2">💰 Transações Financeiras</h6>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {session.financialTransactions.map((t: any, tIndex: number) => (
                                        <div key={tIndex} className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded">
                                          ${t.amount?.toFixed(2)} • {t.type?.replace(/_/g, ' ')} • {new Date(t.timestamp).toLocaleTimeString('pt-BR')}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300">Nenhuma sessão arquivada</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Nenhuma sessão disponível</p>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Histórico Completo de Pagamentos</h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <span className="ml-3 text-gray-600">Carregando pagamentos...</span>
                </div>
              ) : detailData && detailData.history.payments.length > 0 ? (
                <div>
                  {/* Summary Card */}
                  <div className="bg-green-50 rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-green-700">Total Ganho</p>
                        <p className="text-2xl font-bold text-green-900">${detailData.statistics.totalEarnings.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700">Total de Pagamentos</p>
                        <p className="text-2xl font-bold text-green-900">{detailData.history.payments.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700">Média por Pagamento</p>
                        <p className="text-2xl font-bold text-green-900">
                          ${(detailData.statistics.totalEarnings / detailData.history.payments.length).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment List - ALL PAYMENTS, NOT LIMITED */}
                  <div className="space-y-3">
                    {detailData.history.payments.map((payment: any, index: number) => (
                      <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-lg text-green-600">${payment.totalCredits?.toFixed(2) || payment.amount?.toFixed(2) || '0.00'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {new Date(payment.paidAt || payment.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Pago por: {payment.paidByName || payment.paidBy || 'Sistema'}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{payment.sessionId || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                  <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-300">Nenhum pagamento registrado</p>
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Análise por Categoria</h3>

              {categoryAnalysis.length > 0 ? (
                <div>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-700">Total Adicionado</p>
                      <p className="text-2xl font-bold text-green-900">
                        {categoryAnalysis.reduce((sum, cat) => sum + cat.added, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-700">Total Removido</p>
                      <p className="text-2xl font-bold text-red-900">
                        {categoryAnalysis.reduce((sum, cat) => sum + cat.removed, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-purple-700">Saldo Total</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {categoryAnalysis.reduce((sum, cat) => sum + cat.net, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="space-y-3">
                    {categoryAnalysis.map((category, index) => {
                      const totalActivity = category.added + category.removed;
                      const addedPercentage = totalActivity > 0 ? (category.added / totalActivity) * 100 : 0;
                      const removedPercentage = totalActivity > 0 ? (category.removed / totalActivity) * 100 : 0;

                      return (
                        <div key={index} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{category.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {totalActivity.toLocaleString()} atividades totais
                              </p>
                            </div>
                            <div className={`text-lg font-bold ${
                              category.net > 0 ? 'text-green-600' :
                              category.net < 0 ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {category.net > 0 ? '+' : ''}{category.net.toLocaleString()}
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                              <p className="text-xs font-medium text-green-700 dark:text-green-400">Adicionado</p>
                              <p className="text-lg font-bold text-green-900 dark:text-green-300">{category.added.toLocaleString()}</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
                              <p className="text-xs font-medium text-red-700 dark:text-red-400">Removido</p>
                              <p className="text-lg font-bold text-red-900 dark:text-red-300">{category.removed.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                            <div
                              className="bg-green-500"
                              style={{ width: `${addedPercentage}%` }}
                              title={`${addedPercentage.toFixed(1)}% adicionado`}
                            />
                            <div
                              className="bg-red-500"
                              style={{ width: `${removedPercentage}%` }}
                              title={`${removedPercentage.toFixed(1)}% removido`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                  <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">Nenhuma categoria disponível</p>
                </div>
              )}
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Análise de Performance</h3>

              {/* Performance Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-700">Total Transações</p>
                    <Activity className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{worker.totalTransactions}</p>
                  <p className="text-xs text-blue-600 mt-1">Desde {new Date(worker.firstActivity).toLocaleDateString('pt-BR')}</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-purple-700">Média por Dia</p>
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{worker.averagePerDay.toFixed(1)}</p>
                  <p className="text-xs text-purple-600 mt-1">Transações diárias</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-green-700">Total Ganho</p>
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    ${detailData?.statistics.totalEarnings.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {detailData?.history.payments.length || 0} pagamentos
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-orange-700">Sessões</p>
                    <FolderOpen className="h-5 w-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {detailData?.statistics.sessionsCount || 0}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">Trabalhos completados</p>
                </div>
              </div>

              {/* Activity Breakdown */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Distribuição de Atividades</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Movimentação de Itens</h5>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-300">Adicionados</span>
                          <span className="font-bold text-green-600">{worker.itemsAdded.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${worker.itemsAdded + worker.itemsRemoved > 0
                                ? (worker.itemsAdded / (worker.itemsAdded + worker.itemsRemoved)) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-300">Removidos</span>
                          <span className="font-bold text-red-600">{worker.itemsRemoved.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500"
                            style={{
                              width: `${worker.itemsAdded + worker.itemsRemoved > 0
                                ? (worker.itemsRemoved / (worker.itemsAdded + worker.itemsRemoved)) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Saldo Líquido</span>
                          <span className={`font-bold ${
                            worker.netItems > 0 ? 'text-green-600' :
                            worker.netItems < 0 ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {worker.netItems > 0 ? '+' : ''}{worker.netItems.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Produção</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">🌾 Plantas</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {detailData?.statistics.totalPlants || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">🐄 Animais</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {detailData?.statistics.totalAnimals || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Categorias Ativas</span>
                        <span className="text-lg font-bold text-purple-600">
                          {Object.keys(worker.categorias || {}).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Information */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-green-600" />
                  Linha do Tempo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Primeira Atividade</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(worker.firstActivity).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.floor((Date.now() - new Date(worker.firstActivity).getTime()) / (1000 * 60 * 60 * 24))} dias atrás
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Última Atividade</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(worker.lastActivity).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.floor((Date.now() - new Date(worker.lastActivity).getTime()) / (1000 * 60 * 60 * 24))} dias atrás
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Período Ativo</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {Math.floor((new Date(worker.lastActivity).getTime() - new Date(worker.firstActivity).getTime()) / (1000 * 60 * 60 * 24))} dias
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {worker.averagePerDay.toFixed(1)} transações/dia
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Performance */}
              {detailData && detailData.history.payments.length > 0 && (
                <div className="mt-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Performance de Pagamentos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Média por Pagamento</p>
                      <p className="text-xl font-bold text-green-600">
                        ${(detailData.statistics.totalEarnings / detailData.history.payments.length).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Maior Pagamento</p>
                      <p className="text-xl font-bold text-blue-600">
                        ${Math.max(...detailData.history.payments.map((p: any) => p.totalCredits || p.amount || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Pagamentos por Sessão</p>
                      <p className="text-xl font-bold text-purple-600">
                        {(detailData.statistics.totalEarnings / detailData.statistics.sessionsCount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}