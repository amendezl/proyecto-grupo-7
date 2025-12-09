import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from './config';

// Tipos para las respuestas de la API
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

// Tipos de datos del dominio
export interface Espacio {
  id: string;
  nombre: string;
  descripcion: string;
  capacidad: number;
  estado: 'disponible' | 'ocupado' | 'mantenimiento';
  tipo: string;
  zona: string;
  zonaId?: string;
  edificio?: string;
  piso: number;
  equipamiento: string[];
  ultimaActualizacion: string;
}

export interface Zona {
  id: string;
  nombre: string;
  descripcion?: string;
  piso: number;
  capacidadTotal: number;
  espaciosDisponibles: number;
  color?: string;
  activa?: boolean;
  edificio?: string;
  tipoZona?: string;
}

export interface Reserva {
  id: string;
  espacioId: string;
  usuarioId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada';
  proposito: string;
  participantes: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  rol: 'admin' | 'responsable' | 'usuario';
  departamento?: string;
  telefono?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Responsable {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  departamento: string;
  especialidad?: string;
  areas: string[];
  espaciosAsignados: string[];
  estado: 'activo' | 'inactivo';
  fechaCreacion: string;
  ultimoAcceso?: string;
  estadisticas: {
    espaciosGestionados: number;
    reservasAprobadas: number;
    incidentesResueltos: number;
  };
}

export interface DashboardMetrics {
  totalEspacios: number;
  espaciosDisponibles: number;
  espaciosOcupados: number;
  espaciosMantenimiento: number;
  reservasHoy: number;
  ocupacionPromedio: number;
}

// Tipos para autenticación
export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'admin' | 'responsable' | 'usuario';
  activo: boolean;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

const safeString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const safeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const safeBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return fallback;
};

const ensureArray = <T = string>(value: unknown, mapItem?: (item: any) => T): T[] => {
  if (Array.isArray(value)) {
    return mapItem ? value.map(mapItem) : value as T[];
  }
  if (value === null || value === undefined) {
    return [];
  }
  const mapped = mapItem ? mapItem(value) : (value as T);
  return [mapped];
};

const normalizeEstadoEspacio = (estado: string): Espacio['estado'] => {
  const normalized = estado.toLowerCase();
  if (normalized === 'disponible' || normalized === 'ocupado' || normalized === 'mantenimiento') {
    return normalized;
  }
  return 'disponible';
};

const normalizeEstadoReserva = (estado: string): Reserva['estado'] => {
  const normalized = estado.toLowerCase();
  if (normalized === 'pendiente' || normalized === 'confirmada' || normalized === 'cancelada') {
    return normalized;
  }
  return 'pendiente';
};

const normalizeRol = (rol: string): Usuario['rol'] => {
  const normalized = rol.toLowerCase();
  if (normalized === 'admin' || normalized === 'responsable' || normalized === 'usuario') {
    return normalized;
  }
  return 'usuario';
};

const mapEspacioFromApi = (raw: any): Espacio => {
  const ubicacion = raw?.ubicacion ?? {};
  const zonaId = safeString(raw?.zona_id ?? raw?.zonaId ?? '', '');
  const zonaNombre = safeString(raw?.zonaNombre ?? raw?.zona ?? ubicacion?.zona ?? zonaId);

  let equipamiento: string[] = [];
  if (Array.isArray(raw?.equipamiento)) {
    equipamiento = raw.equipamiento;
  } else if (typeof raw?.equipamiento === 'string') {
    equipamiento = raw.equipamiento.split(',').map((item: string) => item.trim()).filter(Boolean);
  }

  const estado = safeString(raw?.estado ?? 'disponible');

  return {
    id: safeString(raw?.id ?? raw?.PK ?? ''),
    nombre: safeString(raw?.nombre ?? 'Espacio sin nombre'),
    descripcion: safeString(raw?.descripcion ?? ''),
    capacidad: safeNumber(raw?.capacidad ?? raw?.capacidad_total ?? 0),
    estado: normalizeEstadoEspacio(estado),
    tipo: safeString(raw?.tipo ?? 'otro'),
    zona: zonaNombre,
    zonaId: zonaId || undefined,
    edificio: safeString(ubicacion?.edificio ?? raw?.edificio ?? ''),
    piso: safeNumber(ubicacion?.piso ?? raw?.piso ?? 0),
    equipamiento,
    ultimaActualizacion: safeString(
      raw?.updatedAt ?? raw?.updated_at ?? raw?.fecha_actualizacion ?? raw?.ultimaActualizacion ?? new Date().toISOString()
    ),
  };
};

