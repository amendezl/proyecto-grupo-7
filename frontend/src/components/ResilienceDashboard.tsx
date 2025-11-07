/**
 * Dashboard de Monitoreo de Patrones de Resiliencia
 * 
 * Visualización en tiempo real del estado de circuit breakers,
 * health score del sistema, alertas críticas y recomendaciones.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useCircuitStatus, type Recommendation, type CriticalCircuit } from '@/hooks/useCircuitStatus';

// Iconos simples con Unicode (no requiere librería externa)
const Icons = {
  Check: () => <span className="text-xl">✓</span>,
  Warning: () => <span className="text-xl">⚠</span>,
  Error: () => <span className="text-xl">✗</span>,
  Info: () => <span className="text-xl">ℹ</span>,
  Refresh: () => <span className="text-xl">↻</span>,
  Clock: () => <span className="text-xl">🕐</span>,
  Shield: () => <span className="text-xl">🛡</span>,
};

export default function ResilienceDashboard() {
  const { status, loading, error, lastUpdate, refresh } = useCircuitStatus({
    refreshInterval: 30000, // 30 segundos
    onCriticalChange: (criticalCircuits) => {
      // Notificación cuando hay nuevos circuitos críticos
      if (typeof window !== 'undefined' && criticalCircuits.length > 0) {
        new Notification('⚠️ Alerta de Resiliencia', {
          body: `${criticalCircuits.length} circuit breaker(s) en estado crítico`,
          icon: '/favicon.ico',
        });
      }
    },
  });

  // Solicitar permiso para notificaciones
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Loading state
  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estado del sistema...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-4">
            <Icons.Error />
            <h2 className="text-xl font-bold text-red-800 ml-2">Error al cargar datos</h2>
          </div>
          <p className="text-red-600 mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            <Icons.Refresh /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Icons.Shield /> Dashboard de Resiliencia
              </h1>
              <p className="text-gray-600">
                Monitoreo en tiempo real de patrones Circuit Breaker, Retry y Bulkhead
              </p>
            </div>
            <div className="text-right">
              <button
                onClick={refresh}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Icons.Refresh />
                Actualizar
              </button>
              {lastUpdate && (
                <p className="text-sm text-gray-500 mt-2 flex items-center justify-end gap-1">
                  <Icons.Clock />
                  {lastUpdate.toLocaleTimeString('es-ES')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* System Health Score */}
        <SystemHealthCard
          score={status.systemHealth.score}
          status={status.systemHealth.status}
          combinedScore={status.systemHealth.combinedScore}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <SummaryCard
            title="Total Circuitos"
            value={status.summary.totalCircuits}
            icon={<Icons.Shield />}
            color="blue"
          />
          <SummaryCard
            title="Circuitos Abiertos"
            value={status.summary.openCircuits}
            icon={<Icons.Error />}
            color="red"
          />
          <SummaryCard
            title="Circuitos Saludables"
            value={status.summary.healthyCircuits}
            icon={<Icons.Check />}
            color="green"
          />
          <SummaryCard
            title="Circuitos Degradados"
            value={status.summary.unhealthyCircuits}
            icon={<Icons.Warning />}
            color="yellow"
          />
        </div>

        {/* Critical Circuits Alert */}
        {status.criticalCircuits.length > 0 && (
          <CriticalCircuitsAlert circuits={status.criticalCircuits} />
        )}

        {/* Resilience Metrics */}
        <ResilienceMetricsCard metrics={status.resilienceMetrics} />

        {/* Recommendations */}
        <RecommendationsCard recommendations={status.recommendations} />

        {/* Circuit Details Table */}
        <CircuitDetailsTable circuits={status.circuits} />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Componente helper para barras de progreso sin inline styles
interface ProgressBarProps {
  percentage: number;
  colorClass: string;
}

function ProgressBar({ percentage, colorClass }: ProgressBarProps) {
  // Usamos clip-path en CSS puro a través de data attributes
  return (
    <div 
      className={`h-full ${colorClass} transition-all duration-500 rounded-full`}
      data-progress={percentage}
    >
      <style dangerouslySetInnerHTML={{__html: `
        [data-progress] {
          width: ${percentage}%;
        }
      `}} />
    </div>
  );
}

interface SystemHealthCardProps {
  score: number;
  status: string;
  combinedScore: number;
}

function SystemHealthCard({ score, status, combinedScore }: SystemHealthCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return 'bg-green-500';
      case 'GOOD':
        return 'bg-blue-500';
      case 'FAIR':
        return 'bg-yellow-500';
      case 'POOR':
        return 'bg-orange-500';
      case 'CRITICAL':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      EXCELLENT: 'Excelente',
      GOOD: 'Bueno',
      FAIR: 'Regular',
      POOR: 'Pobre',
      CRITICAL: 'Crítico',
    };
    return texts[status] || status;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Health Score del Sistema</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-gray-600 mb-2">Score Principal</p>
          <div className="flex items-baseline">
            <span className="text-5xl font-bold text-gray-900">{score}</span>
            <span className="text-2xl text-gray-500 ml-2">/ 100</span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-3 overflow-hidden">
            <ProgressBar percentage={score} colorClass={getStatusColor(status)} />
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Estado</p>
          <div className={`inline-block px-4 py-2 rounded-full ${getStatusColor(status)} text-white font-bold text-xl`}>
            {getStatusText(status)}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Score Combinado</p>
          <div className="flex items-baseline">
            <span className="text-5xl font-bold text-gray-900">{combinedScore.toFixed(1)}</span>
            <span className="text-2xl text-gray-500 ml-2">/ 100</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Incluye métricas de bulkhead y tasa de éxito</p>
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'green' | 'yellow';
}

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-4xl font-bold">{value}</span>
      </div>
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}

