'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, Users, Activity, RefreshCw, ExternalLink, Search, 
  ChevronUp, ChevronDown, Star, StarOff, Edit, Trash2, 
  UserPlus, Clock, Zap, CheckCircle, AlertCircle, Circle,
  Wifi, WifiOff, Filter, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

// Interfaces for proper typing
interface ServerInfo {
  hostname?: string;
  gametype?: string;
  mapname?: string;
  sv_maxclients?: number;
  resources?: string[];
}

interface DynamicInfo {
  hostname?: string;
  gametype?: string;
  mapname?: string;
  clients?: number;
  sv_maxclients?: number;
}

interface Player {
  id: number;
  name: string;
  ping: number;
}

interface KnownPlayer {
  name_id: string;
  display_name?: string;
  pombo?: string;
  job?: string;
  is_online: boolean;
  last_seen_id?: number;
  current_ping?: number;
  last_login?: string;
  last_logout?: string;
  current_id?: number;
}


const ServerMonitor = () => {
  // Use Socket.io for real-time updates
  const { socket, isConnected, serverData } = useSocket();
  
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [dynamicInfo, setDynamicInfo] = useState<DynamicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'ping' | 'id'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedSections, setExpandedSections] = useState({
    resources: false,
    endpoints: true,
    knownPlayers: true
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Known Players states
  const [knownPlayers, setKnownPlayers] = useState<Record<string, KnownPlayer>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<KnownPlayer | null>(null);
  const [knownSearchTerm, setKnownSearchTerm] = useState('');
  const [knownSortBy, setKnownSortBy] = useState<'status' | 'name' | 'job' | 'ping' | 'lastLogin' | 'lastLogout'>('status');
  const [knownSortOrder, setKnownSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showOfflinePlayers, setShowOfflinePlayers] = useState(true);

  // Server constants
  const SERVER_IP = '131.196.197.140';
  const SERVER_PORT = '30120';
  const TXADMIN_PORT = '40120';
  const BASE_URL = `https://${SERVER_IP}:${SERVER_PORT}`;
  const TXADMIN_URL = `http://${SERVER_IP}:${TXADMIN_PORT}`;
  const DISCORD_INVITE = 'discord.gg/condado';

  // Server endpoints
  const endpoints = [
    { url: '/info.json', status: 'online', description: 'Server configuration and resources' },
    { url: '/players.json', status: 'online', description: 'Real-time player list' },
    { url: '/dynamic.json', status: 'online', description: 'Server status and metadata' },
    { url: `${TXADMIN_URL}/`, status: 'auth', description: 'txAdmin panel (requires login)' },
    { url: '/api', status: 'partial', description: 'API endpoints (authentication required)' }
  ];

  // Fetch server data from API proxy endpoints
  const fetchServerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [infoRes, playersRes, dynamicRes] = await Promise.all([
        fetch('/api/server-proxy/info'),
        fetch('/api/server-proxy/players'),
        fetch('/api/server-proxy/dynamic')
      ]);
      
      if (infoRes.ok) {
        const info = await infoRes.json();
        setServerInfo(info);
      }
      
      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData);
      }
      
      if (dynamicRes.ok) {
        const dynamic = await dynamicRes.json();
        setDynamicInfo(dynamic);
      }
      
      setLastUpdate(new Date());
      
    } catch (error: any) {
      console.error('Error fetching server data:', error);
      setError('Failed to fetch server data');
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh - force socket reconnection
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Fetch known players from localStorage (independent of backend)
  const fetchKnownPlayers = () => {
    try {
      const savedPlayers = localStorage.getItem('serverMonitor_knownPlayers');
      if (savedPlayers) {
        setKnownPlayers(JSON.parse(savedPlayers));
      } else {
        // Initialize with default known player
        const defaultPlayers = {
          'GM Stoffel': {
            name_id: 'GM Stoffel',
            display_name: 'GM Stoffel',
            pombo: 'ADMIN001',
            job: 'Game Master',
            is_online: false,
            last_seen_id: 1,
            current_ping: 0,
            last_login: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            last_logout: new Date(Date.now() - 1000 * 60 * 30).toISOString()
          }
        };
        setKnownPlayers(defaultPlayers);
        localStorage.setItem('serverMonitor_knownPlayers', JSON.stringify(defaultPlayers));
      }
    } catch (error) {
      console.error('Error loading known players:', error);
      setKnownPlayers({});
    }
  };


  // Update known players status - moved to useEffect for better optimization

  // Add/Update known player (using localStorage)
  const handleSaveKnownPlayer = (playerData: KnownPlayer) => {
    try {
      const updatedPlayers = {
        ...knownPlayers,
        [playerData.name_id]: playerData
      };
      
      setKnownPlayers(updatedPlayers);
      localStorage.setItem('serverMonitor_knownPlayers', JSON.stringify(updatedPlayers));
      setEditDialogOpen(false);
      setEditingPlayer(null);
    } catch (error) {
      console.error('Error saving known player:', error);
      setError('Failed to save player data.');
    }
  };

  // Remove known player (using localStorage)
  const handleRemoveKnownPlayer = (nameId: string) => {
    if (!window.confirm('Remove this known player?')) return;
    
    try {
      const updatedPlayers = { ...knownPlayers };
      delete updatedPlayers[nameId];
      
      setKnownPlayers(updatedPlayers);
      localStorage.setItem('serverMonitor_knownPlayers', JSON.stringify(updatedPlayers));
    } catch (error) {
      console.error('Error removing known player:', error);
      setError('Failed to remove player.');
    }
  };

  // Open edit dialog for player
  const openEditDialog = (player: Player | KnownPlayer, isNew = false) => {
    if (isNew) {
      setEditingPlayer({
        name_id: (player as Player).name,
        display_name: (player as Player).name,
        pombo: '',
        job: '',
        current_id: (player as Player).id,
        is_online: true
      });
    } else {
      setEditingPlayer({
        ...knownPlayers[(player as KnownPlayer).name_id],
        current_id: (player as Player).id,
        is_online: (player as KnownPlayer).is_online
      });
    }
    setEditDialogOpen(true);
  };

  // Initialize component
  useEffect(() => {
    fetchKnownPlayers();
    // Remove manual API calls - using Socket.io instead
  }, []);

  // Update state when socket data changes
  useEffect(() => {
    if (serverData.info) {
      setServerInfo(serverData.info);
      setPlayers(serverData.players);
      setDynamicInfo(serverData.dynamic);
      setLastUpdate(new Date(serverData.lastUpdate || Date.now()));
      setLoading(false);
    }
  }, [serverData]);

  // Update known players status when players list changes
  useEffect(() => {
    // Skip if no known players to update
    if (Object.keys(knownPlayers).length === 0) return;
    
    // Create updated known players
    const updatedKnownPlayers = { ...knownPlayers };
    let hasChanges = false;
    
    // Mark all as offline first
    Object.keys(updatedKnownPlayers).forEach(nameId => {
      if (updatedKnownPlayers[nameId].is_online) {
        updatedKnownPlayers[nameId].is_online = false;
        updatedKnownPlayers[nameId].current_ping = 0;
        hasChanges = true;
      }
    });
    
    // Mark online players
    players.forEach(player => {
      if (updatedKnownPlayers[player.name]) {
        const knownPlayer = updatedKnownPlayers[player.name];
        if (!knownPlayer.is_online || knownPlayer.current_ping !== player.ping) {
          updatedKnownPlayers[player.name].is_online = true;
          updatedKnownPlayers[player.name].current_ping = player.ping;
          updatedKnownPlayers[player.name].last_seen_id = player.id;
          updatedKnownPlayers[player.name].last_login = new Date().toISOString();
          hasChanges = true;
        }
      }
    });
    
    // Only update state if there are actual changes
    if (hasChanges) {
      setKnownPlayers(updatedKnownPlayers);
      localStorage.setItem('serverMonitor_knownPlayers', JSON.stringify(updatedKnownPlayers));
    }
  }, [players]); // Re-run when players array changes

  // Filter and sort players
  const filteredAndSortedPlayers = players
    .filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'ping':
          comparison = a.ping - b.ping;
          break;
        case 'id':
          comparison = a.id - b.id;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Handle column header click for sorting
  const handleSort = (column: 'name' | 'ping' | 'id') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sort icon for column headers
  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Handle known players sorting
  const handleKnownPlayersSort = (column: 'status' | 'name' | 'job' | 'ping' | 'lastLogin' | 'lastLogout') => {
    if (knownSortBy === column) {
      setKnownSortOrder(knownSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setKnownSortBy(column);
      setKnownSortOrder('asc');
    }
  };

  // Get sort icon for known players columns
  const getKnownPlayersSortIcon = (column: string) => {
    if (knownSortBy !== column) return <ArrowUpDown className="h-4 w-4 opacity-30" />;
    return knownSortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Get ping color
  const getPingColor = (ping: number) => {
    if (ping < 50) return 'text-green-600';
    if (ping < 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter and sort known players
  const getFilteredKnownPlayers = () => {
    const knownPlayersList = Object.values(knownPlayers);
    
    // Filter by search term
    let filtered = knownPlayersList.filter(player => {
      const searchLower = knownSearchTerm.toLowerCase();
      return (
        player.display_name?.toLowerCase().includes(searchLower) ||
        player.name_id?.toLowerCase().includes(searchLower) ||
        player.job?.toLowerCase().includes(searchLower) ||
        player.pombo?.toLowerCase().includes(searchLower)
      );
    });

    // Filter offline players if needed
    if (!showOfflinePlayers) {
      filtered = filtered.filter(player => player.is_online);
    }

    // Sort players
    filtered.sort((a, b) => {
      // Always show online players first
      if (a.is_online !== b.is_online) {
        return a.is_online ? -1 : 1;
      }

      let comparison = 0;
      switch (knownSortBy) {
        case 'status':
          comparison = 0; // Already sorted by online status
          break;
        case 'name':
          comparison = (a.display_name || a.name_id).localeCompare(b.display_name || b.name_id);
          break;
        case 'job':
          comparison = (a.job || '').localeCompare(b.job || '');
          break;
        case 'ping':
          comparison = (a.current_ping || 999) - (b.current_ping || 999);
          break;
        case 'lastLogin':
          comparison = new Date(b.last_login || 0).getTime() - new Date(a.last_login || 0).getTime();
          break;
        case 'lastLogout':
          comparison = new Date(b.last_logout || 0).getTime() - new Date(a.last_logout || 0).getTime();
          break;
        default:
          comparison = 0;
      }

      return knownSortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  // Format timestamp
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('pt-BR');
  };

  // Group resources by category with descriptions
  const categorizeResources = (resources?: string[]): Record<string, { resources: string[]; description: string }> => {
    if (!resources) return {};
    
    const categories: Record<string, { resources: string[]; description: string }> = {
      'VORP Framework': { 
        resources: [], 
        description: 'Core RedM framework - provides character system, inventory, economy, jobs, and database management'
      },
      'Atlanta Scripts': { 
        resources: [], 
        description: 'Custom server scripts for farm management, activities tracking, and unique gameplay features'
      },
      'Admin & Moderation': { 
        resources: [], 
        description: 'Administrative tools for server management, player moderation, and debugging'
      },
      'Maps & MLOs': { 
        resources: [], 
        description: 'Custom map additions and interior locations (Map Loader Objects)'
      },
      'Utilities & Tools': { 
        resources: [], 
        description: 'Development tools, APIs, loggers, and utility scripts for server functionality'
      },
      'Gameplay & Features': { 
        resources: [], 
        description: 'Additional gameplay features, mechanics, and player interaction systems'
      }
    };

    resources.forEach(resource => {
      if (resource.includes('vorp')) {
        categories['VORP Framework'].resources.push(resource);
      } else if (resource.includes('atlanta')) {
        categories['Atlanta Scripts'].resources.push(resource);
      } else if (resource.includes('admin') || resource.includes('drg_admin') || resource.includes('mod')) {
        categories['Admin & Moderation'].resources.push(resource);
      } else if (resource.includes('map') || resource.includes('mlo') || resource.includes('interior')) {
        categories['Maps & MLOs'].resources.push(resource);
      } else if (resource.includes('tool') || resource.includes('logger') || resource.includes('api') || resource.includes('util')) {
        categories['Utilities & Tools'].resources.push(resource);
      } else {
        categories['Gameplay & Features'].resources.push(resource);
      }
    });

    return categories;
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Server className="h-6 w-6" />
          Server Monitor - Atlanta Season 2
        </h2>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Server Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Status */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Server Status
            {/* Socket.io connection indicator */}
            <span className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`}></div>
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </h3>
          
          {dynamicInfo ? (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Hostname:</span>
                <p className="font-medium">{dynamicInfo.hostname}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Game Type:</span>
                <p className="font-medium">{dynamicInfo.gametype}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Map:</span>
                <p className="font-medium">{dynamicInfo.mapname}</p>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Players Online</span>
                  <span className="font-bold text-lg">
                    {dynamicInfo.clients || players.length} / {dynamicInfo.sv_maxclients}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-600 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${((dynamicInfo.clients || players.length) / (dynamicInfo.sv_maxclients || 64)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  3 Anos Online
                </span>
                <button
                  onClick={() => window.open(`https://${DISCORD_INVITE}`, '_blank')}
                  className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full hover:bg-purple-200 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {DISCORD_INVITE}
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          )}
        </div>

        {/* Server Endpoints */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-500" />
            Server Endpoints
          </h3>
          
          <div className="space-y-3">
            {endpoints.map((endpoint, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{endpoint.url}</p>
                  <p className="text-xs text-gray-500">{endpoint.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  endpoint.status === 'online' ? 'bg-green-100 text-green-800' :
                  endpoint.status === 'auth' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {endpoint.status === 'online' ? 'Online' : endpoint.status === 'auth' ? 'Auth Required' : 'Partial'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => window.open(TXADMIN_URL, '_blank')}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              txAdmin Panel
            </button>
          </div>
        </div>
      </div>

      {/* Known Players */}
      <div className="card p-6">
        <div 
          className="flex justify-between items-center cursor-pointer mb-4"
          onClick={() => toggleSection('knownPlayers')}
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Known People
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              {Object.keys(knownPlayers).length}
            </span>
          </h3>
          {expandedSections.knownPlayers ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>

        {expandedSections.knownPlayers && (
          <>
            {/* Known Players Filters */}
            <div className="flex gap-4 items-center mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search known people..."
                    value={knownSearchTerm}
                    onChange={(e) => setKnownSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOfflinePlayers}
                  onChange={(e) => setShowOfflinePlayers(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                Show Offline
              </label>
            </div>

            {/* Known Players Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleKnownPlayersSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status {getKnownPlayersSortIcon('status')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleKnownPlayersSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Display Name {getKnownPlayersSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleKnownPlayersSort('job')}
                    >
                      <div className="flex items-center gap-1">
                        Job {getKnownPlayersSortIcon('job')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boot (ID)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pombo</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleKnownPlayersSort('lastLogin')}
                    >
                      <div className="flex items-center gap-1">
                        Last Login {getKnownPlayersSortIcon('lastLogin')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleKnownPlayersSort('lastLogout')}
                    >
                      <div className="flex items-center gap-1">
                        Last Logout {getKnownPlayersSortIcon('lastLogout')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleKnownPlayersSort('ping')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Ping {getKnownPlayersSortIcon('ping')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredKnownPlayers().map((player) => (
                    <tr 
                      key={player.name_id}
                      className={`hover:bg-gray-50 ${
                        player.is_online ? 'bg-green-50' : 'opacity-70'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-full ${
                          player.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {player.is_online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                          {player.is_online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {player.display_name || player.name_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.job || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.is_online ? player.last_seen_id : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.pombo || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(player.last_login)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(player.last_logout)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {player.is_online && player.current_ping ? (
                          <span className={`text-sm font-medium flex items-center justify-center gap-1 ${getPingColor(player.current_ping)}`}>
                            <Zap className="h-3 w-3" />
                            {player.current_ping}ms
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingPlayer(player);
                              setEditDialogOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveKnownPlayer(player.name_id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
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

            {getFilteredKnownPlayers().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {knownSearchTerm ? 'No known people found matching your search' : 
                 Object.keys(knownPlayers).length === 0 ? 'No known people yet. Click the star icon on online players to add them.' :
                 'No people match the current filters'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Current Players */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Players Online
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {filteredAndSortedPlayers.length}
            </span>
          </h3>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <span className="text-xs text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    ID {getSortIcon('id')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ping')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Ping {getSortIcon('ping')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedPlayers.map((player) => {
                const isKnown = knownPlayers[player.name] !== undefined;
                const knownPlayer = knownPlayers[player.name];
                
                return (
                  <tr 
                    key={player.id}
                    className={`hover:bg-gray-50 ${
                      player.name === 'GM Stoffel' ? 'bg-blue-50' : 
                      isKnown ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isKnown && <Star className="h-4 w-4 text-yellow-500" />}
                        <span className="text-sm font-medium text-gray-900">
                          {knownPlayer?.display_name || player.name}
                        </span>
                        {player.name === 'GM Stoffel' && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            YOU
                          </span>
                        )}
                        {knownPlayer?.job && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            {knownPlayer.job}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-medium flex items-center justify-center gap-1 ${getPingColor(player.ping)}`}>
                        <Zap className="h-3 w-3" />
                        {player.ping}ms
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        Online
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isKnown ? (
                          <>
                            <button
                              onClick={() => openEditDialog(player, false)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Edit Known Player"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveKnownPlayer(player.name)}
                              className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 transition-colors"
                              title="Remove from Known Players"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openEditDialog(player, true)}
                            className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 transition-colors"
                            title="Add to Known Players"
                          >
                            <StarOff className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No players found matching your search' : 'No players online'}
          </div>
        )}
      </div>

      {/* Server Resources */}
      <div className="card p-6">
        <div 
          className="flex justify-between items-center cursor-pointer mb-4"
          onClick={() => toggleSection('resources')}
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Server Resources
            {serverInfo && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                {serverInfo.resources?.length || 0}
              </span>
            )}
          </h3>
          {expandedSections.resources ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>

        {expandedSections.resources && serverInfo && serverInfo.resources && (
          <div className="space-y-4">
            {Object.entries(categorizeResources(serverInfo.resources)).map(([category, categoryData]) => (
              categoryData.resources.length > 0 && (
                <div key={category} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-red-600 mb-2">
                    {category} ({categoryData.resources.length})
                  </h4>
                  <p className="text-sm text-gray-600 mb-3 italic">
                    {categoryData.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categoryData.resources.map((resource: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200 hover:bg-blue-200 transition-colors"
                      >
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Edit Known Player Dialog */}
      {editDialogOpen && editingPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {knownPlayers[editingPlayer.name_id] ? 'Edit Known Player' : 'Add Known Player'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Player Name ID</label>
                  <input
                    type="text"
                    value={editingPlayer.name_id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">This is the permanent player name used as ID</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editingPlayer.display_name || ''}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Custom display name (optional)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pombo</label>
                  <input
                    type="text"
                    value={editingPlayer.pombo || ''}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, pombo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pombo reference or ID</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job</label>
                  <input
                    type="text"
                    value={editingPlayer.job || ''}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, job: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Player's job or role</p>
                </div>
                
                
                {editingPlayer.is_online !== undefined && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      Player is currently <strong>{editingPlayer.is_online ? 'ONLINE' : 'OFFLINE'}</strong>
                      {editingPlayer.current_id && ` with Boot ID: ${editingPlayer.current_id}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditDialogOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveKnownPlayer(editingPlayer)}
                  disabled={!editingPlayer.name_id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerMonitor;