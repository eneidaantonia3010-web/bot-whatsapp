'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Dictionary } from './types';
import { esDictionary } from './dictionaries/es';
import { itDictionary } from './dictionaries/it';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dict: Dictionary;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Helper to safely resolve nested key with Spanish fallback
function resolveKeyPath(obj: Record<string, unknown>, fallbackObj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  let currentFallback: unknown = fallbackObj;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      current = undefined;
    }

    if (currentFallback && typeof currentFallback === 'object' && k in currentFallback) {
      currentFallback = (currentFallback as Record<string, unknown>)[k];
    } else {
      currentFallback = undefined;
    }
  }

  if (typeof current === 'string' && current.trim() !== '') {
    return current;
  }

  if (typeof currentFallback === 'string') {
    return currentFallback;
  }

  return path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('glow_studio_lang') as Language;
    if (saved === 'es' || saved === 'it') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('glow_studio_lang', lang);
    }
  };

  const dict = language === 'it' ? itDictionary : esDictionary;

  const t = (path: string): string => {
    return resolveKeyPath(
      dict as unknown as Record<string, unknown>,
      esDictionary as unknown as Record<string, unknown>,
      path
    );
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, dict, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
