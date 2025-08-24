'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Save, RefreshCw, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Settings } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  description?: string;
  maxQuantity?: number;
  active: boolean;
}

interface Firm {
  id: string;
  name: string;  // Server category name (e.g. "Fazendas", "Mineração")
  description?: string;
  discordRoleIds: string[];  // Selected roles for this category
  discordRoleNames: string[];
  supplierUserIds: string[];  // Users who have the selected roles
  supplierUserNames: string[];
  items: OrderItem[];
  notificationChannelId?: string;
  active: boolean;
  order: number;
}

interface OrdersConfig {
  configId: string;
  firms: Firm[];
  settings: {
    orderChannelId?: string;
    notificationsEnabled: boolean;
    dmNotificationsEnabled: boolean;
    requireApproval: boolean;
    maxActiveOrdersPerUser: number;
    orderCooldownMinutes: number;
    embedColor: string;
  };
  command: {
    name: string;
    description: string;
    permissions: string;
  };
  messages: {
    orderPlaced: string;
    orderAccepted: string;
    orderRejected: string;
    orderCompleted: string;
    orderCancelled: string;
    dmNotificationTemplate: string;
    channelNotificationTemplate: string;
    noSuppliersAvailable: string;
    orderLimitReached: string;
    cooldownActive: string;
  };
  formDisplay: {
    title: string;
    description: string;
    embedColor: string;
    button: {
      text: string;
      emoji: string;
      style: string;
    };
  };
  steps: {
    selectFirm: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
    selectSupplier: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
    orderDetails: {
      modalTitle: string;
      itemLabel: string;
      itemPlaceholder: string;
      quantityLabel: string;
      quantityPlaceholder: string;
      notesLabel: string;
      notesPlaceholder: string;
    };
  };
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
  memberCount: number;
}

interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  roleIds: string[];
}

interface DiscordCategory {
  id: string;
  name: string;
  position: number;
  channelCount: number;
}

