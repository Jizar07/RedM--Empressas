'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight, Server, Plus, Edit, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { useServer } from '@/contexts/ServerContext';
import socketClient from '@/lib/socket';

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

interface Order {
  orderId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  customerName: string;
  customerId: string;
  supplierNames: string[];
  supplierIds: string[];
  acceptedBySupplierId?: string;
  firmName: string;
  firmId: string;
  itemName: string;
  itemQuantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Firm {
  id: string;
  name: string;
  supplierUserIds: string[];
  active: boolean;
}

interface OrdersConfig {
  firms: Firm[];
}

export default function OrdersDashboard() {
  const { selectedServerId, selectedServerName } = useServer();
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
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [config, setConfig] = useState<OrdersConfig | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [formFirmId, setFormFirmId] = useState('');
  const [formSupplierIds, setFormSupplierIds] = useState<string[]>([]);
  const [formItemName, setFormItemName] = useState('');
  const [formItemQuantity, setFormItemQuantity] = useState(1);
  const [formNotes, setFormNotes] = useState('');
  const [formRejectionReason, setFormRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Discord users for selected firm
  const [availableSuppliers, setAvailableSuppliers] = useState<Array<{id: string; username: string; displayName: string}>>([]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!selectedServerId) return;

    const socket = socketClient.connect();
    socketClient.subscribeToOrders(selectedServerId);

    // Listen for real-time events
    socket.on('order:created', ({ serverId, order }: { serverId: string; order: Order }) => {
      if (serverId === selectedServerId) {
        console.log('📦 Real-time: Order created', order.orderId);
        setRecentOrders(prev => [order, ...prev].slice(0, 10));
        fetchStats(); // Refresh stats
        showToast('Nova encomenda recebida', 'success');
      }
    });

    socket.on('order:updated', ({ serverId, order }: { serverId: string; order: Order }) => {
      if (serverId === selectedServerId) {
        console.log('📦 Real-time: Order updated', order.orderId);
        setRecentOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
        showToast('Encomenda atualizada', 'success');
      }
    });

    socket.on('order:deleted', ({ serverId, order }: { serverId: string; order: Order }) => {
      if (serverId === selectedServerId) {
        console.log('📦 Real-time: Order deleted', order.orderId);
        setRecentOrders(prev => prev.filter(o => o.orderId !== order.orderId));
        fetchStats(); // Refresh stats
        showToast('Encomenda removida', 'success');
      }
    });

    socket.on('order:status_changed', ({ serverId, order }: { serverId: string; order: Order }) => {
      if (serverId === selectedServerId) {
        console.log('📦 Real-time: Order status changed', order.orderId, order.status);
        setRecentOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
        fetchStats(); // Refresh stats
        showToast(`Status atualizado: ${getStatusText(order.status)}`, 'success');
      }
    });

    return () => {
      socketClient.unsubscribeFromOrders(selectedServerId);
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('order:deleted');
      socket.off('order:status_changed');
    };
  }, [selectedServerId]);

  useEffect(() => {
    if (selectedServerId) {
      setLoading(true);
      fetchStats();
      fetchRecentOrders();
      fetchConfig();
    }
  }, [selectedServerId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch Discord users when firm is selected
  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!formFirmId || !config || !selectedServerId) return;

      try {
        const firm = config.firms.find(f => f.id === formFirmId);
        if (!firm || !firm.supplierUserIds || firm.supplierUserIds.length === 0) {
          setAvailableSuppliers([]);
          return;
        }

        // Fetch all Discord users
        const response = await fetch(`http://localhost:3050/api/orders/discord/users?serverId=${selectedServerId}`);
        if (response.ok) {
          const allUsers = await response.json();

          // Filter to only users in this firm's supplierUserIds
          const firmSuppliers = allUsers
            .filter((user: any) => firm.supplierUserIds.includes(user.id))
            .map((user: any) => ({
              id: user.id,
              username: user.username,
              displayName: user.displayName
            }));

          setAvailableSuppliers(firmSuppliers);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setAvailableSuppliers([]);
      }
    };

    fetchSuppliers();
  }, [formFirmId, config, selectedServerId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`http://localhost:3050/api/orders/config?serverId=${selectedServerId}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching orders config:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`http://localhost:3050/api/orders/stats?serverId=${selectedServerId}`);
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
      const response = await fetch(`http://localhost:3050/api/orders?serverId=${selectedServerId}&limit=10`);
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !formFirmId || formSupplierIds.length === 0) return;

