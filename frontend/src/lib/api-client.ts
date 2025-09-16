import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from './config';

// Tipos para las respuestas de la API
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
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
  piso: number;
  equipamiento: string[];
  ultimaActualizacion: string;
}

export interface Zona {
  id: string;
  nombre: string;
  descripcion: string;
  piso: number;
  capacidadTotal: number;
  espaciosDisponibles: number;
  color: string;
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
  email: string;
  rol: 'admin' | 'staff' | 'usuario';
  departamento: string;
  activo: boolean;
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
  refreshToken: string;
  expiresAt: number;
}

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
        if (this.tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
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

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.post<{ token: string }>('/auth/refresh', {
      refreshToken: this.tokens.refreshToken,
    });

    if (response.ok && response.data) {
      // Actualizar tokens locales
      const newTokens = {
        accessToken: response.data.token,
        refreshToken: response.data.token, // En producción usar refresh token separado
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
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
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.get(endpoint, config);
      return response.data;
    } catch (error: any) {
      return {
        ok: false,
        error: error.response?.data?.error || error.message || 'Error desconocido',
      };
    }
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.post(endpoint, data, config);
      return response.data;
    } catch (error: any) {
      return {
        ok: false,
        error: error.response?.data?.error || error.message || 'Error desconocido',
      };
    }
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.put(endpoint, data, config);
      return response.data;
    } catch (error: any) {
      return {
        ok: false,
        error: error.response?.data?.error || error.message || 'Error desconocido',
      };
    }
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(endpoint, config);
      return response.data;
    } catch (error: any) {
      return {
        ok: false,
        error: error.response?.data?.error || error.message || 'Error desconocido',
      };
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
    
    const endpoint = this.getOptimizedEndpoint('/espacios');
    const queryString = params.toString();
    return this.get(`${endpoint}${queryString ? `?${queryString}` : ''}`);
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
    
    const endpoint = this.getOptimizedEndpoint('/reservas');
    const queryString = params.toString();
    return this.get(`${endpoint}${queryString ? `?${queryString}` : ''}`);
  }

  async getZonas(): Promise<ApiResponse<{ zonas: Zona[] }>> {
    const endpoint = this.getOptimizedEndpoint('/zonas');
    return this.get(endpoint);
  }

  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    const endpoint = this.getOptimizedEndpoint('/dashboard/metrics');
    return this.get(endpoint);
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

    const wsUrl = API_CONFIG.baseURL.replace('http', 'ws') + '/ws';
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
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.post('/auth/login', { email, password });
  }

  async register(userData: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    departamento?: string;
    telefono?: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.post('/auth/register', userData);
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/me');
  }

  async updateProfile(userData: any): Promise<ApiResponse<{ user: any }>> {
    return this.put('/usuarios/perfil', userData);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.post('/usuarios/cambiar-password', { currentPassword, newPassword });
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