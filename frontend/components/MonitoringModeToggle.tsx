'use client';

import { useState, useEffect } from 'react';
import { Monitor, Bot, AlertCircle, CheckCircle } from 'lucide-react';

type MonitoringMode = 'extension' | 'bot' | 'both';

export default function MonitoringModeToggle() {
  const [mode, setMode] = useState<MonitoringMode>('bot');
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('monitoring-mode');
    if (saved) {
      setMode(saved as MonitoringMode);
    }
  }, []);

  const handleModeChange = async (newMode: MonitoringMode) => {
    setIsChanging(true);
    
    try {
      // Save preference
      localStorage.setItem('monitoring-mode', newMode);
      setMode(newMode);
      
      // Show user instructions based on mode
      if (newMode === 'extension') {
        alert(
          'Extension Mode Activated!\n\n' +
          '1. Enable the browser extension\n' +
          '2. Navigate to Discord channel 1356704279204724746\n' +
          '3. The extension will send messages to the frontend\n\n' +
          'Note: Bot monitoring is now disabled.'
        );
      } else if (newMode === 'bot') {
        alert(
          'Bot Monitoring Mode Activated!\n\n' +
          'The Discord bot will now monitor channel 1409214475403526174\n' +
          'and send messages directly to the frontend.\n\n' +
          'Note: You can disable the browser extension to save resources.'
        );
      } else if (newMode === 'both') {
        alert(
          'Dual Mode Activated!\n\n' +
          'Both extension and bot will send messages.\n' +
          'This may cause duplicates but ensures no messages are missed.\n\n' +
          'Use this mode for testing or transition periods.'
        );
      }
      
      // Reload the page to apply changes
      if (confirm('Reload page to apply monitoring mode changes?')) {
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Error changing monitoring mode:', error);
      alert('Failed to change monitoring mode');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Monitoring Mode</h3>
        <div className="flex items-center space-x-2">
          {mode === 'bot' && <CheckCircle className="h-5 w-5 text-green-500" />}
          <span className="text-sm text-gray-600">
            Current: <span className="font-medium">{mode.toUpperCase()}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => handleModeChange('extension')}
          disabled={isChanging}
          className={`p-3 rounded-lg border-2 transition-all ${
            mode === 'extension'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Monitor className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-medium">Extension</div>
          <div className="text-xs text-gray-500 mt-1">Browser-based</div>
          <div className="text-xs text-gray-500">Channel: 1356...</div>
        </button>

        <button
          onClick={() => handleModeChange('bot')}
          disabled={isChanging}
          className={`p-3 rounded-lg border-2 transition-all ${
            mode === 'bot'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 hover:border-gray-300'
          } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Bot className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-medium">Bot Monitor</div>
          <div className="text-xs text-gray-500 mt-1">Server-based</div>
          <div className="text-xs text-gray-500">Channel: 1409...</div>
        </button>

        <button
          onClick={() => handleModeChange('both')}
          disabled={isChanging}
          className={`p-3 rounded-lg border-2 transition-all ${
            mode === 'both'
              ? 'border-purple-500 bg-purple-50 text-purple-700'
              : 'border-gray-200 hover:border-gray-300'
          } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex justify-center mb-2">
            <Monitor className="h-5 w-5" />
            <Bot className="h-5 w-5 ml-1" />
          </div>
          <div className="text-sm font-medium">Both</div>
          <div className="text-xs text-gray-500 mt-1">Dual mode</div>
          <div className="text-xs text-gray-500">All channels</div>
        </button>
      </div>

      {/* Status Messages */}
      <div className="mt-4 space-y-2">
        {mode === 'bot' && (
          <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900">Bot Monitoring Active</p>
              <p className="text-green-700">
                Discord bot is monitoring channel 1409214475403526174 for farm activities.
              </p>
              <p className="text-green-600 text-xs mt-1">
                Browser extension can be disabled to save resources.
              </p>
            </div>
          </div>
        )}

        {mode === 'extension' && (
          <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Extension Mode</p>
              <p className="text-blue-700">
                Browser extension must be enabled and Discord tab must be open.
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Make sure to navigate to channel 1356704279204724746.
              </p>
            </div>
          </div>
        )}

        {mode === 'both' && (
          <div className="flex items-start space-x-2 p-3 bg-purple-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-purple-900">Dual Mode Active</p>
              <p className="text-purple-700">
                Both bot and extension are sending data. May cause duplicates.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Setup:</h4>
        <ol className="text-xs text-gray-600 space-y-1">
          <li>1. <strong>Bot Mode (Recommended):</strong> No browser required, runs 24/7</li>
          <li>2. <strong>Extension Mode:</strong> Requires browser & Discord tab open</li>
          <li>3. <strong>Both:</strong> Use during transition or for redundancy</li>
        </ol>
      </div>
    </div>
  );
}