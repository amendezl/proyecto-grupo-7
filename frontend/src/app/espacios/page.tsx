'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  Users, 
  Settings,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge, 
  SpaceCard,
  Alert 
} from '@/components/ui/components';
import { useEspacios, useZonas } from '@/hooks/useApi';

export default function EspaciosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [selectedZona, setSelectedZona] = useState<string>('');

  const { espacios, loading, error, refetch } = useEspacios({
    tipo: selectedTipo || undefined,
    estado: selectedEstado || undefined,
    zona_id: selectedZona || undefined
  });

  const { zonas } = useZonas();

  // Filtrar espacios por término de búsqueda
  const filteredEspacios = espacios.filter(espacio =>
    espacio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    espacio.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tiposEspacio = [
    { value: '', label: 'Todos los tipos' },
    { value: 'oficina', label: 'Oficinas' },
    { value: 'sala_reunion', label: 'Salas de Reunión' },
    { value: 'laboratorio', label: 'Laboratorios' },
    { value: 'aula', label: 'Aulas' },
    { value: 'auditorio', label: 'Auditorios' },
    { value: 'otro', label: 'Otros' }
  ];

  const estadosEspacio = [
    { value: '', label: 'Todos los estados' },
    { value: 'disponible', label: 'Disponible' },
    { value: 'ocupado', label: 'Ocupado' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'reservado', label: 'Reservado' }
  ];

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTipo('');
    setSelectedEstado('');
    setSelectedZona('');
  };

  const getEstadoVariant = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'disponible';
      case 'ocupado': return 'ocupado';
      case 'mantenimiento': return 'mantenimiento';
      case 'reservado': return 'reservado';
      default: return 'mantenimiento';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Espacios</h1>
          <p className="text-gray-600 mt-1">
            Administra y monitorea todos los espacios del sistema
          </p>
        </div>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Espacio
        </Button>
      </div>

      {/* Alertas */}
      {error && (
        <Alert
          type="warning"
          title="Modo sin conexión"
          message="Mostrando datos simulados. Verifique la conexión al backend."
        />
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                label=""
                placeholder="Buscar espacios por nombre o descripción..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              aria-label="Filtrar por tipo de espacio"
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {tiposEspacio.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por estado del espacio"
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {estadosEspacio.map(estado => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por zona"
              value={selectedZona}
              onChange={(e) => setSelectedZona(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las zonas</option>
              {zonas.map(zona => (
                <option key={zona.id} value={zona.id}>
                  {zona.nombre}
                </option>
              ))}
            </select>

            <Button variant="secondary" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Espacios</p>
              <p className="text-2xl font-bold text-gray-900">{espacios.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">
                {espacios.filter(e => e.estado === 'disponible').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Ocupados</p>
              <p className="text-2xl font-bold text-red-600">
                {espacios.filter(e => e.estado === 'ocupado').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-amber-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Mantenimiento</p>
              <p className="text-2xl font-bold text-amber-600">
                {espacios.filter(e => e.estado === 'mantenimiento').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de espacios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Espacios ({filteredEspacios.length})
            </h2>
            <div className="flex items-center space-x-2">
              <Badge variant="disponible" size="sm">
                {filteredEspacios.filter(e => e.estado === 'disponible').length} disponibles
              </Badge>
              <Badge variant="ocupado" size="sm">
                {filteredEspacios.filter(e => e.estado === 'ocupado').length} ocupados
              </Badge>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredEspacios.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay espacios</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedTipo || selectedEstado || selectedZona
                  ? 'No se encontraron espacios con los filtros seleccionados.'
                  : 'Comienza creando tu primer espacio.'}
              </p>
              <div className="mt-6">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Espacio
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEspacios.map((espacio) => (
                <div key={espacio.id} className="group">
                  <SpaceCard
                    nombre={espacio.nombre}
                    zona={espacio.zona || 'Sin zona'}
                    capacidad={espacio.capacidad}
                    estado={espacio.estado}
                    usuarioActual={undefined} // No disponible en tipo Espacio
                    proximaReserva={undefined} // No disponible en tipo Espacio
                    onClick={() => console.log(`Ver detalles de ${espacio.nombre}`)}
                  />
                  
                  {/* Acciones rápidas que aparecen en hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2 flex justify-center space-x-2">
                    <Button variant="secondary" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    <Button variant="secondary" size="sm">
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button variant="danger" size="sm">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}