const mapZonaFromApi = (raw: any): Zona => {
  const capacidad = safeNumber(
    raw?.capacidadTotal ?? raw?.capacidad_total ?? raw?.capacidadMaxima ?? raw?.capacidad_maxima ?? raw?.capacidad ?? 0
  );

  const espaciosDisponibles = safeNumber(
    raw?.espaciosDisponibles ?? raw?.espacios_disponibles ?? raw?.metricas?.disponibles ?? raw?.estadisticas?.disponibles ?? 0
  );

  let activa: boolean | undefined;
  if (typeof raw?.activa === 'boolean') {
    activa = raw.activa;
  } else if (typeof raw?.estado === 'string') {
    activa = raw.estado.toLowerCase() === 'activa';
  }

  return {
    id: safeString(raw?.id ?? raw?.PK ?? ''),
    nombre: safeString(raw?.nombre ?? 'Zona sin nombre'),
    descripcion: raw?.descripcion ? safeString(raw.descripcion) : undefined,
    piso: safeNumber(raw?.piso ?? raw?.ubicacion?.piso ?? 0),
    capacidadTotal: capacidad,
    espaciosDisponibles,
    color: raw?.color ? safeString(raw.color) : undefined,
    activa,
    edificio: raw?.edificio ? safeString(raw.edificio) : raw?.ubicacion?.edificio ? safeString(raw.ubicacion.edificio) : undefined,
    tipoZona: raw?.tipoZona ? safeString(raw.tipoZona) : raw?.tipo_zona ? safeString(raw.tipo_zona) : undefined,
  };
};

const mapReservaFromApi = (raw: any): Reserva => {
  const fechaInicioRaw = raw?.fecha_inicio ?? raw?.fechaInicio ?? raw?.fecha_reserva ?? raw?.inicio;
  const fechaFinRaw = raw?.fecha_fin ?? raw?.fechaFin ?? raw?.fin ?? raw?.fecha_reserva;
  const estado = safeString(raw?.estado ?? 'pendiente');

  return {
    id: safeString(raw?.id ?? raw?.PK ?? ''),
    espacioId: safeString(raw?.espacio_id ?? raw?.espacioId ?? ''),
    usuarioId: safeString(raw?.usuario_id ?? raw?.usuarioId ?? ''),
    fechaInicio: safeString(fechaInicioRaw ?? new Date().toISOString()),
    fechaFin: safeString(fechaFinRaw ?? new Date().toISOString()),
    estado: normalizeEstadoReserva(estado),
    proposito: safeString(raw?.proposito ?? raw?.motivo ?? ''),
    participantes: safeNumber(raw?.participantes ?? raw?.numero_asistentes ?? raw?.asistentes ?? 0),
  };
};

const mapUsuarioFromApi = (raw: any): Usuario => {
  const rolRaw = safeString(raw?.rol ?? raw?.role ?? 'usuario');

  return {
    id: safeString(raw?.id ?? raw?.PK ?? ''),
    nombre: safeString(raw?.nombre ?? raw?.first_name ?? ''),
    apellido: raw?.apellido ? safeString(raw.apellido) : raw?.last_name ? safeString(raw.last_name) : undefined,
    email: safeString(raw?.email ?? ''),
    rol: normalizeRol(rolRaw),
    departamento: safeString(raw?.departamento ?? raw?.department ?? ''),
    telefono: safeString(raw?.telefono ?? raw?.phone ?? ''),
    activo: raw?.activo !== undefined ? safeBoolean(raw.activo, true) : true,
    createdAt: raw?.createdAt ?? raw?.fecha_creacion ?? raw?.created_at,
    updatedAt: raw?.updatedAt ?? raw?.fecha_actualizacion ?? raw?.updated_at,
  };
};

