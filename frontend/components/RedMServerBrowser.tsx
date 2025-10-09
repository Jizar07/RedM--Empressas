'use client';

import { useState, useEffect } from 'react';
import { Server, Users, Plus, Trash2, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchServerInfo, RedMServer } from '@/lib/redmServersApi';
import { getServerList, addServer, removeServer, setActiveServer, getActiveServerId } from '@/lib/redmServerStorage';

export default function RedMServerBrowser() {
  const { language } = useTranslation();
  const [servers, setServers] = useState<RedMServer[]>([]);
  const [serverAddress, setServerAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeServerId, setActiveServerId] = useState<string | null>(null);

  // Load servers on mount
  useEffect(() => {
    loadServers();
    setActiveServerId(getActiveServerId());
  }, []);

  const loadServers = () => {
    const savedServers = getServerList();
    setServers(savedServers);
  };

  const handleAddServer = async () => {
    if (!serverAddress.trim()) {
      setError(language === 'pt-BR' ? 'Por favor, insira um endereço de servidor' : 'Please enter a server address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const serverInfo = await fetchServerInfo(serverAddress);

      if (!serverInfo) {
        setError(language === 'pt-BR'
          ? 'Não foi possível conectar ao servidor. Verifique o endereço.'
          : 'Could not connect to server. Check the address.');
        return;
      }

      addServer(serverInfo);
      loadServers();
      setServerAddress('');
      setError('');
    } catch (err) {
      setError(language === 'pt-BR' ? 'Erro ao adicionar servidor' : 'Error adding server');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveServer = (serverId: string) => {
    removeServer(serverId);
    loadServers();
    if (activeServerId === serverId) {
      setActiveServerId(null);
    }
  };

  const handleSelectServer = (serverId: string) => {
    setActiveServer(serverId);
    setActiveServerId(serverId);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          {language === 'pt-BR' ? '📋 Como adicionar um servidor:' : '📋 How to add a server:'}
        </h3>
        <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
          <li>
            {language === 'pt-BR' ? 'Visite ' : 'Visit '}
            <a
              href="https://servers.redm.net/servers/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600 inline-flex items-center gap-1"
            >
              servers.redm.net
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>{language === 'pt-BR' ? 'Escolha um servidor' : 'Choose a server'}</li>
          <li>
            {language === 'pt-BR'
              ? 'Copie a URL completa (ex: servers.redm.net/servers/detail/j7baxp)'
              : 'Copy the full URL (e.g., servers.redm.net/servers/detail/j7baxp)'}
          </li>
          <li>{language === 'pt-BR' ? 'Cole a URL abaixo' : 'Paste the URL below'}</li>
        </ol>
      </div>

      {/* Add Server Form */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {language === 'pt-BR' ? 'Endereço do Servidor' : 'Server Address'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={serverAddress}
            onChange={(e) => setServerAddress(e.target.value)}
            placeholder="https://servers.redm.net/servers/detail/j7baxp"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={loading}
            onKeyPress={(e) => e.key === 'Enter' && handleAddServer()}
          />
          <button
            onClick={handleAddServer}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-5 w-5" />
            {loading ? (language === 'pt-BR' ? 'Adicionando...' : 'Adding...') : (language === 'pt-BR' ? 'Adicionar' : 'Add')}
          </button>
        </div>
        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {/* Server List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {language === 'pt-BR' ? 'Meus Servidores' : 'My Servers'} ({servers.length})
        </h3>

        {servers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'pt-BR' ? 'Nenhum servidor adicionado ainda' : 'No servers added yet'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {language === 'pt-BR' ? 'Use o formulário acima para adicionar seu primeiro servidor' : 'Use the form above to add your first server'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => (
              <div
                key={server.id}
                className={`p-4 border-2 rounded-lg transition-all ${
                  activeServerId === server.id
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {server.name}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{server.players}/{server.maxPlayers}</span>
                          </div>
                          <span className="text-xs font-mono">{server.ip}:{server.port}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleSelectServer(server.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeServerId === server.id
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {activeServerId === server.id ? (
                        <span className="flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          {language === 'pt-BR' ? 'Ativo' : 'Active'}
                        </span>
                      ) : (
                        <span>{language === 'pt-BR' ? 'Selecionar' : 'Select'}</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveServer(server.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={language === 'pt-BR' ? 'Remover servidor' : 'Remove server'}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
