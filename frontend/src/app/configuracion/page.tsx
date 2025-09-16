'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui/components';
import LanguageSelector from '@/components/LanguageSelector';
import { 
  Settings, 
  User, 
  Bell, 
  Palette, 
  Globe, 
  Shield, 
  Monitor, 
  Save,
  RefreshCw,
  Check,
  Moon,
  Sun,
  Volume2,
  VolumeX
} from 'lucide-react';

interface ConfiguracionGeneral {
  tema: 'claro' | 'oscuro' | 'auto';
  idioma: 'es' | 'en' | 'pt';
  notificaciones: boolean;
  sonidos: boolean;
  autoGuardado: boolean;
  tiempoSesion: number; // minutos
}

interface ConfiguracionNotificaciones {
  reservas: boolean;
  cambiosEstado: boolean;
  mantenimiento: boolean;
  email: boolean;
  push: boolean;
  frecuencia: 'inmediata' | 'agrupada' | 'diaria';
}

interface ConfiguracionSistema {
  formatoFecha: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  formatoHora: '12h' | '24h';
  zonaHoraria: string;
  registrosAuditoria: boolean;
  backupAutomatico: boolean;
  limpiezaAutomatica: number; // días
}

export default function ConfiguracionPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'notificaciones' | 'sistema' | 'seguridad'>('general');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados de configuración
  const [configGeneral, setConfigGeneral] = useState<ConfiguracionGeneral>({
    tema: 'claro',
    idioma: 'es',
    notificaciones: true,
    sonidos: true,
    autoGuardado: true,
    tiempoSesion: 120
  });

  const [configNotificaciones, setConfigNotificaciones] = useState<ConfiguracionNotificaciones>({
    reservas: true,
    cambiosEstado: true,
    mantenimiento: true,
    email: true,
    push: true,
    frecuencia: 'inmediata'
  });

  const [configSistema, setConfigSistema] = useState<ConfiguracionSistema>({
    formatoFecha: 'DD/MM/YYYY',
    formatoHora: '24h',
    zonaHoraria: 'America/Santiago',
    registrosAuditoria: true,
    backupAutomatico: true,
    limpiezaAutomatica: 30
  });

  // Cargar configuraciones guardadas
  useEffect(() => {
    const loadConfig = () => {
      try {
        const savedGeneral = localStorage.getItem('config_general');
        const savedNotificaciones = localStorage.getItem('config_notificaciones');
        const savedSistema = localStorage.getItem('config_sistema');

        if (savedGeneral) setConfigGeneral(JSON.parse(savedGeneral));
        if (savedNotificaciones) setConfigNotificaciones(JSON.parse(savedNotificaciones));
        if (savedSistema) setConfigSistema(JSON.parse(savedSistema));
      } catch (error) {
        console.error('Error cargando configuraciones:', error);
      }
    };

    loadConfig();
  }, []);

  // Guardar configuraciones
  const handleSave = async () => {
    setLoading(true);
    try {
      localStorage.setItem('config_general', JSON.stringify(configGeneral));
      localStorage.setItem('config_notificaciones', JSON.stringify(configNotificaciones));
      localStorage.setItem('config_sistema', JSON.stringify(configSistema));
      
      // Aquí se haría la llamada a la API para guardar en el servidor
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular API call
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error guardando configuraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: t('config.tabs.general'), icon: Settings },
    { id: 'notificaciones', label: t('config.tabs.notifications'), icon: Bell },
    { id: 'sistema', label: t('config.tabs.system'), icon: Monitor },
    { id: 'seguridad', label: t('config.tabs.security'), icon: Shield }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('config.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('config.description')}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('config.reset')}
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saved ? t('config.saved') : t('config.save')}
          </Button>
        </div>
      </div>

      {/* Notificación de guardado */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">{t('config.saveSuccess')}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegación */}
        <div className="lg:col-span-1">
          <Card className="p-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('config.general.title')}</h3>
                  
                  {/* Tema */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('config.general.theme')}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'claro', label: t('config.general.themes.light'), icon: Sun },
                          { value: 'oscuro', label: t('config.general.themes.dark'), icon: Moon },
                          { value: 'auto', label: t('config.general.themes.auto'), icon: Monitor }
                        ].map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            onClick={() => setConfigGeneral(prev => ({ ...prev, tema: value as any }))}
                            className={`p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                              configGeneral.tema === value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm font-medium">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Idioma */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('config.general.language')}
                      </label>
                      <LanguageSelector variant="full" />
                    </div>

                    {/* Switches */}
                    <div className="space-y-4">
                      {[
                        { key: 'notificaciones', label: t('config.general.notifications'), icon: Bell },
                        { key: 'sonidos', label: t('config.general.sounds'), icon: Volume2 },
                        { key: 'autoGuardado', label: t('config.general.autoSave'), icon: Save }
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Icon className="w-5 h-5 text-gray-500 mr-3" />
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                          </div>
                          <button
                            onClick={() => setConfigGeneral(prev => ({ 
                              ...prev, 
                              [key]: !prev[key as keyof ConfiguracionGeneral] 
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              configGeneral[key as keyof ConfiguracionGeneral]
                                ? 'bg-blue-600'
                                : 'bg-gray-200'
                            }`}
                            aria-label={`Toggle ${label}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                configGeneral[key as keyof ConfiguracionGeneral]
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Tiempo de sesión */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('config.general.sessionTime')}
                      </label>
                      <input
                        type="number"
                        value={configGeneral.tiempoSesion}
                        onChange={(e) => setConfigGeneral(prev => ({ 
                          ...prev, 
                          tiempoSesion: parseInt(e.target.value) || 120 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="30"
                        max="480"
                        aria-label="Tiempo de sesión en minutos"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notificaciones' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('config.notifications.title')}</h3>
                  
                  <div className="space-y-4">
                    {/* Tipos de notificaciones */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Tipos de notificaciones</h4>
                      {[
                        { key: 'reservas', label: 'Nuevas reservas y modificaciones' },
                        { key: 'cambiosEstado', label: 'Cambios de estado de espacios' },
                        { key: 'mantenimiento', label: 'Alertas de mantenimiento' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{label}</span>
                          <button
                            onClick={() => setConfigNotificaciones(prev => ({ 
                              ...prev, 
                              [key]: !prev[key as keyof ConfiguracionNotificaciones] 
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              configNotificaciones[key as keyof ConfiguracionNotificaciones]
                                ? 'bg-blue-600'
                                : 'bg-gray-200'
                            }`}
                              aria-label={`Activar/desactivar ${label}`}
                              title={`Activar/desactivar ${label}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                configNotificaciones[key as keyof ConfiguracionNotificaciones]
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Canales de notificación */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Canales de notificación</h4>
                      {[
                        { key: 'email', label: 'Correo electrónico' },
                        { key: 'push', label: 'Notificaciones push' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{label}</span>
                          <button
                            onClick={() => setConfigNotificaciones(prev => ({ 
                              ...prev, 
                              [key]: !prev[key as keyof ConfiguracionNotificaciones] 
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              configNotificaciones[key as keyof ConfiguracionNotificaciones]
                                ? 'bg-blue-600'
                                : 'bg-gray-200'
                            }`}
                              aria-label={`Activar/desactivar ${label}`}
                              title={`Activar/desactivar ${label}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                configNotificaciones[key as keyof ConfiguracionNotificaciones]
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Frecuencia */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frecuencia de notificaciones
                      </label>
                      <select
                        value={configNotificaciones.frecuencia}
                        onChange={(e) => setConfigNotificaciones(prev => ({ 
                          ...prev, 
                          frecuencia: e.target.value as any 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Frecuencia de notificaciones"
                          title="Frecuencia de notificaciones"
                      >
                        <option value="inmediata">Inmediata</option>
                        <option value="agrupada">Agrupada (cada hora)</option>
                        <option value="diaria">Resumen diario</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sistema' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('config.system.title')}</h3>
                  
                  <div className="space-y-4">
                    {/* Formato de fecha */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Formato de fecha
                      </label>
                      <select
                        value={configSistema.formatoFecha}
                        onChange={(e) => setConfigSistema(prev => ({ 
                          ...prev, 
                          formatoFecha: e.target.value as any 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Formato de fecha"
                          title="Formato de fecha"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    {/* Formato de hora */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Formato de hora
                      </label>
                      <select
                        value={configSistema.formatoHora}
                        onChange={(e) => setConfigSistema(prev => ({ 
                          ...prev, 
                          formatoHora: e.target.value as any 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Formato de hora"
                          title="Formato de hora"
                      >
                        <option value="12h">12 horas (AM/PM)</option>
                        <option value="24h">24 horas</option>
                      </select>
                    </div>

                    {/* Zona horaria */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zona horaria
                      </label>
                      <select
                        value={configSistema.zonaHoraria}
                        onChange={(e) => setConfigSistema(prev => ({ 
                          ...prev, 
                          zonaHoraria: e.target.value 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Zona horaria"
                          title="Zona horaria"
                      >
                        <option value="America/Santiago">Santiago (GMT-3)</option>
                        <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
                        <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                        <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                        <option value="America/New_York">Nueva York (GMT-5)</option>
                      </select>
                    </div>

                    {/* Configuraciones avanzadas */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Configuraciones avanzadas</h4>
                      {[
                        { key: 'registrosAuditoria', label: 'Registros de auditoría' },
                        { key: 'backupAutomatico', label: 'Backup automático' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{label}</span>
                          <button
                            onClick={() => setConfigSistema(prev => ({ 
                              ...prev, 
                              [key]: !prev[key as keyof ConfiguracionSistema] 
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              configSistema[key as keyof ConfiguracionSistema]
                                ? 'bg-blue-600'
                                : 'bg-gray-200'
                            }`}
                              aria-label={`Activar/desactivar ${label}`}
                              title={`Activar/desactivar ${label}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                configSistema[key as keyof ConfiguracionSistema]
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Limpieza automática */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Limpieza automática de logs (días)
                      </label>
                      <input
                        type="number"
                        value={configSistema.limpiezaAutomatica}
                        onChange={(e) => setConfigSistema(prev => ({ 
                          ...prev, 
                          limpiezaAutomatica: parseInt(e.target.value) || 30 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="365"
                          aria-label="Limpieza automática de logs (días)"
                          title="Limpieza automática de logs (días)"
                          placeholder="Días para limpieza automática"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seguridad' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('config.security.title')}</h3>
                  
                  <div className="space-y-6">
                    {/* Cambio de contraseña */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Cambiar contraseña</h4>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Contraseña actual"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Contraseña actual"
                            title="Contraseña actual"
                        />
                        <input
                          type="password"
                          placeholder="Nueva contraseña"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Nueva contraseña"
                            title="Nueva contraseña"
                        />
                        <input
                          type="password"
                          placeholder="Confirmar nueva contraseña"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Confirmar nueva contraseña"
                            title="Confirmar nueva contraseña"
                        />
                        <Button variant="secondary" size="sm">
                          Cambiar contraseña
                        </Button>
                      </div>
                    </div>

                    {/* Autenticación de dos factores */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Autenticación de dos factores</h4>
                        <Badge variant="urgente" size="sm">Recomendado</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Añade una capa adicional de seguridad a tu cuenta
                      </p>
                      <Button variant="secondary" size="sm">
                        Configurar 2FA
                      </Button>
                    </div>

                    {/* Sesiones activas */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Sesiones activas</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Sesión actual</p>
                            <p className="text-xs text-gray-500">Windows • Chrome • Santiago</p>
                          </div>
                          <Badge variant="disponible" size="sm">Activa</Badge>
                        </div>
                        <Button variant="secondary" size="sm">
                          Cerrar todas las sesiones
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}