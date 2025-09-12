'use client';

import React, { useState, useEffect } from 'react';
import { Users, Package, DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda' | 'compra' | 'entrega';
  categoria?: 'inventario' | 'financeiro' | 'sistema';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess?: boolean;
  displayText?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
  channelId?: string;
  deliveryCount?: number;
  boxesDelivered?: number;
  isBoxRemoval?: boolean;
  isBoxItem?: boolean;
  missao?: number;
}

interface WorkerStats {
  name: string;
  boxesRemovedFromInventory: number;
  boxesDeliveredViaFerry: number;
  workerPayments: number;
  ferroviaProfit: number;
  totalRevenue: number;
  efficiency: number; // delivered / removed
  lastActivity: string;
  status: 'efficient' | 'balanced' | 'inefficient';
}

interface FerroviaWorkersProps {
  firm: FirmConfig;
}

export default function FerroviaWorkers({ firm }: FerroviaWorkersProps) {
  const [fazendaActivities, setFazendaActivities] = useState<Activity[]>([]);
  const [ferroviaActivities, setFerroviaActivities] = useState<Activity[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

  // Fazenda channel for inventory data
  const fazendaChannelId = "1412325130926948362"; // Fazenda Cabra da Peste

  useEffect(() => {
    loadSupplyChainData();
  }, [firm.channelId]);

  const loadSupplyChainData = async () => {
    setLoading(true);
    try {
      // Load Fazenda activities (box removals from inventory)
      const fazendaResponse = await fetch(`/api/webhook/channel-messages?channelId=${fazendaChannelId}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      // Load Ferrovia activities (deliveries and payments)
      const ferroviaResponse = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (fazendaResponse.ok && ferroviaResponse.ok) {
        const fazendaData = await fazendaResponse.json();
        const ferroviaData = await ferroviaResponse.json();
        
        const fazendaMessages = fazendaData.messages || [];
        const ferroviaMessages = ferroviaData.messages || [];
        
        setFazendaActivities(fazendaMessages);
        setFerroviaActivities(ferroviaMessages);
        calculateWorkerStats(fazendaMessages, ferroviaMessages);
      }
    } catch (error) {
      console.error('Error loading supply chain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkerStats = (fazendaMessages: Activity[], ferroviaMessages: Activity[]) => {
    const workerData: Record<string, {
      boxesRemoved: number;
      boxesDelivered: number;
      payments: number;
      lastActivity: string;
    }> = {};

    // Process Fazenda box removals (inventory)
    fazendaMessages
      .filter(msg => msg.isBoxRemoval && msg.quantidade && msg.autor)
      .forEach(msg => {
        const worker = msg.autor;
        if (!workerData[worker]) {
          workerData[worker] = { boxesRemoved: 0, boxesDelivered: 0, payments: 0, lastActivity: msg.timestamp };
        }
        workerData[worker].boxesRemoved += msg.quantidade!;
        if (msg.timestamp > workerData[worker].lastActivity) {
          workerData[worker].lastActivity = msg.timestamp;
        }
      });

    // Process Ferrovia deliveries
    ferroviaMessages
      .filter(msg => msg.tipo === 'entrega' && msg.boxesDelivered && msg.autor)
      .forEach(msg => {
        const worker = msg.autor;
        if (!workerData[worker]) {
          workerData[worker] = { boxesRemoved: 0, boxesDelivered: 0, payments: 0, lastActivity: msg.timestamp };
        }
        workerData[worker].boxesDelivered += msg.boxesDelivered!;
        if (msg.timestamp > workerData[worker].lastActivity) {
          workerData[worker].lastActivity = msg.timestamp;
        }
      });

    // Process Ferrovia withdrawals (worker payments)
    ferroviaMessages
      .filter(msg => msg.tipo === 'saque' && msg.valor && msg.autor)
      .forEach(msg => {
        const worker = msg.autor;
        if (!workerData[worker]) {
          workerData[worker] = { boxesRemoved: 0, boxesDelivered: 0, payments: 0, lastActivity: msg.timestamp };
        }
        workerData[worker].payments += msg.valor!;
        if (msg.timestamp > workerData[worker].lastActivity) {
          workerData[worker].lastActivity = msg.timestamp;
        }
      });

    // Calculate stats for each worker
    const stats: WorkerStats[] = Object.entries(workerData).map(([name, data]) => {
      const totalRevenue = data.boxesDelivered * 4; // $4 per box delivered
      const workerPayments = data.payments; // Actual withdrawals
      const ferroviaProfit = totalRevenue - workerPayments; // Company keeps the difference
      const efficiency = data.boxesRemoved > 0 ? (data.boxesDelivered / data.boxesRemoved) * 100 : 0;
      
      let status: 'efficient' | 'balanced' | 'inefficient' = 'balanced';
      if (efficiency > 90) status = 'efficient';
      else if (efficiency < 70) status = 'inefficient';

      return {
        name,
        boxesRemovedFromInventory: data.boxesRemoved,
        boxesDeliveredViaFerry: data.boxesDelivered,
        workerPayments,
        ferroviaProfit,
        totalRevenue,
        efficiency,
        lastActivity: data.lastActivity,
        status
      };
    });

    // Sort by total revenue (highest first)
    stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
    setWorkerStats(stats);
  };

  const getWorkerDetails = (workerName: string) => {
    const inventoryRemovals = fazendaActivities
      .filter(msg => msg.autor === workerName && msg.isBoxRemoval)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const deliveries = ferroviaActivities
      .filter(msg => msg.autor === workerName && msg.tipo === 'entrega')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const payments = ferroviaActivities
      .filter(msg => msg.autor === workerName && msg.tipo === 'saque')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { inventoryRemovals, deliveries, payments };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'efficient': return 'text-green-600 bg-green-100';
      case 'inefficient': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'efficient': return <CheckCircle className="h-4 w-4" />;
      case 'inefficient': return <AlertTriangle className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalBoxesRemoved = workerStats.reduce((sum, worker) => sum + worker.boxesRemovedFromInventory, 0);
  const totalBoxesDelivered = workerStats.reduce((sum, worker) => sum + worker.boxesDeliveredViaFerry, 0);
  const totalWorkerPayments = workerStats.reduce((sum, worker) => sum + worker.workerPayments, 0);
  const totalFerroviaProfit = workerStats.reduce((sum, worker) => sum + worker.ferroviaProfit, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Caixas Removidas</p>
              <p className="text-2xl font-bold text-blue-600">{totalBoxesRemoved.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Caixas Entregues</p>
              <p className="text-2xl font-bold text-green-600">{totalBoxesDelivered.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900">Pagamentos Trabalhadores</p>
              <p className="text-2xl font-bold text-purple-600">${totalWorkerPayments.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-900">Lucro Ferrovia</p>
              <p className="text-2xl font-bold text-yellow-600">${totalFerroviaProfit.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Stats Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Análise de Trabalhadores da Cadeia de Suprimentos</h3>
          <p className="text-sm text-gray-500">Comparação entre remoção de inventário, entregas e pagamentos</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trabalhador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caixas Removidas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caixas Entregues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento Trabalhador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lucro Ferrovia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eficiência
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workerStats.map((worker) => (
                <tr key={worker.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                    <div className="text-sm text-gray-500">
                      Última atividade: {new Date(worker.lastActivity).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 font-medium">
                    {worker.boxesRemovedFromInventory.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-900 font-medium">
                    {worker.boxesDeliveredViaFerry.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-900 font-medium">
                    ${worker.workerPayments.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-900 font-medium">
                    ${worker.ferroviaProfit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {worker.efficiency.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(worker.status)}`}>
                      {getStatusIcon(worker.status)}
                      <span className="ml-1 capitalize">{worker.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => setSelectedWorker(selectedWorker === worker.name ? null : worker.name)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {selectedWorker === worker.name ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker Details Modal */}
      {selectedWorker && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Atividade Detalhada - {selectedWorker}
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inventory Removals */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">📦 Remoções do Inventário</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getWorkerDetails(selectedWorker).inventoryRemovals.map((activity, index) => (
                    <div key={index} className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="text-sm">
                        <span className="font-medium">
                          {activity.quantidade}x {activity.item}
                        </span>
                        <div className="text-gray-500 text-xs mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deliveries */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">🚂 Entregas Realizadas</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getWorkerDetails(selectedWorker).deliveries.map((activity, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                      <div className="text-sm">
                        <span className="font-medium">
                          Missão #{activity.missao}: {activity.boxesDelivered} caixas
                        </span>
                        <div className="text-gray-500 text-xs mt-1">
                          ${activity.valor?.toFixed(2)} - {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">💰 Saques Realizados</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getWorkerDetails(selectedWorker).payments.map((activity, index) => (
                    <div key={index} className="bg-purple-50 p-3 rounded border border-purple-200">
                      <div className="text-sm">
                        <span className="font-medium">
                          ${activity.valor?.toFixed(2)}
                        </span>
                        <div className="text-gray-500 text-xs mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}