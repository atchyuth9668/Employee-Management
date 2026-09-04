import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, X, Check } from 'lucide-react';
import { useLeaves, useEngineers, useCreateLeave, useDecideLeave, useCancelLeave } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/modals/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, isoDateOnly } from '../../utils/date';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};
const STATUS_VARIANT: Record<string, 'info' | 'success' | 'danger' | 'neutral' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export const LeavesPage = () => {
  const { profile, canManageSchools, user } = useAuth();
  const { data: leaves = [], isLoading } = useLeaves();
  const { data: engineers = [] } = useEngineers();
  const create = useCreateLeave();
  const decide = useDecideLeave();
  const cancel = useCancelLeave();
  const { success, error: showError } = useToast();
  const [applyOpen, setApplyOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<{ id: string; decision: 'approved' | 'rejected' } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  const myEngineerId = profile?.engineer_id ?? null;
  const resolvedEngineerId = useMemo(() => {
    if (myEngineerId) return myEngineerId;
    if (profile?.role !== 'engineer' || !profile?.email) return null;
    return engineers.find((e) => e.email.toLowerCase() === profile.email.toLowerCase())?.id ?? null;
  }, [myEngineerId, profile, engineers]);

  const engineerById = useMemo(() => new Map(engineers.map((e) => [e.id, e])), [engineers]);

  const scoped = useMemo(() => {
    if (!canManageSchools && resolvedEngineerId) {
      return leaves.filter((l) => l.engineer_id === resolvedEngineerId);
    }
    return leaves;
  }, [leaves, canManageSchools, resolvedEngineerId]);

  const pending = scoped.filter((l) => l.status === 'pending');
  const decided = scoped.filter((l) => l.status !== 'pending');

  useEffect(() => {
    document.title = 'Leaves | Field Operations';
  }, []);

  const submitApply = async (input: { start_date: string; end_date: string; reason: string }) => {
    if (!resolvedEngineerId) {
      showError('Engineer profile not linked', 'Your user account is not linked to an engineer record. Ask an admin to link your profile.');
      return;
    }
    try {
      await create.mutateAsync({ engineer_id: resolvedEngineerId, ...input });
      success('Leave applied', 'Admin will be notified to review.');
      setApplyOpen(false);
    } catch (err) {
      showError('Failed to apply', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const handleDecision = async () => {
    if (!decisionTarget) return;
    try {
      await decide.mutateAsync({
        id: decisionTarget.id,
        decision: decisionTarget.decision,
        decidedBy: user?.id ?? '',
        decisionNote: decisionNote.trim() || undefined,
      });
      success(`Leave ${decisionTarget.decision}`, decisionTarget.decision === 'approved' ? 'Leave days added to daily logs.' : 'Request rejected.');
      setDecisionTarget(null);
      setDecisionNote('');
    } catch (err) {
      showError('Failed to update', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id);
      success('Leave cancelled', 'Your leave request was cancelled.');
    } catch (err) {
      showError('Failed to cancel', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const renderRow = (l: typeof scoped[number]) => {
    const eng = engineerById.get(l.engineer_id);
    return (
      <tr key={l.id}>
        <td>{formatDate(l.start_date)}{l.start_date !== l.end_date ? ` – ${formatDate(l.end_date)}` : ''}</td>
        {canManageSchools && <td>{eng?.full_name ?? '—'}</td>}
        <td className="truncate" style={{ maxWidth: 260 }}>{l.reason}</td>
        <td><Badge variant={STATUS_VARIANT[l.status] ?? 'neutral'}>{STATUS_LABELS[l.status] ?? l.status}</Badge></td>
        <td className="text-xs text-muted">{l.decision_note ? `Note: ${l.decision_note}` : '—'}</td>
        <td>
          <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
            {canManageSchools && l.status === 'pending' && (
              <>
                <Button size="sm" variant="success" onClick={() => setDecisionTarget({ id: l.id, decision: 'approved' })}><Check size={12} /> Approve</Button>
                <Button size="sm" variant="danger" onClick={() => setDecisionTarget({ id: l.id, decision: 'rejected' })}><X size={12} /> Reject</Button>
              </>
            )}
            {!canManageSchools && l.status === 'pending' && l.engineer_id === resolvedEngineerId && (
              <Button size="sm" variant="ghost" onClick={() => handleCancel(l.id)} loading={cancel.isPending}>Cancel</Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leaves</h1>
          <div className="page-subtitle">{canManageSchools ? 'Review and decide on engineer leave requests' : 'Apply for leave and track its status'}</div>
        </div>
        {!canManageSchools && resolvedEngineerId && (
          <Button variant="primary" onClick={() => setApplyOpen(true)}>
            <CalendarCheck size={14} /> Apply for Leave
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader title={`Pending (${pending.length})`} />
            <CardBody>
              {pending.length === 0 ? (
                <EmptyState title="No pending requests" description="All caught up." />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Dates</th>
                        {canManageSchools && <th>Engineer</th>}
                        <th>Reason</th>
                        <th>Status</th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>{pending.map(renderRow)}</tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`History (${decided.length})`} />
            <CardBody>
              {decided.length === 0 ? (
                <div className="text-muted text-sm">No decided requests yet</div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Dates</th>
                        {canManageSchools && <th>Engineer</th>}
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Note</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>{decided.map(renderRow)}</tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <ApplyLeaveModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onSubmit={submitApply}
        loading={create.isPending}
      />

      <Modal
        open={!!decisionTarget}
        title={decisionTarget?.decision === 'approved' ? 'Approve leave' : 'Reject leave'}
        onClose={() => { setDecisionTarget(null); setDecisionNote(''); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDecisionTarget(null); setDecisionNote(''); }}>Cancel</Button>
            <Button
              variant={decisionTarget?.decision === 'approved' ? 'success' : 'danger'}
              onClick={handleDecision}
              loading={decide.isPending}
            >
              Confirm {decisionTarget?.decision === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <Field label="Note (optional)">
          <Textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} placeholder="Add a note for the engineer" />
        </Field>
        {decisionTarget?.decision === 'approved' && (
          <div className="callout callout-info mt-2">
            Approving this leave will add a 'Leave' entry to the engineer's Daily Logs for each day in the range.
          </div>
        )}
      </Modal>
    </div>
  );
};

const ApplyLeaveModal = ({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { start_date: string; end_date: string; reason: string }) => Promise<void> | void;
  loading: boolean;
}) => {
  const today = isoDateOnly();
  const [form, setForm] = useState({ start_date: today, end_date: today, reason: '' });

  useEffect(() => {
    if (open) {
      setForm({ start_date: today, end_date: today, reason: '' });
    }
  }, [open, today]);

  const submit = async () => {
    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      title="Apply for Leave"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={loading}>Submit</Button>
        </>
      }
    >
      <div className="form-row">
        <Field label="From" required>
          <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </Field>
        <Field label="To" required>
          <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </Field>
      </div>
      <Field label="Reason" required>
        <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Personal work, sick leave, family function" />
      </Field>
    </Modal>
  );
};
