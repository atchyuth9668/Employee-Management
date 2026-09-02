import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastViewport } from '../ui/ToastViewport';

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="app-content">
          <Outlet />
        </main>
        <footer
          style={{
            padding: '12px 20px',
            fontSize: 12,
            color: 'var(--fg-muted)',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            textAlign: 'center',
          }}
        >
          Field Operations Platform · Andhra Pradesh · Telangana
        </footer>
      </div>
      <ToastViewport />
    </div>
  );
};