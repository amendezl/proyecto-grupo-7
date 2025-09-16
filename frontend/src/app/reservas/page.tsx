'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  MapPin,
  Filter,
  Eye,
  Edit,
  X,
  CheckCircle
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge, 
  Alert 
} from '@/components/ui/components';
import { useReservas, useEspacios } from '@/hooks/useApi';

export default function ReservasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [selectedEspacio, setSelectedEspacio] = useState<string>('');

  const { reservas, loading, error, refetch } = useReservas({
    estado: selectedEstado || undefined,
    espacio_id: selectedEspacio || undefined
  });

  const { espacios } = useEspacios();

  // Filtrar reservas por término de búsqueda
  const filteredReservas = reservas.filter(reserva => {
    const espacio = espacios.find(e => e.id === reserva.espacioId);
    const espacioNombre = espacio?.nombre || '';
    
    return (
      espacioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reserva.proposito?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reserva.usuarioId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const estadosReserva = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'confirmada', label: 'Confirmada' },
    { value: 'en_curso', label: 'En Curso' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' }
  ];

  const getEstadoVariant = (estado: string) => {
    switch (estado) {
      case 'confirmada': return 'disponible';
      case 'en_curso': return 'ocupado';
      case 'pendiente': return 'reservado';
      case 'completada': return 'mantenimiento';
      case 'cancelada': return 'urgente';
      default: return 'mantenimiento';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmada': return 'text-green-600 bg-green-50';
      case 'en_curso': return 'text-blue-600 bg-blue-50';
      case 'pendiente': return 'text-amber-600 bg-amber-50';
      case 'completada': return 'text-gray-600 bg-gray-50';
      case 'cancelada': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedEstado('');
    setSelectedEspacio('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Reservas</h1>
          <p className="text-gray-600 mt-1">
            Administra y monitorea todas las reservas del sistema
          </p>
        </div>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Reserva
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
              <input
                type="text"
                placeholder="Buscar por usuario, espacio o propósito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Filtrar por estado"
            >
              {estadosReserva.map(estado => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>

            <select
              value={selectedEspacio}
              onChange={(e) => setSelectedEspacio(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Filtrar por espacio"
            >
              <option value="">Todos los espacios</option>
              {espacios.map(espacio => (
                <option key={espacio.id} value={espacio.id}>
                  {espacio.nombre}
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
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Reservas</p>
              <p className="text-2xl font-bold text-gray-900">{reservas.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Confirmadas</p>
              <p className="text-2xl font-bold text-green-600">
                {reservas.filter(r => r.estado === 'confirmada').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600">
                {reservas.filter(r => r.estado === 'pendiente').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Canceladas</p>
              <p className="text-2xl font-bold text-red-600">
                {reservas.filter(r => r.estado === 'cancelada').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de reservas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Reservas ({filteredReservas.length})
            </h2>
            <div className="flex items-center space-x-2">
              <Badge variant="disponible" size="sm">
                {filteredReservas.filter(r => r.estado === 'confirmada').length} confirmadas
              </Badge>
              <Badge variant="reservado" size="sm">
                {filteredReservas.filter(r => r.estado === 'pendiente').length} pendientes
              </Badge>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex space-x-4">
                    <div className="h-12 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-12 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-12 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-12 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredReservas.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reservas</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedEstado || selectedEspacio
                  ? 'No se encontraron reservas con los filtros seleccionados.'
                  : 'Comienza creando tu primera reserva.'}
              </p>
              <div className="mt-6">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Reserva
                </Button>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Espacio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propósito
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReservas.map((reserva) => {
                  const fechaInicio = formatDateTime(reserva.fechaInicio);
                  const fechaFin = formatDateTime(reserva.fechaFin);
                  const espacio = espacios.find(e => e.id === reserva.espacioId);
                  
                  return (
                    <tr key={reserva.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              Usuario {reserva.usuarioId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {espacio?.nombre || `Espacio ${reserva.espacioId}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {fechaInicio.date}
                        </div>
                        <div className="text-sm text-gray-500">
                          {fechaInicio.time} - {fechaFin.time}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getEstadoVariant(reserva.estado)}>
                          {reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {reserva.proposito || 'Sin propósito especificado'}
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
                          {reserva.estado === 'pendiente' && (
                            <Button variant="danger" size="sm">
                              <X className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}