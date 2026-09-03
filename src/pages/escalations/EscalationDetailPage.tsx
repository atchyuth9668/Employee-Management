import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEscalation, useSchools, useEngineers, useUpdateEscalation } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Textarea } from '../../components/ui/Form';
import { ESCALATION_STATUS_LABELS, ESCALATION_URGENCY_LABELS, ESCALATION_ISSUE_TYPE_LABELS } from '../../utils/constants';
import { formatDateTime } from '../../utils/date';

export const EscalationDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManageSchools } = useAuth();
  const { data: escalation, isLoading } = useEscalation(id);
  const { data: schools = [] } = useSchools();
  const { data: engineers = [] } = useEngineers();
  const update = useUpdateEscalation();
  const { success, error: showError } = useToast();
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    document.title = escalation ? `Escalation · ${ESCALATION_ISSUE_TYPE_LABELS[escalation.issue_type]}` : 'Escalation | Field Operations';
  }, [escalation]);

  const school = useMemo(() => schools.find((s) => s.id === escalation?.school_id), [schools, escalation]);
  const engineer = useMemo(() => engineers.find((e) => e.id === escalation?.engineer_id), [engineers, escalation]);

  useEffect(() => {
    if (!escalation) return;
    setResolutionNotes(escalation.resolution_notes ?? '');
  }, [escalation]);

  const advance = async (next: 'in_progress' | 'resolved' | 'closed') => {
    if (!escalation) return;
    if ((next === 'resolved' || next === 'closed') && !resolutionNotes.trim()) {
      showError('Notes required', 'Provide resolution notes before resolving or closing');
      return;
    }
    try {
      await update.mutateAsync({ id: escalation.id, updates: { status: next, resolution_notes: resolutionNotes || null } });
      success('Escalation updated', 'Saved successfully');
    } catch (err) {
      showError('Update failed', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  if (isLoading || !escalation) return <Skeleton style={{ height: 200 }} />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</Button>
        <h1 className="page-title" style={{ margin: 0 }}>Escalation</h1>
        <Badge variant={escalation.urgency === 'critical' ? 'danger' : escalation.urgency === 'high' ? 'warning' : 'info'}>{ESCALATION_URGENCY_LABELS[escalation.urgency]}</Badge>
        <Badge variant={escalation.status === 'closed' ? 'neutral' : escalation.status === 'resolved' ? 'success' : 'info'}>{ESCALATION_STATUS_LABELS[escalation.status]}</Badge>
      </div>

      <div className="grid grid-cols-3">
        <Card className="col-span-2">
          <CardHeader title="Issue Details" />
          <CardBody>
            <KV label="School" value={school?.name ?? '—'} />
            <KV label="Engineer" value={engineer?.full_name ?? '—'} />
            <KV label="Type" value={ESCALATION_ISSUE_TYPE_LABELS[escalation.issue_type]} />
            <KV label="Urgency" value={ESCALATION_URGENCY_LABELS[escalation.urgency]} />
            <KV label="Created" value={formatDateTime(escalation.created_at)} />
            <KV label="Description" value={escalation.issue_description} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Update" />
          <CardBody>
            {canManageSchools ? (
              <>
                <p className="text-xs text-muted mb-2">Resolution notes</p>
                <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
                <div className="flex gap-2 mt-3 flex-wrap">
                  {escalation.status === 'open' && (
                    <Button variant="primary" onClick={() => advance('in_progress')} loading={update.isPending}>Start working</Button>
                  )}
                  {(escalation.status === 'open' || escalation.status === 'in_progress') && (
                    <Button variant="success" onClick={() => advance('resolved')} loading={update.isPending}>Mark resolved</Button>
                  )}
                  {escalation.status === 'resolved' && (
                    <Button variant="secondary" onClick={() => advance('closed')} loading={update.isPending}>Close</Button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted">
                {escalation.resolution_notes ? (
                  <>
                    <div className="font-medium mb-1" style={{ color: 'var(--fg)' }}>Resolution notes</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{escalation.resolution_notes}</div>
                  </>
                ) : (
                  <p style={{ margin: 0 }}>Waiting for admin/team lead to start and resolve this escalation.</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

const KV = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-start gap-3" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span className="text-sm text-muted">{label}</span>
    <span className="text-sm font-medium text-right">{value}</span>
  </div>
);