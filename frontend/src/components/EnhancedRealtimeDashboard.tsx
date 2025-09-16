// Dashboard de Gestión de Espacios - Tiempo Real
// Sistema empresarial con capacidades WebSocket

'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Users, BarChart3, Clock, Building2, AlertTriangle } from 'lucide-react';

// Interfaces para el sistema de espacios
interface EspacioData {
  id: string;
  nombre: string;
  zona: string;
  capacidad: number;
  estado: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado';
  proximaReserva?: string;
  usuarioActual?: string;
}

interface SystemMetrics {
  espaciosDisponibles: number;
  espaciosOcupados: number;
  reservasHoy: number;
  usuariosActivos: number;
  porcentajeOcupacion: number;
}

export default function EnhancedRealtimeDashboard() {
  const [espacios, setEspacios] = useState<EspacioData[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    espaciosDisponibles: 0,
    espaciosOcupados: 0,
    reservasHoy: 0,
    usuariosActivos: 0,
    porcentajeOcupacion: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Simulación de datos en tiempo real
  useEffect(() => {
    const mockEspacios: EspacioData[] = [
      {
        id: '1',
        nombre: 'Sala de Reuniones A',
        zona: 'Piso 1 - Norte',
        capacidad: 8,
        estado: 'ocupado',
        proximaReserva: '14:30',
        usuarioActual: 'Juan Pérez'
      },
      {
        id: '2', 
        nombre: 'Oficina 201',
        zona: 'Piso 2',
        capacidad: 4,
        estado: 'disponible'
      },
      {
        id: '3',
        nombre: 'Aula Magna',
        zona: 'Planta Baja',
        capacidad: 50,
        estado: 'reservado',
        proximaReserva: '15:00'
      },
      {
        id: '4',
        nombre: 'Lab. Computación',
        zona: 'Piso 3',
        capacidad: 20,
        estado: 'mantenimiento'
      }
    ];

    setEspacios(mockEspacios);
    
    const disponibles = mockEspacios.filter(e => e.estado === 'disponible').length;
    const ocupados = mockEspacios.filter(e => e.estado === 'ocupado').length;
    
    setMetrics({
      espaciosDisponibles: disponibles,
      espaciosOcupados: ocupados,
      reservasHoy: 12,
      usuariosActivos: 24,
      porcentajeOcupacion: Math.round((ocupados / mockEspacios.length) * 100)
    });

    setIsConnected(true);
    setLastUpdate(new Date());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Espacios</h1>
            <p className="text-gray-600 mt-2">Gestión en tiempo real de espacios y reservas</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Espacios Disponibles</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.espaciosDisponibles}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <MapPin className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Espacios Ocupados</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.espaciosOcupados}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 text-red-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reservas Hoy</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.reservasHoy}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.usuariosActivos}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">% Ocupación</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.porcentajeOcupacion}%</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Estado de espacios */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Estado de Espacios</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Ver todos los espacios
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {espacios.map((espacio) => (
            <div key={espacio.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{espacio.nombre}</h3>
                  <p className="text-sm text-gray-500">{espacio.zona}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                  espacio.estado === 'disponible' ? 'bg-green-100 text-green-800 border-green-200' :
                  espacio.estado === 'ocupado' ? 'bg-red-100 text-red-800 border-red-200' :
                  espacio.estado === 'mantenimiento' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  'bg-purple-100 text-purple-800 border-purple-200'
                }`}>
                  {espacio.estado.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Capacidad: {espacio.capacidad} personas</span>
                </div>
                {espacio.usuarioActual && (
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>En uso: {espacio.usuarioActual}</span>
                  </div>
                )}
                {espacio.proximaReserva && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Próxima: {espacio.proximaReserva}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas del sistema */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas del Sistema</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-3" />
            <div>
              <p className="font-medium text-amber-800">Lab. Computación en mantenimiento</p>
              <p className="text-sm text-amber-600">Equipo técnico trabajando - estimado 2 horas</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-blue-800">Pico de reservas detectado</p>
              <p className="text-sm text-blue-600">15:00-17:00 - Mayor demanda de espacios</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}