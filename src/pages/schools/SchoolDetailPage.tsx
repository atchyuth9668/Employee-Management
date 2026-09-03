import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, AlertTriangle, CalendarCheck, Pencil } from 'lucide-react';
import { useSchool, useUpdateSchool, useSchoolChecklist, useUpdateChecklistItem, useVisits, useEscalations, useEngineers, useCreateVisit, useCreateEscalation } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/modals/Modal';
import type { ChecklistKey } from '../../types';
import { ESCALATION_URGENCIES, ESCALATION_ISSUE_TYPES, ESCALATION_ISSUE_TYPE_LABELS, ESCALATION_URGENCY_LABELS } from '../../utils/constants';

const checklistItems: { key: ChecklistKey; label: string }[] = [
  { key: 'component_verified', label: 'Component Verified' },
  { key: 'initial_teacher_training', label: 'Initial Teacher Training' },
  { key: 'teachers_lms', label: 'Teachers LMS Access' },
  { key: 'students_lms', label: 'Students LMS Access' },
  { key: 'lab_setup', label: 'Lab Setup Complete' },
  { key: 'feedback_form', label: 'Feedback Form Submitted' },
];

type Tab = 'overview' | 'checklist' | 'visits' | 'timeline';

export const SchoolDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManageSchools } = useAuth();
  const { error: showError } = useToast();
  const { data: school, isLoading } = useSchool(id);
  const { data: checklist, isLoading: cl } = useSchoolChecklist(id);
  const { data: visits = [] } = useVisits();
  const { data: escalations = [] } = useEscalations();
  const { data: engineers = [] } = useEngineers();
  const updateChecklist = useUpdateChecklistItem();

  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  useEffect(() => {
    document.title = school ? `${school.name} | Field Operations` : 'School | Field Operations';
  }, [school]);

  const engineer = useMemo(() => engineers.find((e) => e.id === school?.assigned_engineer_id) ?? null, [engineers, school]);
  const schoolVisits = useMemo(() => visits.filter((v) => v.school_id === id), [visits, id]);
  const schoolEscalations = useMemo(() => escalations.filter((e) => e.school_id === id), [escalations, id]);

  const openMaps = () => {
    if (!school) return;
    if (school.maps_link) {
      window.open(school.maps_link, '_blank', 'noopener,noreferrer');
    } else if (school.latitude !== null && school.longitude !== null) {
      window.open(`https://www.google.com/maps?q=${school.latitude},${school.longitude}`, '_blank', 'noopener,noreferrer');
    } else {
      showError('No location', 'Add a Google Maps link or coordinates to open the location.');
    }
  };

  const toggleChecklist = async (key: ChecklistKey, done: boolean) => {
    if (!id) return;
    try {
      await updateChecklist.mutateAsync({ schoolId: id, key, done });
    } catch (err) {
      showError('Could not update checklist', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  if (isLoading || !school) {
    return (
      <div>
        <Skeleton style={{ height: 24, width: 200, marginBottom: 12 }} />
        <Skeleton style={{ height: 240 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </Button>
        <h1 className="page-title" style={{ margin: 0 }}>{school.name}</h1>
        <Badge variant={school.is_active ? 'success' : 'neutral'}>{school.is_active ? 'Active' : 'Inactive'}</Badge>
      </div>
      <div className="page-subtitle mb-4">{school.region} · {school.area}</div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Button variant="secondary" onClick={openMaps}>
          <MapPin size={14} /> Open Maps
        </Button>
        <Button variant="secondary" onClick={() => setEscalationOpen(true)}>
          <AlertTriangle size={14} /> Report Issue
        </Button>
        {canManageSchools && (
          <Button variant="secondary" onClick={() => setVisitOpen(true)}>
            <CalendarCheck size={14} /> Assign Visit
          </Button>
        )}
        {canManageSchools && (
          <Link to={`/schools/${school.id}/edit`}>
            <Button variant="secondary">
              <Pencil size={14} /> Edit
            </Button>
          </Link>
        )}
      </div>

      <div className="tabs mb-4">
        {(['overview', 'checklist', 'visits', 'timeline'] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-3">
          <Card>
            <CardHeader title="School Information" />
            <CardBody>
              <KV label="Name" value={school.name} />
              <KV label="Region" value={school.region} />
              <KV label="Area" value={school.area} />
              <KV label="Location" value={school.location} />
              {school.latitude !== null && school.longitude !== null && (
                <KV label="Coordinates" value={`${school.latitude}, ${school.longitude}`} />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="SPOC" />
            <CardBody>
              <KV label="SPOC Name" value={school.spoc_name} />
              <KV label="Contact" value={school.spoc_contact} />
              {canManageSchools && (
                <KV label="Assigned Engineer" value={engineer?.full_name ?? 'Unassigned'} />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Setup Progress" />
            <CardBody>
              <div className="kpi-value">{checklist?.completion_percentage ?? 0}%</div>
              <ProgressBar value={checklist?.completion_percentage ?? 0} showLabel />
              <div className="divider" />
              <KV label="Visits" value={String(schoolVisits.length)} />
              <KV label="Completed visits" value={String(schoolVisits.filter((v) => v.status === 'completed').length)} />
              <KV label="Escalations" value={String(schoolEscalations.length)} />
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'checklist' && (
        <Card>
          <CardHeader title="Checklist" actions={<span className="text-sm text-muted">{checklist?.completion_percentage ?? 0}% complete</span>} />
          <CardBody>
            {cl ? <Skeleton style={{ height: 120 }} /> : (
              <div>
                {checklistItems.map((item) => {
                  const dateKey = `${item.key}_date` as keyof typeof checklist;
                  const done = (checklist as Record<string, unknown> | null)?.[item.key] as boolean ?? false;
                  const date = ((checklist as Record<string, unknown> | null)?.[dateKey] as string | null) ?? null;
                  return (
                    <label key={item.key} className="list-item" style={{ cursor: 'pointer' }}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={done}
                          onChange={(e) => toggleChecklist(item.key, e.target.checked)}
                          aria-label={item.label}
                        />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs text-muted">{date ? `Completed on ${date}` : 'Pending'}</div>
                        </div>
                      </div>
                      {done ? <Badge variant="success">Done</Badge> : <Badge variant="neutral">Pending</Badge>}
                    </label>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'visits' && (
        <Card>
          <CardHeader title={`Visits (${schoolVisits.length})`} />
          <CardBody>
            {schoolVisits.length === 0 ? (
              <div className="text-muted text-sm">No visits yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolVisits.map((v) => (
                      <tr key={v.id}>
                        <td>{v.visit_date}</td>
                        <td>{v.reason}</td>
                        <td><Badge variant={v.status === 'completed' ? 'success' : v.status === 'rejected' || v.status === 'cancelled' ? 'danger' : 'info'}>{v.status}</Badge></td>
                        <td className="truncate" style={{ maxWidth: 220 }}>{v.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'timeline' && (
        <Card>
          <CardHeader title="Activity Timeline" />
          <CardBody>
            <Timeline
              items={[
                ...schoolVisits.map((v) => ({
                  id: `visit-${v.id}`,
                  date: v.visit_date,
                  title: `Visit ${v.status}`,
                  description: v.reason,
                })),
                ...schoolEscalations.map((e) => ({
                  id: `esc-${e.id}`,
                  date: e.created_at,
                  title: `Escalation ${e.status}`,
                  description: e.issue_description,
                })),
              ]}
            />
          </CardBody>
        </Card>
      )}

      <SchoolEditModal open={editOpen} schoolId={id} onClose={() => setEditOpen(false)} />

      <EscalationModal
        open={escalationOpen}
        onClose={() => setEscalationOpen(false)}
        schoolId={id}
        engineerId={engineer?.id ?? ''}
      />

      <VisitAssignModal
        open={visitOpen}
        onClose={() => setVisitOpen(false)}
        schoolId={id}
        defaultEngineerId={engineer?.id ?? ''}
      />
    </div>
  );
};

const KV = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span className="text-sm text-muted">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

const Timeline = ({ items }: { items: { id: string; date: string; title: string; description?: string | null }[] }) => {
  if (items.length === 0) return <div className="text-muted text-sm">No activity yet.</div>;
  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div>
      {sorted.map((it) => (
        <div key={it.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <div className="text-xs text-muted">{new Date(it.date).toLocaleString()}</div>
          <div className="font-medium">{it.title}</div>
          {it.description && <div className="text-sm text-muted">{it.description}</div>}
        </div>
      ))}
    </div>
  );
};

const SchoolEditModal = ({ open, schoolId, onClose }: { open: boolean; schoolId: string; onClose: () => void }) => {
  const { data: school } = useSchool(schoolId);
  const { data: engineers = [] } = useEngineers();
  const { canManageSchools } = useAuth();
  const update = useUpdateSchool();
  const { success, error: showError } = useToast();
  const [form, setForm] = useState({
    name: '',
    spoc_name: '',
    spoc_contact: '',
    location: '',
    area: '',
    maps_link: '',
    assigned_engineer_id: '',
  });

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name,
        spoc_name: school.spoc_name,
        spoc_contact: school.spoc_contact,
        location: school.location,
        area: school.area,
        maps_link: school.maps_link ?? '',
        assigned_engineer_id: school.assigned_engineer_id ?? '',
      });
    }
  }, [school]);

  if (!school) return null;
  const submit = async () => {
    try {
      const updates: Record<string, unknown> = {
        name: form.name,
        spoc_name: form.spoc_name,
        spoc_contact: form.spoc_contact,
        location: form.location,
        area: form.area,
        maps_link: form.maps_link || null,
      };
      if (canManageSchools) {
        updates.assigned_engineer_id = form.assigned_engineer_id || null;
      }
      await update.mutateAsync({ id: schoolId, updates });
      success('School updated', 'Changes saved successfully');
      onClose();
    } catch (err) {
      showError('Update failed', err instanceof Error ? err.message : 'Unexpected error');
    }
  };
  return (
    <Modal
      open={open}
      title="Edit School"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={update.isPending}>Save</Button>
        </>
      }
    >
      <div className="form-row">
        <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Area"><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></Field>
      </div>
      <div className="form-row">
        <Field label="SPOC name"><Input value={form.spoc_name} onChange={(e) => setForm({ ...form, spoc_name: e.target.value })} /></Field>
        <Field label="SPOC contact"><Input value={form.spoc_contact} onChange={(e) => setForm({ ...form, spoc_contact: e.target.value })} /></Field>
      </div>
      <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
      <Field label="Maps link"><Input value={form.maps_link} onChange={(e) => setForm({ ...form, maps_link: e.target.value })} /></Field>
      {canManageSchools && (
        <Field label="Assigned engineer">
          <Select value={form.assigned_engineer_id} onChange={(e) => setForm({ ...form, assigned_engineer_id: e.target.value })}>
            <option value="">Unassigned</option>
            {engineers.filter((e) => e.is_active).map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </Select>
        </Field>
      )}
    </Modal>
  );
};

const EscalationModal = ({ open, onClose, schoolId, engineerId }: { open: boolean; onClose: () => void; schoolId: string; engineerId: string }) => {
  const create = useCreateEscalation();
  const { success, error: showError } = useToast();
  const [form, setForm] = useState({ issue_type: 'other', urgency: 'medium', issue_description: '' });

  if (!schoolId) return null;

  const submit = async () => {
    if (!form.issue_description.trim()) {
      showError('Description required', 'Please describe the issue');
      return;
    }
    try {
      await create.mutateAsync({
        school_id: schoolId,
        engineer_id: engineerId,
        issue_type: form.issue_type as 'missing_material' | 'undelivered_material' | 'other',
        urgency: form.urgency as 'low' | 'medium' | 'high' | 'critical',
        issue_description: form.issue_description,
        status: 'open',
      } as Parameters<typeof create.mutateAsync>[0]);
      success('Escalation raised', 'Team will be notified in real time.');
      onClose();
      setForm({ issue_type: 'other', urgency: 'medium', issue_description: '' });
    } catch (err) {
      showError('Failed to raise escalation', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <Modal
      open={open}
      title="Report Issue"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={create.isPending}>Submit</Button>
        </>
      }
    >
      <div className="form-row">
        <Field label="Issue type">
          <Select value={form.issue_type} onChange={(e) => setForm({ ...form, issue_type: e.target.value })}>
            {ESCALATION_ISSUE_TYPES.map((t) => <option key={t} value={t}>{ESCALATION_ISSUE_TYPE_LABELS[t]}</option>)}
          </Select>
        </Field>
        <Field label="Urgency">
          <Select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
            {ESCALATION_URGENCIES.map((u) => <option key={u} value={u}>{ESCALATION_URGENCY_LABELS[u]}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Description" required>
        <Textarea value={form.issue_description} onChange={(e) => setForm({ ...form, issue_description: e.target.value })} placeholder="Describe the issue" />
      </Field>
    </Modal>
  );
};

const VisitAssignModal = ({ open, onClose, schoolId, defaultEngineerId }: { open: boolean; onClose: () => void; schoolId: string; defaultEngineerId: string }) => {
  const create = useCreateVisit();
  const { data: engineers = [] } = useEngineers();
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({ engineer_id: defaultEngineerId, visit_date: '', next_visit_due: '', reason: '', notes: '' });

  useEffect(() => {
    if (defaultEngineerId) setForm((f) => ({ ...f, engineer_id: defaultEngineerId }));
  }, [defaultEngineerId]);

  const submit = async () => {
    if (!form.engineer_id || !form.visit_date || !form.reason.trim()) {
      showError('Missing details', 'Engineer, date, and reason are required');
      return;
    }
    try {
      await create.mutateAsync({
        school_id: schoolId,
        engineer_id: form.engineer_id,
        visit_date: form.visit_date,
        next_visit_due: form.next_visit_due || null,
        reason: form.reason,
        notes: form.notes || null,
        status: 'scheduled',
        checklist_items: [],
        created_by: user?.id ?? null,
      } as Parameters<typeof create.mutateAsync>[0]);
      success('Visit assigned', 'Engineer will be notified.');
      onClose();
      setForm({ engineer_id: defaultEngineerId, visit_date: '', next_visit_due: '', reason: '', notes: '' });
    } catch (err) {
      showError('Failed to assign visit', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <Modal
      open={open}
      title="Assign Visit"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={create.isPending}>Assign</Button>
        </>
      }
    >
      <Field label="Engineer" required>
        <Select value={form.engineer_id} onChange={(e) => setForm({ ...form, engineer_id: e.target.value })}>
          <option value="">Select engineer</option>
          {engineers.filter((e) => e.is_active).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </Select>
      </Field>
      <div className="form-row">
        <Field label="Visit date" required>
          <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
        </Field>
        <Field label="Next visit due">
          <Input type="date" value={form.next_visit_due} onChange={(e) => setForm({ ...form, next_visit_due: e.target.value })} />
        </Field>
      </div>
      <Field label="Reason" required>
        <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why this visit is needed" />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
    </Modal>
  );
};

export { VisitAssignModal, EscalationModal, SchoolEditModal };