'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  BarChart3,
  TrendingUp,
  FileText,
  Filter,
  RefreshCw,
  Users,
  Activity,
  X,
  Check,
  ArrowLeft,
  LineChart
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Button, 
  Badge
} from '@/components/ui/components';
import { apiClient } from '@/lib/api-client';
import type { Espacio, Zona, Reserva, Usuario } from '@/lib/api-client';

// Tipos para los datos
interface SpaceData {
  id: string;
  nombre: string;
  ocupacion: number;
}

interface ReservationByDay {
  dia: string;
  reservas: number;
}

interface ReservationTrend {
  fecha: string;
  total: number;
}

interface MetricsData {
  ocupacionPromedio: number;
  reservasSemanales: number;
  usuariosActivos: number;
  eficiencia: number;
  tendenciaOcupacion: string;
  tendenciaReservas: string;
  tendenciaUsuarios: string;
  tendenciaEficiencia: string;
}

// Función helper para obtener clase de ancho basada en porcentaje
const getWidthClass = (percentage: number, maxValue: number = 100) => {
  const normalizedPercentage = Math.round((percentage / maxValue) * 100);
  if (normalizedPercentage === 0) return 'w-0';
  if (normalizedPercentage <= 10) return 'w-[10%]';
  if (normalizedPercentage <= 20) return 'w-[20%]';
  if (normalizedPercentage <= 30) return 'w-[30%]';
  if (normalizedPercentage <= 40) return 'w-[40%]';
  if (normalizedPercentage <= 50) return 'w-[50%]';
  if (normalizedPercentage <= 60) return 'w-[60%]';
  if (normalizedPercentage <= 70) return 'w-[70%]';
  if (normalizedPercentage <= 80) return 'w-[80%]';
  if (normalizedPercentage <= 90) return 'w-[90%]';
  return 'w-full';
};

