/**
 * Página del Dashboard de Resiliencia
 * 
 * Ruta: /resiliencia
 * Requiere autenticación: Sí (rol admin/ops recomendado)
 */

import ResilienceDashboard from '@/components/ResilienceDashboard';

export default function ResilienciaPage() {
  return <ResilienceDashboard />;
}
