'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, Package, DollarSign, Activity, Clock, Star, AlertTriangle, Eye } from 'lucide-react';

interface Props {
  recentActivity: any[];
  usuarios: any;
  inventario: any;
  pagamentos: any;
}

export default function AnalyticsBWManagement({ recentActivity, usuarios, inventario, pagamentos }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [currentTab, setCurrentTab] = useState<'overview' | 'users' | 'inventory' | 'payments' | 'activity'>('overview');

  // Get filtered data based on selected period
  const getFilteredData = (data: any[], dateField: string = 'timestamp') => {
    if (selectedPeriod === 'all') return data;
    
    const now = new Date();
    const daysAgo = selectedPeriod === '7d' ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    return data.filter(item => new Date(item[dateField]) >= cutoffDate);
  };

  // Calculate overview statistics
  const overviewStats = {
    totalUsers: Object.keys(usuarios.usuarios || {}).length,
    activeUsers: Object.values(usuarios.usuarios || {}).filter((u: any) => u.ativo).length,
    totalItems: Object.keys(inventario.itens || {}).length,
    totalQuantity: inventario.total_quantidade || 0,
    totalActivities: recentActivity.length,
    recentActivities: getFilteredData(recentActivity).length,
    itemsWithStock: Object.values(inventario.itens || {}).filter((item: any) => item.quantidade > 0).length,
    zeroStockItems: Object.values(inventario.itens || {}).filter((item: any) => item.quantidade === 0).length
  };

  // User analytics
  const userAnalytics = {
    byRole: {
      trabalhador: usuarios.funcoes?.trabalhador?.length || 0,
      gerente: usuarios.funcoes?.gerente?.length || 0
    },
    mostActiveUsers: recentActivity
      .reduce((acc: any, activity) => {
        if (activity.autor && activity.autor !== 'Sistema') {
          acc[activity.autor] = (acc[activity.autor] || 0) + 1;
        }
        return acc;
      }, {})
  };

  // Inventory analytics
  const inventoryAnalytics = {
    topItems: Object.entries(inventario.itens || {})
      .sort(([,a]: any, [,b]: any) => b.quantidade - a.quantidade)
      .slice(0, 10),
    lowStockItems: Object.entries(inventario.itens || {})
      .filter(([,item]: any) => item.quantidade > 0 && item.quantidade < 10)
      .sort(([,a]: any, [,b]: any) => a.quantidade - b.quantidade),
    recentTransactions: getFilteredData(inventario.historico_transacoes || [], 'timestamp').slice(0, 20),
    categoryDistribution: Object.entries(inventario.itens || {})
      .reduce((acc: any, [,item]: any) => {
        const category = getItemCategory(item.nome);
        acc[category] = (acc[category] || 0) + item.quantidade;
        return acc;
      }, {})
  };

  // Payment analytics
  const allPayments = Object.values(pagamentos.usuarios || {}).flatMap((u: any) => u.pagamentos || []);
  const paymentAnalytics = {
    total: allPayments.length,
    byStatus: {
      pago: allPayments.filter((p: any) => p.status === 'pago').length,
      pendente: allPayments.filter((p: any) => p.status === 'pendente').length,
      cancelado: allPayments.filter((p: any) => p.status === 'cancelado').length
    },
    totalValue: allPayments.reduce((sum: number, p: any) => sum + (p.status === 'pago' ? p.valor : 0), 0),
    pendingValue: allPayments.filter((p: any) => p.status === 'pendente').reduce((sum: number, p: any) => sum + p.valor, 0),
    recentPayments: getFilteredData(allPayments, 'data_pagamento').slice(0, 10)
  };

  // Activity analytics
  const activityAnalytics = {
    byType: recentActivity.reduce((acc: any, activity) => {
      const type = activity.tipo || 'outros';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),
    byCategory: recentActivity.reduce((acc: any, activity) => {
      const category = activity.categoria || 'outros';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {}),
    byAuthor: Object.entries(userAnalytics.mostActiveUsers)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 10),
    timeline: getFilteredData(recentActivity).reduce((acc: any, activity) => {
      const date = new Date(activity.timestamp).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {})
  };

  const getItemCategory = (itemName: string): string => {
    const name = itemName.toLowerCase();
    if (name.includes('seed') || name.includes('semente')) return 'sementes';
    if (name.includes('plant') || name.includes('planta') || name.includes('trigo') || name.includes('milho')) return 'plantas';
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('sheep')) return 'animais';
    if (name.includes('racao') || name.includes('feed')) return 'racoes';
    if (name.includes('food') || name.includes('comida')) return 'comidas';
    if (name.includes('drink') || name.includes('bebida')) return 'bebidas';
    if (name.includes('wood') || name.includes('iron') || name.includes('stone')) return 'materiais';
    if (name.includes('tool') || name.includes('ferramenta')) return 'ferramentas';
    return 'outros';
  };

  const tabs = [
    { id: 'overview', name: '📊 Visão Geral', icon: BarChart3 },
    { id: 'users', name: '👥 Usuários', icon: Users },
    { id: 'inventory', name: '📦 Inventário', icon: Package },
    { id: 'payments', name: '💰 Pagamentos', icon: DollarSign },
    { id: 'activity', name: '⚡ Atividades', icon: Activity }
  ];

  const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }: any) => (
    <div className={`bg-gradient-to-r from-${color}-500 to-${color}-600 p-6 rounded-lg text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
          {trend && (
            <div className="flex items-center mt-2">
              {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="ml-1 text-sm">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <Icon className="text-white/80" size={24} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 size={28} />
          📊 Analytics & Relatórios
        </h2>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="all">Todos os dados</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    currentTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="p-6">
          {currentTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">📈 Visão Geral do Sistema</h3>
              
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Usuários Registrados"
                  value={overviewStats.totalUsers}
                  subtitle={`${overviewStats.activeUsers} ativos`}
                  icon={Users}
                  color="blue"
                />
                <MetricCard
                  title="Itens no Inventário"
                  value={overviewStats.totalItems}
                  subtitle={`${overviewStats.totalQuantity} total em estoque`}
                  icon={Package}
                  color="green"
                />
                <MetricCard
                  title="Atividades Capturadas"
                  value={overviewStats.totalActivities}
                  subtitle={`${overviewStats.recentActivities} no período`}
                  icon={Activity}
                  color="purple"
                />
                <MetricCard
                  title="Total de Pagamentos"
                  value={paymentAnalytics.total}
                  subtitle={`$${paymentAnalytics.totalValue.toFixed(2)} pagos`}
                  icon={DollarSign}
                  color="yellow"
                />
              </div>

              {/* System Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold mb-4">🎯 Indicadores de Saúde do Sistema</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Usuários Ativos</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        overviewStats.activeUsers > overviewStats.totalUsers * 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {((overviewStats.activeUsers / overviewStats.totalUsers) * 100 || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Itens com Estoque</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        overviewStats.itemsWithStock > overviewStats.totalItems * 0.7 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {((overviewStats.itemsWithStock / overviewStats.totalItems) * 100 || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pagamentos Processados</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        paymentAnalytics.byStatus.pago > paymentAnalytics.total * 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {((paymentAnalytics.byStatus.pago / paymentAnalytics.total) * 100 || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold mb-4">⚠️ Alertas & Atenção</h4>
                  <div className="space-y-2">
                    {overviewStats.zeroStockItems > 0 && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle size={16} />
                        <span className="text-sm">{overviewStats.zeroStockItems} itens sem estoque</span>
                      </div>
                    )}
                    {paymentAnalytics.byStatus.pendente > 0 && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Clock size={16} />
                        <span className="text-sm">{paymentAnalytics.byStatus.pendente} pagamentos pendentes</span>
                      </div>
                    )}
                    {inventoryAnalytics.lowStockItems.length > 0 && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <Package size={16} />
                        <span className="text-sm">{inventoryAnalytics.lowStockItems.length} itens com estoque baixo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'users' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">👥 Analytics de Usuários</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold mb-4">Distribuição por Função</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>👷 Trabalhadores</span>
                      <span className="font-medium">{userAnalytics.byRole.trabalhador}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>👑 Gerentes</span>
                      <span className="font-medium">{userAnalytics.byRole.gerente}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold mb-4">👑 Usuários Mais Ativos</h4>
                  <div className="space-y-2">
                    {activityAnalytics.byAuthor.slice(0, 5).map(([user, count]: any, index) => (
                      <div key={user} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{index + 1}.</span>
                          <span className="text-sm">{user}</span>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {count} atividades
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'inventory' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">📦 Analytics de Inventário</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold mb-4">🔝 Top Itens por Quantidade</h4>
                  <div className="space-y-2">
                    {inventoryAnalytics.topItems.slice(0, 5).map(([id, item]: any, index) => (
                      <div key={id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{index + 1}.</span>
                          <span className="text-sm">{item.nome}</span>
                        </div>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          {item.quantidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold mb-4">⚠️ Itens com Estoque Baixo</h4>
                  <div className="space-y-2">
                    {inventoryAnalytics.lowStockItems.slice(0, 5).map(([id, item]: any) => (
                      <div key={id} className="flex items-center justify-between">
                        <span className="text-sm">{item.nome}</span>
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                          {item.quantidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold mb-4">📊 Distribuição por Categoria</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(inventoryAnalytics.categoryDistribution).map(([category, quantity]: any) => (
                    <div key={category} className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-lg font-bold text-gray-900">{quantity}</div>
                      <div className="text-sm text-gray-600 capitalize">{category}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'payments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">💰 Analytics de Pagamentos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Pagamentos Realizados"
                  value={paymentAnalytics.byStatus.pago}
                  subtitle={`$${paymentAnalytics.totalValue.toFixed(2)}`}
                  icon={DollarSign}
                  color="green"
                />
                <MetricCard
                  title="Pagamentos Pendentes"
                  value={paymentAnalytics.byStatus.pendente}
                  subtitle={`$${paymentAnalytics.pendingValue.toFixed(2)}`}
                  icon={Clock}
                  color="yellow"
                />
                <MetricCard
                  title="Pagamentos Cancelados"
                  value={paymentAnalytics.byStatus.cancelado}
                  subtitle="Histórico completo"
                  icon={AlertTriangle}
                  color="red"
                />
              </div>

              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold mb-4">📋 Pagamentos Recentes</h4>
                <div className="space-y-2">
                  {paymentAnalytics.recentPayments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium text-sm">{payment.usuario_nome}</div>
                        <div className="text-xs text-gray-600">{payment.descricao}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${payment.valor.toFixed(2)}</div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          payment.status === 'pago' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'activity' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">⚡ Analytics de Atividades</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold mb-4">📈 Atividades por Tipo</h4>
                  <div className="space-y-2">
                    {Object.entries(activityAnalytics.byType).map(([type, count]: any) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type}</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold mb-4">🏷️ Atividades por Categoria</h4>
                  <div className="space-y-2">
                    {Object.entries(activityAnalytics.byCategory).map(([category, count]: any) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category}</span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold mb-4">📅 Timeline de Atividades</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(activityAnalytics.timeline).slice(-8).map(([date, count]: any) => (
                    <div key={date} className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-lg font-bold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-600">{new Date(date).toLocaleDateString('pt-BR')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}