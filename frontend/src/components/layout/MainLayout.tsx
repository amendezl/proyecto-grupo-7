// Layout Principal - Sistema de Gestión de Espacios
// Estructura optimizada para workflows de gestión empresarial

import { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  urgentMode?: boolean;
}

export default function MainLayout({ 
  children, 
  showSidebar = true,
  urgentMode = false 
}: MainLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${urgentMode ? 'urgent-mode' : ''}`}>
      {/* Header fijo con navegación principal */}
      <Header urgentMode={urgentMode} />
      
      {/* Status bar para información del sistema */}
      <StatusBar />
      
      <div className="flex">
        {/* Sidebar colapsible con navegación principal */}
        {showSidebar && (
          <Sidebar className="fixed left-0 top-16 z-40" />
        )}
        
        {/* Área de contenido principal */}
        <main 
          className={`
            flex-1 min-h-screen pt-16 pb-6
            ${showSidebar ? 'ml-280' : ''}
            ${urgentMode ? 'urgent-content' : ''}
          `}
        >
          {/* Container responsivo */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Overlay para modo urgente */}
      {urgentMode && (
        <div className="fixed inset-0 bg-red-900/10 pointer-events-none z-50" />
      )}
    </div>
  );
}

// Tipos para navegación hospitalaria
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: {
    count: number;
    variant: 'info' | 'warning' | 'error' | 'success';
  };
  permissions?: string[];
  critical?: boolean; // Para accesos de emergencia
}

// Estructura de navegación por módulos hospitalarios
export const hospitalNavigation: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    href: '/dashboard'
  },
  {
    id: 'boxes',
    label: 'Gestión de Boxes',
    icon: 'Building2',
    href: '/boxes',
    badge: { count: 0, variant: 'info' } // Se actualiza en tiempo real
  },
  {
    id: 'agenda',
    label: 'Agenda Médica',
    icon: 'Calendar',
    href: '/agenda',
    badge: { count: 0, variant: 'warning' }
  },
  {
    id: 'personal',
    label: 'Personal Médico',
    icon: 'Users',
    href: '/personal'
  },
  {
    id: 'implementos',
    label: 'Implementos',
    icon: 'Package',
    href: '/implementos',
    badge: { count: 0, variant: 'error' } // Alertas de stock
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: 'BarChart3',
    href: '/reportes'
  },
  {
    id: 'emergencia',
    label: 'EMERGENCIA',
    icon: 'AlertTriangle',
    href: '/emergencia',
    critical: true,
    permissions: ['emergency_access']
  }
];