const mapResponsableFromApi = (raw: any): Responsable => {
  const estado = typeof raw?.estado === 'string'
    ? raw.estado.toLowerCase() === 'inactivo' ? 'inactivo' : 'activo'
    : safeBoolean(raw?.activo, true) ? 'activo' : 'inactivo';

  const estadisticas = raw?.estadisticas ?? {
    espaciosGestionados: safeNumber(raw?.espaciosGestionados ?? 0),
    reservasAprobadas: safeNumber(raw?.reservasAprobadas ?? 0),
    incidentesResueltos: safeNumber(raw?.incidentesResueltos ?? 0),
  };

  return {
    id: safeString(raw?.id ?? raw?.PK ?? ''),
    nombre: safeString(raw?.nombre ?? ''),
    apellido: safeString(raw?.apellido ?? ''),
    email: safeString(raw?.email ?? ''),
    telefono: safeString(raw?.telefono ?? raw?.phone ?? ''),
    departamento: safeString(raw?.departamento ?? raw?.area ?? raw?.area_responsabilidad ?? ''),
    especialidad: raw?.especialidad ? safeString(raw.especialidad) : raw?.cargo ? safeString(raw.cargo) : undefined,
    areas: ensureArray<string>(raw?.areas ?? raw?.area ? [raw.area] : [], (item) => safeString(item)),
    espaciosAsignados: ensureArray<string>(raw?.espaciosAsignados ?? raw?.espacios_asignados ?? []),
    estado,
    fechaCreacion: safeString(raw?.fechaCreacion ?? raw?.fecha_creacion ?? raw?.createdAt ?? new Date().toISOString()),
    ultimoAcceso: raw?.ultimoAcceso ? safeString(raw.ultimoAcceso) : raw?.lastLogin ? safeString(raw.lastLogin) : undefined,
    estadisticas: {
      espaciosGestionados: safeNumber(estadisticas?.espaciosGestionados ?? 0),
      reservasAprobadas: safeNumber(estadisticas?.reservasAprobadas ?? 0),
      incidentesResueltos: safeNumber(estadisticas?.incidentesResueltos ?? 0),
    },
  };
};

const mapDashboardMetricsFromApi = (raw: any): DashboardMetrics => {
  const data = raw?.estadisticas ?? raw ?? {};
  const espacios = data?.espacios ?? {};
  const reservas = data?.reservas ?? {};

  const totalEspacios = safeNumber(espacios?.total ?? 0);
  const espaciosDisponibles = safeNumber(espacios?.disponibles ?? 0);
  const espaciosOcupados = safeNumber(espacios?.ocupados ?? 0);
  const espaciosMantenimiento = safeNumber(espacios?.mantenimiento ?? 0);
  const reservasHoy = safeNumber(reservas?.hoy ?? reservas?.total ?? 0);
  const ocupacionPromedio = totalEspacios > 0
    ? Math.min(100, Math.max(0, Math.round((espaciosOcupados / totalEspacios) * 100)))
    : 0;

  return {
    totalEspacios,
    espaciosDisponibles,
    espaciosOcupados,
    espaciosMantenimiento,
    reservasHoy,
    ocupacionPromedio,
  };
};

const serializeEspacioInput = (data: Partial<Espacio>) => {
  const payload: Record<string, any> = {};

  if (data.nombre !== undefined) payload.nombre = data.nombre;
  if (data.descripcion !== undefined) payload.descripcion = data.descripcion;
  if (data.tipo !== undefined) payload.tipo = data.tipo;
  if (data.capacidad !== undefined) payload.capacidad = data.capacidad;
  if (data.estado !== undefined) payload.estado = data.estado;
  if (data.equipamiento !== undefined) payload.equipamiento = data.equipamiento;
  if (data.zonaId !== undefined) payload.zona_id = data.zonaId;
  if (data.zona !== undefined && data.zonaId === undefined) payload.zona_id = data.zona;
  if (data.edificio !== undefined || data.piso !== undefined || data.zona !== undefined) {
    const ubicacion: Record<string, any> = {};
    if (data.edificio !== undefined) ubicacion.edificio = data.edificio;
    if (data.piso !== undefined) ubicacion.piso = data.piso;
    if (data.zona !== undefined) ubicacion.zona = data.zona;
    if (Object.keys(ubicacion).length > 0) {
      payload.ubicacion = ubicacion;
    }
  }

  return payload;
};

