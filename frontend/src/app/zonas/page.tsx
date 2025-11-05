'use client';

import { useState, useMemo, useCallback } from 'react';
import { useZonas, useEspacios } from '@/hooks/useApi';
import ToggleEstadoButton from '@/components/ToggleEstadoButton';
import { Button, Badge, Input, Alert } from '@/components/ui/components';
import { apiClient } from '@/lib/api-client';
import type { Zona } from '@/lib/api-client';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Users, 
  Layers,
  CheckCircle,
  AlertCircle,
  XCircle,
  Map
} from 'lucide-react';
// Note: using native <select> in this file because '@/components/ui/select' does not exist

export default function ZonasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('');
  const [filtroEdificio, setFiltroEdificio] = useState<string>('');
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const f: any = {};
    if (filtroActivo !== '') f.activo = filtroActivo === 'activo';
    if (filtroEdificio) f.edificio = filtroEdificio;
    return f;
  }, [filtroActivo, filtroEdificio]);

  const { zonas, loading, error, total, refetch } = useZonas(filters);
  const { espacios } = useEspacios();

  const handleToggleZonaEstado = useCallback(
    async (zonaId: string, nextEstadoActivo: boolean) => {
      setActionError(null);
      const response = await apiClient.toggleZonaEstado(zonaId, nextEstadoActivo);

      if (!response.ok) {
        const message = response.error || response.message || 'No se pudo actualizar el estado de la zona.';
        setActionError(message);
        throw new Error(message);
      }

      refetch();
    },
    [refetch]
  );

  const zonasFiltradas = useMemo(() => {
    if (!searchTerm) return zonas;
    
    return zonas.filter(zona =>
      zona.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zona.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [zonas, searchTerm]);

  // Estadísticas calculadas
  const estadisticas = useMemo(() => {
    const activas = zonas.filter(z => z.activa !== false).length;
    const inactivas = zonas.filter(z => z.activa === false).length;
    const capacidadTotal = zonas.reduce((sum, z) => sum + z.capacidadTotal, 0);
    const espaciosTotal = zonas.reduce((sum, z) => sum + z.espaciosDisponibles, 0);
    
    return { activas, inactivas, capacidadTotal, espaciosTotal };
  }, [zonas]);

  // Opciones de filtros
  const edificios = useMemo(() => {
    const edif = [...new Set(zonas.map(z => z.nombre.split(' - ')[0]))];
    return edif.sort();
  }, [zonas]);

  // Obtener estadísticas de espacios por zona
  const getZonaStats = (zonaId: string) => {
    const espaciosZona = espacios.filter(espacio => 
      espacio.zona?.toLowerCase().includes(zonaId.toLowerCase()) ||
      espacio.zona === zonaId
    );
    
    const disponibles = espaciosZona.filter(e => e.estado === 'disponible').length;
    const ocupados = espaciosZona.filter(e => e.estado === 'ocupado').length;
    const mantenimiento = espaciosZona.filter(e => e.estado === 'mantenimiento').length;
    
    return {
      total: espaciosZona.length,
      disponibles,
      ocupados,
      mantenimiento
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={refetch} variant="secondary">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Zonas</h1>
          <p className="text-gray-600 mt-1">
            Administra las zonas y áreas del edificio
          </p>
        </div>
        <Button 
          onClick={() => setShowModalCrear(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Zona
        </Button>
      </div>

      {actionError && (
        <Alert
          type="warning"
          title="Acción no completada"
          message={actionError}
        />
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-gray-600">Total Zonas</div>
            <Map className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <p className="text-xs text-gray-500">
              Distribución por edificio
            </p>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-gray-600">Zonas Activas</div>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-gray-900">{estadisticas.activas}</div>
            <p className="text-xs text-gray-500">
              {((estadisticas.activas / total) * 100).toFixed(1)}% del total
            </p>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-gray-600">Capacidad Total</div>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-gray-900">{estadisticas.capacidadTotal}</div>
            <p className="text-xs text-gray-500">
              Personas máximo
            </p>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-gray-600">Espacios Disponibles</div>
            <Building2 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-gray-900">{estadisticas.espaciosTotal}</div>
            <p className="text-xs text-gray-500">
              En todas las zonas
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
        <Card>
        <CardHeader>
          <div className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros y Búsqueda
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                label=""
                placeholder="Buscar zonas..."
                value={searchTerm}
                onChange={(v) => setSearchTerm(v)}
                className="pl-10"
              />
            </div>

            <div>
              <label className="sr-only">Filtrar por estado</label>
              <select
                value={filtroActivo}
                onChange={(e) => setFiltroActivo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filtrar por estado"
                title="Filtrar por estado"
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activas</option>
                <option value="inactivo">Inactivas</option>
              </select>
            </div>

            <div>
              <label className="sr-only">Filtrar por área</label>
              <select
                value={filtroEdificio}
                onChange={(e) => setFiltroEdificio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filtrar por área"
                title="Filtrar por área"
              >
                <option value="">Todas las áreas</option>
                {edificios.map((edificio) => (
                  <option key={edificio} value={edificio}>{edificio}</option>
                ))}
              </select>
            </div>
          </div>

              {(searchTerm || filtroActivo || filtroEdificio) && (
      <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando {zonasFiltradas.length} de {total} zonas
              </p>
              <Button
                    variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFiltroActivo('');
                  setFiltroEdificio('');
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Lista de zonas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zonasFiltradas.map((zona) => {
          const stats = getZonaStats(zona.id);
          const isActive = zona.activa ?? zona.capacidadTotal > 0;
          
          return (
            <ZonaCard 
              key={zona.id}
              zona={zona}
              stats={stats}
              isActive={isActive}
              onToggleEstado={handleToggleZonaEstado}
            />
          );
        })}
      </div>

      {zonasFiltradas.length === 0 && (
        <Card>
          <CardBody className="text-center py-8">
            <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron zonas
            </h3>
            <p className="text-gray-600">
              {searchTerm || filtroActivo || filtroEdificio
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando tu primera zona'
              }
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// Componente para cada tarjeta de zona
function ZonaCard({ 
  zona, 
  stats,
  isActive,
  onToggleEstado
}: { 
  zona: Zona;
  stats: any;
  isActive: boolean;
  onToggleEstado: (id: string, nextEstadoActivo: boolean) => Promise<void>;
}) {
  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      !isActive ? 'opacity-75 bg-gray-50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${
              isActive ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Map className={`w-6 h-6 ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {zona.nombre}
              </h3>
              <p className="text-sm text-gray-600">{zona.descripcion}</p>
            </div>
          </div>
          
          <ToggleEstadoButton
            id={zona.id}
            entityType="zona"
            entityName={zona.nombre}
            currentEstado={isActive ? 'disponible' : 'inactivo'}
            onToggle={onToggleEstado}
            size="sm"
          />
        </div>
      </CardHeader>
      
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{zona.capacidadTotal}</div>
            <div className="text-xs text-gray-600">Capacidad</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{zona.espaciosDisponibles}</div>
            <div className="text-xs text-gray-600">Espacios</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Piso:</span>
          <div className="flex items-center">
            <Layers className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-sm font-medium text-gray-900">
              {zona.piso}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Estado:</span>
          <Badge variant={isActive ? 'disponible' : 'ocupado'}>
            {isActive ? 'Activa' : 'Inactiva'}
          </Badge>
        </div>

        {/* Estadísticas de espacios */}
        <div className="border-t border-gray-100 pt-3">
          <div className="text-sm text-gray-600 mb-2">Espacios en la zona:</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-green-600">{stats.disponibles}</div>
              <div className="text-gray-500">Disponibles</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-red-600">{stats.ocupados}</div>
              <div className="text-gray-500">Ocupados</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-yellow-600">{stats.mantenimiento}</div>
              <div className="text-gray-500">Mantenim.</div>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-100">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              // TODO: Implementar modal de edición
              console.log('Editar zona:', zona.id);
            }}
          >
            Editar Zona
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}