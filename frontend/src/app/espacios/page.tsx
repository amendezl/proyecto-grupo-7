'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Package, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';
import { apiClient, Zona } from '@/lib/api-client';

export default function EspaciosPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const handleBack = () => {
    router.push('/recursos');
  };

  // Helper para traducir tipos de espacios
  const getSpaceType = (tipo: string) => {
    const typeMap: { [key: string]: string } = {
      'sala_reunion': t.spaces.meetingRoom,
      'oficina': t.spaces.office,
      'sala_conferencia': t.spaces.conferenceRoom,
      'estacion_trabajo': t.spaces.workstation,
      'auditorio': t.spaces.auditorium,
      'laboratorio': t.spaces.laboratory,
      'almacen': t.spaces.warehouse,
      'estacionamiento': t.spaces.parking,
      'otro': t.spaces.other,
    };
    return typeMap[tipo] || tipo;
  };

  // Helper para traducir estado
  const getSpaceStatus = (estado: string) => {
    const statusMap: { [key: string]: string } = {
      'disponible': t.spaces.available,
      'ocupado': t.spaces.occupied,
      'mantenimiento': t.spaces.maintenance,
    };
    return statusMap[estado] || estado;
  };
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    capacidad: '',
    zona: '',
    estado: 'disponible',
  });
  const [espacios, setEspacios] = useState<any[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loadingEspacios, setLoadingEspacios] = useState(false);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingEspacio, setEditingEspacio] = useState<any>(null);

  // Verificar autenticación
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Cargar espacios existentes
  useEffect(() => {
    const loadEspacios = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingEspacios(true);
        const response = await apiClient.getEspacios();
        
        if (response.ok && response.data) {
          console.log('Espacios cargados:', response.data);
          setEspacios(response.data.espacios || []);
        } else {
          console.error('Error en respuesta de espacios:', response.error);
        }
      } catch (err) {
        console.error('Error cargando espacios:', err);
      } finally {
        setLoadingEspacios(false);
      }
    };

    if (isAuthenticated) {
      loadEspacios();
    }
  }, [isAuthenticated, success]); // Recargar cuando se crea un espacio exitosamente

  // Cargar zonas disponibles
  useEffect(() => {
    const loadZonas = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingZonas(true);
        const response = await apiClient.getZonas();
        
        if (response.ok && response.data) {
          console.log('Zonas cargadas:', response.data.zonas);
          setZonas(response.data.zonas || []);
        } else {
          console.error('Error en respuesta de zonas:', response.error);
        }
      } catch (err) {
        console.error('Error cargando zonas:', err);
      } finally {
        setLoadingZonas(false);
      }
    };

    if (showForm && isAuthenticated) {
      loadZonas();
    }
  }, [showForm, isAuthenticated]);

  const handleEdit = (espacio: any) => {
    setEditingEspacio(espacio);
    setFormData({
      nombre: espacio.nombre,
      descripcion: espacio.descripcion || '',
      capacidad: espacio.capacidad.toString(),
      zona: espacio.ubicacion?.zona || '',
      estado: espacio.estado,
    });
    setShowForm(true);
  };

  const handleDelete = async (espacio: any) => {
    if (!confirm(`¿Estás seguro de eliminar el espacio "${espacio.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await apiClient.deleteEspacio(espacio.id);
      if (!response.ok) {
        throw new Error(response.error || 'Error al eliminar espacio');
      }
      setSuccess('Espacio eliminado exitosamente');
      // Recargar espacios
      const espaciosResponse = await apiClient.getEspacios();
      if (espaciosResponse.ok && espaciosResponse.data) {
        setEspacios(espaciosResponse.data.espacios || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar espacio');
    }
  };

  const handleCancelEdit = () => {
    setEditingEspacio(null);
    setFormData({
      nombre: '',
      descripcion: '',
      capacidad: '',
      zona: '',
      estado: 'disponible',
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const espacioData: any = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        capacidad: parseInt(formData.capacidad, 10),
        zona: formData.zona,
        tipo: 'oficina',
        estado: formData.estado,
        edificio: 'A',
        piso: 1,
        equipamiento: []
      };

      console.log('📤 Enviando datos de espacio:', espacioData);
      
      let response: any;
      if (editingEspacio) {
        response = await apiClient.updateEspacio(editingEspacio.id, espacioData);
        console.log('📥 Respuesta de actualización:', response);
        
        if (!response.ok) {
          throw new Error(response.error || response.message || 'Error al actualizar espacio');
        }
        
        setSuccess('¡Espacio actualizado exitosamente!');
        setEditingEspacio(null);
      } else {
        response = await apiClient.createEspacio(espacioData);
        console.log('📥 Respuesta de creación:', response);
        
        if (!response.ok) {
          throw new Error(response.error || response.message || 'Error al crear espacio');
        }
        
        setSuccess('¡Espacio creado exitosamente!');
      }
      
      setFormData({
        nombre: '',
        descripcion: '',
        capacidad: '',
        zona: '',
        estado: 'disponible',
      });
      setShowForm(false);
    } catch (err: any) {
      console.error('❌ Error completo:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al crear espacio';
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader 
        title={t.spaces.management}
        breadcrumbs={[
          { label: t.spaces.title, href: '/espacios' }
        ]}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón de volver */}
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t.common.back}</span>
        </button>

        {/* Page Description */}
        <div className="mb-6">
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

        {/* Lista de Espacios o Botón de Crear */}
        {!showForm ? (
          espacios.length === 0 && !loadingEspacios ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Package className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {t.spaces.createFirst}
              </h3>
              <p className="text-gray-600 mb-8">
                {t.spaces.createFirstDesc}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  {t.nav.dashboard}
                </Link>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {t.spaces.createSpace}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {t.spaces.createSpace}
                </button>
              </div>
              
              {loadingEspacios ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">{t.spaces.loadingSpaces}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {espacios.map((espacio) => (
                    <div key={espacio.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          espacio.estado === 'disponible' ? 'bg-green-100 text-green-800' :
                          espacio.estado === 'ocupado' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getSpaceStatus(espacio.estado)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{espacio.nombre}</h3>
                      <p className="text-gray-600 text-sm mb-4">{espacio.descripcion}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t.spaces.capacity}:</span>
                          <span className="font-medium">{espacio.capacidad} {t.spaces.people}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t.spaces.type}:</span>
                          <span className="font-medium">{getSpaceType(espacio.tipo)}</span>
                        </div>
                        {espacio.ubicacion && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Ubicación:</span>
                            <span className="font-medium">{t.spaces.building} {espacio.ubicacion.edificio}, {t.spaces.floor} {espacio.ubicacion.piso}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => handleEdit(espacio)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                        >
                          {t.spaces.edit}
                        </button>
                        <button
                          onClick={() => handleDelete(espacio)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                        >
                          {t.spaces.delete}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingEspacio ? t.spaces.editSpace : t.spaces.newSpace}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.spaces.spaceName} *
                </label>
                <input
                  type="text"
                  id="nombre"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder={t.spaces.spaceNamePlaceholder}
                />
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.spaces.description}
                </label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder={t.spaces.descriptionPlaceholder}
                />
              </div>

              {/* Capacidad y Zona */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="capacidad" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.spaces.capacity} *
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
                    {t.spaces.zone} *
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
                      {loadingZonas ? t.spaces.loadingZones : zonas.length === 0 ? t.spaces.noZonesAvailable : t.spaces.selectZone}
                    </option>
                    {zonas.map((zona) => (
                      <option key={zona.id} value={zona.nombre}>
                        {zona.nombre} - Piso {zona.piso}{zona.edificio ? ` (Edif. ${zona.edificio})` : ''}
                      </option>
                    ))}
                  </select>
                  {zonas.length === 0 && !loadingZonas && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ {t.spaces.createZoneFirst}
                    </p>
                  )}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.spaces.initialStatus}
                </label>
                <select
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="disponible">{t.spaces.available}</option>
                  <option value="mantenimiento">{t.spaces.maintenance}</option>
                  <option value="ocupado">{t.spaces.occupied}</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t.spaces.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (editingEspacio ? t.spaces.updating : t.spaces.creating) : (editingEspacio ? t.spaces.updateSpace : t.spaces.createSpace)}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
