import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEngineer, useSchools, useVisits, useEscalations, useDailyLogs } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { initials } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';

export const EngineerDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: engineer, isLoading } = useEngineer(id);
  const { data: schools = [] } = useSchools();
  const { data: visits = [] } = useVisits();
  const { data: escalations = [] } = useEscalations();
  const { data: logs = [] } = useDailyLogs();

  useEffect(() => {
    document.title = engineer ? `${engineer.full_name} | Field Operations` : 'Engineer | Field Operations';
  }, [engineer]);

  const assigned = useMemo(
    () => (engineer ? schools.filter((s) => s.region === engineer.region && s.is_active) : []),
    [schools, engineer],
  );
  const myVisits = useMemo(() => visits.filter((v) => v.engineer_id === id), [visits, id]);
  const completedVisits = myVisits.filter((v) => v.status === 'completed').length;
  const myLogs = logs.filter((l) => l.engineer_id === id);
  const myEscalations = escalations.filter((e) => e.engineer_id === id);

  if (isLoading || !engineer) return <Skeleton style={{ height: 200 }} />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</Button>
        <h1 className="page-title" style={{ margin: 0 }}>Engineer</h1>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center gap-4">
            <span className="avatar avatar-lg">{initials(engineer.full_name)}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{engineer.full_name}</div>
              <div className="text-sm text-muted">{engineer.email} · {engineer.phone ?? '—'}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant={engineer.role === 'admin' ? 'accent' : engineer.role === 'team_lead' ? 'info' : 'neutral'}>{ROLE_LABELS[engineer.role]}</Badge>
                <Badge variant={engineer.is_active ? 'success' : 'neutral'}>{engineer.is_active ? 'Active' : 'Inactive'}</Badge>
                <Badge>{engineer.region}</Badge>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-4 mb-4">
        <Card><CardBody><div className="kpi-label">Assigned Schools</div><div className="kpi-value">{assigned.length}</div></CardBody></Card>
        <Card><CardBody><div className="kpi-label">Visits</div><div className="kpi-value">{myVisits.length}</div></CardBody></Card>
        <Card><CardBody><div className="kpi-label">Completed</div><div className="kpi-value">{completedVisits}</div></CardBody></Card>
        <Card><CardBody><div className="kpi-label">Escalations</div><div className="kpi-value">{myEscalations.length}</div></CardBody></Card>
      </div>

      <div className="grid grid-cols-2">
        <Card>
          <CardHeader title={`Schools in ${engineer.region}`} />
          <CardBody>
            {assigned.length === 0 ? <div className="text-muted text-sm">No assigned schools.</div> : (
              <div>
                {assigned.map((s) => (
                  <Link key={s.id} to={`/schools/${s.id}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted">{s.region} · {s.area}</div>
                    </div>
                    <Badge variant={s.is_active ? 'success' : 'neutral'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent Logs" />
          <CardBody>
            {myLogs.length === 0 ? <div className="text-muted text-sm">No logs yet.</div> : (
              <div>
                {myLogs.slice(0, 5).map((l) => (
                  <div key={l.id} className="list-item">
                    <div>
                      <div className="font-medium">{l.activities_done}</div>
                      <div className="text-xs text-muted">{l.log_date}</div>
                    </div>
                    {l.is_approved ? <Badge variant="success">Approved</Badge> : <Badge variant="warning">Pending</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};