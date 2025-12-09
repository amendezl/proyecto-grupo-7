'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Building2, Users, ArrowLeft, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';

export default function RecursosPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader 
        title={t.resources.management}
        breadcrumbs={[
          { label: t.resources.title, href: '/recursos' }
        ]}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Description */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600 dark:text-gray-400">{t.resources.description}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </button>
        </div>

        {/* Recursos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Espacios */}
          <Link href="/espacios">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all p-8 text-center cursor-pointer border-2 border-transparent hover:border-blue-500 group">
              <div className="p-6 bg-blue-50 dark:bg-blue-900 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-800 transition-colors">
                <MapPin className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.resources.spaces}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t.resources.spacesDescription}
              </p>
              <div className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                {t.resources.manageSpaces}
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Zonas */}
          <Link href="/zonas">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all p-8 text-center cursor-pointer border-2 border-transparent hover:border-purple-500 group">
              <div className="p-6 bg-purple-50 dark:bg-purple-900 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-800 transition-colors">
                <Building2 className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.resources.zones}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t.resources.zonesDescription}
              </p>
              <div className="inline-flex items-center text-purple-600 dark:text-purple-400 font-medium group-hover:underline">
                {t.resources.manageZones}
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Usuarios */}
          <Link href="/usuarios">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all p-8 text-center cursor-pointer border-2 border-transparent hover:border-green-500 group">
              <div className="p-6 bg-green-50 dark:bg-green-900 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-800 transition-colors">
                <Users className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.resources.users}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t.resources.usersDescription}
              </p>
              <div className="inline-flex items-center text-green-600 dark:text-green-400 font-medium group-hover:underline">
                {t.resources.manageUsers}
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
            <div>
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">{t.resources.getStartedTitle}</h4>
              <p className="text-blue-800 dark:text-blue-400 mb-2">
                {t.resources.getStartedDescription}
              </p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
                <li><strong>{t.resources.step1}</strong></li>
                <li><strong>{t.resources.step2}</strong></li>
                <li><strong>{t.resources.step3}</strong></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
