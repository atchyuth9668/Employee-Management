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
  const { error: showError, success } = useToast();
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, fontSize: 13 }}>
          <Link to="/reset">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
};
