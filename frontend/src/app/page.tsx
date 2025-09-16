'use client';

import Link from 'next/link';
import { ArrowRight, Shield, BarChart3, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Gestión de Espacios</h1>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/auth/register"
                className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Gestión Inteligente de Espacios
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Sistema empresarial completo para la administración y monitoreo en tiempo real 
            de espacios, recursos y personal con tecnología de última generación.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/auth/login"
              className="bg-green-600 text-white hover:bg-green-700 px-8 py-3 rounded-lg text-lg font-medium flex items-center space-x-2"
            >
              <span>Acceder al Sistema</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/register"
              className="bg-white text-green-600 hover:bg-gray-50 border border-green-600 px-8 py-3 rounded-lg text-lg font-medium"
            >
              Crear Cuenta
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Monitoreo en Tiempo Real</h3>
            <p className="text-gray-600">
              Dashboard interactivo con métricas actualizadas en tiempo real y notificaciones instantáneas.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestión de Personal</h3>
            <p className="text-gray-600">
              Control completo de usuarios, roles y permisos con sistema de autenticación robusto.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Seguridad Avanzada</h3>
            <p className="text-gray-600">
              Autenticación JWT, middleware de protección y encriptación de datos confidenciales.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>© 2025 Sistema de Gestión de Espacios. Todos los derechos reservados.</p>
            <p className="mt-2">Desarrollado con Next.js, TypeScript y tecnologías modernas.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}