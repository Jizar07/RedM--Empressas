'use client';

import { useState, useEffect } from 'react';
import { Shield, Trash2, MessageSquare, AlertTriangle, Save, Plus, X, Hash, Users } from 'lucide-react';

interface ModerationConfig {
  clearCommand: {
    enabled: boolean;
    defaultLimit: number;
    requireReason: boolean;
    excludePinnedByDefault: boolean;
    logChannel?: string;
  };
  automod: {
    enabled: boolean;
    filterBadWords: boolean;
    maxMentions: number;
    maxEmojis: number;
    capsPercentage: number;
    spamInterval: number;
    customWords: string[];
  };
  autoReply: {
    enabled: boolean;
    triggers: Array<{
      id: string;
      keywords: string[];
      response: string;
      exactMatch: boolean;
    }>;
  };
}

export default function ModerationSettings() {
  const [config, setConfig] = useState<ModerationConfig>({
    clearCommand: {
      enabled: true,
      defaultLimit: 50,
      requireReason: false,
      excludePinnedByDefault: true,
      logChannel: ''
    },
    automod: {
      enabled: false,
      filterBadWords: true,
      maxMentions: 5,
      maxEmojis: 10,
      capsPercentage: 70,
      spamInterval: 3000,
      customWords: []
    },
    autoReply: {
      enabled: false,
      triggers: []
    }
  });

  const [newWord, setNewWord] = useState('');
  const [newTrigger, setNewTrigger] = useState({
    keywords: '',
    response: '',
    exactMatch: false
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'clear' | 'automod' | 'autoreply'>('clear');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/moderation/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch moderation config:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('http://localhost:3050/api/moderation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        alert('Moderation settings saved successfully!');
      } else {
        alert('Failed to save moderation settings');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving moderation settings');
    } finally {
      setSaving(false);
    }
  };

  const addCustomWord = () => {
    if (newWord.trim()) {
      setConfig(prev => ({
        ...prev,
        automod: {
          ...prev.automod,
          customWords: [...prev.automod.customWords, newWord.trim().toLowerCase()]
        }
      }));
      setNewWord('');
    }
  };

  const removeCustomWord = (word: string) => {
    setConfig(prev => ({
      ...prev,
      automod: {
        ...prev.automod,
        customWords: prev.automod.customWords.filter(w => w !== word)
      }
    }));
  };

  const addAutoReply = () => {
    if (newTrigger.keywords && newTrigger.response) {
      const trigger = {
        id: Date.now().toString(),
        keywords: newTrigger.keywords.split(',').map(k => k.trim()),
        response: newTrigger.response,
        exactMatch: newTrigger.exactMatch
      };
      
      setConfig(prev => ({
        ...prev,
        autoReply: {
          ...prev.autoReply,
          triggers: [...prev.autoReply.triggers, trigger]
        }
      }));
      
      setNewTrigger({ keywords: '', response: '', exactMatch: false });
    }
  };

  const removeAutoReply = (id: string) => {
    setConfig(prev => ({
      ...prev,
      autoReply: {
        ...prev.autoReply,
        triggers: prev.autoReply.triggers.filter(t => t.id !== id)
      }
    }));
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Moderation Settings</h2>
            <p className="text-gray-600">Configure bot moderation features and auto-responses</p>
          </div>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('clear')}
            className={`py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'clear'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Clear Command
          </button>
          <button
            onClick={() => setActiveTab('automod')}
            className={`py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'automod'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Auto Moderation
          </button>
          <button
            onClick={() => setActiveTab('autoreply')}
            className={`py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'autoreply'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-2" />
            Auto Reply
          </button>
        </nav>
      </div>

      {/* Clear Command Settings */}
      {activeTab === 'clear' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <strong>Clear Command:</strong> Allows moderators to bulk delete messages with filters
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.clearCommand.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  clearCommand: { ...prev.clearCommand, enabled: e.target.checked }
                }))}
                className="h-4 w-4 text-red-600 rounded"
              />
              <span className="font-medium">Enable /clear command</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Message Limit
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.clearCommand.defaultLimit}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  clearCommand: { ...prev.clearCommand, defaultLimit: parseInt(e.target.value) || 50 }
                }))}
                className="px-3 py-2 border border-gray-300 rounded-lg w-32"
              />
              <p className="text-sm text-gray-500 mt-1">Maximum messages to delete (1-100)</p>
            </div>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.clearCommand.requireReason}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  clearCommand: { ...prev.clearCommand, requireReason: e.target.checked }
                }))}
                className="h-4 w-4 text-red-600 rounded"
              />
              <span className="font-medium">Require reason for deletion</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.clearCommand.excludePinnedByDefault}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  clearCommand: { ...prev.clearCommand, excludePinnedByDefault: e.target.checked }
                }))}
                className="h-4 w-4 text-red-600 rounded"
              />
              <span className="font-medium">Exclude pinned messages by default</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Hash className="h-4 w-4 inline mr-1" />
                Log Channel ID (optional)
              </label>
              <input
                type="text"
                value={config.clearCommand.logChannel || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  clearCommand: { ...prev.clearCommand, logChannel: e.target.value }
                }))}
                placeholder="e.g., 1234567890123456789"
                className="px-3 py-2 border border-gray-300 rounded-lg w-full"
              />
              <p className="text-sm text-gray-500 mt-1">Channel to log message deletions</p>
            </div>
          </div>
        </div>
      )}

      {/* Auto Moderation Settings */}
      {activeTab === 'automod' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Auto Moderation:</strong> Automatically filter and moderate messages
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.automod.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  automod: { ...prev.automod, enabled: e.target.checked }
                }))}
                className="h-4 w-4 text-red-600 rounded"
              />
              <span className="font-medium">Enable Auto Moderation</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.automod.filterBadWords}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  automod: { ...prev.automod, filterBadWords: e.target.checked }
                }))}
                className="h-4 w-4 text-red-600 rounded"
              />
              <span className="font-medium">Filter inappropriate language</span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Mentions Allowed
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.automod.maxMentions}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    automod: { ...prev.automod, maxMentions: parseInt(e.target.value) || 5 }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Emojis Allowed
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.automod.maxEmojis}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    automod: { ...prev.automod, maxEmojis: parseInt(e.target.value) || 10 }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max CAPS Percentage
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.automod.capsPercentage}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    automod: { ...prev.automod, capsPercentage: parseInt(e.target.value) || 70 }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spam Interval (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={config.automod.spamInterval}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    automod: { ...prev.automod, spamInterval: parseInt(e.target.value) || 3000 }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Filtered Words
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomWord()}
                  placeholder="Add a word to filter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={addCustomWord}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.automod.customWords.map(word => (
                  <span
                    key={word}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center space-x-2"
                  >
                    <span>{word}</span>
                    <button
                      onClick={() => removeCustomWord(word)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto Reply Settings */}
      {activeTab === 'autoreply' && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              <strong>Auto Reply:</strong> Automatically respond to specific keywords or phrases
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.autoReply.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  autoReply: { ...prev.autoReply, enabled: e.target.checked }
                }))}
                className="h-4 w-4 text-red-600 rounded"
              />
              <span className="font-medium">Enable Auto Reply</span>
            </label>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-3">Add New Auto Reply</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trigger Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTrigger.keywords}
                    onChange={(e) => setNewTrigger(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="e.g., !help, how to join, server ip"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Response Message
                  </label>
                  <textarea
                    value={newTrigger.response}
                    onChange={(e) => setNewTrigger(prev => ({ ...prev, response: e.target.value }))}
                    placeholder="The bot will reply with this message"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newTrigger.exactMatch}
                      onChange={(e) => setNewTrigger(prev => ({ ...prev, exactMatch: e.target.checked }))}
                      className="h-4 w-4 text-red-600 rounded"
                    />
                    <span className="text-sm">Exact match only</span>
                  </label>
                  <button
                    onClick={addAutoReply}
                    disabled={!newTrigger.keywords || !newTrigger.response}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Add Auto Reply
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Active Auto Replies</h4>
              {config.autoReply.triggers.length === 0 ? (
                <p className="text-gray-500 text-sm">No auto replies configured</p>
              ) : (
                config.autoReply.triggers.map(trigger => (
                  <div key={trigger.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Keywords: {trigger.keywords.join(', ')}
                          {trigger.exactMatch && <span className="ml-2 text-xs bg-yellow-100 px-2 py-1 rounded">Exact</span>}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{trigger.response}</p>
                      </div>
                      <button
                        onClick={() => removeAutoReply(trigger.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}