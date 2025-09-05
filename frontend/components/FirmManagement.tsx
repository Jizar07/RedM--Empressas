'use client';

import { useState, useEffect } from 'react';
import { Building, Plus, Settings, Trash2, Edit, Eye, EyeOff, Monitor, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { FirmConfig, CreateFirmRequest, EndpointPreset, DEFAULT_ENDPOINT_PRESETS } from '../types/firms';
import EnhancedFirmConfigModal from './EnhancedFirmConfigModal';
import MonitoringDashboard from './MonitoringDashboard';

export default function FirmManagement() {
  const [firms, setFirms] = useState<Record<string, FirmConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'monitoring'>('overview');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingFirm, setEditingFirm] = useState<FirmConfig | null>(null);
  const [deletingFirm, setDeletingFirm] = useState<string | null>(null);

  useEffect(() => {
    fetchFirms();
  }, []);

  const fetchFirms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3050/api/firms-config');
      const data = await response.json();
      
      if (data.success) {
        setFirms(data.firms);
      } else {
        throw new Error(data.error || 'Failed to fetch firms');
      }
    } catch (err) {
      console.error('Error fetching firms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch firms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFirm = async (firmData: CreateFirmRequest) => {
    try {
      const response = await fetch('http://localhost:3050/api/firms-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firmData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Automatically setup channel monitoring for the new firm
        try {
          const channelLogConfig = {
            id: `${firmData.id}-logs`,
            name: `${firmData.name} Logs`,
            sourceChannelId: firmData.channelId,
            webhookUrl: "http://localhost:3051/api/webhook/channel-messages",
            enabled: true,
            messageTypes: ["ALL"],
            includeEmbeds: true,
            createdAt: new Date().toISOString()
          };

          const channelResponse = await fetch('http://localhost:3050/api/channel-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(channelLogConfig)
          });

          const channelData = await channelResponse.json();
          
          if (!channelData.success) {
            console.warn('Failed to setup automatic channel monitoring:', channelData.error);
          }
        } catch (channelErr) {
          console.warn('Failed to setup automatic channel monitoring:', channelErr);
        }

        await fetchFirms();
        setShowConfigModal(false);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to create firm');
      }
    } catch (err) {
      console.error('Error creating firm:', err);
      setError(err instanceof Error ? err.message : 'Failed to create firm');
    }
  };

  const handleUpdateFirm = async (firmData: CreateFirmRequest) => {
    if (!editingFirm) return;
    
    try {
      const response = await fetch(`http://localhost:3050/api/firms-config/${editingFirm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firmData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchFirms();
        setEditingFirm(null);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to update firm');
      }
    } catch (err) {
      console.error('Error updating firm:', err);
      setError(err instanceof Error ? err.message : 'Failed to update firm');
    }
  };

  const handleToggleEnabled = async (firmId: string, enabled: boolean) => {
    try {
      const response = await fetch(`http://localhost:3050/api/firms-config/${firmId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchFirms();
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to toggle firm status');
      }
    } catch (err) {
      console.error('Error toggling firm status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle firm status');
    }
  };

  const handleDeleteFirm = async (firmId: string) => {
    try {
      const response = await fetch(`http://localhost:3050/api/firms-config/${firmId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchFirms();
        setDeletingFirm(null);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to delete firm');
      }
    } catch (err) {
      console.error('Error deleting firm:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete firm');
    }
  };

  const getStatusIcon = (firm: FirmConfig) => {
    if (!firm.enabled) {
      return <EyeOff className="h-4 w-4 text-gray-500" />;
    } else if (firm.monitoring.enabled) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (firm: FirmConfig) => {
    if (!firm.enabled) return 'Disabled';
    if (firm.monitoring.enabled) return 'Active';
    return 'Paused';
  };

  const firmsList = Object.values(firms);
  const activeFirms = firmsList.filter(f => f.enabled).length;
  const totalChannels = firmsList.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading firm configurations...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Firm Management</h2>
              <p className="text-gray-600">Configure and monitor multiple firms with role-based access</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Firm</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Building className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">{totalChannels}</p>
                <p className="text-blue-700 text-sm">Total Firms</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900">{activeFirms}</p>
                <p className="text-green-700 text-sm">Active Monitoring</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Monitor className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-900">{firmsList.filter(f => f.monitoring.enabled).length}</p>
                <p className="text-purple-700 text-sm">Channels Monitored</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Firm Overview
            </button>
            <button
              onClick={() => setSelectedTab('monitoring')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'monitoring'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Monitoring Dashboard
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Firms</h3>
          
          {firmsList.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-2">No firms configured yet</p>
              <p className="text-sm text-gray-400">Add your first firm to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {firmsList.map((firm) => (
                <div key={firm.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(firm)}
                        <h4 className="text-lg font-semibold text-gray-900">{firm.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          firm.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getStatusText(firm)}
                        </span>
                      </div>
                      
                      {firm.description && (
                        <p className="text-gray-600 mb-3">{firm.description}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Channel ID:</span>
                          <p className="font-mono text-gray-600">{firm.channelId}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Endpoint:</span>
                          <p className="text-gray-600 truncate">{firm.monitoring.endpoint}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Roles:</span>
                          <p className="text-gray-600">{firm.allowedRoles.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleEnabled(firm.id, !firm.enabled)}
                        className={`p-2 rounded ${
                          firm.enabled 
                            ? 'text-gray-600 hover:bg-gray-100' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={firm.enabled ? 'Disable Firm' : 'Enable Firm'}
                      >
                        {firm.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditingFirm(firm)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Firm"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingFirm(firm.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete Firm"
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
      )}

      {selectedTab === 'monitoring' && (
        <MonitoringDashboard />
      )}

      {/* Create/Edit Firm Modal */}
      {(showConfigModal || editingFirm) && (
        <EnhancedFirmConfigModal
          firm={editingFirm}
          onSave={editingFirm ? handleUpdateFirm : handleCreateFirm}
          onCancel={() => {
            setShowConfigModal(false);
            setEditingFirm(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingFirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Firm</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this firm? This action cannot be undone and will stop monitoring for this channel.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingFirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deletingFirm && handleDeleteFirm(deletingFirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}