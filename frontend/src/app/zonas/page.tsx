'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient, Zona } from '@/lib/api-client';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';

export default function ZonasPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    piso: '',
    edificio: '',
    capacidadTotal: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingZona, setEditingZona] = useState<Zona | null>(null);
  const [deletingZona, setDeletingZona] = useState<Zona | null>(null);

  // Verificar autenticación
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Cargar zonas existentes
  useEffect(() => {
    const fetchZonas = async () => {
      if (!isAuthenticated) return;
      
      setLoadingZonas(true);
      try {
        const response = await apiClient.getZonas();
        console.log('🔍 [DEBUG] Respuesta de getZonas:', response);
        if (response.ok && response.data) {
          console.log('🔍 [DEBUG] Zonas recibidas:', response.data.zonas);
          setZonas(response.data.zonas || []);
        }
      } catch (err) {
        console.error('Error cargando zonas:', err);
      } finally {
        setLoadingZonas(false);
      }
    };

    fetchZonas();
  }, [isAuthenticated]);

  const handleEdit = (zona: Zona) => {
    setEditingZona(zona);
    setFormData({
      nombre: zona.nombre,
      descripcion: zona.descripcion || '',
      piso: zona.piso.toString(),
      edificio: zona.edificio || '',
      capacidadTotal: zona.capacidadTotal?.toString() || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (zona: Zona) => {
    if (!confirm(`¿Estás seguro de eliminar la zona "${zona.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await apiClient.deleteZona(zona.id);
      if (!response.ok) {
        throw new Error(response.error || 'Error al eliminar zona');
      }
      setSuccess('Zona eliminada exitosamente');
      setZonas(prev => prev.filter(z => z.id !== zona.id));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar zona');
    }
  };

  const handleCancelEdit = () => {
    setEditingZona(null);
    setFormData({
      nombre: '',
      descripcion: '',
      piso: '',
      edificio: '',
      capacidadTotal: '',
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const capacidadTotal = parseInt(formData.capacidadTotal, 10);
      const zonaData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        piso: parseInt(formData.piso, 10),
        edificio: formData.edificio,
        capacidadTotal: capacidadTotal,
        espaciosDisponibles: capacidadTotal,
        activa: true,
      };

      console.log('📤 Enviando datos de zona:', zonaData);
      
      let response: any;
      if (editingZona) {
        response = await apiClient.updateZona(editingZona.id, zonaData);
        console.log('📥 Respuesta de actualización:', response);
        
        if (!response.ok) {
          throw new Error(response.error || response.message || 'Error al actualizar zona');
        }
        
        setSuccess('¡Zona actualizada exitosamente!');
        
        // Actualizar la zona en la lista
        if (response.data) {
          setZonas(prev => prev.map(z => z.id === editingZona.id ? response.data! : z));
        }
        setEditingZona(null);
      } else {
        response = await apiClient.createZona(zonaData);
        console.log('📥 Respuesta de creación:', response);
        
        if (!response.ok) {
          throw new Error(response.error || response.message || 'Error al crear zona');
        }
        
        setSuccess('¡Zona creada exitosamente!');
        
        // Agregar la nueva zona a la lista
        if (response.data) {
          setZonas(prev => [...prev, response.data!]);
        }
      }

      setFormData({
        nombre: '',
        descripcion: '',
        piso: '',
        edificio: '',
        capacidadTotal: '',
      });
      setShowForm(false);
    } catch (err: any) {
      console.error('❌ Error completo:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error message:', err.message);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al crear zona';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader 
        title={t.zones.management}
        breadcrumbs={[
          { label: t.zones.title, href: '/zonas' }
        ]}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Description */}
        <div className="mb-6">
          <p className="text-gray-600">Organiza los espacios de tu empresa por zonas</p>
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

        {/* Create Button or List */}
        {/* DEBUG: zonas.length = {zonas.length}, showForm = {showForm.toString()} */}
        {zonas.length === 0 && !showForm ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="p-4 bg-purple-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Building2 className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {t.zones.createFirst}
            </h3>
            <p className="text-gray-600 mb-8">
              {t.zones.createFirstDesc}
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
                className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t.zones.createZone}
              </button>
            </div>
          </div>
        ) : !showForm ? (
          <>
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t.zones.newZone}
              </button>
            </div>
            
            {loadingZonas ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">{t.zones.loadingZones}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zonas.map((zona) => (
                  <div key={zona.id || zona.nombre} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <Building2 className="h-6 w-6 text-purple-600" />
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${zona.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {zona.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{zona.nombre}</h3>
                    {zona.descripcion && (
                      <p className="text-sm text-gray-600 mb-3">{zona.descripcion}</p>
                    )}
                    <div className="space-y-1 text-sm text-gray-500 mb-4">
                      <p>Piso: {zona.piso}{zona.edificio ? ` - Edificio ${zona.edificio}` : ''}</p>
                      <p>Capacidad: {zona.capacidadTotal || 0} personas</p>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => handleEdit(zona)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                      >
                        {t.zones.edit}
                      </button>
                      <button
                        onClick={() => handleDelete(zona)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                      >
                        {t.zones.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingZona ? t.zones.editZone : t.zones.newZone}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.zones.zoneName} *
                </label>
                <input
                  type="text"
                  id="nombre"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder={t.zones.zoneNamePlaceholder}
                />
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.zones.description}
                </label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder={t.zones.descriptionPlaceholder}
                  rows={3}
                />
              </div>

              {/* Piso y Edificio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="piso" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.zones.floor} *
                  </label>
                  <input
                    type="number"
                    id="piso"
                    required
                    value={formData.piso}
                    onChange={(e) => setFormData({ ...formData, piso: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    placeholder={t.zones.floorPlaceholder}
                  />
                </div>

                <div>
                  <label htmlFor="edificio" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.zones.building}
                  </label>
                  <input
                    type="text"
                    id="edificio"
                    value={formData.edificio}
                    onChange={(e) => setFormData({ ...formData, edificio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    placeholder={t.zones.buildingPlaceholder}
                  />
                </div>
              </div>

              {/* Capacidad Total */}
              <div>
                <label htmlFor="capacidadTotal" className="block text-sm font-medium text-gray-700 mb-2">
                  Capacidad Total *
                </label>
                <input
                  type="number"
                  id="capacidadTotal"
                  required
                  value={formData.capacidadTotal}
                  onChange={(e) => setFormData({ ...formData, capacidadTotal: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder="100"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Suma de las capacidades de todos los espacios en esta zona
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t.zones.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (editingZona ? t.zones.updating : t.zones.creating) : (editingZona ? t.zones.updateZone : t.zones.createZone)}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
