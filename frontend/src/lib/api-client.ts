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

  async refreshToken(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post('/refresh', {
      refreshToken: this.tokens.refreshToken,
    });

    if (response.data.ok) {
      this.setTokens(response.data.data);
    } else {
      throw new Error('Token refresh failed');
    }
  }

  logout() {
    this.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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