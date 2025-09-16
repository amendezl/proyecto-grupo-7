// Hook personalizado para integrar con el backend serverless
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiResponse, Espacio, Reserva, Zona, Usuario, DashboardMetrics } from '@/lib/api-client';

// Hook para datos de espacios
export function useEspacios(filters?: {
  tipo?: string;
  estado?: string;
  zona_id?: string;
}) {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchEspacios = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getEspacios(filters);
      if (response.ok) {
        setEspacios(response.data.espacios);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar espacios');
        // Fallback con datos simulados para desarrollo
        setEspacios([
          {
            id: '1',
            nombre: 'Sala de Reuniones A',
            descripcion: 'Sala principal para reuniones ejecutivas',
            capacidad: 8,
            tipo: 'sala_reunion',
            estado: 'ocupado',
            zona_id: 'zona-1',
            zona_nombre: 'Piso 1 - Norte',
            equipamiento: ['proyector', 'pizarra', 'videoconferencia'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            usuario_actual: 'Juan Pérez',
            proxima_reserva: '14:30'
          },
          {
            id: '2',
            nombre: 'Oficina 201',
            descripcion: 'Oficina individual con vista al jardín',
            capacidad: 2,
            tipo: 'oficina',
            estado: 'disponible',
            zona_id: 'zona-2',
            zona_nombre: 'Piso 2',
            equipamiento: ['escritorio', 'silla_ergonomica'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '3',
            nombre: 'Lab. Computación',
            descripcion: 'Laboratorio de cómputo con 20 estaciones',
            capacidad: 20,
            tipo: 'laboratorio',
            estado: 'mantenimiento',
            zona_id: 'zona-3',
            zona_nombre: 'Piso 3',
            equipamiento: ['computadoras', 'proyector', 'aire_acondicionado'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
        setTotal(3);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching espacios:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEspacios();
  }, [fetchEspacios]);

  return {
    espacios,
    loading,
    error,
    total,
    refetch: fetchEspacios
  };
}

// Hook para datos de reservas
export function useReservas(filters?: {
  usuario_id?: string;
  espacio_id?: string;
  estado?: string;
}) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getReservas(filters);
      if (response.ok) {
        setReservas(response.data.reservas);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar reservas');
        // Fallback con datos simulados
        setReservas([
          {
            id: '1',
            espacio_id: '1',
            espacio_nombre: 'Sala de Reuniones A',
            usuario_id: 'user-1',
            usuario_nombre: 'Juan Pérez',
            fecha_inicio: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            fecha_fin: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            estado: 'confirmada',
            proposito: 'Reunión de equipo',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            espacio_id: '2',
            espacio_nombre: 'Oficina 201',
            usuario_id: 'user-2',
            usuario_nombre: 'María García',
            fecha_inicio: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            fecha_fin: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            estado: 'pendiente',
            proposito: 'Trabajo individual',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
        setTotal(2);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching reservas:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReservas();
  }, [fetchReservas]);

  return {
    reservas,
    loading,
    error,
    total,
    refetch: fetchReservas
  };
}

// Hook para datos de zonas
export function useZonas() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZonas = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getZonas();
      if (response.ok) {
        setZonas(response.data.zonas);
      } else {
        setError(response.error || 'Error al cargar zonas');
        // Fallback con datos simulados
        setZonas([
          {
            id: 'zona-1',
            nombre: 'Piso 1 - Norte',
            descripcion: 'Área norte del primer piso',
            piso: 1,
            edificio: 'Principal',
            capacidad_total: 50,
            espacios_count: 12,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'zona-2',
            nombre: 'Piso 2',
            descripcion: 'Segundo piso completo',
            piso: 2,
            edificio: 'Principal',
            capacidad_total: 80,
            espacios_count: 15,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'zona-3',
            nombre: 'Piso 3',
            descripcion: 'Laboratorios y aulas especializadas',
            piso: 3,
            edificio: 'Principal',
            capacidad_total: 100,
            espacios_count: 10,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching zonas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZonas();
  }, [fetchZonas]);

  return {
    zonas,
    loading,
    error,
    refetch: fetchZonas
  };
}

// Hook para métricas del dashboard
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getDashboardMetrics();
      if (response.ok) {
        setMetrics(response.data);
      } else {
        setError(response.error || 'Error al cargar métricas');
        // Fallback con datos simulados
        setMetrics({
          espacios_disponibles: 24,
          espacios_ocupados: 18,
          espacios_mantenimiento: 3,
          reservas_activas: 12,
          reservas_hoy: 89,
          usuarios_activos: 156,
          alertas_activas: 2,
          ocupacion_promedio: 68
        });
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    
    // Actualizar métricas cada 30 segundos
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
}

// Hook para WebSocket en tiempo real
export function useRealtimeUpdates() {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const callbacks = {
      'space_updated': (data: any) => {
        console.log('Espacio actualizado:', data);
        setLastUpdate(new Date());
      },
      'reservation_created': (data: any) => {
        console.log('Nueva reserva:', data);
        setLastUpdate(new Date());
      },
      'system_alert': (data: any) => {
        console.log('Alerta del sistema:', data);
        setLastUpdate(new Date());
      }
    };

    apiClient.connectWebSocket(callbacks);
    setConnected(true);

    return () => {
      apiClient.disconnectWebSocket();
      setConnected(false);
    };
  }, []);

  return {
    connected,
    lastUpdate
  };
}