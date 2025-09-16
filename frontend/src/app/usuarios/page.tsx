'use client';

import { useState, useMemo } from 'react';
import { useUsuarios } from '@/hooks/useApi';
import { Button, Input, Badge, MetricCard } from '@/components/ui/components';
import { Card } from '@/components/ui/Card';
import { Users, UserPlus, Search, Filter, User2, Shield, UserCheck, UserX } from 'lucide-react';
import { Usuario } from '@/lib/api-client';

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('');

  const filters = useMemo(() => {
    const f: any = {};
    if (filtroRol) f.rol = filtroRol;
    if (filtroEstado !== '') f.activo = filtroEstado === 'activo';
    if (filtroDepartamento) f.departamento = filtroDepartamento;
    return f;
  }, [filtroRol, filtroEstado, filtroDepartamento]);

  const { usuarios, loading, error, total, refetch } = useUsuarios(filters);

  const usuariosFiltrados = useMemo(() => {
    if (!searchTerm) return usuarios;
    
    return usuarios.filter(usuario =>
      usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.departamento.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [usuarios, searchTerm]);

  // Estadísticas calculadas
  const estadisticas = useMemo(() => {
    const activos = usuarios.filter(u => u.activo).length;
    const inactivos = usuarios.filter(u => !u.activo).length;
    const admins = usuarios.filter(u => u.rol === 'admin').length;
    const staff = usuarios.filter(u => u.rol === 'staff').length;
    
    return { activos, inactivos, admins, staff };
  }, [usuarios]);

  const departamentos = useMemo(() => {
    const depts = [...new Set(usuarios.map(u => u.departamento))];
    return depts.sort();
  }, [usuarios]);

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'urgente';
      case 'staff':
        return 'reservado';
      case 'usuario':
        return 'disponible';
      default:
        return 'mantenimiento';
    }
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>
        <Button variant="primary">
          <UserPlus className="w-4 h-4 mr-2" />
          Crear Usuario
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Usuarios"
          value={total.toString()}
          icon={Users}
          className="border-l-4 border-l-blue-500"
        />
        
        <MetricCard
          title="Usuarios Activos"
          value={estadisticas.activos.toString()}
          icon={UserCheck}
          trend={{ direction: "up", percentage: 5 }}
          className="border-l-4 border-l-green-500"
        />
        
        <MetricCard
          title="Administradores"
          value={estadisticas.admins.toString()}
          icon={Shield}
          className="border-l-4 border-l-red-500"
        />
        
        <MetricCard
          title="Usuarios Inactivos"
          value={estadisticas.inactivos.toString()}
          icon={UserX}
          trend={{ direction: "down", percentage: 3 }}
          className="border-l-4 border-l-orange-500"
        />
      </div>

      {/* Filtros y búsqueda */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filtros y Búsqueda
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="rol-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por rol
            </label>
            <select
              id="rol-filter"
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="staff">Staff</option>
              <option value="usuario">Usuario</option>
            </select>
          </div>

          <div>
            <label htmlFor="estado-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por estado
            </label>
            <select
              id="estado-filter"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>

          <div>
            <label htmlFor="dept-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por departamento
            </label>
            <select
              id="dept-filter"
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los departamentos</option>
              {departamentos.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchTerm || filtroRol || filtroEstado || filtroDepartamento) && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {usuariosFiltrados.length} de {total} usuarios
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm('');
                setFiltroRol('');
                setFiltroEstado('');
                setFiltroDepartamento('');
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      {/* Lista de usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usuariosFiltrados.map((usuario) => (
          <UsuarioCard 
            key={usuario.id}
            usuario={usuario}
            onRefetch={refetch}
            rolColor={getRolColor(usuario.rol)}
          />
        ))}
      </div>

      {usuariosFiltrados.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron usuarios
          </h3>
          <p className="text-gray-600">
            {searchTerm || filtroRol || filtroEstado || filtroDepartamento
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primer usuario'
            }
          </p>
        </Card>
      )}
    </div>
  );
}

// Componente para cada tarjeta de usuario
function UsuarioCard({ 
  usuario, 
  onRefetch, 
  rolColor 
}: { 
  usuario: Usuario;
  onRefetch: () => void;
  rolColor: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado' | 'urgente';
}) {
  const getRolIcon = (rol: string) => {
    switch (rol) {
      case 'admin':
        return Shield;
      case 'staff':
        return UserCheck;
      case 'usuario':
        return User2;
      default:
        return User2;
    }
  };

  const RolIcon = getRolIcon(usuario.rol);

  return (
    <Card className={`p-6 transition-all duration-200 hover:shadow-lg ${
      !usuario.activo ? 'opacity-75 bg-gray-50' : ''
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            usuario.activo ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <RolIcon className={`w-5 h-5 ${
              usuario.activo ? 'text-blue-600' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {usuario.nombre}
            </h3>
            <p className="text-sm text-gray-600">{usuario.email}</p>
          </div>
        </div>
        
        <Button
          variant={usuario.activo ? "danger" : "success"}
          onClick={() => {
            // TODO: Implementar toggle de estado
            console.log('Toggle estado usuario:', usuario.id);
          }}
        >
          {usuario.activo ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Rol:</span>
          <Badge variant={rolColor}>
            {usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Departamento:</span>
          <span className="text-sm font-medium text-gray-900">
            {usuario.departamento}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Estado:</span>
          <Badge variant={usuario.activo ? "disponible" : "mantenimiento"}>
            {usuario.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      </div>
      
      <div className="pt-4 border-t border-gray-100 mt-4">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            // TODO: Implementar modal de edición
            console.log('Editar usuario:', usuario.id);
          }}
        >
          Editar Usuario
        </Button>
      </div>
    </Card>
  );
}