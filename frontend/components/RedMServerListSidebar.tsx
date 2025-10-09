'use client';

import { useState, useEffect } from 'react';
import { Server, Users, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { RedMServer } from '@/lib/redmServersApi';
import { getServerList, setActiveServer, getActiveServerId } from '@/lib/redmServerStorage';

export default function RedMServerListSidebar() {
  const { language } = useTranslation();
  const [servers, setServers] = useState<RedMServer[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadServers();
    setActiveServerId(getActiveServerId());

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadServers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadServers = async () => {
    const savedServers = getServerList();

    // Update player counts for each server
    setRefreshing(true);
    const updatedServers = await Promise.all(
      savedServers.map(async (server) => {
        try {
          // Fetch current player count
          const playersRes = await fetch(`/api/server-proxy/players?serverIp=${server.ip}&serverPort=${server.port}`);
          if (playersRes.ok) {
            const playersData = await playersRes.json();
            return {
              ...server,
              players: Array.isArray(playersData) ? playersData.length : 0
            };
          }
        } catch (error) {
          // If fetch fails, return server with original data
        }
        return server;
      })
    );

    setServers(updatedServers);
    setRefreshing(false);
  };

  const handleSelectServer = (serverId: string) => {
    setActiveServer(serverId);
    setActiveServerId(serverId);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <Server className="h-4 w-4" />
          <span>{language === 'pt-BR' ? 'Meus Servidores' : 'My Servers'}</span>
        </h3>
        {refreshing && <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />}
      </div>

      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => handleSelectServer(server.id)}
            className={`w-full text-left p-3 rounded-lg transition-all ${
              activeServerId === server.id
                ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="font-medium text-sm text-gray-900 dark:text-white truncate mb-1">
              {server.name}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>
                  {server.players}/{server.maxPlayers}
                </span>
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                server.players > 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}>
                {server.players > 0 ? 'Online' : 'Empty'}
              </div>
            </div>
          </button>
        ))}

        {servers.length === 0 && (
          <div className="text-center py-8">
            <Server className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'pt-BR' ? 'Nenhum servidor adicionado' : 'No servers added'}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {language === 'pt-BR' ? 'Use o formulário ao lado' : 'Use the form on the left'}
            </p>
          </div>
        )}
      </div>

      {servers.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          {language === 'pt-BR' ? 'Atualização automática a cada 30s' : 'Auto-refresh every 30s'}
        </div>
      )}
    </div>
  );
}
