'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, DollarSign, Shield, Clock, AlertTriangle } from 'lucide-react';
import { useServer } from '../contexts/ServerContext';

interface PaymentConfig {
  enabled: boolean;
  defaultPrices: {
    plants: {
      unitPrice: number;
      costPerUnit: number;
      description: string;
    };
    animals: {
      unitPrice: number;
      costPerUnit: number;
      description: string;
    };
    ferrovia: {
      unitPrice: number;
      description: string;
    };
  };
  inventoryVerification: {
    enabled: boolean;
    timeWindowMinutes: number;
    tolerance: number;
  };
  rolePermissions: {
    managerRoles: string[];
    farmOwnerRoles: string[];
  };
  lastUpdated: string;
}

const defaultConfig: PaymentConfig = {
  enabled: true,
  defaultPrices: {
    plants: {
      unitPrice: 0.25,
      costPerUnit: 0,
      description: 'Preço padrão por planta depositada'
    },
    animals: {
      unitPrice: 160.00,
      costPerUnit: 23.00,
      description: 'Preço padrão por serviço animal concluído'
    },
    ferrovia: {
      unitPrice: 250.00,
      description: 'Preço padrão por missão ferrovia concluída'
    }
  },
  inventoryVerification: {
    enabled: true,
    timeWindowMinutes: 30,
    tolerance: 0.01
  },
  rolePermissions: {
    managerRoles: ['1274479410107646008', '1274479410107646009'],
    farmOwnerRoles: ['1274479410107646006']
  },
  lastUpdated: new Date().toISOString()
};

export default function PaymentSettings() {
  const { selectedServerId } = useServer();
  const [config, setConfig] = useState<PaymentConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load configuration
  const loadConfig = async () => {
    if (!selectedServerId) {
      setLoading(false);
      setError('Please select a server first');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/payment-config?serverId=${selectedServerId}`);
      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        console.log('✅ Payment configuration loaded for server:', selectedServerId);
      } else {
        setError(data.error || 'Failed to load configuration');
      }
    } catch (error: any) {
      setError('Error loading configuration: ' + error.message);
      console.error('Error loading payment config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save configuration
  const saveConfig = async () => {
    if (!selectedServerId) {
      setError('Please select a server first');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        ...config,
        serverId: selectedServerId
      };

      console.log('💾 [PaymentSettings] Saving config for server:', selectedServerId);
      console.log('💾 [PaymentSettings] Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/payment-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('✅ [PaymentSettings] Response:', data);

      if (data.success) {
        setSuccess(`Configuration saved successfully for server ${data.serverId}!`);
        setConfig(data.data);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      setError('Error saving configuration: ' + error.message);
      console.error('Error saving payment config:', error);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    if (!selectedServerId) {
      setError('Please select a server first');
      return;
    }

    if (!confirm('Are you sure you want to reset to default settings? This cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/payment-config/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverId: selectedServerId })
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        setSuccess('Configuration reset to defaults!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to reset configuration');
      }
    } catch (error: any) {
      setError('Error resetting configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (selectedServerId) {
      loadConfig();
    } else {
      setConfig(defaultConfig);
      setLoading(false);
      setError('');
    }
  }, [selectedServerId]);

  const updateDefaultPrice = (service: 'plants' | 'animals' | 'ferrovia', price: number) => {
    setConfig(prev => ({
      ...prev,
      defaultPrices: {
        ...prev.defaultPrices,
        [service]: {
          ...prev.defaultPrices[service],
          unitPrice: price
        }
      }
    }));
  };

  const updateDefaultCost = (service: 'plants' | 'animals', cost: number) => {
    setConfig(prev => ({
      ...prev,
      defaultPrices: {
        ...prev.defaultPrices,
        [service]: {
          ...prev.defaultPrices[service],
          costPerUnit: cost
        }
      }
    }));
  };

  const updateInventoryVerification = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      inventoryVerification: {
        ...prev.inventoryVerification,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading payment settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure default pricing and verification settings for the payment system</p>
          {selectedServerId && (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
              Server ID: {selectedServerId}
            </p>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Status</h2>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Enable Payment System</span>
            </label>

            {config.lastUpdated && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {new Date(config.lastUpdated).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Default Pricing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Default Pricing</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            These values will appear as defaults in the payment modal. Users can still override them.
          </p>

          <div className="space-y-6">
            {/* Worker Payment Rates */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Worker Payment Rates</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {/* Plants */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🌾 Plants (per unit)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.defaultPrices.plants.unitPrice}
                      onChange={(e) => updateDefaultPrice('plants', parseFloat(e.target.value) || 0)}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.25"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{config.defaultPrices.plants.description}</p>
                </div>

                {/* Animals */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🐄 Animals (per service)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.defaultPrices.animals.unitPrice}
                      onChange={(e) => updateDefaultPrice('animals', parseFloat(e.target.value) || 0)}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="160.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{config.defaultPrices.animals.description}</p>
                </div>

                {/* Ferrovia */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🚂 Ferrovia (per mission)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.defaultPrices.ferrovia.unitPrice}
                      onChange={(e) => updateDefaultPrice('ferrovia', parseFloat(e.target.value) || 0)}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="250.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{config.defaultPrices.ferrovia.description}</p>
                </div>
              </div>
            </div>

            {/* Raising Costs */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Raising Costs (for Analytics)</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Cost to raise each item (animals, seeds, feed). Used to calculate profit margins in analytics.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Plant Cost */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🌱 Plant Cost (per unit)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.defaultPrices.plants.costPerUnit}
                      onChange={(e) => updateDefaultCost('plants', parseFloat(e.target.value) || 0)}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cost of seeds (usually negligible)</p>
                </div>

                {/* Animal Cost */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    🐄 Animal Cost (per animal)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.defaultPrices.animals.costPerUnit}
                      onChange={(e) => updateDefaultCost('animals', parseFloat(e.target.value) || 0)}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="23.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cost to raise (animals + feed). Default: $23/animal ($92 per 4 animals)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Verification */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory Verification</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Settings for verifying that managers actually withdrew money from inventory before making payments.
          </p>

          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.inventoryVerification.enabled}
                onChange={(e) => updateInventoryVerification('enabled', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Enable inventory verification</span>
            </label>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time Window (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={config.inventoryVerification.timeWindowMinutes}
                  onChange={(e) => updateInventoryVerification('timeWindowMinutes', parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">How far back to check for withdrawals</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tolerance ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={config.inventoryVerification.tolerance}
                  onChange={(e) => updateInventoryVerification('tolerance', parseFloat(e.target.value) || 0.01)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.01"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Acceptable difference between withdrawal and payment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Permissions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Role Permissions</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure which Discord roles can use the payment system.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Manager Roles (can create payments)
              </label>
              <textarea
                value={config.rolePermissions.managerRoles.join('\n')}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  rolePermissions: {
                    ...prev.rolePermissions,
                    managerRoles: e.target.value.split('\n').filter(r => r.trim())
                  }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="One role ID per line"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">One Discord role ID per line</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Farm Owner Roles (can verify payments)
              </label>
              <textarea
                value={config.rolePermissions.farmOwnerRoles.join('\n')}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  rolePermissions: {
                    ...prev.rolePermissions,
                    farmOwnerRoles: e.target.value.split('\n').filter(r => r.trim())
                  }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="One role ID per line"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">One Discord role ID per line</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>

          <div className="flex gap-3">
            <button
              onClick={loadConfig}
              disabled={loading || saving}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </button>

            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}