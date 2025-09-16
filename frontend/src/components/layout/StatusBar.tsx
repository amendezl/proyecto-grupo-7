// StatusBar - Barra de estado del sistema de espacios
// Información importante y alertas en tiempo real

'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SystemStatus {
  connectivity: 'connected' | 'disconnected' | 'unstable';
  lastSync: Date;
  activeAlerts: number;
  onlineUsers: number;
  systemLoad: 'low' | 'medium' | 'high' | 'critical';
}

export default function StatusBar() {
  const [status, setStatus] = useState<SystemStatus>({
    connectivity: 'connected',
    lastSync: new Date(),
    activeAlerts: 0,
    onlineUsers: 12,
    systemLoad: 'low'
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simular actualizaciones de estado (en producción vendría del WebSocket)
  useEffect(() => {
    const statusTimer = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        onlineUsers: Math.floor(Math.random() * 20) + 5
      }));
    }, 30000); // Cada 30 segundos

    return () => clearInterval(statusTimer);
  }, []);

  const getConnectivityColor = () => {
    switch (status.connectivity) {
      case 'connected': return 'text-green-600';
      case 'unstable': return 'text-amber-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSystemLoadColor = () => {
    switch (status.systemLoad) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-blue-600';
      case 'high': return 'text-amber-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gray-900 text-white text-xs py-1">
      <div className="flex items-center justify-between px-4">
        {/* Lado izquierdo - Estado del sistema */}
        <div className="flex items-center space-x-6">
          {/* Conectividad */}
          <div className="flex items-center space-x-1">
            {status.connectivity === 'connected' ? (
              <Wifi className={`w-3 h-3 ${getConnectivityColor()}`} />
            ) : (
              <WifiOff className={`w-3 h-3 ${getConnectivityColor()}`} />
            )}
            <span className={getConnectivityColor()}>
              {status.connectivity === 'connected' ? 'Online' : 
               status.connectivity === 'unstable' ? 'Inestable' : 'Desconectado'}
            </span>
          </div>

          {/* Última sincronización */}
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-gray-300">
              Sync: {status.lastSync.toLocaleTimeString()}
            </span>
          </div>

          {/* Carga del sistema */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              status.systemLoad === 'low' ? 'bg-green-500' :
              status.systemLoad === 'medium' ? 'bg-blue-500' :
              status.systemLoad === 'high' ? 'bg-amber-500' : 'bg-red-500'
            }`}></div>
            <span className={getSystemLoadColor()}>
              Carga: {status.systemLoad.toUpperCase()}
            </span>
          </div>

          {/* Usuarios activos */}
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-300">
              {status.onlineUsers} usuarios conectados
            </span>
          </div>
        </div>

        {/* Centro - Alertas activas */}
        {status.activeAlerts > 0 && (
          <div className="flex items-center space-x-1 animate-pulse">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="text-red-400 font-medium">
              {status.activeAlerts} alerta{status.activeAlerts > 1 ? 's' : ''} activa{status.activeAlerts > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Lado derecho - Hora actual */}
        <div className="flex items-center space-x-4">
          <div className="text-gray-300">
            {currentTime.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="font-mono text-white font-medium">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}