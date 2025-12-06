import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Sistema de Gestión Hospitalaria
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Bienvenido al sistema de gestión de espacios y recursos hospitalarios
          </p>
          <div className="space-x-4">
            <a
              href="/login"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Iniciar Sesión
            </a>
            <a
              href="/dashboard"
              className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Ver Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}