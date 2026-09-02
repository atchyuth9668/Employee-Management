import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  School,
  CalendarCheck,
  ListChecks,
  AlertTriangle,
  TrendingUp,
  Activity as ActivityIcon,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useSchools, useVisits, useDailyLogs, useEscalations, useEngineers } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatTime, isoDateOnly, withinRange, startOfMonth, endOfMonth } from '../../utils/date';
import { ESCALATION_URGENCY_LABELS, ACTIVITY_LABELS, ESCALATION_ISSUE_TYPE_LABELS } from '../../utils/constants';

export const OverviewPage = () => {
  const { profile, canManageSchools, isEngineer } = useAuth();
  const { data: schools = [], isLoading: l1 } = useSchools();
  const { data: visits = [], isLoading: l2 } = useVisits();
  const { data: logs = [], isLoading: l3 } = useDailyLogs();
  const { data: escalations = [], isLoading: l4 } = useEscalations();
  const { data: engineers = [] } = useEngineers();

  useEffect(() => {
    document.title = 'Overview | Field Operations';
  }, []);

  const myEngineerId = profile?.engineer_id ?? null;

  const scopedSchools = useMemo(() => {
    if (!isEngineer || !myEngineerId) return schools;
    return schools.filter((s) => s.assigned_engineer_id === myEngineerId);
  }, [schools, isEngineer, myEngineerId]);

  const scopedLogs = useMemo(() => {
    if (!isEngineer || !myEngineerId) return logs;
    return logs.filter((l) => l.engineer_id === myEngineerId);
  }, [logs, isEngineer, myEngineerId]);

  const scopedVisits = useMemo(() => {
    if (!isEngineer || !myEngineerId) return visits;
    return visits.filter((v) => v.engineer_id === myEngineerId);
  }, [visits, isEngineer, myEngineerId]);

  const scopedEscalations = useMemo(() => {
    if (!isEngineer || !myEngineerId) return escalations;
    return escalations.filter((e) => e.engineer_id === myEngineerId);
  }, [escalations, isEngineer, myEngineerId]);

  const totalSchools = scopedSchools.length;
  const visitedSchoolIds = new Set(scopedVisits.filter((v) => v.status === 'completed').map((v) => v.school_id));
  const visitedSchools = visitedSchoolIds.size;

  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();
  const visitsThisMonth = scopedVisits.filter((v) => withinRange(v.visit_date, monthStart, monthEnd)).length;
  const completedSetups = scopedSchools.length > 0 ? Math.round((visitedSchools / totalSchools) * 100) : 0;

  const openEscalations = scopedEscalations.filter((e) => e.status !== 'closed' && e.status !== 'resolved').length;
  const todayIso = isoDateOnly();
  const todaysLogs = scopedLogs
    .filter((l) => l.log_date === todayIso)
    .slice(0, 6);

  const recentSchools = scopedSchools.slice(0, 6);
  const recentEscalations = scopedEscalations
    .filter((e) => e.status !== 'closed')
    .slice(0, 5);

  const completionAverage = useMemo(() => {
    if (scopedSchools.length === 0) return 0;
    return Math.round(visitedSchools / scopedSchools.length * 100);
  }, [visitedSchools, scopedSchools]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <div className="page-subtitle">Live operational snapshot for AP and Telangana</div>
        </div>
        <div className="flex gap-2">
          {canManageSchools && (
            <Link to="/schools/new">
              <Button variant="primary">
                <Plus size={14} /> Add School
              </Button>
            </Link>
          )}
          <Link to="/logs/new">
            <Button variant="secondary">
              <ActivityIcon size={14} /> Log Today
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 mb-5">
        <KPI label="Total Schools" value={totalSchools} icon={<School size={18} />} loading={l1} />
        <KPI label="Visited Schools" value={visitedSchools} icon={<CalendarCheck size={18} />} loading={l1 || l2} />
        <KPI label="Visits This Month" value={visitsThisMonth} icon={<TrendingUp size={18} />} loading={l2} />
        <KPI label="Open Escalations" value={openEscalations} icon={<AlertTriangle size={18} />} loading={l4} variant={openEscalations > 0 ? 'warning' : 'default'} />
      </div>

      <div className="grid grid-cols-3 mb-5">
        <Card className="col-span-2">
          <CardHeader title="Today's Activity" actions={<Link to="/logs"><Button variant="ghost" size="sm">View all</Button></Link>} />
          <CardBody>
            {l3 ? (
              <Skeleton style={{ height: 120 }} />
            ) : todaysLogs.length === 0 ? (
              <EmptyState icon={<ActivityIcon size={26} />} title="No activity logged yet" description="Track your day to keep operations in sync." action={<Link to="/logs/new"><Button variant="primary" size="sm"><Plus size={12} /> Log activity</Button></Link>} />
            ) : (
              <div className="flex-col gap-2">
                {todaysLogs.map((l) => (
                  <div key={l.id} className="list-item">
                    <div className="flex items-center gap-3">
                      <Badge variant={l.activity_type === 'school_visit' ? 'accent' : 'neutral'}>{ACTIVITY_LABELS[l.activity_type]}</Badge>
                      <span className="text-sm">{formatTime(l.start_time)} – {formatTime(l.end_time)}</span>
                    </div>
                    <div className="text-sm text-muted truncate" style={{ maxWidth: 360 }}>
                      {l.activities_done}
                    </div>
                    {l.is_approved ? <Badge variant="success">Approved</Badge> : <Badge variant="warning">Pending</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Completion" />
          <CardBody>
            <div className="text-xs text-muted">Average setup completion</div>
            <div className="kpi-value">{completionAverage}%</div>
            <ProgressBar value={completionAverage} variant={completionAverage >= 70 ? 'success' : 'default'} />
            <div className="divider" />
            <div className="text-xs text-muted">Completed setups</div>
            <div className="kpi-value">{completedSetups}%</div>
            <ProgressBar value={completedSetups} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-2 mb-5">
        <Card>
          <CardHeader title="Recent Schools" actions={<Link to="/schools"><Button variant="ghost" size="sm">All schools</Button></Link>} />
          <CardBody>
            {l1 ? (
              <Skeleton style={{ height: 120 }} />
            ) : recentSchools.length === 0 ? (
              <EmptyState title="No schools yet" description="Add your first school to get started." />
            ) : (
              <div className="flex-col">
                {recentSchools.map((s) => (
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
          <CardHeader title="Open Escalations" actions={<Link to="/escalations"><Button variant="ghost" size="sm">View all</Button></Link>} />
          <CardBody>
            {l4 ? (
              <Skeleton style={{ height: 120 }} />
            ) : recentEscalations.length === 0 ? (
              <EmptyState icon={<ListChecks size={26} />} title="All clear" description="No open escalations." />
            ) : (
              <div className="flex-col">
                {recentEscalations.map((e) => (
                  <Link key={e.id} to={`/escalations/${e.id}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div className="font-medium truncate" style={{ maxWidth: 220 }}>{e.issue_description}</div>
                      <div className="text-xs text-muted">{ESCALATION_ISSUE_TYPE_LABELS[e.issue_type]} · {formatDate(e.created_at)}</div>
                    </div>
                    <Badge variant={e.urgency === 'critical' ? 'danger' : e.urgency === 'high' ? 'warning' : 'info'}>
                      {ESCALATION_URGENCY_LABELS[e.urgency]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Engineer Activity (this week)" actions={<Link to="/reports"><Button variant="ghost" size="sm">Reports</Button></Link>} />
        <CardBody>
          {engineers.length === 0 ? (
            <EmptyState title="No engineers" description="Engineer records will appear here once added." />
          ) : (
            <div className="grid grid-cols-3">
              {engineers.slice(0, 6).map((e) => {
                const myVisits = visits.filter((v) => v.engineer_id === e.id && v.status === 'completed').length;
                return (
                  <div key={e.id} className="card card-pad">
                    <div className="font-medium">{e.full_name}</div>
                    <div className="text-xs text-muted mb-2">{e.region}</div>
                    <div className="flex justify-between text-xs text-muted">
                      <span>Completed visits</span>
                      <span className="font-semibold" style={{ color: 'var(--fg-default)' }}>{myVisits}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

const KPI = ({ label, value, icon, loading, variant = 'default' }: { label: string; value: number | string; icon: React.ReactNode; loading?: boolean; variant?: 'default' | 'warning' }) => (
  <div className="kpi-card">
    <div className="flex items-center justify-between">
      <span className="kpi-label">{label}</span>
      <span style={{ color: variant === 'warning' ? 'var(--warning)' : 'var(--accent)' }}>{icon}</span>
    </div>
    {loading ? <Skeleton style={{ height: 32, width: 80 }} /> : <div className="kpi-value">{value}</div>}
  </div>
);