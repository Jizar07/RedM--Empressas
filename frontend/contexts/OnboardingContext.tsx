'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OnboardingContextType {
  hasSeenAddBotInstructions: boolean;
  hasSelectedServer: boolean;
  hasSeenFirmInstructions: boolean;
  markAddBotInstructionsSeen: () => void;
  markServerSelected: () => void;
  markFirmInstructionsSeen: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [hasSeenAddBotInstructions, setHasSeenAddBotInstructions] = useState(false);
  const [hasSelectedServer, setHasSelectedServer] = useState(false);
  const [hasSeenFirmInstructions, setHasSeenFirmInstructions] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const seenAddBot = localStorage.getItem('onboarding_seenAddBotInstructions') === 'true';
      const selectedServer = localStorage.getItem('onboarding_hasSelectedServer') === 'true';
      const seenFirm = localStorage.getItem('onboarding_seenFirmInstructions') === 'true';

      setHasSeenAddBotInstructions(seenAddBot);
      setHasSelectedServer(selectedServer);
      setHasSeenFirmInstructions(seenFirm);
    }
  }, []);

  const markAddBotInstructionsSeen = () => {
    setHasSeenAddBotInstructions(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_seenAddBotInstructions', 'true');
    }
  };

  const markServerSelected = () => {
    setHasSelectedServer(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_hasSelectedServer', 'true');
    }
  };

  const markFirmInstructionsSeen = () => {
    setHasSeenFirmInstructions(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_seenFirmInstructions', 'true');
    }
  };

  const resetOnboarding = () => {
    setHasSeenAddBotInstructions(false);
    setHasSelectedServer(false);
    setHasSeenFirmInstructions(false);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboarding_seenAddBotInstructions');
      localStorage.removeItem('onboarding_hasSelectedServer');
      localStorage.removeItem('onboarding_seenFirmInstructions');
    }
  };

  // Don't render children until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <OnboardingContext.Provider
      value={{
        hasSeenAddBotInstructions,
        hasSelectedServer,
        hasSeenFirmInstructions,
        markAddBotInstructionsSeen,
        markServerSelected,
        markFirmInstructionsSeen,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
