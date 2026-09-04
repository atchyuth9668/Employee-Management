import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  CalendarCheck,
  ClipboardList,
  AlertTriangle,
  Users,
  FileBarChart,
  UserCircle,
  Settings,
  X,
  CalendarOff,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { cn } from '../../utils/cn';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  visible: (role: string | null) => boolean;
}

const items: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, visible: () => true },
  { to: '/schools', label: 'Schools', icon: School, visible: () => true },
  { to: '/visits', label: 'Visits', icon: CalendarCheck, visible: () => true },
  { to: '/logs', label: 'Daily Logs', icon: ClipboardList, visible: () => true },
  { to: '/escalations', label: 'Escalations', icon: AlertTriangle, visible: () => true },
  { to: '/engineers', label: 'Engineers', icon: Users, visible: (r) => r === 'admin' || r === 'team_lead' },
  { to: '/reports', label: 'Reports', icon: FileBarChart, visible: () => true },
  { to: '/holidays', label: 'Holidays', icon: CalendarOff, visible: (r) => r === 'admin' || r === 'team_lead' },
  { to: '/profile', label: 'Profile', icon: UserCircle, visible: () => true },
  { to: '/settings', label: 'Settings', icon: Settings, visible: () => true },
];

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { profile } = useAuth();
  const role = profile?.role ?? null;

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside
        className={cn('app-sidebar')}
        style={{
          background: 'var(--bg-sidebar)',
          color: 'var(--fg-on-dark)',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minHeight: '100vh',
          position: 'sticky',
          top: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              aria-hidden="true"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              FO
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Field Ops</div>
              <div style={{ fontSize: 11, color: 'var(--fg-on-dark-muted)' }}>Operations Platform</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            aria-label="Close sidebar"
            onClick={onClose}
            style={{ color: '#fff', display: 'none' }}
            data-mobile-only="true"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Primary" style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {items
            .filter((i) => i.visible(role))
            .map((i) => {
              const Icon = i.icon;
              return (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn('sidebar-link', isActive ? 'active' : '')
                  }
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    color: isActive ? '#fff' : 'var(--fg-on-dark-muted)',
                    background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'background 120ms ease, color 120ms ease',
                  })}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{i.label}</span>
                </NavLink>
              );
            })}
        </nav>

        <div
          style={{
            marginTop: 'auto',
            padding: 12,
            borderRadius: 8,
            background: 'var(--bg-sidebar-hover)',
            fontSize: 11,
            color: 'var(--fg-on-dark-muted)',
          }}
        >
          AP · Telangana
        </div>
      </aside>
      <style>{`
        @media (max-width: 1024px) {
          .app-sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100vh;
            width: 260px;
            z-index: 50;
            transform: translateX(${open ? '0' : '-100%'});
            transition: transform 220ms ease;
          }
          [data-mobile-only="true"] {
            display: inline-flex !important;
          }
        }
      `}</style>
    </>
  );
};