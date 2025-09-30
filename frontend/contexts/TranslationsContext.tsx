'use client';

import React, { createContext, useContext } from 'react';

interface TranslationsContextType {
  translations: Record<string, string>;
}

const TranslationsContext = createContext<TranslationsContextType>({
  translations: {}
});

// Initialize translations synchronously from cache
// The cache will be populated by a script tag in the HTML head
const getInitialTranslations = (): Record<string, string> => {
  if (typeof window !== 'undefined') {
    return (window as any).__translationsCache || {};
  }
  return {};
};

export function TranslationsProvider({ children }: { children: React.ReactNode }) {
  const translations = getInitialTranslations();

  return (
    <TranslationsContext.Provider value={{ translations }}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations() {
  return useContext(TranslationsContext);
}