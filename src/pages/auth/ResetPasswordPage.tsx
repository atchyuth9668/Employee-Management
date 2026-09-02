import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useToast } from '../../providers/ToastProvider';
import { Field, Input } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { MailQuestion } from 'lucide-react';

export const ResetPasswordPage = () => {
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Reset password | Field Operations';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showError('Email required', 'Please enter your email');
      return;
    }
    if (!isSupabaseConfigured()) {
      showError('Supabase not configured', 'Set environment variables first.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setSubmitting(false);
    if (error) {
      showError('Reset failed', error.message);
      return;
    }
    success('Check your email', 'If an account exists, a reset link has been sent.');
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
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Reset password</h1>
        <p className="text-sm text-muted mb-4">We will email you a secure link to set a new password.</p>
        <form onSubmit={handleSubmit}>
          <Field label="Email" htmlFor="email" required>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            <MailQuestion size={16} /> Send reset link
          </Button>
        </form>
        <div style={{ marginTop: 18, fontSize: 13 }}>
          Remembered? <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
};