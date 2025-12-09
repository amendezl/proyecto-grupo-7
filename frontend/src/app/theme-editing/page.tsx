// Página de cambios a la temática. Creación de estas y dejar FULL control al usuario admin para cambiarla como quiera.
// Fonts, colores, logos, etc.
// Levantando una advertencia de que los cambios pueden afectar la usabilidad si no se hacen correctamente.
// y recomendando correr pruebas de usabilidad tras los cambios.
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Save, Eye, AlertCircle, CheckCircle, ArrowLeft, Upload, RotateCcw, Type, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  logoUrl: string;
  faviconUrl: string;
  buttonRadius: string;
  spacing: string; 
}

export default function ThemeEditingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    accentColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    logoUrl: '',
    faviconUrl: '',
    buttonRadius: '0.5rem',
    spacing: '1rem'
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWarning, setShowWarning] = useState(true);

  const fontOptions = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Poppins', 'Raleway', 'Ubuntu', 'Nunito', 'Playfair Display'
  ];

  // Debug: Log translations
  useEffect(() => {
    console.log('🌐 Theme Editor Translations:', {
      t: t,
      themeEditor: t?.themeEditor,
      warningTitle: t?.themeEditor?.warningTitle
    });
  }, [t]);

  // Verificar si el usuario es admin
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    } else if (user.rol !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Cargar configuración del tema desde localStorage o API
  useEffect(() => {
    const savedTheme = localStorage.getItem('themeConfig');
    if (savedTheme) {
      setThemeConfig(JSON.parse(savedTheme));
    }
  }, []);

  const handleInputChange = (field: keyof ThemeConfig, value: string) => {
    setThemeConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleFileUpload = async (field: 'logoUrl' | 'faviconUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError(t?.themeEditor?.errorSelectImage || 'Por favor, selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError(t?.themeEditor?.errorFileSize || 'El archivo debe ser menor a 2MB');
      return;
    }

    // Convertir a base64 para preview (en producción, subir a S3)
    const reader = new FileReader();
    reader.onloadend = () => {
      handleInputChange(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTheme = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Guardar en localStorage (en producción, enviar a API)
      localStorage.setItem('themeConfig', JSON.stringify(themeConfig));
      
      // Aplicar el tema al documento
      applyThemeToDocument();
      
      setSuccess(t?.themeEditor?.successSaved || 'Tema guardado exitosamente');
      
      // Aquí iría la llamada a la API para guardar en la base de datos
      // await fetch('/api/theme', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(themeConfig)
      // });
    } catch (err) {
      setError(t?.themeEditor?.errorUpload || 'Error al guardar el tema');
    } finally {
      setIsLoading(false);
    }
  };

  const applyThemeToDocument = () => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', themeConfig.primaryColor);
    root.style.setProperty('--secondary-color', themeConfig.secondaryColor);
    root.style.setProperty('--accent-color', themeConfig.accentColor);
    root.style.setProperty('--bg-color', themeConfig.backgroundColor);
    root.style.setProperty('--text-color', themeConfig.textColor);
    root.style.setProperty('--heading-font', themeConfig.headingFont);
    root.style.setProperty('--body-font', themeConfig.bodyFont);
    root.style.setProperty('--button-radius', themeConfig.buttonRadius);
    root.style.setProperty('--spacing', themeConfig.spacing);
  };

  const resetToDefault = () => {
    if (confirm(t?.themeEditor?.resetDefaults || '¿Restablecer valores predeterminados?')) {
      setThemeConfig({
        primaryColor: '#3b82f6',
        secondaryColor: '#8b5cf6',
        accentColor: '#10b981',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        headingFont: 'Inter',
        bodyFont: 'Inter',
        logoUrl: '',
        faviconUrl: '',
        buttonRadius: '0.5rem',
        spacing: '1rem'
      });
      setSuccess(t?.themeEditor?.successReset || 'Tema restablecido a valores predeterminados');
    }
  };

  if (!user || user.rol?.toLowerCase() !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader title={t?.themeEditor?.title || 'Editor de Tema'} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/configuracion')} 
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#242938] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t?.common?.back || 'Volver'}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t?.themeEditor?.title || 'Editor de Tema'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t?.themeEditor?.colorsDesc || 'Personaliza la apariencia completa de la plataforma'}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {showWarning && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <AlertCircle className="text-yellow-400 mr-3 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h3 className="text-yellow-800 font-semibold mb-2">
                  {t?.themeEditor?.warningTitle || '⚠️ Advertencia de Usabilidad'}
                </h3>
                <p className="text-yellow-700 text-sm mb-2">
                  {t?.themeEditor?.warningMessage || 'Los cambios en el tema pueden afectar significativamente la experiencia del usuario.'}
                </p>
                <ul className="text-yellow-700 text-sm list-disc ml-5 space-y-1">
                  <li>{t?.themeEditor?.warningBullet1 || 'Mantener un contraste adecuado entre texto y fondo (mínimo 4.5:1)'}</li>
                  <li>{t?.themeEditor?.warningBullet2 || 'Probar la legibilidad de las fuentes en diferentes tamaños'}</li>
                  <li>{t?.themeEditor?.warningBullet3 || 'Verificar que los colores sean accesibles para usuarios con daltonismo'}</li>
                  <li>{t?.themeEditor?.warningBullet4 || 'Realizar pruebas de usabilidad después de aplicar cambios importantes'}</li>
                </ul>
                <button
                  onClick={() => setShowWarning(false)}
                  className="mt-3 text-yellow-800 text-sm font-medium hover:text-yellow-900"
                >
                  {t?.common?.confirm || 'Entendido, continuar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 flex items-center">
            <AlertCircle className="text-red-400 mr-3" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-600 p-4 flex items-center">
            <CheckCircle className="text-green-400 dark:text-green-500 mr-3" size={20} />
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Colors Section */}
            <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                <Palette className="mr-2" size={20} />
                {t?.themeEditor?.colorsTitle || 'Colores'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.primaryColor || 'Color Primario'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={themeConfig.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeConfig.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.secondaryColor || 'Color Secundario'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={themeConfig.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeConfig.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.accentColor || 'Color de Acento'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={themeConfig.accentColor}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeConfig.accentColor}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.backgroundColor || 'Color de Fondo'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={themeConfig.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeConfig.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.textColor || 'Color de Texto'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={themeConfig.textColor}
                      onChange={(e) => handleInputChange('textColor', e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeConfig.textColor}
                      onChange={(e) => handleInputChange('textColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Section */}
            <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                <Type className="mr-2" size={20} />
                {t?.themeEditor?.typographyTitle || 'Tipografía'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.headingFont || 'Fuente para Títulos'}
                  </label>
                  <select
                    value={themeConfig.headingFont}
                    onChange={(e) => handleInputChange('headingFont', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                  >
                    {fontOptions.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.bodyFont || 'Fuente para Cuerpo'}
                  </label>
                  <select
                    value={themeConfig.bodyFont}
                    onChange={(e) => handleInputChange('bodyFont', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                  >
                    {fontOptions.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Branding Section */}
            <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                <ImageIcon className="mr-2" size={20} />
                {t?.themeEditor?.brandingTitle || 'Marca'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.logoLabel || 'Logo Principal'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('logoUrl', e)}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 cursor-pointer flex items-center transition-colors"
                    >
                      <Upload className="mr-2" size={16} />
                      {t?.themeEditor?.uploadLogo || 'Subir Logo'}
                    </label>
                    {themeConfig.logoUrl && (
                      <img src={themeConfig.logoUrl} alt="Logo" className="h-10 object-contain" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.faviconLabel || 'Favicon'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('faviconUrl', e)}
                      className="hidden"
                      id="favicon-upload"
                    />
                    <label
                      htmlFor="favicon-upload"
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 cursor-pointer flex items-center transition-colors"
                    >
                      <Upload className="mr-2" size={16} />
                      {t?.themeEditor?.uploadFavicon || 'Subir Favicon'}
                    </label>
                    {themeConfig.faviconUrl && (
                      <img src={themeConfig.faviconUrl} alt="Favicon" className="h-8 object-contain" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Styling */}
            <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t?.themeEditor?.advancedTitle || 'Estilos Avanzados'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.buttonRadius || 'Radio de Botones'}
                  </label>
                  <input
                    type="text"
                    value={themeConfig.buttonRadius}
                    onChange={(e) => handleInputChange('buttonRadius', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    placeholder="0.5rem"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.themeEditor?.spacing || 'Espaciado Base'}
                  </label>
                  <input
                    type="text"
                    value={themeConfig.spacing}
                    onChange={(e) => handleInputChange('spacing', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    placeholder="1rem"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center text-gray-900 dark:text-gray-100">
                  <Eye className="mr-2" size={20} />
                  {t?.themeEditor?.previewTitle || 'Vista Previa'}
                </h2>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {previewMode ? (t?.themeEditor?.previewModeEdit || 'Modo Edición') : (t?.themeEditor?.previewModePreview || 'Modo Vista Previa')}
                </button>
              </div>

              <div 
                className="border-2 border-gray-200 rounded-lg p-6 space-y-4"
                style={{
                  backgroundColor: themeConfig.backgroundColor,
                  color: themeConfig.textColor,
                  fontFamily: themeConfig.bodyFont
                }}
              >
                {themeConfig.logoUrl && (
                  <img src={themeConfig.logoUrl} alt="Logo Preview" className="h-12 mb-4" />
                )}
                
                <h1 
                  style={{ 
                    fontFamily: themeConfig.headingFont,
                    color: themeConfig.primaryColor 
                  }}
                  className="text-2xl font-bold"
                >
                  {t?.themeEditor?.previewHeading || 'Título de Ejemplo'}
                </h1>
                
                <p className="text-sm">
                  {t?.themeEditor?.previewCardDesc || 'Este es un ejemplo de cómo se verá el texto en la plataforma con la configuración actual.'}
                </p>

                <div className="flex space-x-3">
                  <button
                    style={{
                      backgroundColor: themeConfig.primaryColor,
                      borderRadius: themeConfig.buttonRadius
                    }}
                    className="px-4 py-2 text-white font-medium"
                  >
                    {t?.themeEditor?.previewButtonPrimary || 'Botón Primario'}
                  </button>
                  
                  <button
                    style={{
                      backgroundColor: themeConfig.secondaryColor,
                      borderRadius: themeConfig.buttonRadius
                    }}
                    className="px-4 py-2 text-white font-medium"
                  >
                    {t?.themeEditor?.previewButtonSecondary || 'Botón Secundario'}
                  </button>
                </div>

                <div 
                  className="p-3 rounded"
                  style={{ backgroundColor: themeConfig.accentColor + '20' }}
                >
                  <p style={{ color: themeConfig.accentColor }} className="font-medium">
                    {t?.themeEditor?.previewNotification || 'Mensaje de éxito o notificación'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSaveTheme}
                  disabled={isLoading}
                  className="w-full bg-blue-600 dark:bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center font-medium transition-colors shadow-sm"
                >
                  <Save className="mr-2" size={18} />
                  {isLoading ? (t?.themeEditor?.saving || 'Guardando...') : (t?.themeEditor?.saveTheme || 'Guardar Tema')}
                </button>

                <button
                  onClick={resetToDefault}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-medium transition-colors border border-gray-300 dark:border-gray-600"
                >
                  <RotateCcw className="mr-2" size={18} />
                  {t?.themeEditor?.resetDefaults || 'Restablecer Predeterminados'}
                </button>
              </div>

              {/* Accessibility Check */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t?.themeEditor?.accessibilityTitle || 'Verificación de Accesibilidad'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {t?.themeEditor?.contrastRatio || 'Contraste texto-fondo:'}
                  <span className="ml-2 font-medium">
                    {calculateContrast(themeConfig.textColor, themeConfig.backgroundColor)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t?.themeEditor?.minContrastRecommendation || 'Se recomienda un ratio mínimo de 4.5:1 para texto normal'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Función auxiliar para calcular contraste
function calculateContrast(color1: string, color2: string): string {
  // Esta es una implementación simplificada
  // En producción, usar una librería como 'color-contrast-checker'
  return 'Calculando...';
}