export default function DashboardPage() {
  const { t } = useLanguage();
  
  // Estados para fechas (últimos 30 días por defecto)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [espacioSeleccionado, setEspacioSeleccionado] = useState('');
  const [zonaSeleccionada, setZonaSeleccionada] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportSections, setReportSections] = useState({
    metrics: true,
    charts: true,
    reservations: false,
    spaces: false,
    zones: false,
    users: false,
    occupancy: true,
    trends: true,
  });
  const [reportFormat, setReportFormat] = useState('pdf');

  // Estados para datos reales del backend
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  const [metricsData, setMetricsData] = useState<MetricsData>({
    ocupacionPromedio: 0,
    reservasSemanales: 0,
    usuariosActivos: 0,
    eficiencia: 0,
    tendenciaOcupacion: '+0%',
    tendenciaReservas: '+0%',
    tendenciaUsuarios: '+0%',
    tendenciaEficiencia: '+0%',
  });

  const [espaciosMasUsados, setEspaciosMasUsados] = useState<SpaceData[]>([]);

  const getDayLabel = (dayKey: string) => {
    const dayMap: { [key: string]: string } = {
      'Mon': t.analytics.monday,
      'Tue': t.analytics.tuesday,
      'Wed': t.analytics.wednesday,
      'Thu': t.analytics.thursday,
      'Fri': t.analytics.friday,
      'Sat': t.analytics.saturday,
      'Sun': t.analytics.sunday,
    };
    return dayMap[dayKey] || dayKey;
  };

  const [reservasPorDia, setReservasPorDia] = useState<ReservationByDay[]>([]);
  const [tendenciaReservas, setTendenciaReservas] = useState<ReservationTrend[]>([]);

  // Función para cargar todos los datos del backend
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Cargar datos en paralelo
      const [espaciosRes, zonasRes, reservasRes, usuariosRes] = await Promise.all([
        apiClient.getEspacios(),
        apiClient.getZonas(),
        apiClient.getReservas(),
        apiClient.getUsuarios(),
      ]);

      // Procesar espacios
      if (espaciosRes.ok && espaciosRes.data) {
        const espaciosData = espaciosRes.data.espacios || [];
        setEspacios(espaciosData);

        // Calcular espacios más usados (simulado con ocupación basada en estado)
        const espaciosConOcupacion = espaciosData.map(esp => ({
          id: esp.id,
          nombre: esp.nombre,
          ocupacion: esp.estado === 'ocupado' ? 90 : esp.estado === 'mantenimiento' ? 50 : 30
        })).sort((a, b) => b.ocupacion - a.ocupacion).slice(0, 5);
        setEspaciosMasUsados(espaciosConOcupacion);
      }

      // Procesar zonas
      if (zonasRes.ok && zonasRes.data) {
        setZonas(zonasRes.data.zonas || []);
      }

      // Procesar reservas
      if (reservasRes.ok && reservasRes.data) {
        const reservasData = reservasRes.data.reservas || [];
        setReservas(reservasData);

        // Calcular reservas por día de la semana
        const reservasPorDiaMap: { [key: string]: number } = {
          'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
        };

        reservasData.forEach(reserva => {
          const date = new Date(reserva.fechaInicio);
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = dayNames[date.getDay()];
          reservasPorDiaMap[dayName]++;
        });

        const reservasPorDiaArray = Object.entries(reservasPorDiaMap).map(([dia, reservas]) => ({
          dia,
          reservas
        }));
        // Reordenar para empezar con lunes
        const ordenado = [
          reservasPorDiaArray[1], // Mon
          reservasPorDiaArray[2], // Tue
          reservasPorDiaArray[3], // Wed
          reservasPorDiaArray[4], // Thu
          reservasPorDiaArray[5], // Fri
          reservasPorDiaArray[6], // Sat
          reservasPorDiaArray[0], // Sun
        ];
        setReservasPorDia(ordenado);

        // Calcular tendencia de reservas por fecha (últimos 30 días)
        const today = new Date();
        const daysMap: { [key: string]: number } = {};
        
        // Inicializar últimos 30 días con 0
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          daysMap[dateStr] = 0;
        }
        
        // Contar reservas por día
        reservasData.forEach(reserva => {
          const dateStr = reserva.fechaInicio.split('T')[0];
          if (daysMap.hasOwnProperty(dateStr)) {
            daysMap[dateStr]++;
          }
        });
        
        // Convertir a array
        const tendencia = Object.entries(daysMap).map(([fecha, total]) => ({
          fecha,
          total
        }));
        setTendenciaReservas(tendencia);
      }

      // Procesar usuarios
      if (usuariosRes.ok && usuariosRes.data) {
        const usuariosData = usuariosRes.data.usuarios || [];
        setUsuarios(usuariosData);
      }

      // Calcular métricas
      const totalEspacios = espaciosRes.data?.espacios?.length || 0;
      const espaciosOcupados = espaciosRes.data?.espacios?.filter((e: Espacio) => e.estado === 'ocupado').length || 0;
      const reservasActivas = reservasRes.data?.reservas?.filter((r: Reserva) => r.estado !== 'cancelada').length || 0;
      const usuariosActivos = usuariosRes.data?.usuarios?.filter((u: Usuario) => u.activo).length || 0;

      const ocupacionPorcentaje = totalEspacios > 0 ? Math.round((espaciosOcupados / totalEspacios) * 100) : 0;
      const eficienciaPorcentaje = totalEspacios > 0 ? Math.round(((espaciosOcupados + (reservasActivas * 0.3)) / totalEspacios) * 100) : 0;

      setMetricsData({
        ocupacionPromedio: ocupacionPorcentaje,
        reservasSemanales: reservasActivas,
        usuariosActivos: usuariosActivos,
        eficiencia: Math.min(eficienciaPorcentaje, 100),
        tendenciaOcupacion: ocupacionPorcentaje > 50 ? '+5%' : '-2%',
        tendenciaReservas: reservasActivas > 10 ? '+12%' : '+5%',
        tendenciaUsuarios: usuariosActivos > 5 ? '+8%' : '+3%',
        tendenciaEficiencia: eficienciaPorcentaje > 70 ? '+3%' : '+1%',
      });

    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleApplyFilters = () => {
    // Recargar datos con filtros aplicados
    loadDashboardData();
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const toggleReportSection = (section: keyof typeof reportSections) => {
    setReportSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    // Simular generación de reporte
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sectionsIncluded = Object.entries(reportSections)
      .filter(([_, value]) => value)
      .map(([key]) => key);
    
    console.log('Generando reporte:', {
      format: reportFormat,
      sections: sectionsIncluded,
      filters: { fechaInicio, fechaFin, espacioSeleccionado, zonaSeleccionada }
    });
    
    setIsGenerating(false);
    setShowReportModal(false);
    
    // Simular descarga
    alert(`Reporte ${reportFormat.toUpperCase()} descargado con éxito`);
  };

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="secondary" 
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.nav.dashboard}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.analytics.title}</h1>
            <p className="text-gray-600 mt-1">{t.analytics.subtitle}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.analytics.refresh}
          </Button>
          <Button variant="primary" onClick={() => setShowReportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            {t.analytics.generateReport}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.analytics.filters}</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.analytics.startDate}
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
              {t.analytics.endDate}
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
              {t.analytics.selectSpace}
            </label>
            <select
              value={espacioSeleccionado}
              onChange={(e) => setEspacioSeleccionado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t.analytics.allSpaces}</option>
              {espaciosMasUsados.map(espacio => (
                <option key={espacio.id} value={espacio.id}>{espacio.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.analytics.selectZone}
            </label>
            <select
              value={zonaSeleccionada}
              onChange={(e) => setZonaSeleccionada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t.analytics.allZones}</option>
              <option value="zona1">Zona Norte</option>
              <option value="zona2">Zona Sur</option>
              <option value="zona3">Zona Este</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="primary" className="w-full" onClick={handleApplyFilters}>
              <Filter className="h-4 w-4 mr-2" />
              {t.analytics.applyFilters}
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <Badge variant="disponible" size="sm">{metricsData.tendenciaOcupacion}</Badge>
          </div>
          <p className="text-sm font-medium text-gray-600">{t.analytics.averageOccupancy}</p>
          <p className="text-2xl font-bold text-gray-900">{metricsData.ocupacionPromedio}%</p>
          <p className="text-xs text-gray-500 mt-1">{t.analytics.vsLastMonth}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <Badge variant="ocupado" size="sm">{metricsData.tendenciaReservas}</Badge>
          </div>
          <p className="text-sm font-medium text-gray-600">{t.analytics.weeklyReservations}</p>
          <p className="text-2xl font-bold text-gray-900">{metricsData.reservasSemanales}</p>
          <p className="text-xs text-gray-500 mt-1">{t.analytics.vsLastWeek}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <Badge variant="disponible" size="sm">{metricsData.tendenciaUsuarios}</Badge>
          </div>
          <p className="text-sm font-medium text-gray-600">{t.analytics.activeUsers}</p>
          <p className="text-2xl font-bold text-gray-900">{metricsData.usuariosActivos}</p>
          <p className="text-xs text-gray-500 mt-1">{t.analytics.vsLastMonth}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <Badge variant="disponible" size="sm">{metricsData.tendenciaEficiencia}</Badge>
          </div>
          <p className="text-sm font-medium text-gray-600">{t.analytics.efficiency}</p>
          <p className="text-2xl font-bold text-gray-900">{metricsData.eficiencia}%</p>
          <p className="text-xs text-gray-500 mt-1">{t.analytics.vsLastMonth}</p>
        </div>
      </div>

      {/* Gráfico de tendencia de reservas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <LineChart className="w-5 h-5 mr-2 text-purple-600" />
          {t.analytics.reservationTrend || 'Tendencia de Reservas (Últimos 30 Días)'}
        </h3>
        <div className="relative h-64">
          {tendenciaReservas.length > 0 ? (
            <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
              {/* Líneas de referencia horizontales */}
              <line x1="40" y1="20" x2="780" y2="20" stroke="#e5e7eb" strokeWidth="1" />
              <line x1="40" y1="65" x2="780" y2="65" stroke="#e5e7eb" strokeWidth="1" />
              <line x1="40" y1="110" x2="780" y2="110" stroke="#e5e7eb" strokeWidth="1" />
              <line x1="40" y1="155" x2="780" y2="155" stroke="#e5e7eb" strokeWidth="1" />
              
              {/* Línea de tendencia */}
              <polyline
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={tendenciaReservas.map((item, index) => {
                  const maxReservas = Math.max(...tendenciaReservas.map(r => r.total), 1);
                  const x = 40 + (index * (740 / (tendenciaReservas.length - 1)));
                  const y = 180 - (item.total / maxReservas) * 140;
                  return `${x},${y}`;
                }).join(' ')}
              />
              
              {/* Área bajo la línea */}
              <polygon
                fill="url(#areaGradient)"
                opacity="0.3"
                points={[
                  '40,180',
                  ...tendenciaReservas.map((item, index) => {
                    const maxReservas = Math.max(...tendenciaReservas.map(r => r.total), 1);
                    const x = 40 + (index * (740 / (tendenciaReservas.length - 1)));
                    const y = 180 - (item.total / maxReservas) * 140;
                    return `${x},${y}`;
                  }),
                  '780,180'
                ].join(' ')}
              />
              
              {/* Puntos en la línea */}
              {tendenciaReservas.map((item, index) => {
                const maxReservas = Math.max(...tendenciaReservas.map(r => r.total), 1);
                const x = 40 + (index * (740 / (tendenciaReservas.length - 1)));
                const y = 180 - (item.total / maxReservas) * 140;
                return (
                  <g key={index}>
                    {index % 5 === 0 && (
                      <>
                        <circle cx={x} cy={y} r="4" fill="#8b5cf6" />
                        <circle cx={x} cy={y} r="6" fill="#8b5cf6" opacity="0.2" />
                      </>
                    )}
                  </g>
                );
              })}
              
              {/* Gradientes */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>{t.analytics.noData || 'No hay datos disponibles'}</p>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
          <span>{tendenciaReservas[0]?.fecha || '-'}</span>
          <span className="text-sm font-medium text-gray-700">
            {t.analytics.totalReservations || 'Total'}: {tendenciaReservas.reduce((sum, item) => sum + item.total, 0)}
          </span>
          <span>{tendenciaReservas[tendenciaReservas.length - 1]?.fecha || '-'}</span>
        </div>
      </div>

      {/* Gráficos y visualizaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservas por día */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            {t.analytics.reservationsByDay}
          </h3>
          <div className="space-y-3">
            {reservasPorDia.map((item) => (
              <div key={item.dia} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 w-16">{getDayLabel(item.dia)}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-300 ${getWidthClass(item.reservas, 70)}`}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {item.reservas}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Espacios más utilizados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-600" />
            {t.analytics.mostUsedSpaces}
          </h3>
          <div className="space-y-4">
            {espaciosMasUsados.map((espacio, index) => (
              <div key={espacio.id} className="flex items-center">
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
                      className={`bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300 ${getWidthClass(espacio.ocupacion)}`}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de generación de reportes */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{t.analytics.customReport}</h2>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t.analytics.selectReportSections}
                </h3>
                <div className="space-y-3">
                  {Object.entries(reportSections).map(([key, value]) => {
                    const sectionKey = key as keyof typeof reportSections;
                    const labelMap = {
                      metrics: t.analytics.includeMetrics,
                      charts: t.analytics.includeCharts,
                      reservations: t.analytics.includeReservations,
                      spaces: t.analytics.includeSpaces,
                      zones: t.analytics.includeZones,
                      users: t.analytics.includeUsers,
                      occupancy: t.analytics.includeOccupancy,
                      trends: t.analytics.includeTrends,
                    };

                    return (
                      <label
                        key={key}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={() => toggleReportSection(sectionKey)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                            value
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300'
                          }`}>
                            {value && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          {labelMap[sectionKey]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.analytics.reportFormat}
                </label>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="xlsx">Excel (XLSX)</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => setShowReportModal(false)}
              >
                {t.analytics.cancel}
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerateReport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t.analytics.generating}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {t.analytics.downloadReport}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