export default function OrdersSettings() {
  const [config, setConfig] = useState<OrdersConfig | null>(null);
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [discordUsers, setDiscordUsers] = useState<DiscordUser[]>([]);
  const [discordCategories, setDiscordCategories] = useState<DiscordCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'firms' | 'messages' | 'display'>('settings');
  const [showAddFirm, setShowAddFirm] = useState(false);
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [showEditFirm, setShowEditFirm] = useState(false);
  const [editingFirmData, setEditingFirmData] = useState<Partial<Firm>>({});
  const [newFirm, setNewFirm] = useState<Partial<Firm>>({
    name: '',
    description: '',
    discordRoleIds: [],
    supplierUserIds: [],
    items: [],
    active: true
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  useEffect(() => {
    fetchConfig();
    fetchDiscordRoles();
    fetchDiscordUsers();
    fetchDiscordCategories();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/orders/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching orders config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscordRoles = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/orders/discord/roles');
      if (response.ok) {
        const roles = await response.json();
        setDiscordRoles(roles);
      }
    } catch (error) {
      console.error('Error fetching Discord roles:', error);
    }
  };

  const fetchDiscordUsers = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/orders/discord/users');
      if (response.ok) {
        const users = await response.json();
        setDiscordUsers(users);
      }
    } catch (error) {
      console.error('Error fetching Discord users:', error);
    }
  };

  const fetchDiscordCategories = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/orders/discord/categories');
      if (response.ok) {
        const categories = await response.json();
        setDiscordCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching Discord categories:', error);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('http://localhost:3050/api/orders/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        alert('Configuração salva com sucesso!');
      } else {
        alert('Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const addFirm = () => {
    if (!config || !selectedCategoryId || !newFirm.discordRoleIds?.length || !newFirm.supplierUserIds?.length) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const selectedCategory = discordCategories.find(c => c.id === selectedCategoryId);
    const selectedRoles = discordRoles.filter(r => newFirm.discordRoleIds!.includes(r.id));
    const selectedUsers = discordUsers.filter(u => newFirm.supplierUserIds!.includes(u.id));
    
    if (!selectedCategory || selectedRoles.length === 0 || selectedUsers.length === 0) return;

    const firm: Firm = {
      id: `firm_${Date.now()}`,
      name: selectedCategory.name,  // Use the selected Discord category name
      description: newFirm.description,
      discordRoleIds: newFirm.discordRoleIds!,
      discordRoleNames: selectedRoles.map(r => r.name),
      supplierUserIds: newFirm.supplierUserIds!,
      supplierUserNames: selectedUsers.map(u => u.displayName),
      items: [],
      active: true,
      order: config.firms.length
    };

    setConfig({
      ...config,
      firms: [...config.firms, firm]
    });

    setNewFirm({
      name: '',
      description: '',
      discordRoleIds: [],
      supplierUserIds: [],
      items: [],
      active: true
    });
    setSelectedCategoryId('');
    setShowAddFirm(false);
  };

  const startEditFirm = (firm: Firm) => {
    setEditingFirmData({
      ...firm
    });
    setShowEditFirm(true);
  };

  const updateFirm = () => {
    if (!config || !editingFirmData.id) return;

    const selectedRoles = discordRoles.filter(r => editingFirmData.discordRoleIds?.includes(r.id));
    const selectedUsers = discordUsers.filter(u => editingFirmData.supplierUserIds?.includes(u.id));

    const updatedFirm: Firm = {
      ...editingFirmData as Firm,
      discordRoleNames: selectedRoles.map(r => r.name),
      supplierUserNames: selectedUsers.map(u => u.displayName),
    };

    setConfig({
      ...config,
      firms: config.firms.map(f => f.id === editingFirmData.id ? updatedFirm : f)
    });

    setEditingFirmData({});
    setShowEditFirm(false);
  };

  const cancelEdit = () => {
    setEditingFirmData({});
    setShowEditFirm(false);
  };

  const removeFirm = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      firms: config.firms.filter(f => f.id !== id)
    });
  };

  const toggleFirm = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      firms: config.firms.map(f => 
        f.id === id ? { ...f, active: !f.active } : f
      )
    });
  };

  const moveFirm = (id: string, direction: 'up' | 'down') => {
    if (!config) return;
    
    const index = config.firms.findIndex(f => f.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.firms.length) return;
    
    const newFirms = [...config.firms];
    [newFirms[index], newFirms[newIndex]] = [newFirms[newIndex], newFirms[index]];
    
    newFirms.forEach((f, i) => f.order = i);
    
    setConfig({
      ...config,
      firms: newFirms
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando configuração...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Erro ao carregar configuração</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Configuração do Sistema de Encomendas</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => { fetchDiscordRoles(); fetchDiscordUsers(); fetchDiscordCategories(); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar Dados</span>
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Configuração'}</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button 
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'settings' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                Configurações
              </button>
              <button 
                onClick={() => setActiveTab('firms')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'firms' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                Firmas
              </button>
              <button 
                onClick={() => setActiveTab('messages')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'messages' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                Mensagens
              </button>
              <button 
                onClick={() => setActiveTab('display')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'display' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                Exibição
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Configurações Gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Encomendas Ativas por Usuário
                </label>
                <input
                  type="number"
                  value={config.settings.maxActiveOrdersPerUser}
                  onChange={(e) => setConfig({
                    ...config,
                    settings: { ...config.settings, maxActiveOrdersPerUser: parseInt(e.target.value) || 5 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tempo de Espera entre Encomendas (minutos)
                </label>
                <input
                  type="number"
                  value={config.settings.orderCooldownMinutes}
                  onChange={(e) => setConfig({
                    ...config,
                    settings: { ...config.settings, orderCooldownMinutes: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  max="60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor do Embed
                </label>
                <input
                  type="color"
                  value={config.settings.embedColor}
                  onChange={(e) => setConfig({
                    ...config,
                    settings: { ...config.settings, embedColor: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.settings.notificationsEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      settings: { ...config.settings, notificationsEnabled: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Notificações no Canal</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.settings.dmNotificationsEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      settings: { ...config.settings, dmNotificationsEnabled: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Notificações por DM</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.settings.requireApproval}
                    onChange={(e) => setConfig({
                      ...config,
                      settings: { ...config.settings, requireApproval: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Requer Aprovação</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'firms' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Firmas Disponíveis</h3>
              <button
                onClick={() => setShowAddFirm(true)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Firma</span>
              </button>
            </div>

            {showAddFirm && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Categoria do Servidor
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Selecione uma categoria do Discord...</option>
                      {discordCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          #{category.name} ({category.channelCount} canais)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargos do Servidor
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {discordRoles.map(role => (
                        <label key={role.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={newFirm.discordRoleIds?.includes(role.id) || false}
                            onChange={(e) => {
                              const roleIds = newFirm.discordRoleIds || [];
                              if (e.target.checked) {
                                setNewFirm({ ...newFirm, discordRoleIds: [...roleIds, role.id] });
                              } else {
                                setNewFirm({ ...newFirm, discordRoleIds: roleIds.filter(id => id !== role.id) });
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm">@{role.name} ({role.memberCount} membros)</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuários com os Cargos Selecionados
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {(() => {
                        console.log('Debug - Total users loaded:', discordUsers.length);
                        console.log('Debug - Selected role IDs:', newFirm.discordRoleIds);
                        
                        const filteredUsers = discordUsers.filter(user => 
                          newFirm.discordRoleIds?.some(roleId => user.roleIds.includes(roleId))
                        );
                        
                        console.log('Debug - Filtered users count:', filteredUsers.length);
                        console.log('Debug - First filtered user roles:', filteredUsers[0]?.roleIds);
                        
                        return filteredUsers;
                      })().map(user => (
                          <label key={user.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={newFirm.supplierUserIds?.includes(user.id) || false}
                              onChange={(e) => {
                                const userIds = newFirm.supplierUserIds || [];
                                if (e.target.checked) {
                                  setNewFirm({ ...newFirm, supplierUserIds: [...userIds, user.id] });
                                } else {
                                  setNewFirm({ ...newFirm, supplierUserIds: userIds.filter(id => id !== user.id) });
                                }
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">{user.displayName} (@{user.username})</span>
                          </label>
                        ))}
                      {(!newFirm.discordRoleIds?.length || discordUsers.filter(user => 
                        newFirm.discordRoleIds?.some(roleId => user.roleIds.includes(roleId))
                      ).length === 0) && (
                        <div className="text-sm text-gray-500 p-2">
                          Selecione cargos primeiro para ver os usuários disponíveis
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newFirm.description}
                      onChange={(e) => setNewFirm({ ...newFirm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Descrição breve da firma..."
                    />
                  </div>
                  <div className="md:col-span-2 flex space-x-2">
                    <button
                      onClick={addFirm}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => setShowAddFirm(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showEditFirm && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Editar Firma: {editingFirmData.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={editingFirmData.description || ''}
                      onChange={(e) => setEditingFirmData({ ...editingFirmData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Descrição da firma..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargos do Servidor
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {discordRoles.map(role => (
                        <label key={role.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={editingFirmData.discordRoleIds?.includes(role.id) || false}
                            onChange={(e) => {
                              const roleIds = editingFirmData.discordRoleIds || [];
                              if (e.target.checked) {
                                setEditingFirmData({ ...editingFirmData, discordRoleIds: [...roleIds, role.id] });
                              } else {
                                setEditingFirmData({ ...editingFirmData, discordRoleIds: roleIds.filter(id => id !== role.id) });
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm">@{role.name} ({role.memberCount} membros)</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuários Fornecedores
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {discordUsers
                        .filter(user => 
                          editingFirmData.discordRoleIds?.some(roleId => user.roleIds.includes(roleId))
                        )
                        .map(user => (
                          <label key={user.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={editingFirmData.supplierUserIds?.includes(user.id) || false}
                              onChange={(e) => {
                                const userIds = editingFirmData.supplierUserIds || [];
                                if (e.target.checked) {
                                  setEditingFirmData({ ...editingFirmData, supplierUserIds: [...userIds, user.id] });
                                } else {
                                  setEditingFirmData({ ...editingFirmData, supplierUserIds: userIds.filter(id => id !== user.id) });
                                }
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">{user.displayName} (@{user.username})</span>
                          </label>
                        ))}
                      {(!editingFirmData.discordRoleIds?.length || discordUsers.filter(user => 
                        editingFirmData.discordRoleIds?.some(roleId => user.roleIds.includes(roleId))
                      ).length === 0) && (
                        <div className="text-sm text-gray-500 p-2">
                          Selecione cargos primeiro para ver os usuários disponíveis
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex space-x-2">
                    <button
                      onClick={updateFirm}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Salvar Alterações
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordem</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {config.firms.map((firm, index) => (
                    <tr key={firm.id} className={!firm.active ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => moveFirm(firm.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveFirm(firm.id, 'down')}
                            disabled={index === config.firms.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {firm.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {firm.discordRoleNames?.map(name => `@${name}`).join(', ') || 'Nenhum cargo'}
                        <div className="text-xs text-gray-400">
                          {firm.supplierUserNames?.length || 0} fornecedores
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {firm.description || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => toggleFirm(firm.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {firm.active ? (
                            <ToggleRight className="h-6 w-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditFirm(firm)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Editar Firma"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFirm(firm.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Remover Firma"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {config.firms.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Nenhuma firma configurada. Clique em "Adicionar Firma" para começar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Mensagens do Sistema</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Encomenda Realizada
                </label>
                <textarea
                  value={config.messages.orderPlaced}
                  onChange={(e) => setConfig({
                    ...config,
                    messages: { ...config.messages, orderPlaced: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Mensagem quando uma encomenda é criada..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template de Notificação por DM
                </label>
                <textarea
                  value={config.messages.dmNotificationTemplate}
                  onChange={(e) => setConfig({
                    ...config,
                    messages: { ...config.messages, dmNotificationTemplate: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Template de notificação enviada ao fornecedor..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Variáveis: {'{customerName}'}, {'{item}'}, {'{quantity}'}, {'{notes}'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template de Notificação no Canal
                </label>
                <textarea
                  value={config.messages.channelNotificationTemplate}
                  onChange={(e) => setConfig({
                    ...config,
                    messages: { ...config.messages, channelNotificationTemplate: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Template de notificação no canal..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Variáveis: {'{customerName}'}, {'{supplierName}'}, {'{firmName}'}, {'{item}'}, {'{quantity}'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Configuração de Exibição</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Formulário
                </label>
                <input
                  type="text"
                  value={config.formDisplay.title}
                  onChange={(e) => setConfig({
                    ...config,
                    formDisplay: { ...config.formDisplay, title: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor do Embed
                </label>
                <input
                  type="color"
                  value={config.formDisplay.embedColor}
                  onChange={(e) => setConfig({
                    ...config,
                    formDisplay: { ...config.formDisplay, embedColor: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Formulário
                </label>
                <textarea
                  value={config.formDisplay.description}
                  onChange={(e) => setConfig({
                    ...config,
                    formDisplay: { ...config.formDisplay, description: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto do Botão
                </label>
                <input
                  type="text"
                  value={config.formDisplay.button.text}
                  onChange={(e) => setConfig({
                    ...config,
                    formDisplay: { 
                      ...config.formDisplay, 
                      button: { ...config.formDisplay.button, text: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emoji do Botão
                </label>
                <input
                  type="text"
                  value={config.formDisplay.button.emoji}
                  onChange={(e) => setConfig({
                    ...config,
                    formDisplay: { 
                      ...config.formDisplay, 
                      button: { ...config.formDisplay.button, emoji: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}