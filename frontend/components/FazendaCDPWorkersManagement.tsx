'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, Plus, Edit, Trash2, Eye, Crown, User,
  Activity, DollarSign, Package, TrendingUp, Clock,
  X, Save, AlertTriangle, BarChart3, Award, Star,
  ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeftRight
} from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import { WorkerInventoryStats } from '@/types/inventory';

interface FazendaCDPWorkersManagementProps {
  firm: FirmConfig;
  onClose: () => void;
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
  const [workerSessions, setWorkerSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Use the unified inventory manager hook
  const {
    inventoryData,
    loading,
    error,
    isReady
  } = useInventoryManager({ firm });

  // Fetch worker sessions from WorkerActivityService
  useEffect(() => {
    const fetchWorkerSessions = async () => {
      try {
        const response = await fetch('http://localhost:3050/api/worker-activity/sessions', {
          headers: {
            'x-bot-token': process.env.NEXT_PUBLIC_DISCORD_TOKEN || ''
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setWorkerSessions(data.sessions || []);
            console.log(`✅ Loaded ${data.sessions?.length || 0} active worker sessions`);
          }
        } else {
          console.error('Failed to fetch worker sessions:', response.status);
        }
      } catch (error) {
        console.error('Error fetching worker sessions:', error);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchWorkerSessions();
    // Refresh sessions every 30 seconds
    const interval = setInterval(fetchWorkerSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get worker data from inventory manager analytics
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

  // Save worker profiles to localStorage
  const saveProfiles = (profiles: Map<string, WorkerProfile>) => {
    const storageKey = `fazenda-cabra-da-peste_worker-profiles`;
    const profilesArray = Array.from(profiles.values());
    localStorage.setItem(storageKey, JSON.stringify(profilesArray));
    setWorkerProfiles(profiles);
  };

  const addWorker = (userName: string, role: WorkerRole, notes: string) => {
    const newProfile: WorkerProfile = {
      userId: `manual_${Date.now()}`, // Manual ID for added workers
      userName,
      role,
      notes,
      addedAt: new Date().toISOString(),
      addedBy: 'Manual' // Could be enhanced with actual user info
    };

    const newProfiles = new Map(workerProfiles);
    newProfiles.set(newProfile.userId, newProfile);
    saveProfiles(newProfiles);
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

  const showWorkerAnalytics = (worker: WorkerInventoryStats) => {
    setSelectedWorkerStats(worker);
    setShowAnalyticsModal(true);
  };

  const showWorkerDetails = (worker: WorkerInventoryStats) => {
    setSelectedWorkerStats(worker);
    setShowDetailModal(true);
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

  // Handle column sorting
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc'); // Default to descending for most columns
    }
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-purple-600" />
      : <ArrowDown className="h-4 w-4 text-purple-600" />;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
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

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Direção
              </label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setSortDirection('desc')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortDirection === 'desc'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSortDirection('asc')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortDirection === 'asc'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
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
        <div className="p-6 border-b border-gray-200">
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
                  <p className="text-sm font-medium text-green-600">Sessões Ativas</p>
                  <p className="text-2xl font-bold text-green-900">
                    {workerSessions.length}
                  </p>
                  <p className="text-xs text-green-600">
                    Total: ${workerSessions.reduce((sum, s) => sum + (s.totalCredits || 0), 0).toFixed(2)}
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
        </div>

        {/* Workers Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
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
                {(!searchTerm && selectedRole === 'all') && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Primeiro Trabalhador
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Trabalhador
                          <SortIndicator column="name" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center gap-1">
                          Função
                          <SortIndicator column="role" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('activities')}
                      >
                        <div className="flex items-center gap-1">
                          Transações
                          <SortIndicator column="activities" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Itens +/-
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('performance')}
                      >
                        <div className="flex items-center gap-1">
                          Performance
                          <SortIndicator column="performance" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('lastActivity')}
                      >
                        <div className="flex items-center gap-1">
                          Última Atividade
                          <SortIndicator column="lastActivity" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredWorkers.map((worker, index) => {
                      const profile = workerProfiles.get(worker.userId);
                      const role = getWorkerRole(worker.userId);
                      // Check if worker has active session
                      const activeSession = workerSessions.find(s => s.workerId === worker.userId);

                      return (
                        <tr key={worker.userId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Star className={`h-4 w-4 mr-2 ${
                                index === 0 ? 'text-yellow-500' :
                                index === 1 ? 'text-gray-400' :
                                index === 2 ? 'text-amber-600' : 'text-gray-300'
                              }`} />
                              <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 relative">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  {getRoleIcon(role)}
                                </div>
                                {activeSession && (
                                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse"
                                       title="Sessão Ativa" />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{worker.userName}</span>
                                  {activeSession && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      🌾 Ativo - ${activeSession.totalCredits?.toFixed(2) || '0.00'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">{worker.userId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                              {getRoleIcon(role)}
                              <span className="ml-1">
                                {role === 'manager' ? 'Gerente' : 'Trabalhador'}
                              </span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Activity className="h-4 w-4 mr-2 text-orange-500" />
                              <span className="text-sm font-medium text-gray-900">{worker.totalTransactions}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div>
                              <span className="text-green-600">+{worker.itemsAdded}</span> / 
                              <span className="text-red-600 ml-1">-{worker.itemsRemoved}</span>
                            </div>
                            <div className="text-xs text-gray-500">Net: {worker.netItems}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                              <span className="text-blue-600">{(worker.averagePerDay || 0).toFixed(1)}/dia</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="text-gray-500">
                                {worker.lastActivity 
                                  ? new Date(worker.lastActivity).toLocaleDateString('pt-BR', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit' 
                                    })
                                  : '--'
                                }
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => showWorkerDetails(worker)}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Ver Detalhes e Embeds"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => showWorkerAnalytics(worker)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Ver Analytics"
                              >
                                <BarChart3 className="h-4 w-4" />
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
                                className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja remover ${worker.userName}?`)) {
                                    deleteWorker(worker.userId);
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
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
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <AddWorkerModal
          onClose={() => setShowAddModal(false)}
          onSave={addWorker}
        />
      )}

      {/* Edit Worker Modal */}
      {showEditModal && selectedWorker && (
        <EditWorkerModal
          worker={selectedWorker}
          onClose={() => {
            setShowEditModal(false);
            setSelectedWorker(null);
          }}
          onSave={(updates) => {
            updateWorkerProfile(selectedWorker.userId, updates);
            setShowEditModal(false);
            setSelectedWorker(null);
          }}
        />
      )}

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
    </div>
  );
}

// Add Worker Modal Component
interface AddWorkerModalProps {
  onClose: () => void;
  onSave: (userName: string, role: WorkerRole, notes: string) => void;
}

function AddWorkerModal({ onClose, onSave }: AddWorkerModalProps) {
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<WorkerRole>('worker');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!userName.trim()) {
      alert('Nome do trabalhador é obrigatório');
      return;
    }
    
    onSave(userName.trim(), role, notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Adicionar Trabalhador</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Trabalhador *
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ex: João Silva"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Função
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkerRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="worker">Trabalhador</option>
              <option value="manager">Gerente</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Informações adicionais..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Worker Modal Component
interface EditWorkerModalProps {
  worker: WorkerProfile;
  onClose: () => void;
  onSave: (updates: Partial<WorkerProfile>) => void;
}

function EditWorkerModal({ worker, onClose, onSave }: EditWorkerModalProps) {
  const [userName, setUserName] = useState(worker.userName);
  const [role, setRole] = useState(worker.role);
  const [notes, setNotes] = useState(worker.notes);

  const handleSave = () => {
    if (!userName.trim()) {
      alert('Nome do trabalhador é obrigatório');
      return;
    }
    
    onSave({
      userName: userName.trim(),
      role,
      notes: notes.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Editar Trabalhador</h3>
          <p className="text-sm text-gray-600">ID: {worker.userId}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Trabalhador *
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Função
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkerRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="worker">Trabalhador</option>
              <option value="manager">Gerente</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Adicionado em: {new Date(worker.addedAt).toLocaleString('pt-BR')}</p>
            <p>Adicionado por: {worker.addedBy}</p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Alterações
          </button>
        </div>
      </div>
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
  const categorias = Object.entries(worker.categorias || {});
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
                  {role === 'manager' ? 'Gerente' : 'Trabalhador'} • Analytics Detalhado
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
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                <Plus className="h-8 w-8 text-green-500" />
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

          {/* Activity by Category */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">📦 Atividade por Categoria</h4>
            {categorias.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma atividade por categoria registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categorias.map(([categoria, stats]) => (
                  <div key={categoria} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900 capitalize">{categoria}</h5>
                      <span className="text-sm text-gray-600">
                        Net: {stats.net > 0 ? '+' : ''}{stats.net}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">
                          Adicionados: <span className="font-medium text-green-600">{stats.added}</span>
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">
                          Removidos: <span className="font-medium text-red-600">{stats.removed}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">📅 Timeline de Atividade</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center mb-2">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Primeira Atividade</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {worker.firstActivity 
                      ? new Date(worker.firstActivity).toLocaleString('pt-BR')
                      : 'Não registrado'
                    }
                  </p>
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Última Atividade</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {worker.lastActivity 
                      ? new Date(worker.lastActivity).toLocaleString('pt-BR')
                      : 'Não registrado'
                    }
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center mb-2">
                  <BarChart3 className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Performance</span>
                </div>
                <p className="text-sm text-gray-600">
                  Contribuição líquida de <span className="font-medium text-purple-600">{worker.netItems}</span> itens
                  com média de <span className="font-medium text-purple-600">{worker.averagePerDay.toFixed(1)}</span> atividades por dia
                </p>
              </div>

              {workerProfile?.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <Edit className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Notas</span>
                  </div>
                  <p className="text-sm text-gray-600">{workerProfile.notes}</p>
                </div>
              )}
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
  workerName: string;
  registration?: any;
  activeSession?: any;

  // Smart Analytics from Global Worker Tracker
  smartAnalytics: {
    totalActivities: number;
    purposeDetection: {
      crafting: number;
      farming: number;
      trading: number;
      storage: number;
      unknown: number;
    };
    crossFirmActivity: {
      firmId: string;
      firmName: string;
      adds: number;
      removes: number;
      transfers: number;
    }[];
    recipeAnalytics: {
      totalAttempts: number;
      successfulAttempts: number;
      successRate: number;
      averageDuration: number;
      topRecipes: string[];
    };
    recentActivities: {
      id: string;
      activityType: string;
      itemName: string;
      quantity: number;
      firmName: string;
      detectedPurpose: string;
      timestamp: string;
    }[];
    anomalyFlags: string[];
    efficiencyScore: number;
  };

  // Basic Statistics (legacy)
  statistics: {
    totalEarnings: number;
    totalPlants: number;
    totalAnimals: number;
    sessionsCount: number;
    lastActive: string | null;
  };

  // History
  history: {
    payments: any[];
    archivedSessions: any[];
    ferroviaSession?: any;
  };
}

function WorkerDetailModal({ worker, workerProfile, onClose }: WorkerDetailModalProps) {
  const [detailData, setDetailData] = useState<WorkerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const role = workerProfile?.role || 'worker';

  useEffect(() => {
    fetchWorkerDetails();
  }, [worker.userId]);

  const fetchWorkerDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3050/api/global-worker-analytics/worker/${worker.userId}?includeActivities=true&includeTransfers=true&includeRecipes=true&limit=100`, {
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              <span className="ml-4 text-gray-600">Carregando dados do Discord bot...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar dados</h4>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchWorkerDetails}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
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

              {/* Smart Analytics Overview */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
                  Análise Inteligente
                </h4>

                {/* Efficiency Score */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-800">Score de Eficiência</h5>
                      <div className="flex items-center mt-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              detailData.smartAnalytics?.efficiencyScore >= 0.8 ? 'bg-green-500' :
                              detailData.smartAnalytics?.efficiencyScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(detailData.smartAnalytics?.efficiencyScore || 0) * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-lg">
                          {((detailData.smartAnalytics?.efficiencyScore || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                {/* Purpose Detection */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🔨</div>
                      <p className="text-sm font-medium text-green-600">Crafting</p>
                      <p className="text-xl font-bold text-green-900">
                        {detailData.smartAnalytics?.purposeDetection?.crafting || 0}
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🌱</div>
                      <p className="text-sm font-medium text-yellow-600">Farming</p>
                      <p className="text-xl font-bold text-yellow-900">
                        {detailData.smartAnalytics?.purposeDetection?.farming || 0}
                      </p>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">💱</div>
                      <p className="text-sm font-medium text-purple-600">Trading</p>
                      <p className="text-xl font-bold text-purple-900">
                        {detailData.smartAnalytics?.purposeDetection?.trading || 0}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📦</div>
                      <p className="text-sm font-medium text-blue-600">Storage</p>
                      <p className="text-xl font-bold text-blue-900">
                        {detailData.smartAnalytics?.purposeDetection?.storage || 0}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">❓</div>
                      <p className="text-sm font-medium text-gray-600">Unknown</p>
                      <p className="text-xl font-bold text-gray-900">
                        {detailData.smartAnalytics?.purposeDetection?.unknown || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Activities */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total de Atividades</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {detailData.smartAnalytics?.totalActivities || 0}
                      </p>
                    </div>
                    <Package className="h-6 w-6 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Cross-Firm Activity Analysis */}
              {detailData.smartAnalytics?.crossFirmActivity && detailData.smartAnalytics.crossFirmActivity.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ArrowLeftRight className="h-5 w-5 text-orange-500 mr-2" />
                    Atividade Entre Empresas
                  </h4>
                  <div className="space-y-3">
                    {detailData.smartAnalytics.crossFirmActivity.slice(0, 5).map((transfer: any, index: number) => (
                      <div key={index} className="bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {transfer.sourceFirm} → {transfer.destinationFirm}
                            </p>
                            <p className="text-sm text-gray-600">
                              {transfer.itemName} (×{transfer.quantity})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {new Date(transfer.timestamp).toLocaleDateString('pt-BR')}
                            </p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                              transfer.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                              transfer.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {transfer.riskLevel}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipe Analytics */}
              {detailData.smartAnalytics?.recipeAnalytics && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 text-purple-500 mr-2" />
                    Análise de Receitas
                  </h4>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-purple-600">Tentativas</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {detailData.smartAnalytics.recipeAnalytics.totalAttempts}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-purple-600">Taxa de Sucesso</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {(detailData.smartAnalytics.recipeAnalytics.successRate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-purple-600">Receita Favorita</p>
                        <p className="text-lg font-bold text-purple-900 truncate">
                          {detailData.smartAnalytics.recipeAnalytics.favoriteRecipe || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {detailData.smartAnalytics.recipeAnalytics.recentAttempts &&
                     detailData.smartAnalytics.recipeAnalytics.recentAttempts.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-900 mb-2">Tentativas Recentes</h5>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {detailData.smartAnalytics.recipeAnalytics.recentAttempts.map((attempt: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{attempt.recipeName}</span>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  attempt.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  attempt.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {attempt.status}
                                </span>
                                <span className="text-gray-500">
                                  {new Date(attempt.timestamp).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                              {transaction.type === 'animals_taken' ? '🚚' : '💰'}
                              {transaction.quantity} animais
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

              {/* Recent Activities */}
              {detailData.smartAnalytics?.recentActivities && detailData.smartAnalytics.recentActivities.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="h-5 w-5 text-blue-500 mr-2" />
                    Atividades Recentes
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detailData.smartAnalytics.recentActivities.map((activity: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">
                                {activity.activityType === 'item_added' ? '➕' :
                                 activity.activityType === 'item_removed' ? '➖' :
                                 activity.activityType === 'animals_sold' ? '💰' :
                                 activity.activityType === 'crafting_started' ? '🔨' :
                                 activity.activityType === 'farming_begun' ? '🌱' : '📦'}
                              </span>
                              <div>
                                <p className="font-medium text-gray-800">
                                  {activity.itemName} (×{activity.quantity})
                                </p>
                                <p className="text-sm text-gray-600">
                                  {activity.firmName} • {activity.activityType.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {new Date(activity.timestamp).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(activity.timestamp).toLocaleTimeString('pt-BR')}
                            </p>
                            {activity.predictedPurpose && (
                              <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
                                activity.predictedPurpose === 'crafting' ? 'bg-green-100 text-green-800' :
                                activity.predictedPurpose === 'farming' ? 'bg-yellow-100 text-yellow-800' :
                                activity.predictedPurpose === 'trading' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {activity.predictedPurpose}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anomaly Detection */}
              {detailData.smartAnalytics?.anomalyFlags && detailData.smartAnalytics.anomalyFlags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    Alertas & Anomalias
                  </h4>
                  <div className="space-y-3">
                    {detailData.smartAnalytics.anomalyFlags.map((anomaly: any, index: number) => (
                      <div key={index} className={`rounded-lg p-4 ${
                        anomaly.severity === 'high' ? 'bg-red-50 border border-red-200' :
                        anomaly.severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-blue-50 border border-blue-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg">
                                {anomaly.type === 'excessive_activity' ? '⚡' :
                                 anomaly.type === 'unusual_pattern' ? '🔍' :
                                 anomaly.type === 'resource_waste' ? '⚠️' :
                                 anomaly.type === 'cross_firm_excess' ? '🔄' : '🚨'}
                              </span>
                              <h5 className="font-semibold text-gray-800">
                                {anomaly.title || 'Anomalia Detectada'}
                              </h5>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                anomaly.severity === 'high' ? 'bg-red-100 text-red-800' :
                                anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {anomaly.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {anomaly.description}
                            </p>
                            {anomaly.recommendation && (
                              <p className="text-sm text-blue-600 italic">
                                💡 {anomaly.recommendation}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {new Date(anomaly.timestamp).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
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

              {/* Ferrovia Session */}
              {detailData.history.ferroviaSession && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 text-purple-500 mr-2" />
                    Sessão Ferrovia
                  </h4>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      Dados da sessão Ferrovia disponíveis
                    </p>
                  </div>
                </div>
              )}

              {/* No Data Message */}
              {!detailData.smartAnalytics?.totalActivities && !detailData.activeSession && detailData.history.payments.length === 0 && (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma atividade inteligente encontrada</h4>
                  <p className="text-gray-600 mb-4">
                    Este trabalhador ainda não possui atividades suficientes para análise inteligente.
                  </p>
                  <div className="bg-blue-50 rounded-lg p-4 text-left max-w-md mx-auto">
                    <h5 className="font-semibold text-blue-800 mb-2">🔍 Para ver análises inteligentes:</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• O trabalhador precisa ter atividade registrada</li>
                      <li>• Análises incluem detecção de propósito (crafting/farming)</li>
                      <li>• Monitoramento de transferências entre empresas</li>
                      <li>• Análise de receitas e eficiência</li>
                      <li>• Detecção de anomalias e padrões</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum dado encontrado para este trabalhador.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}