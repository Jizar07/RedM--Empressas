'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, RefreshCw, ChevronUp, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { useServer } from '../contexts/ServerContext';
import { useTranslation } from '../hooks/useTranslation';

interface RegistrationFunction {
  id: string;
  displayName: string;
  discordRoleId: string;
  discordRoleName: string;
  description?: string;
  order: number;
  active: boolean;
  categoryId?: string;
  categoryName?: string;
  channelEmojiPrefix?: string;
  channelPermissions?: {
    channelTopic?: string;
    allowedRoles?: string[];
  };
}

interface RegistrationConfig {
  formId: string;
  functions: RegistrationFunction[];
  settings: {
    oneTimeOnly: boolean;
    requiresVerification: boolean;
    welcomeMessage: string;
    channelId?: string;
    embedColor?: string;
    serverIP?: string;
    serverPort?: string;
  };
  command: {
    name: string;
    description: string;
    permissions: string;
  };
  formDisplay: {
    title: string;
    description: string;
    footerText: string;
    embedColor: string;
    button: {
      text: string;
      emoji: string;
      style: string;
    };
  };
  steps: {
    step1: {
      modalTitle: string;
      nameLabel: string;
      namePlaceholder: string;
      pomboLabel: string;
      pomboPlaceholder: string;
    };
    step2: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
    step3: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
  };
  postRegistration: {
    nicknameFormat: string;
    sendDM: boolean;
    dmTitle: string;
    dmMessage: string;
    assignRoles: boolean;
    welcomeChannelMessage: boolean;
    createChannel: boolean;
    channelNameFormat: string;
  };
  messages: {
    alreadyRegistered: string;
    sessionExpired: string;
    registrationSuccess: string;
    errorGeneric: string;
    permissionDenied: string;
  };
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
  memberCount: number;
}

interface DiscordCategory {
  id: string;
  name: string;
  position: number;
  channelCount: number;
}

