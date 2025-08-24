'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Star, Edit3, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { KnownPlayer, SortField, SortDirection, Player } from '@/types';
import { knownPlayersStorage, serverApi } from '@/lib/api';

export default function KnownPlayersCard() {
  const [knownPlayers, setKnownPlayers] = useState<KnownPlayer[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOffline, setShowOffline] = useState(true);
  const [sortField, setSortField] = useState<SortField>('displayName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<KnownPlayer>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const loadData = async () => {
      // Load known players
      setKnownPlayers(knownPlayersStorage.getKnownPlayers());
      
      // Load online players
      try {
        const players = await serverApi.getPlayers();
        setOnlinePlayers(players);
      } catch (error) {
        console.error('Error fetching online players:', error);
      }
    };

    loadData();
    
    // Listen for storage changes
    const handleStorageChange = () => {
      setKnownPlayers(knownPlayersStorage.getKnownPlayers());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Set up periodic refresh to sync with player management changes
    const interval = setInterval(loadData, 30000); // Every 30 seconds
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [mounted]);

  // Merge known players with online status
  const playersWithStatus = useMemo(() => {
    return knownPlayers.map(player => {
      // Check if player is currently online
      const onlinePlayer = onlinePlayers.find(op => op.id === player.playerId);
      return {
        ...player,
        isOnline: !!onlinePlayer,
        ping: onlinePlayer?.ping || player.ping,
        lastSeen: player.lastLogin || 'Unknown',
      };
    });
  }, [knownPlayers, onlinePlayers]);

  // Apply filters and sorting
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = playersWithStatus;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.displayName?.toLowerCase().includes(search) ||
        player.name.toLowerCase().includes(search) ||
        player.job?.toLowerCase().includes(search) ||
        player.position?.toLowerCase().includes(search)
      );
    }

    // Apply offline filter
    if (!showOffline) {
      filtered = filtered.filter(player => player.isOnline);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'ping') {
        aValue = a.ping || 0;
        bValue = b.ping || 0;
      } else if (sortField === 'isOnline') {
        aValue = a.isOnline ? 1 : 0;
        bValue = b.isOnline ? 1 : 0;
      } else if (sortField === 'displayName') {
        aValue = a.displayName || a.name || '';
        bValue = b.displayName || b.name || '';
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [playersWithStatus, searchTerm, showOffline, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (player: KnownPlayer) => {
    setEditingPlayer(player.playerId);
    setEditForm(player);
  };

  const handleSave = () => {
    if (!editForm.playerId) return;

    const updatedPlayer: KnownPlayer = {
      ...editForm as KnownPlayer,
      lastLogin: new Date().toISOString(),
    };

    knownPlayersStorage.saveKnownPlayer(updatedPlayer);
    setKnownPlayers(knownPlayersStorage.getKnownPlayers());
    setEditingPlayer(null);
    setEditForm({});
  };

  const handleDelete = (playerId: number) => {
    if (confirm('Are you sure you want to remove this known player?')) {
      knownPlayersStorage.removeKnownPlayer(playerId);
      setKnownPlayers(knownPlayersStorage.getKnownPlayers());
    }
  };

  const getPingColor = (ping: number) => {
    if (ping < 50) return 'text-green-600 bg-green-100';
    if (ping < 100) return 'text-yellow-600 bg-yellow-100';
    if (ping < 200) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (!mounted) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Star className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900">Known People</h2>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
            {knownPlayers.length}
          </span>
        </div>
        <button
          onClick={() => setShowOffline(!showOffline)}
          className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            showOffline 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {showOffline ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span>Show Offline</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search known people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2">
                <button
                  onClick={() => handleSort('isOnline')}
                  className="flex items-center space-x-1 hover:text-blue-600 font-medium"
                >
                  <span>Status</span>
                  {sortField === 'isOnline' && (
                    sortDirection === 'asc' 
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-2">
                <button
                  onClick={() => handleSort('displayName')}
                  className="flex items-center space-x-1 hover:text-blue-600 font-medium"
                >
                  <span>Display Name</span>
                  {sortField === 'displayName' && (
                    sortDirection === 'asc' 
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-2">
                <button
                  onClick={() => handleSort('job')}
                  className="flex items-center space-x-1 hover:text-blue-600 font-medium"
                >
                  <span>Job</span>
                  {sortField === 'job' && (
                    sortDirection === 'asc' 
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-2 font-medium">Boot (ID)</th>
              <th className="text-left py-3 px-2 font-medium">Pombo</th>
              <th className="text-left py-3 px-2">
                <button
                  onClick={() => handleSort('lastLogin')}
                  className="flex items-center space-x-1 hover:text-blue-600 font-medium"
                >
                  <span>Last Login</span>
                  {sortField === 'lastLogin' && (
                    sortDirection === 'asc' 
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-2 font-medium">Last Logout</th>
              <th className="text-left py-3 px-2">
                <button
                  onClick={() => handleSort('ping')}
                  className="flex items-center space-x-1 hover:text-blue-600 font-medium"
                >
                  <span>Ping</span>
                  {sortField === 'ping' && (
                    sortDirection === 'asc' 
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPlayers.map((player) => (
              <tr key={player.playerId} className="border-b border-gray-100 hover:bg-gray-50">
                {editingPlayer === player.playerId ? (
                  <EditPlayerForm
                    player={player}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onSave={handleSave}
                    onCancel={() => {
                      setEditingPlayer(null);
                      setEditForm({});
                    }}
                  />
                ) : (
                <>
                {/* Status */}
                <td className="py-3 px-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${player.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm text-gray-600">
                      {player.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </td>

                {/* Display Name */}
                <td className="py-3 px-2">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{player.displayName || player.name}</span>
                  </div>
                </td>

                {/* Job */}
                <td className="py-3 px-2">
                  <span className="text-sm">{player.job || '-'}</span>
                </td>

                {/* Boot ID */}
                <td className="py-3 px-2">
                  <span className="font-mono text-sm">{player.bootId || '-'}</span>
                </td>

                {/* Pombo (Mail ID) */}
                <td className="py-3 px-2">
                  <span className="font-mono text-sm">{player.mailId || '-'}</span>
                </td>

                {/* Last Login */}
                <td className="py-3 px-2">
                  <span className="text-sm">{formatTimeAgo(player.lastLogin || '')}</span>
                </td>

                {/* Last Logout */}
                <td className="py-3 px-2">
                  <span className="text-sm">{formatTimeAgo(player.lastLogout || '')}</span>
                </td>

                {/* Ping */}
                <td className="py-3 px-2">
                  {player.isOnline && player.ping ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPingColor(player.ping)}`}>
                      {player.ping}ms
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3 px-2">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(player)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit player"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(player.playerId)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remove player"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {knownPlayers.length === 0 
              ? 'No known players yet. Add players from the player management section.'
              : 'No players found matching current filters.'
            }
          </div>
        )}
      </div>
    </div>
  );
}

// Edit Player Form Component
function EditPlayerForm({ 
  player, 
  editForm, 
  setEditForm, 
  onSave, 
  onCancel 
}: {
  player: any;
  editForm: Partial<KnownPlayer>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<KnownPlayer>>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <td colSpan={9} className="py-4 px-2">
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900">Edit Known Player</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              placeholder="Display Name"
              value={editForm.displayName || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job</label>
            <input
              type="text"
              placeholder="Job"
              value={editForm.job || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, job: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              type="text"
              placeholder="Position"
              value={editForm.position || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Boot ID</label>
            <input
              type="text"
              placeholder="Boot ID"
              value={editForm.bootId || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, bootId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mail ID (Pombo)</label>
            <input
              type="text"
              placeholder="Mail ID"
              value={editForm.mailId || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, mailId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            placeholder="Additional notes..."
            value={editForm.notes || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            rows={2}
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onSave}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <span>Save Changes</span>
          </button>
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
          >
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </td>
  );
}