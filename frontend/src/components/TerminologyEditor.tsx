'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { Save, RefreshCw, Check, AlertCircle, Eye } from 'lucide-react';

interface TerminologyItem {
  singular: string;
  plural: string;
  article: string;
}

interface Terminology {
  resource: TerminologyItem;
  reservation: TerminologyItem;
  zone: TerminologyItem;
  user: TerminologyItem;
  responsible: TerminologyItem;
}

export default function TerminologyEditor() {
  const { user } = useAuth();
  const [terminology, setTerminology] = useState<Terminology>({
    resource: { singular: 'espacio', plural: 'espacios', article: 'el' },
    reservation: { singular: 'reserva', plural: 'reservas', article: 'la' },
    zone: { singular: 'zona', plural: 'zonas', article: 'la' },
    user: { singular: 'usuario', plural: 'usuarios', article: 'el' },
    responsible: { singular: 'responsable', plural: 'responsables', article: 'el' }
  });
  
  const [originalTerminology, setOriginalTerminology] = useState<Terminology | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orgInfo, setOrgInfo] = useState<{ name: string; industry: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Verificar si es admin
  const isAdmin = user?.rol === 'admin';

  useEffect(() => {
    loadTerminology();
  }, []);

  useEffect(() => {
    // Detectar cambios
    if (originalTerminology) {
      const changed = JSON.stringify(terminology) !== JSON.stringify(originalTerminology);
      setHasChanges(changed);
    }
  }, [terminology, originalTerminology]);

  const loadTerminology = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.get('/api/organizations/my/config');

      if (response.ok && response.data) {
        const data = response.data as any;
        if (data.config?.terminology) {
          setTerminology(data.config.terminology);
          setOriginalTerminology(data.config.terminology);
        }
        setOrgInfo({
          name: data.name || 'Mi Organización',
          industry: data.industry || 'generic'
        });
      } else {
        setError('No se pudo cargar la configuración');
      }
    } catch (err) {
      console.error('Error loading terminology:', err);
      setError('Error de conexión al cargar la terminología');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      setError('Solo los administradores pueden modificar la terminología');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.put('/api/organizations/my/terminology', {
        terminology
      });

      if (response.ok) {
        setSuccess('Terminología actualizada correctamente');
        setOriginalTerminology(terminology);
        setHasChanges(false);
        
        // Recargar la página después de 2 segundos para aplicar cambios
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(response.error || 'Error al guardar la terminología');
      }
    } catch (err) {
      console.error('Error saving terminology:', err);
      setError('Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalTerminology) {
      setTerminology(originalTerminology);
      setError('');
      setSuccess('');
    }
  };

  const updateTerminologyField = (
    category: keyof Terminology,
    field: keyof TerminologyItem,
    value: string
  ) => {
    setTerminology(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">Solo para administradores</h4>
            <p className="text-sm text-yellow-700">
              Solo los administradores de la organización pueden modificar la terminología.
              Contacta con tu administrador si necesitas realizar cambios.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const TermField = ({ 
    label, 
    category, 
    value, 
    placeholder,
    field 
  }: { 
    label: string; 
    category: keyof Terminology; 
    value: string; 
    placeholder: string;
    field: keyof TerminologyItem;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => updateTerminologyField(category, field, e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder}
        disabled={saving}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      {orgInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Organización: {orgInfo.name}</p>
              <p className="text-xs text-blue-700">Industria: {orgInfo.industry}</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
          <Check className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Resource */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Recurso Principal</h4>
          <Eye className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 mb-4">
          ¿Cómo llamas a tus recursos? (espacios, salas, canchas, herramientas, etc.)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TermField
            label="Singular"
            category="resource"
            field="singular"
            value={terminology.resource.singular}
            placeholder="espacio"
          />
          <TermField
            label="Plural"
            category="resource"
            field="plural"
            value={terminology.resource.plural}
            placeholder="espacios"
          />
        </div>
        <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Vista previa:</strong> Gestiona tus <span className="text-blue-600 font-medium">{terminology.resource.plural}</span> | 
            Ver <span className="text-blue-600 font-medium">{terminology.resource.singular}</span>
          </p>
        </div>
      </div>

      {/* Reservation */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Reservas/Turnos</h4>
          <Eye className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 mb-4">
          ¿Cómo llamas a las reservas? (reservas, turnos, préstamos, etc.)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TermField
            label="Singular"
            category="reservation"
            field="singular"
            value={terminology.reservation.singular}
            placeholder="reserva"
          />
          <TermField
            label="Plural"
            category="reservation"
            field="plural"
            value={terminology.reservation.plural}
            placeholder="reservas"
          />
        </div>
        <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Vista previa:</strong> Mis <span className="text-blue-600 font-medium">{terminology.reservation.plural}</span> | 
            Crear <span className="text-blue-600 font-medium">{terminology.reservation.singular}</span>
          </p>
        </div>
      </div>

      {/* Zones */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Zonas</h4>
          <Eye className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 mb-4">
          ¿Cómo agrupas tus recursos? (zonas, áreas, sectores, etc.)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TermField
            label="Singular"
            category="zone"
            field="singular"
            value={terminology.zone.singular}
            placeholder="zona"
          />
          <TermField
            label="Plural"
            category="zone"
            field="plural"
            value={terminology.zone.plural}
            placeholder="zonas"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
          disabled={saving || !hasChanges}
        >
          Descartar cambios
        </button>

        <div className="flex items-center space-x-4">
          {hasChanges && (
            <span className="text-sm text-orange-600 font-medium">
              Tienes cambios sin guardar
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Importante</p>
            <p>
              Los cambios en la terminología se aplicarán para todos los usuarios de tu organización.
              La página se recargará automáticamente después de guardar los cambios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
