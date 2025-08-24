'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, MessageSquare, Link, Settings } from 'lucide-react';

interface ChannelLogMapping {
  id: string;
  channelId: string;
  channelName?: string;
  systemEndpoint: string;
  enabled: boolean;
  description?: string;
}

export default function ChannelLogsConfig() {
  const [mappings, setMappings] = useState<ChannelLogMapping[]>([]);
  const [newMapping, setNewMapping] = useState<Partial<ChannelLogMapping>>({
    channelId: '',
    systemEndpoint: '',
    enabled: true,
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/channel-logs/config');
      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Error fetching channel log mappings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMappings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/channel-logs/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mappings }),
      });

      if (response.ok) {
        console.log('Channel log mappings saved successfully');
      } else {
        throw new Error('Failed to save mappings');
      }
    } catch (error) {
      console.error('Error saving channel log mappings:', error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const addMapping = () => {
    if (!newMapping.channelId || !newMapping.systemEndpoint) {
      alert('Channel ID and System Endpoint are required');
      return;
    }

    const mapping: ChannelLogMapping = {
      id: Date.now().toString(),
      channelId: newMapping.channelId,
      systemEndpoint: newMapping.systemEndpoint,
      enabled: newMapping.enabled || true,
      description: newMapping.description || ''
    };

    setMappings([...mappings, mapping]);
    setNewMapping({
      channelId: '',
      systemEndpoint: '',
      enabled: true,
      description: ''
    });
  };

  const removeMapping = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const updateMapping = (id: string, updates: Partial<ChannelLogMapping>) => {
    setMappings(mappings.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  };


  const testEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch('/api/channel-logs/test-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
      });

      if (response.ok) {
        alert('Endpoint test successful!');
      } else {
        alert('Endpoint test failed - check URL and server status');
      }
    } catch (error) {
      alert('Endpoint test failed - network error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Channel Logs Configuration</h2>
            <p className="text-gray-600">Configure Discord channels to send logs to external systems</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Bot monitors configured Discord channels for new messages</li>
            <li>• Messages are filtered by type and sent to your specified endpoints</li>
            <li>• Replaces unreliable browser extension with direct bot-to-system communication</li>
            <li>• Real-time processing with automatic message type detection</li>
          </ul>
        </div>
      </div>

      {/* Current Mappings */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Active Channel Mappings</h3>
          <button
            onClick={saveMappings}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save All'}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading mappings...</p>
          </div>
        ) : mappings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No channel mappings configured yet</p>
            <p className="text-sm">Add your first mapping below</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Channel ID:</span>
                        <input
                          type="text"
                          value={mapping.channelId}
                          onChange={(e) => updateMapping(mapping.id, { channelId: e.target.value })}
                          className="px-3 py-1 border border-gray-300 rounded text-sm font-mono"
                          placeholder="1234567890123456789"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={mapping.enabled}
                          onChange={(e) => updateMapping(mapping.id, { enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Enabled</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Endpoint:</span>
                      <input
                        type="text"
                        value={mapping.systemEndpoint}
                        onChange={(e) => updateMapping(mapping.id, { systemEndpoint: e.target.value })}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm font-mono"
                        placeholder="http://localhost:8086/api/webhook/channel-logs"
                      />
                      <button
                        onClick={() => testEndpoint(mapping.systemEndpoint)}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Test
                      </button>
                    </div>


                    <div>
                      <input
                        type="text"
                        value={mapping.description || ''}
                        onChange={(e) => updateMapping(mapping.id, { description: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Description (optional)"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => removeMapping(mapping.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Mapping */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Channel Mapping</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discord Channel ID
              </label>
              <input
                type="text"
                value={newMapping.channelId || ''}
                onChange={(e) => setNewMapping({ ...newMapping, channelId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                placeholder="1404583987778949130"
              />
              <p className="text-xs text-gray-500 mt-1">
                Right-click channel → Copy Channel ID (Developer Mode required)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Endpoint URL
              </label>
              <input
                type="text"
                value={newMapping.systemEndpoint || ''}
                onChange={(e) => setNewMapping({ ...newMapping, systemEndpoint: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                placeholder="http://localhost:8086/api/webhook/channel-logs"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your external system endpoint to receive channel logs
              </p>
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={newMapping.description || ''}
              onChange={(e) => setNewMapping({ ...newMapping, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Farm logs channel for system integration"
            />
          </div>

          <button
            onClick={addMapping}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Channel Mapping</span>
          </button>
        </div>
      </div>
    </div>
  );
}