'use client';

import Link from 'next/link';
import { ArrowRight, Shield, BarChart3, Users } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.auth.systemTitle}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher temporary />
              <Link
                href="/auth/login"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t.auth.login}
              </Link>
              <Link
                href="/auth/register"
                className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                {t.auth.register}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {t.homepage.heroTitle}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
            {t.homepage.heroDescription}
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/auth/login"
              className="bg-green-600 text-white hover:bg-green-700 px-8 py-3 rounded-lg text-lg font-medium flex items-center space-x-2"
            >
              <span>{t.homepage.accessSystem}</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/register"
              className="bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-green-600 dark:border-green-400 px-8 py-3 rounded-lg text-lg font-medium"
            >
              {t.auth.createAccount}
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t.homepage.realtimeMonitoring}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t.homepage.realtimeDesc}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t.homepage.personnelManagement}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t.homepage.personnelDesc}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t.homepage.advancedSecurity}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t.homepage.securityDesc}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>{t.homepage.footerCopyright}</p>
            <p className="mt-2">{t.homepage.footerTech}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}