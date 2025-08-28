'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Trash2, Plus, DollarSign, MessageSquare } from 'lucide-react';

interface FarmServiceConfig {
  enabled: boolean;
  farmCost: number;
  farmProfitRequired: number;
  optimalAnimalIncome: number;
  plantPrices: {
    basic: number;
    other: number;
  };
  basicPlants: string[];
  animalTypes: string[];
  discordSettings: {
    enabled: boolean;
    channelId: string;
    embedColor: string;
    commandName: string;
    commandDescription: string;
  };
  ocrSettings: {
    enabled: boolean;
    language: string;
    preprocessImages: boolean;
  };
  fileSettings: {
    maxFileSize: number;
    allowedFormats: string[];
    retentionDays: number;
  };
  rolePermissions: {
    acceptRoles: string[];
    editRoles: string[];
    rejectRoles: string[];
  };
}

const defaultConfig: FarmServiceConfig = {
  enabled: true,
  farmCost: 90,
  farmProfitRequired: 10,
  optimalAnimalIncome: 160,
  plantPrices: {
    basic: 0.15,
    other: 0.20
  },
  basicPlants: ['Milho', 'Trigo', 'Junco'],
  animalTypes: ['Bovino', 'Avino', 'Ovino', 'Cabrino', 'Suino', 'Equino'],
  discordSettings: {
    enabled: true,
    channelId: '1404492813290442902',
    embedColor: '#00FF00',
    commandName: 'submit-service',
    commandDescription: 'Submit a completed farm service with screenshot verification'
  },
  ocrSettings: {
    enabled: true,
    language: 'por',
    preprocessImages: true
  },
  fileSettings: {
    maxFileSize: 5,
    allowedFormats: ['jpeg', 'jpg', 'png', 'gif'],
    retentionDays: 30
  },
  rolePermissions: {
    acceptRoles: ['Admin', 'Moderator'],
    editRoles: ['Admin', 'Moderator'],
    rejectRoles: ['Admin', 'Moderator']
  }
};

