'use client';

import { useState, useEffect } from 'react';
import { Server, Users, Globe, Clock, Activity } from 'lucide-react';
import { ServerInfo } from '@/types';
import { serverApi } from '@/lib/api';

export default function ServerStatusCard() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const fetchServerInfo = async () => {
      try {
        const data = await serverApi.getStatus();
        setServerInfo(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch server status');
        console.error('Error fetching server status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServerInfo();
    const interval = setInterval(fetchServerInfo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [mounted]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !serverInfo) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️ Server Unavailable</div>
          <p className="text-gray-600">{error || 'Unable to connect to server'}</p>
        </div>
      </div>
    );
  }

  const playerPercentage = serverInfo.maxPlayers > 0 
    ? (serverInfo.players / serverInfo.maxPlayers) * 100 
    : 0;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Server className="h-6 w-6 text-redm-600" />
          <h2 className="text-xl font-bold text-gray-900">Atlanta Server Status</h2>
        </div>
        <span className={`status-badge ${serverInfo.online ? 'status-online' : 'status-offline'}`}>
          {serverInfo.online ? '🟢 Online' : '🔴 Offline'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Server Name */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Server Name</p>
            <p className="font-semibold text-gray-900 truncate" title={serverInfo.hostname}>
              {serverInfo.hostname}
            </p>
          </div>
        </div>

        {/* Players */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Players Online</p>
            <div className="flex items-center space-x-2">
              <p className="font-semibold text-gray-900">
                {serverInfo.players}/{serverInfo.maxPlayers}
              </p>
              <span className="text-xs text-gray-500">
                ({playerPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(playerPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Game Type */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Game Type</p>
            <p className="font-semibold text-gray-900">{serverInfo.gametype}</p>
          </div>
        </div>

        {/* Uptime */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Uptime</p>
            <p className="font-semibold text-gray-900">{serverInfo.uptime}</p>
          </div>
        </div>
      </div>

      {/* Server Details */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Map:</span>
            <span className="ml-2 font-medium">{serverInfo.mapname}</span>
          </div>
          <div>
            <span className="text-gray-500">Resources:</span>
            <span className="ml-2 font-medium">
              {serverInfo.resources?.length || 0} loaded
            </span>
          </div>
        </div>
      </div>

      {mounted && (
        <div className="mt-4 text-xs text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}