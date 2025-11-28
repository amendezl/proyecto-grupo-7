'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Dashboard from '@/components/Dashboard';
import { User, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout(() => {
      router.push('/auth/login');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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

      {/* Dashboard Content */}
      <main>
        <Dashboard />
      </main>
    </div>
  );
}