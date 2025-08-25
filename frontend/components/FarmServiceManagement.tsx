'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  User
} from 'lucide-react';

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

type SortField = 'receiptId' | 'timestamp' | 'playerName' | 'serviceType' | 'quantity' | 'playerPayment' | 'status';
type SortOrder = 'asc' | 'desc';

export default function FarmServiceManagement() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Edit modal
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    paid: 0,
    pending: 0,
    rejected: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    fetchReceipts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [receipts, searchTerm, statusFilter, serviceTypeFilter, playerFilter, dateRange, sortField, sortOrder]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        sortBy: sortField,
        sortOrder: sortOrder
      });
      
      const response = await fetch(`http://localhost:3050/api/farm-service-data/receipts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch receipts');
      
      const data = await response.json();
      setReceipts(data);
      
      // Calculate stats
      const newStats = {
        total: data.length,
        approved: data.filter((r: Receipt) => r.approved && !r.paid).length,
        paid: data.filter((r: Receipt) => r.paid).length,
        pending: data.filter((r: Receipt) => r.status === 'PENDING_APPROVAL').length,
        rejected: data.filter((r: Receipt) => r.status === 'REJECTED').length,
        totalEarnings: data.reduce((sum: number, r: Receipt) => sum + (r.paid ? r.playerPayment : 0), 0)
      };
      setStats(newStats);
      
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...receipts];
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.receiptId.toLowerCase().includes(search) ||
        r.playerName.toLowerCase().includes(search) ||
        r.animalType?.toLowerCase().includes(search) ||
        r.plantName?.toLowerCase().includes(search)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => {
        switch (statusFilter) {
          case 'paid': return r.paid;
          case 'approved': return r.approved && !r.paid;
          case 'pending': return r.status === 'PENDING_APPROVAL';
          case 'rejected': return r.status === 'REJECTED';
          default: return true;
        }
      });
    }
    
    // Service type filter
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.serviceType === serviceTypeFilter);
    }
    
    // Player filter
    if (playerFilter !== 'all') {
      filtered = filtered.filter(r => r.playerName === playerFilter);
    }
    
    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(r => new Date(r.timestamp) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(r => new Date(r.timestamp) <= new Date(dateRange.end));
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortField) {
        case 'receiptId':
          compareValue = a.receiptId.localeCompare(b.receiptId);
          break;
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'playerName':
          compareValue = a.playerName.localeCompare(b.playerName);
          break;
        case 'serviceType':
          compareValue = a.serviceType.localeCompare(b.serviceType);
          break;
        case 'quantity':
          compareValue = a.quantity - b.quantity;
          break;
        case 'playerPayment':
          compareValue = a.playerPayment - b.playerPayment;
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'desc' ? -compareValue : compareValue;
    });
    
    setFilteredReceipts(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingReceipt) return;
    
    try {
      const response = await fetch(`http://localhost:3050/api/farm-service-data/receipt/${editingReceipt.receiptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReceipt)
      });
      
      if (!response.ok) throw new Error('Failed to update receipt');
      
      await fetchReceipts();
      setShowEditModal(false);
      setEditingReceipt(null);
    } catch (error) {
      console.error('Error updating receipt:', error);
      alert('Failed to update receipt');
    }
  };

  const handleDelete = async (receiptId: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;
    
    try {
      const response = await fetch(`http://localhost:3050/api/farm-service-data/receipt/${receiptId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete receipt');
      
      await fetchReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt');
    }
  };

  const getStatusIcon = (receipt: Receipt) => {
    if (receipt.paid) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (receipt.approved) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    if (receipt.status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (receipt: Receipt) => {
    let color = 'bg-gray-100 text-gray-800';
    let text = 'Pending';
    
    if (receipt.paid) {
      color = 'bg-green-100 text-green-800';
      text = 'Paid';
    } else if (receipt.approved) {
      color = 'bg-yellow-100 text-yellow-800';
      text = 'Approved';
    } else if (receipt.status === 'REJECTED') {
      color = 'bg-red-100 text-red-800';
      text = 'Rejected';
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {text}
      </span>
    );
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

  const exportToCSV = () => {
    const headers = ['Receipt ID', 'Date', 'Player', 'Service Type', 'Item', 'Quantity', 'Payment', 'Status'];
    const rows = filteredReceipts.map(r => [
      r.receiptId,
      formatDate(r.timestamp),
      r.playerName,
      r.serviceType,
      r.animalType || r.plantName || '',
      r.quantity,
      r.playerPayment.toFixed(2),
      r.paid ? 'Paid' : r.approved ? 'Approved' : r.status === 'REJECTED' ? 'Rejected' : 'Pending'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farm-receipts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Get unique players for filter
  const uniquePlayers = Array.from(new Set(receipts.map(r => r.playerName))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading receipts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Farm Service Management</h2>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={fetchReceipts}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-600">Total</p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-600">Pending</p>
            <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded">
            <p className="text-xs text-yellow-600">Approved</p>
            <p className="text-xl font-bold text-yellow-900">{stats.approved}</p>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <p className="text-xs text-green-600">Paid</p>
            <p className="text-xl font-bold text-green-900">{stats.paid}</p>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <p className="text-xs text-red-600">Rejected</p>
            <p className="text-xl font-bold text-red-900">{stats.rejected}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-xs text-blue-600">Total Paid</p>
            <p className="text-xl font-bold text-blue-900">${stats.totalEarnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Receipt, player, item..."
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="animal">Animal</option>
              <option value="planta">Plant</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Player</label>
            <select
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
              className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Players</option>
              {uniquePlayers.map(player => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('receiptId')}
                >
                  <div className="flex items-center">
                    Receipt ID
                    {sortField === 'receiptId' && (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center">
                    Date
                    {sortField === 'timestamp' && (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('playerName')}
                >
                  <div className="flex items-center">
                    Player
                    {sortField === 'playerName' && (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('serviceType')}
                >
                  <div className="flex items-center">
                    Type
                    {sortField === 'serviceType' && (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center">
                    Qty
                    {sortField === 'quantity' && (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('playerPayment')}
                >
                  <div className="flex items-center">
                    Payment
                    {sortField === 'playerPayment' && (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {sortField === 'status' && (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.receiptId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{receipt.receiptId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(receipt.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {receipt.playerName}
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
                    {getStatusBadge(receipt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(receipt)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(receipt.receiptId)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredReceipts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No receipts found matching your filters
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Receipt #{editingReceipt.receiptId}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                <input
                  type="text"
                  value={editingReceipt.playerName}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, playerName: e.target.value })}
                  className="px-3 py-2 w-full border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={editingReceipt.quantity}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, quantity: parseInt(e.target.value) })}
                  className="px-3 py-2 w-full border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingReceipt.playerPayment}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, playerPayment: parseFloat(e.target.value) })}
                  className="px-3 py-2 w-full border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingReceipt.status}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, status: e.target.value })}
                  className="px-3 py-2 w-full border border-gray-300 rounded-lg"
                >
                  <option value="PENDING_APPROVAL">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingReceipt.paid || false}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, paid: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label className="text-sm font-medium text-gray-700">Paid</label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}