    setSubmitting(true);
    try {
      const firm = config.firms.find(f => f.id === formFirmId);
      if (!firm) throw new Error('Firma não encontrada');

      // Map selected supplier IDs to their names and tags
      const selectedSuppliers = formSupplierIds.map(id => {
        const supplier = availableSuppliers.find(s => s.id === id);
        return {
          id,
          name: supplier?.displayName || 'Unknown',
          tag: `${supplier?.username}#0000` || 'unknown#0000'
        };
      });

      const response = await fetch(`http://localhost:3050/api/orders?serverId=${selectedServerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'FRONTEND_USER', // TODO: Get from session
          customerName: 'Frontend User',
          customerDiscordTag: 'frontend#0000',
          supplierIds: selectedSuppliers.map(s => s.id),
          supplierNames: selectedSuppliers.map(s => s.name),
          supplierDiscordTags: selectedSuppliers.map(s => s.tag),
          firmId: formFirmId,
          firmName: firm.name,
          itemName: formItemName,
          itemQuantity: formItemQuantity,
          notes: formNotes || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar encomenda');
      }

      showToast('Encomenda criada com sucesso', 'success');
      setShowCreateModal(false);
      resetForm();
      fetchRecentOrders();
      fetchStats();
    } catch (error: any) {
      showToast(error.message || 'Erro ao criar encomenda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3050/api/orders/${selectedOrder.orderId}?serverId=${selectedServerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: formItemName,
          itemQuantity: formItemQuantity,
          notes: formNotes || undefined
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar encomenda');

      showToast('Encomenda atualizada com sucesso', 'success');
      setShowEditModal(false);
      resetForm();
      fetchRecentOrders();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar encomenda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3050/api/orders/${selectedOrder.orderId}?serverId=${selectedServerId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Erro ao deletar encomenda');

      showToast('Encomenda removida com sucesso', 'success');
      setShowDeleteModal(false);
      setSelectedOrder(null);
      fetchRecentOrders();
      fetchStats();
    } catch (error: any) {
      showToast(error.message || 'Erro ao deletar encomenda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3050/api/orders/${orderId}/status?serverId=${selectedServerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          userId: 'FRONTEND_USER', // TODO: Get from session
          reason: status === 'rejected' ? formRejectionReason : undefined
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      showToast('Status atualizado com sucesso', 'success');
      if (status === 'rejected') {
        setShowRejectModal(false);
        setFormRejectionReason('');
      }
      fetchRecentOrders();
      fetchStats();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (order: Order) => {
    setSelectedOrder(order);
    setFormItemName(order.itemName);
    setFormItemQuantity(order.itemQuantity);
    setFormNotes(order.notes || '');
    setShowEditModal(true);
  };

  const openDeleteModal = (order: Order) => {
    setSelectedOrder(order);
    setShowDeleteModal(true);
  };

  const openRejectModal = (order: Order) => {
    setSelectedOrder(order);
    setShowRejectModal(true);
  };

  const resetForm = () => {
    setFormFirmId('');
    setFormSupplierIds([]);
    setFormItemName('');
    setFormItemQuantity(1);
    setFormNotes('');
    setSelectedOrder(null);
    setAvailableSuppliers([]);
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
      accepted: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
      in_progress: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
      completed: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
      cancelled: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700',
      rejected: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
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

  if (!selectedServerId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Server className="h-20 w-20 text-gray-400" />
        <div className="text-gray-600 dark:text-gray-300 text-xl font-semibold">Selecione um servidor</div>
        <div className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Escolha um servidor Discord no menu acima para visualizar o dashboard de encomendas
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de Encomendas</h1>
            <p className="text-gray-600 dark:text-gray-300">Visão geral do sistema de encomendas</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nova Encomenda</span>
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de Encomendas</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {activeOrders} ativas • {resolvedOrders} resolvidas
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pendentes</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400 dark:text-yellow-500" />
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Aguardando resposta
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Concluídas</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400 dark:text-green-500" />
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Taxa de conclusão: {completionRate}%
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Em Andamento</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.inProgress + stats.accepted}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400 dark:text-purple-500" />
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Aceitas + Em progresso
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribuição por Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Pendentes</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-yellow-500 dark:bg-yellow-400 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.pending / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.accepted}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Aceitas</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.accepted / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.inProgress}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Em Progresso</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-purple-500 dark:bg-purple-400 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.inProgress / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Concluídas</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.cancelled}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Canceladas</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-gray-500 dark:bg-gray-400 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.cancelled / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Rejeitadas</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-red-500 dark:bg-red-400 h-2 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.rejected / stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders with Actions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Encomendas Recentes</h3>
            <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-3">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.orderId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{getStatusText(order.status)}</span>
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {order.customerName} → {order.supplierNames.join(', ')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {order.itemQuantity}x {order.itemName} • {order.firmName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    {/* Status Action Buttons */}
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'accepted')}
                          className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                          title="Aceitar"
                          disabled={submitting}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openRejectModal(order)}
                          className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Rejeitar"
                          disabled={submitting}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {order.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(order.orderId, 'in_progress')}
                        className="p-1.5 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-xs font-medium"
                        title="Marcar como Pronto"
                        disabled={submitting}
                      >
                        📦
                      </button>
                    )}
                    {order.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateStatus(order.orderId, 'completed')}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                        title="Marcar como Concluído"
                        disabled={submitting}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    {/* Edit/Delete Buttons - Always show for all orders */}
                    {(order.status === 'pending' || order.status === 'accepted' || order.status === 'in_progress') && (
                      <button
                        onClick={() => openEditModal(order)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {/* Delete button shows for ALL orders */}
                    <button
                      onClick={() => openDeleteModal(order)}
                      className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p>Nenhuma encomenda encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Stats */}
        <div className="space-y-6">
          {/* Top Firms */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Firmas Mais Ativas</h3>
            <div className="space-y-3">
              {stats.topFirms.length > 0 ? stats.topFirms.map((firm, index) => (
                <div key={firm.firmName} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-300">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{firm.firmName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{firm.count} encomendas</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{firm.count}</div>
                </div>
              )) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  <p className="text-sm">Nenhuma firma ativa</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Items */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Itens Mais Solicitados</h3>
            <div className="space-y-3">
              {stats.topItems.length > 0 ? stats.topItems.slice(0, 5).map((item, index) => (
                <div key={item.itemName} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600 dark:text-green-300">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{item.itemName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.count} pedidos</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{item.totalQuantity}</div>
                </div>
              )) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fornecedores Mais Ativos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topSuppliers.map((supplier, index) => (
              <div key={supplier.supplierName} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-300">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{supplier.supplierName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Encomendas concluídas</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{supplier.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nova Encomenda</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Firma
                </label>
                <select
                  value={formFirmId}
                  onChange={(e) => {
                    setFormFirmId(e.target.value);
                    setFormSupplierIds([]); // Clear selected suppliers when firm changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Selecione uma firma</option>
                  {config?.firms.filter(f => f.active).map(firm => (
                    <option key={firm.id} value={firm.id}>{firm.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fornecedores ({formSupplierIds.length} selecionado{formSupplierIds.length !== 1 ? 's' : ''})
                  </label>
                  {availableSuppliers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formSupplierIds.length === availableSuppliers.length) {
                          setFormSupplierIds([]);
                        } else {
                          setFormSupplierIds(availableSuppliers.map(s => s.id));
                        }
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {formSupplierIds.length === availableSuppliers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                  )}
                </div>
                <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
                  {!formFirmId ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Selecione uma firma primeiro</p>
                  ) : availableSuppliers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum fornecedor disponível</p>
                  ) : (
                    <div className="space-y-2">
                      {availableSuppliers.map(supplier => (
                        <label key={supplier.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formSupplierIds.includes(supplier.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormSupplierIds([...formSupplierIds, supplier.id]);
                              } else {
                                setFormSupplierIds(formSupplierIds.filter(id => id !== supplier.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {supplier.displayName} <span className="text-gray-500 dark:text-gray-400">(@{supplier.username})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item
                </label>
                <input
                  type="text"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={formItemQuantity}
                  onChange={(e) => setFormItemQuantity(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting || formSupplierIds.length === 0}
                  className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Criando...' : 'Criar Encomenda'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Editar Encomenda</h2>
            <form onSubmit={handleEditOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item
                </label>
                <input
                  type="text"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={formItemQuantity}
                  onChange={(e) => setFormItemQuantity(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn btn-primary"
                >
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Deletar Encomenda</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tem certeza que deseja deletar esta encomenda? Esta ação não pode ser desfeita.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded mb-6">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p><strong>ID:</strong> {selectedOrder.orderId}</p>
                <p><strong>Item:</strong> {selectedOrder.itemQuantity}x {selectedOrder.itemName}</p>
                <p><strong>Cliente:</strong> {selectedOrder.customerName}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteOrder}
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                {submitting ? 'Deletando...' : 'Deletar'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedOrder(null); }}
                className="flex-1 btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Rejeitar Encomenda</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Por favor, informe o motivo da rejeição:
            </p>
            <textarea
              value={formRejectionReason}
              onChange={(e) => setFormRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-4"
              rows={4}
              placeholder="Ex: Item fora de estoque, preço muito alto..."
              required
              minLength={5}
              maxLength={500}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => handleUpdateStatus(selectedOrder.orderId, 'rejected')}
                disabled={submitting || !formRejectionReason || formRejectionReason.length < 5}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {submitting ? 'Rejeitando...' : 'Rejeitar'}
              </button>
              <button
                onClick={() => { setShowRejectModal(false); setFormRejectionReason(''); setSelectedOrder(null); }}
                className="flex-1 btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
