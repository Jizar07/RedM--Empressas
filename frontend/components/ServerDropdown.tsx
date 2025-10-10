'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useServer } from '@/contexts/ServerContext';
import { ChevronDown, Server, Check } from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export default function ServerDropdown() {
  const { data: session } = useSession();
  const { selectedServerId, selectedServerName, setSelectedServer } = useServer();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserGuilds();
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUserGuilds = () => {
    if (session?.user?.guilds) {
      const adminGuilds = session.user.guilds.filter((guild: Guild) => {
        const hasAdmin = (parseInt(guild.permissions) & 0x8) === 0x8;
        return hasAdmin || guild.owner;
      });
      setGuilds(adminGuilds);
    }
    setLoading(false);
  };

  const selectedGuild = guilds.find(g => g.id === selectedServerId);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400"></div>
        <span>Loading servers...</span>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        <Server className="h-4 w-4" />
        <span>No servers found</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        {selectedGuild ? (
          <>
            {selectedGuild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png?size=32`}
                alt={selectedGuild.name}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {selectedGuild.name.substring(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <span className="max-w-[150px] truncate">{selectedGuild.name}</span>
          </>
        ) : (
          <>
            <Server className="h-4 w-4" />
            <span>Select Server</span>
          </>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {guilds.map((guild) => (
              <button
                key={guild.id}
                onClick={() => {
                  setSelectedServer(guild.id, guild.name, guild.icon);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors ${
                  selectedServerId === guild.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                }`}
              >
                {guild.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=32`}
                    alt={guild.name}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-medium">
                      {guild.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-gray-900 dark:text-white">{guild.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {guild.owner ? 'Owner' : 'Admin'}
                  </div>
                </div>
                {selectedServerId === guild.id && (
                  <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}