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
export function useZonas(filters?: {
  activo?: boolean;
  edificio?: string;
}) {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchZonas = useCallback(async () => {
    setLoading(true);
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
        const fallbackData: Zona[] = [
          {
            id: 'zona-1',
            nombre: 'Piso 1 - Norte',
            descripcion: 'Área norte del primer piso',
            piso: 1,
            capacidadTotal: 50,
            espaciosDisponibles: 35,
            color: '#3B82F6',
            activa: true,
          },
          {
            id: 'zona-2',
            nombre: 'Piso 2',
            descripcion: 'Segundo piso completo',
            piso: 2,
            capacidadTotal: 80,
            espaciosDisponibles: 60,
            color: '#10B981',
            activa: true,
          },
          {
            id: 'zona-3',
            nombre: 'Piso 3',
            descripcion: 'Laboratorios y aulas especializadas',
            piso: 3,
            capacidadTotal: 100,
            espaciosDisponibles: 75,
            color: '#F59E0B',
            activa: false,
          }
        ];

        zonasBase = fallbackData.map(normalizeZona);
      }

      const zonasFiltradas = applyLocalFilters(zonasBase);

      setZonas(zonasFiltradas);
      setTotal(zonasFiltradas.length);
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching zonas:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

// Hook para datos de responsables
export function useResponsables(filters?: {
  departamento?: string;
  estado?: string;
}) {
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchResponsables = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getResponsables(filters);
      if (response.ok && response.data) {
        setResponsables(response.data.responsables);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar responsables');
        // Fallback con datos simulados para desarrollo
        setResponsables([
          {
            id: '1',
            nombre: 'Dr. Ana',
            apellido: 'Martínez',
            email: 'ana.martinez@hospital.com',
            telefono: '+34 612 345 678',
            departamento: 'Cardiología',
            especialidad: 'Cardiología Intervencionista',
            areas: ['Urgencias', 'Consultas Externas'],
            espaciosAsignados: ['1', '3', '5'],
            estado: 'activo',
            fechaCreacion: '2024-01-15T00:00:00Z',
            ultimoAcceso: '2024-01-15T10:30:00Z',
            estadisticas: {
              espaciosGestionados: 3,
              reservasAprobadas: 45,
              incidentesResueltos: 12
            }
          },
          {
            id: '2',
            nombre: 'Dr. Carlos',
            apellido: 'López',
            email: 'carlos.lopez@hospital.com',
            telefono: '+34 612 345 679',
            departamento: 'Neurología',
            especialidad: 'Neurocirugía',
            areas: ['Quirófanos', 'UCI'],
            espaciosAsignados: ['2', '4'],
            estado: 'activo',
            fechaCreacion: '2024-01-10T00:00:00Z',
            ultimoAcceso: '2024-01-15T09:15:00Z',
            estadisticas: {
              espaciosGestionados: 2,
              reservasAprobadas: 32,
              incidentesResueltos: 8
            }
          }
        ]);
        setTotal(2);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching responsables:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getUsuarios(filters);
      if (response.ok && response.data) {
        setUsuarios(response.data.usuarios);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Error al cargar usuarios');
        // Fallback con datos simulados para desarrollo
        setUsuarios([
          {
            id: '1',
            nombre: 'Dr. Juan Pérez',
            email: 'juan.perez@hospital.com',
            rol: 'admin',
            departamento: 'Administración',
            activo: true
          },
          {
            id: '2',
            nombre: 'Dra. María García',
            email: 'maria.garcia@hospital.com',
            rol: 'responsable',
            departamento: 'Cardiología',
            activo: true
          },
          {
            id: '3',
            nombre: 'Carlos López',
            email: 'carlos.lopez@hospital.com',
            rol: 'usuario',
            departamento: 'Neurología',
            activo: false
          }
        ]);
        setTotal(3);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching usuarios:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
