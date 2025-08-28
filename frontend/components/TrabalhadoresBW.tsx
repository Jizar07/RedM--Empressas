'use client';

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Search, X, ChevronDown, ChevronUp, CheckCircle, Activity } from 'lucide-react';

interface WorkerStats {
  itensAdicionados: number;
  itensRemovidos: number;
  valorDepositado: number;
  atividades: number;
  ultimaAtividade: string | null;
}

interface Worker {
  nome: string;
  atividades: any[];
  totalTransacoes: number;
  ultimaAtividade: string | null;
  funcao: string;
}

interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: string;
  categoria?: string;
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
}

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  color = 'blue',
  subtitle
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 rounded-lg text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
        </div>
        <div className="text-white/80">{icon}</div>
      </div>
    </div>
  );
};

import { FirmConfig } from '@/types/firms';

interface TrabalhadoresBWProps {
  firm?: FirmConfig;
}

export default function TrabalhadoresBW({ firm }: TrabalhadoresBWProps = {}) {
  const [workers, setWorkers] = useState<{[key: string]: Worker}>({});
  const [workerStats, setWorkerStats] = useState<{[key: string]: WorkerStats}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterActivity, setFilterActivity] = useState('all');
  const [expandedWorkers, setExpandedWorkers] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [workersPerPage] = useState(10);

  // Process extension data to create worker statistics
  const processWorkerData = (extensionMessages: Activity[]) => {
    const workerData: {[key: string]: Worker} = {};
    const workerStatsData: {[key: string]: WorkerStats} = {};
    
    // Filter messages by firm's channelId
    const channelId = firm?.channelId || '1409214475403526174';
    const filteredMessages = extensionMessages.filter((msg: any) => 
      !msg.channelId || msg.channelId === channelId
    );

    filteredMessages.forEach(msg => {
      const content = msg.content || '';
      const author = msg.autor || 'Unknown';
      
      // Initialize worker if not exists
      if (!workerData[author]) {
        workerData[author] = {
          nome: author,
          atividades: [],
          totalTransacoes: 0,
          ultimaAtividade: null,
          funcao: 'trabalhador'
        };
      }

      // Initialize worker stats if not exists
      if (!workerStatsData[author]) {
        workerStatsData[author] = {
          itensAdicionados: 0,
          itensRemovidos: 0,
          valorDepositado: 0,
          atividades: 0,
          ultimaAtividade: null
        };
      }

      let activity = null;

      // Parse different types of activities
      if (content.includes('INSERIR ITEM') || content.includes('inserir item')) {
        const itemMatch = content.match(/Item adicionado:(.+?)\s*x(\d+)/i);
        if (itemMatch) {
          const quantidade = parseInt(itemMatch[2]);
          activity = {
            tipo: 'adicionar',
            item: itemMatch[1].trim(),
            quantidade: quantidade,
            timestamp: msg.timestamp || new Date().toISOString()
          };
          workerStatsData[author].itensAdicionados += quantidade;
        }
      } else if (content.includes('REMOVER ITEM') || content.includes('remover item')) {
        const itemMatch = content.match(/Item removido:(.+?)\s*x(\d+)/i);
        if (itemMatch) {
          const quantidade = parseInt(itemMatch[2]);
          activity = {
            tipo: 'remover',
            item: itemMatch[1].trim(),
            quantidade: quantidade,
            timestamp: msg.timestamp || new Date().toISOString()
          };
          workerStatsData[author].itensRemovidos += quantidade;
        }
      } else if (content.includes('CAIXA ORGANIZAÇÃO') && content.includes('DEPÓSITO')) {
        const valueMatch = content.match(/Valor depositado:\$?([\d,\.]+)/i);
        if (valueMatch) {
          const valor = parseFloat(valueMatch[1].replace(',', '.'));
          activity = {
            tipo: 'deposito',
            valor: valor,
            timestamp: msg.timestamp || new Date().toISOString()
          };
          workerStatsData[author].valorDepositado += valor;
        }
      }

      if (activity) {
        workerData[author].atividades.push(activity);
        workerData[author].totalTransacoes++;
        workerData[author].ultimaAtividade = activity.timestamp;
        workerStatsData[author].atividades++;
        workerStatsData[author].ultimaAtividade = activity.timestamp;
      }
    });

    return { workerData, workerStatsData };
  };

  // Get filtered and sorted workers
  const getFilteredAndSortedWorkers = () => {
    if (!workers) return [];

    let workersList = Object.values(workers);

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      workersList = workersList.filter(worker => 
        worker.nome.toLowerCase().includes(searchLower)
      );
    }

    // Activity filter
    if (filterActivity !== 'all') {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      if (filterActivity === 'active') {
        workersList = workersList.filter(worker => 
          worker.ultimaAtividade && new Date(worker.ultimaAtividade) > dayAgo
        );
      } else if (filterActivity === 'inactive') {
        workersList = workersList.filter(worker => 
          !worker.ultimaAtividade || new Date(worker.ultimaAtividade) <= dayAgo
        );
      }
    }

    // Sort workers
    workersList.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'atividades':
          aValue = a.totalTransacoes || 0;
          bValue = b.totalTransacoes || 0;
          break;
        case 'ultimaAtividade':
          aValue = new Date(a.ultimaAtividade || 0);
          bValue = new Date(b.ultimaAtividade || 0);
          break;
        case 'nome':
        default:
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return workersList;
  };

  // Get paginated workers
  const getPaginatedWorkers = () => {
    const filteredWorkers = getFilteredAndSortedWorkers();
    const startIndex = (currentPage - 1) * workersPerPage;
    const endIndex = startIndex + workersPerPage;
    return {
      workers: filteredWorkers.slice(startIndex, endIndex),
      totalWorkers: filteredWorkers.length,
      totalPages: Math.ceil(filteredWorkers.length / workersPerPage)
    };
  };

  // Get worker performance color
  const getPerformanceColor = (worker: Worker) => {
    const totalActivities = worker.totalTransacoes || 0;
    if (totalActivities >= 20) return 'success';
    if (totalActivities >= 10) return 'warning';
    if (totalActivities > 0) return 'info';
    return 'error';
  };

  // Calculate overall stats
  const calculateOverallStats = () => {
    const workersList = Object.values(workers);
    const totalWorkers = workersList.length;
    const activeWorkers = workersList.filter(w => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return w.ultimaAtividade && new Date(w.ultimaAtividade) > dayAgo;
    }).length;
    const totalTransactions = workersList.reduce((sum, w) => sum + (w.totalTransacoes || 0), 0);
    
    return {
      totalWorkers,
      activeWorkers,
      totalTransactions,
      avgTransactionsPerWorker: totalWorkers > 0 ? (totalTransactions / totalWorkers).toFixed(1) : 0
    };
  };

  useEffect(() => {
    setLoading(false);

    // Listen for extension data updates
    const handleExtensionUpdate = (event: CustomEvent) => {
      console.log('👥 Processing extension data for workers:', event.detail);
      
      const messages = event.detail || [];
      const { workerData, workerStatsData } = processWorkerData(messages);
      
      setWorkers(workerData);
      setWorkerStats(workerStatsData);
    };

    // Set up listener for extension data
    window.addEventListener('extensionData', handleExtensionUpdate as EventListener);

    return () => {
      window.removeEventListener('extensionData', handleExtensionUpdate as EventListener);
    };
  }, []);

  const overallStats = calculateOverallStats();
  const { workers: paginatedWorkers, totalPages } = getPaginatedWorkers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">👥 Trabalhadores - Fazenda BW</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Trabalhadores"
          value={overallStats.totalWorkers}
          icon={<Users size={24} />}
          color="blue"
        />
        
        <MetricCard
          title="Trabalhadores Ativos"
          value={overallStats.activeWorkers}
          icon={<CheckCircle size={24} />}
          color="green"
          subtitle="Últimas 24 horas"
        />
        
        <MetricCard
          title="Total de Atividades"
          value={overallStats.totalTransactions}
          icon={<Activity size={24} />}
          color="purple"
        />
        
        <MetricCard
          title="Média por Trabalhador"
          value={overallStats.avgTransactionsPerWorker}
          icon={<TrendingUp size={24} />}
          color="yellow"
          subtitle="Atividades por pessoa"
        />
      </div>

      {/* Extension Status */}
      <div className={`rounded-lg p-4 ${overallStats.totalWorkers > 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            🔗 Status: {overallStats.totalWorkers > 0 ? `${overallStats.totalWorkers} trabalhadores identificados` : 'Aguardando dados da extensão...'}
          </h2>
          {overallStats.totalWorkers > 0 && (
            <span className="px-2 py-1 bg-green-500 text-white text-sm rounded">
              {overallStats.totalTransactions} atividades processadas
            </span>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar trabalhadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <select 
            value={filterActivity} 
            onChange={(e) => setFilterActivity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos (24h)</option>
            <option value="inactive">Inativos</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="nome">Nome</option>
            <option value="atividades">Atividades</option>
            <option value="ultimaAtividade">Última Atividade</option>
          </select>

          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="asc">A-Z / Menor</option>
            <option value="desc">Z-A / Maior</option>
          </select>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">👥 Lista de Trabalhadores</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
              {paginatedWorkers.length} trabalhadores
            </span>
          </div>
          <button 
            onClick={() => setExpandedWorkers(!expandedWorkers)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {expandedWorkers ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {expandedWorkers && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome do Trabalhador
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atividades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Atividade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estatísticas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'Nenhum trabalhador encontrado para a pesquisa' :
                       filterActivity !== 'all' ? `Nenhum trabalhador ${filterActivity === 'active' ? 'ativo' : 'inativo'}` :
                       'Nenhum trabalhador identificado'}
                    </td>
                  </tr>
                ) : (
                  paginatedWorkers.map((worker) => {
                    const stats = workerStats[worker.nome] || {};
                    const performanceColor = getPerformanceColor(worker);
                    
                    return (
                      <tr key={worker.nome} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{worker.nome}</div>
                            <div className="text-sm text-gray-500">Função: {worker.funcao}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                            performanceColor === 'success' ? 'bg-green-100 text-green-800' :
                            performanceColor === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            performanceColor === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {worker.totalTransacoes || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {performanceColor === 'success' && <TrendingUp className="text-green-500" size={16} />}
                            {performanceColor === 'warning' && <TrendingDown className="text-yellow-500" size={16} />}
                            {performanceColor === 'error' && <TrendingDown className="text-red-500" size={16} />}
                            <span className={`text-sm ${
                              performanceColor === 'success' ? 'text-green-600' :
                              performanceColor === 'warning' ? 'text-yellow-600' :
                              performanceColor === 'info' ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {performanceColor === 'success' ? 'Excelente' :
                               performanceColor === 'warning' ? 'Bom' :
                               performanceColor === 'info' ? 'Regular' : 'Inativo'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {worker.ultimaAtividade ? 
                            new Date(worker.ultimaAtividade).toLocaleString('pt-BR') : 
                            'Nunca'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {stats.itensAdicionados > 0 && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                +{stats.itensAdicionados} itens
                              </span>
                            )}
                            {stats.itensRemovidos > 0 && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                -{stats.itensRemovidos} itens
                              </span>
                            )}
                            {stats.valorDepositado > 0 && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                ${stats.valorDepositado.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}