import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Field, Input } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { error: showError, success, info } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign in | Field Operations';
  }, []);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Missing details', 'Email and password are required');
      return;
    }
    if (!isSupabaseConfigured()) {
      showError('Supabase not configured', 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      showError('Sign in failed', error.message);
      return;
    }
    success('Welcome back', 'Signed in successfully');
    navigate('/', { replace: true });
  };

  const handleGoogle = async () => {
    if (!isSupabaseConfigured()) {
      showError('Supabase not configured', 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      showError('Google sign-in failed', error.message);
    } else {
      info('Continue with Google', 'Redirecting…');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b1f3a, #1d3a63)',
        padding: 24,
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
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
            <div style={{ fontWeight: 700 }}>Field Operations</div>
            <div className="text-xs text-muted">Sign in to continue</div>
          </div>
        </div>

        {!isSupabaseConfigured() && (
          <div className="banner banner-danger" style={{ marginBottom: 16 }}>
            <strong>Configuration required:</strong> Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              leftIcon={<Mail size={14} />}
            />
          </Field>
          <Field label="Password" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              leftIcon={<Lock size={14} />}
            />
          </Field>
          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            <LogIn size={16} /> Sign in
          </Button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0', color: 'var(--fg-muted)' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="text-xs">OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <Button type="button" variant="secondary" className="w-full" onClick={handleGoogle}>
          <GoogleIcon /> Continue with Google
        </Button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 13 }}>
          <Link to="/signup">Create account</Link>
          <Link to="/reset">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.4 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.6 6 28.9 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.6 6 28.9 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5 0 9.5-1.9 12.9-5l-6-5c-2 1.4-4.5 2.3-6.9 2.3-5.2 0-9.6-3.5-11.3-8.4l-6.5 5C9.4 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6 5C41.6 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z" />
  </svg>
);