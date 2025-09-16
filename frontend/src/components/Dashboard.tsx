// Dashboard de Gestión de Espacios - Tiempo Real Consolidado
// Combina funcionalidad WebSocket real con diseño mejorado

'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Users, BarChart3, Clock, Building2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useRealtime, realtimeClient, REALTIME_CONFIG } from '@/lib/realtime-config';

// Interfaces para el sistema de espacios
interface EspacioData {
  id: string;
  nombre: string;
  zona: string;
  capacidad: number;
  estado: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado';
  proximaReserva?: string;
  usuarioActual?: string;
}

interface SystemMetrics {
  espaciosDisponibles: number;
  espaciosOcupados: number;
  espaciosMantenimiento: number;
  reservasHoy: number;
  usuariosActivos: number;
  porcentajeOcupacion: number;
}

interface NotificationItem {
  id: string;
  mensaje: string;
  tipo: 'reserva' | 'estado' | 'sistema';
  timestamp: Date;
}

export default function Dashboard() {
  // Estados para métricas y espacios
  const [espacios, setEspacios] = useState<EspacioData[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    espaciosDisponibles: 0,
    espaciosOcupados: 0,
    espaciosMantenimiento: 0,
    reservasHoy: 0,
    usuariosActivos: 0,
    porcentajeOcupacion: 0
  });

  // Estados para conexión y notificaciones en tiempo real
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Inicializar datos mock y establecer conexión WebSocket
  useEffect(() => {
    // Datos mock iniciales
    const mockEspacios: EspacioData[] = [
      {
        id: '1',
        nombre: 'Sala de Reuniones A',
        zona: 'Piso 1 - Norte',
        capacidad: 8,
        estado: 'ocupado',
        proximaReserva: '14:30',
        usuarioActual: 'Juan Pérez'
      },
      {
        id: '2', 
        nombre: 'Oficina 201',
        zona: 'Piso 2',
        capacidad: 4,
        estado: 'disponible'
      },
      {
        id: '3',
        nombre: 'Aula Magna',
        zona: 'Planta Baja',
        capacidad: 50,
        estado: 'reservado',
        proximaReserva: '15:00'
      },
      {
        id: '4',
        nombre: 'Lab. Computación',
        zona: 'Piso 3',
        capacidad: 20,
        estado: 'mantenimiento'
      },
      {
        id: '5',
        nombre: 'Sala de Juntas B',
        zona: 'Piso 2',
        capacidad: 12,
        estado: 'disponible'
      }
    ];

    setEspacios(mockEspacios);
    updateMetricsFromEspacios(mockEspacios);

    // Establecer conexión WebSocket
    realtimeClient.connect();
    
    // Monitorear estado de conexión
    const checkConnection = setInterval(() => {
      setConnectionStatus(realtimeClient.isConnected ? 'connected' : 'disconnected');
    }, 1000);
    
    return () => {
      clearInterval(checkConnection);
      realtimeClient.disconnect();
    };
  }, []);

  // Función para actualizar métricas basadas en espacios
  const updateMetricsFromEspacios = (espaciosData: EspacioData[]) => {
    const disponibles = espaciosData.filter(e => e.estado === 'disponible').length;
    const ocupados = espaciosData.filter(e => e.estado === 'ocupado').length;
    const mantenimiento = espaciosData.filter(e => e.estado === 'mantenimiento').length;
    const total = espaciosData.length;
    
    setMetrics({
      espaciosDisponibles: disponibles,
      espaciosOcupados: ocupados,
      espaciosMantenimiento: mantenimiento,
      reservasHoy: 12, // Este valor vendría del WebSocket en un escenario real
      usuariosActivos: 24,
      porcentajeOcupacion: Math.round((ocupados / total) * 100)
    });
  };

  // Función para agregar notificación
  const addNotification = (mensaje: string, tipo: 'reserva' | 'estado' | 'sistema') => {
    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      mensaje,
      tipo,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    setLastUpdate(new Date());
    
    // Notificación del navegador
    if (Notification.permission === 'granted') {
      new Notification('Actualización del Sistema', {
        body: mensaje,
        icon: '/favicon.ico'
      });
    }
  };

  // Suscripción a eventos WebSocket - Nueva reserva
  useRealtime(REALTIME_CONFIG.EVENTS.RESERVA_CREADA, (data: any) => {
    console.log('🆕 Nueva reserva en tiempo real:', data);
    
    setMetrics(prev => ({
      ...prev,
      reservasHoy: prev.reservasHoy + 1
    }));
    
    const mensaje = `Nueva reserva: ${data.data?.espacio_nombre || 'Espacio'} por ${data.data?.usuario_nombre || 'Usuario'}`;
    addNotification(mensaje, 'reserva');
  });

  // Suscripción a cambios de estado de espacios
  useRealtime('espacio_estado_cambiado', (data: any) => {
    console.log('🏥 Estado de espacio cambió:', data);
    
    const espacioData = data.data;
    
    // Actualizar el espacio específico
    setEspacios(prev => {
      const updated = prev.map(espacio => 
        espacio.id === espacioData.id 
          ? { ...espacio, estado: espacioData.estado_nuevo }
          : espacio
      );
      updateMetricsFromEspacios(updated);
      return updated;
    });
    
    const mensaje = `${espacioData.nombre}: ${espacioData.estado_anterior} → ${espacioData.estado_nuevo}`;
    addNotification(mensaje, 'estado');
  });

  // Suscripción a actualizaciones de estadísticas
  useRealtime('stats_update', (data: any) => {
    console.log('📊 Estadísticas actualizadas:', data);
    if (data.data) {
      setMetrics(prev => ({ ...prev, ...data.data }));
      addNotification('Estadísticas del sistema actualizadas', 'sistema');
    }
  });

  // Solicitar permisos de notificación
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Función para obtener el icono de estado de conexión
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-4 w-4" />;
      case 'disconnected': return <WifiOff className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Función para obtener color del estado del espacio
  const getEstadoStyles = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'bg-green-100 text-green-800 border-green-200';
      case 'ocupado': return 'bg-red-100 text-red-800 border-red-200';
      case 'mantenimiento': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'reservado': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header con estado de conexión */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Espacios</h1>
            <p className="text-gray-600 mt-2">Gestión en tiempo real de espacios y reservas</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
              connectionStatus === 'connected' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : connectionStatus === 'disconnected'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {getConnectionIcon()}
              <span className="text-sm font-medium capitalize">
                {connectionStatus === 'connected' ? 'Conectado' : 
                 connectionStatus === 'disconnected' ? 'Desconectado' : 'Conectando...'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </p>
              {connectionStatus === 'disconnected' && (
                <button
                  onClick={() => realtimeClient.connect()}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Reconectar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Espacios Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{metrics.espaciosDisponibles}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <MapPin className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Espacios Ocupados</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{metrics.espaciosOcupados}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 text-red-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reservas Hoy</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{metrics.reservasHoy}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{metrics.usuariosActivos}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">% Ocupación</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{metrics.porcentajeOcupacion}%</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mantenimiento</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{metrics.espaciosMantenimiento}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Estado de espacios */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Estado de Espacios</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Ver todos los espacios
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {espacios.map((espacio) => (
              <div key={espacio.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{espacio.nombre}</h3>
                    <p className="text-sm text-gray-500">{espacio.zona}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getEstadoStyles(espacio.estado)}`}>
                    {espacio.estado.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Capacidad: {espacio.capacidad} personas</span>
                  </div>
                  {espacio.usuarioActual && (
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      <span>En uso: {espacio.usuarioActual}</span>
                    </div>
                  )}
                  {espacio.proximaReserva && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Próxima: {espacio.proximaReserva}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actividad en tiempo real */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Actividad en Tiempo Real</h2>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-gray-500 italic text-center py-8">No hay actividad reciente...</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.tipo === 'reserva' ? 'bg-blue-500' :
                      notification.tipo === 'estado' ? 'bg-orange-500' : 'bg-purple-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-gray-700 text-sm">{notification.mensaje}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Alertas del sistema */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas del Sistema</h3>
            <div className="space-y-3">
              {metrics.espaciosMantenimiento > 0 && (
                <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mr-3" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {metrics.espaciosMantenimiento} espacio{metrics.espaciosMantenimiento > 1 ? 's' : ''} en mantenimiento
                    </p>
                    <p className="text-sm text-amber-600">Revisar estado de equipos</p>
                  </div>
                </div>
              )}
              <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-blue-800">Sistema operativo</p>
                  <p className="text-sm text-blue-600">
                    Ocupación actual: {metrics.porcentajeOcupacion}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}