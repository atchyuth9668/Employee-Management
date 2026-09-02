import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Field, Input } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { validateEmail } from '../../utils/helpers';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { error: showError, success } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign up | Field Operations';
  }, []);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      showError('Missing details', 'All fields are required');
      return;
    }
    if (!validateEmail(email)) {
      showError('Invalid email', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      showError('Weak password', 'Password must be at least 6 characters');
      return;
    }
    if (!isSupabaseConfigured()) {
      showError('Supabase not configured', 'Set environment variables first.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setSubmitting(false);
    if (error) {
      showError('Sign up failed', error.message);
      return;
    }
    success('Account created', 'Check your email to confirm (if enabled) or sign in directly.');
    navigate('/login', { replace: true });
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
            <div style={{ fontWeight: 700 }}>Create account</div>
            <div className="text-xs text-muted">Join the Field Operations platform</div>
          </div>
        </div>

        {!isSupabaseConfigured() && (
          <div className="banner banner-danger" style={{ marginBottom: 16 }}>
            <strong>Configuration required:</strong> Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Field label="Full name" htmlFor="full_name" required>
            <Input
              id="full_name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </Field>
          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field label="Password" htmlFor="password" required help="At least 6 characters">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            <UserPlus size={16} /> Create account
          </Button>
        </form>

        <div style={{ marginTop: 18, fontSize: 13 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};