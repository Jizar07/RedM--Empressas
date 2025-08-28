'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Activity, TrendingUp, Users, Package, DollarSign, AlertCircle, CheckCircle, Zap, Clock } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface GenericFirmDashboardProps {
  firm: FirmConfig;
}

export default function GenericFirmDashboard({ firm }: GenericFirmDashboardProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏛️ {firm.name}</h1>
            <p className="text-blue-100">{firm.description || 'Sistema de gestão empresarial'}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-2">
              {firm.monitoring.enabled ? (
                <CheckCircle className="h-5 w-5 text-green-300" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-300" />
              )}
              <span className="text-sm">
                {firm.monitoring.enabled ? 'Monitoramento Ativo' : 'Monitoramento Inativo'}
              </span>
            </div>
            <p className="text-xs text-blue-200">Canal: #{firm.channelId}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Atividades</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-xs text-gray-500 mt-1">Última hora</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita</p>
              <p className="text-2xl font-bold text-gray-900">R$ --</p>
              <p className="text-xs text-gray-500 mt-1">Este mês</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trabalhadores</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-xs text-gray-500 mt-1">Ativos hoje</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Estoque</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-xs text-gray-500 mt-1">Itens totais</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg font-bold text-gray-900">
                {firm.enabled ? 'Ativo' : 'Inativo'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Sistema</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Zap className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Última atualização: {lastUpdate || new Date().toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aguardando Atividades</h3>
          <p className="text-gray-500 mb-4">
            As atividades do canal #{firm.channelId} aparecerão aqui em tempo real.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-blue-100 rounded-full mt-0.5">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900">Sistema Configurado</p>
                <p className="text-xs text-blue-700 mt-1">
                  Monitoramento: {firm.monitoring.enabled ? 'Ativo' : 'Inativo'}<br />
                  Endpoint: {firm.monitoring.endpointType}<br />
                  Roles: {firm.allowedRoles.length} configuradas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Firm Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuração do Sistema</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Canal Discord</span>
              <span className="text-sm font-mono text-gray-900">#{firm.channelId}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Endpoint</span>
              <span className="text-sm font-medium text-gray-900">{firm.monitoring.endpointType}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Banking</span>
              <span className="text-sm font-medium text-gray-900">
                {firm.display?.bankingEnabled ? 'Habilitado' : 'Desabilitado'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissões de Acesso</h3>
          <div className="space-y-2">
            {firm.allowedRoles.map((role, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-900">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}