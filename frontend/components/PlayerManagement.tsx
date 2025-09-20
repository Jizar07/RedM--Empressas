'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, UserPlus, Edit3, Save, X, Trash2, Crown, UserX, ChevronUp, ChevronDown } from 'lucide-react';
import { Player, KnownPlayer, SortField, SortDirection, PlayerFilter } from '@/types';
import { serverApi, knownPlayersStorage } from '@/lib/api';

export default function PlayerManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [knownPlayers, setKnownPlayers] = useState<KnownPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<KnownPlayer>>({});
  const [mounted, setMounted] = useState(false);

  // Sorting and filtering state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filters, setFilters] = useState<PlayerFilter>({
    search: '',
    onlineOnly: true,
    knownOnly: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchPlayers = async () => {
      try {
        const data = await serverApi.getPlayers();
        setPlayers(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch player list');
        console.error('Error fetching players:', err);
      } finally {
        setLoading(false);
      }
    };

    const loadKnownPlayers = () => {
      setKnownPlayers(knownPlayersStorage.getKnownPlayers());
    };

    fetchPlayers();
    loadKnownPlayers();
    
    const interval = setInterval(fetchPlayers, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [mounted]);

  // Merge online players with known player data
  const mergedPlayers = useMemo(() => {
    if (!mounted) return [];
    return players.map(player => {
      const knownData = knownPlayers.find(kp => kp.playerName === player.name);
      return {
        ...player,
        displayName: knownData?.displayName,
        bootId: player.id, // Current boot ID from live data
        mailId: knownData?.mailId,
        lastLogin: knownData?.lastLogin,
        lastLogout: knownData?.lastLogout,
        isKnown: !!knownData,
        notes: knownData?.notes,
      };
    });
  }, [players, knownPlayers, mounted]);

  // Apply filters and sorting
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = mergedPlayers;

    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(search) ||
        player.displayName?.toLowerCase().includes(search)
      );
    }

    if (filters.knownOnly) {
      filtered = filtered.filter(player => player.isKnown);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = (a as any)[sortField];
      let bValue: any = (b as any)[sortField];

      if (sortField === 'ping') {
        aValue = a.ping || 0;
        bValue = b.ping || 0;
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
  }, [mergedPlayers, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditPlayer = (player: Player & { isKnown?: boolean }) => {
    const knownData = knownPlayers.find(kp => kp.playerName === player.name);
    setEditingPlayer(player.name);
    setEditForm({
      playerName: player.name,
      displayName: knownData?.displayName || '',
      bootId: player.id.toString(), // Current boot ID
      mailId: knownData?.mailId || '',
      ping: player.ping,
      isKnown: true,
      notes: knownData?.notes || '',
    });
  };

  const handleSavePlayer = () => {
    if (!editForm.playerName) return;

    const knownPlayer: KnownPlayer = {
      playerName: editForm.playerName,
      displayName: editForm.displayName,
      bootId: editForm.bootId,
      mailId: editForm.mailId,
      lastLogin: new Date().toISOString(),
      ping: editForm.ping || 0,
      isKnown: true,
      notes: editForm.notes,
    };

    knownPlayersStorage.saveKnownPlayer(knownPlayer);
    setKnownPlayers(knownPlayersStorage.getKnownPlayers());
    setEditingPlayer(null);
    setEditForm({});
  };

  const handleRemoveKnownPlayer = (playerName: string) => {
    knownPlayersStorage.removeKnownPlayer(playerName);
    setKnownPlayers(knownPlayersStorage.getKnownPlayers());
  };

  const getPingColor = (ping: number) => {
    if (ping < 50) return 'text-green-600';
    if (ping < 100) return 'text-yellow-600';
    if (ping < 200) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Player Management</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{filteredAndSortedPlayers.length} players</span>
          <span className="text-gray-400">•</span>
          <span>{knownPlayers.length} known</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-redm-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Toggle Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilters(prev => ({ ...prev, onlineOnly: !prev.onlineOnly }))}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.onlineOnly
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Online Only
          </button>
          <button
            onClick={() => setFilters(prev => ({ ...prev, knownOnly: !prev.knownOnly }))}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.knownOnly
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Known Only
          </button>
        </div>
      </div>

      {/* Player Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 hover:text-redm-600 font-medium"
                >
                  <span>Player</span>
                  {sortField === 'name' && (
                    sortDirection === 'asc' 
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center space-x-1 hover:text-redm-600 font-medium"
                >
                  <span>Boot</span>
                  {sortField === 'id' && (
                    sortDirection === 'asc'
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('ping')}
                  className="flex items-center space-x-1 hover:text-redm-600 font-medium"
                >
                  <span>Ping</span>
                  {sortField === 'ping' && (
                    sortDirection === 'asc' 
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPlayers.map((player) => (
              <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                {editingPlayer === player.name ? (
                  <EditPlayerRow
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onSave={handleSavePlayer}
                    onCancel={() => {
                      setEditingPlayer(null);
                      setEditForm({});
                    }}
                  />
                ) : (
                  <PlayerRow
                    player={player}
                    onEdit={() => handleEditPlayer(player)}
                    onRemove={() => handleRemoveKnownPlayer(player.name)}
                    getPingColor={getPingColor}
                  />
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No players found matching current filters
          </div>
        )}
      </div>
    </div>
  );
}

// Separate components for cleaner code
function PlayerRow({ 
  player, 
  onEdit, 
  onRemove, 
  getPingColor 
}: { 
  player: any;
  onEdit: () => void;
  onRemove: () => void;
  getPingColor: (ping: number) => string;
}) {
  return (
    <>
      <td className="py-3 px-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{player.displayName || player.name}</span>
            {player.isKnown && <Crown className="h-4 w-4 text-yellow-500" />}
          </div>
          {player.displayName && player.displayName !== player.name && (
            <div className="text-sm text-gray-500">({player.name})</div>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm">
          <div className="font-mono">{player.id}</div>
          {player.mailId && <div>Mail: {player.mailId}</div>}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`font-mono ${getPingColor(player.ping)}`}>
          {player.ping}ms
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center space-x-1">
          <button
            onClick={onEdit}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title={player.isKnown ? "Edit player info" : "Add as known player"}
          >
            {player.isKnown ? <Edit3 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          </button>
          {player.isKnown && (
            <button
              onClick={onRemove}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Remove from known players"
            >
              <UserX className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </>
  );
}

function EditPlayerRow({ 
  editForm, 
  setEditForm, 
  onSave, 
  onCancel 
}: {
  editForm: Partial<KnownPlayer>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<KnownPlayer>>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <td className="py-3 px-4" colSpan={5}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Display Name"
              value={editForm.displayName || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-redm-500"
            />
            <input
              type="text"
              placeholder="Mail ID"
              value={editForm.mailId || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, mailId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-redm-500"
            />
          </div>
          <textarea
            placeholder="Notes"
            value={editForm.notes || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-redm-500"
            rows={2}
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={onSave}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={onCancel}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </td>
    </>
  );
}