'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ServerContextType {
  selectedServerId: string | null;
  selectedServerName: string | null;
  selectedServerIcon: string | null;
  setSelectedServer: (serverId: string, serverName: string, serverIcon: string | null) => void;
  clearSelectedServer: () => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

interface ServerProviderProps {
  children: ReactNode;
}

export function ServerProvider({ children }: ServerProviderProps) {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null);
  const [selectedServerIcon, setSelectedServerIcon] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedServerId = localStorage.getItem('selectedServerId');
      const savedServerName = localStorage.getItem('selectedServerName');
      const savedServerIcon = localStorage.getItem('selectedServerIcon');

      if (savedServerId && savedServerName) {
        setSelectedServerId(savedServerId);
        setSelectedServerName(savedServerName);
        setSelectedServerIcon(savedServerIcon);
      }
    }
  }, []);

  const setSelectedServer = (serverId: string, serverName: string, serverIcon: string | null) => {
    setSelectedServerId(serverId);
    setSelectedServerName(serverName);
    setSelectedServerIcon(serverIcon);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedServerId', serverId);
      localStorage.setItem('selectedServerName', serverName);
      if (serverIcon) {
        localStorage.setItem('selectedServerIcon', serverIcon);
      } else {
        localStorage.removeItem('selectedServerIcon');
      }
    }
  };

  const clearSelectedServer = () => {
    setSelectedServerId(null);
    setSelectedServerName(null);
    setSelectedServerIcon(null);

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedServerId');
      localStorage.removeItem('selectedServerName');
      localStorage.removeItem('selectedServerIcon');
    }
  };

  return (
    <ServerContext.Provider
      value={{
        selectedServerId,
        selectedServerName,
        selectedServerIcon,
        setSelectedServer,
        clearSelectedServer,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer(): ServerContextType {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
}