'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Building2, MapPin, Users } from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui/components';
import { Responsable } from '@/lib/api-client';

interface ResponsableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Responsable>) => void;
  responsable?: Responsable | null;
  espacios?: Array<{ id: string; nombre: string; zona: string }>;
  mode: 'create' | 'edit' | 'view';
}

export default function ResponsableModal({
  isOpen,
  onClose,
  onSave,
  responsable,
  espacios = [],
  mode
}: ResponsableModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    departamento: '',
    especialidad: '',
    areas: [] as string[],
    espaciosAsignados: [] as string[],
    estado: 'activo' as 'activo' | 'inactivo'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Departamentos disponibles
  const departamentos = [
    'Cardiología',
    'Neurología',
    'Pediatría',
    'Urgencias',
    'Administración',
    'Recursos Humanos',
    'Mantenimiento',
    'Seguridad'
  ];

  // Áreas disponibles
  const areasDisponibles = [
    'Urgencias',
    'Consultas Externas',
    'Hospitalización',
    'Quirófanos',
    'UCI',
    'Laboratorios',
    'Radiología',
    'Farmacia',
    'Administración'
  ];

  useEffect(() => {
    if (responsable && mode !== 'create') {
      setFormData({
        nombre: responsable.nombre,
        apellido: responsable.apellido,
        email: responsable.email,
        telefono: responsable.telefono,
        departamento: responsable.departamento,
        especialidad: responsable.especialidad || '',
        areas: responsable.areas,
        espaciosAsignados: responsable.espaciosAsignados,
        estado: responsable.estado
      });
    } else {
      // Reset para modo crear
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        departamento: '',
        especialidad: '',
        areas: [],
        espaciosAsignados: [],
        estado: 'activo'
      });
    }
    setErrors({});
  }, [responsable, mode, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpiar error al escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAreaToggle = (area: string) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.includes(area)
        ? prev.areas.filter(a => a !== area)
        : [...prev.areas, area]
    }));
  };

  const handleEspacioToggle = (espacioId: string) => {
    setFormData(prev => ({
      ...prev,
      espaciosAsignados: prev.espaciosAsignados.includes(espacioId)
        ? prev.espaciosAsignados.filter(e => e !== espacioId)
        : [...prev.espaciosAsignados, espacioId]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido es requerido';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    }
    if (!formData.departamento.trim()) {
      newErrors.departamento = 'El departamento es requerido';
    }
    if (formData.areas.length === 0) {
      newErrors.areas = 'Debe seleccionar al menos un área';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving responsable:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? 'Nuevo Responsable' : 
                mode === 'edit' ? 'Editar Responsable' : 
                'Detalles del Responsable';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información Personal */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Nombre *"
                  value={formData.nombre}
                  onChange={(value) => handleInputChange('nombre', value)}
                  error={errors.nombre}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Input
                  label="Apellido *"
                  value={formData.apellido}
                  onChange={(value) => handleInputChange('apellido', value)}
                  error={errors.apellido}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Input
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(value) => handleInputChange('email', value)}
                  error={errors.email}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Input
                  label="Teléfono *"
                  value={formData.telefono}
                  onChange={(value) => handleInputChange('telefono', value)}
                  error={errors.telefono}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Información Profesional */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Información Profesional
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento *
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => handleInputChange('departamento', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  aria-label="Seleccionar departamento"
                >
                  <option value="">Seleccionar departamento</option>
                  {departamentos.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.departamento && (
                  <p className="mt-1 text-sm text-red-600">{errors.departamento}</p>
                )}
              </div>
              <div>
                <Input
                  label="Especialidad"
                  value={formData.especialidad}
                  onChange={(value) => handleInputChange('especialidad', value)}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Áreas de Responsabilidad */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Áreas de Responsabilidad *
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {areasDisponibles.map((area) => (
                <label
                  key={area}
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.areas.includes(area)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.areas.includes(area)}
                    onChange={() => !isReadOnly && handleAreaToggle(area)}
                    disabled={isReadOnly}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium">{area}</span>
                </label>
              ))}
            </div>
            {errors.areas && (
              <p className="mt-1 text-sm text-red-600">{errors.areas}</p>
            )}
          </div>

          {/* Espacios Asignados */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Espacios Asignados ({formData.espaciosAsignados.length})
            </h3>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {espacios.length > 0 ? (
                <div className="p-4 space-y-2">
                  {espacios.map((espacio) => (
                    <label
                      key={espacio.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.espaciosAsignados.includes(espacio.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.espaciosAsignados.includes(espacio.id)}
                          onChange={() => !isReadOnly && handleEspacioToggle(espacio.id)}
                          disabled={isReadOnly}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <div>
                          <p className="font-medium">{espacio.nombre}</p>
                          <p className="text-sm text-gray-600">{espacio.zona}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No hay espacios disponibles para asignar</p>
                </div>
              )}
            </div>
          </div>

          {/* Estado */}
          {mode !== 'create' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Estado</h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="activo"
                    checked={formData.estado === 'activo'}
                    onChange={() => handleInputChange('estado', 'activo')}
                    disabled={isReadOnly}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <Badge variant="disponible" size="sm">Activo</Badge>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="inactivo"
                    checked={formData.estado === 'inactivo'}
                    onChange={() => handleInputChange('estado', 'inactivo')}
                    disabled={isReadOnly}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <Badge variant="urgente" size="sm">Inactivo</Badge>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isReadOnly && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSave}
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        )}

        {isReadOnly && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}