'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Building2, Users, ArrowLeft, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';

export default function RecursosPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="Gestión de Recursos"
        breadcrumbs={[
          { label: 'Recursos', href: '/recursos' }
        ]}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Description */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600">Selecciona el tipo de recurso que deseas gestionar</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Link>
        </div>

        {/* Recursos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Espacios */}
          <Link href="/espacios">
            <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-8 text-center cursor-pointer border-2 border-transparent hover:border-blue-500 group">
              <div className="p-6 bg-blue-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <MapPin className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Espacios</h3>
              <p className="text-gray-600 mb-6">
                Crea y gestiona los espacios físicos que pueden ser reservados por los usuarios
              </p>
              <div className="inline-flex items-center text-blue-600 font-medium group-hover:underline">
                Gestionar Espacios
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Zonas */}
          <Link href="/zonas">
            <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-8 text-center cursor-pointer border-2 border-transparent hover:border-purple-500 group">
              <div className="p-6 bg-purple-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <Building2 className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Zonas</h3>
              <p className="text-gray-600 mb-6">
                Organiza tus espacios por zonas, edificios y pisos para una mejor administración
              </p>
              <div className="inline-flex items-center text-purple-600 font-medium group-hover:underline">
                Gestionar Zonas
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Usuarios */}
          <Link href="/usuarios">
            <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-8 text-center cursor-pointer border-2 border-transparent hover:border-green-500 group">
              <div className="p-6 bg-green-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <Users className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Usuarios</h3>
              <p className="text-gray-600 mb-6">
                Administra los usuarios del sistema y sus permisos de acceso
              </p>
              <div className="inline-flex items-center text-green-600 font-medium group-hover:underline">
                Gestionar Usuarios
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Package className="h-6 w-6 text-blue-600 mr-3 mt-1" />
            <div>
              <h4 className="text-lg font-semibold text-blue-900 mb-2">¿Por dónde empezar?</h4>
              <p className="text-blue-800 mb-2">
                Te recomendamos seguir este orden para configurar tu sistema:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Primero crea las <strong>Zonas</strong> para organizar tus espacios</li>
                <li>Luego agrega los <strong>Espacios</strong> asignándolos a las zonas creadas</li>
                <li>Finalmente, configura los <strong>Usuarios</strong> que podrán hacer reservas</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
