'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useLanguage } from './LanguageContext';

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en' | 'ko' | 'ja' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'pt';
  fontSize: number;
  fontFamily: string;
  accentColor: string;
}

interface SettingsContextType {
  settings: AppearanceSettings;
  updateSettings: (newSettings: Partial<AppearanceSettings>) => void;
  isLoading: boolean;
}

const defaultSettings: AppearanceSettings = {
  theme: 'light',
  language: 'es',
  fontSize: 16,
  fontFamily: 'Inter',
  accentColor: '#3B82F6'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setLanguage } = useLanguage();
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const justUpdatedRef = useRef(false);

  // Aplicar settings al DOM
  const applySettings = (newSettings: AppearanceSettings) => {
    // Aplicar tema
    if (newSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else if (newSettings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    } else if (newSettings.theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }

    // Aplicar tamaño de fuente
    document.documentElement.style.fontSize = `${newSettings.fontSize}px`;

    // Aplicar idioma
    setLanguage(newSettings.language);
    document.documentElement.lang = newSettings.language;
  };

  // Cargar settings al inicio
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Si acabamos de actualizar manualmente, no cargar desde backend
      if (justUpdatedRef.current) {
        justUpdatedRef.current = false;
        setIsLoading(false);
        return;
      }

      try {
        // Primero intentar cargar desde localStorage (más rápido)
        const cachedSettings = localStorage.getItem(`appearance_settings_${user.id}`);
        if (cachedSettings) {
          try {
            const parsed = JSON.parse(cachedSettings);
            setSettings(parsed);
            applySettings(parsed);
          } catch (e) {
            console.error('Error parsing cached settings:', e);
          }
        }

        // Luego cargar desde backend para sincronizar
        const response = await apiClient.getSettings();
        if (response.ok && response.data) {
          const validLanguages: Array<'es' | 'en' | 'ko' | 'ja' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'pt'> = 
            ['es', 'en', 'ko', 'ja', 'fr', 'de', 'it', 'zh', 'hi', 'pt'];
          
          const receivedLang = response.data.language as string;
          const validLanguage: 'es' | 'en' | 'ko' | 'ja' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'pt' = 
            validLanguages.includes(receivedLang as any) 
              ? (receivedLang as 'es' | 'en' | 'ko' | 'ja' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'pt')
              : 'es';

          const newSettings: AppearanceSettings = {
            theme: response.data.theme || 'light',
            language: validLanguage,
            fontSize: response.data.fontSize || 16,
            fontFamily: response.data.fontFamily || 'Inter',
            accentColor: response.data.accentColor || '#3B82F6'
          };

          setSettings(newSettings);
          applySettings(newSettings);
          
          // Guardar en cache
          localStorage.setItem(`appearance_settings_${user.id}`, JSON.stringify(newSettings));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const updateSettings = (newSettings: Partial<AppearanceSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    
    // Marcar que estamos actualizando manualmente
    justUpdatedRef.current = true;
    
    setSettings(updatedSettings);
    applySettings(updatedSettings);
    
    // Guardar en cache inmediatamente
    if (user) {
      localStorage.setItem(`appearance_settings_${user.id}`, JSON.stringify(updatedSettings));
    }
    
    // Resetear el flag después de un tiempo
    setTimeout(() => {
      justUpdatedRef.current = false;
    }, 1000);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
