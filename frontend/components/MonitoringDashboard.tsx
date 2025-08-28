'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Activity, AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, MessageSquare } from 'lucide-react';

interface MonitoringStatus {
  firmId: string;
  firmName: string;
  isMonitoring: boolean;
  lastMessageReceived: string | null;
  messagesProcessed: number;
  lastError: string | null;
  uptime: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  endpointHealth: 'healthy' | 'unhealthy' | 'unknown';
  stats: {
    messagesThisHour: number;
    messagesThisDay: number;
    errorsThisHour: number;
    lastRestart: string;
  };
}

interface GlobalStats {
  totalFirmsMonitored: number;
  totalMessagesProcessed: number;
  systemUptime: number;
  lastSystemRestart: string;
}

export default function MonitoringDashboard() {
  const [monitoringData, setMonitoringData] = useState<MonitoringStatus[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchMonitoringData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchMonitoringData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchMonitoringData = async () => {
    try {
      setError(null);
      
      // Fetch firm configurations and monitoring status
      const [firmsResponse, statusResponse] = await Promise.all([
        fetch('http://localhost:3050/api/firms-config'),
        fetch('/api/monitoring-status').catch(() => null) // Optional endpoint
      ]);
      
      const firmsData = await firmsResponse.json();
      
      if (!firmsData.success) {
        throw new Error(firmsData.error || 'Failed to fetch monitoring data');
      }

      // Transform firm data into monitoring status
      const mockMonitoringData: MonitoringStatus[] = Object.values(firmsData.firms || {}).map((firm: any) => ({
        firmId: firm.id,
        firmName: firm.name,
        isMonitoring: firm.enabled && firm.monitoring.enabled,
        lastMessageReceived: null, // Would come from actual monitoring service
        messagesProcessed: 0,
        lastError: null,
        uptime: 0,
        connectionStatus: firm.enabled ? 'connected' : 'disconnected',
        endpointHealth: 'unknown',
        stats: {
          messagesThisHour: 0,
          messagesThisDay: 0,
          errorsThisHour: 0,
          lastRestart: new Date().toISOString()
        }
      }));

      const activeFirms = mockMonitoringData.filter(f => f.isMonitoring).length;
      const totalMessages = mockMonitoringData.reduce((sum, f) => sum + f.messagesProcessed, 0);

      setMonitoringData(mockMonitoringData);
      setGlobalStats({
        totalFirmsMonitored: activeFirms,
        totalMessagesProcessed: totalMessages,
        systemUptime: Date.now() - new Date().setHours(0, 0, 0, 0), // Since midnight
        lastSystemRestart: new Date().toISOString()
      });
      
      setLastRefresh(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchMonitoringData();
  };

  const formatUptime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const getStatusIcon = (status: MonitoringStatus) => {
    if (!status.isMonitoring) {
      return <Clock className="h-5 w-5 text-gray-500" />;
    } else if (status.lastError) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    } else if (status.connectionStatus === 'connected') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: MonitoringStatus): string => {
    if (!status.isMonitoring) return 'bg-gray-100 text-gray-800';
    if (status.lastError) return 'bg-red-100 text-red-800';
    if (status.connectionStatus === 'connected') return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (status: MonitoringStatus): string => {
    if (!status.isMonitoring) return 'Paused';
    if (status.lastError) return 'Error';
    if (status.connectionStatus === 'connected') return 'Active';
    return 'Connecting';
  };

  if (loading && monitoringData.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Controls */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Real-Time Monitoring Dashboard</h3>
            <p className="text-sm text-gray-600">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Auto-refresh</span>
            </label>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Monitoring Error</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Global Statistics */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">{globalStats.totalFirmsMonitored}</p>
                <p className="text-blue-700 text-sm">Active Monitors</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900">{globalStats.totalMessagesProcessed}</p>
                <p className="text-green-700 text-sm">Messages Processed</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-900">{formatUptime(globalStats.systemUptime)}</p>
                <p className="text-purple-700 text-sm">System Uptime</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-900">
                  {monitoringData.reduce((sum, f) => sum + f.stats.messagesThisHour, 0)}
                </p>
                <p className="text-orange-700 text-sm">Messages/Hour</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Firm Monitoring Status */}
      <div className="card p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Firm Monitoring Status</h4>
        
        {monitoringData.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No firms configured for monitoring</p>
          </div>
        ) : (
          <div className="space-y-4">
            {monitoringData.map((status) => (
              <div key={status.firmId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <div>
                      <h5 className="font-semibold text-gray-900">{status.firmName}</h5>
                      <p className="text-sm text-gray-600">ID: {status.firmId}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </span>
                  </div>
                  
                  {status.lastError && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 max-w-md">
                      <p className="text-xs text-red-700">{status.lastError}</p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Messages Today:</span>
                    <p className="text-gray-900">{status.stats.messagesThisDay}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Messages/Hour:</span>
                    <p className="text-gray-900">{status.stats.messagesThisHour}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Errors/Hour:</span>
                    <p className={status.stats.errorsThisHour > 0 ? 'text-red-600' : 'text-gray-900'}>
                      {status.stats.errorsThisHour}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Message:</span>
                    <p className="text-gray-900">
                      {status.lastMessageReceived ? new Date(status.lastMessageReceived).toLocaleTimeString() : 'Never'}
                    </p>
                  </div>
                </div>
                
                {status.isMonitoring && (
                  <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Uptime: {formatUptime(status.uptime)}</span>
                    <span>•</span>
                    <span>Connection: {status.connectionStatus}</span>
                    <span>•</span>
                    <span>Endpoint: {status.endpointHealth}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
            Restart All Monitors
          </button>
          <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
            Export Logs
          </button>
          <button className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
            Test All Endpoints
          </button>
          <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
            View Detailed Metrics
          </button>
        </div>
      </div>
    </div>
  );
}