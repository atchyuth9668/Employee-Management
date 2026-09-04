import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, AlertTriangle } from 'lucide-react';
import { useEscalations, useSchools, useEngineers, useCreateEscalation, useUpdateEscalation } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/modals/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ESCALATION_STATUSES, ESCALATION_URGENCIES, ESCALATION_STATUS_LABELS, ESCALATION_URGENCY_LABELS, ESCALATION_ISSUE_TYPES, ESCALATION_ISSUE_TYPE_LABELS } from '../../utils/constants';
import { formatDate, relativeFromNow } from '../../utils/date';

export const EscalationsListPage = () => {
  const { data: escalations = [], isLoading } = useEscalations();
  const { data: schools = [] } = useSchools();
  const { data: engineers = [] } = useEngineers();
  const { canManageSchools, profile } = useAuth();
  const create = useCreateEscalation();
  const update = useUpdateEscalation();
  const { success, error: showError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'progress' | 'resolve' | 'close' } | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const [form, setForm] = useState({
    school_id: '',
    issue_type: 'other' as 'missing_material' | 'undelivered_material' | 'other',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    issue_description: '',
  });

  useEffect(() => {
    document.title = 'Escalations | Field Operations';
  }, []);

  const engineerById = useMemo(() => new Map(engineers.map((e) => [e.id, e])), [engineers]);
  const schoolById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);

  const myEngineerId = profile?.engineer_id ?? null;
  const resolvedEngineerId = useMemo(() => {
    if (myEngineerId) return myEngineerId;
    if (profile?.role !== 'engineer' || !profile?.email) return null;
    const match = engineers.find((e) => e.email.toLowerCase() === profile.email.toLowerCase());
    return match?.id ?? null;
  }, [myEngineerId, profile, engineers]);

  const enriched = useMemo(
    () => escalations.map((e) => ({
      ...e,
      engineer: e.engineer ?? engineerById.get(e.engineer_id) ?? null,
    })),
    [escalations, engineerById],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enriched.filter((e) => {
      const school = schoolById.get(e.school_id);
      if (statusFilter && e.status !== statusFilter) return false;
      if (urgencyFilter && e.urgency !== urgencyFilter) return false;
      if (!term) return true;
      return (
        e.issue_description.toLowerCase().includes(term) ||
        (school?.name.toLowerCase().includes(term) ?? false) ||
        (e.engineer?.full_name.toLowerCase().includes(term) ?? false)
      );
    });
  }, [enriched, search, statusFilter, urgencyFilter, schoolById]);

  const counts = useMemo(() => {
    return {
      open: escalations.filter((e) => e.status === 'open').length,
      in_progress: escalations.filter((e) => e.status === 'in_progress').length,
      resolved: escalations.filter((e) => e.status === 'resolved').length,
      critical: escalations.filter((e) => e.urgency === 'critical' && e.status !== 'closed').length,
    };
  }, [escalations]);

  const submit = async () => {
    if (!form.school_id || !form.issue_description.trim()) {
      showError('Missing details', 'School and description are required');
      return;
    }
    if (!resolvedEngineerId) {
      showError('Engineer profile not linked', 'Your user account is not linked to an engineer record. Ask an admin to link your profile.');
      return;
    }
    try {
      await create.mutateAsync({
        school_id: form.school_id,
        engineer_id: resolvedEngineerId,
        issue_type: form.issue_type,
        urgency: form.urgency,
        issue_description: form.issue_description,
        status: 'open',
      });
      success('Escalation raised', 'Team will be notified.');
      setOpen(false);
      setForm({ school_id: '', issue_type: 'other', urgency: 'medium', issue_description: '' });
    } catch (err) {
      showError('Failed to raise escalation', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    try {
      const status = actionTarget.action === 'progress' ? 'in_progress' : actionTarget.action === 'resolve' ? 'resolved' : 'closed';
      const updates: { status: 'in_progress' | 'resolved' | 'closed'; resolution_notes?: string } = { status };
      if (actionTarget.action === 'resolve' || actionTarget.action === 'close') {
        if (!resolutionText.trim()) {
          showError('Resolution notes required', 'Provide resolution notes');
          return;
        }
        updates.resolution_notes = resolutionText;
      }
      await update.mutateAsync({ id: actionTarget.id, updates });
      success('Escalation updated', 'Saved successfully');
      setActionTarget(null);
      setResolutionText('');
    } catch (err) {
      showError('Update failed', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Escalations</h1>
          <div className="page-subtitle">Issues raised by the field team</div>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus size={14} /> Raise Escalation
        </Button>
      </div>

      <div className="grid grid-cols-4 mb-4">
        <SummaryCard label="Open" value={counts.open} variant="danger" />
        <SummaryCard label="In Progress" value={counts.in_progress} variant="warning" />
        <SummaryCard label="Resolved" value={counts.resolved} variant="success" />
        <SummaryCard label="Critical" value={counts.critical} variant="critical" />
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <Field label="Search" style={{ marginBottom: 0, flex: 1 }}>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by description or school" />
            </Field>
            <Field label="Status" style={{ marginBottom: 0 }}>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                {ESCALATION_STATUSES.map((s) => <option key={s} value={s}>{ESCALATION_STATUS_LABELS[s]}</option>)}
              </Select>
            </Field>
            <Field label="Urgency" style={{ marginBottom: 0 }}>
              <Select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
                <option value="">All</option>
                {ESCALATION_URGENCIES.map((u) => <option key={u} value={u}>{ESCALATION_URGENCY_LABELS[u]}</option>)}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`${filtered.length} escalation${filtered.length === 1 ? '' : 's'}`} />
        <div className="table-wrap">
          {isLoading ? (
            <div style={{ padding: 16 }}><Skeleton style={{ height: 60 }} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<AlertTriangle size={26} />} title="No escalations" description="All clear." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>School</th>
                  <th>Engineer</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const school = schoolById.get(e.school_id);
                  const rowStyle = e.urgency === 'critical' && e.status !== 'closed' ? { background: 'rgba(220, 38, 38, 0.05)' } : undefined;
                  return (
                    <tr key={e.id} style={rowStyle}>
                      <td title={formatDate(e.created_at)}>{relativeFromNow(e.created_at)}</td>
                      <td>{school?.name ?? '—'} <span className="text-xs text-muted">({school?.region ?? ''})</span></td>
                      <td>{e.engineer?.full_name ?? '—'}</td>
                      <td>{ESCALATION_ISSUE_TYPE_LABELS[e.issue_type]}</td>
                      <td className="truncate" style={{ maxWidth: 260 }}>{e.issue_description}</td>
                      <td><Badge variant={e.urgency === 'critical' ? 'danger' : e.urgency === 'high' ? 'warning' : 'info'}>{ESCALATION_URGENCY_LABELS[e.urgency]}</Badge></td>
                      <td><Badge variant={e.status === 'closed' ? 'neutral' : e.status === 'resolved' ? 'success' : 'info'}>{ESCALATION_STATUS_LABELS[e.status]}</Badge></td>
                      <td>
                        <div className="flex gap-1">
                          <Link to={`/escalations/${e.id}`}><Button size="sm" variant="ghost">View</Button></Link>
                          {canManageSchools && e.status === 'open' && (
                            <Button size="sm" variant="secondary" onClick={() => setActionTarget({ id: e.id, action: 'progress' })}>Start</Button>
                          )}
                          {canManageSchools && (e.status === 'open' || e.status === 'in_progress') && (
                            <Button size="sm" variant="success" onClick={() => setActionTarget({ id: e.id, action: 'resolve' })}>Resolve</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        open={open}
        title="Raise Escalation"
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit} loading={create.isPending}>Submit</Button>
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
        </div>
        <div className="form-row">
          <Field label="Issue type">
            <Select value={form.issue_type} onChange={(e) => setForm({ ...form, issue_type: e.target.value as 'missing_material' | 'undelivered_material' | 'other' })}>
              {ESCALATION_ISSUE_TYPES.map((t) => <option key={t} value={t}>{ESCALATION_ISSUE_TYPE_LABELS[t]}</option>)}
            </Select>
          </Field>
          <Field label="Urgency">
            <Select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}>
              {ESCALATION_URGENCIES.map((u) => <option key={u} value={u}>{ESCALATION_URGENCY_LABELS[u]}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Description" required>
          <Textarea value={form.issue_description} onChange={(e) => setForm({ ...form, issue_description: e.target.value })} placeholder="Describe the issue" />
        </Field>
      </Modal>

      <Modal
        open={!!actionTarget}
        title="Update escalation"
        onClose={() => { setActionTarget(null); setResolutionText(''); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setActionTarget(null); setResolutionText(''); }}>Cancel</Button>
            <Button variant="primary" onClick={handleAction} loading={update.isPending}>Confirm</Button>
          </>
        }
      >
        {actionTarget?.action === 'resolve' || actionTarget?.action === 'close' ? (
          <Field label="Resolution notes" required>
            <Textarea value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} placeholder="How was this resolved?" />
          </Field>
        ) : (
          <p>Move this escalation to in progress?</p>
        )}
      </Modal>
    </div>
  );
};

const SummaryCard = ({ label, value, variant }: { label: string; value: number; variant: 'danger' | 'warning' | 'success' | 'critical' }) => {
  const bg = variant === 'critical' ? 'var(--danger)' : variant === 'danger' ? 'var(--danger-soft)' : variant === 'warning' ? 'var(--warning-soft)' : 'var(--success-soft)';
  const color = variant === 'critical' ? '#fff' : variant === 'danger' ? '#991b1b' : variant === 'warning' ? '#92400e' : '#166534';
  return (
    <div className="card card-pad" style={{ background: bg, color }}>
      <div className="text-xs uppercase font-semibold" style={{ opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
};