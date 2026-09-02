import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, Select } from '../../components/ui/Form';
import { useAuth } from '../../providers/AuthProvider';
import { useConnection } from '../../providers/ConnectionProvider';
import { Badge } from '../../components/ui/Badge';
import { ROLE_LABELS } from '../../utils/constants';
import { isSupabaseConfigured } from '../../lib/supabase';

export const SettingsPage = () => {
  const { profile, user } = useAuth();
  const { state } = useConnection();
  const [region, setRegion] = useState('Andhra Pradesh');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.title = 'Settings | Field Operations';
  }, []);

  const save = async () => {
    setSaving(true);
    localStorage.setItem('fop.preferredRegion', region);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 400);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-subtitle">Platform preferences and diagnostics</div>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader title="Preferences" />
        <CardBody>
          <Field label="Preferred region">
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option>Andhra Pradesh</option>
              <option>Telangana</option>
            </Select>
          </Field>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save preferences'}
          </button>
          {saved && <span style={{ marginLeft: 12, color: 'var(--success)', fontSize: 13 }}>Saved</span>}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Account" />
        <CardBody>
          <KV label="Name" value={profile?.full_name ?? '—'} />
          <KV label="Email" value={profile?.email ?? user?.email ?? '—'} />
          <KV label="Role" value={profile ? <Badge variant="accent">{ROLE_LABELS[profile.role]}</Badge> : '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Diagnostics" />
        <CardBody>
          <KV label="Supabase configured" value={isSupabaseConfigured() ? <Badge variant="success">Yes</Badge> : <Badge variant="danger">Missing env vars</Badge>} />
          <KV label="Connection" value={<Badge variant={state === 'connected' ? 'success' : 'warning'}>{state}</Badge>} />
          <KV label="Supabase URL" value={<span className="text-xs">{isSupabaseConfigured() ? '•••• configured' : 'Not set'}</span>} />
        </CardBody>
      </Card>
    </div>
  );
};

const KV = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span className="text-sm text-muted">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);