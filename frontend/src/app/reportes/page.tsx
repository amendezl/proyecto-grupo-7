'use client';

import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  Filter,
  RefreshCw,
  Users,
  MapPin,
  Clock,
  Activity
} from 'lucide-react';
import { 
  Button, 
  Badge, 
  Alert 
} from '@/components/ui/components';

// Datos simulados para reportes
const reportesDisponibles = [
  {
    id: 'ocupacion',
    nombre: 'Reporte de Ocupación',
    descripcion: 'Análisis de ocupación de espacios por período',
    icono: BarChart3,
    tipo: 'estadistico',
    ultimaGeneracion: '2024-01-15T10:00:00Z',
    tamaño: '2.3 MB'
  },
  {
    id: 'usuarios',
    nombre: 'Reporte de Usuarios',
    descripcion: 'Estadísticas de usuarios y accesos',
    icono: Users,
    tipo: 'usuarios',
    ultimaGeneracion: '2024-01-15T09:30:00Z',
    tamaño: '1.8 MB'
  },
  {
    id: 'reservas',
    nombre: 'Reporte de Reservas',
    descripcion: 'Análisis de reservas y patrones de uso',
    icono: Calendar,
    tipo: 'reservas',
    ultimaGeneracion: '2024-01-15T08:45:00Z',
    tamaño: '3.1 MB'
  },
  {
    id: 'eficiencia',
    nombre: 'Reporte de Eficiencia',
    descripcion: 'Métricas de eficiencia y utilización',
    icono: TrendingUp,
    tipo: 'eficiencia',
    ultimaGeneracion: '2024-01-15T07:15:00Z',
    tamaño: '1.5 MB'
  }
];

const metricsData = {
  ocupacionPromedio: 67,
  espaciosMasUsados: [
    { nombre: 'Quirófano 1', ocupacion: 89 },
    { nombre: 'Sala de Reuniones A', ocupacion: 76 },
    { nombre: 'Laboratorio 2', ocupacion: 71 }
  ],
  reservasPorDia: [
    { dia: 'Lun', reservas: 45 },
    { dia: 'Mar', reservas: 52 },
    { dia: 'Mié', reservas: 38 },
    { dia: 'Jue', reservas: 61 },
    { dia: 'Vie', reservas: 47 },
    { dia: 'Sáb', reservas: 23 },
    { dia: 'Dom', reservas: 18 }
  ],
  tendencias: {
    reservasSemanales: '+12%',
    ocupacionGeneral: '+5%',
    usuariosActivos: '+8%',
    eficienciaEspacios: '+3%'
  }
};

export default function ReportesPage() {
  const [fechaInicio, setFechaInicio] = useState('2024-01-01');
  const [fechaFin, setFechaFin] = useState('2024-01-31');
  const [tipoReporte, setTipoReporte] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const tiposReporte = [
    { value: '', label: 'Todos los reportes' },
    { value: 'estadistico', label: 'Estadísticos' },
    { value: 'usuarios', label: 'Usuarios' },
    { value: 'reservas', label: 'Reservas' },
    { value: 'eficiencia', label: 'Eficiencia' }
  ];

  const filteredReportes = reportesDisponibles.filter(reporte =>
    !tipoReporte || reporte.tipo === tipoReporte
  );

  const handleGenerarReporte = async (reporteId: string) => {
    setIsGenerating(true);
    // Simular generación de reporte
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    
    // Simular descarga
    const filename = `reporte_${reporteId}_${new Date().toISOString().split('T')[0]}.pdf`;
    console.log(`Descargando: ${filename}`);
  };

  const formatFecha = (fechaString: string) => {
    return new Date(fechaString).toLocaleDateString('es-ES');
  };

  const formatTamaño = (tamaño: string) => {
    return tamaño;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-600 mt-1">
            Genera reportes detallados y analiza el rendimiento del sistema
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="primary" disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Generando...' : 'Exportar Todo'}
          </Button>
        </div>
      </div>

      {/* Alerta informativa */}
      <Alert
        type="info"
        title="Reportes simulados"
        message="Los datos mostrados son simulados para demostración del sistema."
      />

      {/* Filtros de período */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Reportes</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Reporte
            </label>
            <select
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {tiposReporte.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="primary" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ocupación Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{metricsData.ocupacionPromedio}%</p>
              <p className="text-sm text-green-600">{metricsData.tendencias.ocupacionGeneral} vs mes anterior</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Reservas Semanales</p>
              <p className="text-2xl font-bold text-gray-900">284</p>
              <p className="text-sm text-green-600">{metricsData.tendencias.reservasSemanales} vs semana anterior</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-sm text-green-600">{metricsData.tendencias.usuariosActivos} vs mes anterior</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eficiencia</p>
              <p className="text-2xl font-bold text-gray-900">92%</p>
              <p className="text-sm text-green-600">{metricsData.tendencias.eficienciaEspacios} vs mes anterior</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y visualizaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservas por día */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservas por Día de la Semana</h3>
          <div className="space-y-3">
            {metricsData.reservasPorDia.map((item, index) => (
              <div key={item.dia} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 w-12">{item.dia}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(item.reservas / 70) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {item.reservas}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Espacios más utilizados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Espacios Más Utilizados</h3>
          <div className="space-y-4">
            {metricsData.espaciosMasUsados.map((espacio, index) => (
              <div key={espacio.nombre} className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mr-3">
                  <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{espacio.nombre}</span>
                    <span className="text-sm text-gray-600">{espacio.ocupacion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${espacio.ocupacion}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de reportes disponibles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reportes Disponibles</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReportes.map((reporte) => {
              const IconComponent = reporte.icono;
              
              return (
                <div
                  key={reporte.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {reporte.nombre}
                        </h3>
                        <p className="text-sm text-gray-600">{reporte.descripcion}</p>
                      </div>
                    </div>
                    <Badge variant="mantenimiento" size="sm">
                      {reporte.tipo}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatFecha(reporte.ultimaGeneracion)}
                      </span>
                      <span className="flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        {formatTamaño(reporte.tamaño)}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleGenerarReporte(reporte.id)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3 mr-1" />
                      )}
                      {isGenerating ? 'Generando...' : 'Descargar'}
                    </Button>
                    <Button variant="secondary" size="sm">
                      <Activity className="h-3 w-3 mr-1" />
                      Vista Previa
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Programación de reportes automáticos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reportes Programados</h2>
        </div>
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <h3 className="text-sm font-medium text-gray-900">Programación Automática</h3>
            <p className="text-sm text-gray-500 mb-4">
              Configura reportes automáticos que se generen periódicamente
            </p>
            <Button variant="primary" size="sm">
              Configurar Programación
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}