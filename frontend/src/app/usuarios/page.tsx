'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Package, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function UsuariosPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    departamento: '',
    telefono: '',
    rol: 'usuario',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Verificar autenticación
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validar password policy de Cognito
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }
    if (!/[a-z]/.test(formData.password)) {
      setError('La contraseña debe contener al menos una letra minúscula');
      setLoading(false);
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('La contraseña debe contener al menos una letra mayúscula');
      setLoading(false);
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('La contraseña debe contener al menos un número');
      setLoading(false);
      return;
    }

    try {
      const usuarioData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        password: formData.password,
        departamento: formData.departamento,
        telefono: formData.telefono,
        rol: formData.rol as 'admin' | 'responsable' | 'usuario',
        activo: true,
      };

      console.log('📤 Enviando datos de usuario:', usuarioData);
      const response = await apiClient.createUsuario(usuarioData);
      console.log('📥 Respuesta recibida:', response);

      if (!response.ok) {
        throw new Error(response.error || response.message || 'Error al crear usuario');
      }

      setSuccess('¡Usuario creado exitosamente!');
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        departamento: '',
        telefono: '',
        rol: 'usuario',
      });
      setShowForm(false);
    } catch (err: any) {
      console.error('❌ Error completo:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al crear usuario';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader 
        title={t.usersManagement.management}
        breadcrumbs={[
          { label: t.usersManagement.title, href: '/usuarios' }
        ]}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Description */}
        <div className="mb-6">
          <p className="text-gray-600">Administra los usuarios del sistema</p>
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
            <div className="p-4 bg-green-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Users className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {t.usersManagement.createFirst}
            </h3>
            <p className="text-gray-600 mb-8">
              {t.usersManagement.createFirstDesc}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t.usersManagement.createUser}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t.usersManagement.newUser}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.usersManagement.name} *
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                    placeholder={t.usersManagement.namePlaceholder}
                  />
                </div>

                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.usersManagement.lastName} *
                  </label>
                  <input
                    type="text"
                    id="apellido"
                    required
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                    placeholder={t.usersManagement.lastNamePlaceholder}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.usersManagement.email} *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                  placeholder={t.usersManagement.emailPlaceholder}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña *
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                  placeholder="Mínimo 8 caracteres"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Debe contener: mayúsculas, minúsculas y números
                </p>
              </div>

              {/* Departamento y Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="departamento" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.usersManagement.department} *
                  </label>
                  <input
                    type="text"
                    id="departamento"
                    required
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                    placeholder={t.usersManagement.departmentPlaceholder}
                  />
                </div>

                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.usersManagement.phone}
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                    placeholder={t.usersManagement.phonePlaceholder}
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label htmlFor="rol" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.usersManagement.role} *
                </label>
                <select
                  id="rol"
                  required
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                >
                  <option value="usuario">{t.usersManagement.user}</option>
                  <option value="responsable">Responsable</option>
                  <option value="admin">{t.usersManagement.admin}</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {formData.rol === 'admin' && 'Acceso completo al sistema'}
                  {formData.rol === 'responsable' && 'Puede gestionar espacios y reservas'}
                  {formData.rol === 'usuario' && 'Puede hacer reservas'}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t.usersManagement.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t.usersManagement.creating : t.usersManagement.createUser}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
