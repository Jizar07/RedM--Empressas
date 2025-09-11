'use client';

import React, { useState } from 'react';
import { 
  Users, TrendingUp, Package, Plus, Minus, Clock, Award,
  ChevronDown, ChevronUp, Calendar, Activity, BarChart3
} from 'lucide-react';
import { WorkerInventoryStats } from '@/types/inventory';
import { FirmConfig } from '@/types/firms';

interface InventoryWorkerAnalyticsProps {
  firm: FirmConfig;
  workers: WorkerInventoryStats[];
  className?: string;
}

interface WorkerCardProps {
  worker: WorkerInventoryStats;
  rank: number;
  getBestDisplayName: (id: string) => string;
}

const WorkerCard: React.FC<WorkerCardProps> = ({ worker, rank, getBestDisplayName }) => {
  const [expanded, setExpanded] = useState(false);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getActivityLevel = (avgPerDay: number) => {
    if (avgPerDay >= 10) return { level: 'Muito Ativo', color: 'bg-green-100 text-green-800', icon: '🔥' };
    if (avgPerDay >= 5) return { level: 'Ativo', color: 'bg-blue-100 text-blue-800', icon: '⚡' };
    if (avgPerDay >= 1) return { level: 'Moderado', color: 'bg-yellow-100 text-yellow-800', icon: '📈' };
    return { level: 'Baixo', color: 'bg-gray-100 text-gray-800', icon: '💤' };
  };

  const activityLevel = getActivityLevel(worker.averagePerDay);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-gray-600">
              {getRankIcon(rank)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{worker.userName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${activityLevel.color}`}>
                  {activityLevel.icon} {activityLevel.level}
                </span>
                <span className="text-sm text-gray-500">
                  {worker.averagePerDay.toFixed(1)} transações/dia
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Saldo Líquido</div>
              <div className={`text-lg font-bold ${worker.netItems >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {worker.netItems >= 0 ? '+' : ''}{worker.netItems}
              </div>
            </div>
            
            <div className="text-gray-400">
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{worker.totalTransactions}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+{worker.itemsAdded}</div>
              <div className="text-xs text-gray-600">Adicionados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">-{worker.itemsRemoved}</div>
              <div className="text-xs text-gray-600">Removidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Object.keys(worker.categorias || {}).length}</div>
              <div className="text-xs text-gray-600">Categorias</div>
            </div>
          </div>

          {/* Category Breakdown */}
          {worker.categorias && Object.keys(worker.categorias).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">📊 Atividade por Categoria</h4>
              <div className="space-y-2">
                {Object.entries(worker.categorias)
                  .sort(([,a], [,b]) => (b.added + Math.abs(b.removed)) - (a.added + Math.abs(a.removed)))
                  .slice(0, 5)
                  .map(([categoria, stats]) => (
                    <div key={categoria} className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{categoria}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">+{stats.added}</span>
                        <span className="text-red-600">-{stats.removed}</span>
                        <span className={`font-medium ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({stats.net >= 0 ? '+' : ''}{stats.net})
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>Primeira atividade: {new Date(worker.firstActivity).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity size={12} />
              <span>Última atividade: {new Date(worker.lastActivity).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function InventoryWorkerAnalytics({ 
  firm, 
  workers, 
  className = '' 
}: InventoryWorkerAnalyticsProps) {
  const [sortBy, setSortBy] = useState<'transactions' | 'netItems' | 'activity' | 'name'>('transactions');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showInactive, setShowInactive] = useState(false);

  // Get best display name function (simplified version)
  const getBestDisplayName = (itemId: string): string => {
    return itemId
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Filter and sort workers
  const filteredWorkers = workers
    .filter(worker => showInactive || worker.averagePerDay > 0)
    .sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'netItems':
          aValue = a.netItems;
          bValue = b.netItems;
          break;
        case 'activity':
          aValue = a.averagePerDay;
          bValue = b.averagePerDay;
          break;
        case 'name':
          return sortOrder === 'desc' 
            ? b.userName.localeCompare(a.userName)
            : a.userName.localeCompare(b.userName);
        case 'transactions':
        default:
          aValue = a.totalTransactions;
          bValue = b.totalTransactions;
          break;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

  // Calculate summary stats
  const totalWorkers = workers.length;
  const activeWorkers = workers.filter(w => w.averagePerDay > 0).length;
  const totalTransactions = workers.reduce((sum, w) => sum + w.totalTransactions, 0);
  const totalNetItems = workers.reduce((sum, w) => sum + w.netItems, 0);
  const topPerformer = workers.sort((a, b) => b.totalTransactions - a.totalTransactions)[0];

  if (workers.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-8 text-center ${className}`}>
        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Atividade de Trabalhadores</h3>
        <p className="text-gray-500">
          Dados dos trabalhadores aparecerão aqui quando houver atividades no inventário.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={28} />
            👥 Análise de Trabalhadores
          </h2>
          <p className="text-gray-600">
            Produtividade e estatísticas de inventário por trabalhador
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Total de Trabalhadores</p>
              <p className="text-3xl font-bold">{totalWorkers}</p>
              <p className="text-xs text-white/60">{activeWorkers} ativos</p>
            </div>
            <Users className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Total de Transações</p>
              <p className="text-3xl font-bold">{totalTransactions}</p>
              <p className="text-xs text-white/60">Todas as atividades</p>
            </div>
            <Activity className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Saldo Líquido Total</p>
              <p className={`text-3xl font-bold ${totalNetItems >= 0 ? '' : 'text-red-200'}`}>
                {totalNetItems >= 0 ? '+' : ''}{totalNetItems}
              </p>
              <p className="text-xs text-white/60">Itens no sistema</p>
            </div>
            <Package className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Melhor Performer</p>
              <p className="text-lg font-bold truncate">{topPerformer?.userName || 'N/A'}</p>
              <p className="text-xs text-white/60">{topPerformer?.totalTransactions || 0} transações</p>
            </div>
            <Award className="text-white/80" size={24} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="transactions-desc">Mais Transações</option>
              <option value="transactions-asc">Menos Transações</option>
              <option value="netItems-desc">Maior Saldo Líquido</option>
              <option value="netItems-asc">Menor Saldo Líquido</option>
              <option value="activity-desc">Mais Ativo</option>
              <option value="activity-asc">Menos Ativo</option>
              <option value="name-asc">Nome (A-Z)</option>
              <option value="name-desc">Nome (Z-A)</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Mostrar inativos</span>
            </label>
          </div>
        </div>
      </div>

      {/* Worker Cards */}
      <div className="space-y-4">
        {filteredWorkers.map((worker, index) => (
          <WorkerCard
            key={worker.userId}
            worker={worker}
            rank={index + 1}
            getBestDisplayName={getBestDisplayName}
          />
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum trabalhador encontrado</h3>
          <p className="text-gray-500">
            Tente ajustar os filtros ou aguarde atividades no inventário.
          </p>
        </div>
      )}
    </div>
  );
}