'use client';

import { useState, useEffect } from 'react';
import { X, Monitor, Settings, Link, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { FirmConfig, CreateFirmRequest, EndpointPreset, DEFAULT_ENDPOINT_PRESETS } from '../types/firms';

interface FirmConfigModalProps {
  firm?: FirmConfig | null;
  onSave: (firmData: CreateFirmRequest) => Promise<void>;
  onCancel: () => void;
}

export default function FirmConfigModal({ firm, onSave, onCancel }: FirmConfigModalProps) {
  const isEditing = !!firm;
  
  const [formData, setFormData] = useState<CreateFirmRequest>({
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
    }
  });
  
  const [selectedEndpointType, setSelectedEndpointType] = useState<'frontend' | 'backend' | 'custom'>('frontend');
  const [newRole, setNewRole] = useState('');
  const [endpointTest, setEndpointTest] = useState<{ loading: boolean; result?: any; error?: string }>({
    loading: false
  });
  const [discordRoles, setDiscordRoles] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  useEffect(() => {
    if (firm) {
      setFormData({
        name: firm.name,
        description: firm.description || '',
        channelId: firm.channelId,
        allowedRoles: [...firm.allowedRoles],
        monitoring: { ...firm.monitoring },
        display: firm.display ? { ...firm.display } : formData.display
      });
      setSelectedEndpointType(firm.monitoring.endpointType);
    }
    
    // Fetch Discord roles on component mount
    fetchDiscordRoles();
  }, [firm]);

  const fetchDiscordRoles = async () => {
    setRolesLoading(true);
    try {
      // Use the guild ID from the bot configuration
      const response = await fetch('http://localhost:3050/api/discord-roles/roles/1205749564775211049');
      const data = await response.json();
      
      if (data.roles) {
        setDiscordRoles(data.roles);
      }
    } catch (error) {
      console.error('Failed to fetch Discord roles:', error);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleEndpointTypeChange = (type: 'frontend' | 'backend' | 'custom') => {
    setSelectedEndpointType(type);
    const preset = DEFAULT_ENDPOINT_PRESETS.find(p => p.type === type);
    if (preset && preset.url) {
      setFormData(prev => ({
        ...prev,
        monitoring: {
          ...prev.monitoring,
          endpoint: preset.url,
          endpointType: type
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        monitoring: {
          ...prev.monitoring,
          endpointType: type
        }
      }));
    }
    setEndpointTest({ loading: false }); // Reset test result
  };

  const handleAddRole = (roleName?: string) => {
    const roleToAdd = roleName || newRole.trim();
    if (roleToAdd && !formData.allowedRoles.includes(roleToAdd)) {
      setFormData(prev => ({
        ...prev,
        allowedRoles: [...prev.allowedRoles, roleToAdd]
      }));
      setNewRole('');
      setShowRoleDropdown(false);
    } else {
    }
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.filter(role => role !== roleToRemove)
    }));
  };

  const testEndpoint = async () => {
    if (!formData.monitoring.endpoint) {
      setEndpointTest({ loading: false, error: 'No endpoint specified' });
      return;
    }

    setEndpointTest({ loading: true });
    
    try {
      const response = await fetch('/api/firms-config/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: formData.monitoring.endpoint })
      });
      
      const result = await response.json();
      setEndpointTest({ loading: false, result });
    } catch (error) {
      console.error('Endpoint test failed:', error);
      setEndpointTest({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showRoleDropdown && !target.closest('.role-dropdown-container')) {
        setShowRoleDropdown(false);
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showRoleDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.channelId.trim() || formData.allowedRoles.length === 0) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving firm:', error);
    }
  };

  const isFormValid = formData.name.trim() && formData.channelId.trim() && formData.allowedRoles.length > 0 && formData.monitoring.endpoint.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Firm' : 'Add New Firm'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firm Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Fazenda BW"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discord Channel ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.channelId}
                  onChange={(e) => setFormData(prev => ({ ...prev, channelId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="1409214475403526174"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description of this firm"
              />
            </div>
          </div>

          {/* Monitoring Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Monitoring Configuration</h3>
            
            {/* Endpoint Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {DEFAULT_ENDPOINT_PRESETS.map((preset) => (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleEndpointTypeChange(preset.type)}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedEndpointType === preset.type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      {preset.icon === 'Monitor' && <Monitor className="h-5 w-5 mb-1" />}
                      {preset.icon === 'Settings' && <Settings className="h-5 w-5 mb-1" />}
                      {preset.icon === 'Link' && <Link className="h-5 w-5 mb-1" />}
                      <div className="text-sm font-medium">{preset.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoint URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Endpoint URL <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={testEndpoint}
                  disabled={endpointTest.loading || !formData.monitoring.endpoint}
                  className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {endpointTest.loading ? 'Testing...' : 'Test Endpoint'}
                </button>
              </div>
              <input
                type="text"
                value={formData.monitoring.endpoint}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  monitoring: { ...prev.monitoring, endpoint: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="http://localhost:3051/api/webhook/channel-messages"
                readOnly={selectedEndpointType !== 'custom'}
                required
              />
              
              {/* Endpoint Test Result */}
              {endpointTest.result && (
                <div className={`mt-2 p-2 rounded text-sm ${
                  endpointTest.result.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {endpointTest.result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span>
                      {endpointTest.result.success 
                        ? `Endpoint reachable (${endpointTest.result.status})` 
                        : `Test failed: ${endpointTest.result.details || endpointTest.result.error}`}
                    </span>
                  </div>
                </div>
              )}
              
              {endpointTest.error && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Network error: {endpointTest.error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Role-Based Access */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Role-Based Access</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Discord Roles <span className="text-red-500">*</span>
              </label>
              
              {/* Add Role Interface */}
              <div className="space-y-3">
                {rolesLoading ? (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Loading Discord roles...</span>
                  </div>
                ) : (
                  <div className="relative role-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between bg-white"
                    >
                      <span className="text-gray-600">
                        {discordRoles.length > 0 ? 'Select Discord role' : 'No roles available'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    
                    {showRoleDropdown && discordRoles.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {discordRoles.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddRole(role.name);
                            }}
                            disabled={formData.allowedRoles.includes(role.name)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: role.color || '#6b7280' }}
                            ></div>
                            <span>{role.name}</span>
                            {formData.allowedRoles.includes(role.name) && (
                              <span className="text-xs text-gray-500 ml-auto">Added</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Manual role input as fallback */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Or enter role name manually"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddRole()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {/* Roles List */}
              {formData.allowedRoles.length > 0 && (
                <div className="space-y-2">
                  {formData.allowedRoles.map((role, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm text-gray-700">{role}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.allowedRoles.length === 0 && (
                <p className="text-sm text-red-600">At least one role is required</p>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Update Firm' : 'Create Firm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}