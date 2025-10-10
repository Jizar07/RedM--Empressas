'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Activity, Star, Award, Clock, BarChart3, User } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface GenericFirmTrabalhadoresProps {
  firm: FirmConfig;
}

export default function GenericFirmTrabalhadores({ firm }: GenericFirmTrabalhadoresProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const periods = [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: 'all', label: 'Todo o período' }
  ];

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
            ))}
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-96"></div>
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
            <p className="text-3xl font-bold">--</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Trabalhadores Ativos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ --</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Atividades</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Média por Trabalhador</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ --</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Período de Análise
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lista de Trabalhadores de {firm.name}
          </h2>
        </div>

        <div className="p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aguardando Trabalhadores</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Os trabalhadores aparecerão aqui quando houver atividades no canal #{firm.channelId}.
          </p>

          {/* Placeholder Table Structure */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <div className="grid grid-cols-7 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                <div className="text-left">Rank</div>
                <div className="text-left">Trabalhador</div>
                <div className="text-left">Status</div>
                <div className="text-left">Atividades</div>
                <div className="text-left">Receita Total</div>
                <div className="text-left">Média/Dia</div>
                <div className="text-left">Última Atividade</div>
              </div>

              {/* Sample rows */}
              {[1, 2, 3].map(i => (
                <div key={i} className="grid grid-cols-7 gap-4 py-3 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4" />
                    <span>#{i}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>--</span>
                  </div>
                  <div>--</div>
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    <span>--</span>
                  </div>
                  <div>R$ --</div>
                  <div>--</div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>--</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 max-w-md mx-auto transition-colors">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-purple-100 dark:bg-purple-800 rounded-full mt-0.5">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Sistema Configurado</p>
                <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                  Trabalhadores serão automaticamente rastreados baseado em atividades Discord no canal #{firm.channelId}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🏆 Top Performers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((rank) => (
            <div key={rank} className={`p-4 rounded-lg border-2 transition-colors ${
              rank === 1 ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20' :
              rank === 2 ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700' :
              'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <div className="flex items-center space-x-3">
                {rank === 1 ? (
                  <Award className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                ) : rank === 2 ? (
                  <Award className="h-5 w-5 text-gray-400" />
                ) : (
                  <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-400">#{rank} --</p>
                  <p className="text-sm text-gray-400">Aguardando dados</p>
                  <p className="text-sm font-medium text-gray-400 mt-1">R$ --</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuração dos Trabalhadores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Roles Permitidas</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{firm.allowedRoles.length} roles configuradas</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Canal</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">#{firm.channelId}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Status</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {firm.monitoring.enabled ? 'Monitoramento Ativo' : 'Monitoramento Inativo'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}