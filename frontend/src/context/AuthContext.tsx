// Contexto de Autenticación para la aplicación
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

  

  // Funciones auxiliares de autenticación
  // Función para limpiar el storage
  const clearAuthStorage = () => {
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('auth_user');
    setAuthState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  // Función para guardar en storage
  const saveAuthToStorage = (user: User, tokens: AuthTokens) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_tokens', JSON.stringify(tokens));
  };

  // Función para refrescar autenticación
  const refreshAuth = async (): Promise<boolean> => {
    if (!authState.tokens?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: authState.tokens.refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        const { token } = data.data;

        const newTokens: AuthTokens = {
          accessToken: token,
          refreshToken: token,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        };

        setAuthState(prev => ({
          ...prev,
          tokens: newTokens,
          isAuthenticated: true,
          isLoading: false,
        }));

        // Actualizar localStorage
        if (authState.user) {
          saveAuthToStorage(authState.user, newTokens);
        }

        return true;
      } else {
        clearAuthStorage();
        return false;
      }
    } catch (error) {
      console.error('Error refrescando token:', error);
      clearAuthStorage();
      return false;
    }
  };

  // Cargar tokens del localStorage al inicializar
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('auth_tokens');
        const storedUser = localStorage.getItem('auth_user');

        if (storedTokens && storedUser) {
          const tokens: AuthTokens = JSON.parse(storedTokens);
          const user: User = JSON.parse(storedUser);

          // Verificar si el token no ha expirado
          if (tokens.expiresAt > Date.now()) {
            setAuthState({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token expirado, intentar refresh
            const refreshed = await refreshAuth();
            if (!refreshed) {
              // Si no se puede refrescar, limpiar storage
              clearAuthStorage();
            }
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
  }, []);

  

  // Función de login
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        const { user, token } = data.data;
        
        // Crear objeto de tokens
        const tokens: AuthTokens = {
          accessToken: token,
          refreshToken: token, // En producción, usar refresh token separado
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
        };

        // Actualizar estado
        setAuthState({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });

        // Guardar en localStorage
        saveAuthToStorage(user, tokens);

        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: data.error || 'Error en el login' };
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Función de logout
  const logout = async () => {
    try {
      // Intentar hacer logout en el servidor
      if (authState.tokens?.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authState.tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Error en logout del servidor:', error);
    } finally {
      // Limpiar estado local independientemente del resultado del servidor
      clearAuthStorage();
    }
  };

  // Función de registro
  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: data.error || 'Error en el registro' };
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Función para actualizar perfil
  const updateProfile = async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!authState.tokens?.accessToken) {
      return { success: false, error: 'No autenticado' };
    }

    try {
      const response = await fetch('/api/usuarios/perfil', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authState.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        const updatedUser = { ...authState.user, ...userData } as User;
        
        setAuthState(prev => ({
          ...prev,
          user: updatedUser,
        }));

        // Actualizar localStorage
        if (authState.tokens) {
          saveAuthToStorage(updatedUser, authState.tokens);
        }

        return { success: true };
      } else {
        return { success: false, error: data.error || 'Error actualizando perfil' };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Función para cambiar contraseña
  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!authState.tokens?.accessToken) {
      return { success: false, error: 'No autenticado' };
    }

    try {
      const response = await fetch('/api/usuarios/cambiar-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Error cambiando contraseña' };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };


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