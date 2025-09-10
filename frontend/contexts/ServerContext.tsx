'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ServerContextType {
  selectedServerId: string | null;
  selectedServerName: string | null;
  setSelectedServer: (serverId: string, serverName: string) => void;
  clearSelectedServer: () => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

interface ServerProviderProps {
  children: ReactNode;
}

export function ServerProvider({ children }: ServerProviderProps) {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedServerId = localStorage.getItem('selectedServerId');
      const savedServerName = localStorage.getItem('selectedServerName');
      
      if (savedServerId && savedServerName) {
        setSelectedServerId(savedServerId);
        setSelectedServerName(savedServerName);
      }
    }
  }, []);

  const setSelectedServer = (serverId: string, serverName: string) => {
    setSelectedServerId(serverId);
    setSelectedServerName(serverName);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedServerId', serverId);
      localStorage.setItem('selectedServerName', serverName);
    }
  };

  const clearSelectedServer = () => {
    setSelectedServerId(null);
    setSelectedServerName(null);
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedServerId');
      localStorage.removeItem('selectedServerName');
    }
  };

  return (
    <ServerContext.Provider
      value={{
        selectedServerId,
        selectedServerName,
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