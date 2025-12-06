'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Building2,
  MapPin,
  Settings,
  Eye,
  Edit,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  BarChart3,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge, 
  Alert 
} from '@/components/ui/components';
import { useResponsables, useEspacios } from '@/hooks/useApi';
import { Responsable, apiClient } from '@/lib/api-client';
import ResponsableModal from '@/components/ResponsableModal';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';

// Componente de tarjeta para responsable
function ResponsableCard({ 
  responsable, 
  onView, 
  onEdit, 
  onToggleEstado,
  onDelete
}: {
  responsable: Responsable;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleEstado: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const estadoBadgeColor = responsable.estado === 'activo' ? 'disponible' : 'urgente';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {responsable.nombre} {responsable.apellido}
            </h3>
            <p className="text-sm text-gray-600">{responsable.especialidad || responsable.departamento}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={estadoBadgeColor} size="sm">
            {responsable.estado}
          </Badge>
          <div className="relative">
            <Button variant="secondary" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2" />
          {responsable.email}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="h-4 w-4 mr-2" />
          {responsable.telefono}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Building2 className="h-4 w-4 mr-2" />
          {responsable.departamento}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-2" />
          {responsable.areas.join(', ')}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {responsable.estadisticas.espaciosGestionados}
          </div>
          <div className="text-xs text-gray-600">Espacios</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            {responsable.estadisticas.reservasAprobadas}
          </div>
          <div className="text-xs text-gray-600">Reservas</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            {responsable.estadisticas.incidentesResueltos}
          </div>
          <div className="text-xs text-gray-600">Incidentes</div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex space-x-2">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => onView(responsable.id)}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-1" />
          Ver
        </Button>
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => onEdit(responsable.id)}
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
        <Button 
          variant={responsable.estado === 'activo' ? 'danger' : 'success'} 
          size="sm" 
          onClick={() => onToggleEstado(responsable.id)}
        >
          {responsable.estado === 'activo' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function ResponsablesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedResponsable, setSelectedResponsable] = useState<Responsable | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  const { responsables, loading, error, refetch } = useResponsables({
    departamento: selectedDepartamento || undefined,
    estado: selectedEstado || undefined
  });

  const { espacios } = useEspacios();

  // Filtrar responsables por término de búsqueda
  const filteredResponsables = responsables.filter(responsable =>
    responsable.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    responsable.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    responsable.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    responsable.departamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const departamentos = [
    { value: '', label: 'Todos los departamentos' },
    { value: 'cardiologia', label: 'Cardiología' },
    { value: 'neurologia', label: 'Neurología' },
    { value: 'pediatria', label: 'Pediatría' },
    { value: 'urgencias', label: 'Urgencias' },
    { value: 'administracion', label: 'Administración' }
  ];

  const estados = [
    { value: '', label: 'Todos los estados' },
    { value: 'activo', label: 'Activos' },
    { value: 'inactivo', label: 'Inactivos' }
  ];

  const handleView = (id: string) => {
    const responsable = responsables.find(r => r.id === id);
    if (responsable) {
      setSelectedResponsable(responsable);
      setModalMode('view');
      setShowCreateModal(true);
    }
  };

  const handleEdit = (id: string) => {
    const responsable = responsables.find(r => r.id === id);
    if (responsable) {
      setSelectedResponsable(responsable);
      setModalMode('edit');
      setShowCreateModal(true);
    }
  };

  const handleToggleEstado = async (id: string) => {
    const responsable = responsables.find(r => r.id === id);
    if (!responsable) return;
    
    const newEstado = responsable.estado === 'activo' ? 'inactivo' : 'activo';
    const confirmMessage = newEstado === 'inactivo' 
      ? `¿Deseas desactivar a ${responsable.nombre} ${responsable.apellido}?`
      : `¿Deseas activar a ${responsable.nombre} ${responsable.apellido}?`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      const response = await apiClient.toggleResponsableEstado(id, newEstado === 'activo');
      if (response.ok) {
        await refetch();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const responsable = responsables.find(r => r.id === id);
    if (!responsable) return;
    
    if (!confirm(`¿Estás seguro de eliminar a ${responsable.nombre} ${responsable.apellido}? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      const response = await apiClient.deleteResponsable(id);
      if (!response.ok) {
        throw new Error(response.error || 'Error al eliminar responsable');
      }
      await refetch();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar responsable');
    }
  };

  const handleCreateNew = () => {
    setSelectedResponsable(null);
    setModalMode('create');
    setShowCreateModal(true);
  };

  const handleModalSave = async (data: Partial<Responsable>) => {
    try {
      if (modalMode === 'edit' && selectedResponsable) {
        const response = await apiClient.updateResponsable(selectedResponsable.id, data);
        if (!response.ok) {
          throw new Error(response.error || 'Error al actualizar responsable');
        }
      } else if (modalMode === 'create') {
        const response = await apiClient.createResponsable(data as Omit<Responsable, 'id' | 'fechaCreacion' | 'estadisticas'>);
        if (!response.ok) {
          throw new Error(response.error || 'Error al crear responsable');
        }
      }
      await refetch();
    } catch (error) {
      console.error('Error saving responsable:', error);
      throw error;
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setSelectedResponsable(null);
  };

  // Estadísticas de resumen
  const resumenStats = {
    total: responsables.length,
    activos: responsables.filter(r => r.estado === 'activo').length,
    inactivos: responsables.filter(r => r.estado === 'inactivo').length,
    espaciosAsignados: responsables.reduce((acc, r) => acc + r.espaciosAsignados.length, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader 
        title="Gestión de Responsables"
        breadcrumbs={[
          { label: 'Responsables', href: '/responsables' }
        ]}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Description and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-gray-600">
              Administra responsables de áreas y asignación de espacios
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </div>
          <Button variant="primary" onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Responsable
          </Button>
        </div>

      {/* Estadísticas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{resumenStats.total}</h3>
              <p className="text-sm text-gray-600">Total Responsables</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{resumenStats.activos}</h3>
              <p className="text-sm text-gray-600">Activos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{resumenStats.inactivos}</h3>
              <p className="text-sm text-gray-600">Inactivos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{resumenStats.espaciosAsignados}</h3>
              <p className="text-sm text-gray-600">Espacios Asignados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                label=""
                type="text"
                placeholder="Buscar por nombre, email o departamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <select
              value={selectedDepartamento}
              onChange={(e) => setSelectedDepartamento(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Filtrar por departamento"
            >
              {departamentos.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Filtrar por estado"
            >
              {estados.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid de responsables */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gray-200 w-12 h-12 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResponsables.map((responsable) => (
            <ResponsableCard
              key={responsable.id}
              responsable={responsable}
              onView={handleView}
              onEdit={handleEdit}
              onToggleEstado={handleToggleEstado}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {!loading && filteredResponsables.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron responsables
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedDepartamento || selectedEstado
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza agregando tu primer responsable'}
          </p>
          <Button variant="primary" onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Responsable
          </Button>
        </div>
      )}
      
      {/* Modal de gestión */}
      <ResponsableModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSave={handleModalSave}
        responsable={selectedResponsable}
        espacios={espacios.map(e => ({ id: e.id, nombre: e.nombre, zona: e.zona }))}
        mode={modalMode}
      />
      </div>
    </div>
  );
}