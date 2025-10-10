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
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(new Set<string>());

  // Fetch messages from webhook API - ONLY for this firm's channel
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.messages && Array.isArray(data.messages)) {
          // Messages are already filtered by channel ID on the server
          const firmSpecificMessages = data.messages;
          
          
          setMessages(firmSpecificMessages);
          setTotalActivities(firmSpecificMessages.length);
          
          // Calculate revenue and active workers from THIS firm's messages only
          let revenue = 0;
          const workers = new Set<string>();
          
          firmSpecificMessages.forEach((msg: any) => {
            if (msg.autor && msg.autor !== 'Sistema') {
              workers.add(msg.autor);
            }
            if (msg.valor && (msg.tipo === 'deposito' || msg.tipo === 'venda')) {
              revenue += msg.valor;
            }
          });
          
          setTotalRevenue(revenue);
          setActiveWorkers(workers);
          setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
        }
      }
    } catch (error) {
      console.error(`Error fetching messages for firm ${firm.name}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMessages();
    
    // Set up polling every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    
    return () => clearInterval(interval);
  }, [firm.channelId, firm.name]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Atividades</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalActivities}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total registrado</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receita</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ {totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total acumulado</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Trabalhadores</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeWorkers.size}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ativos</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Estoque</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Itens totais</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {firm.enabled ? 'Ativo' : 'Inativo'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sistema</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
              <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Atividades Recentes</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Última atualização: {lastUpdate || new Date().toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {messages.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.slice(-20).reverse().map((msg: any) => (
                <div key={msg.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <div className="flex-shrink-0">
                    {msg.categoria === 'financeiro' ? (
                      <DollarSign className={`h-5 w-5 ${msg.tipo === 'deposito' || msg.tipo === 'venda' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
                    ) : msg.categoria === 'inventario' ? (
                      <Package className={`h-5 w-5 ${msg.tipo === 'adicionar' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
                    ) : (
                      <Activity className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{msg.autor || 'Sistema'}</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-300">
                        {msg.displayText || msg.content?.substring(0, 100) || 'Atividade registrada'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(msg.timestamp).toLocaleString('pt-BR')}
                      {msg.valor && ` • R$ ${msg.valor.toFixed(2)}`}
                      {msg.quantidade && msg.item && ` • ${msg.quantidade}x ${msg.item}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aguardando Atividades</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                As atividades do canal #{firm.channelId} aparecerão aqui em tempo real.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-full mt-0.5">
                    <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Sistema Configurado</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      Monitoramento: {firm.monitoring.enabled ? 'Ativo' : 'Inativo'}<br />
                      Endpoint: {firm.monitoring.endpointType}<br />
                      Roles: {firm.allowedRoles.length} configuradas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Firm Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuração do Sistema</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
              <span className="text-sm text-gray-600 dark:text-gray-400">Canal Discord</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">#{firm.channelId}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
              <span className="text-sm text-gray-600 dark:text-gray-400">Endpoint</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{firm.monitoring.endpointType}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
              <span className="text-sm text-gray-600 dark:text-gray-400">Banking</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {firm.display?.bankingEnabled ? 'Habilitado' : 'Desabilitado'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permissões de Acesso</h3>
          <div className="space-y-2">
            {firm.allowedRoles.map((role, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                <span className="text-sm text-gray-900 dark:text-white">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}