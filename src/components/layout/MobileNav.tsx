import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  CalendarCheck,
  ClipboardList,
  AlertTriangle,
  Users,
  FileBarChart,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { cn } from '../../utils/cn';

interface MobileNavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  visible: (role: string | null) => boolean;
}

const items: MobileNavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, visible: () => true },
  { to: '/schools', label: 'Schools', icon: School, visible: () => true },
  { to: '/visits', label: 'Visits', icon: CalendarCheck, visible: () => true },
  { to: '/logs', label: 'Logs', icon: ClipboardList, visible: () => true },
  { to: '/escalations', label: 'Issues', icon: AlertTriangle, visible: () => true },
  { to: '/engineers', label: 'Team', icon: Users, visible: (r) => r === 'admin' || r === 'team_lead' },
  { to: '/reports', label: 'Reports', icon: FileBarChart, visible: () => true },
];

export const MobileNav = () => {
  const { profile } = useAuth();
  const role = profile?.role ?? null;
  const visible = items.filter((i) => i.visible(role)).slice(0, 5);

  return (
    <nav className="mobile-nav" aria-label="Primary mobile">
      {visible.map((i) => {
        const Icon = i.icon;
        return (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className={({ isActive }) => cn('mobile-nav-link', isActive ? 'active' : '')}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{i.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
