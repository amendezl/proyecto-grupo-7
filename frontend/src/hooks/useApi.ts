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
      if (response.ok && response.data) {
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
            zona: 'Piso 1 - Norte',
            piso: 1,
            equipamiento: ['proyector', 'pizarra', 'videoconferencia'],
            ultimaActualizacion: new Date().toISOString()
          },
          {
            id: '2',
            nombre: 'Oficina 201',
            descripcion: 'Oficina individual con vista al jardín',
            capacidad: 2,
            tipo: 'oficina',
            estado: 'disponible',
            zona: 'Piso 2',
            piso: 2,
            equipamiento: ['escritorio', 'silla_ergonomica'],
            ultimaActualizacion: new Date().toISOString()
          },
          {
            id: '3',
            nombre: 'Lab. Computación',
            descripcion: 'Laboratorio de cómputo con 20 estaciones',
            capacidad: 20,
            tipo: 'laboratorio',
            estado: 'mantenimiento',
            zona: 'Piso 3',
            piso: 3,
            equipamiento: ['computadoras', 'proyector', 'aire_acondicionado'],
            ultimaActualizacion: new Date().toISOString()
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
      if (response.ok && response.data) {
        setReservas(response.data.reservas);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar reservas');
        // Fallback con datos simulados
        setReservas([
          {
            id: '1',
            espacioId: '1',
            usuarioId: 'user-1',
            fechaInicio: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            fechaFin: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            estado: 'confirmada',
            proposito: 'Reunión de equipo',
            participantes: 6
          },
          {
            id: '2',
            espacioId: '2',
            usuarioId: 'user-2',
            fechaInicio: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            fechaFin: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            estado: 'pendiente',
            proposito: 'Trabajo individual',
            participantes: 1
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
      if (response.ok && response.data) {
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
            capacidadTotal: 50,
            espaciosDisponibles: 35,
            color: '#3B82F6'
          },
          {
            id: 'zona-2',
            nombre: 'Piso 2',
            descripcion: 'Segundo piso completo',
            piso: 2,
            capacidadTotal: 80,
            espaciosDisponibles: 60,
            color: '#10B981'
          },
          {
            id: 'zona-3',
            nombre: 'Piso 3',
            descripcion: 'Laboratorios y aulas especializadas',
            piso: 3,
            capacidadTotal: 100,
            espaciosDisponibles: 75,
            color: '#F59E0B'
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
      if (response.ok && response.data) {
        setMetrics(response.data);
      } else {
        setError(response.error || 'Error al cargar métricas');
        // Fallback con datos simulados
        setMetrics({
          totalEspacios: 45,
          espaciosDisponibles: 24,
          espaciosOcupados: 18,
          espaciosMantenimiento: 3,
          reservasHoy: 89,
          ocupacionPromedio: 68
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
      onMessage: (data: any) => {
        console.log('Mensaje WebSocket recibido:', data);
        
        // Procesar diferentes tipos de mensajes
        switch (data.type) {
          case 'space_updated':
            console.log('Espacio actualizado:', data);
            break;
          case 'reservation_created':
            console.log('Nueva reserva:', data);
            break;
          case 'system_alert':
            console.log('Alerta del sistema:', data);
            break;
        }
        
        setLastUpdate(new Date());
      },
      onError: (error: Event) => {
        console.error('Error WebSocket:', error);
      },
      onClose: () => {
        console.log('WebSocket cerrado');
        setConnected(false);
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