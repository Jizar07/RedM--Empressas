'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface OrderStats {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  rejected: number;
  topFirms: { firmName: string; count: number }[];
  topSuppliers: { supplierName: string; count: number }[];
  topItems: { itemName: string; count: number; totalQuantity: number }[];
}

interface RecentOrder {
  orderId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  customerName: string;
  supplierName: string;
  firmName: string;
  itemName: string;
  itemQuantity: number;
  createdAt: string;
}

export default function OrdersDashboard() {
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
    topFirms: [],
    topSuppliers: [],
    topItems: []
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentOrders();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/orders/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching orders stats:', error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/orders?limit=10');
      if (response.ok) {
        const data = await response.json();
        setRecentOrders(data.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      accepted: 'text-blue-600 bg-blue-100',
      in_progress: 'text-purple-600 bg-purple-100',
      completed: 'text-green-600 bg-green-100',
      cancelled: 'text-gray-600 bg-gray-100',
      rejected: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getStatusText = (status: string): string => {
    const texts = {
      pending: 'Pendente',
      accepted: 'Aceita',
      in_progress: 'Em Andamento',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      rejected: 'Rejeitada'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-3 w-3" />,
      accepted: <CheckCircle className="h-3 w-3" />,
      in_progress: <AlertCircle className="h-3 w-3" />,
      completed: <CheckCircle className="h-3 w-3" />,
      cancelled: <XCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />
    };
    return icons[status as keyof typeof icons];
  };

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0';
  const activeOrders = stats.pending + stats.accepted + stats.inProgress;
  const resolvedOrders = stats.completed + stats.cancelled + stats.rejected;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Encomendas</h1>
            <p className="text-gray-600">Visão geral do sistema de encomendas</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Atualizado agora
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Encomendas</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {activeOrders} ativas • {resolvedOrders} resolvidas
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Aguardando resposta
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Concluídas</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Taxa de conclusão: {completionRate}%
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Andamento</p>
              <p className="text-3xl font-bold text-purple-600">{stats.inProgress + stats.accepted}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Aceitas + Em progresso
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pendentes</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.pending / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.accepted}</div>
            <div className="text-sm text-gray-600">Aceitas</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.accepted / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">Em Progresso</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.inProgress / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Concluídas</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
            <div className="text-sm text-gray-600">Canceladas</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-gray-500 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.cancelled / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rejeitadas</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.rejected / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Encomendas Recentes</h3>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.orderId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span>{getStatusText(order.status)}</span>
                  </span>
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {order.customerName} → {order.supplierName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.itemQuantity}x {order.itemName} • {order.firmName}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Nenhuma encomenda encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Stats */}
        <div className="space-y-6">
          {/* Top Firms */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Firmas Mais Ativas</h3>
            <div className="space-y-3">
              {stats.topFirms.length > 0 ? stats.topFirms.map((firm, index) => (
                <div key={firm.firmName} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-indigo-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{firm.firmName}</div>
                      <div className="text-xs text-gray-500">{firm.count} encomendas</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{firm.count}</div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">Nenhuma firma ativa</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Items */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Itens Mais Solicitados</h3>
            <div className="space-y-3">
              {stats.topItems.length > 0 ? stats.topItems.slice(0, 5).map((item, index) => (
                <div key={item.itemName} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{item.itemName}</div>
                      <div className="text-xs text-gray-500">{item.count} pedidos</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{item.totalQuantity}</div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">Nenhum item solicitado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Suppliers */}
      {stats.topSuppliers.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fornecedores Mais Ativos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topSuppliers.map((supplier, index) => (
              <div key={supplier.supplierName} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{supplier.supplierName}</div>
                    <div className="text-xs text-gray-500">Encomendas concluídas</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-600">{supplier.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}