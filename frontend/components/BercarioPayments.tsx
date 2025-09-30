'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Receipt, TrendingUp, Calendar, Filter } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface BercarioPaymentsProps {
  firm: FirmConfig;
}

interface PaymentRecord {
  id: string;
  clientName: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: Date;
  type: 'compra' | 'deposito' | 'venda';
}

export default function BercarioPayments({ firm }: BercarioPaymentsProps) {
  const [paymentData, setPaymentData] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        // Fetch messages for the firm's channel
        const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Process messages to extract payment data
          const payments: PaymentRecord[] = [];
          
          data.forEach((msg: any, index: number) => {
            // Process purchase transactions (compra)
            if (msg.tipo === 'compra' && msg.metadata?.comprador && msg.valor) {
              payments.push({
                id: `${msg.timestamp}-${index}`,
                clientName: msg.metadata.comprador,
                itemName: msg.metadata.item || 'Item desconhecido',
                quantity: parseInt(msg.metadata.quantidade) || 1,
                unitPrice: parseFloat(msg.valor) / (parseInt(msg.metadata.quantidade) || 1),
                totalAmount: parseFloat(msg.valor),
                date: new Date(msg.timestamp),
                type: 'compra'
              });
            }
            
            // Process other financial transactions (deposito, venda)
            if ((msg.tipo === 'deposito' || msg.tipo === 'venda') && msg.valor) {
              payments.push({
                id: `${msg.timestamp}-${index}`,
                clientName: msg.metadata?.usuario || 'Cliente desconhecido',
                itemName: msg.tipo === 'venda' ? (msg.metadata?.item || 'Venda') : 'Depósito',
                quantity: 1,
                unitPrice: parseFloat(msg.valor),
                totalAmount: parseFloat(msg.valor),
                date: new Date(msg.timestamp),
                type: msg.tipo as 'deposito' | 'venda'
              });
            }
          });
          
          // Sort by date (most recent first)
          payments.sort((a, b) => b.date.getTime() - a.date.getTime());
          
          setPaymentData(payments);
        }
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
    const interval = setInterval(fetchPaymentData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [firm.channelId]);

  // Filter payments based on selected time range
  const getFilteredPayments = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filter) {
      case 'today':
        return paymentData.filter(payment => payment.date >= today);
      case 'week':
        return paymentData.filter(payment => payment.date >= weekAgo);
      case 'month':
        return paymentData.filter(payment => payment.date >= monthAgo);
      default:
        return paymentData;
    }
  };

  const filteredPayments = getFilteredPayments();
  const totalRevenue = filteredPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
  const totalTransactions = filteredPayments.length;
  const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  const todayRevenue = paymentData
    .filter(payment => {
      const today = new Date();
      const paymentDate = new Date(payment.date);
      return paymentDate.toDateString() === today.toDateString();
    })
    .reduce((sum, payment) => sum + payment.totalAmount, 0);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'compra': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'venda': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'deposito': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'compra': return 'Compra';
      case 'venda': return 'Venda';
      case 'deposito': return 'Depósito';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">💰 Vendas e Pagamentos</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
            >
              <option value="all">Todos os períodos</option>
              <option value="today">Hoje</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
            </select>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400">
            Última atualização: {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-600">Receita Total</p>
              <p className="text-2xl font-bold text-green-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Receipt className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-600">Transações</p>
              <p className="text-2xl font-bold text-blue-900">{totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-purple-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-purple-900">${avgTransactionValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-orange-600">Hoje</p>
              <p className="text-2xl font-bold text-orange-900">${todayRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">Histórico de Vendas</h3>
        </div>
        
        <div className="overflow-x-auto">
          {filteredPayments.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Item/Serviço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Preço Unitário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white dark:text-white">
                        {payment.date.toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400">
                        {payment.date.toLocaleTimeString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{payment.clientName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white dark:text-white">{payment.itemName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white dark:text-white">{payment.quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white dark:text-white">${payment.unitPrice.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">${payment.totalAmount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(payment.type)}`}>
                        {getTypeLabel(payment.type)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white dark:text-white">Nenhuma venda registrada</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400">
                Quando as vendas começarem a ser realizadas, elas aparecerão aqui com detalhes itemizados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}