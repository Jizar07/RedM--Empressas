'use client';

import { useState, useEffect } from 'react';
import { Package2, Eye, CheckCircle, XCircle, Clock, AlertCircle, Filter, Search, Download } from 'lucide-react';

type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';

interface Order {
  orderId: string;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  customerDiscordTag: string;
  supplierId: string;
  supplierName: string;
  supplierDiscordTag: string;
  firmId: string;
  firmName: string;
  itemName: string;
  itemQuantity: number;
  message: string;
  notes?: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface Firm {
  id: string;
  name: string;
  active: boolean;
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    firmId: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchFirms();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.firmId) params.append('firmId', filters.firmId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`http://localhost:3050/api/orders?${params.toString()}`);
      if (response.ok) {
        let fetchedOrders = await response.json();
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          fetchedOrders = fetchedOrders.filter((order: Order) =>
            order.orderId.toLowerCase().includes(searchLower) ||
            order.customerName.toLowerCase().includes(searchLower) ||
            order.supplierName.toLowerCase().includes(searchLower) ||
            order.itemName.toLowerCase().includes(searchLower) ||
            order.firmName.toLowerCase().includes(searchLower)
          );
        }
        
        setOrders(fetchedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirms = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/orders/config');
      if (response.ok) {
        const config = await response.json();
        setFirms(config.firms || []);
      }
    } catch (error) {
      console.error('Error fetching firms:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, userId: string, reason?: string) => {
    try {
      const response = await fetch(`http://localhost:3050/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, userId, reason })
      });

      if (response.ok) {
        fetchOrders(); // Refresh the orders list
        alert('Status da encomenda atualizado com sucesso!');
      } else {
        const error = await response.json();
        alert(`Erro ao atualizar status: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Erro ao atualizar status da encomenda');
    }
  };

  const exportOrders = () => {
    const csv = [
      ['ID da Encomenda', 'Status', 'Cliente', 'Fornecedor', 'Firma', 'Item', 'Quantidade', 'Data de Criação'],
      ...orders.map(order => [
        order.orderId,
        getStatusText(order.status),
        order.customerName,
        order.supplierName,
        order.firmName,
        order.itemName,
        order.itemQuantity.toString(),
        new Date(order.createdAt).toLocaleDateString('pt-BR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `encomendas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: OrderStatus): string => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      accepted: 'text-blue-600 bg-blue-100',
      in_progress: 'text-purple-600 bg-purple-100',
      completed: 'text-green-600 bg-green-100',
      cancelled: 'text-gray-600 bg-gray-100',
      rejected: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusText = (status: OrderStatus): string => {
    const texts = {
      pending: 'Pendente',
      accepted: 'Aceita',
      in_progress: 'Em Andamento',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      rejected: 'Rejeitada'
    };
    return texts[status] || status;
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      accepted: <CheckCircle className="h-4 w-4" />,
      in_progress: <AlertCircle className="h-4 w-4" />,
      completed: <CheckCircle className="h-4 w-4" />,
      cancelled: <XCircle className="h-4 w-4" />,
      rejected: <XCircle className="h-4 w-4" />
    };
    return icons[status];
  };

  const filteredOrdersCount = orders.length;
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<OrderStatus, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando encomendas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Package2 className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gerenciamento de Encomendas</h2>
          </div>
          <button
            onClick={exportOrders}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar CSV</span>
          </button>
        </div>

        {/* Status Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900">{filteredOrdersCount}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</div>
            <div className="text-sm text-yellow-600">Pendentes</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.accepted || 0}</div>
            <div className="text-sm text-blue-600">Aceitas</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.in_progress || 0}</div>
            <div className="text-sm text-purple-600">Em Andamento</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed || 0}</div>
            <div className="text-sm text-green-600">Concluídas</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{(statusCounts.cancelled || 0) + (statusCounts.rejected || 0)}</div>
            <div className="text-sm text-red-600">Canceladas/Rejeitadas</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="accepted">Aceita</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
              <option value="rejected">Rejeitada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
            <select
              value={filters.firmId}
              onChange={(e) => setFilters({ ...filters, firmId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as Firmas</option>
              {firms.filter(f => f.active).map(firm => (
                <option key={firm.id} value={firm.id}>{firm.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="ID, cliente, fornecedor..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID da Encomenda</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-mono text-sm text-gray-900">{order.orderId}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{getStatusText(order.status)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerDiscordTag}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.supplierName}</div>
                    <div className="text-sm text-gray-500">{order.supplierDiscordTag}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.firmName}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.itemName}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.itemQuantity}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
                    <div className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleTimeString('pt-BR')}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderDetails(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-2"
                      title="Ver Detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma encomenda encontrada com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes da Encomenda</h3>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID da Encomenda</label>
                  <div className="font-mono text-sm text-gray-900">{selectedOrder.orderId}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusIcon(selectedOrder.status)}
                    <span>{getStatusText(selectedOrder.status)}</span>
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cliente</label>
                  <div className="text-sm text-gray-900">{selectedOrder.customerName}</div>
                  <div className="text-sm text-gray-500">{selectedOrder.customerDiscordTag}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fornecedor</label>
                  <div className="text-sm text-gray-900">{selectedOrder.supplierName}</div>
                  <div className="text-sm text-gray-500">{selectedOrder.supplierDiscordTag}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Firma</label>
                  <div className="text-sm text-gray-900">{selectedOrder.firmName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item</label>
                  <div className="text-sm text-gray-900">{selectedOrder.itemName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantidade</label>
                  <div className="text-sm text-gray-900">{selectedOrder.itemQuantity}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Criação</label>
                  <div className="text-sm text-gray-900">
                    {new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <div className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">{selectedOrder.notes}</div>
                </div>
              )}

              {selectedOrder.rejectionReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Motivo da Rejeição</label>
                  <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">{selectedOrder.rejectionReason}</div>
                </div>
              )}

              {/* Status History */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Histórico</label>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                    <span className="font-medium">Criada:</span> {new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}
                  </div>
                  {selectedOrder.acceptedAt && (
                    <div className="text-sm text-blue-600 p-2 bg-blue-50 rounded">
                      <span className="font-medium">Aceita:</span> {new Date(selectedOrder.acceptedAt).toLocaleString('pt-BR')}
                    </div>
                  )}
                  {selectedOrder.completedAt && (
                    <div className="text-sm text-green-600 p-2 bg-green-50 rounded">
                      <span className="font-medium">Concluída:</span> {new Date(selectedOrder.completedAt).toLocaleString('pt-BR')}
                    </div>
                  )}
                  {selectedOrder.cancelledAt && (
                    <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                      <span className="font-medium">Cancelada:</span> {new Date(selectedOrder.cancelledAt).toLocaleString('pt-BR')}
                    </div>
                  )}
                  {selectedOrder.rejectedAt && (
                    <div className="text-sm text-red-600 p-2 bg-red-50 rounded">
                      <span className="font-medium">Rejeitada:</span> {new Date(selectedOrder.rejectedAt).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowOrderDetails(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}