export default function RegistrationSettings() {
  const { selectedServerId } = useServer();
  const { t } = useTranslation();
  const [config, setConfig] = useState<RegistrationConfig | null>(null);
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [discordCategories, setDiscordCategories] = useState<DiscordCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [showAddFunction, setShowAddFunction] = useState(false);
  const [editingFunction, setEditingFunction] = useState<RegistrationFunction | null>(null);
  const [activeTab, setActiveTab] = useState<'command' | 'display' | 'steps' | 'post' | 'functions'>('command');
  const [newFunction, setNewFunction] = useState<Partial<RegistrationFunction>>({
    displayName: '',
    discordRoleId: '',
    description: '',
    active: true,
    categoryId: '',
    channelEmojiPrefix: '',
    channelPermissions: {
      allowedRoles: [],
      channelTopic: ''
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (selectedServerId) {
      fetchDiscordRoles();
      fetchDiscordCategories();
    } else {
      // Clear roles and categories when no server is selected
      setDiscordRoles([]);
      setDiscordCategories([]);
      setRolesError(null);
    }
  }, [selectedServerId]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/registration/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscordRoles = async () => {
    if (!selectedServerId) {
      setRolesError('No server selected');
      return;
    }

    setLoadingRoles(true);
    setRolesError(null);

    try {
      const response = await fetch(`http://localhost:3050/api/registration/discord/roles?guildId=${selectedServerId}`);

      if (response.ok) {
        const roles = await response.json();
        setDiscordRoles(roles);
        console.log(`Loaded ${roles.length} roles from server ${selectedServerId}`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setRolesError(errorData.error || `HTTP ${response.status}`);
        console.error('Failed to fetch Discord roles:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching Discord roles:', error);
      setRolesError('Network error - check if backend is running');
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchDiscordCategories = async () => {
    if (!selectedServerId) {
      console.log('No server selected, skipping categories fetch');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3050/api/registration/discord/categories?guildId=${selectedServerId}`);

      if (response.ok) {
        const categories = await response.json();
        setDiscordCategories(categories);
        console.log(`Loaded ${categories.length} categories from server ${selectedServerId}`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch Discord categories:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching Discord categories:', error);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('http://localhost:3050/api/registration/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        alert(t('registration.configurationSaved'));
      } else {
        alert(t('registration.failedToSaveConfiguration'));
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert(t('registration.errorSavingConfiguration'));
    } finally {
      setSaving(false);
    }
  };

  const addFunction = async () => {
    if (!config || !newFunction.displayName || !newFunction.discordRoleId) {
      alert(t('registration.fillRequiredFields'));
      return;
    }

    const selectedRole = discordRoles.find(r => r.id === newFunction.discordRoleId);
    if (!selectedRole) return;

    const selectedCategory = newFunction.categoryId ? discordCategories.find(c => c.id === newFunction.categoryId) : undefined;

    const func: RegistrationFunction = {
      id: `func_${Date.now()}`,
      displayName: newFunction.displayName,
      discordRoleId: newFunction.discordRoleId,
      discordRoleName: selectedRole.name,
      description: newFunction.description,
      order: config.functions.length,
      active: newFunction.active !== false,
      categoryId: newFunction.categoryId || undefined,
      categoryName: selectedCategory?.name || undefined,
      channelEmojiPrefix: newFunction.channelEmojiPrefix || undefined,
      channelPermissions: newFunction.channelPermissions || {
        allowedRoles: [],
        channelTopic: ''
      }
    };

    const updatedConfig = {
      ...config,
      functions: [...config.functions, func]
    };

    setConfig(updatedConfig);

    // Auto-save after adding function
    try {
      const response = await fetch('http://localhost:3050/api/registration/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        console.log(t('registration.functionSavedAutomatically'));
      } else {
        alert(t('registration.failedToSaveFunction'));
      }
    } catch (error) {
      console.error('Error auto-saving function:', error);
      alert(t('registration.errorSavingFunction'));
    }

    setNewFunction({
      displayName: '',
      discordRoleId: '',
      description: '',
        active: true,
      categoryId: '',
      channelEmojiPrefix: '',
      channelPermissions: {
        allowedRoles: [],
        channelTopic: ''
      }
    });
    setShowAddFunction(false);
  };

  const removeFunction = async (id: string) => {
    if (!config) return;
    
    const updatedConfig = {
      ...config,
      functions: config.functions.filter(f => f.id !== id)
    };
    
    setConfig(updatedConfig);

    // Auto-save after removing function
    try {
      const response = await fetch('http://localhost:3050/api/registration/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        console.log(t('registration.functionRemovedAndSaved'));
      } else {
        alert(t('registration.failedToSaveAfterRemoval'));
      }
    } catch (error) {
      console.error('Error auto-saving after removal:', error);
      alert(t('registration.errorSavingAfterRemoval'));
    }
  };

  const startEditFunction = (func: RegistrationFunction) => {
    setEditingFunction({ ...func }); // Create a copy to avoid direct mutation
    setShowAddFunction(false);
  };

  const cancelEdit = () => {
    setEditingFunction(null);
  };

  const saveEditFunction = async () => {
    if (!config || !editingFunction) return;

    const selectedRole = discordRoles.find(r => r.id === editingFunction.discordRoleId);
    if (!selectedRole) return;

    const selectedCategory = editingFunction.categoryId ? discordCategories.find(c => c.id === editingFunction.categoryId) : undefined;

    const updatedFunction = {
      ...editingFunction,
      discordRoleName: selectedRole.name,
      categoryName: selectedCategory?.name || undefined,
      channelPermissions: editingFunction.channelPermissions || {
        allowedRoles: [],
        channelTopic: ''
      }
    };

    const updatedConfig = {
      ...config,
      functions: config.functions.map(f => f.id === editingFunction.id ? updatedFunction : f)
    };

    setConfig(updatedConfig);

    // Auto-save after editing function
    try {
      const response = await fetch('http://localhost:3050/api/registration/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        console.log(t('registration.functionEditedAndSaved'));
        setEditingFunction(null);
      } else {
        alert(t('registration.failedToSaveEditedFunction'));
      }
    } catch (error) {
      console.error('Error auto-saving edited function:', error);
      alert(t('registration.errorSavingEditedFunction'));
    }
  };

  const toggleFunction = async (id: string) => {
    if (!config) return;
    
    const updatedConfig = {
      ...config,
      functions: config.functions.map(f => 
        f.id === id ? { ...f, active: !f.active } : f
      )
    };
    
    setConfig(updatedConfig);

    // Auto-save after toggle
    try {
      const response = await fetch('http://localhost:3050/api/registration/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        console.log(t('registration.functionToggleSaved'));
      }
    } catch (error) {
      console.error(t('registration.errorSavingToggle'), error);
    }
  };

  const moveFunction = async (id: string, direction: 'up' | 'down') => {
    if (!config) return;
    
    const index = config.functions.findIndex(f => f.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.functions.length) return;
    
    const newFunctions = [...config.functions];
    [newFunctions[index], newFunctions[newIndex]] = [newFunctions[newIndex], newFunctions[index]];
    
    // Update order values
    newFunctions.forEach((f, i) => f.order = i);
    
    const updatedConfig = {
      ...config,
      functions: newFunctions
    };
    
    setConfig(updatedConfig);

    // Auto-save after reordering
    try {
      const response = await fetch('http://localhost:3050/api/registration/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        console.log(t('registration.functionOrderSaved'));
      }
    } catch (error) {
      console.error(t('registration.errorSavingOrder'), error);
    }
  };

  if (!selectedServerId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-2">{t('registration.selectServerMessage')}</div>
          <div className="text-sm text-gray-400">{t('registration.useServerDropdown')}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('registration.loadingConfiguration')}</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{t('registration.failedToLoadConfiguration')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">{t('registration.title')}</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => { fetchDiscordRoles(); fetchDiscordCategories(); }}
              disabled={loadingRoles || !selectedServerId}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loadingRoles ? 'animate-spin' : ''}`} />
              <span>{loadingRoles ? t('common.loading') : t('registration.refreshDiscordData')}</span>
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? t('registration.saving') : t('registration.saveConfiguration')}</span>
            </button>
          </div>
        </div>

        {/* Tabbed Interface */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('command')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'command' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                {t('registration.tabCommand')}
              </button>
              <button
                onClick={() => setActiveTab('display')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'display' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                {t('registration.tabDisplay')}
              </button>
              <button
                onClick={() => setActiveTab('steps')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'steps' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                {t('registration.tabSteps')}
              </button>
              <button
                onClick={() => setActiveTab('post')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'post' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                {t('registration.tabPost')}
              </button>
              <button
                onClick={() => setActiveTab('functions')}
                className={`py-2 px-1 border-b-2 ${activeTab === 'functions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap font-medium text-sm`}>
                {t('registration.tabFunctions')}
              </button>
            </nav>
          </div>
        </div>

        {/* Command Settings Tab */}
        {activeTab === 'command' && (
        <div className="space-y-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900">{t('registration.commandConfiguration')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.commandName')}
              </label>
              <input
                type="text"
                value={config.command?.name || 'register-setup'}
                onChange={(e) => setConfig({
                  ...config,
                  command: { ...config.command, name: e.target.value, description: config.command?.description || 'Deploy the registration form to a channel', permissions: config.command?.permissions || 'Administrator' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="register-setup"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.commandDescription')}
              </label>
              <input
                type="text"
                value={config.command?.description || 'Deploy the registration form to a channel'}
                onChange={(e) => setConfig({
                  ...config,
                  command: { ...config.command, name: config.command?.name || 'register-setup', description: e.target.value, permissions: config.command?.permissions || 'Administrator' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Deploy the registration form to a channel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.requiredPermission')}
              </label>
              <select
                value={config.command?.permissions || 'Administrator'}
                onChange={(e) => setConfig({
                  ...config,
                  command: { ...config.command, name: config.command?.name || 'register-setup', description: config.command?.description || 'Deploy the registration form to a channel', permissions: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Administrator">{t('registration.permissionAdministrator')}</option>
                <option value="ManageGuild">{t('registration.permissionManageGuild')}</option>
                <option value="ManageRoles">{t('registration.permissionManageRoles')}</option>
                <option value="ModerateMembers">{t('registration.permissionModerateMembers')}</option>
              </select>
            </div>
          </div>
        </div>
        )}

        {/* Form Display Settings */}
        {activeTab === 'display' && (
        <div className="space-y-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900">{t('registration.formDisplayConfiguration')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.embedTitle')}
              </label>
              <input
                type="text"
                value={config.formDisplay?.title || '🎮 Registro Familia BlackGolden'}
                onChange={(e) => setConfig({
                  ...config,
                  formDisplay: { 
                    ...config.formDisplay, 
                    title: e.target.value,
                    description: config.formDisplay?.description || '',
                    footerText: config.formDisplay?.footerText || '',
                    embedColor: config.formDisplay?.embedColor || '#FF0000',
                    button: config.formDisplay?.button || { text: 'Registrar', emoji: '📝', style: 'Primary' }
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.footerText')}
              </label>
              <input
                type="text"
                value={config.formDisplay?.footerText || 'Familia BlackGolden • Sistema de Registro'}
                onChange={(e) => setConfig({
                  ...config,
                  formDisplay: { 
                    ...config.formDisplay, 
                    title: config.formDisplay?.title || '🎮 Registro Familia BlackGolden',
                    description: config.formDisplay?.description || '',
                    footerText: e.target.value,
                    embedColor: config.formDisplay?.embedColor || '#FF0000',
                    button: config.formDisplay?.button || { text: 'Registrar', emoji: '📝', style: 'Primary' }
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('registration.embedDescription')}
            </label>
            <textarea
              value={config.formDisplay?.description || '**Bem-vindo ao Servidor Familia BlackGolden!**\n\nPara ter acesso ao servidor, você precisa completar o processo de registro.\n\n**Informações Necessárias:**\n• Seu nome completo no condado\n• Seu Pombo\n• Sua função/trabalho no servidor\n• Quem te convidou para a Familia\n\nClique no botão **Registrar** abaixo para começar.'}
              onChange={(e) => setConfig({
                ...config,
                formDisplay: {
                  ...config.formDisplay,
                  title: config.formDisplay?.title || '🎮 Registro Familia BlackGolden',
                  description: e.target.value,
                  footerText: config.formDisplay?.footerText || 'Familia BlackGolden • Sistema de Registro',
                  embedColor: config.formDisplay?.embedColor || '#FF0000',
                  button: config.formDisplay?.button || { text: 'Registrar', emoji: '📝', style: 'Primary' }
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={8}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.buttonText')}
              </label>
              <input
                type="text"
                value={config.formDisplay?.button?.text || 'Registrar'}
                onChange={(e) => setConfig({
                  ...config,
                  formDisplay: { 
                    ...config.formDisplay, 
                    title: config.formDisplay?.title || '🎮 Registro Familia BlackGolden',
                    description: config.formDisplay?.description || '',
                    footerText: config.formDisplay?.footerText || 'Familia BlackGolden • Sistema de Registro',
                    embedColor: config.formDisplay?.embedColor || '#FF0000',
                    button: { 
                      ...config.formDisplay?.button, 
                      text: e.target.value,
                      emoji: config.formDisplay?.button?.emoji || '📝',
                      style: config.formDisplay?.button?.style || 'Primary'
                    }
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.buttonEmoji')}
              </label>
              <input
                type="text"
                value={config.formDisplay?.button?.emoji || '📝'}
                onChange={(e) => setConfig({
                  ...config,
                  formDisplay: {
                    ...config.formDisplay,
                    title: config.formDisplay?.title || '🎮 Registro Familia BlackGolden',
                    description: config.formDisplay?.description || '',
                    footerText: config.formDisplay?.footerText || 'Familia BlackGolden • Sistema de Registro',
                    embedColor: config.formDisplay?.embedColor || '#FF0000',
                    button: {
                      ...config.formDisplay?.button,
                      text: config.formDisplay?.button?.text || 'Registrar',
                      emoji: e.target.value,
                      style: config.formDisplay?.button?.style || 'Primary'
                    }
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.buttonStyle')}
              </label>
              <select
                value={config.formDisplay?.button?.style || 'Primary'}
                onChange={(e) => setConfig({
                  ...config,
                  formDisplay: {
                    ...config.formDisplay,
                    title: config.formDisplay?.title || '🎮 Registro Familia BlackGolden',
                    description: config.formDisplay?.description || '',
                    footerText: config.formDisplay?.footerText || 'Familia BlackGolden • Sistema de Registro',
                    embedColor: config.formDisplay?.embedColor || '#FF0000',
                    button: {
                      ...config.formDisplay?.button,
                      text: config.formDisplay?.button?.text || 'Registrar',
                      emoji: config.formDisplay?.button?.emoji || '📝',
                      style: e.target.value
                    }
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Primary">{t('registration.buttonStylePrimary')}</option>
                <option value="Secondary">{t('registration.buttonStyleSecondary')}</option>
                <option value="Success">{t('registration.buttonStyleSuccess')}</option>
                <option value="Danger">{t('registration.buttonStyleDanger')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.embedColor')}
              </label>
              <input
                type="color"
                value={config.formDisplay?.embedColor || '#FF0000'}
                onChange={(e) => setConfig({
                  ...config,
                  formDisplay: { 
                    ...config.formDisplay, 
                    title: config.formDisplay?.title || '🎮 Registro Familia BlackGolden',
                    description: config.formDisplay?.description || '',
                    footerText: config.formDisplay?.footerText || 'Familia BlackGolden • Sistema de Registro',
                    embedColor: e.target.value,
                    button: config.formDisplay?.button || { text: 'Registrar', emoji: '📝', style: 'Primary' }
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
        )}

        {/* Registration Steps Configuration */}
        {activeTab === 'steps' && (
        <div className="space-y-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900">{t('registration.stepsConfiguration')}</h3>

          {/* Step 1 Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-800 mb-4">{t('registration.step1Title')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('registration.modalTitle')}</label>
                <input
                  type="text"
                  value={config.steps?.step1?.modalTitle || 'Familia BlackGolden - Passo 1/3'}
                  onChange={(e) => setConfig({
                    ...config,
                    steps: {
                      ...config.steps,
                      step1: {
                        ...config.steps?.step1,
                        modalTitle: e.target.value,
                        nameLabel: config.steps?.step1?.nameLabel || 'Nome completo no Condado',
                        namePlaceholder: config.steps?.step1?.namePlaceholder || 'Digite seu nome completo no condado',
                        pomboLabel: config.steps?.step1?.pomboLabel || 'Pombo',
                        pomboPlaceholder: config.steps?.step1?.pomboPlaceholder || 'Digite seu pombo'
                      },
                      step2: config.steps?.step2 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' },
                      step3: config.steps?.step3 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('registration.nameLabel')}</label>
                <input
                  type="text"
                  value={config.steps?.step1?.nameLabel || 'Nome completo no Condado'}
                  onChange={(e) => setConfig({
                    ...config,
                    steps: {
                      ...config.steps,
                      step1: {
                        ...config.steps?.step1,
                        modalTitle: config.steps?.step1?.modalTitle || 'Familia BlackGolden - Passo 1/3',
                        nameLabel: e.target.value,
                        namePlaceholder: config.steps?.step1?.namePlaceholder || 'Digite seu nome completo no condado',
                        pomboLabel: config.steps?.step1?.pomboLabel || 'Pombo',
                        pomboPlaceholder: config.steps?.step1?.pomboPlaceholder || 'Digite seu pombo'
                      },
                      step2: config.steps?.step2 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' },
                      step3: config.steps?.step3 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('registration.namePlaceholder')}</label>
                <input
                  type="text"
                  value={config.steps?.step1?.namePlaceholder || 'Digite seu nome completo no condado'}
                  onChange={(e) => setConfig({
                    ...config,
                    steps: {
                      ...config.steps,
                      step1: {
                        ...config.steps?.step1,
                        modalTitle: config.steps?.step1?.modalTitle || 'Familia BlackGolden - Passo 1/3',
                        nameLabel: config.steps?.step1?.nameLabel || 'Nome completo no Condado',
                        namePlaceholder: e.target.value,
                        pomboLabel: config.steps?.step1?.pomboLabel || 'Pombo',
                        pomboPlaceholder: config.steps?.step1?.pomboPlaceholder || 'Digite seu pombo'
                      },
                      step2: config.steps?.step2 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' },
                      step3: config.steps?.step3 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('registration.pomboLabel')}</label>
                <input
                  type="text"
                  value={config.steps?.step1?.pomboLabel || 'Pombo'}
                  onChange={(e) => setConfig({
                    ...config,
                    steps: {
                      ...config.steps,
                      step1: {
                        ...config.steps?.step1,
                        modalTitle: config.steps?.step1?.modalTitle || 'Familia BlackGolden - Passo 1/3',
                        nameLabel: config.steps?.step1?.nameLabel || 'Nome completo no Condado',
                        namePlaceholder: config.steps?.step1?.namePlaceholder || 'Digite seu nome completo no condado',
                        pomboLabel: e.target.value,
                        pomboPlaceholder: config.steps?.step1?.pomboPlaceholder || 'Digite seu pombo'
                      },
                      step2: config.steps?.step2 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' },
                      step3: config.steps?.step3 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Step 2 Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-800 mb-4">{t('registration.step2Title')}</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('registration.embedTitleField')}</label>
                <input
                  type="text"
                  value={config.steps?.step2?.embedTitle || 'Passo 2/3 - Sua função na Familia'}
                  onChange={(e) => setConfig({
                    ...config,
                    steps: {
                      ...config.steps,
                      step1: config.steps?.step1 || { modalTitle: '', nameLabel: '', namePlaceholder: '', pomboLabel: '', pomboPlaceholder: '' },
                      step2: {
                        ...config.steps?.step2,
                        embedTitle: e.target.value,
                        embedDescription: config.steps?.step2?.embedDescription || 'Selecione sua função/trabalho na Familia:',
                        dropdownPlaceholder: config.steps?.step2?.dropdownPlaceholder || 'Selecione sua função/trabalho na Familia'
                      },
                      step3: config.steps?.step3 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('registration.embedDescriptionField')}</label>
                <textarea
                  value={config.steps?.step2?.embedDescription || 'Selecione sua função/trabalho na Familia:'}
                  onChange={(e) => setConfig({
                    ...config,
                    steps: {
                      ...config.steps,
                      step1: config.steps?.step1 || { modalTitle: '', nameLabel: '', namePlaceholder: '', pomboLabel: '', pomboPlaceholder: '' },
                      step2: {
                        ...config.steps?.step2,
                        embedTitle: config.steps?.step2?.embedTitle || 'Passo 2/3 - Sua função na Familia',
                        embedDescription: e.target.value,
                        dropdownPlaceholder: config.steps?.step2?.dropdownPlaceholder || 'Selecione sua função/trabalho na Familia'
                      },
                      step3: config.steps?.step3 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Step 3 Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-800 mb-4">{t('registration.step3Title')}</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('registration.embedTitleField')}</label>
                <input
                  type="text"
                  value={config.steps?.step3?.embedTitle || 'Passo 3/3 - Quem te convidou?'}
                  onChange={(e) => setConfig({
                    ...config,
                    steps: {
                      ...config.steps,
                      step1: config.steps?.step1 || { modalTitle: '', nameLabel: '', namePlaceholder: '', pomboLabel: '', pomboPlaceholder: '' },
                      step2: config.steps?.step2 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' },
                      step3: {
                        ...config.steps?.step3,
                        embedTitle: e.target.value,
                        embedDescription: config.steps?.step3?.embedDescription || 'Selecione quem te convidou para a Familia BlackGolden:\n\n✨ **Digite para buscar** - Você pode digitar o nome da pessoa para encontrá-la rapidamente!',
                        dropdownPlaceholder: config.steps?.step3?.dropdownPlaceholder || 'Selecione quem te convidou para a Familia'
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('registration.embedDescriptionField')}</label>
                <textarea
                  value={config.steps?.step3?.embedDescription || 'Selecione quem te convidou para a Familia BlackGolden:\n\n✨ **Digite para buscar** - Você pode digitar o nome da pessoa para encontrá-la rapidamente!'}
                  onChange={(e) => setConfig({
                    ...config,
                    steps: {
                      ...config.steps,
                      step1: config.steps?.step1 || { modalTitle: '', nameLabel: '', namePlaceholder: '', pomboLabel: '', pomboPlaceholder: '' },
                      step2: config.steps?.step2 || { embedTitle: '', embedDescription: '', dropdownPlaceholder: '' },
                      step3: {
                        ...config.steps?.step3,
                        embedTitle: config.steps?.step3?.embedTitle || 'Passo 3/3 - Quem te convidou?',
                        embedDescription: e.target.value,
                        dropdownPlaceholder: config.steps?.step3?.dropdownPlaceholder || 'Selecione quem te convidou para a Familia'
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Post-Registration, Messages, and Legacy Combined */}
        {activeTab === 'post' && (
        <>
        <div className="space-y-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900">{t('registration.postRegistrationActions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('registration.nicknameFormat')}
                </label>
                <input
                  type="text"
                  value={config.postRegistration?.nicknameFormat || '{ingameName} | {pombo}'}
                  onChange={(e) => setConfig({
                    ...config,
                    postRegistration: {
                      ...config.postRegistration,
                      nicknameFormat: e.target.value,
                      sendDM: config.postRegistration?.sendDM ?? true,
                      dmTitle: config.postRegistration?.dmTitle || '',
                      dmMessage: config.postRegistration?.dmMessage || '',
                      assignRoles: config.postRegistration?.assignRoles ?? true,
                      welcomeChannelMessage: config.postRegistration?.welcomeChannelMessage ?? false
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-sm text-gray-500">{t('registration.availableVariables')}</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.postRegistration?.sendDM ?? true}
                    onChange={(e) => setConfig({
                      ...config,
                      postRegistration: {
                        ...config.postRegistration,
                        nicknameFormat: config.postRegistration?.nicknameFormat || '{ingameName} | {pombo}',
                        sendDM: e.target.checked,
                        dmTitle: config.postRegistration?.dmTitle || '',
                        dmMessage: config.postRegistration?.dmMessage || '',
                        assignRoles: config.postRegistration?.assignRoles ?? true,
                        welcomeChannelMessage: config.postRegistration?.welcomeChannelMessage ?? false
                      }
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('registration.sendDirectMessage')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.postRegistration?.assignRoles ?? true}
                    onChange={(e) => setConfig({
                      ...config,
                      postRegistration: {
                        ...config.postRegistration,
                        nicknameFormat: config.postRegistration?.nicknameFormat || '{ingameName} | {pombo}',
                        sendDM: config.postRegistration?.sendDM ?? true,
                        dmTitle: config.postRegistration?.dmTitle || '',
                        dmMessage: config.postRegistration?.dmMessage || '',
                        assignRoles: e.target.checked,
                        welcomeChannelMessage: config.postRegistration?.welcomeChannelMessage ?? false
                      }
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('registration.automaticallyAssignRoles')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.postRegistration?.welcomeChannelMessage ?? false}
                    onChange={(e) => setConfig({
                      ...config,
                      postRegistration: {
                        ...config.postRegistration,
                        nicknameFormat: config.postRegistration?.nicknameFormat || '{ingameName} | {pombo}',
                        sendDM: config.postRegistration?.sendDM ?? true,
                        dmTitle: config.postRegistration?.dmTitle || '',
                        dmMessage: config.postRegistration?.dmMessage || '',
                        assignRoles: config.postRegistration?.assignRoles ?? true,
                        welcomeChannelMessage: e.target.checked,
                        createChannel: config.postRegistration?.createChannel ?? false,
                        channelNameFormat: config.postRegistration?.channelNameFormat || '{ingameName}'
                      }
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('registration.sendWelcomeChannelMessage')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.postRegistration?.createChannel ?? false}
                    onChange={(e) => setConfig({
                      ...config,
                      postRegistration: {
                        ...config.postRegistration,
                        nicknameFormat: config.postRegistration?.nicknameFormat || '{ingameName} | {pombo}',
                        sendDM: config.postRegistration?.sendDM ?? true,
                        dmTitle: config.postRegistration?.dmTitle || '',
                        dmMessage: config.postRegistration?.dmMessage || '',
                        assignRoles: config.postRegistration?.assignRoles ?? true,
                        welcomeChannelMessage: config.postRegistration?.welcomeChannelMessage ?? false,
                        createChannel: e.target.checked,
                        channelNameFormat: config.postRegistration?.channelNameFormat || '{ingameName}'
                      }
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('registration.createPersonalChannel')}</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('registration.dmTitle')}
                </label>
                <input
                  type="text"
                  value={config.postRegistration?.dmTitle || 'Bem-vindo à Familia BlackGolden!'}
                  onChange={(e) => setConfig({
                    ...config,
                    postRegistration: {
                      ...config.postRegistration,
                      nicknameFormat: config.postRegistration?.nicknameFormat || '{ingameName} | {pombo}',
                      sendDM: config.postRegistration?.sendDM ?? true,
                      dmTitle: e.target.value,
                      dmMessage: config.postRegistration?.dmMessage || '',
                      assignRoles: config.postRegistration?.assignRoles ?? true,
                      welcomeChannelMessage: config.postRegistration?.welcomeChannelMessage ?? false
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('registration.channelNameFormat')}
                </label>
                <input
                  type="text"
                  value={config.postRegistration?.channelNameFormat || '{ingameName}'}
                  onChange={(e) => setConfig({
                    ...config,
                    postRegistration: {
                      ...config.postRegistration,
                      nicknameFormat: config.postRegistration?.nicknameFormat || '{ingameName} | {pombo}',
                      sendDM: config.postRegistration?.sendDM ?? true,
                      dmTitle: config.postRegistration?.dmTitle || 'Bem-vindo à Familia BlackGolden!',
                      dmMessage: config.postRegistration?.dmMessage || '',
                      assignRoles: config.postRegistration?.assignRoles ?? true,
                      welcomeChannelMessage: config.postRegistration?.welcomeChannelMessage ?? false,
                      createChannel: config.postRegistration?.createChannel ?? false,
                      channelNameFormat: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-sm text-gray-500">{t('registration.availableVariables')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('registration.dmMessageTemplate')}
                </label>
                <textarea
                  value={config.postRegistration?.dmMessage || 'Olá {ingameName},\n\nSeu registro como **{functionName}** foi aprovado!\n\nAgora você tem acesso aos canais específicos da sua função.\n\n**Conexão com o Servidor:**\nIP: {serverIP}:{serverPort}\nComando: `connect {serverIP}:{serverPort}`\n\nAproveite seu tempo na Familia BlackGolden!'}
                  onChange={(e) => setConfig({
                    ...config,
                    postRegistration: {
                      ...config.postRegistration,
                      nicknameFormat: config.postRegistration?.nicknameFormat || '{ingameName} | {pombo}',
                      sendDM: config.postRegistration?.sendDM ?? true,
                      dmTitle: config.postRegistration?.dmTitle || 'Bem-vindo à Familia BlackGolden!',
                      dmMessage: e.target.value,
                      assignRoles: config.postRegistration?.assignRoles ?? true,
                      welcomeChannelMessage: config.postRegistration?.welcomeChannelMessage ?? false,
                      createChannel: config.postRegistration?.createChannel ?? false,
                      channelNameFormat: config.postRegistration?.channelNameFormat || '{ingameName}'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={8}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t('registration.messageVariables')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Templates */}
        <div className="space-y-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900">{t('registration.messageTemplates')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.alreadyRegisteredMessage')}
              </label>
              <input
                type="text"
                value={config.messages?.alreadyRegistered || '❌ Você já está registrado!'}
                onChange={(e) => setConfig({
                  ...config,
                  messages: {
                    ...config.messages,
                    alreadyRegistered: e.target.value,
                    sessionExpired: config.messages?.sessionExpired || '❌ Registration session expired. Please start again.',
                    registrationSuccess: config.messages?.registrationSuccess || '✅ Registro Realizado com Sucesso!',
                    errorGeneric: config.messages?.errorGeneric || '❌ An error occurred. Please try again.',
                    permissionDenied: config.messages?.permissionDenied || '❌ This is not your registration form.'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.sessionExpiredMessage')}
              </label>
              <input
                type="text"
                value={config.messages?.sessionExpired || '❌ Registration session expired. Please start again.'}
                onChange={(e) => setConfig({
                  ...config,
                  messages: {
                    ...config.messages,
                    alreadyRegistered: config.messages?.alreadyRegistered || '❌ Você já está registrado!',
                    sessionExpired: e.target.value,
                    registrationSuccess: config.messages?.registrationSuccess || '✅ Registro Realizado com Sucesso!',
                    errorGeneric: config.messages?.errorGeneric || '❌ An error occurred. Please try again.',
                    permissionDenied: config.messages?.permissionDenied || '❌ This is not your registration form.'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.registrationSuccessMessage')}
              </label>
              <input
                type="text"
                value={config.messages?.registrationSuccess || '✅ Registro Realizado com Sucesso!'}
                onChange={(e) => setConfig({
                  ...config,
                  messages: {
                    ...config.messages,
                    alreadyRegistered: config.messages?.alreadyRegistered || '❌ Você já está registrado!',
                    sessionExpired: config.messages?.sessionExpired || '❌ Registration session expired. Please start again.',
                    registrationSuccess: e.target.value,
                    errorGeneric: config.messages?.errorGeneric || '❌ An error occurred. Please try again.',
                    permissionDenied: config.messages?.permissionDenied || '❌ This is not your registration form.'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.genericErrorMessage')}
              </label>
              <input
                type="text"
                value={config.messages?.errorGeneric || '❌ An error occurred. Please try again.'}
                onChange={(e) => setConfig({
                  ...config,
                  messages: {
                    ...config.messages,
                    alreadyRegistered: config.messages?.alreadyRegistered || '❌ Você já está registrado!',
                    sessionExpired: config.messages?.sessionExpired || '❌ Registration session expired. Please start again.',
                    registrationSuccess: config.messages?.registrationSuccess || '✅ Registro Realizado com Sucesso!',
                    errorGeneric: e.target.value,
                    permissionDenied: config.messages?.permissionDenied || '❌ This is not your registration form.'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Legacy Settings (Simplified) */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">{t('registration.legacySettings')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.welcomeMessage')}
              </label>
              <textarea
                value={config.settings.welcomeMessage}
                onChange={(e) => setConfig({
                  ...config,
                  settings: { ...config.settings, welcomeMessage: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder={t('registration.placeholderWelcomeMessage')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('registration.legacyEmbedColor')}
              </label>
              <input
                type="text"
                value={config.settings.embedColor || '#FF0000'}
                onChange={(e) => setConfig({
                  ...config,
                  settings: { ...config.settings, embedColor: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="#FF0000"
              />
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Functions List */}
      {activeTab === 'functions' && (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('registration.availableFunctions')}</h3>
          <button
            onClick={() => {
              setShowAddFunction(true);
              setEditingFunction(null);
            }}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{t('registration.addFunction')}</span>
          </button>
        </div>

        {/* Add Function Form */}
        {showAddFunction && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.displayName')}
                </label>
                <input
                  type="text"
                  value={newFunction.displayName}
                  onChange={(e) => setNewFunction({ ...newFunction, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('registration.placeholderPoliceOfficer')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.discordRole')}
                </label>
                <select
                  value={newFunction.discordRoleId}
                  onChange={(e) => setNewFunction({ ...newFunction, discordRoleId: e.target.value })}
                  disabled={loadingRoles || !selectedServerId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingRoles ? t('registration.loadingRoles') : !selectedServerId ? t('registration.selectServerFirst') : discordRoles.length === 0 ? t('registration.noRolesFound') : t('registration.selectRole')}
                  </option>
                  {discordRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      @{role.name} ({role.memberCount} {t('common.loading').toLowerCase() === 'loading...' ? 'members' : 'membros'})
                    </option>
                  ))}
                </select>
                {rolesError && (
                  <div className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{rolesError}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.descriptionOptional')}
                </label>
                <input
                  type="text"
                  value={newFunction.description}
                  onChange={(e) => setNewFunction({ ...newFunction, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('registration.placeholderBriefDescription')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.channelCategoryOptional')}
                </label>
                <select
                  value={newFunction.categoryId || ''}
                  onChange={(e) => setNewFunction({ ...newFunction, categoryId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('registration.noCategory')}</option>
                  {discordCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {t('registration.categoryWithChannels').replace('{name}', category.name).replace('{count}', category.channelCount.toString())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.channelEmojiPrefixOptional')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFunction.channelEmojiPrefix || ''}
                    onChange={(e) => setNewFunction({ ...newFunction, channelEmojiPrefix: e.target.value })}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      setNewFunction({ ...newFunction, channelEmojiPrefix: pastedText });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder={t('registration.placeholderEnterEmoji')}
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => setNewFunction({ ...newFunction, channelEmojiPrefix: (newFunction.channelEmojiPrefix || '') + '・' })}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    title={t('registration.addMiddleDot')}
                  >
                    +・
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">{t('registration.emojiPrefixHelp')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.channelTopicTemplateOptional')}
                </label>
                <input
                  type="text"
                  value={newFunction.channelPermissions?.channelTopic || ''}
                  onChange={(e) => setNewFunction({
                    ...newFunction,
                    channelPermissions: {
                      ...newFunction.channelPermissions,
                      allowedRoles: newFunction.channelPermissions?.allowedRoles || [],
                      channelTopic: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('registration.placeholderChannelTopic')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.allowedRoles')}
                </label>
                <select
                  multiple
                  value={newFunction.channelPermissions?.allowedRoles || []}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setNewFunction({ 
                      ...newFunction, 
                      channelPermissions: {
                        ...newFunction.channelPermissions,
                        allowedRoles: selectedOptions,
                        channelTopic: newFunction.channelPermissions?.channelTopic || ''
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  size={4}
                >
                  {discordRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      @{role.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">{t('registration.allowedRolesHelp')}</p>
              </div>
              <div className="flex items-end space-x-4">
                <button
                  onClick={addFunction}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  {t('registration.add')}
                </button>
                <button
                  onClick={() => setShowAddFunction(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Function Form */}
        {editingFunction && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-md font-medium text-blue-800 mb-4">{t('registration.editFunctionTitle').replace('{name}', editingFunction.displayName)}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.displayName')}
                </label>
                <input
                  type="text"
                  value={editingFunction.displayName}
                  onChange={(e) => setEditingFunction({ ...editingFunction, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('registration.placeholderPoliceOfficer')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.discordRole')}
                </label>
                <select
                  value={editingFunction.discordRoleId}
                  onChange={(e) => setEditingFunction({ ...editingFunction, discordRoleId: e.target.value })}
                  disabled={loadingRoles || !selectedServerId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingRoles ? t('registration.loadingRoles') : !selectedServerId ? t('registration.selectServerFirst') : discordRoles.length === 0 ? t('registration.noRolesFound') : t('registration.selectRole')}
                  </option>
                  {discordRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      @{role.name} ({role.memberCount} {t('common.loading').toLowerCase() === 'loading...' ? 'members' : 'membros'})
                    </option>
                  ))}
                </select>
                {rolesError && (
                  <div className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{rolesError}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.descriptionOptional')}
                </label>
                <input
                  type="text"
                  value={editingFunction.description || ''}
                  onChange={(e) => setEditingFunction({ ...editingFunction, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('registration.placeholderBriefDescription')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.channelCategoryOptional')}
                </label>
                <select
                  value={editingFunction.categoryId || ''}
                  onChange={(e) => setEditingFunction({ ...editingFunction, categoryId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('registration.noCategory')}</option>
                  {discordCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {t('registration.categoryWithChannels').replace('{name}', category.name).replace('{count}', category.channelCount.toString())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.channelEmojiPrefixOptional')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingFunction.channelEmojiPrefix || ''}
                    onChange={(e) => setEditingFunction({ ...editingFunction, channelEmojiPrefix: e.target.value })}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      setEditingFunction({ ...editingFunction, channelEmojiPrefix: pastedText });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder={t('registration.placeholderEnterEmoji')}
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingFunction({ ...editingFunction, channelEmojiPrefix: (editingFunction.channelEmojiPrefix || '') + '・' })}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    title={t('registration.addMiddleDot')}
                  >
                    +・
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">{t('registration.emojiPrefixHelp')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.channelTopicTemplateOptional')}
                </label>
                <input
                  type="text"
                  value={editingFunction.channelPermissions?.channelTopic || ''}
                  onChange={(e) => setEditingFunction({
                    ...editingFunction,
                    channelPermissions: {
                      ...editingFunction.channelPermissions,
                      allowedRoles: editingFunction.channelPermissions?.allowedRoles || [],
                      channelTopic: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('registration.placeholderChannelTopic')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('registration.allowedRoles')}
                </label>
                <select
                  multiple
                  value={editingFunction.channelPermissions?.allowedRoles || []}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setEditingFunction({
                      ...editingFunction,
                      channelPermissions: {
                        ...editingFunction.channelPermissions,
                        allowedRoles: selectedOptions,
                        channelTopic: editingFunction.channelPermissions?.channelTopic || ''
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  size={4}
                >
                  {discordRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      @{role.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">{t('registration.allowedRolesHelp')}</p>
              </div>
              <div className="flex items-end space-x-4">
                <button
                  onClick={saveEditFunction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  {t('registration.saveChanges')}
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Functions Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registration.tableOrder')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registration.tableDisplayName')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registration.tableDiscordRole')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registration.tableCategory')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registration.tableDescription')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registration.tableApproval')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registration.tableStatus')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registration.tableActions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {config.functions.map((func, index) => (
                <tr key={func.id} className={!func.active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => moveFunction(func.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveFunction(func.id, 'down')}
                        disabled={index === config.functions.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                    {func.displayName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    @{func.discordRoleName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {func.categoryName || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {func.description || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {t('registration.autoApproved')}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => toggleFunction(func.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {func.active ? (
                        <ToggleRight className="h-6 w-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEditFunction(func)}
                        className="text-blue-500 hover:text-blue-700"
                        title={t('registration.editFunction')}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeFunction(func.id)}
                        className="text-red-500 hover:text-red-700"
                        title={t('registration.deleteFunction')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {config.functions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {t('registration.noFunctionsConfigured')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}