// Contexto de Autenticación para la aplicación
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { apiClient, Usuario } from '@/lib/api-client';
import usePersonalizationSocket from '../hooks/usePersonalizationSocket';
import { API_CONFIG } from '@/lib/config';

// Interfaces de autenticación
export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'admin' | 'responsable' | 'usuario';
  activo: boolean;
  departamento?: string;
  telefono?: string;
  created_at?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<boolean>;
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  departamento?: string;
  telefono?: string;
}

const mapUsuarioToUser = (usuario: Usuario): User => ({
  id: usuario.id,
  email: usuario.email,
  nombre: usuario.nombre,
  apellido: usuario.apellido ?? '',
  rol: usuario.rol ?? 'usuario',
  activo: usuario.activo !== false,
  departamento: usuario.departamento,
  telefono: usuario.telefono,
  created_at: usuario.createdAt,
});

// Crear contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Proveedor del contexto
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  });

  
  const clearAuthStorage = useCallback(() => {
    apiClient.clearTokens();
    localStorage.removeItem('auth_user');
    setAuthState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, [setAuthState]);

  const persistAuthState = useCallback((user: User, tokens: AuthTokens) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    setAuthState({
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
    });
  }, [setAuthState]);

  const updateStoredUser = useCallback((user: User) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    setAuthState(prev => ({
      ...prev,
      user,
    }));
  }, [setAuthState]);

  const loadUserProfile = useCallback(async (): Promise<User | null> => {
    try {
      const profileResponse = await apiClient.getCurrentUserProfile();
      if (profileResponse.ok && profileResponse.data) {
        return mapUsuarioToUser(profileResponse.data);
      }

      const meResponse = await apiClient.getCurrentUser();
      if (meResponse.ok && meResponse.data?.user) {
        const claims = meResponse.data.user as any;
        return {
          id: claims.sub ?? 'unknown',
          email: claims.email ?? '',
          nombre: claims.given_name ?? claims.name ?? claims.email ?? 'Usuario',
          apellido: claims.family_name ?? '',
          rol: (claims['custom:role'] as User['rol']) ?? 'usuario',
          activo: true,
          departamento: claims['custom:department'] ?? undefined,
          telefono: claims.phone_number ?? undefined,
        };
      }
    } catch (error) {
      console.warn('No se pudo cargar el perfil del usuario:', error);
    }

    return null;
  }, []);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    const storedTokens = apiClient.getTokens();
    if (!storedTokens?.refreshToken) {
      return false;
    }

    try {
      const response = await apiClient.refreshToken();
      if (!response.ok || !response.data?.accessToken) {
        clearAuthStorage();
        return false;
      }

      const updatedTokens = apiClient.getTokens();
      if (!updatedTokens) {
        clearAuthStorage();
        return false;
      }

      const user = await loadUserProfile();
      if (!user) {
        clearAuthStorage();
        return false;
      }

      persistAuthState(user, updatedTokens);
      return true;
    } catch (error) {
      console.error('Error refrescando token:', error);
      clearAuthStorage();
      return false;
    }
  }, [clearAuthStorage, loadUserProfile, persistAuthState]);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedUserRaw = localStorage.getItem('auth_user');
        const storedTokens = apiClient.getTokens();

        if (storedTokens && storedTokens.expiresAt && storedTokens.expiresAt > Date.now()) {
          let user: User | null = null;
          if (storedUserRaw) {
            user = JSON.parse(storedUserRaw) as User;
          } else {
            user = await loadUserProfile();
          }

          if (user) {
            persistAuthState(user, storedTokens);
            return;
          }
        }

        if (storedTokens) {
          const refreshed = await refreshAuth();
          if (!refreshed) {
            clearAuthStorage();
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error cargando autenticación:', error);
        clearAuthStorage();
      }
    };

    loadStoredAuth();
  }, [clearAuthStorage, loadUserProfile, persistAuthState, refreshAuth]);

  usePersonalizationSocket({
    onUpdate: async (payload: any) => {
      console.log('Personalization update received:', payload);
      if (!authState.user) {
        return;
      }

      try {
        await apiClient.get(`/personalization/client/${payload.clientId}/user/${authState.user.id}/complete`);
      } catch (err) {
        console.warn('Error refreshing personalization after update', err);
      }
    }
  });

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await apiClient.login(email, password);

      if (!response.ok || !response.data?.accessToken) {
        apiClient.clearTokens();
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: response.error || 'Credenciales inválidas' };
      }

      const tokens = apiClient.getTokens();
      if (!tokens) {
        apiClient.clearTokens();
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'No se pudieron obtener los tokens de autenticación' };
      }

      const userProfile = await loadUserProfile();
      if (!userProfile) {
        apiClient.clearTokens();
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'No se pudo obtener la información del usuario' };
      }

      persistAuthState(userProfile, tokens);
      return { success: true };
    } catch (error) {
      console.error('Error en login:', error);
      apiClient.clearTokens();
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Error de conexión' };
    }
  }, [loadUserProfile, persistAuthState]);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Error en logout del servidor:', error);
    } finally {
      clearAuthStorage();
    }
  }, [clearAuthStorage]);

  const register = useCallback(async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Debug: log base URL used by the API client to reproduce "Network Error" in browser
      // eslint-disable-next-line no-console
      console.log('[AuthContext] register - API baseURL:', API_CONFIG?.baseURL);

      const response = await apiClient.register(userData);

      // Debug: log the full response object to capture network/cors errors
      // eslint-disable-next-line no-console
      console.log('[AuthContext] register response:', response);

      setAuthState(prev => ({ ...prev, isLoading: false }));

      if (response.ok) {
        return { success: true };
      }

      return { success: false, error: response.error || response.message || 'Error en el registro' };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AuthContext] Error en registro (caught):', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Error de conexión' };
    }
  }, []);

  const updateProfile = useCallback(async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.updateProfile(userData);

      if (response.ok && response.data) {
        const mappedUser = mapUsuarioToUser(response.data);
        const mergedUser: User = authState.user
          ? { ...authState.user, ...mappedUser }
          : mappedUser;

        updateStoredUser(mergedUser);
        return { success: true };
      }

      return { success: false, error: response.error || response.message || 'Error actualizando perfil' };
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }, [authState.user, updateStoredUser]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!authState.isAuthenticated) {
      return { success: false, error: 'No autenticado' };
    }

    try {
      const response = await apiClient.changePassword(currentPassword, newPassword);

      if (response.ok) {
        return { success: true };
      }

      return { success: false, error: response.error || response.message || 'Error cambiando contraseña' };
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }, [authState.isAuthenticated]);


  // Renovación automática del access token cada 4 minutos si está autenticado
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    const interval = setInterval(() => {
      refreshAuth();
    }, 4 * 60 * 1000); // 4 minutos
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, refreshAuth]);
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};