export default function FarmServiceSettings() {
  const [config, setConfig] = useState<FarmServiceConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPlant, setNewPlant] = useState('');
  const [newAnimal, setNewAnimal] = useState('');
  const [newFormat, setNewFormat] = useState('');
  const [newAcceptRole, setNewAcceptRole] = useState('');
  const [newEditRole, setNewEditRole] = useState('');
  const [newRejectRole, setNewRejectRole] = useState('');
  const [availableRoles, setAvailableRoles] = useState<{id: string, name: string, color: string}[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Helper function to discover backend URL
  const discoverBackendUrl = async (): Promise<string | null> => {
    const possiblePorts = [3000, 3050, 8080];
    
    for (const port of possiblePorts) {
      try {
        const testResponse = await fetch(`http://localhost:${port}/api/internal/server-status`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        
        if (testResponse.ok) {
          console.log(`✅ Found working backend on port ${port}`);
          return `http://localhost:${port}`;
        }
      } catch (err) {
        console.log(`❌ Port ${port} not responding`);
      }
    }
    
    return null;
  };

  // Load current configuration
  useEffect(() => {
    loadConfig();
    loadDiscordRoles();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const backendUrl = await discoverBackendUrl();
      if (!backendUrl) {
        setError('Discord bot backend not running. Please start the bot with "npm run dev"');
        return;
      }
      
      const response = await fetch(`${backendUrl}/api/farm-service/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...defaultConfig, ...data });
      } else {
        setError('Failed to load configuration');
      }
    } catch (err: any) {
      console.error('Error loading config:', err);
      setError(`Configuration error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscordRoles = async (retryCount = 0) => {
    try {
      setRolesLoading(true);
      setError(null);
      
      const backendUrl = await discoverBackendUrl();
      if (!backendUrl) {
        console.error('❌ No working backend found');
        setError('Discord bot backend not running. Please start the bot with "npm run dev"');
        return;
      }
      
      // Get guild ID from server status
      let guildId = '1205749564775211049'; // Fallback guild ID
      try {
        const statusResponse = await fetch(`${backendUrl}/api/internal/server-status`);
        if (statusResponse.ok) {
          const configData = await statusResponse.json();
          guildId = configData.guildId || guildId;
        }
      } catch (err) {
        console.log('⚠️ Could not get guild ID from server, using fallback');
      }
      
      console.log('🎯 Using guild ID:', guildId);
      console.log('🔍 Loading Discord roles for guild:', guildId);
      
      const response = await fetch(`${backendUrl}/api/discord-roles/roles/${guildId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Successfully loaded roles:', data.roles?.length || 0);
        setAvailableRoles(data.roles || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to load Discord roles:', response.status, errorData);
        
        if (retryCount < 2) {
          console.log(`🔄 Retrying role loading (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => loadDiscordRoles(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        
        setError(`Failed to load roles: ${errorData.error || response.statusText}`);
      }
    } catch (err: any) {
      console.error('❌ Error loading Discord roles:', err);
      
      if (retryCount < 2) {
        console.log(`🔄 Retrying role loading after error (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => loadDiscordRoles(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      setError(`Connection error: ${err.message}`);
    } finally {
      setRolesLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const backendUrl = await discoverBackendUrl();
      if (!backendUrl) {
        setError('Discord bot backend not running. Please start the bot with "npm run dev"');
        return;
      }
      
      console.log('💾 Saving configuration to:', `${backendUrl}/api/farm-service/config`);
      const response = await fetch(`${backendUrl}/api/farm-service/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        console.log('✅ Configuration saved successfully');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json().catch(() => ({}));
        console.error('❌ Failed to save configuration:', response.status, data);
        setError(data.error || `Save failed: ${response.statusText}`);
      }
    } catch (err: any) {
      console.error('❌ Connection error while saving:', err);
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
    setError(null);
    setSuccess(false);
  };

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const addBasicPlant = () => {
    if (newPlant.trim() && !config.basicPlants.includes(newPlant.trim())) {
      setConfig(prev => ({
        ...prev,
        basicPlants: [...prev.basicPlants, newPlant.trim()]
      }));
      setNewPlant('');
    }
  };

  const removeBasicPlant = (plant: string) => {
    setConfig(prev => ({
      ...prev,
      basicPlants: prev.basicPlants.filter(p => p !== plant)
    }));
  };

  const addAnimalType = () => {
    if (newAnimal.trim() && !config.animalTypes.includes(newAnimal.trim())) {
      setConfig(prev => ({
        ...prev,
        animalTypes: [...prev.animalTypes, newAnimal.trim()]
      }));
      setNewAnimal('');
    }
  };

  const removeAnimalType = (animal: string) => {
    setConfig(prev => ({
      ...prev,
      animalTypes: prev.animalTypes.filter(a => a !== animal)
    }));
  };

  const addFileFormat = () => {
    if (newFormat.trim() && !config.fileSettings.allowedFormats.includes(newFormat.trim().toLowerCase())) {
      setConfig(prev => ({
        ...prev,
        fileSettings: {
          ...prev.fileSettings,
          allowedFormats: [...prev.fileSettings.allowedFormats, newFormat.trim().toLowerCase()]
        }
      }));
      setNewFormat('');
    }
  };

  const removeFileFormat = (format: string) => {
    setConfig(prev => ({
      ...prev,
      fileSettings: {
        ...prev.fileSettings,
        allowedFormats: prev.fileSettings.allowedFormats.filter(f => f !== format)
      }
    }));
  };

  // Role management functions
  const addAcceptRole = () => {
    if (newAcceptRole && !config.rolePermissions.acceptRoles.includes(newAcceptRole)) {
      const selectedRole = availableRoles.find(role => role.name === newAcceptRole);
      if (selectedRole) {
        setConfig(prev => ({
          ...prev,
          rolePermissions: {
            ...prev.rolePermissions,
            acceptRoles: [...prev.rolePermissions.acceptRoles, selectedRole.name]
          }
        }));
        setNewAcceptRole('');
      }
    }
  };

  const removeAcceptRole = (role: string) => {
    setConfig(prev => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        acceptRoles: prev.rolePermissions.acceptRoles.filter(r => r !== role)
      }
    }));
  };

  const addEditRole = () => {
    if (newEditRole && !config.rolePermissions.editRoles.includes(newEditRole)) {
      const selectedRole = availableRoles.find(role => role.name === newEditRole);
      if (selectedRole) {
        setConfig(prev => ({
          ...prev,
          rolePermissions: {
            ...prev.rolePermissions,
            editRoles: [...prev.rolePermissions.editRoles, selectedRole.name]
          }
        }));
        setNewEditRole('');
      }
    }
  };

  const removeEditRole = (role: string) => {
    setConfig(prev => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        editRoles: prev.rolePermissions.editRoles.filter(r => r !== role)
      }
    }));
  };

  const addRejectRole = () => {
    if (newRejectRole && !config.rolePermissions.rejectRoles.includes(newRejectRole)) {
      const selectedRole = availableRoles.find(role => role.name === newRejectRole);
      if (selectedRole) {
        setConfig(prev => ({
          ...prev,
          rolePermissions: {
            ...prev.rolePermissions,
            rejectRoles: [...prev.rolePermissions.rejectRoles, selectedRole.name]
          }
        }));
        setNewRejectRole('');
      }
    }
  };

  const removeRejectRole = (role: string) => {
    setConfig(prev => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        rejectRoles: prev.rolePermissions.rejectRoles.filter(r => r !== role)
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Farm Service Settings
          </h1>
          <p className="text-gray-600">Configure farm service submission system</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetConfig}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={saveConfig}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">Settings saved successfully!</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* General Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Farm Service System</label>
              <p className="text-sm text-gray-600">Enable or disable the entire farm service system</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.enabled}
                onChange={(e) => updateConfig('enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farm Cost ($)</label>
              <input
                type="number"
                value={config.farmCost}
                onChange={(e) => updateConfig('farmCost', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Fixed cost for farm operations</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Profit ($)</label>
              <input
                type="number"
                value={config.farmProfitRequired}
                onChange={(e) => updateConfig('farmProfitRequired', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum profit farm must maintain</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Optimal Animal Income ($)</label>
              <input
                type="number"
                value={config.optimalAnimalIncome}
                onChange={(e) => updateConfig('optimalAnimalIncome', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Income from optimal age animals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plant Pricing */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Plant Pricing & Types
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Basic Plant Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={config.plantPrices.basic}
                onChange={(e) => updateConfig('plantPrices.basic', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Price per unit for basic plants</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Plant Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={config.plantPrices.other}
                onChange={(e) => updateConfig('plantPrices.other', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Price per unit for other plants</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Basic Plants</label>
            <p className="text-sm text-gray-600 mb-2">Plants that use the basic pricing</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add basic plant..."
                value={newPlant}
                onChange={(e) => setNewPlant(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBasicPlant()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addBasicPlant}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.basicPlants.map((plant) => (
                <div
                  key={plant}
                  className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{plant}</span>
                  <button
                    onClick={() => removeBasicPlant(plant)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Animal Types */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Animal Types</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Available Animal Types</label>
          <p className="text-sm text-gray-600 mb-2">Types of animals that can be delivered</p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add animal type..."
              value={newAnimal}
              onChange={(e) => setNewAnimal(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAnimalType()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addAnimalType}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.animalTypes.map((animal) => (
              <div
                key={animal}
                className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full"
              >
                <span className="text-sm">{animal}</span>
                <button
                  onClick={() => removeAnimalType(animal)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Discord Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Discord Integration
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Discord Notifications</label>
              <p className="text-sm text-gray-600">Send receipt notifications to Discord</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.discordSettings.enabled}
                onChange={(e) => updateConfig('discordSettings.enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Channel ID</label>
              <input
                type="text"
                value={config.discordSettings.channelId}
                onChange={(e) => updateConfig('discordSettings.channelId', e.target.value)}
                placeholder="1234567890123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Discord channel for receipt notifications</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Embed Color</label>
              <input
                type="text"
                value={config.discordSettings.embedColor}
                onChange={(e) => updateConfig('discordSettings.embedColor', e.target.value)}
                placeholder="#00FF00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Color for Discord embeds</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 mb-3">⚡ Discord Slash Command Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Command Name</label>
                <input
                  type="text"
                  value={config.discordSettings.commandName}
                  onChange={(e) => updateConfig('discordSettings.commandName', e.target.value)}
                  placeholder="submit-service"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Discord slash command name (e.g., /submit-service)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Command Description</label>
                <input
                  type="text"
                  value={config.discordSettings.commandDescription}
                  onChange={(e) => updateConfig('discordSettings.commandDescription', e.target.value)}
                  placeholder="Submit a completed farm service"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Description shown in Discord</p>
              </div>
            </div>
            <div className="mt-3 p-2 bg-blue-50 border-l-4 border-blue-400">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> After changing the command name, the bot needs to be restarted to register the new slash command in Discord.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">File & OCR Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable OCR Processing</label>
              <p className="text-sm text-gray-600">Automatically process screenshots with OCR</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.ocrSettings.enabled}
                onChange={(e) => updateConfig('ocrSettings.enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                value={config.fileSettings.maxFileSize}
                onChange={(e) => updateConfig('fileSettings.maxFileSize', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OCR Language</label>
              <select
                value={config.ocrSettings.language}
                onChange={(e) => updateConfig('ocrSettings.language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="por">Portuguese</option>
                <option value="eng">English</option>
                <option value="spa">Spanish</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File Retention (Days)</label>
              <input
                type="number"
                value={config.fileSettings.retentionDays}
                onChange={(e) => updateConfig('fileSettings.retentionDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowed File Formats</label>
            <p className="text-sm text-gray-600 mb-2">Accepted screenshot file formats</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add file format (e.g., webp)"
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFileFormat()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addFileFormat}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.fileSettings.allowedFormats.map((format) => (
                <div
                  key={format}
                  className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{format}</span>
                  <button
                    onClick={() => removeFileFormat(format)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          🔐 Role Permissions
        </h2>
        <p className="text-sm text-gray-600 mb-4">Configure which Discord roles can accept, edit, or reject farm service submissions requiring admin approval.</p>
        
        {/* Role Loading Status */}
        {rolesLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-blue-800">Loading Discord roles...</span>
          </div>
        )}
        
        {!rolesLoading && availableRoles.length === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-yellow-800">⚠️ No Discord roles loaded.</span>
              </div>
              <button
                onClick={() => loadDiscordRoles(0)}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Make sure the Discord bot is connected and the guild ID is correct.
            </p>
          </div>
        )}
        
        {!rolesLoading && availableRoles.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <span className="text-green-800">✅ Successfully loaded {availableRoles.length} Discord roles.</span>
            <button
              onClick={() => loadDiscordRoles(0)}
              className="ml-auto px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Accept Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Accept Roles</label>
            <p className="text-sm text-gray-600 mb-2">Roles that can accept submissions</p>
            <div className="flex gap-2 mb-2">
              <select
                value={newAcceptRole}
                onChange={(e) => setNewAcceptRole(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={rolesLoading}
              >
                <option value="">
                  {rolesLoading ? 'Loading roles...' : 'Select a role...'}
                </option>
                {availableRoles
                  .filter(role => !config.rolePermissions.acceptRoles.includes(role.name))
                  .map(role => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={addAcceptRole}
                disabled={!newAcceptRole || rolesLoading}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.rolePermissions.acceptRoles.map((role) => (
                <div
                  key={role}
                  className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{role}</span>
                  <button
                    onClick={() => removeAcceptRole(role)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Edit Roles</label>
            <p className="text-sm text-gray-600 mb-2">Roles that can edit quantities</p>
            <div className="flex gap-2 mb-2">
              <select
                value={newEditRole}
                onChange={(e) => setNewEditRole(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={rolesLoading}
              >
                <option value="">
                  {rolesLoading ? 'Loading roles...' : 'Select a role...'}
                </option>
                {availableRoles
                  .filter(role => !config.rolePermissions.editRoles.includes(role.name))
                  .map(role => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={addEditRole}
                disabled={!newEditRole || rolesLoading}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.rolePermissions.editRoles.map((role) => (
                <div
                  key={role}
                  className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{role}</span>
                  <button
                    onClick={() => removeEditRole(role)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reject Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reject Roles</label>
            <p className="text-sm text-gray-600 mb-2">Roles that can reject submissions</p>
            <div className="flex gap-2 mb-2">
              <select
                value={newRejectRole}
                onChange={(e) => setNewRejectRole(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={rolesLoading}
              >
                <option value="">
                  {rolesLoading ? 'Loading roles...' : 'Select a role...'}
                </option>
                {availableRoles
                  .filter(role => !config.rolePermissions.rejectRoles.includes(role.name))
                  .map(role => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={addRejectRole}
                disabled={!newRejectRole || rolesLoading}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.rolePermissions.rejectRoles.map((role) => (
                <div
                  key={role}
                  className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{role}</span>
                  <button
                    onClick={() => removeRejectRole(role)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Role names must match exactly as they appear in Discord. Users with these roles will be able to use the Accept/Edit/Reject buttons on submissions that require admin approval.
          </p>
        </div>
      </div>
    </div>
  );
}