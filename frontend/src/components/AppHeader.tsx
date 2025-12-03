'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User, LogOut, Settings, Home, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
}

export default function AppHeader({ title, breadcrumbs = [] }: AppHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout(() => {
      // Use window.location for full page reload to avoid CloudFront routing issues
      window.location.href = '/auth/login';
    });
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex flex-col">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                <Link
                  href="/dashboard"
                  className="flex items-center hover:text-purple-600 transition-colors"
                >
                  <Home className="h-4 w-4" />
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-purple-600 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-medium">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900">{title || 'Dashboard'}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.nombre} {user?.apellido}</span>
              {user?.rol && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  {user.rol}
                </span>
              )}
            </div>
            
            <Link
              href="/profile"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Perfil"
            >
              <Settings className="h-5 w-5" />
            </Link>
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
