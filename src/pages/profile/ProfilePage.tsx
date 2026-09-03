import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { useEngineers, useSchools, useVisits } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ROLE_LABELS } from '../../utils/constants';
import { initials } from '../../utils/helpers';
import { addDays, startOfMonth, withinRange } from '../../utils/date';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../providers/ToastProvider';
import { Modal } from '../../components/modals/Modal';

export const ProfilePage = () => {
  const { profile, user } = useAuth();
  const { success } = useToast();
  const { data: schools = [] } = useSchools();
  const { data: visits = [] } = useVisits();
  const { data: engineers = [] } = useEngineers();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');

  useEffect(() => {
    document.title = 'My Profile | Field Operations';
  }, []);

  const myEngineerId = profile?.engineer_id ?? null;
  const myEngineer = useMemo(() => engineers.find((e) => e.id === myEngineerId) ?? null, [engineers, myEngineerId]);
  const assigned = useMemo(
    () => (myEngineer ? schools.filter((s) => s.region === myEngineer.region && s.is_active) : schools),
    [schools, myEngineer],
  );
  const monthStart = startOfMonth();
  const visitsThisMonth = visits.filter((v) => v.engineer_id === myEngineerId && withinRange(v.visit_date, monthStart, addDays(monthStart, 31)));
  const completedVisits = visitsThisMonth.filter((v) => v.status === 'completed').length;
  const completionRate = assigned.length === 0 ? 0 : Math.round((completedVisits / assigned.length) * 100);

  const submitPassword = async () => {
    if (pwd.length < 6) return;
    if (pwd !== pwdConfirm) return;
    await supabase.auth.updateUser({ password: pwd });
    success('Password updated', 'You can now sign in with your new password');
    setPwdOpen(false);
    setPwd('');
    setPwdConfirm('');
  };

  if (!profile) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <div className="page-subtitle">Personal information and performance</div>
        </div>
        <Button variant="primary" onClick={() => setPwdOpen(true)}>Change Password</Button>
      </div>

      <div className="grid grid-cols-3 mb-4">
        <Card className="col-span-1">
          <CardBody>
            <div className="flex items-center gap-3">
              <span className="avatar avatar-lg">{initials(profile.full_name)}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{profile.full_name}</div>
                <div className="text-sm text-muted">{profile.email}</div>
              </div>
            </div>
            <div className="divider" />
            <KV label="Role" value={<Badge variant="accent">{ROLE_LABELS[profile.role]}</Badge>} />
            <KV label="User ID" value={<span className="text-xs text-muted">{user?.id}</span>} />
          </CardBody>
        </Card>
        <Card className="col-span-2">
          <CardHeader title="Performance" />
          <CardBody>
            <div className="grid grid-cols-3">
              <KPI label="Assigned Schools" value={assigned.length} />
              <KPI label="Visits this month" value={visitsThisMonth.length} />
              <KPI label="Completion Rate" value={`${completionRate}%`} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="My Assigned Schools" />
        <CardBody>
          {assigned.length === 0 ? (
            <div className="text-muted text-sm">No assigned schools.</div>
          ) : (
            <div>
              {assigned.map((s) => (
                <div key={s.id} className="list-item">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted">{s.region} · {s.area}</div>
                  </div>
                  <ProgressBar value={0} showLabel />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={pwdOpen}
        title="Change Password"
        onClose={() => setPwdOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPwdOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitPassword}>Update</Button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="new_pwd">New password</label>
            <input id="new_pwd" className="input" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new_pwd_confirm">Confirm</label>
            <input id="new_pwd_confirm" className="input" type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

const KV = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span className="text-sm text-muted">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

const KPI = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
  </div>
);