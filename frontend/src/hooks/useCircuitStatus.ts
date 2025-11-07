/**
 * Hook para obtener el estado de Circuit Breakers del sistema 
 * Obtiene información en tiempo real del endpoint /system/circuit-status
 * incluyendo estado de circuitos, health score y recomendaciones.
 */

import { useState, useEffect, useCallback } from 'react';

export interface CircuitStats {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  circuitOpened: number;
  circuitClosed: number;
  healthScore: number;
  currentState: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  serviceName: string;
  failureCount: number;
  successCount: number;
}

export interface CriticalCircuit {
  serviceName: string;
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  healthScore: number;
  failureCount: number;
  lastFailureTime: string | null;
}

export interface Recommendation {
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'CIRCUIT_BREAKER' | 'HEALTH' | 'RESILIENCE' | 'BULKHEAD' | 'SYSTEM';
  message: string;
  action: string;
}

export interface CircuitStatusSummary {
  totalCircuits: number;
  openCircuits: number;
  halfOpenCircuits: number;
  closedCircuits: number;
  unhealthyCircuits: number;
  degradedCircuits: number;
  healthyCircuits: number;
}

export interface CircuitStatusResponse {
  ok: boolean;
  summary: CircuitStatusSummary;
  criticalCircuits: CriticalCircuit[];
  circuits: Record<string, CircuitStats>;
  resilienceMetrics: {
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
  systemHealth: {
    score: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    combinedScore: number;
  };
  recommendations: Recommendation[];
  timestamp: string;
}

interface UseCircuitStatusOptions {
  refreshInterval?: number; // en milisegundos, default 30000 (30s)
  enabled?: boolean; // si false, no hace polling
  onError?: (error: Error) => void;
  onCriticalChange?: (criticalCircuits: CriticalCircuit[]) => void;
}

export function useCircuitStatus(options: UseCircuitStatusOptions = {}) {
  const {
    refreshInterval = 30000,
    enabled = true,
    onError,
    onCriticalChange,
  } = options;

  const [status, setStatus] = useState<CircuitStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL no está configurado');
      }

      // Obtener token de autenticación del localStorage o context
      const token = localStorage.getItem('idToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${apiUrl}/system/circuit-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
        }
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CircuitStatusResponse = await response.json();
      
      if (!data.ok) {
        throw new Error('Respuesta del servidor indica error');
      }

      // Detectar cambios críticos
      if (status && onCriticalChange) {
        const prevCriticalCount = status.criticalCircuits.length;
        const newCriticalCount = data.criticalCircuits.length;
        
        if (newCriticalCount > prevCriticalCount) {
          onCriticalChange(data.criticalCircuits);
        }
      }

      setStatus(data);
      setError(null);
      setLastUpdate(new Date());
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido');
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      console.error('[useCircuitStatus] Error fetching circuit status:', error);
    } finally {
      setLoading(false);
    }
  }, [status, onError, onCriticalChange]);

  // Fetch inicial y polling
  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchStatus();

    const interval = setInterval(fetchStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [enabled, refreshInterval, fetchStatus]);

  // Función para refrescar manualmente
  const refresh = useCallback(() => {
    setLoading(true);
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    lastUpdate,
    refresh,
  };
}

/**
 * Hook simplificado que solo devuelve si el sistema está saludable
 */
export function useSystemHealth() {
  const { status, loading, error } = useCircuitStatus({
    refreshInterval: 60000, // 1 minuto para health check
  });

  const isHealthy = status ? status.systemHealth.score >= 75 : false;
  const healthStatus = status?.systemHealth.status;
  const healthScore = status?.systemHealth.score;

  return {
    isHealthy,
    healthStatus,
    healthScore,
    loading,
    error,
  };
}

/**
 * Hook para obtener solo circuitos críticos
 */
export function useCriticalCircuits() {
  const { status, loading, error, refresh } = useCircuitStatus({
    refreshInterval: 15000, // 15 segundos para alertas críticas
    onCriticalChange: (criticalCircuits) => {
      // Mostrar notificación cuando hay nuevos circuitos críticos
      if (criticalCircuits.length > 0) {
        console.warn('[Critical Circuits] Nuevos circuitos en estado crítico:', criticalCircuits);
      }
    },
  });

  const criticalCircuits = status?.criticalCircuits || [];
  const hasCritical = criticalCircuits.length > 0;

  return {
    criticalCircuits,
    hasCritical,
    loading,
    error,
    refresh,
  };
}
