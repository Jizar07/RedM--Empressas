'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, DollarSign, User, FileText, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

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
  approvedBy?: string;
  rejectedBy?: string;
}

interface PlayerSummary {
  playerName: string;
  totalEarnings: number;
  totalServices: number;
  animalServices: number;
  plantServices: number;
  lastService: string;
}

export default function ServiceHistory() {
  const [searchPlayer, setSearchPlayer] = useState('');
  const [playerSummary, setPlayerSummary] = useState<PlayerSummary | null>(null);
  const [playerReceipts, setPlayerReceipts] = useState<Receipt[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerSummary[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadOverview();
    loadRecentReceipts();
  }, []);

  const loadOverview = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/farm-service-data/overview');
      if (!response.ok) throw new Error('Failed to fetch overview');
      
      const data = await response.json();
      setAllPlayers(data.players || []);
    } catch (error: any) {
      console.error('Error loading overview:', error);
    }
  };

  const loadRecentReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3050/api/farm-service-data/recent-receipts?limit=20');
      if (!response.ok) throw new Error('Failed to fetch recent receipts');
      
      const data = await response.json();
      setRecentReceipts(data);
    } catch (error: any) {
      console.error('Error loading recent receipts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchPlayerHistory = async () => {
    if (!searchPlayer) {
      setError('Please enter a player name');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Find player in the list
      const player = allPlayers.find(p => 
        p.playerName.toLowerCase().includes(searchPlayer.toLowerCase())
      );
      
      if (!player) {
        setError('Player not found');
        setPlayerSummary(null);
        setPlayerReceipts([]);
        return;
      }

      setPlayerSummary(player);
      
      // Fetch player receipts
      const response = await fetch(`http://localhost:3050/api/farm-service-data/player/${encodeURIComponent(player.playerName)}/receipts`);
      if (!response.ok) throw new Error('Failed to fetch player receipts');
      
      const receipts = await response.json();
      setPlayerReceipts(receipts);
      
    } catch (error: any) {
      console.error('Error searching player:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
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

  const getStatusIcon = (receipt: Receipt) => {
    if (receipt.paid) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (receipt.approved) return <Clock className="h-4 w-4 text-yellow-500" />;
    if (receipt.status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = (receipt: Receipt) => {
    if (receipt.paid) return 'Paid';
    if (receipt.approved) return 'Approved';
    if (receipt.status === 'REJECTED') return 'Rejected';
    return 'Pending';
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Player History</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchPlayer}
                onChange={(e) => setSearchPlayer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPlayerHistory()}
                placeholder="Enter player name (e.g., Jizar Stoffeliz)"
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {allPlayers.length > 0 && searchPlayer && (
              <div className="mt-2 text-sm text-gray-600">
                Suggestions: {allPlayers
                  .filter(p => p.playerName.toLowerCase().includes(searchPlayer.toLowerCase()))
                  .slice(0, 3)
                  .map(p => p.playerName)
                  .join(', ')}
              </div>
            )}
          </div>
          <button
            onClick={searchPlayerHistory}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
          >
            {loading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Search
              </>
            )}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Player Summary */}
      {playerSummary && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Player Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center text-gray-600 mb-1">
                <User className="h-4 w-4 mr-2" />
                <span className="text-sm">Player</span>
              </div>
              <p className="font-semibold text-gray-900">{playerSummary.playerName}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center text-green-600 mb-1">
                <DollarSign className="h-4 w-4 mr-2" />
                <span className="text-sm">Total Earnings</span>
              </div>
              <p className="font-semibold text-green-900">${playerSummary.totalEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center text-blue-600 mb-1">
                <FileText className="h-4 w-4 mr-2" />
                <span className="text-sm">Total Services</span>
              </div>
              <p className="font-semibold text-blue-900">{playerSummary.totalServices}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center text-yellow-600 mb-1">
                <span className="text-sm">🐄 Animals / 🌾 Plants</span>
              </div>
              <p className="font-semibold text-yellow-900">
                {playerSummary.animalServices} / {playerSummary.plantServices}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center text-purple-600 mb-1">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="text-sm">Last Service</span>
              </div>
              <p className="font-semibold text-purple-900 text-sm">{formatDate(playerSummary.lastService)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Player Receipts */}
      {playerReceipts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Service History ({playerReceipts.length} receipts)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {playerReceipts.map((receipt) => (
                  <tr key={receipt.receiptId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{receipt.receiptId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(receipt.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.serviceType === 'animal' ? '🐄 Animal' : '🌾 Plant'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.animalType || receipt.plantName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${receipt.playerPayment.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(receipt)}
                        <span className="ml-2 text-sm text-gray-600">{getStatusText(receipt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Global Activity */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Recent Global Activity</h3>
          <button
            onClick={loadRecentReceipts}
            className="text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {recentReceipts.map((receipt) => (
              <div key={receipt.receiptId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(receipt)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {receipt.playerName} - #{receipt.receiptId}
                    </p>
                    <p className="text-sm text-gray-500">
                      {receipt.serviceType === 'animal' ? '🐄' : '🌾'} {receipt.quantity} {receipt.animalType || receipt.plantName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">${receipt.playerPayment.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{formatDate(receipt.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}