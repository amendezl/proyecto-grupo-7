'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Zona {
  zonaId: string;
  nombre: string;
  piso: number;
  edificio?: string;
}

export default function EspaciosPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    capacidad: '',
    zona: '',
    estado: 'disponible',
  });
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Verificar autenticación
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Cargar zonas disponibles
  useEffect(() => {
    const loadZonas = async () => {
      try {
        setLoadingZonas(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mui3vsx73f.execute-api.us-east-1.amazonaws.com';
        const response = await fetch(`${apiUrl}/api/zonas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setZonas(data.zonas || []);
        }
      } catch (err) {
        console.error('Error cargando zonas:', err);
      } finally {
        setLoadingZonas(false);
      }
    };

    if (showForm) {
      loadZonas();
    }
  }, [showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mui3vsx73f.execute-api.us-east-1.amazonaws.com';
      
      const response = await fetch(`${apiUrl}/api/espacios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          capacidad: parseInt(formData.capacidad, 10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear espacio');
      }

      setSuccess('¡Espacio creado exitosamente!');
      setFormData({
        nombre: '',
        descripcion: '',
        capacidad: '',
        zona: '',
        estado: 'disponible',
      });
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Error al crear espacio');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Espacios</h1>
          <p className="text-gray-600">Administra los espacios disponibles en el sistema</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Create Button */}
        {!showForm ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Package className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Crea tu primer espacio
            </h3>
            <p className="text-gray-600 mb-8">
              Los espacios son los recursos que tus usuarios podrán reservar
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear Espacio
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Espacio</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Espacio *
                </label>
                <input
                  type="text"
                  id="nombre"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Ej: Sala de Reuniones A"
                />
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Describe este espacio..."
                />
              </div>

              {/* Capacidad y Zona */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="capacidad" className="block text-sm font-medium text-gray-700 mb-2">
                    Capacidad *
                  </label>
                  <input
                    type="number"
                    id="capacidad"
                    required
                    min="1"
                    value={formData.capacidad}
                    onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Ej: 10"
                  />
                </div>

                <div>
                  <label htmlFor="zona" className="block text-sm font-medium text-gray-700 mb-2">
                    Zona *
                  </label>
                  <select
                    id="zona"
                    required
                    value={formData.zona}
                    onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    disabled={loadingZonas}
                  >
                    <option value="">
                      {loadingZonas ? 'Cargando zonas...' : zonas.length === 0 ? 'No hay zonas disponibles' : 'Selecciona una zona'}
                    </option>
                    {zonas.map((zona) => (
                      <option key={zona.zonaId} value={zona.nombre}>
                        {zona.nombre} - Piso {zona.piso}{zona.edificio ? ` (Edif. ${zona.edificio})` : ''}
                      </option>
                    ))}
                  </select>
                  {zonas.length === 0 && !loadingZonas && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ Primero debes crear una zona
                    </p>
                  )}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado Inicial
                </label>
                <select
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="disponible">Disponible</option>
                  <option value="mantenimiento">En Mantenimiento</option>
                  <option value="ocupado">Ocupado</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creando...' : 'Crear Espacio'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
