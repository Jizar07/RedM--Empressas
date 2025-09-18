'use client';

import React, { useState, useMemo } from 'react';
import {
  Users, Search, Plus, Edit, Trash2, Eye, Crown, User,
  Activity, DollarSign, Package, TrendingUp, Clock,
  X, Save, AlertTriangle, BarChart3, Award, Star,
  ArrowUp, ArrowDown, ChevronsUpDown
} from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import { WorkerInventoryStats } from '@/types/inventory';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | WorkerRole>('all');
  const [sortBy, setSortBy] = useState<'name' | 'activities' | 'role' | 'added' | 'performance' | 'lastActivity'>('activities');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
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