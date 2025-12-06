// Hook personalizado para integrar con el backend serverless
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiResponse, Espacio, Reserva, Zona, Usuario, Responsable, DashboardMetrics } from '@/lib/api-client';

// Hook para datos de espacios
export function useEspacios(filters?: {
  tipo?: string;
  estado?: string;
  zona_id?: string;
  piso?: string;
  edificio?: string;
}) {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchEspacios = useCallback(async () => {
    if (initialLoad) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await apiClient.getEspacios(filters);
      if (response.ok && response.data) {
        setEspacios(response.data.espacios);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar espacios');
        setEspacios([]);
        setTotal(0);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching espacios:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchEspacios();
  }, [fetchEspacios]);

  const refetch = useCallback(() => {
    fetchEspacios();
  }, [fetchEspacios]);

  return {
    espacios,
    loading,
    error,
    total,
    refetch
  };
}
// Hook para datos de reservas
export function useReservas(filters?: {
  usuario_id?: string;
  espacio_id?: string;
  estado?: string;
}) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchReservas = useCallback(async () => {
    if (initialLoad) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await apiClient.getReservas(filters);
      if (response.ok && response.data) {
        setReservas(response.data.reservas);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar reservas');
        setReservas([]);
        setTotal(0);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching reservas:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [JSON.stringify(filters)]);

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
export function useZonas(filters?: {
  activo?: boolean;
  edificio?: string;
}) {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchZonas = useCallback(async () => {
    if (initialLoad) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await apiClient.getZonas();

      const normalizeZona = (zona: Zona): Zona => ({
        ...zona,
        activa: zona.activa ?? zona.capacidadTotal > 0,
      });

      const applyLocalFilters = (data: Zona[]): Zona[] => {
        let result = data;
        if (filters?.activo !== undefined) {
          result = result.filter(z => (z.activa ?? false) === filters.activo);
        }
        if (filters?.edificio) {
          const target = filters.edificio.toLowerCase();
          result = result.filter(z => z.nombre.toLowerCase().includes(target));
        }
        return result;
      };

      let zonasBase: Zona[];

      if (response.ok && response.data) {
        zonasBase = response.data.zonas.map(normalizeZona);
      } else {
        setError(response.error || 'Error al cargar zonas');
        zonasBase = [];
      }

      const zonasFiltradas = applyLocalFilters(zonasBase);

      setZonas(zonasFiltradas);
      setTotal(zonasFiltradas.length);
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching zonas:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchZonas();
  }, [fetchZonas]);

  const refetch = useCallback(() => {
    fetchZonas();
  }, [fetchZonas]);

  return {
    zonas,
    loading,
    error,
    total,
    refetch
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
        setMetrics(null);
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

// Hook para datos de responsables
export function useResponsables(filters?: {
  departamento?: string;
  estado?: string;
}) {
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchResponsables = useCallback(async () => {
    if (initialLoad) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await apiClient.getResponsables(filters);
      if (response.ok && response.data) {
        setResponsables(response.data.responsables);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar responsables');
        setResponsables([]);
        setTotal(0);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching responsables:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchResponsables();
  }, [fetchResponsables]);

  const refetch = useCallback(() => {
    fetchResponsables();
  }, [fetchResponsables]);

  return {
    responsables,
    loading,
    error,
    total,
    refetch
  };
}

// Hook para datos de usuarios
export function useUsuarios(filters?: {
  rol?: string;
  activo?: boolean;
  departamento?: string;
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchUsuarios = useCallback(async () => {
    if (initialLoad) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await apiClient.getUsuarios(filters);
      if (response.ok && response.data) {
        setUsuarios(response.data.usuarios);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar usuarios');
        setUsuarios([]);
        setTotal(0);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching usuarios:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const refetch = useCallback(() => {
    return fetchUsuarios();
  }, [fetchUsuarios]);

  const toggleUsuarioEstado = useCallback(async (id: string, activo: boolean) => {
    try {
      const response = await apiClient.toggleUsuarioEstado(id, activo);
      if (response.ok && response.data) {
        setUsuarios((prev) => prev.map((user) => (user.id === id ? response.data as Usuario : user)));
        return response.data as Usuario;
      }

      const message = response.error || 'No se pudo actualizar el estado del usuario';
      throw new Error(message);
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('No se pudo actualizar el estado del usuario');
    }
  }, []);

  const createUsuario = useCallback(async (data: Omit<Usuario, 'id'> & { password?: string }) => {
    const response = await apiClient.createUsuario(data);
    if (response.ok && response.data) {
      setUsuarios((prev) => [response.data as Usuario, ...prev]);
      setTotal((prev) => prev + 1);
      return response.data as Usuario;
    }

    const message = response.error || 'No se pudo crear el usuario';
    throw new Error(message);
  }, []);

  const updateUsuario = useCallback(async (id: string, data: Partial<Usuario> & { password?: string }) => {
    const response = await apiClient.updateUsuario(id, data);
    if (response.ok && response.data) {
      setUsuarios((prev) => prev.map((user) => (user.id === id ? response.data as Usuario : user)));
      return response.data as Usuario;
    }

    const message = response.error || 'No se pudo actualizar el usuario';
    throw new Error(message);
  }, []);

  return {
    usuarios,
    loading,
    error,
    total,
    refetch,
    toggleUsuarioEstado,
    createUsuario,
    updateUsuario
  };
}
