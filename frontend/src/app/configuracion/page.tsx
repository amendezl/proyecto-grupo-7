'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import AppHeader from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  Settings, 
  User, 
  Palette,
  Globe,
  Type,
  Save,
  X,
  Check,
  Moon,
  Sun,
  Monitor,
  Mail,
  Phone,
  Briefcase,
  ArrowLeft
} from 'lucide-react';

// Tipos de configuración
type SettingSection = 'appearance' | 'profile';

interface UserProfile {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  departamento: string;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en' | 'ko' | 'ja' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'pt';
  fontSize: number;
  fontFamily: string;
  accentColor: string;
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useSettings();
  const [activeSection, setActiveSection] = useState<SettingSection>('profile');
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado del perfil
  const [profileData, setProfileData] = useState<UserProfile>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    departamento: ''
  });

  // Estado local para preview (cambios temporales)
  const [appearance, setAppearance] = useState<AppearanceSettings>(globalSettings);
  // Guardar settings originales para revertir
  const [savedAppearance, setSavedAppearance] = useState<AppearanceSettings>(globalSettings);

  // NO sincronizar automáticamente - solo en la carga inicial del componente
  // La sincronización después de guardar se maneja manualmente

  // Cargar datos del usuario y settings existentes de la BD
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        const userData = {
          nombre: user.nombre || '',
          apellido: user.apellido || '',
          email: user.email || '',
          telefono: user.telefono || '',
          departamento: user.departamento || ''
        };
        setProfileData(userData);

        // Cargar settings de la BD
        try {
          const response = await apiClient.getSettings();
          if (response.ok && response.data) {
            const dbSettings = response.data;
            // Actualizar estado local con settings de BD
            setAppearance(dbSettings);
            setSavedAppearance(dbSettings);
            // NO actualizar globalSettings aquí para evitar aplicar cambios sin intención
          }
        } catch (error) {
          console.log('No se pudieron cargar settings de BD, usando defaults');
        }
      }
    };

    loadUserData();
  }, [user]);

  // Guardar cambios
  const handleSave = async () => {
    setLoading(true);
    try {
      if (activeSection === 'appearance') {
        // Guardar en el backend primero
        const response = await apiClient.updateSettings(appearance);
        if (response.ok) {
          // Guardar en localStorage también
          if (user) {
            localStorage.setItem(`appearance_settings_${user.id}`, JSON.stringify(appearance));
          }
          // Actualizar el estado de referencia guardado
          setSavedAppearance(appearance);
          // Marcar que no hay cambios
          setHasChanges(false);
          // Actualizar contexto global de settings (esto aplicará el idioma automáticamente)
          updateGlobalSettings(appearance);
          setSaved(true);
        } else {
          throw new Error('Error al guardar settings en el backend');
        }
      } else if (activeSection === 'profile') {
        // Guardar perfil en el backend
        if (updateProfile) {
          await updateProfile(profileData);
          setSaved(true);
        } else {
          console.log('updateProfile no está disponible');
        }
      }

      // Solo marcar hasChanges=false si NO es appearance (ya lo hicimos arriba)
      if (activeSection !== 'appearance') {
        setHasChanges(false);
      }
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  // Descartar cambios
  const handleDiscard = () => {
    if (activeSection === 'appearance') {
      // Revertir a los settings guardados y restaurar el contexto global
      setAppearance(savedAppearance);
      updateGlobalSettings(savedAppearance);
      setLanguage(savedAppearance.language);
    } else if (activeSection === 'profile' && user) {
      setProfileData({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        email: user.email || '',
        telefono: user.telefono || '',
        departamento: user.departamento || ''
      });
    }
    setHasChanges(false);
  };

  // Actualizar perfil
  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Revertir cambios al salir de la página
  useEffect(() => {
    return () => {
      // Al desmontar el componente, revertir a los settings guardados si hay cambios sin guardar
      // NOTA: No incluir savedAppearance en dependencias para evitar que se recree el cleanup
      if (hasChanges && activeSection === 'appearance') {
        updateGlobalSettings(savedAppearance);
        setLanguage(savedAppearance.language);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar apariencia (solo preview, no guardar)
  const updateAppearanceField = (field: keyof AppearanceSettings, value: any) => {
    const newAppearance = { ...appearance, [field]: value };
    setAppearance(newAppearance);
    setHasChanges(true);
    // Aplicar preview visual temporal sin actualizar el contexto guardado
    applyPreviewSettings(newAppearance);
  };

  // Aplicar settings solo visualmente (preview temporal)
  const applyPreviewSettings = (settings: AppearanceSettings) => {
    // Aplicar tema
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    } else if (settings.theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
    // NO aplicar idioma en preview - solo al guardar
    // El idioma se aplicará únicamente cuando se haga clic en "Guardar"
  };

  // Secciones del sidebar
  const sections = [
    {
      id: 'profile' as SettingSection,
      label: t.settings.profile,
      icon: User,
      description: t.settings.profileInfo
    },
    {
      id: 'appearance' as SettingSection,
      label: t.settings.appearance,
      icon: Palette,
      description: t.settings.appearanceDesc
    }
  ];

  // Verificar si el usuario es admin
  const isAdmin = user?.rol?.toLowerCase() === 'admin' || user?.rol?.toLowerCase() === 'administrador';

  // Temas disponibles
  const themes = [
    { value: 'light', label: t.settings.themeLight, icon: Sun },
    { value: 'dark', label: t.settings.themeDark, icon: Moon },
    { value: 'auto', label: t.settings.themeAuto, icon: Monitor }
  ];

  // Idiomas disponibles
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

  // Familias de fuentes
  const fontFamilies = [
    'Inter',
    'System UI',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat'
  ];

  // Colores de acento
  const accentColors = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Morado', value: '#8B5CF6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Rojo', value: '#EF4444' },
    { name: 'Naranja', value: '#F59E0B' },
    { name: 'Rosa', value: '#EC4899' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader title={t.settings.title} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con botón volver */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#242938] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.common.back}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.settings.title}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t.settings.subtitle}</p>
            </div>
          </div>
          
          {/* Botones de acción */}
          {hasChanges && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDiscard}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#242938] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4 inline mr-2" />
                {t.settings.discard}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 inline mr-2" />
                {loading ? t.settings.saving : t.settings.saveChanges}
              </button>
            </div>
          )}

          {/* Mensaje de guardado */}
          {saved && !hasChanges && (
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">{t.settings.changesSaved}</span>
            </div>
          )}
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/50'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      <div>
                        <div className={`font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                          {section.label}
                        </div>
                        <div className={`text-sm ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {section.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel principal */}
          <div className="lg:col-span-3">
            {/* Perfil de Usuario */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-6">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                      {(profileData.nombre || 'U').charAt(0).toUpperCase()}{(profileData.apellido || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {profileData.nombre || 'Sin nombre'} {profileData.apellido || ''}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">{profileData.email || 'Sin correo'}</p>
                      {user && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            {user.rol}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información Personal */}
                <div className="bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">{t.settings.personalInfo}</h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Nombre */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <User className="inline h-4 w-4 mr-2" />
                          {t.settings.firstName}
                        </label>
                        <input
                          type="text"
                          value={profileData.nombre}
                          onChange={(e) => updateProfileField('nombre', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-gray-100"
                          placeholder="Tu nombre"
                        />
                      </div>

                      {/* Apellido */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <User className="inline h-4 w-4 mr-2" />
                          {t.settings.lastName}
                        </label>
                        <input
                          type="text"
                          value={profileData.apellido}
                          onChange={(e) => updateProfileField('apellido', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-gray-100"
                          placeholder="Tu apellido"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Mail className="inline h-4 w-4 mr-2" />
                        {t.auth.email}
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => updateProfileField('email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-gray-100"
                        placeholder="correo@ejemplo.com"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.settings.emailCannotBeChanged}</p>
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Phone className="inline h-4 w-4 mr-2" />
                        {t.settings.phone}
                      </label>
                      <input
                        type="tel"
                        value={profileData.telefono}
                        onChange={(e) => updateProfileField('telefono', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-gray-100"
                        placeholder="+56 9 1234 5678"
                      />
                    </div>

                    {/* Departamento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Briefcase className="inline h-4 w-4 mr-2" />
                        {t.settings.department}
                      </label>
                      <input
                        type="text"
                        value={profileData.departamento}
                        onChange={(e) => updateProfileField('departamento', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-gray-100"
                        placeholder="Ej: Tecnología, Recursos Humanos"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Apariencia */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                {/* Tema */}
                <div className="bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t.settings.theme}
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {themes.map((theme) => {
                      const ThemeIcon = theme.icon;
                      const isSelected = appearance.theme === theme.value;
                      
                      return (
                        <button
                          key={theme.value}
                          onClick={() => updateAppearanceField('theme', theme.value)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-slate-500'
                          }`}
                        >
                          <ThemeIcon className={`h-8 w-8 mx-auto mb-2 ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                          }`} />
                          <div className={`text-sm font-medium ${
                            isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {theme.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Idioma */}
                <div className="bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    <Globe className="inline h-4 w-4 mr-2" />
                    {t.settings.language}
                  </label>
                  <select
                    value={appearance.language}
                    onChange={(e) => {
                      const newLang = e.target.value as 'es' | 'en' | 'ko' | 'ja' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'pt';
                      updateAppearanceField('language', newLang);
                    }}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t.settings.selectLanguage}
                  </p>
                </div>

                {/* Botón Admin - Página Personalizada */}
                {isAdmin && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-sm border-2 border-purple-200 dark:border-purple-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          <Palette className="inline h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                          {t.settings.themeEditorButton}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t.settings.themeEditorDesc}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push('/theme-editing')}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg transition-all transform hover:scale-105"
                      >
                        {t.settings.goToPanel}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tamaño de fuente */}
                <div className="bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    <Type className="inline h-4 w-4 mr-2" />
                    {t.settings.fontSize}
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="12"
                      max="20"
                      value={appearance.fontSize}
                      onChange={(e) => updateAppearanceField('fontSize', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                      {appearance.fontSize}px
                    </span>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p style={{ fontSize: `${appearance.fontSize}px` }} className="text-gray-700 dark:text-gray-300">
                      {t.settings.exampleText}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
