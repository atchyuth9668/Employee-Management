import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useVisit, useSchools, useEngineers } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatDate, formatDateTime } from '../../utils/date';
import { VISIT_STATUS_LABELS } from '../../utils/constants';

export const VisitDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: visit, isLoading } = useVisit(id);
  const { data: schools = [] } = useSchools();
  const { data: engineers = [] } = useEngineers();

  useEffect(() => {
    document.title = visit ? `Visit ${visit.visit_date}` : 'Visit | Field Operations';
  }, [visit]);

  if (isLoading || !visit) return <Skeleton style={{ height: 200 }} />;
  const school = schools.find((s) => s.id === visit.school_id);
  const engineer = engineers.find((e) => e.id === visit.engineer_id);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</Button>
        <h1 className="page-title" style={{ margin: 0 }}>Visit · {formatDate(visit.visit_date)}</h1>
        <Badge variant={visit.status === 'completed' ? 'success' : visit.status === 'rejected' || visit.status === 'cancelled' ? 'danger' : 'info'}>{VISIT_STATUS_LABELS[visit.status]}</Badge>
      </div>

      <div className="grid grid-cols-3">
        <Card className="col-span-2">
          <CardHeader title="Visit Details" />
          <CardBody>
            <KV label="School" value={school ? <Link to={`/schools/${school.id}`}>{school.name}</Link> : '—'} />
            <KV label="Engineer" value={engineer?.full_name ?? '—'} />
            <KV label="Visit date" value={formatDate(visit.visit_date)} />
            <KV label="Next visit due" value={visit.next_visit_due ? formatDate(visit.next_visit_due) : '—'} />
            <KV label="Reason" value={visit.reason} />
            <KV label="Notes" value={visit.notes ?? '—'} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Lifecycle" />
          <CardBody>
            <KV label="Created" value={formatDateTime(visit.created_at)} />
            <KV label="Accepted" value={visit.accepted_at ? formatDateTime(visit.accepted_at) : '—'} />
            <KV label="Completed" value={visit.completed_at ? formatDateTime(visit.completed_at) : '—'} />
            <KV label="Cancelled" value={visit.cancelled_at ? `${formatDateTime(visit.cancelled_at)} · ${visit.cancellation_reason ?? ''}` : '—'} />
            <KV label="Rejected" value={visit.rejected_at ? `${formatDateTime(visit.rejected_at)} · ${visit.rejection_reason ?? ''}` : '—'} />
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