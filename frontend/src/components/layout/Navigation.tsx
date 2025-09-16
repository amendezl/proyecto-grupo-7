'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  MapPin, 
  Calendar, 
  Users, 
  UserCheck, 
  Settings,
  Menu, 
  X,
  LogOut,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useDeviceInfo } from '@/lib/api-client';

interface NavigationProps {
  children: ReactNode;
}

const menuItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/espacios', label: 'Espacios', icon: MapPin },
  { href: '/reservas', label: 'Reservas', icon: Calendar },
  { href: '/usuarios', label: 'Usuarios', icon: Users },
  { href: '/responsables', label: 'Responsables', icon: UserCheck },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

const DeviceIndicator = () => {
  const { deviceType, isPortrait } = useDeviceInfo();
  
  const Icon = deviceType === 'mobile' ? Smartphone : 
               deviceType === 'tablet' ? Tablet : Monitor;
  
  return (
    <div className="flex items-center space-x-2 text-xs text-gray-500">
      <Icon className="w-4 h-4" />
      <span>{deviceType}</span>
      <span>{isPortrait ? '📱' : '🖥️'}</span>
    </div>
  );
};

export const Navigation = ({ children }: NavigationProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isMobile } = useDeviceInfo();

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Cerrar menú al hacer resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header móvil */}
      <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sistema Espacios
          </h1>
          <div className="flex items-center space-x-3">
            <DeviceIndicator />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              icon={isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            >
              Menu
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Sistema Espacios
              </h1>
              <DeviceIndicator />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      className={`
                        flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }
                      `}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* User Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                fullWidth
                icon={<LogOut className="w-4 h-4" />}
                onClick={() => {/* Logout logic */}}
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </aside>

        {/* Menú móvil */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Menú lateral */}
              <motion.aside
                className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-50 md:hidden"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                      Menu
                    </h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                      icon={<X className="w-5 h-5" />}
                    >
                      Cerrar
                    </Button>
                  </div>

                  {/* Navigation */}
                  <nav className="flex-1 px-4 py-4 space-y-2">
                    {menuItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <motion.div
                            className={`
                              flex items-center px-3 py-3 rounded-lg text-base font-medium transition-colors
                              ${isActive 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                              }
                            `}
                            whileTap={{ scale: 0.98 }}
                          >
                            <item.icon className="w-6 h-6 mr-4" />
                            {item.label}
                          </motion.div>
                        </Link>
                      );
                    })}
                  </nav>

                  {/* User Actions */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="ghost"
                      fullWidth
                      icon={<LogOut className="w-5 h-5" />}
                      onClick={() => {/* Logout logic */}}
                    >
                      Cerrar Sesión
                    </Button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Contenido principal */}
        <main className="flex-1 md:ml-64">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};