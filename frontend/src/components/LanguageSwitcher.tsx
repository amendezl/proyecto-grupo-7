'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const languageOptions = [
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'zh', label: '简体中文', flag: '🇨🇳' },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { value: 'pt', label: 'Português', flag: '🇵🇹' }
];

interface LanguageSwitcherProps {
  temporary?: boolean; // Si es true, el cambio no se persiste
}

export default function LanguageSwitcher({ temporary = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languageOptions.find(lang => lang.value === language) || languageOptions[0];

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as any);
    setIsOpen(false);
    
    // Si es temporal, guardar en sessionStorage para que se pierda después del login
    if (temporary) {
      sessionStorage.setItem('temp_language', newLang);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Cambiar idioma"
      >
        <Globe className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">
          {currentLang.label}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          <div className="py-1">
            {languageOptions.map((lang) => (
              <button
                key={lang.value}
                onClick={() => handleLanguageChange(lang.value)}
                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  language === lang.value ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className={`text-sm font-medium ${
                  language === lang.value 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-200'
                }`}>
                  {lang.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
