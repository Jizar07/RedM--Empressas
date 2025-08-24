'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, DollarSign, User, FileText } from 'lucide-react';

interface Receipt {
  receiptId: string;
  timestamp: string;
  playerName: string;
  serviceType: 'animal' | 'plant';
  quantity: number;
  animalType?: string;
  plantName?: string;
  farmIncome?: number;
  farmCost: number;
  farmProfit: number;
  playerPayment: number;
  penalty?: number;
  playerDebt?: number;
  status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL' | 'VERIFIED';
  screenshotPath: string;
}

interface PlayerSummary {
  playerName: string;
  totalEarnings: number;
  totalServices: number;
  animalServices: number;
  plantServices: number;
  lastService: string;
}

interface PlayerData {
  summary: PlayerSummary;
  receipts: Receipt[];
}

export default function ServiceHistory() {
  const [searchPlayer, setSearchPlayer] = useState('');
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load recent receipts on component mount
  useEffect(() => {
    loadRecentReceipts();
  }, []);

  const loadRecentReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/service-submissions/recent');
      const data = await response.json();
      
      if (data.success) {
        setRecentReceipts(data.receipts);
      } else {
        setError('Erro ao carregar recibos recentes');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const searchPlayerHistory = async () => {
    if (!searchPlayer.trim()) {
      setError('Digite o nome do jogador');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/service-submissions/player/${encodeURIComponent(searchPlayer.trim())}`);
      const data = await response.json();
      
      if (data.success) {
        setPlayerData(data);
      } else {
        setError(data.error || 'Jogador não encontrado');
        setPlayerData(null);
      }
    } catch (err) {
      setError('Erro de conexão');
      setPlayerData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return 'bg-green-100 text-green-800';
      case 'SUBOPTIMAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'VERIFIED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return 'Ótimo';
      case 'SUBOPTIMAL':
        return 'Subótimo';
      case 'CRITICAL':
        return 'Crítico';
      case 'VERIFIED':
        return 'Verificado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Buscar Histórico do Jogador
        </h2>
        
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Digite o nome do jogador..."
            value={searchPlayer}
            onChange={(e) => setSearchPlayer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchPlayerHistory()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={searchPlayerHistory} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Player Summary */}
      {playerData && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Resumo - {playerData.summary.playerName}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                ${playerData.summary.totalEarnings.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Total Ganhos</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {playerData.summary.totalServices}
              </p>
              <p className="text-sm text-gray-600">Total Serviços</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-orange-600 mx-auto mb-2">🐄</div>
              <p className="text-2xl font-bold text-orange-600">
                {playerData.summary.animalServices}
              </p>
              <p className="text-sm text-gray-600">Serviços Animais</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-green-600 mx-auto mb-2">🌾</div>
              <p className="text-2xl font-bold text-green-600">
                {playerData.summary.plantServices}
              </p>
              <p className="text-sm text-gray-600">Serviços Plantas</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <Calendar className="h-4 w-4 inline mr-1" />
            Último serviço: {formatDate(playerData.summary.lastService)}
          </div>
        </div>
      )}

      {/* Receipts List */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {playerData ? `Histórico de ${playerData.summary.playerName}` : 'Recibos Recentes'}
        </h2>
        
        <div className="space-y-4">
          {(playerData ? playerData.receipts : recentReceipts).length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {playerData ? 'Nenhum serviço encontrado para este jogador' : 'Nenhum recibo encontrado'}
            </p>
          ) : (
            (playerData ? playerData.receipts : recentReceipts).map((receipt) => (
              <div
                key={receipt.receiptId}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">#{receipt.receiptId}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                        {getStatusText(receipt.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {receipt.playerName} • {formatDate(receipt.timestamp)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">
                      ${receipt.playerPayment.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">Pagamento</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Serviço:</span>
                    <p className="font-medium">
                      {receipt.serviceType === 'animal' ? 'Entrega de Animais' : 'Depósito de Plantas'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tipo/Quantidade:</span>
                    <p className="font-medium">
                      {receipt.serviceType === 'animal' 
                        ? `${receipt.quantity} ${receipt.animalType}`
                        : `${receipt.quantity} ${receipt.plantName}`
                      }
                    </p>
                  </div>
                  {receipt.serviceType === 'animal' && (
                    <div>
                      <span className="text-gray-500">Renda da Fazenda:</span>
                      <p className="font-medium">${receipt.farmIncome?.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className="font-medium">{getStatusText(receipt.status)}</p>
                  </div>
                </div>

                {(receipt.penalty && receipt.penalty > 0) && (
                  <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Penalidade: -${receipt.penalty.toFixed(2)} (animais com idade inferior a 50)
                    </p>
                  </div>
                )}

                {(receipt.playerDebt && receipt.playerDebt > 0) && (
                  <div className="mt-3 p-2 bg-red-50 border-l-4 border-red-400">
                    <p className="text-sm text-red-800">
                      ❌ Dívida do Jogador: ${receipt.playerDebt.toFixed(2)} devido à fazenda
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}