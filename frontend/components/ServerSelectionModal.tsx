'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useServer } from '@/contexts/ServerContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Server, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface ServerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function ServerSelectionModal({ isOpen, onClose, onComplete }: ServerSelectionModalProps) {
  const { data: session } = useSession();
  const { setSelectedServer } = useServer();
  const { markServerSelected } = useOnboarding();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [guildsWithBot, setGuildsWithBot] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && session?.user?.guilds) {
      loadUserGuilds();
    }
  }, [isOpen, session]);

  const loadUserGuilds = async () => {
    setLoading(true);
    try {
      if (!session?.user?.guilds) return;

      // Filter guilds where user has admin permissions
      const adminGuilds = session.user.guilds.filter((guild: Guild) => {
        const hasAdmin = (parseInt(guild.permissions) & 0x8) === 0x8;
        return hasAdmin || guild.owner;
      });

      setGuilds(adminGuilds);

      // Check bot presence for each guild
      if (adminGuilds.length > 0) {
        await checkBotPresence(adminGuilds.map((g: Guild) => g.id));
      }
    } catch (error) {
      console.error('Error loading guilds:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBotPresence = async (guildIds: string[]) => {
    setChecking(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
      const response = await fetch(`${apiUrl}/api/guilds/check-bot-presence?guildIds=${guildIds.join(',')}`);

      if (response.ok) {
        const data = await response.json();
        // data.presence is { guildId: boolean }
        const botGuilds = new Set<string>();
        Object.entries(data.presence || {}).forEach(([guildId, hasBot]) => {
          if (hasBot) {
            botGuilds.add(guildId);
          }
        });
        setGuildsWithBot(botGuilds);
      }
    } catch (error) {
      console.error('Error checking bot presence:', error);
      // On error, assume bot is in all guilds (fail open)
      setGuildsWithBot(new Set(guildIds));
    } finally {
      setChecking(false);
    }
  };

  const handleSelectServer = (guild: Guild) => {
    setSelectedGuildId(guild.id);
  };

  const handleContinue = () => {
    if (!selectedGuildId) return;

    const selectedGuild = guilds.find(g => g.id === selectedGuildId);
    if (!selectedGuild) return;

    setSelectedServer(selectedGuildId, selectedGuild.name, selectedGuild.icon);
    markServerSelected();
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  const validGuilds = guilds.filter(g => guildsWithBot.has(g.id));
  const botClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '';
  const permissions = process.env.NEXT_PUBLIC_BOT_INVITE_PERMISSIONS || '8';
  const botInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=${permissions}&scope=bot%20applications.commands`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Server className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Choose Your Server</h2>
              <p className="text-indigo-100 mt-1">Select which Discord server you want to manage</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading || checking ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">
                {loading ? 'Loading your servers...' : 'Checking bot presence...'}
              </p>
            </div>
          ) : validGuilds.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Servers Found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The bot isn't installed in any of your servers yet, or you don't have administrator permissions.
              </p>
              <a
                href={botInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-md"
              >
                <Server className="h-5 w-5 mr-2" />
                Add Bot to Server
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </div>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Select the server you want to manage firms for. Only servers where the bot is installed are shown.
              </p>

              <div className="space-y-3">
                {validGuilds.map((guild) => (
                  <button
                    key={guild.id}
                    onClick={() => handleSelectServer(guild)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center space-x-4 ${
                      selectedGuildId === guild.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {guild.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                        alt={guild.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg font-bold">
                          {guild.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg">{guild.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {guild.owner ? 'Server Owner' : 'Administrator'}
                      </div>
                    </div>
                    {selectedGuildId === guild.id && (
                      <div className="text-indigo-600 dark:text-indigo-400">
                        <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {guilds.length > validGuilds.length && (
                <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <p className="text-sm text-yellow-900 dark:text-yellow-300">
                    <strong>Note:</strong> {guilds.length - validGuilds.length} server(s) hidden because the bot is not installed. {' '}
                    <a
                      href={botInviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-yellow-700 dark:hover:text-yellow-200"
                    >
                      Add the bot
                    </a> to access them.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {validGuilds.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-8 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedGuildId}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
