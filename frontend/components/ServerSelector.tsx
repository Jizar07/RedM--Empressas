'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useServer } from '@/contexts/ServerContext';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface ServerSelectorProps {
  onServerSelect?: (serverId: string, serverName: string) => void;
}

export default function ServerSelector({ onServerSelect }: ServerSelectorProps) {
  const { data: session } = useSession();
  const { selectedServerId, setSelectedServer } = useServer();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserGuilds();
  }, [session]);

  const loadUserGuilds = () => {
    console.log('NextAuth session:', session);
    
    if (session?.user?.guilds) {
      console.log('Found guilds in session:', session.user.guilds.length);
      // Filter guilds where user has admin permissions
      const adminGuilds = session.user.guilds.filter((guild: Guild) => {
        // Check if user has ADMINISTRATOR permission (bit flag 0x8)
        const hasAdmin = (parseInt(guild.permissions) & 0x8) === 0x8;
        console.log(`Guild ${guild.name} - Admin: ${hasAdmin}, Owner: ${guild.owner}, Permissions: ${guild.permissions}`);
        return hasAdmin || guild.owner;
      });
      console.log('Admin guilds filtered:', adminGuilds.length);
      setGuilds(adminGuilds);
    } else {
      console.log('No guilds found in session');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Selecionar Servidor Discord</h3>
        <div className="text-center py-6">
          <p className="text-gray-500 mb-4">Nenhum servidor Discord encontrado.</p>
          <p className="text-sm text-gray-400">
            Certifique-se de que:
            <br />• Você está logado com Discord
            <br />• Você tem permissões de administrador nos servidores
            <br />• O bot está presente nos servidores
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Selecionar Servidor Discord</h3>
      <div className="space-y-2">
        {guilds.map((guild) => (
          <button
            key={guild.id}
            onClick={() => {
              setSelectedServer(guild.id, guild.name);
              onServerSelect?.(guild.id, guild.name);
            }}
            className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center space-x-3 ${
              selectedServerId === guild.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {guild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=32`}
                alt={guild.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {guild.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="font-medium">{guild.name}</div>
              <div className="text-sm text-gray-500">
                {guild.owner ? 'Proprietário' : 'Administrador'}
              </div>
            </div>
            {selectedServerId === guild.id && (
              <div className="text-indigo-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}