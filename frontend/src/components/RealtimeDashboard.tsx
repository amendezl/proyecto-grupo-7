'use client';

import { useState, useEffect } from 'react';
import { useRealtime, realtimeClient, REALTIME_CONFIG } from '@/lib/realtime-config';

interface DashboardStats {
  reservas_hoy: number;
  espacios_disponibles: number;
  usuarios_conectados: number;
  ultima_actualizacion: string;
}

export default function RealtimeDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    reservas_hoy: 0,
    espacios_disponibles: 0,
    usuarios_conectados: 0,
    ultima_actualizacion: new Date().toISOString()
  });
  
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [notifications, setNotifications] = useState<string[]>([]);

  // Conectar al WebSocket al montar el componente
  useEffect(() => {
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

  // Suscribirse a eventos de reservas en tiempo real
  useRealtime(REALTIME_CONFIG.EVENTS.RESERVA_CREADA, (data: any) => {
    console.log('🆕 Nueva reserva en tiempo real:', data);
    
    // Actualizar estadísticas
    setStats(prev => ({
      ...prev,
      reservas_hoy: prev.reservas_hoy + 1,
      ultima_actualizacion: data.timestamp
    }));
    
    // Agregar notificación
    const mensaje = `Nueva reserva: ${data.data.espacio_nombre} por ${data.data.usuario_nombre}`;
    setNotifications(prev => [mensaje, ...prev.slice(0, 4)]); // Mantener solo las 5 más recientes
    
    // Mostrar notificación del navegador (si tiene permisos)
    if (Notification.permission === 'granted') {
      new Notification('Nueva Reserva', {
        body: mensaje,
        icon: '/favicon.ico'
      });
    }
  });

  // Suscribirse a cambios de estado de espacios
  useRealtime('espacio_estado_cambiado', (data: any) => {
    console.log('🏥 Estado de espacio cambió:', data);
    
    const espacioData = data.data;
    
    // Actualizar contador de espacios disponibles
    if (espacioData.estado_nuevo === 'disponible' && espacioData.estado_anterior !== 'disponible') {
      setStats(prev => ({
        ...prev,
        espacios_disponibles: prev.espacios_disponibles + 1,
        ultima_actualizacion: data.timestamp
      }));
    } else if (espacioData.estado_anterior === 'disponible' && espacioData.estado_nuevo !== 'disponible') {
      setStats(prev => ({
        ...prev,
        espacios_disponibles: Math.max(0, prev.espacios_disponibles - 1),
        ultima_actualizacion: data.timestamp
      }));
    }
    
    // Agregar notificación
    const mensaje = `${espacioData.nombre}: ${espacioData.estado_anterior} → ${espacioData.estado_nuevo}`;
    setNotifications(prev => [mensaje, ...prev.slice(0, 4)]);
  });

  // Suscribirse a actualizaciones de estadísticas
  useRealtime('stats_update', (data: any) => {
    console.log('📊 Estadísticas actualizadas:', data);
    setStats(data.data);
  });

  // Solicitar permisos de notificación al cargar
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'disconnected': return '🔴';
      default: return '🟡';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header con estado de conexión */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard en Tiempo Real ⚡
        </h1>
        
        <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
          <span className="text-lg">{getConnectionStatusIcon()}</span>
          <span className="font-medium capitalize">{connectionStatus}</span>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reservas de hoy */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Reservas Hoy</p>
              <p className="text-3xl font-bold text-blue-900">{stats.reservas_hoy}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>

        {/* Espacios disponibles */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Espacios Disponibles</p>
              <p className="text-3xl font-bold text-green-900">{stats.espacios_disponibles}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">🏥</span>
            </div>
          </div>
        </div>

        {/* Usuarios conectados */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Usuarios Conectados</p>
              <p className="text-3xl font-bold text-purple-900">{stats.usuarios_conectados}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notificaciones en tiempo real */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Actividad en Tiempo Real 📢
          </h2>
          <span className="text-sm text-gray-500">
            Última actualización: {new Date(stats.ultima_actualizacion).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-gray-500 italic">No hay actividad reciente...</p>
          ) : (
            notifications.map((notification, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <span className="text-blue-500">•</span>
                <span className="text-gray-700">{notification}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  Hace {index + 1} evento{index > 0 ? 's' : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Indicador de conexión WebSocket */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Estado del Sistema</h3>
            <p className="text-sm text-gray-600">
              WebSocket: <span className={getConnectionStatusColor()}>{connectionStatus}</span>
            </p>
          </div>
          
          {connectionStatus === 'disconnected' && (
            <button
              onClick={() => realtimeClient.connect()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Reconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}