'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface PlayerSummary {
  playerName: string;
  totalEarnings: number;
  totalServices: number;
  animalServices: number;
  plantServices: number;
  lastService: string;
}

interface Receipt {
  receiptId: string;
  timestamp: string;
  playerName: string;
  serviceType: 'animal' | 'planta';
  quantity: number;
  animalType?: string;
  plantName?: string;
  playerPayment: number;
  status: string;
  approved: boolean;
  paid?: boolean;
  paidAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
}

interface OverviewData {
  totalPlayers: number;
  totalEarnings: number;
  totalServices: number;
  totalAnimalServices: number;
  totalPlantServices: number;
  players: PlayerSummary[];
}

export default function FarmServiceOverview() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [playerReceipts, setPlayerReceipts] = useState<{[key: string]: Receipt[]}>({});

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [overviewRes, receiptsRes] = await Promise.all([
        fetch('http://localhost:3050/api/farm-service-data/overview'),
        fetch('http://localhost:3050/api/farm-service-data/recent-receipts?limit=20')
      ]);

      if (!overviewRes.ok) throw new Error('Failed to fetch overview data');
      if (!receiptsRes.ok) throw new Error('Failed to fetch recent receipts');

      const overviewData = await overviewRes.json();
      const receiptsData = await receiptsRes.json();

      setOverview(overviewData);
      setRecentReceipts(receiptsData);
    } catch (error: any) {
      console.error('Error fetching farm service data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerReceipts = async (playerName: string) => {
    if (playerReceipts[playerName]) {
      // Already fetched, just toggle
      setExpandedPlayer(expandedPlayer === playerName ? null : playerName);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3050/api/farm-service-data/player/${encodeURIComponent(playerName)}/receipts`);
      if (!res.ok) throw new Error('Failed to fetch player receipts');
      
      const receipts = await res.json();
      setPlayerReceipts(prev => ({ ...prev, [playerName]: receipts }));
      setExpandedPlayer(playerName);
    } catch (error) {
      console.error('Error fetching player receipts:', error);
    }
  };

  const getStatusIcon = (receipt: Receipt) => {
    if (receipt.paid) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (receipt.approved) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    if (receipt.status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = (receipt: Receipt) => {
    if (receipt.paid) return 'Paid';
    if (receipt.approved) return 'Approved';
    if (receipt.status === 'REJECTED') return 'Rejected';
    return 'Pending';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading farm service data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-800">Connection Error: {error}</span>
        </div>
        <button 
          onClick={fetchData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Farm Service Overview</h2>
        <button
          onClick={fetchData}
          className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Players</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalPlayers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">${overview.totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Services</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalServices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Service Types</p>
                <p className="text-sm text-gray-900">
                  🐄 {overview.totalAnimalServices} | 🌾 {overview.totalPlantServices}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Players */}
        {overview && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Players</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {overview.players.slice(0, 10).map((player, index) => (
                  <div key={player.playerName}>
                    <div 
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => fetchPlayerReceipts(player.playerName)}
                    >
                      <div className="flex items-center">
                        {expandedPlayer === player.playerName ? 
                          <ChevronDown className="h-4 w-4 text-gray-400 mr-2" /> :
                          <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                        }
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 mr-3">#{index + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900">{player.playerName}</p>
                            <p className="text-sm text-gray-500">
                              {player.totalServices} services • Last: {formatDate(player.lastService)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${player.totalEarnings.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">
                          🐄 {player.animalServices} | 🌾 {player.plantServices}
                        </p>
                      </div>
                    </div>
                    
                    {/* Player Receipts */}
                    {expandedPlayer === player.playerName && playerReceipts[player.playerName] && (
                      <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                        {playerReceipts[player.playerName].slice(0, 5).map((receipt) => (
                          <div key={receipt.receiptId} className="flex items-center justify-between py-2">
                            <div className="flex items-center">
                              {getStatusIcon(receipt)}
                              <span className="ml-2 text-sm">
                                #{receipt.receiptId} - {receipt.serviceType === 'animal' ? '🐄' : '🌾'} 
                                {receipt.quantity} {receipt.animalType || receipt.plantName}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">${receipt.playerPayment.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">{getStatusText(receipt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentReceipts.map((receipt) => (
                <div key={receipt.receiptId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(receipt)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {receipt.playerName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {receipt.serviceType === 'animal' ? '🐄' : '🌾'} {receipt.quantity} {receipt.animalType || receipt.plantName}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(receipt.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${receipt.playerPayment.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">#{receipt.receiptId}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}