'use client';

import { useState, useEffect } from 'react';
import { Server, Users, Globe, Clock, Activity, Zap, HardDrive, Cpu, Wifi, MapPin } from 'lucide-react';
import { ServerInfo, Player } from '@/types';
import { serverApi } from '@/lib/api';

export default function EnhancedServerStatus() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const fetchServerData = async () => {
      try {
        const [serverData, playersData] = await Promise.allSettled([
          serverApi.getStatus(),
          serverApi.getPlayers()
        ]);
        
        if (serverData.status === 'fulfilled') {
          setServerInfo(serverData.value);
        }
        
        if (playersData.status === 'fulfilled') {
          setPlayers(playersData.value);
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch server data');
        console.error('Error fetching server data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServerData();
    const interval = setInterval(fetchServerData, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, [mounted]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const playerPercentage = serverInfo?.maxPlayers 
    ? (serverInfo.players / serverInfo.maxPlayers) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Server Status Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Server className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {serverInfo?.hostname || 'RedM Server'}
              </h1>
              <p className="text-red-100 text-lg">
                {serverInfo?.gametype || 'Red Dead Redemption 2 Roleplay'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${
              serverInfo?.online 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              <div className={`w-3 h-3 rounded-full mr-2 ${
                serverInfo?.online ? 'bg-green-200' : 'bg-red-200'
              }`}></div>
              {serverInfo?.online ? 'ONLINE' : 'OFFLINE'}
            </div>
            <div className="text-red-100 text-sm mt-2">
              {serverInfo?.online ? `${serverInfo.players}/${serverInfo.maxPlayers} players` : 'Server offline'}
            </div>
          </div>
        </div>
      </div>

      {/* Server Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Players Online */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Players Online</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {serverInfo?.players || 0}
              </p>
              <div className="flex items-center mt-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(playerPercentage, 100)}%` }}
                  ></div>
                </div>
                <span className="text-gray-500 text-xs">
                  {playerPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Server Capacity */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Max Capacity</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {serverInfo?.maxPlayers || 0}
              </p>
              <p className="text-gray-500 text-sm mt-2">Available slots</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Resources</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {serverInfo?.resources?.length || 0}
              </p>
              <p className="text-gray-500 text-sm mt-2">Loaded mods</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <HardDrive className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Uptime</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {serverInfo?.uptime || 'N/A'}
              </p>
              <p className="text-gray-500 text-sm mt-2">Server runtime</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Server Information Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Details */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="h-5 w-5 text-gray-600 mr-2" />
            Server Information
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Server Name</span>
              <span className="text-gray-900 font-mono text-sm">
                {serverInfo?.hostname || 'Loading...'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Game Type</span>
              <span className="text-gray-900">{serverInfo?.gametype || 'RedM'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Map</span>
              <span className="text-gray-900">{serverInfo?.mapname || 'rdr3'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                serverInfo?.online 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {serverInfo?.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Info */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Wifi className="h-5 w-5 text-gray-600 mr-2" />
            Connection Info
          </h3>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Connect via FiveM/RedM:</p>
              <p className="font-mono text-sm bg-white p-2 rounded border">
                connect 131.196.197.140:30120
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Server IP:</span>
                <p className="font-mono text-gray-900">131.196.197.140</p>
              </div>
              <div>
                <span className="text-gray-600">Port:</span>
                <p className="font-mono text-gray-900">30120</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Last Updated */}
      {mounted && (
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()} • Auto-refresh every 15 seconds
        </div>
      )}
    </div>
  );
}