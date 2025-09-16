'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Building,
  Users,
  Settings,
  Eye,
  Edit,
  MoreVertical,
  Map,
  Info
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge, 
  Alert 
} from '@/components/ui/components';
import { useZonas, useEspacios } from '@/hooks/useApi';

export default function ZonasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPiso, setSelectedPiso] = useState<string>('');

  const { zonas, loading, error, refetch } = useZonas();

  const { espacios } = useEspacios();

  // Filtrar zonas por término de búsqueda
  const filteredZonas = zonas.filter(zona =>
    zona.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    zona.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener pisos únicos
  const pisosUnicos = [...new Set(zonas.map(zona => zona.piso))].sort();

  // Calcular estadísticas por zona
  const getZonaStats = (zonaId: string) => {
    const espaciosZona = espacios.filter(espacio => espacio.zona_id === zonaId);
    const disponibles = espaciosZona.filter(e => e.estado === 'disponible').length;
    const ocupados = espaciosZona.filter(e => e.estado === 'ocupado').length;
    const mantenimiento = espaciosZona.filter(e => e.estado === 'mantenimiento').length;
    
    return {
      total: espaciosZona.length,
      disponibles,
      ocupados,
      mantenimiento,
      capacidadTotal: espaciosZona.reduce((sum, e) => sum + (e.capacidad || 0), 0)
    };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPiso('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Zonas</h1>
          <p className="text-gray-600 mt-1">
            Organiza y administra las zonas del hospital
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary">
            <Map className="h-4 w-4 mr-2" />
            Ver Plano
          </Button>
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Zona
          </Button>
        </div>
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
              <input
                type="text"
                placeholder="Buscar zonas por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-4">
            <select
              value={selectedPiso}
              onChange={(e) => setSelectedPiso(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Filtrar por piso"
            >
              <option value="">Todos los pisos</option>
              {pisosUnicos.map(piso => (
                <option key={piso} value={piso}>
                  Piso {piso}
                </option>
              ))}
            </select>

            <Button variant="secondary" onClick={clearFilters}>
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Estadísticas globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Zonas</p>
              <p className="text-2xl font-bold text-gray-900">{zonas.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Espacios Total</p>
              <p className="text-2xl font-bold text-green-600">{espacios.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Capacidad Total</p>
              <p className="text-2xl font-bold text-purple-600">
                {espacios.reduce((sum, e) => sum + (e.capacidad || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Building className="w-4 h-4 text-amber-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pisos</p>
              <p className="text-2xl font-bold text-amber-600">{pisosUnicos.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de zonas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          // Loading skeleton
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))
        ) : filteredZonas.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay zonas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedPiso
                ? 'No se encontraron zonas con los filtros seleccionados.'
                : 'Comienza creando tu primera zona.'}
            </p>
            <div className="mt-6">
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Zona
              </Button>
            </div>
          </div>
        ) : (
          filteredZonas.map((zona) => {
            const stats = getZonaStats(zona.id);
            
            return (
              <div
                key={zona.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
              >
                {/* Header de la tarjeta */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {zona.nombre}
                        </h3>
                        <Badge variant="mantenimiento" size="sm">
                          Piso {zona.piso}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {zona.descripcion || 'Sin descripción'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="secondary" size="sm">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="secondary" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="secondary" size="sm">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Estadísticas de la zona */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Espacios</span>
                        <span className="text-lg font-bold text-gray-900">{stats.total}</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Capacidad</span>
                        <span className="text-lg font-bold text-gray-900">{stats.capacidadTotal}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estados de espacios */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Disponibles</span>
                      </div>
                      <Badge variant="disponible" size="sm">
                        {stats.disponibles}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Ocupados</span>
                      </div>
                      <Badge variant="ocupado" size="sm">
                        {stats.ocupados}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Mantenimiento</span>
                      </div>
                      <Badge variant="mantenimiento" size="sm">
                        {stats.mantenimiento}
                      </Badge>
                    </div>
                  </div>

                  {/* Barra de ocupación */}
                  {stats.total > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Ocupación</span>
                        <span>{Math.round((stats.ocupados / stats.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(stats.ocupados / stats.total) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer con acciones */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <Button variant="secondary" size="sm">
                    <MapPin className="h-3 w-3 mr-1" />
                    Ver Espacios
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Settings className="h-3 w-3 mr-1" />
                    Configurar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Vista de lista alternativa */}
      {filteredZonas.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Resumen de Zonas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Piso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Espacios
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredZonas.map((zona) => {
                  const stats = getZonaStats(zona.id);
                  const ocupacionPorcentaje = stats.total > 0 ? (stats.ocupados / stats.total) * 100 : 0;
                  
                  return (
                    <tr key={zona.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {zona.nombre}
                            </div>
                            <div className="text-sm text-gray-500">
                              {zona.descripcion}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="mantenimiento" size="sm">
                          Piso {zona.piso}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stats.total}</div>
                        <div className="text-sm text-gray-500">
                          {stats.disponibles} disponibles
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stats.capacidadTotal}</div>
                        <div className="text-sm text-gray-500">personas</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${ocupacionPorcentaje}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round(ocupacionPorcentaje)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button variant="secondary" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button variant="secondary" size="sm">
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}