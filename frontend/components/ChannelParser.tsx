'use client';

import { useState } from 'react';
import { MessageSquare, Send, Eye, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { channelParserApi } from '@/lib/api';

export default function ChannelParser() {
  const [channelId, setChannelId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [limit, setLimit] = useState(100);
  const [filterUser, setFilterUser] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!channelId || !webhookUrl) {
      setError('Channel ID and Webhook URL are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await channelParserApi.parseChannel(channelId, webhookUrl, {
        limit,
        filterUser: filterUser || undefined,
        filterKeyword: filterKeyword || undefined,
      });
      
      setResult(response);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse channel');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!channelId) {
      setError('Channel ID is required for preview');
      return;
    }

    setIsPreviewLoading(true);
    setError('');

    try {
      const response = await channelParserApi.previewChannel(channelId, 5);
      setPreview(response);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to preview channel');
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-600 rounded-lg">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Channel Parser</h3>
          <p className="text-sm text-gray-500">Parse Discord channel messages and send to webhook</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Channel ID Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Channel ID *
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="1234567890123456789"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Right-click channel → Copy Channel ID (requires Developer Mode)
          </p>
        </div>

        {/* Webhook URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL *
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/123/abc"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Server Settings → Integrations → Webhooks → Copy URL
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Limit
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              min="1"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by User ID
            </label>
            <input
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="123456789 (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Keyword
            </label>
            <input
              type="text"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="keyword (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={handlePreview}
            disabled={!channelId || isPreviewLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPreviewLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span>Preview</span>
          </button>

          <button
            onClick={handleParse}
            disabled={!channelId || !webhookUrl || isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Parse & Send</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-800">Successfully parsed and sent!</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <div>Channel ID: <span className="font-mono">{result.channelId}</span></div>
              <div>Messages Parsed: <span className="font-semibold">{result.messagesParsed}</span></div>
              <div>Sent at: <span className="font-mono">{new Date(result.parsedAt).toLocaleString()}</span></div>
            </div>
          </div>
        )}

        {/* Preview Display */}
        {preview && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Preview: {preview.totalMessages} messages found
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {preview.messages.slice(0, 3).map((msg: any, index: number) => (
                <div key={index} className="p-2 bg-white rounded border text-xs">
                  <div className="font-medium text-gray-800">{msg.author.username}</div>
                  <div className="text-gray-600">
                    {msg.content ? (
                      <div className="truncate">{msg.content}</div>
                    ) : (
                      <div className="text-gray-400 italic">
                        {msg.embeds?.length > 0 && `${msg.embeds.length} embed(s)`}
                        {msg.attachments?.length > 0 && ` ${msg.attachments.length} attachment(s)`}
                        {(!msg.embeds?.length && !msg.attachments?.length) && '[Empty message]'}
                      </div>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs">{new Date(msg.timestamp).toLocaleString()}</div>
                </div>
              ))}
              {preview.messages.length > 3 && (
                <div className="text-xs text-blue-600 font-medium">
                  ...and {preview.messages.length - 3} more messages
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}