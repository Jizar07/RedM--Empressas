'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Users, DollarSign, Package, Calendar, Search, Filter } from 'lucide-react';

interface UserPerformanceMetrics {
  userId: string;
  userName: string;
  totalSessions: number;
  avgPlantToBoxRatio: number;
  externalBoxPercentage: number;
  farmProfitContribution: number;
  totalExternalBoxes: number;
  totalFarmLoss: number;
  suspicionLevel: 'low' | 'medium' | 'high';
  recommendedAction: 'monitor' | 'warn' | 'investigate' | 'terminate';
  lastActivity: string;
  flaggedSessions: string[];
}

export default function FerroviaUserMetrics() {
  const [userMetrics, setUserMetrics] = useState<UserPerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSuspicion, setFilterSuspicion] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'externalPercentage' | 'farmLoss' | 'lastActivity' | 'suspicionLevel'>('externalPercentage');

  useEffect(() => {
    loadUserMetrics();
  }, []);

  const loadUserMetrics = async () => {
    try {
      const response = await fetch('/api/ferrovia/user-metrics');
      if (response.ok) {
        const data = await response.json();
        setUserMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Error loading Ferrovia user metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuspicionColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSuspicionIcon = (level: string) => {
    switch (level) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '✅';
      default: return '❓';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'terminate': return 'text-red-700 bg-red-100';
      case 'investigate': return 'text-orange-700 bg-orange-100';
      case 'warn': return 'text-yellow-700 bg-yellow-100';
      case 'monitor': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'terminate': return 'Demitir';
      case 'investigate': return 'Investigar';
      case 'warn': return 'Advertir';
      case 'monitor': return 'Monitorar';
      default: return 'Indefinido';
    }
  };

  const filteredAndSortedMetrics = userMetrics
    .filter(user => {
      const matchesSearch = searchTerm === '' ||
        user.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterSuspicion === 'all' ||
        user.suspicionLevel === filterSuspicion;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'externalPercentage':
          return b.externalBoxPercentage - a.externalBoxPercentage;
        case 'farmLoss':
          return b.totalFarmLoss - a.totalFarmLoss;
        case 'lastActivity':
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        case 'suspicionLevel':
          const suspicionOrder = { high: 3, medium: 2, low: 1 };
          return suspicionOrder[b.suspicionLevel] - suspicionOrder[a.suspicionLevel];
        default:
          return 0;
      }
    });

  const totalUsers = userMetrics.length;
  const highRiskUsers = userMetrics.filter(u => u.suspicionLevel === 'high').length;
  const mediumRiskUsers = userMetrics.filter(u => u.suspicionLevel === 'medium').length;
  const totalFarmLoss = userMetrics.reduce((sum, u) => sum + u.totalFarmLoss, 0);
  const totalExternalBoxes = userMetrics.reduce((sum, u) => sum + u.totalExternalBoxes, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">Ferrovia - Análise de Performance dos Usuários</h2>
          </div>
          <button
            onClick={loadUserMetrics}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Atualizar
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total de Usuários</p>
                <p className="text-2xl font-bold text-blue-900">{totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-600">Alto Risco</p>
                <p className="text-2xl font-bold text-red-900">{highRiskUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Médio Risco</p>
                <p className="text-2xl font-bold text-yellow-900">{mediumRiskUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Prejuízo Total</p>
                <p className="text-2xl font-bold text-green-900">${totalFarmLoss.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterSuspicion}
            onChange={(e) => setFilterSuspicion(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Níveis</option>
            <option value="high">Alto Risco</option>
            <option value="medium">Médio Risco</option>
            <option value="low">Baixo Risco</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="externalPercentage">% Caixas Externas</option>
            <option value="farmLoss">Prejuízo da Farm</option>
            <option value="lastActivity">Última Atividade</option>
            <option value="suspicionLevel">Nível de Suspeita</option>
          </select>
        </div>
      </div>

      {/* User Metrics Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atividade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impacto na Farm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risco
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação Recomendada
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedMetrics.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.userName}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {user.userId.slice(-8)}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{user.totalSessions} sessões</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Última: {new Date(user.lastActivity).toLocaleDateString('pt-BR')}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.externalBoxPercentage > 50 ? 'bg-red-100 text-red-800' :
                          user.externalBoxPercentage > 25 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          📦 {user.externalBoxPercentage.toFixed(1)}% externas
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Ratio P/C: {user.avgPlantToBoxRatio.toFixed(1)}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.totalFarmLoss > 0 ? (
                        <span className="text-red-600 font-medium">-${user.totalFarmLoss.toFixed(0)}</span>
                      ) : (
                        <span className="text-green-600 font-medium">+${user.farmProfitContribution.toFixed(0)}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.totalExternalBoxes} caixas externas
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSuspicionColor(user.suspicionLevel)}`}>
                      {getSuspicionIcon(user.suspicionLevel)} {user.suspicionLevel.toUpperCase()}
                    </span>
                    {user.flaggedSessions.length > 0 && (
                      <div className="text-xs text-red-500 mt-1">
                        {user.flaggedSessions.length} sessões marcadas
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(user.recommendedAction)}`}>
                      {getActionText(user.recommendedAction)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedMetrics.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterSuspicion !== 'all'
                  ? 'Tente ajustar seus filtros de busca'
                  : 'Ainda não há dados de usuários disponíveis'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}