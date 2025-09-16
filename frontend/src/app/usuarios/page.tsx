'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Shield,
  Mail,
  Phone,
  MapPin,
  Settings,
  Eye,
  Edit,
  MoreVertical,
  UserCheck,
  UserX,
  Crown
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge, 
  Alert 
} from '@/components/ui/components';

// Datos simulados para usuarios
const usuariosSimulados = [
  {
    id: '1',
    nombre: 'Dr. Juan Pérez',
    email: 'juan.perez@hospital.com',
    telefono: '+34 612 345 678',
    rol: 'medico',
    especialidad: 'Cardiología',
    estado: 'activo',
    ultimo_acceso: '2024-01-15T10:30:00Z',
    fecha_creacion: '2023-01-15T00:00:00Z'
  },
  {
    id: '2',
    nombre: 'Dra. María García',
    email: 'maria.garcia@hospital.com',
    telefono: '+34 612 345 679',
    rol: 'medico',
    especialidad: 'Neurología',
    estado: 'activo',
    ultimo_acceso: '2024-01-15T09:15:00Z',
    fecha_creacion: '2023-02-10T00:00:00Z'
  },
  {
    id: '3',
    nombre: 'Ana López',
    email: 'ana.lopez@hospital.com',
    telefono: '+34 612 345 680',
    rol: 'enfermero',
    especialidad: 'UCI',
    estado: 'activo',
    ultimo_acceso: '2024-01-15T08:45:00Z',
    fecha_creacion: '2023-03-05T00:00:00Z'
  },
  {
    id: '4',
    nombre: 'Carlos Ruiz',
    email: 'carlos.ruiz@hospital.com',
    telefono: '+34 612 345 681',
    rol: 'administrador',
    especialidad: 'Sistemas',
    estado: 'activo',
    ultimo_acceso: '2024-01-15T11:00:00Z',
    fecha_creacion: '2023-01-01T00:00:00Z'
  },
  {
    id: '5',
    nombre: 'Luis Martín',
    email: 'luis.martin@hospital.com',
    telefono: '+34 612 345 682',
    rol: 'tecnico',
    especialidad: 'Mantenimiento',
    estado: 'inactivo',
    ultimo_acceso: '2024-01-10T16:30:00Z',
    fecha_creacion: '2023-06-15T00:00:00Z'
  }
];

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRol, setSelectedRol] = useState<string>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [usuarios] = useState(usuariosSimulados);

  // Filtrar usuarios
  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.especialidad?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRol = !selectedRol || usuario.rol === selectedRol;
    const matchesEstado = !selectedEstado || usuario.estado === selectedEstado;
    
    return matchesSearch && matchesRol && matchesEstado;
  });

  const rolesDisponibles = [
    { value: '', label: 'Todos los roles' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'medico', label: 'Médico' },
    { value: 'enfermero', label: 'Enfermero' },
    { value: 'tecnico', label: 'Técnico' }
  ];

  const estadosDisponibles = [
    { value: '', label: 'Todos los estados' },
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
    { value: 'bloqueado', label: 'Bloqueado' }
  ];

  const getRolVariant = (rol: string) => {
    switch (rol) {
      case 'administrador': return 'urgente';
      case 'medico': return 'disponible';
      case 'enfermero': return 'ocupado';
      case 'tecnico': return 'mantenimiento';
      default: return 'reservado';
    }
  };

  const getEstadoVariant = (estado: string) => {
    switch (estado) {
      case 'activo': return 'disponible';
      case 'inactivo': return 'mantenimiento';
      case 'bloqueado': return 'urgente';
      default: return 'reservado';
    }
  };

  const getRolIcon = (rol: string) => {
    switch (rol) {
      case 'administrador': return Crown;
      case 'medico': return UserCheck;
      case 'enfermero': return User;
      case 'tecnico': return Settings;
      default: return User;
    }
  };

  const formatFecha = (fechaString: string) => {
    return new Date(fechaString).toLocaleDateString('es-ES');
  };

  const formatUltimoAcceso = (fechaString: string) => {
    const fecha = new Date(fechaString);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    
    if (horas < 1) return 'Hace menos de 1 hora';
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    const dias = Math.floor(horas / 24);
    return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRol('');
    setSelectedEstado('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Administra los usuarios y sus permisos en el sistema
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary">
            <Shield className="h-4 w-4 mr-2" />
            Permisos
          </Button>
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Alerta informativa */}
      <Alert
        type="info"
        title="Modo simulado"
        message="Los datos mostrados son simulados para demostración."
      />

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedRol}
              onChange={(e) => setSelectedRol(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Filtrar por rol"
            >
              {rolesDisponibles.map(rol => (
                <option key={rol.value} value={rol.value}>
                  {rol.label}
                </option>
              ))}
            </select>

            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Filtrar por estado"
            >
              {estadosDisponibles.map(estado => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>

            <Button variant="secondary" onClick={clearFilters}>
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{usuarios.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {usuarios.filter(u => u.estado === 'activo').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <Crown className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-purple-600">
                {usuarios.filter(u => u.rol === 'administrador').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <UserX className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Inactivos</p>
              <p className="text-2xl font-bold text-red-600">
                {usuarios.filter(u => u.estado === 'inactivo').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Usuarios ({filteredUsuarios.length})
            </h2>
            <div className="flex items-center space-x-2">
              <Badge variant="disponible" size="sm">
                {filteredUsuarios.filter(u => u.estado === 'activo').length} activos
              </Badge>
              <Badge variant="mantenimiento" size="sm">
                {filteredUsuarios.filter(u => u.estado === 'inactivo').length} inactivos
              </Badge>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredUsuarios.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedRol || selectedEstado
                  ? 'No se encontraron usuarios con los filtros seleccionados.'
                  : 'Comienza agregando tu primer usuario.'}
              </p>
              <div className="mt-6">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
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
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Acceso
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsuarios.map((usuario) => {
                  const RolIcon = getRolIcon(usuario.rol);
                  
                  return (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <RolIcon className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {usuario.nombre}
                            </div>
                            <div className="text-sm text-gray-500">
                              {usuario.especialidad}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Mail className="h-3 w-3 text-gray-400 mr-1" />
                            {usuario.email}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 text-gray-400 mr-1" />
                            {usuario.telefono}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getRolVariant(usuario.rol)}>
                          {usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getEstadoVariant(usuario.estado)}>
                          {usuario.estado.charAt(0).toUpperCase() + usuario.estado.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatUltimoAcceso(usuario.ultimo_acceso)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Creado: {formatFecha(usuario.fecha_creacion)}
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
                          <Button variant="secondary" size="sm">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
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

      {/* Tarjetas de usuario (vista alternativa) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsuarios.slice(0, 6).map((usuario) => {
          const RolIcon = getRolIcon(usuario.rol);
          
          return (
            <div
              key={`card-${usuario.id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <RolIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {usuario.nombre}
                      </h3>
                      <p className="text-sm text-gray-600">{usuario.especialidad}</p>
                    </div>
                  </div>
                  <Badge variant={getEstadoVariant(usuario.estado)} size="sm">
                    {usuario.estado}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {usuario.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {usuario.telefono}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <RolIcon className="h-4 w-4 mr-2" />
                    <Badge variant={getRolVariant(usuario.rol)} size="sm">
                      {usuario.rol}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Último acceso: {formatUltimoAcceso(usuario.ultimo_acceso)}
                </div>

                <div className="flex justify-between">
                  <Button variant="secondary" size="sm">
                    <Eye className="h-3 w-3 mr-1" />
                    Ver Perfil
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}