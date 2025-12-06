'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Save, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const router = useRouter();
  
  const [profileData, setProfileData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    departamento: '',
    telefono: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    if (user) {
      setProfileData({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        email: user.email || '',
        departamento: user.departamento || '',
        telefono: user.telefono || ''
      });
    }
  }, [user]);

  // Redirigir si no hay usuario autenticado
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    if (profileError) setProfileError('');
    if (profileSuccess) setProfileSuccess('');
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    if (passwordError) setPasswordError('');
    if (passwordSuccess) setPasswordSuccess('');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setIsLoadingProfile(true);

    try {
      const result = await updateProfile(profileData);
      
      if (result.success) {
        setProfileSuccess('Perfil actualizado correctamente');
      } else {
        setProfileError(result.error || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setProfileError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const validatePasswordForm = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden');
      return false;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!validatePasswordForm()) {
      return;
    }

    setIsLoadingPassword(true);

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (result.success) {
        setPasswordSuccess('Contraseña cambiada correctamente');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordError(result.error || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      setPasswordError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  if (!user) {
    return null; // Evita renderizar mientras redirige
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Regresar"
                aria-label="Regresar a la página anterior"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-gray-600">{user.nombre} {user.apellido}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Rol: <span className="font-medium">{user.rol || 'Usuario'}</span></p>
              <p>Última actualización: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Información Personal
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'password'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cambiar Contraseña
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab de Información Personal */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      required
                      value={profileData.nombre}
                      onChange={handleProfileInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isLoadingProfile}
                    />
                  </div>

                  <div>
                    <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido
                    </label>
                    <input
                      id="apellido"
                      name="apellido"
                      type="text"
                      required
                      value={profileData.apellido}
                      onChange={handleProfileInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isLoadingProfile}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={profileData.email}
                    onChange={handleProfileInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                    disabled={true}
                    title="El email no puede ser modificado"
                  />
                  <p className="text-xs text-gray-500 mt-1">El correo electrónico no puede ser modificado</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="departamento" className="block text-sm font-medium text-gray-700 mb-2">
                      Departamento
                    </label>
                    <input
                      id="departamento"
                      name="departamento"
                      type="text"
                      value={profileData.departamento}
                      onChange={handleProfileInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isLoadingProfile}
                    />
                  </div>

                  <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      value={profileData.telefono}
                      onChange={handleProfileInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isLoadingProfile}
                    />
                  </div>
                </div>

                {/* Messages para perfil */}
                {profileError && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">{profileSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoadingProfile}
                    className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isLoadingProfile ? 'Guardando...' : 'Guardar cambios'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab de Cambiar Contraseña */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña actual
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={passwordData.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isLoadingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isLoadingPassword}
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        disabled={isLoadingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isLoadingPassword}
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        disabled={isLoadingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isLoadingPassword}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages para contraseña */}
                {passwordError && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">{passwordSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoadingPassword}
                    className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isLoadingPassword ? 'Cambiando...' : 'Cambiar contraseña'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}