interface CriticalCircuitsAlertProps {
  circuits: CriticalCircuit[];
}

function CriticalCircuitsAlert({ circuits }: CriticalCircuitsAlertProps) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icons.Error />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-bold text-red-800 mb-2">
            ⚠️ {circuits.length} Circuit Breaker(s) en Estado Crítico
          </h3>
          <div className="space-y-2">
            {circuits.map((circuit, index) => (
              <div key={index} className="bg-white rounded p-3 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-red-900">{circuit.serviceName}</p>
                    <p className="text-sm text-red-700">
                      Estado: {circuit.state} | Fallos: {circuit.failureCount} | Health: {circuit.healthScore}/100
                    </p>
                  </div>
                  {circuit.lastFailureTime && (
                    <p className="text-xs text-red-600">
                      Último fallo: {new Date(circuit.lastFailureTime).toLocaleString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResilienceMetricsCardProps {
  metrics: {
    totalOperations: number;
    successRate: string;
    failureRate: string;
    averageResponseTime: string;
    bulkheadHealth: {
      totalPools: number;
      healthyPools: number;
      totalActiveRequests: number;
      totalQueuedRequests: number;
    };
  };
}

function ResilienceMetricsCard({ metrics }: ResilienceMetricsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Métricas de Resiliencia</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricItem label="Total Operaciones" value={metrics.totalOperations.toLocaleString()} />
        <MetricItem label="Tasa de Éxito" value={metrics.successRate} color="green" />
        <MetricItem label="Tasa de Fallos" value={metrics.failureRate} color="red" />
        <MetricItem label="Tiempo Promedio" value={metrics.averageResponseTime} />
        <MetricItem
          label="Bulkhead Pools"
          value={`${metrics.bulkheadHealth.healthyPools} / ${metrics.bulkheadHealth.totalPools}`}
          color={metrics.bulkheadHealth.healthyPools === metrics.bulkheadHealth.totalPools ? 'green' : 'yellow'}
        />
        <MetricItem label="Requests en Cola" value={metrics.bulkheadHealth.totalQueuedRequests.toString()} />
      </div>
    </div>
  );
}

interface MetricItemProps {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'yellow';
}

function MetricItem({ label, value, color }: MetricItemProps) {
  const colorClass = color
    ? {
        green: 'text-green-600',
        red: 'text-red-600',
        yellow: 'text-yellow-600',
      }[color]
    : 'text-gray-900';

  return (
    <div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

interface RecommendationsCardProps {
  recommendations: Recommendation[];
}

function RecommendationsCard({ recommendations }: RecommendationsCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'LOW':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'INFO':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <Icons.Error />;
      case 'MEDIUM':
        return <Icons.Warning />;
      case 'LOW':
      case 'INFO':
        return <Icons.Info />;
      default:
        return <Icons.Info />;
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recomendaciones</h2>
        <div className="flex items-center gap-2 text-green-600">
          <Icons.Check />
          <p>No hay recomendaciones en este momento. El sistema está operando correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Recomendaciones ({recommendations.length})</h2>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(rec.severity)}`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">{getSeverityIcon(rec.severity)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-xs uppercase">{rec.severity}</span>
                  <span className="text-xs">•</span>
                  <span className="text-xs">{rec.category}</span>
                </div>
                <p className="font-semibold mb-1">{rec.message}</p>
                <p className="text-sm opacity-90">{rec.action}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CircuitDetailsTableProps {
  circuits: Record<string, any>;
}

function CircuitDetailsTable({ circuits }: CircuitDetailsTableProps) {
  const circuitArray = Object.entries(circuits).map(([name, stats]) => ({
    name,
    ...stats,
  }));

  const getStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'HALF_OPEN':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Detalle de Circuit Breakers</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Servicio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Health Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Requests
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Éxitos / Fallos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Abierto / Cerrado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {circuitArray.map((circuit, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{circuit.serviceName || circuit.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStateColor(circuit.currentState)}`}>
                    {circuit.currentState}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-gray-900 mr-2">{circuit.healthScore}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <ProgressBar 
                        percentage={circuit.healthScore} 
                        colorClass={
                          circuit.healthScore >= 75
                            ? 'bg-green-500'
                            : circuit.healthScore >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {circuit.totalRequests?.toLocaleString() || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-green-600 font-medium">{circuit.totalSuccesses || 0}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-sm text-red-600 font-medium">{circuit.totalFailures || 0}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-red-600 font-medium">{circuit.circuitOpened || 0}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-sm text-green-600 font-medium">{circuit.circuitClosed || 0}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
