'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

// Función para traducir errores de Cognito a mensajes específicos
const translatePasswordError = (error: string): string => {
  if (error.includes('Password did not conform') || error.includes('password policy')) {
    return 'La contraseña no cumple con los requisitos de seguridad. Debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números.';
  }
  if (error.includes('Member must have length greater than or equal to 8')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (error.includes('lowercase')) {
    return 'La contraseña debe contener al menos una letra minúscula.';
  }
  if (error.includes('uppercase')) {
    return 'La contraseña debe contener al menos una letra mayúscula.';
  }
  if (error.includes('number') || error.includes('digit')) {
    return 'La contraseña debe contener al menos un número.';
  }
  if (error.includes('UsernameExistsException') || error.includes('already exists')) {
    return 'Este correo electrónico ya está registrado. Intenta iniciar sesión o usa otro correo.';
  }
  if (error.includes('InvalidPasswordException')) {
    return 'La contraseña no es válida. Debe tener al menos 8 caracteres, mayúsculas, minúsculas y números.';
  }
  return error;
};

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellido: '',
    departamento: '',
    telefono: '',
    organizationName: '',
    industry: 'office' as string
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const industries = [
    { id: 'office', name: 'Oficinas' },
    { id: 'healthcare', name: 'Salud' },
    { id: 'education', name: 'Educación' },
    { id: 'coworking', name: 'Coworking' },
    { id: 'parking', name: 'Estacionamientos' },
    { id: 'sports', name: 'Deportes' },
    { id: 'equipment', name: 'Equipamiento' },
    { id: 'events', name: 'Eventos' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar mensajes cuando el usuario empiece a escribir
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    
    // Validar password policy de Cognito
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (!/[a-z]/.test(formData.password)) {
      setError('La contraseña debe contener al menos una letra minúscula');
      return false;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('La contraseña debe contener al menos una letra mayúscula');
      return false;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('La contraseña debe contener al menos un número');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Generar empresa_id a partir del nombre de la organización
      const empresa_id = formData.organizationName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9]+/g, '-') // Reemplazar espacios y caracteres especiales con guiones
        .replace(/^-+|-+$/g, ''); // Remover guiones al inicio y final

      const result = await register({
        email: formData.email,
        password: formData.password,
        nombre: formData.nombre,
        apellido: formData.apellido,
        empresa_id,
        empresa_nombre: formData.organizationName,
        departamento: formData.departamento || undefined,
        telefono: formData.telefono || undefined
      });
      
      if (result.success) {
        setSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        // Traducir el error a un mensaje específico
        const errorMessage = translatePasswordError(result.error || 'Error en el registro');
        setError(errorMessage);
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      {/* Botón volver en la esquina superior izquierda */}
      <div className="absolute top-4 left-4">
        <Link 
          href="/"
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline">{t.auth.backToHome}</span>
        </Link>
      </div>

      {/* Selector de idioma en la esquina superior derecha */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher temporary />
      </div>

      <div className="w-full max-w-2xl">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t.auth.createAccount}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t.auth.registerSubtitle}</p>
        </div>

        {/* Formulario de registro */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información personal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.registerForm.firstName} *
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t.registerForm.firstNamePlaceholder}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.registerForm.lastName} *
                </label>
                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  required
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t.registerForm.lastNamePlaceholder}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t.auth.email} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="tu@email.com"
                disabled={isLoading}
              />
            </div>

            {/* Información de organización */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.registerForm.organizationInfo}</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.registerForm.organizationName} *
                  </label>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t.registerForm.organizationNamePlaceholder}
                    disabled={isLoading}
                  />
                  <p className="mt-1 text-xs text-gray-500">{t.registerForm.organizationNameHelper}</p>
                </div>

                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.registerForm.industry} *
                  </label>
                  <select
                    id="industry"
                    name="industry"
                    required
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    {industries.map(ind => (
                      <option key={ind.id} value={ind.id}>{ind.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">{t.registerForm.industryHelper}</p>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="departamento" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.settings.department}
                </label>
                <input
                  id="departamento"
                  name="departamento"
                  type="text"
                  value={formData.departamento}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t.registerForm.departmentPlaceholder}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.settings.phone}
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t.registerForm.phonePlaceholder}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.auth.password} *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t.registerForm.passwordPlaceholder}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {/* Indicadores de requisitos de contraseña */}
                {formData.password && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={`flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                      <CheckCircle className="h-3 w-3" />
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <CheckCircle className="h-3 w-3" />
                      <span>Al menos una minúscula</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <CheckCircle className="h-3 w-3" />
                      <span>Al menos una mayúscula</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <CheckCircle className="h-3 w-3" />
                      <span>Al menos un número</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.auth.confirmPassword} *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t.registerForm.passwordPlaceholder}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrando...
                </span>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          {/* Links adicionales */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/auth/login" className="text-green-600 hover:text-green-700 font-medium">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sistema de Gestión de Espacios</p>
          <p>© 2025 Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}