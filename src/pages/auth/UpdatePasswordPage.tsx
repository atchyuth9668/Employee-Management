import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../providers/ToastProvider';
import { Field, Input } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';

export const UpdatePasswordPage = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Update password | Field Operations';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showError('Weak password', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      showError('Mismatch', 'Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      showError('Update failed', error.message);
      return;
    }
    success('Password updated', 'You can now use your new password.');
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
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Set new password</h1>
        <p className="text-sm text-muted mb-4">Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit}>
          <Field label="New password" htmlFor="password" required>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Field label="Confirm password" htmlFor="confirm" required>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
};