const serializeZonaInput = (data: Partial<Zona>) => {
  const payload: Record<string, any> = {};

  if (data.nombre !== undefined) payload.nombre = data.nombre;
  if (data.descripcion !== undefined) payload.descripcion = data.descripcion;
  if (data.piso !== undefined) payload.piso = data.piso;
  if (data.edificio !== undefined) payload.edificio = data.edificio;
  if (data.capacidadTotal !== undefined) {
    payload.capacidadMaxima = data.capacidadTotal;
    payload.capacidad_total = data.capacidadTotal;
  }
  if (data.espaciosDisponibles !== undefined) payload.espaciosDisponibles = data.espaciosDisponibles;
  if (data.tipoZona !== undefined) {
    payload.tipoZona = data.tipoZona;
    payload.tipo_zona = data.tipoZona;
  }
  if (data.activa !== undefined) payload.activa = data.activa;
  if (data.color !== undefined) payload.color = data.color;

  return payload;
};

const serializeResponsableInput = (data: Partial<Responsable>) => {
  const payload: Record<string, any> = {};

  if (data.nombre !== undefined) payload.nombre = data.nombre;
  if (data.apellido !== undefined) payload.apellido = data.apellido;
  if (data.email !== undefined) payload.email = data.email;
  if (data.telefono !== undefined) payload.telefono = data.telefono;
  if (data.departamento !== undefined) payload.area = data.departamento;
  if (data.especialidad !== undefined) payload.cargo = data.especialidad;
  if (data.estado !== undefined) payload.activo = data.estado === 'activo';
  if (data.areas !== undefined) payload.areas = data.areas;
  if (data.espaciosAsignados !== undefined) payload.espaciosAsignados = data.espaciosAsignados;

  return payload;
};

const serializeUsuarioInput = (data: Partial<Usuario> & { password?: string }) => {
  const payload: Record<string, any> = {};

  if (data.nombre !== undefined) payload.nombre = data.nombre;
  if (data.apellido !== undefined) payload.apellido = data.apellido;
  if (data.email !== undefined) payload.email = data.email;
  if (data.telefono !== undefined) payload.telefono = data.telefono;
  if (data.departamento !== undefined) payload.departamento = data.departamento;
  if (data.rol !== undefined) payload.rol = data.rol;
  if (data.activo !== undefined) payload.activo = data.activo;
  if ((data as any).password !== undefined) payload.password = (data as any).password;

  return payload;
};

const serializeReservaInput = (data: Partial<Reserva>) => {
  const payload: Record<string, any> = {};

  // Handle both camelCase and snake_case fields
  if (data.espacioId !== undefined) payload.espacio_id = data.espacioId;
  if ((data as any).espacio_id !== undefined) payload.espacio_id = (data as any).espacio_id;
  
  if (data.usuarioId !== undefined) payload.usuario_id = data.usuarioId;
  if ((data as any).usuario_id !== undefined) payload.usuario_id = (data as any).usuario_id;
  
  if ((data as any).empresaId !== undefined) payload.empresa_id = (data as any).empresaId;
  if ((data as any).empresa_id !== undefined) payload.empresa_id = (data as any).empresa_id;
  
  if (data.fechaInicio !== undefined) payload.fecha_inicio = data.fechaInicio;
  if ((data as any).fecha_inicio !== undefined) payload.fecha_inicio = (data as any).fecha_inicio;
  
  if (data.fechaFin !== undefined) payload.fecha_fin = data.fechaFin;
  if ((data as any).fecha_fin !== undefined) payload.fecha_fin = (data as any).fecha_fin;
  
  if (data.proposito !== undefined) payload.proposito = data.proposito;
  if (data.estado !== undefined) payload.estado = data.estado;
  
  if (data.participantes !== undefined) {
    payload.participantes = data.participantes;
    payload.numero_asistentes = data.participantes;
  }
  if ((data as any).numero_asistentes !== undefined) payload.numero_asistentes = (data as any).numero_asistentes;
  
  if ((data as any).notas !== undefined) payload.notas = (data as any).notas;
  if ((data as any).prioridad !== undefined) payload.prioridad = (data as any).prioridad;
  
  // Handle split date/time fields sent from form (legacy)
  if ((data as any).fecha_reserva !== undefined) payload.fecha_reserva = (data as any).fecha_reserva;
  if ((data as any).hora_inicio !== undefined) payload.hora_inicio = (data as any).hora_inicio;
  if ((data as any).hora_fin !== undefined) payload.hora_fin = (data as any).hora_fin;

  return payload;
};

