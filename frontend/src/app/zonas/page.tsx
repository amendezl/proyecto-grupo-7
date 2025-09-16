'use client';

import { useState, useMemo } from 'react';
import { useZonas, useEspacios } from '@/hooks/useApi';
import { ToggleEstadoButton } from '@/components/ToggleEstadoButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ZonasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('');
  const [filtroEdificio, setFiltroEdificio] = useState<string>('');
  const [showModalCrear, setShowModalCrear] = useState(false);

  const filters = useMemo(() => {
    const f: any = {};
    if (filtroActivo !== '') f.activo = filtroActivo === 'activo';
    if (filtroEdificio) f.edificio = filtroEdificio;
    return f;
  }, [filtroActivo, filtroEdificio]);

  const { zonas, loading, error, total, refetch } = useZonas(filters);
  const { espacios } = useEspacios();

  const zonasFiltradas = useMemo(() => {
    if (!searchTerm) return zonas;
    
    return zonas.filter(zona =>
      zona.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zona.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [zonas, searchTerm]);

  // Estadísticas calculadas
  const estadisticas = useMemo(() => {
    const activas = zonas.filter(z => z.capacidadTotal > 0).length;
    const inactivas = zonas.filter(z => z.capacidadTotal === 0).length;
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
        <Button onClick={refetch} variant="outline">
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

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Zonas
            </CardTitle>
            <Map className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <p className="text-xs text-gray-500">
              Distribución por edificio
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Zonas Activas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{estadisticas.activas}</div>
            <p className="text-xs text-gray-500">
              {((estadisticas.activas / total) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Capacidad Total
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{estadisticas.capacidadTotal}</div>
            <p className="text-xs text-gray-500">
              Personas máximo
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Espacios Disponibles
            </CardTitle>
            <Building2 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{estadisticas.espaciosTotal}</div>
            <p className="text-xs text-gray-500">
              En todas las zonas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar zonas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filtroActivo} onValueChange={setFiltroActivo}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                <SelectItem value="activo">Activas</SelectItem>
                <SelectItem value="inactivo">Inactivas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroEdificio} onValueChange={setFiltroEdificio}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las áreas</SelectItem>
                {edificios.map((edificio) => (
                  <SelectItem key={edificio} value={edificio}>
                    {edificio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || filtroActivo || filtroEdificio) && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando {zonasFiltradas.length} de {total} zonas
              </p>
              <Button
                variant="outline"
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
        </CardContent>
      </Card>

      {/* Lista de zonas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zonasFiltradas.map((zona) => {
          const stats = getZonaStats(zona.id);
          const isActive = zona.capacidadTotal > 0;
          
          return (
            <ZonaCard 
              key={zona.id}
              zona={zona}
              stats={stats}
              isActive={isActive}
              onRefetch={refetch}
            />
          );
        })}
      </div>

      {zonasFiltradas.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
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
          </CardContent>
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
  onRefetch
}: { 
  zona: any;
  stats: any;
  isActive: boolean;
  onRefetch: () => void;
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
            entityType="zona"
            entityId={zona.id}
            currentEstado={isActive}
            onToggle={onRefetch}
            size="sm"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
          <Badge variant={isActive ? "default" : "secondary"}>
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
            variant="outline"
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
      </CardContent>
    </Card>
  );
}