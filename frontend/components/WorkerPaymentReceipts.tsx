'use client';

import { useState, useEffect } from 'react';
import { Receipt, DollarSign, Calendar, User, Package, Search, Filter } from 'lucide-react';

interface PlantTransaction {
  type: string;
  itemName: string;
  quantity: number;
  transactionId: string;
  timestamp: string;
}

interface AnimalTransaction {
  type: string;
  quantity: number;
  amount: number;
  transactionId: string;
  timestamp: string;
}

interface WorkerPaymentReceipt {
  sessionId: string;
  workerId: string;
  workerName: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  paidAt: string;
  plantTransactions: PlantTransaction[];
  animalTransactions: AnimalTransaction[];
}

export default function WorkerPaymentReceipts() {
  const [receipts, setReceipts] = useState<WorkerPaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<WorkerPaymentReceipt | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const response = await fetch('/api/worker-payment-receipts');
      if (response.ok) {
        const data = await response.json();
        setReceipts(data.receipts || []);
      }
    } catch (error) {
      console.error('Error loading worker payment receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    if (searchTerm === '') return true;
    return receipt.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           receipt.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           receipt.paidByName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateTotalPlants = (plantTransactions: PlantTransaction[]) => {
    return plantTransactions
      .filter(t => t.type === 'plant_deposited')
      .reduce((sum, t) => sum + t.quantity, 0);
  };

  const calculateTotalAnimals = (animalTransactions: AnimalTransaction[]) => {
    return animalTransactions
      .reduce((sum, t) => sum + t.quantity, 0);
  };

  const getPlantIcon = (plantTransactions: PlantTransaction[]) => {
    const depositedPlants = plantTransactions.filter(t => t.type === 'plant_deposited');
    if (depositedPlants.length === 0) return '🌾';

    // Find the most common plant type
    const plantCounts: { [key: string]: number } = {};
    depositedPlants.forEach(t => {
      const itemName = t.itemName.toLowerCase();
      plantCounts[itemName] = (plantCounts[itemName] || 0) + t.quantity;
    });

    const mostCommonPlant = Object.keys(plantCounts).reduce((a, b) =>
      plantCounts[a] > plantCounts[b] ? a : b
    );

    // Return specific icon based on plant type
    if (mostCommonPlant.includes('junco') || mostCommonPlant.includes('bulrush')) return '🫘';
    if (mostCommonPlant.includes('trigo') || mostCommonPlant.includes('wheat')) return '🌾';
    if (mostCommonPlant.includes('milho') || mostCommonPlant.includes('corn')) return '🌽';
    return '🌾'; // default
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Receipt className="h-6 w-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Worker Payment Receipts</h2>
          </div>
          <button
            onClick={loadReceipts}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by worker name, session ID, or paid by..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Receipts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.sessionId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {receipt.workerName}
                    </div>
                    <div className="text-sm text-gray-500 font-mono">
                      {receipt.sessionId.split('_')[2]}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {calculateTotalPlants(receipt.plantTransactions) > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {getPlantIcon(receipt.plantTransactions)} {calculateTotalPlants(receipt.plantTransactions)} plants
                        </span>
                      )}
                      {calculateTotalAnimals(receipt.animalTransactions) > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          🐄 {calculateTotalAnimals(receipt.animalTransactions)} animals
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(receipt.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {receipt.paidByName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(receipt.paidAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedReceipt(receipt)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReceipts.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payment receipts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'No worker payment receipts have been generated yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Payment Receipt - {selectedReceipt.workerName}
                </h3>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Receipt Header */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Worker</p>
                    <p className="font-medium text-gray-900">{selectedReceipt.workerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Session ID</p>
                    <p className="font-mono text-sm text-gray-900">{selectedReceipt.sessionId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Paid By</p>
                    <p className="font-medium text-gray-900">{selectedReceipt.paidByName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedReceipt.paidAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Total Amount Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedReceipt.amount)}
                  </p>
                </div>
              </div>

              {/* Plant Transactions */}
              {selectedReceipt.plantTransactions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    🌾 Plant Transactions ({selectedReceipt.plantTransactions.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedReceipt.plantTransactions.map((transaction, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'seed_taken'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {transaction.type === 'seed_taken' ? '🌱 Took Seeds' :
                              transaction.itemName.toLowerCase().includes('junco') || transaction.itemName.toLowerCase().includes('bulrush') ? '🫘 Deposited Junco' :
                              transaction.itemName.toLowerCase().includes('trigo') || transaction.itemName.toLowerCase().includes('wheat') ? '🌾 Deposited Wheat' :
                              transaction.itemName.toLowerCase().includes('milho') || transaction.itemName.toLowerCase().includes('corn') ? '🌽 Deposited Corn' :
                              '🌾 Deposited Plants'}
                          </span>
                          <span className="font-medium">{transaction.itemName}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{transaction.quantity}x</div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Animal Transactions */}
              {selectedReceipt.animalTransactions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    🐄 Animal Transactions ({selectedReceipt.animalTransactions.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedReceipt.animalTransactions.map((transaction, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            🚚 Delivery Completed
                          </span>
                          <span className="font-medium">Animal Delivery</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{transaction.quantity} animals</div>
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(transaction.amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}