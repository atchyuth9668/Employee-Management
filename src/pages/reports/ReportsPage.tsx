import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useSchools, useVisits, useDailyLogs, useEscalations, useEngineers } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Select } from '../../components/ui/Form';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { downloadCsv, toCsv } from '../../utils/helpers';
import { REGIONS, ESCALATION_ISSUE_TYPE_LABELS, ESCALATION_STATUS_LABELS, ESCALATION_URGENCY_LABELS, VISIT_STATUS_LABELS } from '../../utils/constants';
import { addDays, endOfMonth, formatDate, isoDateOnly, startOfMonth, withinRange } from '../../utils/date';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';

type Range = 'all' | 'week' | 'month' | 'quarter' | 'year';

export const ReportsPage = () => {
  useEffect(() => {
    document.title = 'Reports | Field Operations';
  }, []);

  const { data: schools = [] } = useSchools();
  const { data: visits = [] } = useVisits();
  const { data: logs = [] } = useDailyLogs();
  const { data: escalations = [] } = useEscalations();
  const { data: engineers = [] } = useEngineers();
  const [range, setRange] = useState<Range>('month');

  const rangeBounds = useMemo(() => {
    const now = new Date();
    if (range === 'all') return null;
    if (range === 'week') {
      const end = new Date();
      const start = addDays(end, -7);
      return { start, end };
    }
    if (range === 'month') return { start: startOfMonth(now), end: endOfMonth(now) };
    if (range === 'quarter') return { start: addDays(now, -90), end: now };
    return { start: addDays(now, -365), end: now };
  }, [range]);

  const inRange = (iso: string | null | undefined) => {
    if (!rangeBounds) return true;
    return withinRange(iso, rangeBounds.start, rangeBounds.end);
  };

  const [checklistMap, setChecklistMap] = useState<Record<string, number>>({});
useEffect(() => {
    if (schools.length === 0) return;
    (async () => {
      const res = await (supabase.from('school_checklists' as never).select('school_id, completion_percentage' as never).in('school_id' as never, schools.map((s) => s.id) as never) as unknown as Promise<{ data: Array<{ school_id: string; completion_percentage: number | null }> | null }>);
      const m: Record<string, number> = {};
      (res.data ?? []).forEach((c) => { m[c.school_id] = c.completion_percentage ?? 0; });
      setChecklistMap(m);
    })();
  }, [schools]);

  const engineerById = useMemo(() => new Map(engineers.map((e) => [e.id, e])), [engineers]);
  const schoolById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);

  const visitsInRange = visits.filter((v) => inRange(v.visit_date));
  const escalationsInRange = escalations.filter((e) => inRange(e.created_at));
  const logsInRange = logs.filter((l) => inRange(l.log_date));

  const overview = useMemo(() => {
    const regionStats: Record<string, { schools: number; visits: number }> = {};
    REGIONS.forEach((r) => { regionStats[r] = { schools: 0, visits: 0 }; });
    schools.forEach((s) => { if (regionStats[s.region]) regionStats[s.region].schools++; });
    visitsInRange.forEach((v) => {
      const s = schoolById.get(v.school_id);
      if (s && regionStats[s.region]) regionStats[s.region].visits++;
    });
    const activityBreakdown: Record<string, number> = {};
    logsInRange.forEach((l) => { activityBreakdown[l.activity_type] = (activityBreakdown[l.activity_type] ?? 0) + 1; });
    const completionAvg = schools.length === 0 ? 0 : Math.round(Object.values(checklistMap).reduce((a, b) => a + b, 0) / schools.length);
    return { regionStats, activityBreakdown, completionAvg };
  }, [schools, visitsInRange, logsInRange, schoolById, checklistMap]);

  const exportVisits = () => {
    const rows = visitsInRange.map((v) => ({
      date: v.visit_date,
      school: schoolById.get(v.school_id)?.name ?? '',
      engineer: engineerById.get(v.engineer_id)?.full_name ?? '',
      status: VISIT_STATUS_LABELS[v.status],
      reason: v.reason,
      notes: v.notes ?? '',
    }));
    downloadCsv('visits.csv', toCsv(rows, [
      { key: 'date', label: 'Date' },
      { key: 'school', label: 'School' },
      { key: 'engineer', label: 'Engineer' },
      { key: 'status', label: 'Status' },
      { key: 'reason', label: 'Reason' },
      { key: 'notes', label: 'Notes' },
    ]));
  };

  const exportDaily = () => {
    const rows = logsInRange.map((l) => ({
      date: l.log_date,
      engineer: engineerById.get(l.engineer_id)?.full_name ?? '',
      activity: l.activity_type,
      school: l.school_id ? schoolById.get(l.school_id)?.name ?? '' : '',
      start: l.start_time ?? '',
      end: l.end_time ?? '',
      activities: l.activities_done,
      approved: l.is_approved ? 'yes' : 'no',
    }));
    downloadCsv('daily-logs.csv', toCsv(rows, [
      { key: 'date', label: 'Date' },
      { key: 'engineer', label: 'Engineer' },
      { key: 'activity', label: 'Activity' },
      { key: 'school', label: 'School' },
      { key: 'start', label: 'Start' },
      { key: 'end', label: 'End' },
      { key: 'activities', label: 'Activities' },
      { key: 'approved', label: 'Approved' },
    ]));
  };

  const exportMonthly = () => {
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();
    const monthlyVisits = visits.filter((v) => withinRange(v.visit_date, monthStart, monthEnd));
    const rows = monthlyVisits.map((v) => ({
      date: v.visit_date,
      school: schoolById.get(v.school_id)?.name ?? '',
      engineer: engineerById.get(v.engineer_id)?.full_name ?? '',
      status: VISIT_STATUS_LABELS[v.status],
      region: schoolById.get(v.school_id)?.region ?? '',
    }));
    downloadCsv(`monthly-${isoDateOnly(monthStart)}.csv`, toCsv(rows, [
      { key: 'date', label: 'Date' },
      { key: 'school', label: 'School' },
      { key: 'engineer', label: 'Engineer' },
      { key: 'status', label: 'Status' },
      { key: 'region', label: 'Region' },
    ]));
  };

  const exportSchools = () => {
    const rows = schools.map((s) => ({
      name: s.name, region: s.region, area: s.area, spoc_name: s.spoc_name, spoc_contact: s.spoc_contact,
      engineer: s.assigned_engineer_id ? engineerById.get(s.assigned_engineer_id)?.full_name ?? '' : '',
      progress: checklistMap[s.id] ?? 0,
      status: s.is_active ? 'active' : 'inactive',
    }));
    downloadCsv('schools.csv', toCsv(rows, [
      { key: 'name', label: 'School' },
      { key: 'region', label: 'Region' },
      { key: 'area', label: 'Area' },
      { key: 'spoc_name', label: 'SPOC' },
      { key: 'spoc_contact', label: 'Contact' },
      { key: 'engineer', label: 'Engineer' },
      { key: 'progress', label: 'Progress %' },
      { key: 'status', label: 'Status' },
    ]));
  };

  const exportEscalations = () => {
    const rows = escalationsInRange.map((e) => ({
      date: formatDate(e.created_at),
      school: schoolById.get(e.school_id)?.name ?? '',
      type: ESCALATION_ISSUE_TYPE_LABELS[e.issue_type],
      urgency: ESCALATION_URGENCY_LABELS[e.urgency],
      status: ESCALATION_STATUS_LABELS[e.status],
      description: e.issue_description,
      resolution: e.resolution_notes ?? '',
    }));
    downloadCsv('escalations.csv', toCsv(rows, [
      { key: 'date', label: 'Date' },
      { key: 'school', label: 'School' },
      { key: 'type', label: 'Type' },
      { key: 'urgency', label: 'Urgency' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Description' },
      { key: 'resolution', label: 'Resolution' },
    ]));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <div className="page-subtitle">Operational analytics across AP and Telangana</div>
        </div>
        <Field label="Time range" style={{ marginBottom: 0, minWidth: 160 }}>
          <Select value={range} onChange={(e) => setRange(e.target.value as Range)}>
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="quarter">Last quarter</option>
            <option value="year">Last year</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 mb-4">
        <Card>
          <CardHeader title="Overview" actions={<Button size="sm" variant="ghost" onClick={exportVisits}><Download size={12} /> CSV</Button>} />
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="section-title">Regional breakdown</div>
                {REGIONS.map((r) => {
                  const s = overview.regionStats[r];
                  return (
                    <div key={r} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{r}</span>
                        <span className="font-semibold">{s.schools} schools · {s.visits} visits</span>
                      </div>
                      <ProgressBar value={s.visits} max={Math.max(1, Math.max(...Object.values(overview.regionStats).map((x) => x.visits), 1))} />
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="section-title">Activity breakdown</div>
                {Object.entries(overview.activityBreakdown).length === 0 && <div className="text-muted text-sm">No activity in range</div>}
                {Object.entries(overview.activityBreakdown).map(([k, v]) => (
                  <div key={k} className="mb-3">
                    <div className="flex justify-between text-sm mb-1"><span>{k.replace(/_/g, ' ')}</span><span className="font-semibold">{v}</span></div>
                    <ProgressBar value={v} max={Math.max(1, ...Object.values(overview.activityBreakdown))} />
                  </div>
                ))}
                <div className="divider" />
                <div className="text-xs text-muted">Average setup completion</div>
                <div className="kpi-value">{overview.completionAvg}%</div>
                <ProgressBar value={overview.completionAvg} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Visit Analytics" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Total visits" value={visitsInRange.length} />
              <KPI label="Completed" value={visitsInRange.filter((v) => v.status === 'completed').length} />
              <KPI label="Scheduled" value={visitsInRange.filter((v) => v.status === 'scheduled').length} />
              <KPI label="Rejected / Cancelled" value={visitsInRange.filter((v) => v.status === 'rejected' || v.status === 'cancelled').length} />
            </div>
            <div className="divider" />
            <div className="section-title">Top engineers</div>
            {(() => {
              const counts = new Map<string, number>();
              visitsInRange.forEach((v) => { counts.set(v.engineer_id, (counts.get(v.engineer_id) ?? 0) + 1); });
              const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
              if (sorted.length === 0) return <div className="text-muted text-sm">No visits yet</div>;
              return sorted.map(([id, count]) => (
                <div key={id} className="flex justify-between text-sm py-1">
                  <span>{engineerById.get(id)?.full_name ?? id}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ));
            })()}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-2 mb-4">
        <Card>
          <CardHeader title="School Status" actions={<Button size="sm" variant="ghost" onClick={exportSchools}><Download size={12} /> CSV</Button>} />
          <CardBody>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>School</th><th>SPOC</th><th>Region</th><th>Engineer</th><th>Progress</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.spoc_name}</td>
                      <td>{s.region}</td>
                      <td>{s.assigned_engineer_id ? engineerById.get(s.assigned_engineer_id)?.full_name ?? '—' : '—'}</td>
                      <td style={{ minWidth: 140 }}><ProgressBar value={checklistMap[s.id] ?? 0} showLabel /></td>
                      <td><Badge variant={s.is_active ? 'success' : 'neutral'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Engineer Performance" />
          <CardBody>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Engineer</th><th>Schools</th><th>Visits</th><th>Logs</th><th>Completion %</th></tr></thead>
                <tbody>
                  {engineers.map((e) => {
                    const myVisits = visitsInRange.filter((v) => v.engineer_id === e.id);
                    const completed = myVisits.filter((v) => v.status === 'completed').length;
                    const regionSchools = schools.filter((s) => s.region === e.region).length;
                    const myLogs = logsInRange.filter((l) => l.engineer_id === e.id).length;
                    const pct = regionSchools === 0 ? 0 : Math.min(100, Math.round((completed / regionSchools) * 100));
                    return (
                      <tr key={e.id}>
                        <td>{e.full_name}</td>
                        <td>{regionSchools}</td>
                        <td>{myVisits.length}</td>
                        <td>{myLogs}</td>
                        <td><ProgressBar value={pct} showLabel /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-2 mb-4">
        <Card>
          <CardHeader title="Escalations" actions={<Button size="sm" variant="ghost" onClick={exportEscalations}><Download size={12} /> CSV</Button>} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Total" value={escalationsInRange.length} />
              <KPI label="Critical" value={escalationsInRange.filter((e) => e.urgency === 'critical').length} />
              <KPI label="Resolved" value={escalationsInRange.filter((e) => e.status === 'resolved' || e.status === 'closed').length} />
              <KPI label="Open" value={escalationsInRange.filter((e) => e.status === 'open' || e.status === 'in_progress').length} />
            </div>
            <div className="divider" />
            <div className="section-title">By urgency</div>
            {(['low', 'medium', 'high', 'critical'] as const).map((u) => {
              const count = escalationsInRange.filter((e) => e.urgency === u).length;
              return (
                <div key={u} className="flex justify-between text-sm py-1">
                  <span>{ESCALATION_URGENCY_LABELS[u]}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Visit Reports" />
          <CardBody>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={exportDaily}><Download size={14} /> Download Daily Report (CSV)</Button>
              <Button variant="secondary" onClick={exportMonthly}><Download size={14} /> Download Monthly Report (CSV)</Button>
              <Button variant="secondary" onClick={exportVisits}><Download size={14} /> Download Visit Report (CSV)</Button>
            </div>
            <div className="divider" />
            <div className="text-xs text-muted">Currently exporting the filtered dataset ({visitsInRange.length} visits, {logsInRange.length} logs).</div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

const KPI = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="card card-pad">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
  </div>
);