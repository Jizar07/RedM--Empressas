'use client';

import React, { useState, useEffect } from 'react';
import { Package, DollarSign, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface SupplyChainSession {
  sessionId: string;
  workerId: string;
  workerName: string;
  role: 'manager' | 'worker';
  status: 'active' | 'completed' | 'overdue';
  startTime: string;
  lastActivity: string;
  openResponsibilities: {
    boxesTaken: number;
    moneyOwed: number;
    dueDate: string;
    startDate: string;
  };
  totalBoxesProcessed: number;
  totalRevenueGenerated: number;
  totalRevenueReturned: number;
}

interface SupplyChainAnalytics {
  totalActiveSessions: number;
  totalBoxesInTransit: number;
  totalMoneyOwed: number;
  overdueSessions: number;
  completedSessions: number;
  averageCompletionTime: number;
}

interface SupplyChainAnalyticsProps {
  // No props needed - component will fetch data from API
}

export default function SupplyChainAnalytics({}: SupplyChainAnalyticsProps) {
  const [sessions, setSessions] = useState<SupplyChainSession[]>([]);
  const [analytics, setAnalytics] = useState<SupplyChainAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSupplyChainData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadSupplyChainData, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadSupplyChainData = async () => {
    setLoading(true);
    try {
      // Load sessions and analytics from our new API
      const [sessionsResponse, analyticsResponse] = await Promise.all([
        fetch('/api/supply-chain/sessions', {
          headers: {
            'x-bot-token': process.env.NEXT_PUBLIC_BOT_TOKEN || 'development-token'
          }
        }),
        fetch('/api/supply-chain/analytics', {
          headers: {
            'x-bot-token': process.env.NEXT_PUBLIC_BOT_TOKEN || 'development-token'
          }
        })
      ]);
      
      const sessionsData = await sessionsResponse.json();
      const analyticsData = await analyticsResponse.json();
      
      if (sessionsData.success && analyticsData.success) {
        setSessions(sessionsData.sessions || []);
        setAnalytics(analyticsData.analytics);
      } else {
        console.error('Error loading supply chain data:', sessionsData, analyticsData);
      }
    } catch (error) {
      console.error('Error loading supply chain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkerSession = (workerName: string): SupplyChainSession | undefined => {
    return sessions.find(session => session.workerName === workerName);
  };

  const getSortedSessions = () => {
    // Sort by outstanding money owed (highest first), then by boxes taken
    return [...sessions].sort((a, b) => {
      if (b.openResponsibilities.moneyOwed !== a.openResponsibilities.moneyOwed) {
        return b.openResponsibilities.moneyOwed - a.openResponsibilities.moneyOwed;
      }
      return b.openResponsibilities.boxesTaken - a.openResponsibilities.boxesTaken;
    });
  };

  const getWorkerStatusColor = (session: SupplyChainSession) => {
    if (session.status === 'overdue') return 'text-red-600';
    if (session.status === 'completed') return 'text-green-600';
    return 'text-yellow-600';
  };

  const getPaymentAccuracy = (session: SupplyChainSession): 'overpaid' | 'correct' | 'underpaid' => {
    const outstanding = session.openResponsibilities.moneyOwed;
    if (outstanding > 100) return 'underpaid';
    if (outstanding < -100) return 'overpaid';
    return 'correct';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🔗 Supply Chain Analytics</h2>
          <p className="text-sm text-gray-500">Real-time Ferrovia supply chain monitoring and accountability</p>
        </div>
        <button
          onClick={loadSupplyChainData}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Boxes in Transit</p>
              <p className="text-2xl font-bold text-blue-600">{analytics?.totalBoxesInTransit.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Active Sessions</p>
              <p className="text-2xl font-bold text-green-600">{analytics?.totalActiveSessions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900">Revenue Generated</p>
              <p className="text-2xl font-bold text-purple-600">
                ${sessions.reduce((sum, s) => sum + s.totalRevenueGenerated, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          (analytics?.totalMoneyOwed || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center">
            <AlertTriangle className={`h-8 w-8 ${
              (analytics?.totalMoneyOwed || 0) > 0 ? 'text-red-600' : 'text-gray-600'
            }`} />
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                (analytics?.totalMoneyOwed || 0) > 0 ? 'text-red-900' : 'text-gray-900'
              }`}>Money Owed</p>
              <p className={`text-2xl font-bold ${
                (analytics?.totalMoneyOwed || 0) > 0 ? 'text-red-600' : 'text-gray-600'
              }`}>${analytics?.totalMoneyOwed.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-900">Overdue Sessions</p>
              <p className="text-xl font-bold text-yellow-600">{analytics?.overdueSessions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-teal-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-teal-900">Revenue Returned</p>
              <p className="text-xl font-bold text-teal-600">
                ${sessions.reduce((sum, s) => sum + s.totalRevenueReturned, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-indigo-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-indigo-900">Completion Rate</p>
              <p className="text-xl font-bold text-indigo-600">
                {sessions.length > 0 
                  ? Math.round((sessions.reduce((sum, s) => sum + s.totalRevenueReturned, 0) / 
                      sessions.reduce((sum, s) => sum + s.totalRevenueGenerated, 0)) * 100) || 0
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Sessions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Supply Chain Worker Sessions</h3>
          <p className="text-sm text-gray-500">Real-time accountability tracking for Ferrovia supply chain operations</p>
        </div>
        
        {sessions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Sessions</h3>
            <p className="mt-1 text-sm text-gray-500">No supply chain sessions are currently active.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boxes Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Processed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Money Owed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedSessions().map((session) => (
                  <tr key={session.sessionId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{session.workerName}</div>
                      <div className="text-sm text-gray-500">
                        Last activity: {new Date(session.lastActivity).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        session.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {session.role.charAt(0).toUpperCase() + session.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.openResponsibilities.boxesTaken.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.totalBoxesProcessed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getWorkerStatusColor(session)}`}>
                        ${session.openResponsibilities.moneyOwed.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        session.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.openResponsibilities.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setSelectedWorker(selectedWorker === session.workerName ? null : session.workerName)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {selectedWorker === session.workerName ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Worker Details Modal */}
      {selectedWorker && (() => {
        const session = getWorkerSession(selectedWorker);
        if (!session) return null;

        return (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Session Details: {selectedWorker}
              </h3>
              <p className="text-sm text-gray-500">Session ID: {session.sessionId}</p>
            </div>
            
            <div className="p-6">
              {/* Session Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900">Session Info</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">Role: <span className="font-medium">{session.role}</span></p>
                    <p className="text-sm text-gray-600">Status: <span className="font-medium">{session.status}</span></p>
                    <p className="text-sm text-gray-600">Started: {new Date(session.startTime).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900">Box Tracking</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">Boxes Taken: <span className="font-medium">{session.openResponsibilities.boxesTaken}</span></p>
                    <p className="text-sm text-gray-600">Total Processed: <span className="font-medium">{session.totalBoxesProcessed}</span></p>
                    <p className="text-sm text-gray-600">Due Date: {new Date(session.openResponsibilities.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900">Revenue Tracking</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">Generated: <span className="font-medium">${session.totalRevenueGenerated.toLocaleString()}</span></p>
                    <p className="text-sm text-gray-600">Returned: <span className="font-medium">${session.totalRevenueReturned.toLocaleString()}</span></p>
                    <p className="text-sm text-gray-600">Owed: <span className="font-medium">${session.openResponsibilities.moneyOwed.toLocaleString()}</span></p>
                  </div>
                </div>
              </div>

              {/* Revenue Distribution Info */}
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <h4 className="text-sm font-medium text-yellow-900">Revenue Distribution ({session.role})</h4>
                <div className="mt-2">
                  {session.role === 'manager' ? (
                    <p className="text-sm text-yellow-700">Manager Split: 50% to farm, 50% to worker ($2 per box)</p>
                  ) : (
                    <p className="text-sm text-yellow-700">Worker Split: 75% to farm, 25% to worker ($1 per box)</p>
                  )}
                </div>
              </div>

              {/* Transaction History */}
              {session.transactions && session.transactions.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">🔄 Recent Transactions</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {session.transactions
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 10)
                      .map((transaction, index) => (
                        <div key={transaction.transactionId || index} className="bg-gray-50 p-3 rounded border">
                          <div className="flex items-start justify-between">
                            <div className="text-sm">
                              <span className="font-medium">
                                {transaction.type.replace(/_/g, ' ').toLowerCase()}
                              </span>
                              <div className="text-gray-600 mt-1">
                                {transaction.itemName && (
                                  <span>{transaction.quantity}x {transaction.itemName}</span>
                                )}
                                {transaction.amount && (
                                  <span className="ml-2">${transaction.amount.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(transaction.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}