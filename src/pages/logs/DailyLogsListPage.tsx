import { useEffect, useMemo, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useDailyLogs, useSchools, useEngineers, useCreateDailyLog, useApproveDailyLog } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/modals/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ACTIVITY_LABELS, ACTIVITY_TYPES } from '../../utils/constants';
import { formatDate, formatTime, isoDateOnly } from '../../utils/date';

export const DailyLogsListPage = () => {
  const { profile, canApproveLogs } = useAuth();
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: schools = [] } = useSchools();
  const { data: engineers = [] } = useEngineers();
  const approveLog = useApproveDailyLog();
  const { success, error: showError } = useToast();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = 'Daily Logs | Field Operations';
  }, []);

  const engineerById = useMemo(() => new Map(engineers.map((e) => [e.id, e])), [engineers]);
  const schoolById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);
  const myEngineerId = profile?.engineer_id ?? null;
  const scoped = useMemo(() => {
    if (profile?.role === 'engineer' && myEngineerId) {
      return logs.filter((l) => l.engineer_id === myEngineerId);
    }
    return logs;
  }, [logs, profile, myEngineerId]);

  const handleApprove = async (id: string, approve: boolean, engineerId: string) => {
    if (engineerId === profile?.engineer_id) {
      showError('Not allowed', 'You cannot approve your own daily log');
      return;
    }
    try {
      await approveLog.mutateAsync({ id, approvedBy: profile?.id ?? '', approve });
      success(approve ? 'Log approved' : 'Log rejected', 'Updated successfully');
    } catch (err) {
      showError('Action failed', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Logs</h1>
          <div className="page-subtitle">Track daily activities across the field</div>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus size={14} /> Log Today
        </Button>
      </div>

      <Card>
        <CardHeader title={`${scoped.length} log${scoped.length === 1 ? '' : 's'}`} />
        <div className="table-wrap">
          {isLoading ? (
            <div style={{ padding: 16 }}><Skeleton style={{ height: 60 }} /></div>
          ) : scoped.length === 0 ? (
            <EmptyState title="No logs yet" description="Start by logging today's activities." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Engineer</th>
                  <th>Activity</th>
                  <th>School</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {scoped.map((l) => (
                  <tr key={l.id}>
                    <td>{formatDate(l.log_date)}</td>
                    <td>{engineerById.get(l.engineer_id)?.full_name ?? '—'}</td>
                    <td><Badge variant={l.activity_type === 'school_visit' ? 'accent' : 'neutral'}>{ACTIVITY_LABELS[l.activity_type]}</Badge></td>
                    <td>{l.school_id ? schoolById.get(l.school_id)?.name ?? '—' : '—'}</td>
                    <td>{formatTime(l.start_time)} – {formatTime(l.end_time)}</td>
                    <td>
                      {l.is_approved ? <Badge variant="success">Approved</Badge> : <Badge variant="warning">Pending</Badge>}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {canApproveLogs && l.engineer_id !== myEngineerId && !l.is_approved && (
                          <>
                            <Button size="sm" variant="success" onClick={() => handleApprove(l.id, true, l.engineer_id)} aria-label="Approve"><Check size={12} /></Button>
                            <Button size="sm" variant="danger" onClick={() => handleApprove(l.id, false, l.engineer_id)} aria-label="Reject"><X size={12} /></Button>
                          </>
                        )}
                        {l.rejection_reason && <span className="text-xs text-muted">Rejected: {l.rejection_reason}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <LogModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export const LogCreateModal = ({ open, onClose, defaultEngineerId }: { open: boolean; onClose: () => void; defaultEngineerId?: string }) => {
  return <LogModal open={open} onClose={onClose} defaultEngineerId={defaultEngineerId} />;
};

const LogModal = ({ open, onClose, defaultEngineerId }: { open: boolean; onClose: () => void; defaultEngineerId?: string }) => {
  const { profile, canApproveLogs } = useAuth();
  const { data: schools = [] } = useSchools();
  const { data: engineers = [] } = useEngineers();
  const create = useCreateDailyLog();
  const { success, error: showError } = useToast();
  const [form, setForm] = useState({
    engineer_id: defaultEngineerId ?? profile?.engineer_id ?? '',
    school_id: '',
    log_date: isoDateOnly(),
    activity_type: 'school_visit',
    start_time: '',
    end_time: '',
    activities_done: '',
    notes: '',
  });

  useEffect(() => {
    if (defaultEngineerId) setForm((f) => ({ ...f, engineer_id: defaultEngineerId }));
  }, [defaultEngineerId]);

  const submit = async () => {
    if (!form.engineer_id || !form.activities_done.trim()) {
      showError('Missing details', 'Engineer and activities done are required');
      return;
    }
    if (form.activity_type === 'school_visit' && !form.school_id) {
      showError('School required', 'School is required for school visit activity');
      return;
    }
    try {
      await create.mutateAsync({
        engineer_id: form.engineer_id,
        school_id: form.activity_type === 'school_visit' ? form.school_id : null,
        log_date: form.log_date,
        activity_type: form.activity_type as 'school_visit' | 'work_from_home' | 'leave' | 'holiday' | 'other',
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        activities_done: form.activities_done,
        notes: form.notes || null,
      });
      success('Log created', 'Saved successfully');
      onClose();
    } catch (err) {
      showError('Failed to create log', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <Modal
      open={open}
      title="Log Activity"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={create.isPending}>Save</Button>
        </>
      }
    >
      <div className="form-row">
        {canApproveLogs && (
          <Field label="Engineer" required>
            <Select value={form.engineer_id} onChange={(e) => setForm({ ...form, engineer_id: e.target.value })}>
              <option value="">Select engineer</option>
              {engineers.filter((e) => e.is_active).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Date" required>
          <Input type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Activity type" required>
          <Select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
            {ACTIVITY_TYPES.map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
          </Select>
        </Field>
        {form.activity_type === 'school_visit' && (
          <Field label="School" required>
            <Select value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })}>
              <option value="">Select school</option>
              {schools.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}
      </div>
      <div className="form-row">
        <Field label="Start time"><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></Field>
        <Field label="End time"><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></Field>
      </div>
      <Field label="Activities done" required>
        <Textarea value={form.activities_done} onChange={(e) => setForm({ ...form, activities_done: e.target.value })} placeholder="What was done today?" />
      </Field>
      <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
    </Modal>
  );
};