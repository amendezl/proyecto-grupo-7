'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslations, Translations } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');
  const [t, setT] = useState<Translations>(getTranslations('es'));

  useEffect(() => {
    // Load language from localStorage or settings
    const savedLang = localStorage.getItem('language') as Language;
    const validLanguages: Language[] = ['es', 'en', 'ko', 'ja', 'fr', 'de', 'it', 'zh', 'hi', 'pt'];
    if (savedLang && validLanguages.includes(savedLang)) {
      setLanguageState(savedLang);
      setT(getTranslations(savedLang));
      document.documentElement.lang = savedLang;
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setT(getTranslations(lang));
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
