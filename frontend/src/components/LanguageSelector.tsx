'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' }
];

interface LanguageSelectorProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export default function LanguageSelector({ variant = 'full', className = '' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Evitar problemas de hidratación
  }

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Cambiar idioma"
        >
          <Globe className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {currentLanguage.flag}
          </span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                  i18n.language === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span className="text-sm font-medium">{language.name}</span>
                {i18n.language === language.code && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Overlay para cerrar el dropdown */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Idioma / Language / Idioma
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">{currentLanguage.flag}</span>
            <span className="text-sm font-medium text-gray-900">{currentLanguage.name}</span>
          </div>
          <Globe className="w-4 h-4 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  i18n.language === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{language.name}</div>
                  <div className="text-xs text-gray-500">{language.code.toUpperCase()}</div>
                </div>
                {i18n.language === language.code && (
                  <span className="text-blue-600 text-sm">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Overlay para cerrar el dropdown */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}