'use client';

import React from 'react';
import Dashboard from '@/components/Dashboard';
import AppHeader from '@/components/AppHeader';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Dashboard" />
      
      {/* Dashboard Content */}
      <main>
        <Dashboard />
      </main>
    </div>
  );
}