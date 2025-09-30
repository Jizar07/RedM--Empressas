'use client';

import React, { useState, useMemo } from 'react';
import {
  Users, Search, TrendingUp, DollarSign, Activity,
  Clock, User, Filter, ArrowUp, ArrowDown, ChevronsUpDown,
  Heart, Stethoscope, AlertCircle, Eye
} from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import VeterinariaWorkerDetailsModal from './VeterinariaWorkerDetailsModal';

interface VeterinariaWorkersProps {
  firm: FirmConfig;
}

export default function VeterinariaWorkers({ firm }: VeterinariaWorkersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'activities' | 'items' | 'lastActivity'>('activities');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedWorker, setSelectedWorker] = useState<{ id: string; name: string } | null>(null);

  // Use the inventory manager hook to get data ONLY from this firm's channel
  const {
    inventoryData,
    loading,
    error,
    isReady
  } = useInventoryManager({ firm });

  // Process all transactions from this specific firm's channel
  const workerStats = useMemo(() => {
    const statsMapByName = new Map<string, {
      userId: string;
      userName: string;
      totalActivities: number;
      totalItems: number;
      lastActivity: string | null;
      activities: Array<{
        type: string;
        itemName: string;
        quantity: number;
        timestamp: string;
        details: string;
      }>;
    }>();

    // Get ALL transactions from inventory data (including INSERIR/REMOVER ITEM)
    const transactions = inventoryData.transactions || [];

    transactions.forEach(transaction => {
      const userId = transaction.autor || 'unknown';
      const userName = transaction.autor || 'Desconhecido';

      // Use userName as key to merge workers with same name but different IDs
      if (!statsMapByName.has(userName)) {
        statsMapByName.set(userName, {
          userId,
          userName,
          totalActivities: 0,
          totalItems: 0,
          lastActivity: null,
          activities: []
        });
      }

      const stats = statsMapByName.get(userName)!;
      stats.totalActivities++;
      stats.totalItems += Math.abs(transaction.quantidade_mudanca);

      if (!stats.lastActivity || new Date(transaction.timestamp) > new Date(stats.lastActivity)) {
        stats.lastActivity = transaction.timestamp;
      }

      stats.activities.push({
        type: transaction.tipo,
        itemName: transaction.itemId,
        quantity: Math.abs(transaction.quantidade_mudanca),
        timestamp: transaction.timestamp,
        details: transaction.detalhes || ''
      });
    });

    return Array.from(statsMapByName.values());
  }, [inventoryData.transactions]);

  // Debug: Log when component loads
  React.useEffect(() => {
    console.log('🏥 VeterinariaWorkers component loaded');
    console.log('📊 Inventory data:', inventoryData);
    console.log('📊 Worker stats length:', workerStats.length);
    console.log('📊 Worker stats:', workerStats);
  }, [inventoryData, workerStats]);

  // Apply filters and sorting
  const filteredAndSortedWorkers = useMemo(() => {
    let filtered = [...workerStats];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(worker =>
        worker.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply period filter
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (selectedPeriod) {
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(worker => {
        if (!worker.lastActivity) return false;
        return new Date(worker.lastActivity) >= cutoffDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.userName.localeCompare(b.userName);
          break;
        case 'activities':
          comparison = a.totalActivities - b.totalActivities;
          break;
        case 'items':
          comparison = a.totalItems - b.totalItems;
          break;
        case 'lastActivity':
          const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [workerStats, searchTerm, selectedPeriod, sortBy, sortDirection]);

  // Handle column sorting
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Handle worker details modal
  const handleViewWorkerDetails = (workerId: string, workerName: string) => {
    console.log(`👁️ Opening details modal for worker: ID="${workerId}", Name="${workerName}"`);
    setSelectedWorker({ id: workerId, name: workerName });
  };

  const closeWorkerModal = () => {
    setSelectedWorker(null);
  };


  // Sort indicator component
  const SortIndicator = ({ column }: { column: 'name' | 'activities' | 'items' | 'lastActivity' }) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="h-3 w-3 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 text-green-600" />
      : <ArrowDown className="h-3 w-3 text-green-600" />;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const periods = [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: 'all', label: 'Todo o período' }
  ];

  if (loading && !isReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300 dark:text-gray-300">Carregando dados da veterinária...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700">Erro ao carregar dados: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <Stethoscope className="w-8 h-8" />
              <h1 className="text-2xl font-bold">{firm.name} - Trabalhadores</h1>
            </div>
            <p className="text-green-100 mt-2">Acompanhamento de atividades veterinárias</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <div className="text-sm text-green-100">Total de Trabalhadores</div>
              <div className="text-2xl font-bold">{workerStats.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">Trabalhadores Ativos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                {filteredAndSortedWorkers.length}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">Total de Transações</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                {filteredAndSortedWorkers.reduce((acc, worker) => acc + worker.totalActivities, 0)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">Total de Itens</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                {filteredAndSortedWorkers.reduce((acc, worker) => acc + worker.totalItems, 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">Média de Itens</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                {filteredAndSortedWorkers.length > 0
                  ? Math.round(filteredAndSortedWorkers.reduce((acc, worker) => acc + worker.totalItems, 0) / filteredAndSortedWorkers.length)
                  : 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar trabalhador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Period Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>Trabalhador</span>
                    <SortIndicator column="name" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center">
                  <button
                    onClick={() => handleSort('activities')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-700 dark:text-gray-300 w-full"
                  >
                    <span>Atividades</span>
                    <SortIndicator column="activities" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center">
                  <button
                    onClick={() => handleSort('items')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-700 dark:text-gray-300 w-full"
                  >
                    <span>Total de Itens</span>
                    <SortIndicator column="items" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center">
                  <button
                    onClick={() => handleSort('lastActivity')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-700 dark:text-gray-300 w-full"
                  >
                    <span>Última Atividade</span>
                    <SortIndicator column="lastActivity" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 dark:divide-gray-700">
              {filteredAndSortedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400">
                    <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhum trabalhador encontrado</p>
                    <p className="text-sm mt-1">Ajuste os filtros ou aguarde novas atividades</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedWorkers.map((worker, index) => (
                  <tr key={worker.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{worker.userName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400">ID: {worker.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {worker.totalActivities}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                        {worker.totalItems} itens
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(worker.lastActivity)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleViewWorkerDetails(worker.userId, worker.userName)}
                        className="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        title="Ver detalhes do fluxo de materiais"
                      >
                        <Eye className="h-4 w-4 text-green-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker Details Modal */}
      {selectedWorker && (
        <VeterinariaWorkerDetailsModal
          workerId={selectedWorker.id}
          workerName={selectedWorker.name}
          onClose={closeWorkerModal}
        />
      )}
    </div>
  );
}