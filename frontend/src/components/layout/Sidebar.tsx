// Sidebar - Sistema de Gestión de Espacios
// Navegación lateral optimizada para gestión empresarial

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Home, MapPin, Calendar, Users, BarChart3, Settings, Building2, Clock, Shield, Package } from 'lucide-react';
import { designSystem } from '@/lib/design-system';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useLanguage();

  const menuItems = [
    {
      icon: Home,
      label: t.nav.dashboard,
      href: '/dashboard',
      count: null,
      active: true
    },
    {
      icon: MapPin,
      label: t.nav.spaces,
      href: '/espacios',
      count: 45,
      active: false
    },
    {
      icon: Calendar,
      label: t.nav.reservations,
      href: '/reservas',
      count: 12,
      active: false
    },
    {
      icon: Building2,
      label: t.nav.zones,
      href: '/zonas',
      count: 8,
      active: false
    },
    {
      icon: Package,
      label: t.nav.resources,
      href: '/recursos',
      count: null,
      active: false
    },
    {
      icon: Users,
      label: t.nav.users,
      href: '/usuarios',
      count: 156,
      active: false
    },
    {
      icon: Shield,
      label: t.nav.responsibles,
      href: '/responsables',
      count: 8,
      active: false
    },
    {
      icon: BarChart3,
      label: t.nav.reports,
      href: '/reportes',
      count: null,
      active: false
    },
    {
      icon: Settings,
      label: t.nav.settings,
      href: '/configuracion',
      count: null,
      active: false
    }
  ];

  return (
    <aside className={`
      ${className}
      ${isCollapsed ? 'w-16' : 'w-64'}
      bg-white border-r border-gray-200 h-screen transition-all duration-300
    `}>
      {/* Header del sidebar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="font-semibold text-gray-900">Navegación</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="p-2">
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index}>
                <a
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-lg transition-colors group
                    ${item.active 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`
                    w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}
                    ${item.active ? 'text-blue-600' : 'text-gray-500'}
                  `} />
                  
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.count && (
                        <span className={`
                          px-2 py-1 text-xs rounded-full
                          ${item.active 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-600'
                          }
                        `}>
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Estado del sistema */}
      {!isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Sistema operativo</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
            <Clock className="w-3 h-3" />
            <span>Última actualización: ahora</span>
          </div>
        </div>
      )}
    </aside>
  );
}