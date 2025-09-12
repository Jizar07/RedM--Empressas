'use client';

import React, { useState, useEffect } from 'react';
import { Package, DollarSign, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
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
  isBoxItem?: boolean;
  boxType?: 'verduras' | 'agro';
  isBoxRemoval?: boolean;
  isDeliveryCompletion?: boolean;
  deliveryCount?: number;
  channelId?: string;
}

interface WorkerBalance {
  name: string;
  boxesRemoved: number;
  expectedPayment: number;
  actualPayments: number;
  outstandingBalance: number;
  lastActivity: string;
  paymentAccuracy: 'overpaid' | 'correct' | 'underpaid';
}

interface SupplyChainAnalyticsProps {
  fazendaChannelId: string;
  ferroviaChannelId: string;
}

export default function SupplyChainAnalytics({ fazendaChannelId, ferroviaChannelId }: SupplyChainAnalyticsProps) {
  const [fazendaActivities, setFazendaActivities] = useState<Activity[]>([]);
  const [ferroviaActivities, setFerroviaActivities] = useState<Activity[]>([]);
  const [workerBalances, setWorkerBalances] = useState<WorkerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadSupplyChainData();
  }, [fazendaChannelId, ferroviaChannelId, timeRange]);

  const loadSupplyChainData = async () => {
    setLoading(true);
    try {
      // Load Fazenda activities (box removals)
      const fazendaResponse = await fetch(`/api/webhook/channel-messages?channelId=${fazendaChannelId}`);
      const fazendaData = await fazendaResponse.json();
      
      // Load Ferrovia activities (payments)
      const ferroviaResponse = await fetch(`/api/webhook/channel-messages?channelId=${ferroviaChannelId}`);
      const ferroviaData = await ferroviaResponse.json();
      
      if (fazendaData.success && ferroviaData.success) {
        setFazendaActivities(fazendaData.messages || []);
        setFerroviaActivities(ferroviaData.messages || []);
        calculateWorkerBalances(fazendaData.messages, ferroviaData.messages);
      }
    } catch (error) {
      console.error('Error loading supply chain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkerBalances = (fazendaMessages: Activity[], ferroviaMessages: Activity[]) => {
    const workerData: Record<string, {
      boxesRemoved: number;
      payments: number;
      lastActivity: string;
    }> = {};

    // Process Fazenda box removals ONLY - ignore all delivery completion reports
    fazendaMessages
      .filter(msg => msg.isBoxRemoval && msg.quantidade && msg.autor)
      .forEach(msg => {
        const worker = msg.autor;
        if (!workerData[worker]) {
          workerData[worker] = { boxesRemoved: 0, payments: 0, lastActivity: msg.timestamp };
        }
        workerData[worker].boxesRemoved += msg.quantidade!;
        if (msg.timestamp > workerData[worker].lastActivity) {
          workerData[worker].lastActivity = msg.timestamp;
        }
      });

    // Process Ferrovia WITHDRAWALS only (SACOU transactions) - use Recompensa for delivery tracking
    ferroviaMessages
      .filter(msg => msg.tipo === 'saque' && msg.valor && msg.autor)
      .forEach(msg => {
        const worker = msg.autor;
        if (!workerData[worker]) {
          workerData[worker] = { boxesRemoved: 0, payments: 0, lastActivity: msg.timestamp };
        }
        workerData[worker].payments += msg.valor!;
        if (msg.timestamp > workerData[worker].lastActivity) {
          workerData[worker].lastActivity = msg.timestamp;
        }
      });

    // Track Recompensa-based deliveries for correlation (not used in payment calculation)
    ferroviaMessages
      .filter(msg => msg.tipo === 'entrega' && msg.boxesDelivered && msg.autor)
      .forEach(msg => {
        const worker = msg.autor;
        if (!workerData[worker]) {
          workerData[worker] = { boxesRemoved: 0, payments: 0, lastActivity: msg.timestamp };
        }
        // Note: We don't use deliveries for payment calculation, only for tracking
        if (msg.timestamp > workerData[worker].lastActivity) {
          workerData[worker].lastActivity = msg.timestamp;
        }
      });

    // Calculate balances based PURELY on inventory boxes removed
    const balances: WorkerBalance[] = Object.entries(workerData).map(([name, data]) => {
      // Payment calculation: Every 250 boxes removed from inventory = $1000 payment due
      const expectedPayment = Math.floor(data.boxesRemoved / 250) * 1000;
      const outstandingBalance = expectedPayment - data.payments;
      
      let paymentAccuracy: 'overpaid' | 'correct' | 'underpaid' = 'correct';
      if (outstandingBalance > 100) paymentAccuracy = 'underpaid';
      else if (outstandingBalance < -100) paymentAccuracy = 'overpaid';

      return {
        name,
        boxesRemoved: data.boxesRemoved,
        expectedPayment,
        actualPayments: data.payments,
        outstandingBalance,
        lastActivity: data.lastActivity,
        paymentAccuracy
      };
    });

    // Sort by outstanding balance (highest first)
    balances.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
    setWorkerBalances(balances);
  };

  const getWorkerDetails = (workerName: string) => {
    const fazendaBoxes = fazendaActivities
      .filter(msg => msg.autor === workerName && msg.isBoxRemoval)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const ferroviaPayments = ferroviaActivities
      .filter(msg => msg.autor === workerName && msg.tipo === 'saque')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { fazendaBoxes, ferroviaPayments };
  };

  const totalBoxesRemoved = workerBalances.reduce((sum, worker) => sum + worker.boxesRemoved, 0);
  const totalExpectedPayments = workerBalances.reduce((sum, worker) => sum + worker.expectedPayment, 0);
  const totalActualPayments = workerBalances.reduce((sum, worker) => sum + worker.actualPayments, 0);
  const totalOutstanding = totalExpectedPayments - totalActualPayments;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Total Boxes Removed</p>
              <p className="text-2xl font-bold text-blue-600">{totalBoxesRemoved.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Expected Payments</p>
              <p className="text-2xl font-bold text-green-600">${totalExpectedPayments.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900">Actual Payments</p>
              <p className="text-2xl font-bold text-purple-600">${totalActualPayments.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          totalOutstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center">
            <AlertTriangle className={`h-8 w-8 ${
              totalOutstanding > 0 ? 'text-red-600' : 'text-gray-600'
            }`} />
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                totalOutstanding > 0 ? 'text-red-900' : 'text-gray-900'
              }`}>Outstanding Balance</p>
              <p className={`text-2xl font-bold ${
                totalOutstanding > 0 ? 'text-red-600' : 'text-gray-600'
              }`}>${totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Balance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Worker Payment Analysis</h3>
          <p className="text-sm text-gray-500">Based purely on boxes removed from Fazenda inventory (ignoring delivery reports)</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Boxes Removed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Payments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workerBalances.map((worker) => (
                <tr key={worker.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                    <div className="text-sm text-gray-500">
                      Last activity: {new Date(worker.lastActivity).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {worker.boxesRemoved.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${worker.expectedPayment.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${worker.actualPayments.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      worker.outstandingBalance > 0 ? 'text-red-600' : 
                      worker.outstandingBalance < 0 ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      ${worker.outstandingBalance.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      worker.paymentAccuracy === 'underpaid' ? 'bg-red-100 text-red-800' :
                      worker.paymentAccuracy === 'overpaid' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {worker.paymentAccuracy === 'underpaid' ? 'Underpaid' :
                       worker.paymentAccuracy === 'overpaid' ? 'Overpaid' : 'Correct'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => setSelectedWorker(selectedWorker === worker.name ? null : worker.name)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {selectedWorker === worker.name ? 'Hide Details' : 'View Details'}
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
              Detailed Activity for {selectedWorker}
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fazenda Box Removals */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">📦 Box Removals (Fazenda)</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getWorkerDetails(selectedWorker).fazendaBoxes.map((activity, index) => (
                    <div key={index} className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="text-sm">
                        <span className="font-medium">
                          {activity.quantidade}x {activity.item}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ferrovia Payments */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">💰 Payments (Ferrovia)</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getWorkerDetails(selectedWorker).ferroviaPayments.map((activity, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                      <div className="text-sm">
                        <span className="font-medium">
                          ${activity.valor?.toLocaleString()}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
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