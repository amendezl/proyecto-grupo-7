'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin,
  Filter,
  ArrowLeft,
  Eye,
  Edit,
  X,
  CheckCircle,
  List,
  Grid3x3,
  CalendarDays
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge, 
  Alert 
} from '@/components/ui/components';
import { useReservas, useEspacios } from '@/hooks/useApi';
import CancelReservaButton from '@/components/CancelReservaButton';
import { apiClient } from '@/lib/api-client';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function ReservasPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [selectedEspacio, setSelectedEspacio] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'ocupacion'>('list');
  const [formData, setFormData] = useState({
    espacioId: '',
    fechaReserva: '',
    horaInicio: '',
    horaFin: '',
    proposito: '',
    numeroAsistentes: 1,
    equipamientoSolicitado: [] as string[],
    notasAdicionales: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { reservas, loading, error: reservasError, refetch } = useReservas({
    estado: selectedEstado || undefined,
    espacio_id: selectedEspacio || undefined
  });

  const { espacios } = useEspacios();

  // Log para depuración
  useEffect(() => {
    console.log('📊 Reservas cargadas:', {
      total: reservas.length,
      estados: reservas.reduce((acc, r) => {
        acc[r.estado] = (acc[r.estado] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      reservas: reservas.map(r => ({
        id: r.id,
        espacioId: r.espacioId,
        estado: r.estado,
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFin
      }))
    });
  }, [reservas]);

  // Filtrar reservas por término de búsqueda
  const filteredReservas = reservas.filter(reserva => {
    // Si no hay término de búsqueda, mostrar todas
    if (!searchTerm || searchTerm.trim() === '') {
      return true;
    }
    
    const espacio = espacios.find(e => e.id === reserva.espacioId);
    const espacioNombre = espacio?.nombre || '';
    const searchLower = searchTerm.toLowerCase();
    
    return (
      espacioNombre.toLowerCase().includes(searchLower) ||
      reserva.proposito?.toLowerCase().includes(searchLower) ||
      reserva.usuarioId?.toLowerCase().includes(searchLower)
    );
  });

  const estadosReserva = [
    { value: '', label: t.reservations.allStatuses },
    { value: 'pendiente', label: t.reservations.statusPending },
    { value: 'confirmada', label: t.reservations.statusConfirmed },
    { value: 'en_curso', label: t.reservations.statusInProgress },
    { value: 'completada', label: t.reservations.statusCompleted },
    { value: 'cancelada', label: t.reservations.statusCanceled }
  ];

  // Función para manejar cancelación de reserva
  const handleCancelReserva = async (reservaId: string) => {
    try {
      const result = await apiClient.cancelReserva(reservaId);
      if (result.ok) {
        // Refrescar la lista de reservas
        refetch();
      } else {
        console.error('Error cancelando reserva:', result.error);
        alert('Error al cancelar la reserva: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión al cancelar la reserva');
    }
  };

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

  // Verificar si un espacio está ocupado actualmente
  const isEspacioOcupado = (espacioId: string) => {
    const now = new Date();
    return reservas.some(reserva => {
      if (reserva.espacioId !== espacioId) return false;
      if (reserva.estado === 'cancelada') return false;
      
      const inicio = new Date(reserva.fechaInicio);
      const fin = new Date(reserva.fechaFin);
      return now >= inicio && now <= fin;
    });
  };

  // Generar días del mes actual para vista calendario
  const calendarDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateString = date.toISOString().split('T')[0];
      
      // Filtrar reservas para este día y espacio
      const dayReservas = filteredReservas.filter(r => {
        const reservaDate = new Date(r.fechaInicio).toISOString().split('T')[0];
        return reservaDate === dateString && (!selectedEspacio || r.espacioId === selectedEspacio);
      });

      days.push({
        date,
        dateString,
        dayNumber: d,
        reservas: dayReservas,
        isToday: dateString === today.toISOString().split('T')[0]
      });
    }

    return days;
  }, [filteredReservas, selectedEspacio]);

  const handleCreateReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validación
    if (!formData.espacioId) {
      setError('Por favor selecciona un espacio');
      return;
    }
    if (!formData.proposito || formData.proposito.length < 5) {
      setError('El propósito debe tener al menos 5 caracteres');
      return;
    }
    if (!formData.fechaReserva || !formData.horaInicio || !formData.horaFin) {
      setError('Por favor completa fecha y horarios');
      return;
    }

    try {
      console.log('👤 Usuario actual:', user);
      
      // Validar que tengamos usuario
      if (!user?.id) {
        setError('Error: No se pudo obtener el usuario actual. Por favor recarga la página.');
        return;
      }

      // Construir timestamps en zona horaria local (sin conversión a UTC)
      // El backend espera fechas en el mismo formato que se muestran al usuario
      const fechaInicioDate = new Date(`${formData.fechaReserva}T${formData.horaInicio}:00`);
      const fechaFinDate = new Date(`${formData.fechaReserva}T${formData.horaFin}:00`);
      
      // Validar que la fecha no sea en el pasado (comparar con fecha/hora actual)
      const ahora = new Date();
      if (fechaInicioDate < ahora) {
        setError(t.reservations.errorPastDate || 'Cannot create reservations in the past');
        return;
      }
      
      const reservaData: any = {
        espacioId: formData.espacioId,
        usuarioId: user.id,
        fechaInicio: fechaInicioDate.toISOString(),
        fechaFin: fechaFinDate.toISOString(),
        proposito: formData.proposito,
        estado: 'pendiente' as const,
        participantes: formData.numeroAsistentes
      };

      // Agregar empresa_id si existe
      if (user.empresa_id) {
        reservaData.empresaId = user.empresa_id;
      }

      console.log('📅 Creando reserva:', reservaData);
      const response = await apiClient.createReserva(reservaData);

      console.log('📡 Response completo:', response);

      if (!response.ok) {
        console.error('❌ Error al crear reserva:', {
          error: response.error,
          status: response.status,
          data: response.data
        });
        
        // Detectar errores específicos y mostrar mensaje traducido
        const errorMsg = response.error || '';
        if (errorMsg.includes('ya está reservado') || errorMsg.includes('already reserved')) {
          setError(t.reservations.errorSpaceReserved);
        } else {
          // Mostrar detalles específicos si están disponibles
          const errorDetails = (response as any).details || [];
          const fullErrorMsg = errorDetails.length > 0 
            ? `${response.error}: ${errorDetails.map((d: any) => d.message || d).join(', ')}`
            : response.error;
          setError(fullErrorMsg || 'Error al crear reserva');
        }
        return;
      }

      console.log('✅ Reserva creada exitosamente', response.data);

      setSuccess(t.reservations.reservationCreated);
      setShowCreateModal(false);
      setFormData({
        espacioId: '',
        fechaReserva: '',
        horaInicio: '',
        horaFin: '',
        proposito: '',
        numeroAsistentes: 1,
        equipamientoSolicitado: [],
        notasAdicionales: ''
      });
      
      // Scroll to top para ver el mensaje de éxito
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Refrescar la lista de reservas con múltiples intentos
      // para dar tiempo a DynamoDB de propagar los cambios (eventual consistency)
      console.log('🔄 Refrescando lista de reservas...');
      const refreshWithRetry = async (attempt = 1, maxAttempts = 3) => {
        await refetch();
        const currentCount = reservas.length;
        console.log(`📊 Intento ${attempt}: ${currentCount} reservas encontradas`);
        
        // Si aún no aparece la reserva y quedan intentos, reintentar
        if (currentCount === 0 && attempt < maxAttempts) {
          console.log(`⏳ Reintentando en ${attempt * 500}ms...`);
          setTimeout(() => refreshWithRetry(attempt + 1, maxAttempts), attempt * 500);
        } else {
          console.log('✅ Lista de reservas actualizada');
        }
      };
      
      setTimeout(() => refreshWithRetry(), 500);
    } catch (err: any) {
      setError(err.message || 'Error al crear la reserva');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader 
        title={t.reservations.title}
        breadcrumbs={[
          { label: t.nav.reservations, href: '/reservas' }
        ]}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Description and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-gray-600">
              {t.reservations.description}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.nav.dashboard}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t.reservations.newReservation}
            </Button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">{t.reservations.viewMode}</span>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <List className="h-4 w-4 mr-2" />
              {t.reservations.viewList}
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              {t.reservations.viewCalendar}
            </button>
            <button
              onClick={() => setViewMode('ocupacion')}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'ocupacion'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              {t.reservations.viewOccupancy}
            </button>
          </div>
        </div>

      {/* Alertas */}
      {success && (
        <Alert
          type="success"
          title={t.reservations.success}
          message={success}
        />
      )}
      {error && (
        <Alert
          type="error"
          title={t.reservations.errorTitle}
          message={error}
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
                placeholder={t.reservations.searchPlaceholder}
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
              title={t.reservations.filterByStatus}
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
              title={t.reservations.filterBySpace}
            >
              <option value="">{t.reservations.allSpaces}</option>
              {espacios.map(espacio => (
                <option key={espacio.id} value={espacio.id}>
                  {espacio.nombre}
                </option>
              ))}
            </select>

            <Button variant="secondary" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              {t.reservations.clearFilters}
            </Button>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">{t.reservations.totalReservations}</p>
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
              <p className="text-sm font-medium text-gray-600">{t.reservations.confirmed}</p>
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
              <p className="text-sm font-medium text-gray-600">{t.reservations.pending}</p>
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
              <p className="text-sm font-medium text-gray-600">{t.reservations.canceled}</p>
              <p className="text-2xl font-bold text-red-600">
                {reservas.filter(r => r.estado === 'cancelada').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vista de Ocupación de Espacios */}
      {viewMode === 'ocupacion' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.reservations.currentSpaceStatus}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {espacios.map(espacio => {
              const ocupado = isEspacioOcupado(espacio.id);
              return (
                <div
                  key={espacio.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    ocupado
                      ? 'bg-red-50 border-red-300'
                      : 'bg-green-50 border-green-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{espacio.nombre}</h3>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        ocupado ? 'bg-red-500' : 'bg-green-500'
                      }`}
                    />
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>{espacio.edificio || 'N/A'} - Piso {espacio.piso}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      <span>{t.reservations.capacity}: {espacio.capacidad}</span>
                    </div>
                    <div className={`font-medium mt-2 ${ocupado ? 'text-red-700' : 'text-green-700'}`}>
                      {ocupado ? `🔴 ${t.reservations.occupied}` : `🟢 ${t.reservations.available}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista de Calendario */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t.reservations.calendarTitle} - {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            {selectedEspacio && (
              <Badge variant="disponible">
                {t.reservations.space} {espacios.find(e => e.id === selectedEspacio)?.nombre || 'Seleccionado'}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {calendarDays.map(day => {
              const confirmadas = day.reservas.filter(r => r.estado === 'confirmada').length;
              const pendientes = day.reservas.filter(r => r.estado === 'pendiente').length;
              const canceladas = day.reservas.filter(r => r.estado === 'cancelada').length;
              
              return (
                <div
                  key={day.dateString}
                  className={`min-h-[120px] border rounded-lg p-2 ${
                    day.isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  } ${day.reservas.length > 0 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div className="text-sm font-medium text-gray-900 mb-2">{day.dayNumber}</div>
                  {day.reservas.length > 0 && (
                    <div className="space-y-1">
                      {confirmadas > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 border border-green-300 rounded text-xs text-green-800 font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span>{confirmadas} confirmada{confirmadas > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {pendientes > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800 font-medium">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          <span>{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {canceladas > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-100 border border-red-300 rounded text-xs text-red-800 font-medium">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          <span>{canceladas} cancelada{canceladas > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de reservas */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t.reservations.reservationsCount} ({filteredReservas.length})
              </h2>
              <div className="flex items-center space-x-2">
                <Badge variant="disponible" size="sm">
                  {filteredReservas.filter(r => r.estado === 'confirmada').length} {t.reservations.confirmed.toLowerCase()}
                </Badge>
                <Badge variant="reservado" size="sm">
                  {filteredReservas.filter(r => r.estado === 'pendiente').length} {t.reservations.pending.toLowerCase()}
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
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t.reservations.noReservations}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedEstado || selectedEspacio
                  ? t.reservations.noReservationsFiltered
                  : t.reservations.noReservationsStart}
              </p>
              <div className="mt-6">
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.reservations.newReservation}
                </Button>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.reservations.user}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.reservations.spaceLabel}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.reservations.dateTime}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.reservations.status}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.reservations.purpose}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.reservations.actions}
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
                          {reserva.proposito || t.reservations.noPurpose}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button variant="secondary" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            {t.reservations.view}
                          </Button>
                          <Button variant="secondary" size="sm">
                            <Edit className="h-3 w-3 mr-1" />
                            {t.reservations.edit}
                          </Button>
                          {(reserva.estado === 'pendiente' || reserva.estado === 'confirmada') && (
                            <CancelReservaButton
                              reservaId={reserva.id}
                              reservaNombre={`${espacio?.nombre || 'Espacio'} - ${fechaInicio.date}`}
                              onCancel={handleCancelReserva}
                            />
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
      )}

      {/* Modal de crear reserva */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{t.reservations.createReservation}</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateReserva} className="space-y-4">
                {/* Espacio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.reservations.spaceLabel} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.espacioId}
                    onChange={(e) => setFormData({ ...formData, espacioId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  >
                    <option value="">{t.reservations.selectSpace}</option>
                    {espacios.filter(e => e.estado === 'disponible').map(espacio => (
                      <option key={espacio.id} value={espacio.id}>
                        {espacio.nombre} - {t.reservations.capacity}: {espacio.capacidad}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.reservations.date} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.fechaReserva}
                    onChange={(e) => setFormData({ ...formData, fechaReserva: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>

                {/* Hora inicio y fin */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.reservations.startTime} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.horaInicio}
                      onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.reservations.endTime} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.horaFin}
                      onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    />
                  </div>
                </div>

                {/* Propósito */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.reservations.purposeField} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    placeholder={t.reservations.purposePlaceholder}
                    value={formData.proposito}
                    onChange={(e) => setFormData({ ...formData, proposito: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Número de asistentes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.reservations.attendees} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.numeroAsistentes}
                    onChange={(e) => setFormData({ ...formData, numeroAsistentes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>

                {/* Notas adicionales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.reservations.additionalNotes}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={t.reservations.notesPlaceholder}
                    value={formData.notasAdicionales}
                    onChange={(e) => setFormData({ ...formData, notasAdicionales: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" variant="primary">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {t.reservations.createButton}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}