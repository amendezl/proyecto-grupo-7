'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Users, BarChart3, Building2, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';

interface DashboardStats {
  totalEspacios: number;
  totalReservas: number;
  totalUsuarios: number;
  totalResponsables: number;
  totalZonas: number;
  espaciosActivos: number;
  reservasActivas: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalEspacios: 0,
    totalReservas: 0,
    totalUsuarios: 0,
    totalResponsables: 0,
    totalZonas: 0,
    espaciosActivos: 0,
    reservasActivas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar datos desde los diferentes endpoints
      const [espaciosRes, zonasRes, reservasRes, usuariosRes, responsablesRes] = await Promise.all([
        import('@/lib/api-client').then(m => m.apiClient.getEspacios()),
        import('@/lib/api-client').then(m => m.apiClient.getZonas()),
        import('@/lib/api-client').then(m => m.apiClient.getReservas()),
        import('@/lib/api-client').then(m => m.apiClient.getUsuarios()),
        import('@/lib/api-client').then(m => m.apiClient.getResponsables())
      ]);

      const espacios = espaciosRes.ok && espaciosRes.data ? espaciosRes.data.espacios || [] : [];
      const zonas = zonasRes.ok && zonasRes.data ? zonasRes.data.zonas || [] : [];
      const reservas = reservasRes.ok && reservasRes.data ? reservasRes.data.reservas || [] : [];
      const usuarios = usuariosRes.ok && usuariosRes.data ? usuariosRes.data.usuarios || [] : [];
      const responsables = responsablesRes.ok && responsablesRes.data ? responsablesRes.data.responsables || [] : [];

      // Filtrar reservas activas (no canceladas y que no hayan terminado)
      const now = new Date();
      const reservasActivas = reservas.filter((r: any) => {
        if (r.estado === 'cancelada') return false;
        const fechaFin = new Date(r.fechaFin);
        return fechaFin >= now;
      });

      // Calcular espacios ocupados AHORA MISMO (reservas en curso)
      const espaciosOcupadosIds = new Set<string>();
      reservas.forEach((r: any) => {
        if (r.estado === 'cancelada') return;
        const inicio = new Date(r.fechaInicio);
        const fin = new Date(r.fechaFin);
        if (now >= inicio && now <= fin) {
          espaciosOcupadosIds.add(r.espacioId);
        }
      });

      const espaciosOcupados = espaciosOcupadosIds.size;
      const espaciosDisponibles = espacios.filter((e: any) => 
        e.estado === 'disponible' && !espaciosOcupadosIds.has(e.id)
      ).length;

      setStats({
        totalEspacios: espacios.length,
        totalReservas: reservas.length,
        totalUsuarios: usuarios.length,
        totalResponsables: responsables.length,
        totalZonas: zonas.length,
        espaciosActivos: espaciosOcupados, // Ahora representa espacios ocupados
        reservasActivas: reservasActivas.length
      });
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.dashboard.loadingStats}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t.dashboard.welcome}, {user?.nombre || 'Usuario'}
          </h1>
          <p className="text-lg text-gray-600">
            {t.dashboard.welcomeMessage}
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Espacios */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t.nav.spaces}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalEspacios}</p>
                <p className="text-xs text-red-600 mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.espaciosActivos} {t.dashboard.occupiedNow}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-full">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Reservas */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t.nav.reservations}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalReservas}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.reservasActivas} {t.dashboard.active}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-full">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Usuarios */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t.nav.users}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsuarios}</p>
                <p className="text-xs text-gray-500 mt-1">{t.dashboard.registeredUsers}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-full">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Zonas */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t.nav.zones}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalZonas}</p>
                <p className="text-xs text-gray-500 mt-1">{t.dashboard.organizedAreas}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-full">
                <Building2 className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Empty state o Quick actions */}
        {stats.totalEspacios === 0 && stats.totalZonas === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Package className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {t.dashboard.getStarted}
              </h3>
              <p className="text-gray-600 mb-8">
                {t.dashboard.getStartedMessage}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/espacios'}
                  className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer border-2 border-transparent hover:border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-950/70 dark:border-blue-800/50 dark:hover:border-blue-700"
                >
                  <MapPin className="h-6 w-6 text-blue-600 mb-2 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{t.dashboard.createSpaces}</span>
                </button>
                <button
                  onClick={() => window.location.href = '/zonas'}
                  className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer border-2 border-transparent hover:border-purple-200 dark:bg-purple-950/50 dark:hover:bg-purple-950/70 dark:border-purple-800/50 dark:hover:border-purple-700"
                >
                  <Building2 className="h-6 w-6 text-purple-600 mb-2 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-300">{t.dashboard.createZones}</span>
                </button>
                <button
                  onClick={() => window.location.href = '/usuarios'}
                  className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer border-2 border-transparent hover:border-green-200 dark:bg-green-950/50 dark:hover:bg-green-950/70 dark:border-green-800/50 dark:hover:border-green-700"
                >
                  <Users className="h-6 w-6 text-green-600 mb-2 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-300">{t.dashboard.addUsers}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick stats */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.dashboard.systemSummary}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">{t.dashboard.responsibles}</span>
                  <span className="font-semibold text-gray-900">{stats.totalResponsables}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">{t.dashboard.occupancyRate}</span>
                  <span className="font-semibold text-gray-900">
                    {stats.totalEspacios > 0 
                      ? `${Math.round((stats.espaciosActivos / stats.totalEspacios) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">{t.dashboard.spacesOccupiedNow}</span>
                  <span className="font-semibold text-red-600">
                    {stats.espaciosActivos}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-600">{t.dashboard.spacesAvailable}</span>
                  <span className="font-semibold text-green-600">
                    {stats.totalEspacios - stats.espaciosActivos}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.dashboard.quickActions}</h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/reservas'}
                  className="w-full flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group cursor-pointer border-2 border-transparent hover:border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-950/70 dark:border-blue-800/50 dark:hover:border-blue-700"
                >
                  <Calendar className="h-5 w-5 text-blue-600 mr-3 dark:text-blue-400" />
                  <span className="text-blue-900 font-medium dark:text-blue-300">{t.dashboard.manageReservations}</span>
                </button>
                <button
                  onClick={() => window.location.href = '/recursos'}
                  className="w-full flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group cursor-pointer border-2 border-transparent hover:border-purple-200 dark:bg-purple-950/50 dark:hover:bg-purple-950/70 dark:border-purple-800/50 dark:hover:border-purple-700"
                >
                  <Package className="h-5 w-5 text-purple-600 mr-3 dark:text-purple-400" />
                  <span className="text-purple-900 font-medium dark:text-purple-300">{t.dashboard.manageResources}</span>
                </button>
                <button
                  onClick={() => window.location.href = '/reportes'}
                  className="w-full flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group cursor-pointer border-2 border-transparent hover:border-gray-200 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 dark:border-gray-700/50 dark:hover:border-gray-600"
                >
                  <BarChart3 className="h-5 w-5 text-gray-600 mr-3 dark:text-gray-400" />
                  <span className="text-gray-900 font-medium dark:text-gray-300">{t.dashboard.viewReports}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}