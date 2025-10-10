'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Trash2, RefreshCw, Calendar, Filter, Database, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useServer } from '../contexts/ServerContext';

interface ExportConfig {
  serverId: string;
  channels: string[];
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    categories?: string[];
    transactionTypes?: string[];
    workerNames?: string[];
    items?: string[];
    minConfidence?: 'high' | 'medium' | 'low';
  };
  reportTypes: ('detailed' | 'summary' | 'breakdown')[];
}

interface ExportHistoryEntry {
  jobId: string;
  timestamp: string;
  config: ExportConfig;
  files: string[];
  fileCount: number;
  totalRecords?: number;
}

interface ExportJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  files?: string[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

const defaultConfig: ExportConfig = {
  serverId: '',
  channels: [],
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // Today
  },
  filters: {
    categories: ['supply_chain', 'inventario', 'financeiro'],
    minConfidence: 'medium'
  },
  reportTypes: ['detailed', 'summary', 'breakdown']
};

export default function ExportDataManagement() {
  const { selectedServerId } = useServer();
  const [config, setConfig] = useState<ExportConfig>(defaultConfig);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [monitoredChannelIds, setMonitoredChannelIds] = useState<string[]>([]);
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load configuration and channels
  useEffect(() => {
    if (selectedServerId) {
      loadConfig();
      loadMonitoredChannels();
      loadChannels();
      loadHistory();
    }
  }, [selectedServerId]);

  // Poll for job status
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/export-data/status/${currentJob.jobId}`);
        const data = await response.json();

        console.log(`🔄 Polling job ${currentJob.jobId}:`, data);

        if (data.success) {
          setCurrentJob(data.data);
          console.log(`📊 Job status: ${data.data.status}, Progress: ${data.data.progress}%`);

          if (data.data.status === 'completed') {
            setSuccess('Export completed successfully!');
            loadHistory(); // Refresh history
            setTimeout(() => setSuccess(''), 5000);
            console.log('✅ Export completed! Files:', data.data.files);
          } else if (data.data.status === 'failed') {
            setError(`Export failed: ${data.data.error || 'Unknown error'}`);
            console.error('❌ Export failed:', data.data.error);
          }
        } else {
          console.error('❌ Failed to poll job status:', data);
        }
      } catch (error: any) {
        console.error('Error polling job status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [currentJob]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/export-data/config?serverId=${selectedServerId}`);
      const data = await response.json();

      if (data.success) {
        setConfig({ ...data.data, serverId: selectedServerId });
      }
    } catch (error: any) {
      setError('Error loading configuration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoredChannels = async () => {
    try {
      const response = await fetch(`/api/firms-config/system/monitored-channels?serverId=${selectedServerId}`);
      const data = await response.json();

      if (data.success && data.channels) {
        // Extract channelIds from the array of objects
        const channelIds = data.channels.map((ch: any) => ch.channelId);
        setMonitoredChannelIds(channelIds);
        console.log(`✅ Loaded ${channelIds.length} monitored firm channels:`, channelIds);
      } else {
        console.error('Failed to load monitored channels:', data.error);
      }
    } catch (error: any) {
      console.error('Error loading monitored channels:', error);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await fetch(`/api/discord-channels?serverId=${selectedServerId}`);
      const data = await response.json();

      if (data.success && data.channels) {
        setChannels(data.channels);
        console.log(`✅ Loaded ${data.channels.length} Discord channels`);
      } else {
        console.error('Failed to load channels:', data.error);
        setError(data.error || 'Failed to load Discord channels');
      }
    } catch (error: any) {
      console.error('Error loading channels:', error);
      setError('Error loading channels: ' + error.message);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/export-data/files?serverId=${selectedServerId}`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.data);
      }
    } catch (error: any) {
      console.error('Error loading export history:', error);
    }
  };

  const saveConfig = async () => {
    try {
      const response = await fetch('/api/export-data/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, serverId: selectedServerId })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Configuration saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      setError('Error saving configuration: ' + error.message);
    }
  };

  const generateExport = async () => {
    try {
      if (config.channels.length === 0) {
        setError('Please select at least one channel');
        return;
      }

      setError('');
      setSuccess('');

      const response = await fetch('/api/export-data/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, serverId: selectedServerId })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentJob({
          jobId: data.data.jobId,
          status: 'queued',
          progress: 0,
          startedAt: new Date().toISOString()
        });
        setSuccess('Export started! Processing...');
      } else {
        setError(data.error || 'Failed to start export');
      }
    } catch (error: any) {
      setError('Error starting export: ' + error.message);
    }
  };

  const downloadFile = async (filename: string) => {
    try {
      window.open(`/api/export-data/download/${filename}?serverId=${selectedServerId}`, '_blank');
    } catch (error: any) {
      setError('Error downloading file: ' + error.message);
    }
  };

  const deleteFile = async (filename: string) => {
    if (!confirm('Are you sure you want to delete this export file?')) {
      return;
    }

    try {
      const response = await fetch(`/api/export-data/file/${filename}?serverId=${selectedServerId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('File deleted successfully');
        loadHistory();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to delete file');
      }
    } catch (error: any) {
      setError('Error deleting file: ' + error.message);
    }
  };

  const toggleChannel = (channelId: string) => {
    setConfig(prev => ({
      ...prev,
      channels: prev.channels.includes(channelId)
        ? prev.channels.filter(id => id !== channelId)
        : [...prev.channels, channelId]
    }));
  };

  const toggleCategory = (category: string) => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        categories: prev.filters.categories?.includes(category)
          ? prev.filters.categories.filter(c => c !== category)
          : [...(prev.filters.categories || []), category]
      }
    }));
  };

  const toggleReportType = (reportType: 'detailed' | 'summary' | 'breakdown') => {
    setConfig(prev => ({
      ...prev,
      reportTypes: prev.reportTypes.includes(reportType)
        ? prev.reportTypes.filter(t => t !== reportType)
        : [...prev.reportTypes, reportType]
    }));
  };

  if (!selectedServerId) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Please select a server first</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading export settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Export Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Export farm data to Excel-compatible CSV files</p>
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

      {/* Current Job Status */}
      {currentJob && (currentJob.status === 'queued' || currentJob.status === 'processing') && (
        <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-blue-900 dark:text-blue-100">Export in Progress</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${currentJob.progress}%` }}
            />
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">{currentJob.progress}% complete</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Channel Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Channel Selection</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select which firm channels to export data from
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {channels.filter(channel => monitoredChannelIds.includes(channel.id)).map(channel => (
              <label key={channel.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.channels.includes(channel.id)}
                  onChange={() => toggleChannel(channel.id)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">#{channel.name}</span>
              </label>
            ))}
          </div>

          {channels.filter(channel => monitoredChannelIds.includes(channel.id)).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No firm channels available. Configure firms in Firm Management first.
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            {config.channels.length} selected • {channels.filter(channel => monitoredChannelIds.includes(channel.id)).length} firm channel(s) available
          </p>
        </div>

        {/* Date Range */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Date Range</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={config.dateRange.start}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={config.dateRange.end}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Data Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data Filters</h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transaction Categories</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: 'supply_chain', label: '🔗 Supply Chain' },
                  { value: 'inventario', label: '📦 Inventory' },
                  { value: 'financeiro', label: '💰 Financial' }
                ].map(category => (
                  <label key={category.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.filters.categories?.includes(category.value)}
                      onChange={() => toggleCategory(category.value)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Minimum Confidence Level</h3>
              <select
                value={config.filters.minConfidence || 'medium'}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  filters: { ...prev.filters, minConfidence: e.target.value as 'high' | 'medium' | 'low' }
                }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low (include all)</option>
                <option value="medium">Medium (recommended)</option>
                <option value="high">High (most accurate only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Report Types */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Report Types</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select which CSV reports to generate
          </p>

          <div className="space-y-2">
            {[
              { value: 'detailed', label: 'Detailed Transactions', description: 'Every individual transaction with timestamps' },
              { value: 'summary', label: 'Worker Summary', description: 'Aggregated statistics per worker' },
              { value: 'breakdown', label: 'Activity Breakdown', description: 'Activity types broken down by worker' }
            ].map(report => (
              <label key={report.value} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.reportTypes.includes(report.value as any)}
                  onChange={() => toggleReportType(report.value as any)}
                  className="mt-1 rounded border-gray-300 dark:border-gray-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{report.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{report.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={saveConfig}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Save Configuration
          </button>

          <button
            onClick={generateExport}
            disabled={config.channels.length === 0 || (currentJob?.status === 'processing')}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Generate Export
          </button>
        </div>

        {/* Export History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export History</h2>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No exports yet</p>
          ) : (
            <div className="space-y-3">
              {history.map(entry => (
                <div key={entry.jobId} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.config.dateRange.start} to {entry.config.dateRange.end}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.config.channels.length} channel(s) • {entry.fileCount} file(s)
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {entry.files.map(file => (
                      <div key={file} className="flex items-center gap-2">
                        <button
                          onClick={() => downloadFile(file)}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          {file.split('-')[0]}
                        </button>
                        <button
                          onClick={() => deleteFile(file)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
