import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useVisits, useSchools, useEngineers, useCreateVisit, useUpdateVisitStatus } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/modals/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { VISIT_STATUSES, VISIT_STATUS_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/date';

export const VisitsListPage = () => {
  const { user, canAssignVisits, profile } = useAuth();
  const { data: visits = [], isLoading } = useVisits();
  const { data: schools = [] } = useSchools();
  const { data: engineers = [] } = useEngineers();
  const { success, error: showError } = useToast();
  const createVisit = useCreateVisit();
  const updateStatus = useUpdateVisitStatus();
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'accept' | 'reject' | 'cancel' | 'complete' } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const [form, setForm] = useState({
    school_id: '',
    engineer_id: '',
    visit_date: '',
    next_visit_due: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    document.title = 'Visits | Field Operations';
  }, []);

  const schoolById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);
  const engineerById = useMemo(() => new Map(engineers.map((e) => [e.id, e])), [engineers]);

  const myEngineerId = profile?.engineer_id ?? null;
  const resolvedEngineerId = useMemo(() => {
    if (myEngineerId) return myEngineerId;
    if (profile?.role !== 'engineer' || !profile?.email) return null;
    const match = engineers.find((e) => e.email.toLowerCase() === profile.email.toLowerCase());
    return match?.id ?? null;
  }, [myEngineerId, profile, engineers]);
  const scoped = useMemo(() => {
    if (profile?.role === 'engineer' && resolvedEngineerId) {
      return visits.filter((v) => v.engineer_id === resolvedEngineerId);
    }
    return visits;
  }, [visits, profile, resolvedEngineerId]);

  const filtered = useMemo(() => {
    if (!statusFilter) return scoped;
    return scoped.filter((v) => v.status === statusFilter);
  }, [scoped, statusFilter]);

  const openAssign = () => {
    setForm({ school_id: '', engineer_id: '', visit_date: '', next_visit_due: '', reason: '', notes: '' });
    setOpen(true);
  };

  const submitAssign = async () => {
    if (!form.school_id || !form.engineer_id || !form.visit_date || !form.reason.trim()) {
      showError('Missing details', 'School, engineer, date, and reason are required');
      return;
    }
    try {
      await createVisit.mutateAsync({
        school_id: form.school_id,
        engineer_id: form.engineer_id,
        visit_date: form.visit_date,
        next_visit_due: form.next_visit_due || null,
        reason: form.reason,
        notes: form.notes || null,
        status: 'scheduled',
        checklist_items: [],
        created_by: user?.id ?? null,
      } as Parameters<typeof createVisit.mutateAsync>[0]);
      success('Visit assigned', 'Engineer will be notified');
      setOpen(false);
    } catch (err) {
      showError('Failed to assign visit', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    try {
      const reason = reasonText.trim() || undefined;
      await updateStatus.mutateAsync({ id: actionTarget.id, status: actionTarget.action === 'accept' ? 'accepted' : actionTarget.action === 'reject' ? 'rejected' : actionTarget.action === 'cancel' ? 'cancelled' : 'completed', reason });
      success(`Visit ${actionTarget.action}ed`, 'Updated successfully');
      setActionTarget(null);
      setReasonText('');
    } catch (err) {
      showError('Update failed', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Visits</h1>
          <div className="page-subtitle">Schedule, accept, and complete school visits</div>
        </div>
        {canAssignVisits && (
          <Button variant="primary" onClick={openAssign}>
            <Plus size={14} /> Assign Visit
          </Button>
        )}
      </div>

      <Card className="mb-4">
        <CardBody>
          <Field label="Filter by status" style={{ marginBottom: 0, maxWidth: 240 }}>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {VISIT_STATUSES.map((s) => <option key={s} value={s}>{VISIT_STATUS_LABELS[s]}</option>)}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`${filtered.length} visit${filtered.length === 1 ? '' : 's'}`} />
        <div className="table-wrap">
          {isLoading ? (
            <div style={{ padding: 16 }}><Skeleton style={{ height: 60 }} /></div>
          ) : filtered.length === 0 ? (
            profile?.role === 'engineer' && !profile?.engineer_id ? (
              <EmptyState
                title="Engineer profile not linked"
                description="Your user account is not linked to an engineer record. Ask an admin to link your auth user to your engineer profile so visits assigned to you will appear here."
              />
            ) : (
              <EmptyState title="No visits yet" description="Assign a visit to get started." />
            )
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>School</th>
                  {profile?.role !== 'engineer' && <th>Engineer</th>}
                  <th>Reason</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>{formatDate(v.visit_date)}</td>
                    <td>{schoolById.get(v.school_id)?.name ?? '—'}</td>
                    {profile?.role !== 'engineer' && (
                      <td>{engineerById.get(v.engineer_id)?.full_name ?? '—'}</td>
                    )}
                    <td className="truncate" style={{ maxWidth: 200 }}>{v.reason}</td>
                    <td><Badge variant={v.status === 'completed' ? 'success' : v.status === 'rejected' || v.status === 'cancelled' ? 'danger' : 'info'}>{VISIT_STATUS_LABELS[v.status]}</Badge></td>
                    <td>
                      <div className="flex gap-1">
                        <Link to={`/visits/${v.id}`}><Button size="sm" variant="ghost">View</Button></Link>
                        {v.status === 'scheduled' && v.engineer_id === resolvedEngineerId && (
                          <>
                            <Button size="sm" variant="success" onClick={() => setActionTarget({ id: v.id, action: 'accept' })}>Accept</Button>
                            <Button size="sm" variant="danger" onClick={() => setActionTarget({ id: v.id, action: 'reject' })}>Reject</Button>
                          </>
                        )}
                        {v.status === 'accepted' && v.engineer_id === resolvedEngineerId && (
                          <Button size="sm" variant="primary" onClick={() => setActionTarget({ id: v.id, action: 'complete' })}>Complete</Button>
                        )}
                        {canAssignVisits && (v.status === 'scheduled' || v.status === 'accepted') && (
                          <Button size="sm" variant="ghost" onClick={() => setActionTarget({ id: v.id, action: 'cancel' })}>Cancel</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        open={open}
        title="Assign Visit"
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitAssign} loading={createVisit.isPending}>Assign</Button>
          </>
        }
      >
        <div className="form-row">
          <Field label="School" required>
            <Select value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })}>
              <option value="">Select school</option>
              {schools.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Engineer" required>
            <Select value={form.engineer_id} onChange={(e) => setForm({ ...form, engineer_id: e.target.value })}>
              <option value="">Select engineer</option>
              {engineers.filter((e) => e.is_active).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Visit date" required>
            <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
          </Field>
          <Field label="Next visit due">
            <Input type="date" value={form.next_visit_due} onChange={(e) => setForm({ ...form, next_visit_due: e.target.value })} />
          </Field>
        </div>
        <Field label="Reason" required>
          <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </Modal>

      <Modal
        open={!!actionTarget}
        title={`${actionTarget?.action ? actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1) : ''} visit`}
        onClose={() => { setActionTarget(null); setReasonText(''); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setActionTarget(null); setReasonText(''); }}>Cancel</Button>
            <Button variant={actionTarget?.action === 'reject' || actionTarget?.action === 'cancel' ? 'danger' : 'primary'} onClick={handleAction} loading={updateStatus.isPending}>Confirm</Button>
          </>
        }
      >
        {(actionTarget?.action === 'reject' || actionTarget?.action === 'cancel') && (
          <Field label="Reason" required>
            <Textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="Provide a reason" />
          </Field>
        )}
        {actionTarget?.action === 'accept' && <p>Mark this visit as accepted?</p>}
        {actionTarget?.action === 'complete' && <p>Mark this visit as completed?</p>}
      </Modal>
    </div>
  );
};