'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import { 
  ArrowLeft,
  Shield,
  AlertCircle,
  Settings,
  Activity,
  Database,
  Lock
} from 'lucide-react';

export default function AdminCustomPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Verificar si el usuario es admin
    const checkAuth = () => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const isAdmin = user.rol?.toLowerCase() === 'admin' || user.rol?.toLowerCase() === 'administrador';
      
      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }
      
      setIsAuthorized(true);
    };

    checkAuth();
  }, [user, router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader title="Panel de Administración" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/configuracion')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#242938] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Configuración
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Panel de Administración
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Área personalizada para funciones administrativas
              </p>
            </div>
          </div>
        </div>

        {/* Mensaje de Bienvenida */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-8 mb-8 border-2 border-purple-200 dark:border-purple-700">
          <div className="flex items-start space-x-4">
            <AlertCircle className="h-6 w-6 text-purple-600 dark:text-purple-400 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                ¡Bienvenido, {user?.nombre}!
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Esta es tu página personalizada. Aquí puedes agregar cualquier funcionalidad
                que necesites para administrar el sistema.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4" />
                <span>Acceso exclusivo para administradores</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Cards Ejemplo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 - Configuración del Sistema */}
          <div className="bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                Sistema
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Configuración del Sistema
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Gestiona las configuraciones globales y preferencias del sistema
            </p>
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              Configurar
            </button>
          </div>

          {/* Card 2 - Monitoreo */}
          <div className="bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Activity className="h-8 w-8 text-green-600 dark:text-green-400" />
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                Monitoreo
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Actividad del Sistema
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Visualiza métricas y estadísticas en tiempo real del sistema
            </p>
            <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
              Ver Métricas
            </button>
          </div>

          {/* Card 3 - Base de Datos */}
          <div className="bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Database className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                Datos
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Gestión de Datos
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Administra copias de seguridad y operaciones de base de datos
            </p>
            <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
              Gestionar
            </button>
          </div>
        </div>

        {/* Sección de Código de Ejemplo */}
        <div className="mt-8 bg-white dark:bg-[#242938] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            💡 Personaliza esta página
          </h2>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              Esta es una página de ejemplo. Puedes modificar el archivo{' '}
              <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-blue-600 dark:text-blue-400 font-mono text-xs">
                frontend/src/app/admin-custom/page.tsx
              </code>
            </p>
            <p>Algunas ideas de lo que puedes agregar:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Panel de control con estadísticas avanzadas</li>
              <li>Gestión de usuarios y permisos</li>
              <li>Configuraciones de sistema</li>
              <li>Logs y auditoría</li>
              <li>Integraciones con servicios externos</li>
              <li>Herramientas de desarrollo</li>
            </ul>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Esta página solo es visible para usuarios con rol de Administrador
          </p>
        </div>
      </div>
    </div>
  );
}
