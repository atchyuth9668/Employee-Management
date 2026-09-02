import { useEffect, useMemo, useState } from 'react';
import { Menu, Search, Bell, LogOut, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useConnection } from '../../providers/ConnectionProvider';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../../utils/constants';
import { initials } from '../../utils/helpers';
import { SearchOverlay } from './SearchOverlay';
import { NotificationsPanel } from './NotificationsPanel';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar = ({ onToggleSidebar }: TopbarProps) => {
  const { profile, signOut } = useAuth();
  const { state } = useConnection();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const connectionLabel = useMemo(() => {
    if (state === 'connected') return 'Connected to Supabase';
    if (state === 'connecting') return 'Connecting…';
    return 'Connection interrupted — reconnecting';
  }, [state]);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <button className="btn btn-ghost btn-icon" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
        <Menu size={18} />
      </button>

      <button
        className="btn btn-secondary"
        onClick={() => setSearchOpen(true)}
        style={{ flex: 1, justifyContent: 'flex-start', color: 'var(--fg-muted)', maxWidth: 480 }}
        aria-label="Open search"
      >
        <Search size={16} />
        <span style={{ marginLeft: 6 }}>Search schools, engineers, visits…</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>⌘K</span>
      </button>

      <div className={`connection-pill ${state !== 'connected' ? 'disconnected' : ''}`} aria-live="polite">
        {state === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
        <span className="connection-dot" aria-hidden="true" />
        <span>{connectionLabel}</span>
      </div>

      <div style={{ position: 'relative' }}>
        <button className="btn btn-ghost btn-icon" aria-label="Notifications" onClick={() => setNotifOpen((v) => !v)}>
          <Bell size={18} />
        </button>
        {notifOpen && (
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50 }}>
            <NotificationsPanel onClose={() => setNotifOpen(false)} />
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="avatar" aria-hidden="true">
            {initials(profile?.full_name ?? 'U')}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{profile?.full_name ?? 'User'}</span>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {profile ? ROLE_LABELS[profile.role] : ''}
            </span>
          </span>
          <ChevronDown size={14} />
        </button>
        {menuOpen && (
          <div
            className="card"
            role="menu"
            style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 200, padding: 6, zIndex: 50 }}
          >
            <button
              className="btn btn-ghost w-full"
              role="menuitem"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                setMenuOpen(false);
                navigate('/profile');
              }}
            >
              Profile
            </button>
            <button
              className="btn btn-ghost w-full"
              role="menuitem"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                setMenuOpen(false);
                navigate('/settings');
              }}
            >
              Settings
            </button>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <button
              className="btn btn-ghost w-full"
              role="menuitem"
              style={{ justifyContent: 'flex-start', color: 'var(--danger)' }}
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
                navigate('/login');
              }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
};