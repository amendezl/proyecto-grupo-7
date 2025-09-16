'use client';

import React from 'react';
import { 
  MapPin, 
  Users, 
  Calendar, 
  AlertTriangle,
  Building2,
  Clock,
  Activity
} from 'lucide-react';
import { 
  MetricCard, 
  Alert, 
  SpaceCard, 
  Badge,
  Button 
} from '@/components/ui/components';
import { useDashboardMetrics, useEspacios, useRealtimeUpdates } from '@/hooks/useApi';

export default function DashboardPage() {
  const { metrics, loading: metricsLoading, error: metricsError } = useDashboardMetrics();
  const { espacios, loading: espaciosLoading } = useEspacios({ estado: undefined });
  const { connected, lastUpdate } = useRealtimeUpdates();

  // Datos por defecto mientras cargan
  const defaultMetrics = {
    espacios_disponibles: 24,
    espacios_ocupados: 18,
    espacios_mantenimiento: 3,
    usuarios_activos: 156,
    reservas_hoy: 89,
    alertas_activas: 2
  };

  const currentMetrics = metrics || defaultMetrics;
  const espaciosRecientes = espacios.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header del Dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitoreo en tiempo real del sistema de espacios
            {lastUpdate && (
              <span className="ml-2 text-sm text-green-600">
                • Última actualización: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={connected ? "disponible" : "urgente"}>
            {connected ? "Sistema Conectado" : "Desconectado"}
          </Badge>
          <Button variant="primary">
            <Activity className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Alertas importantes */}
      {metricsError && (
        <Alert
          type="warning"
          title="Modo sin conexión"
          message="Mostrando datos simulados. Verifique la conexión al backend."
        />
      )}

      {currentMetrics.alertas_activas > 0 && (
        <Alert
          type="warning"
          title={`${currentMetrics.alertas_activas} alertas activas`}
          message="Se han detectado algunas situaciones que requieren atención."
        />
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Espacios Disponibles"
          value={currentMetrics.espacios_disponibles}
          icon={MapPin}
          color="green"
          trend={{ direction: 'up', percentage: 12 }}
        />
        <MetricCard
          title="Usuarios Activos"
          value={currentMetrics.usuarios_activos}
          icon={Users}
          color="blue"
          trend={{ direction: 'down', percentage: 5 }}
        />
        <MetricCard
          title="Reservas Hoy"
          value={currentMetrics.reservas_hoy}
          icon={Calendar}
          color="purple"
        />
        <MetricCard
          title="Alertas Activas"
          value={currentMetrics.alertas_activas}
          icon={AlertTriangle}
          color={currentMetrics.alertas_activas > 0 ? "red" : "green"}
          urgent={currentMetrics.alertas_activas > 2}
        />
      </div>

      {/* Estado de espacios en tiempo real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Espacios destacados */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Espacios Destacados</h2>
            <Badge variant="disponible" size="sm">
              {espaciosRecientes.length} espacios
            </Badge>
          </div>
          
          {espaciosLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {espaciosRecientes.map((espacio) => (
                <SpaceCard
                  key={espacio.id}
                  nombre={espacio.nombre}
                  zona={espacio.zona_nombre || 'Sin zona'}
                  capacidad={espacio.capacidad}
                  estado={espacio.estado}
                  usuarioActual={espacio.usuario_actual}
                  proximaReserva={espacio.proxima_reserva}
                  onClick={() => alert(`Ver detalles de ${espacio.nombre}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Panel de actividad */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Nueva reserva creada
                </p>
                <p className="text-xs text-gray-600">
                  Sala de Reuniones B - 15:30 a 16:30
                </p>
                <p className="text-xs text-gray-500 mt-1">Hace 2 minutos</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Espacio liberado
                </p>
                <p className="text-xs text-gray-600">
                  Oficina 305 ahora disponible
                </p>
                <p className="text-xs text-gray-500 mt-1">Hace 5 minutos</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
              <div className="w-2 h-2 bg-amber-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Mantenimiento programado
                </p>
                <p className="text-xs text-gray-600">
                  Lab. Computación fuera de servicio
                </p>
                <p className="text-xs text-gray-500 mt-1">Hace 10 minutos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de zonas */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Estado por Zonas</h2>
          <Building2 className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Piso 1</h3>
              <Badge variant="disponible" size="sm">8/12</Badge>
            </div>
            <p className="text-sm text-gray-600">8 espacios disponibles</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-green-600 h-2 rounded-full w-2/3"></div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Piso 2</h3>
              <Badge variant="ocupado" size="sm">12/15</Badge>
            </div>
            <p className="text-sm text-gray-600">3 espacios disponibles</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-red-600 h-2 rounded-full w-4/5"></div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Piso 3</h3>
              <Badge variant="mantenimiento" size="sm">2/10</Badge>
            </div>
            <p className="text-sm text-gray-600">2 en mantenimiento</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-amber-600 h-2 rounded-full w-1/5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}