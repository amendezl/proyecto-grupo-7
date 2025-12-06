'use client';

import React from 'react';
import Dashboard from '@/components/Dashboard';
import AppHeader from '@/components/AppHeader';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardPage() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1f2e]">
      <AppHeader title={t.nav.dashboard} />
      
      {/* Dashboard Content */}
      <main>
        <Dashboard />
      </main>
    </div>
  );
}