'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useServer } from '@/contexts/ServerContext';
import { X, Monitor, Settings, Link, AlertCircle, CheckCircle, ChevronDown, Palette, Eye } from 'lucide-react';
import { FirmConfig, CreateFirmRequest, EndpointPreset, DEFAULT_ENDPOINT_PRESETS } from '../types/firms';
import { TEMPLATE_PRESETS, TemplatePreset } from '../types/firmTemplates';

interface EnhancedCreateFirmRequest extends CreateFirmRequest {
  template?: {
    type: 'fazenda-bw' | 'generic' | 'custom';
    version: string;
    customConfig?: Record<string, any>;
    enabledComponents?: string[];
    componentSettings?: Record<string, any>;
  };
}

interface EnhancedFirmConfigModalProps {
  firm?: FirmConfig | null;
  onSave: (firmData: EnhancedCreateFirmRequest) => Promise<void>;
  onCancel: () => void;
}

export default function EnhancedFirmConfigModal({ firm, onSave, onCancel }: EnhancedFirmConfigModalProps) {
  const isEditing = !!firm;
  const { data: session } = useSession();
  const { selectedServerId, selectedServerName } = useServer();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<EnhancedCreateFirmRequest>({
    name: '',
    description: '',
    channelId: '',
    allowedRoles: [],
    monitoring: {
      endpoint: DEFAULT_ENDPOINT_PRESETS[0].url,
      endpointType: 'frontend',
      messageTypes: ['ALL']
    },
    display: {
      itemTranslations: {},
      bankingEnabled: true,
      theme: {
        primaryColor: '#16a34a',
        secondaryColor: '#15803d'
      }
    },
    template: {
      type: 'fazenda-bw',
      version: '1.0.0',
      enabledComponents: ['dashboard', 'inventory', 'workers', 'analytics', 'payments']
    }
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset>(TEMPLATE_PRESETS[0]);
  const [selectedEndpointType, setSelectedEndpointType] = useState<'frontend' | 'backend' | 'custom'>('frontend');
  const [discordRoles, setDiscordRoles] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [userGuilds, setUserGuilds] = useState<Array<{ id: string; name: string; icon: string; permissions: string }>>([]);
  const [selectedGuild, setSelectedGuild] = useState<{ id: string; name: string; icon: string } | null>(null);

  useEffect(() => {
    // If a server is already selected, use it directly for firm creation
    if (selectedServerId && selectedServerName) {
      const selectedGuildData = {
        id: selectedServerId,
        name: selectedServerName,
        icon: '',
        permissions: '8' // Administrator permission assumed since server is selected
      };
      setUserGuilds([selectedGuildData]);
      setSelectedGuild(selectedGuildData);
      // Fetch roles for the selected server automatically
      fetchDiscordRoles(selectedServerId);
      console.log('Using pre-selected server for firm creation:', selectedServerName);
    } else if (session?.user?.guilds) {
      // Fallback: Load all user guilds if no server pre-selected
      try {
        const adminGuilds = session.user.guilds.filter((guild: any) => {
          const permissions = parseInt(guild.permissions);
          return (permissions & 0x8) === 0x8; // Administrator permission
        });
        setUserGuilds(adminGuilds);
        console.log('Loaded guilds from session:', adminGuilds.length, 'admin guilds found');
      } catch (error) {
        console.error('Error processing session guilds:', error);
      }
    } else {
      console.log('No server selected and no guilds in session data:', session?.user);
    }
    
    if (firm) {
      setFormData({
        name: firm.name,
        description: firm.description || '',
        channelId: firm.channelId,
        allowedRoles: firm.allowedRoles,
        monitoring: firm.monitoring,
        display: firm.display,
        template: firm.template || {
          type: 'fazenda-bw',
          version: '1.0.0',
          enabledComponents: ['dashboard', 'inventory', 'workers', 'analytics', 'payments']
        }
      });
      
      // Set selected template based on firm's template
      if (firm.template) {
        const matchingPreset = TEMPLATE_PRESETS.find(p => p.type === firm.template!.type);
        if (matchingPreset) {
          setSelectedTemplate(matchingPreset);
        }
      }
      
      setSelectedEndpointType(firm.monitoring.endpointType);
    }
  }, [firm, session, selectedServerId, selectedServerName]);

  const fetchDiscordRoles = async (guildId?: string) => {
    if (!guildId && !selectedGuild) return;
    if (!session?.user?.guilds) return;
    
    try {
      setRolesLoading(true);
      const targetGuildId = guildId || selectedGuild?.id;
      
      // Find the guild in the session data
      const guild = session.user.guilds.find((g: any) => g.id === targetGuildId);
      if (!guild) {
        console.error('Guild not found in session data');
        setRolesLoading(false);
        return;
      }
      
      // For now, we'll call the backend API but with proper authentication
      // TODO: In the future, we could fetch roles directly using Discord API with NextAuth token
      const response = await fetch(`http://localhost:3050/api/registration/discord/roles?guildId=${targetGuildId}&serverId=${targetGuildId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const roles = await response.json();
        setDiscordRoles(roles);
        console.log('Fetched roles for guild:', targetGuildId, roles.length, 'roles');
      } else {
        console.error('Failed to fetch roles:', response.status, response.statusText);
        // Fallback: create mock roles if API fails
        setDiscordRoles([
          { id: '1', name: 'Admin', color: '#ff0000', position: 1, mentionable: true, hoisted: true },
          { id: '2', name: 'Moderator', color: '#00ff00', position: 2, mentionable: true, hoisted: false },
          { id: '3', name: 'Member', color: '#0000ff', position: 3, mentionable: false, hoisted: false }
        ]);
      }
    } catch (error) {
      console.error('Error fetching Discord roles:', error);
      // Fallback: create mock roles if API fails  
      setDiscordRoles([
        { id: '1', name: 'Admin', color: '#ff0000', position: 1, mentionable: true, hoisted: true },
        { id: '2', name: 'Moderator', color: '#00ff00', position: 2, mentionable: true, hoisted: false },
        { id: '3', name: 'Member', color: '#0000ff', position: 3, mentionable: false, hoisted: false }
      ]);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleTemplateSelect = (template: TemplatePreset) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      template: {
        type: template.type,
        version: template.config.version,
        enabledComponents: template.config.components
          .filter(c => c.enabled)
          .map(c => c.id),
        componentSettings: template.config.components.reduce((acc, comp) => ({
          ...acc,
          [comp.id]: comp.settings
        }), {})
      },
      display: {
        ...prev.display,
        theme: {
          ...prev.display?.theme,
          primaryColor: template.config.theme.primaryColor,
          secondaryColor: template.config.theme.secondaryColor,
          accentColor: template.config.theme.accentColor,
          backgroundColor: template.config.theme.backgroundColor,
          textColor: template.config.theme.textColor,
          iconStyle: template.config.theme.iconStyle
        }
      }
    }));
  };

  const handleComponentToggle = (componentId: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      template: {
        ...prev.template!,
        enabledComponents: enabled 
          ? [...(prev.template?.enabledComponents || []), componentId]
          : (prev.template?.enabledComponents || []).filter(id => id !== componentId)
      }
    }));
  };

  const handleAddRole = (roleId: string, roleName: string) => {
    if (roleId && !formData.allowedRoles.includes(roleId)) {
      setFormData(prev => ({
        ...prev,
        allowedRoles: [...prev.allowedRoles, roleId]
      }));
    }
    setShowRoleDropdown(false);
  };

  const handleRemoveRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.filter(id => id !== roleId)
    }));
  };

  const handleSubmit = async () => {
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving firm:', error);
    }
  };

  const getRoleName = (roleId: string) => {
    const role = discordRoles.find(r => r.id === roleId);
    return role ? role.name : roleId;
  };

  const steps = [
    { id: 1, name: 'Informações Básicas', description: 'Nome, descrição e canal' },
    { id: 2, name: 'Template', description: 'Escolha o template e componentes' },
    { id: 3, name: 'Configurações', description: 'Permissões e monitoramento' },
    { id: 4, name: 'Finalizar', description: 'Revisar e salvar' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep >= step.id 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300 text-gray-400'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{step.name}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`mx-4 h-0.5 w-16 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Fazenda do João"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Descrição opcional da empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Servidor Discord Selecionado *
                </label>
                {userGuilds.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      Nenhum servidor Discord selecionado. Para criar uma empresa:
                    </p>
                    <ul className="text-yellow-700 text-xs mt-2 list-disc list-inside">
                      <li>Primeiro selecione um servidor Discord na página principal</li>
                      <li>Depois retorne para criar uma nova empresa</li>
                      <li>A empresa será vinculada ao servidor selecionado</li>
                    </ul>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {userGuilds.map((guild) => (
                      <div
                        key={guild.id}
                        onClick={() => {
                          setSelectedGuild(guild);
                          setDiscordRoles([]);
                          setFormData(prev => ({ ...prev, allowedRoles: [] }));
                          fetchDiscordRoles(guild.id);
                        }}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedGuild?.id === guild.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {guild.icon ? (
                            <img
                              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                              alt={guild.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-gray-600 text-sm font-bold">
                                {guild.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{guild.name}</h4>
                            <p className="text-sm text-gray-500">ID: {guild.id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedGuild && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel ID do Discord *
                  </label>
                  <input
                    type="text"
                    value={formData.channelId}
                    onChange={(e) => setFormData(prev => ({ ...prev, channelId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="Ex: 123456789012345678"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    ID do canal que será monitorado para esta empresa no servidor <strong>{selectedGuild.name}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Escolha um Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {TEMPLATE_PRESETS.map((template) => (
                    <div
                      key={template.type}
                      onClick={() => handleTemplateSelect(template)}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                        selectedTemplate.type === template.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">{template.icon}</div>
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Component Selection */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Componentes Habilitados</h4>
                <div className="space-y-2">
                  {selectedTemplate.config.components.map((component) => (
                    <div key={component.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h5 className="font-medium text-gray-900">{component.name}</h5>
                        <p className="text-sm text-gray-600">Ordem: {component.order + 1}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.template?.enabledComponents?.includes(component.id) ?? component.enabled}
                          onChange={(e) => handleComponentToggle(component.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Customization */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Personalização do Tema</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Primária
                    </label>
                    <input
                      type="color"
                      value={formData.display?.theme?.primaryColor || selectedTemplate.config.theme.primaryColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        display: {
                          ...prev.display!,
                          theme: {
                            ...prev.display!.theme,
                            primaryColor: e.target.value,
                            secondaryColor: prev.display!.theme?.secondaryColor || selectedTemplate.config.theme.secondaryColor
                          }
                        }
                      }))}
                      className="w-full h-10 rounded border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor Secundária
                    </label>
                    <input
                      type="color"
                      value={formData.display?.theme?.secondaryColor || selectedTemplate.config.theme.secondaryColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        display: {
                          ...prev.display!,
                          theme: {
                            ...prev.display!.theme,
                            secondaryColor: e.target.value
                          }
                        }
                      }))}
                      className="w-full h-10 rounded border border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargos com Acesso
                </label>
                <div className="space-y-2">
                  {formData.allowedRoles.map((roleId) => (
                    <div key={roleId} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-900">@{getRoleName(roleId)}</span>
                      <button
                        onClick={() => handleRemoveRole(roleId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                    >
                      <span className="text-gray-500">Adicionar cargo...</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    
                    {showRoleDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {discordRoles
                          .filter(role => !formData.allowedRoles.includes(role.id))
                          .map((role) => (
                          <button
                            key={role.id}
                            onClick={() => handleAddRole(role.id, role.name)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: role.color || '#99AAB5' }}
                            />
                            <span>@{role.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint de Monitoramento
                </label>
                <select
                  value={selectedEndpointType}
                  onChange={(e) => {
                    const type = e.target.value as 'frontend' | 'backend' | 'custom';
                    setSelectedEndpointType(type);
                    const preset = DEFAULT_ENDPOINT_PRESETS.find(p => p.type === type);
                    if (preset) {
                      setFormData(prev => ({
                        ...prev,
                        monitoring: {
                          ...prev.monitoring,
                          endpointType: type,
                          endpoint: preset.url
                        }
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DEFAULT_ENDPOINT_PRESETS.map((preset) => (
                    <option key={preset.type} value={preset.type}>
                      {preset.name} - {preset.description}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEndpointType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL do Endpoint Customizado
                  </label>
                  <input
                    type="url"
                    value={formData.monitoring.endpoint}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      monitoring: { ...prev.monitoring, endpoint: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://exemplo.com/webhook"
                  />
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Revisar Configurações</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Informações Básicas</h4>
                  <p className="text-sm text-gray-600">Nome: {formData.name}</p>
                  <p className="text-sm text-gray-600">Servidor: {selectedGuild?.name}</p>
                  <p className="text-sm text-gray-600">Channel ID: {formData.channelId}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Template</h4>
                  <p className="text-sm text-gray-600">Tipo: {selectedTemplate.name}</p>
                  <p className="text-sm text-gray-600">
                    Componentes: {formData.template?.enabledComponents?.join(', ') || 'Nenhum'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Permissões</h4>
                  <p className="text-sm text-gray-600">
                    Cargos: {formData.allowedRoles.map(getRoleName).join(', ') || 'Nenhum'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Monitoramento</h4>
                  <p className="text-sm text-gray-600">Endpoint: {formData.monitoring.endpointType}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            
            {currentStep === steps.length ? (
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.channelId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Salvar Alterações' : 'Criar Empresa'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                disabled={currentStep === 1 && (!formData.name || !formData.channelId || !selectedGuild)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}