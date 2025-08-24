'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, Users, Server, List, Edit3, Save, X, AlertCircle } from 'lucide-react';

interface DiscordCommand {
  id: string;
  name: string;
  description: string;
  channels: string[];
  action: 'online-members' | 'server-status' | 'player-list';
  enabled: boolean;
}

interface Channel {
  id: string;
  name: string;
}

const DiscordCommands = () => {
  const [commands, setCommands] = useState<DiscordCommand[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    channels: string[];
    action: 'online-members' | 'server-status' | 'player-list';
    enabled: boolean;
  }>({
    name: '',
    description: '',
    channels: [] as string[],
    action: 'online-members',
    enabled: true
  });

  // Load commands and channels
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load commands
      const commandsResponse = await fetch('/api/discord/commands');
      const commandsData = await commandsResponse.json();
      
      if (commandsData.success) {
        setCommands(commandsData.data);
      }

      // Load available channels
      const channelsResponse = await fetch('/api/users/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeChannels: true, includeRoles: false, includeActivity: false })
      });
      
      const channelsData = await channelsResponse.json();
      if (channelsData.success) {
        setChannels(channelsData.data.channels || []);
      }

    } catch (error: any) {
      setError('Falha ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.name.trim()) {
        setError('Nome do comando é obrigatório');
        return;
      }

      if (formData.channels.length === 0) {
        setError('Selecione pelo menos um canal');
        return;
      }

      const url = editingCommand 
        ? `/api/discord/commands/${editingCommand}`
        : '/api/discord/commands';
      
      const method = editingCommand ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(editingCommand ? 'Comando atualizado!' : 'Comando criado!');
        resetForm();
        loadData();
      } else {
        setError(result.error || 'Erro ao salvar comando');
      }
    } catch (error: any) {
      setError('Erro ao salvar comando: ' + error.message);
    }
  };

  // Delete command
  const handleDelete = async (commandId: string) => {
    if (!confirm('Tem certeza que deseja deletar este comando?')) return;

    try {
      const response = await fetch(`/api/discord/commands/${commandId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Comando deletado!');
        loadData();
      } else {
        setError(result.error || 'Erro ao deletar comando');
      }
    } catch (error: any) {
      setError('Erro ao deletar comando: ' + error.message);
    }
  };

  // Toggle command enabled/disabled
  const handleToggleEnabled = async (commandId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/discord/commands/${commandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Comando ${enabled ? 'ativado' : 'desativado'}!`);
        loadData();
      } else {
        setError(result.error || 'Erro ao atualizar comando');
      }
    } catch (error: any) {
      setError('Erro ao atualizar comando: ' + error.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setShowForm(false);
    setEditingCommand(null);
    setFormData({
      name: '',
      description: '',
      channels: [],
      action: 'online-members',
      enabled: true
    });
    setError('');
  };

  // Start editing
  const startEdit = (command: DiscordCommand) => {
    setEditingCommand(command.id);
    setFormData({
      name: command.name,
      description: command.description,
      channels: command.channels,
      action: command.action,
      enabled: command.enabled
    });
    setShowForm(true);
    setError('');
  };

  // Handle channel selection
  const handleChannelChange = (channelId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      channels: checked
        ? [...prev.channels, channelId]
        : prev.channels.filter(id => id !== channelId)
    }));
  };

  // Get action label
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'online-members': return 'Membros da Família Online';
      case 'server-status': return 'Status do Servidor';
      case 'player-list': return 'Lista de Jogadores';
      default: return action;
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'online-members': return <Users className="h-4 w-4" />;
      case 'server-status': return <Server className="h-4 w-4" />;
      case 'player-list': return <List className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comandos do Discord</h1>
          <p className="text-gray-600 mt-1">Gerencie comandos personalizados do bot Discord</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Comando
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Command Form */}
      {showForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {editingCommand ? 'Editar Comando' : 'Novo Comando'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Command Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Comando
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="familia-online"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">O comando será registrado como /{formData.name}</p>
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ação
                </label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="online-members">Membros da Família Online</option>
                  <option value="server-status">Status do Servidor</option>
                  <option value="player-list">Lista de Jogadores</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Mostra membros da família atualmente online"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canais Permitidos
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                {channels.map((channel) => (
                  <label key={channel.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.channels.includes(channel.id)}
                      onChange={(e) => handleChannelChange(channel.id, e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span>#{channel.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selecione os canais onde este comando pode ser usado
              </p>
            </div>

            {/* Enabled */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Comando ativado</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingCommand ? 'Atualizar' : 'Criar'} Comando
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Commands List */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Comandos Configurados</h2>
        
        {commands.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum comando configurado ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {commands.map((command) => (
              <div key={command.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getActionIcon(command.action)}
                      <h3 className="font-semibold text-lg">/{command.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        command.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {command.enabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{command.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">Ação:</span>
                      <span className="text-sm text-gray-600">{getActionLabel(command.action)}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      <span className="text-sm font-medium text-gray-700">Canais:</span>
                      {command.channels.map(channelId => {
                        const channel = channels.find(c => c.id === channelId);
                        return (
                          <span key={channelId} className="bg-gray-100 text-gray-700 px-2 py-1 text-xs rounded">
                            #{channel?.name || channelId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleEnabled(command.id, !command.enabled)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        command.enabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {command.enabled ? 'Desativar' : 'Ativar'}
                    </button>
                    
                    <button
                      onClick={() => startEdit(command)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(command.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
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
};

export default DiscordCommands;