const transformResponse = <T, U>(response: ApiResponse<T>, mapper: (data: T) => U): ApiResponse<U> => {
  if (response.ok && response.data !== undefined) {
    return {
      ...response,
      data: mapper(response.data),
    } as ApiResponse<U>;
  }
  return response as unknown as ApiResponse<U>;
};

class ApiClient {
  private client: AxiosInstance;
  private tokens: AuthTokens | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
    });

    // Interceptor para agregar tokens de autorización
    this.client.interceptors.request.use(
      (config) => {
        // Use idToken instead of accessToken - idToken contains user attributes and groups
        if (this.tokens?.idToken) {
          config.headers.Authorization = `Bearer ${this.tokens.idToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para manejar respuestas y refresh tokens
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.tokens?.refreshToken) {
          try {
            await this.refreshToken();
            // Reintentar la petición original
            return this.client.request(error.config);
          } catch (refreshError) {
            this.logout();
            throw refreshError;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Métodos de autenticación
  setTokens(tokens: AuthTokens) {
    this.tokens = tokens;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    }
  }

  getTokens(): AuthTokens | null {
    if (!this.tokens && typeof window !== 'undefined') {
      const stored = localStorage.getItem('auth_tokens');
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    }
    return this.tokens;
  }

  clearTokens() {
    this.tokens = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_tokens');
    }
  }

  async refreshToken(): Promise<ApiResponse<{ accessToken: string; refreshToken?: string; idToken?: string; expiresIn?: number }>> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.post<{ accessToken: string; refreshToken?: string; idToken?: string; expiresIn?: number }>('/auth/refresh', {
      refreshToken: this.tokens.refreshToken,
    });

    if (response.ok && response.data) {
      const expiresInSeconds = response.data.expiresIn ?? 3600;
      const newTokens = {
        accessToken: response.data.accessToken,
        idToken: response.data.idToken ?? this.tokens.idToken,
        refreshToken: response.data.refreshToken ?? this.tokens.refreshToken,
        expiresAt: Date.now() + expiresInSeconds * 1000,
      };
      this.setTokens(newTokens);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const result = await this.post<{ message: string }>('/auth/logout');
    // Limpiar tokens locales después del logout
    this.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return result;
  }

  // Métodos HTTP genéricos
  private normalizeResponse<T>(payload: any, status: number): ApiResponse<T> {
    const ok = Boolean(payload?.ok ?? payload?.success ?? (status >= 200 && status < 300));

    let data: T | undefined;
    if (ok) {
      if (payload?.data !== undefined) {
        data = payload.data as T;
      } else if (payload?.result !== undefined) {
        data = payload.result as T;
      } else if (payload !== undefined) {
        if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
          const { ok: _ok, success, status: _status, statusCode, message, error, ...rest } = payload;
          data = (Object.keys(rest).length ? (rest as T) : undefined);
        } else {
          data = payload as T;
        }
      }
    }

    let errorMessage: string | undefined;
    if (!ok) {
      errorMessage = payload?.error?.message || payload?.error || payload?.message;
    }

    const message = payload?.message;

    return {
      ok,
      data,
      error: errorMessage,
      message,
      status,
    };
  }

  private normalizeErrorResponse<T>(error: any): ApiResponse<T> {
    if (error?.response) {
      return this.normalizeResponse<T>(error.response.data, error.response.status);
    }

    return {
      ok: false,
      error: error?.message || 'Error desconocido',
    };
  }

  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<any> = await this.client.get(endpoint, config);
      return this.normalizeResponse<T>(response.data, response.status);
    } catch (error: any) {
      return this.normalizeErrorResponse<T>(error);
    }
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<any> = await this.client.post(endpoint, data, config);
      return this.normalizeResponse<T>(response.data, response.status);
    } catch (error: any) {
      return this.normalizeErrorResponse<T>(error);
    }
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<any> = await this.client.put(endpoint, data, config);
      return this.normalizeResponse<T>(response.data, response.status);
    } catch (error: any) {
      return this.normalizeErrorResponse<T>(error);
    }
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<any> = await this.client.delete(endpoint, config);
      return this.normalizeResponse<T>(response.data, response.status);
    } catch (error: any) {
      return this.normalizeErrorResponse<T>(error);
    }
  }

  async patch<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<any> = await this.client.patch(endpoint, data, config);
      return this.normalizeResponse<T>(response.data, response.status);
    } catch (error: any) {
      return this.normalizeErrorResponse<T>(error);
    }
  }

  // Detectar tipo de dispositivo para optimización de endpoints
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // Método para obtener endpoint optimizado según dispositivo
  getOptimizedEndpoint(baseEndpoint: string): string {
    const deviceType = this.getDeviceType();
    
    // Usar endpoints móvil-específicos cuando sea apropiado
    if (deviceType === 'mobile') {
      if (baseEndpoint === '/dashboard') {
        return '/mobile/dashboard';
      }
      // Otros endpoints específicos...
    }
    
    return baseEndpoint;
  }

  // Métodos específicos de la API
  async getEspacios(filters?: {
    tipo?: string;
    estado?: string;
    zona_id?: string;
  }): Promise<ApiResponse<{ espacios: Espacio[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.tipo) params.append('tipo', filters.tipo);
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.zona_id) params.append('zona_id', filters.zona_id);
    
    const queryString = params.toString();
    const response = await this.get(`/api/espacios${queryString ? `?${queryString}` : ''}`);
    return transformResponse(response, (payload: any) => {
      const items: any[] = Array.isArray(payload?.espacios) ? payload.espacios : [];
      return {
        espacios: items.map(mapEspacioFromApi),
        total: safeNumber(payload?.total ?? items.length),
      };
    });
  }

  async createEspacio(data: Omit<Espacio, 'id' | 'ultimaActualizacion'>): Promise<ApiResponse<Espacio>> {
    const payload = serializeEspacioInput(data);
    const response = await this.post('/api/espacios', Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapEspacioFromApi);
  }

  async updateEspacio(id: string, data: Partial<Espacio>): Promise<ApiResponse<Espacio>> {
    const payload = serializeEspacioInput(data);
    const response = await this.put(`/api/espacios/${id}`, Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapEspacioFromApi);
  }

  async deleteEspacio(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/api/espacios/${id}`);
  }

  async toggleEspacioEstado(
    id: string,
    estado: 'disponible' | 'ocupado' | 'mantenimiento'
  ): Promise<ApiResponse<Espacio>> {
    return this.updateEspacio(id, { estado });
  }

  async getReservas(filters?: {
    usuario_id?: string;
    espacio_id?: string;
    estado?: string;
  }): Promise<ApiResponse<{ reservas: Reserva[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.usuario_id) params.append('usuario_id', filters.usuario_id);
    if (filters?.espacio_id) params.append('espacio_id', filters.espacio_id);
    if (filters?.estado) params.append('estado', filters.estado);
    
    const queryString = params.toString();
    const response = await this.get(`/api/reservas${queryString ? `?${queryString}` : ''}`);
    return transformResponse(response, (payload: any) => {
      const items: any[] = Array.isArray(payload?.reservas) ? payload.reservas : [];
      return {
        reservas: items.map(mapReservaFromApi),
        total: safeNumber(payload?.total ?? items.length),
      };
    });
  }

  async createReserva(data: Omit<Reserva, 'id'>): Promise<ApiResponse<Reserva>> {
    const payload = serializeReservaInput(data);
    const response = await this.post('/api/reservas', Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapReservaFromApi);
  }

  async updateReserva(id: string, data: Partial<Reserva>): Promise<ApiResponse<Reserva>> {
    const payload = serializeReservaInput(data);
    const response = await this.put(`/api/reservas/${id}`, Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapReservaFromApi);
  }

  async cancelReserva(id: string): Promise<ApiResponse<Reserva>> {
    const response = await this.patch(`/api/reservas/${id}/cancel`);
    return transformResponse(response, mapReservaFromApi);
  }

  async deleteReserva(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/api/reservas/${id}`);
  }

  async getZonas(): Promise<ApiResponse<{ zonas: Zona[]; total?: number }>> {
    const response = await this.get('/api/zonas');
    return transformResponse(response, (payload: any) => {
      const items: any[] = Array.isArray(payload?.zonas) ? payload.zonas : [];
      const total = payload?.total !== undefined ? safeNumber(payload.total) : undefined;
      return {
        zonas: items.map(mapZonaFromApi),
        ...(total !== undefined ? { total } : {}),
      };
    });
  }

  async createZona(data: Omit<Zona, 'id'>): Promise<ApiResponse<Zona>> {
    const payload = serializeZonaInput(data);
    const response = await this.post('/api/zonas', Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapZonaFromApi);
  }

  async updateZona(id: string, data: Partial<Zona>): Promise<ApiResponse<Zona>> {
    const payload = serializeZonaInput(data);
    const response = await this.put(`/api/zonas/${id}`, Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapZonaFromApi);
  }

  async deleteZona(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/api/zonas/${id}`);
  }

  async toggleZonaEstado(id: string, activa: boolean): Promise<ApiResponse<Zona>> {
    const response = await this.patch(`/api/zonas/${id}/toggle-estado`, { activa });
    return transformResponse(response, mapZonaFromApi);
  }

  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    const response = await this.get('/api/dashboard');
    return transformResponse(response, mapDashboardMetricsFromApi);
  }

  // Métodos para Responsables
  async getResponsables(filters?: {
    departamento?: string;
    estado?: string;
  }): Promise<ApiResponse<{ responsables: Responsable[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.departamento) params.append('area', filters.departamento);
    if (filters?.estado) {
      const normalized = filters.estado.toLowerCase();
      if (normalized === 'activo' || normalized === 'inactivo') {
        params.append('activo', normalized === 'activo' ? 'true' : 'false');
      }
    }
    
    const queryString = params.toString();
    const response = await this.get(`/api/responsables${queryString ? `?${queryString}` : ''}`);
    return transformResponse(response, (payload: any) => {
      const items: any[] = Array.isArray(payload?.responsables) ? payload.responsables : [];
      return {
        responsables: items.map(mapResponsableFromApi),
        total: safeNumber(payload?.total ?? items.length),
      };
    });
  }

  async getResponsable(id: string): Promise<ApiResponse<Responsable>> {
    const response = await this.get(`/api/responsables/${id}`);
    return transformResponse(response, mapResponsableFromApi);
  }

  async createResponsable(data: Omit<Responsable, 'id' | 'fechaCreacion' | 'estadisticas'>): Promise<ApiResponse<Responsable>> {
    const payload = serializeResponsableInput(data);
    const response = await this.post('/api/responsables', Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapResponsableFromApi);
  }

  async updateResponsable(id: string, data: Partial<Responsable>): Promise<ApiResponse<Responsable>> {
    const payload = serializeResponsableInput(data);
    const response = await this.put(`/api/responsables/${id}`, Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapResponsableFromApi);
  }

  async deleteResponsable(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/api/responsables/${id}`);
  }

  async toggleResponsableEstado(id: string, activo: boolean): Promise<ApiResponse<Responsable>> {
    const response = await this.patch(`/api/responsables/${id}/toggle-estado`, { activo });
    return transformResponse(response, mapResponsableFromApi);
  }

  async asignarEspacios(responsableId: string, espaciosIds: string[]): Promise<ApiResponse<{ message: string }>> {
    const endpoint = this.getOptimizedEndpoint(`/responsables/${responsableId}/asignar-espacios`);
    return this.post(endpoint, { espaciosIds });
  }

  // Métodos para Usuarios
  async getUsuarios(filters?: {
    rol?: string;
    activo?: boolean;
    departamento?: string;
  }): Promise<ApiResponse<{ usuarios: Usuario[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.rol) params.append('rol', filters.rol);
    if (filters?.activo !== undefined) params.append('activo', filters.activo.toString());
    if (filters?.departamento) params.append('departamento', filters.departamento);
    
    const endpoint = this.getOptimizedEndpoint('/usuarios');
    const queryString = params.toString();
    const response = await this.get(`${endpoint}${queryString ? `?${queryString}` : ''}`);
    return transformResponse(response, (payload: any) => {
      const items: any[] = Array.isArray(payload?.usuarios) ? payload.usuarios : [];
      return {
        usuarios: items.map(mapUsuarioFromApi),
        total: safeNumber(payload?.total ?? items.length),
      };
    });
  }

  async createUsuario(data: Omit<Usuario, 'id'> & { password?: string }): Promise<ApiResponse<Usuario>> {
    const endpoint = this.getOptimizedEndpoint('/usuarios');
    const payload = serializeUsuarioInput(data);
    const response = await this.post(endpoint, Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapUsuarioFromApi);
  }

  async updateUsuario(id: string, data: Partial<Usuario> & { password?: string }): Promise<ApiResponse<Usuario>> {
    const endpoint = this.getOptimizedEndpoint(`/usuarios/${id}`);
    const payload = serializeUsuarioInput(data);
    const response = await this.put(endpoint, Object.keys(payload).length ? payload : data);
    return transformResponse(response, mapUsuarioFromApi);
  }

  async deleteUsuario(id: string): Promise<ApiResponse<{ message: string }>> {
    const endpoint = this.getOptimizedEndpoint(`/usuarios/${id}`);
    return this.delete(endpoint);
  }

  async toggleUsuarioEstado(id: string, activo: boolean): Promise<ApiResponse<Usuario>> {
    const endpoint = this.getOptimizedEndpoint(`/usuarios/${id}/toggle-estado`);
    const response = await this.patch(endpoint, { activo });
    return transformResponse(response, mapUsuarioFromApi);
  }

  // Métodos WebSocket
  private ws: WebSocket | null = null;
  
  connectWebSocket(callbacks: {
    onMessage?: (data: any) => void;
    onError?: (error: Event) => void;
    onClose?: () => void;
  }) {
    if (this.ws) {
      this.ws.close();
    }

    // Usar la URL de WebSocket desde las variables de entorno
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    
    if (!wsUrl) {
      console.error('Error: NEXT_PUBLIC_WS_URL no está definida');
      return;
    }
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket conectado');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onMessage?.(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      callbacks.onError?.(error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket desconectado');
      callbacks.onClose?.();
    };
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Métodos de autenticación
  async login(email: string, password: string): Promise<ApiResponse<{ accessToken: string; refreshToken?: string; idToken?: string; expiresIn?: number }>> {
    // Use /api prefix so CloudFront routes API calls to the API origin (avoid /auth/* conflict with frontend pages)
    const response = await this.post<{ accessToken: string; refreshToken?: string; idToken?: string; expiresIn?: number }>('/api/auth/login', { username: email, password });

    if (response.ok && response.data?.accessToken) {
      const expiresInSeconds = response.data.expiresIn ?? 3600;
      this.setTokens({
        accessToken: response.data.accessToken,
        idToken: response.data.idToken ?? response.data.accessToken,
        refreshToken: response.data.refreshToken ?? '',
        expiresAt: Date.now() + expiresInSeconds * 1000,
      });
    }

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    empresa_id: string;
    empresa_nombre: string;
    departamento?: string;
    telefono?: string;
  }): Promise<ApiResponse<{ message: string; userId?: string; rol?: string }>> {
    return this.post('/api/auth/register', userData);
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/api/auth/me');
  }

  async getCurrentUserProfile(): Promise<ApiResponse<Usuario>> {
    return this.get('/api/usuarios/perfil');
  }

  async updateProfile(userData: any): Promise<ApiResponse<Usuario>> {
    return this.put('/api/usuarios/perfil', userData);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.post('/usuarios/cambiar-password', { passwordActual: currentPassword, passwordNuevo: newPassword });
  }

  async getSettings(): Promise<ApiResponse<{
    theme: 'light' | 'dark' | 'auto';
    language: 'es' | 'en' | 'ko' | 'ja' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'pt';
    fontSize: number;
    fontFamily: string;
    accentColor: string;
  }>> {
    return this.get('/api/usuarios/settings');
  }

  async updateSettings(settings: {
    theme?: 'light' | 'dark' | 'auto';
    language?: 'es' | 'en' | 'ko' | 'ja' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'pt';
    fontSize?: number;
    fontFamily?: string;
    accentColor?: string;
  }): Promise<ApiResponse<any>> {
    return this.put('/api/usuarios/settings', settings);
  }
}

// Instancia singleton del cliente API
export const apiClient = new ApiClient();

// Hook personalizado para detectar orientación y dispositivo
export const useDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop' as const,
      isPortrait: true,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const deviceType = apiClient.getDeviceType();

  return {
    deviceType,
    isPortrait: height > width,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
  };
};