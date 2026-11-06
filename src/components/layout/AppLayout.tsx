import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileBottomNavigation } from '@/components/layout/MobileBottomNavigation';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-text-primary transition-colors">
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      <AppHeader onMenuToggle={() => setSidebarOpen((previous) => !previous)} />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-sidebar">
        <main className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 lg:px-8 lg:pb-12 animate-page">
          <Outlet />
        </main>
      </div>

      <MobileBottomNavigation onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
}
