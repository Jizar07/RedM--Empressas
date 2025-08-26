'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Receipt, Search, Filter, Calendar, User, TrendingUp, AlertCircle, Eye } from 'lucide-react';

interface Payment {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  valor: number;
  tipo: 'servico' | 'bonus' | 'ajuste' | 'desconto';
  descricao: string;
  data_pagamento: string;
  recibo_discord?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  autor?: string;
  metadados?: {
    servico_tipo?: string;
    quantidade?: number;
    valor_unitario?: number;
  };
}

interface PaymentsData {
  usuarios: Record<string, {
    pagamentos: Payment[];
    total_ganho: number;
    total_pendente: number;
    ultimo_pagamento?: string;
  }>;
  total_pagamentos: number;
  total_valor: number;
  ultima_atualizacao: string;
}

interface Props {
  pagamentos: PaymentsData;
  usuarios: any;
  onUpdatePagamentos: (pagamentos: PaymentsData) => void;
}

export default function PagamentosBWManagement({ pagamentos, usuarios, onUpdatePagamentos }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pendente' | 'pago' | 'cancelado'>('all');
  const [filterType, setFilterType] = useState<'all' | 'servico' | 'bonus' | 'ajuste' | 'desconto'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState<Payment | null>(null);
  
  const [newPayment, setNewPayment] = useState({
    usuario_id: '',
    valor: 0,
    tipo: 'servico' as 'servico' | 'bonus' | 'ajuste' | 'desconto',
    descricao: '',
    recibo_discord: ''
  });

  // Get all payments from all users
  const getAllPayments = (): Array<Payment & { usuario_nome: string }> => {
    const allPayments: Array<Payment & { usuario_nome: string }> = [];
    
    Object.entries(pagamentos.usuarios || {}).forEach(([userId, userData]) => {
      userData.pagamentos?.forEach(payment => {
        allPayments.push({
          ...payment,
          usuario_nome: usuarios.usuarios[userId]?.nome || userId
        });
      });
    });
    
    return allPayments.sort((a, b) => 
      new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime()
    );
  };

  // Filter payments
  const filteredPayments = getAllPayments().filter(payment => {
    const matchesSearch = payment.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.usuario_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesType = filterType === 'all' || payment.tipo === filterType;
    const matchesUser = !selectedUser || payment.usuario_id === selectedUser;
    
    return matchesSearch && matchesStatus && matchesType && matchesUser;
  });

  // Calculate statistics
  const stats = {
    totalPagamentos: getAllPayments().length,
    totalValor: getAllPayments().reduce((sum, p) => sum + (p.status === 'pago' ? p.valor : 0), 0),
    pendentes: getAllPayments().filter(p => p.status === 'pendente').length,
    valorPendente: getAllPayments().filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.valor, 0),
    usuariosComPagamentos: Object.keys(pagamentos.usuarios || {}).length,
    mediaValorPagamento: getAllPayments().length > 0 
      ? getAllPayments().reduce((sum, p) => sum + p.valor, 0) / getAllPayments().length 
      : 0
  };

  const handleAddPayment = () => {
    if (!newPayment.usuario_id || !newPayment.valor || !newPayment.descricao) return;

    const paymentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const payment: Payment = {
      id: paymentId,
      usuario_id: newPayment.usuario_id,
      usuario_nome: usuarios.usuarios[newPayment.usuario_id]?.nome || newPayment.usuario_id,
      valor: newPayment.valor,
      tipo: newPayment.tipo,
      descricao: newPayment.descricao,
      data_pagamento: timestamp,
      recibo_discord: newPayment.recibo_discord,
      status: 'pendente',
      autor: 'Admin'
    };

    const newPagamentos = { ...pagamentos };
    
    // Initialize user payments if doesn't exist
    if (!newPagamentos.usuarios[newPayment.usuario_id]) {
      newPagamentos.usuarios[newPayment.usuario_id] = {
        pagamentos: [],
        total_ganho: 0,
        total_pendente: 0
      };
    }

    // Add payment to user
    newPagamentos.usuarios[newPayment.usuario_id].pagamentos.push(payment);
    
    // Update user totals
    newPagamentos.usuarios[newPayment.usuario_id].total_pendente += newPayment.valor;
    
    // Update global stats
    newPagamentos.total_pagamentos = (newPagamentos.total_pagamentos || 0) + 1;
    newPagamentos.ultima_atualizacao = timestamp;

    onUpdatePagamentos(newPagamentos);
    setNewPayment({ usuario_id: '', valor: 0, tipo: 'servico', descricao: '', recibo_discord: '' });
    setIsAddingPayment(false);
    
    // Save to localStorage
    localStorage.setItem('fazenda_pagamentos', JSON.stringify(newPagamentos));
  };

  const handleUpdatePaymentStatus = (paymentId: string, newStatus: 'pendente' | 'pago' | 'cancelado') => {
    const newPagamentos = { ...pagamentos };
    let found = false;
    
    // Find and update payment
    Object.entries(newPagamentos.usuarios || {}).forEach(([userId, userData]) => {
      const paymentIndex = userData.pagamentos.findIndex(p => p.id === paymentId);
      if (paymentIndex !== -1) {
        const payment = userData.pagamentos[paymentIndex];
        const oldStatus = payment.status;
        
        // Update payment status
        userData.pagamentos[paymentIndex].status = newStatus;
        
        // Update user totals
        if (oldStatus === 'pendente') {
          userData.total_pendente -= payment.valor;
        } else if (oldStatus === 'pago') {
          userData.total_ganho -= payment.valor;
        }
        
        if (newStatus === 'pendente') {
          userData.total_pendente += payment.valor;
        } else if (newStatus === 'pago') {
          userData.total_ganho += payment.valor;
          userData.ultimo_pagamento = new Date().toISOString();
        }
        
        found = true;
      }
    });

    if (found) {
      newPagamentos.ultima_atualizacao = new Date().toISOString();
      onUpdatePagamentos(newPagamentos);
      
      // Save to localStorage
      localStorage.setItem('fazenda_pagamentos', JSON.stringify(newPagamentos));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'servico': return 'bg-blue-100 text-blue-800';
      case 'bonus': return 'bg-green-100 text-green-800';
      case 'ajuste': return 'bg-yellow-100 text-yellow-800';
      case 'desconto': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign size={28} />
          💰 Gestão de Pagamentos
        </h2>
        <button
          onClick={() => setIsAddingPayment(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Adicionar Pagamento
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Total Pagamentos</p>
              <p className="text-3xl font-bold">{stats.totalPagamentos}</p>
            </div>
            <Receipt className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Valor Total Pago</p>
              <p className="text-3xl font-bold">${stats.totalValor.toFixed(2)}</p>
            </div>
            <DollarSign className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Pagamentos Pendentes</p>
              <p className="text-3xl font-bold">{stats.pendentes}</p>
              <p className="text-sm text-white/70">${stats.valorPendente.toFixed(2)}</p>
            </div>
            <AlertCircle className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Usuários Ativos</p>
              <p className="text-3xl font-bold">{stats.usuariosComPagamentos}</p>
              <p className="text-sm text-white/70">Média: ${stats.mediaValorPagamento.toFixed(2)}</p>
            </div>
            <User className="text-white/80" size={24} />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por usuário ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">⏳ Pendente</option>
            <option value="pago">✅ Pago</option>
            <option value="cancelado">❌ Cancelado</option>
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value="servico">🔧 Serviço</option>
            <option value="bonus">🎁 Bônus</option>
            <option value="ajuste">⚖️ Ajuste</option>
            <option value="desconto">📉 Desconto</option>
          </select>

          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Usuários</option>
            {Object.entries(usuarios.usuarios || {}).map(([id, user]) => (
              <option key={id} value={id}>{user.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isAddingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Pagamento</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuário
                </label>
                <select
                  value={newPayment.usuario_id}
                  onChange={(e) => setNewPayment({ ...newPayment, usuario_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar usuário...</option>
                  {Object.entries(usuarios.usuarios || {}).map(([id, user]) => (
                    <option key={id} value={id}>{user.nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPayment.valor}
                  onChange={(e) => setNewPayment({ ...newPayment, valor: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={newPayment.tipo}
                  onChange={(e) => setNewPayment({ ...newPayment, tipo: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="servico">🔧 Serviço</option>
                  <option value="bonus">🎁 Bônus</option>
                  <option value="ajuste">⚖️ Ajuste</option>
                  <option value="desconto">📉 Desconto</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={newPayment.descricao}
                  onChange={(e) => setNewPayment({ ...newPayment, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descreva o motivo do pagamento..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recibo Discord (opcional)
                </label>
                <textarea
                  value={newPayment.recibo_discord}
                  onChange={(e) => setNewPayment({ ...newPayment, recibo_discord: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Cole aqui o recibo do Discord..."
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddPayment}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-md transition-colors"
              >
                Adicionar
              </button>
              <button
                onClick={() => setIsAddingPayment(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Recibo do Pagamento</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Usuário:</p>
                  <p className="text-sm text-gray-900">{showReceipt.usuario_nome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Valor:</p>
                  <p className="text-sm text-gray-900">${showReceipt.valor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Data:</p>
                  <p className="text-sm text-gray-900">
                    {new Date(showReceipt.data_pagamento).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status:</p>
                  <p className="text-sm text-gray-900">{showReceipt.status}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Descrição:</p>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{showReceipt.descricao}</p>
              </div>
              
              {showReceipt.recibo_discord && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Recibo Discord:</p>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap font-mono">
                    {showReceipt.recibo_discord}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowReceipt(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                          {payment.usuario_nome.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{payment.usuario_nome}</div>
                        <div className="text-sm text-gray-500">{payment.usuario_id}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${payment.valor.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">{payment.descricao}</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(payment.tipo)}`}>
                      {payment.tipo}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={payment.status}
                      onChange={(e) => handleUpdatePaymentStatus(payment.id, e.target.value as any)}
                      className={`text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(payment.status)}`}
                    >
                      <option value="pendente">⏳ Pendente</option>
                      <option value="pago">✅ Pago</option>
                      <option value="cancelado">❌ Cancelado</option>
                    </select>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(payment.data_pagamento).toLocaleDateString('pt-BR')}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowReceipt(payment)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Ver recibo"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum pagamento encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece adicionando um pagamento.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}