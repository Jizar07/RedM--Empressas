'use client';

import { useState, useEffect } from 'react';
import { FirmConfig } from '@/types/firms';
import { useServer } from '@/contexts/ServerContext';

interface FirmAccess {
  accessibleFirms: FirmConfig[];
  loading: boolean;
  error: string | null;
  hasAccessToFirm: (firmId: string) => boolean;
  refreshAccess: () => Promise<void>;
}

// Mock user roles - in a real app, this would come from authentication
const getMockUserRoles = async (): Promise<string[]> => {
  // For testing, automatically get all roles from all firms to give full access
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050/api';
    const response = await fetch(`${apiUrl}/firms-config`);
    const data = await response.json();
    
    if (data.success && data.firms) {
      const allRoles = new Set<string>();
      Object.values(data.firms).forEach((firm: any) => {
        if (firm.allowedRoles && Array.isArray(firm.allowedRoles)) {
          firm.allowedRoles.forEach((role: string) => allRoles.add(role));
        }
      });
      return Array.from(allRoles);
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic roles, using fallback:', error);
  }
  
  // Fallback roles if API fails
  return [
    'Lider fazenda BW',
    'Gerente fazenda BW', 
    '🧪​| Cientista',
    '⛴️​| Lider Hidrovia BRAITHWAITE',
    '🚬|Lider Tabacaria',
    '🐎| Lider Estabulo'
  ];
};

export function useFirmAccess(): FirmAccess {
  const [accessibleFirms, setAccessibleFirms] = useState<FirmConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedServerId } = useServer();

  const fetchAccessibleFirms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Only fetch firms if a server is selected
      if (!selectedServerId) {
        setAccessibleFirms([]);
        setLoading(false);
        return;
      }
      
      // Get user roles (mock implementation)
      const userRoles = await getMockUserRoles();
      
      // Call firms API with user roles to get accessible firms - server filtering will be added automatically by axios interceptor
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050/api';
      const response = await fetch(`${apiUrl}/firms-config/accessible?serverId=${selectedServerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRoles, serverId: selectedServerId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAccessibleFirms(data.firms);
      } else {
        throw new Error(data.error || 'Failed to fetch accessible firms');
      }
    } catch (err) {
      console.error('Error fetching accessible firms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch firms');
      setAccessibleFirms([]);
    } finally {
      setLoading(false);
    }
  };

  const hasAccessToFirm = (firmId: string): boolean => {
    return accessibleFirms.some(firm => firm.id === firmId);
  };

  const refreshAccess = async () => {
    await fetchAccessibleFirms();
  };

  useEffect(() => {
    fetchAccessibleFirms();
  }, [selectedServerId]);

  return {
    accessibleFirms,
    loading,
    error,
    hasAccessToFirm,
    refreshAccess
  };
}