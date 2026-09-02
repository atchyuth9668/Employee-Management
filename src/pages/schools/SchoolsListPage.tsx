import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useSchools, useSoftDeleteSchool, useEngineers } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input, Select } from '../../components/ui/Form';
import { ConfirmDialog } from '../../components/modals/Modal';
import { REGIONS } from '../../utils/constants';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { supabase } from '../../lib/supabase';

export const SchoolsListPage = () => {
  const { canManageSchools } = useAuth();
  const { success, error: showError } = useToast();
  const { data: schools = [], isLoading } = useSchools();
  const { data: engineers = [] } = useEngineers();
  const softDelete = useSoftDeleteSchool();

  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const [engineerFilter, setEngineerFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [checklistMap, setChecklistMap] = useState<Record<string, number>>({});

  useEffect(() => {
    document.title = 'Schools | Field Operations';
  }, []);

  useEffect(() => {
    if (schools.length === 0) {
      setChecklistMap({});
      return;
    }
    const ids = schools.map((s) => s.id);
    (async () => {
      const res = await (supabase.from('school_checklists' as never).select('school_id, completion_percentage' as never).in('school_id' as never, ids as never) as unknown as Promise<{ data: Array<{ school_id: string; completion_percentage: number | null }> | null }>);
      const map: Record<string, number> = {};
      (res.data ?? []).forEach((c) => {
        map[c.school_id] = c.completion_percentage ?? 0;
      });
      setChecklistMap(map);
    })();
  }, [schools]);

  const engineerById = useMemo(() => {
    const m = new Map<string, string>();
    engineers.forEach((e) => m.set(e.id, e.full_name));
    return m;
  }, [engineers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return schools.filter((s) => {
      if (region && s.region !== region) return false;
      if (status === 'active' && !s.is_active) return false;
      if (status === 'inactive' && s.is_active) return false;
      if (engineerFilter && s.assigned_engineer_id !== engineerFilter) return false;
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        s.spoc_name.toLowerCase().includes(term) ||
        s.location.toLowerCase().includes(term) ||
        s.area.toLowerCase().includes(term)
      );
    });
  }, [schools, search, region, status, engineerFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await softDelete.mutateAsync(deleteId);
      success('School archived', 'School moved to archive. Operational history preserved.');
    } catch (err) {
      showError('Failed to archive', err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Schools</h1>
          <div className="page-subtitle">Manage deployments across AP and Telangana</div>
        </div>
        {canManageSchools && (
          <Link to="/schools/new">
            <Button variant="primary">
              <Plus size={14} /> Add School
            </Button>
          </Link>
        )}
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <Field label="Search" className="flex-1" style={{ marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SPOC, area" style={{ paddingLeft: 32 }} />
              </div>
            </Field>
            <Field label="Region" style={{ marginBottom: 0 }}>
              <Select value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">All regions</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Status" style={{ marginBottom: 0 }}>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Engineer" style={{ marginBottom: 0 }}>
              <Select value={engineerFilter} onChange={(e) => setEngineerFilter(e.target.value)}>
                <option value="">All engineers</option>
                {engineers.filter((e) => e.is_active).map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`${filtered.length} school${filtered.length === 1 ? '' : 's'}`} />
        <div className="table-wrap">
          {isLoading ? (
            <div style={{ padding: 16 }}>
              <Skeleton style={{ height: 16, marginBottom: 12 }} />
              <Skeleton style={{ height: 16, marginBottom: 12 }} />
              <Skeleton style={{ height: 16, marginBottom: 12 }} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No schools match your filters" description="Try clearing filters or adding a new school." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Region</th>
                  <th>Location</th>
                  <th>SPOC</th>
                  <th>Contact</th>
                  <th>Engineer</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const pct = checklistMap[s.id] ?? 0;
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/schools/${s.id}`} style={{ fontWeight: 600 }}>{s.name}</Link>
                      </td>
                      <td>{s.region}</td>
                      <td className="truncate" style={{ maxWidth: 200 }}>{s.area}</td>
                      <td>{s.spoc_name}</td>
                      <td>{s.spoc_contact}</td>
                      <td>{s.assigned_engineer_id ? engineerById.get(s.assigned_engineer_id) ?? '—' : <span className="text-muted">Unassigned</span>}</td>
                      <td style={{ minWidth: 140 }}>
                        <ProgressBar value={pct} showLabel />
                      </td>
                      <td><Badge variant={s.is_active ? 'success' : 'neutral'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                      <td>
                        <div className="flex gap-1">
                          <Link to={`/schools/${s.id}`}>
                            <Button size="sm" variant="ghost">View</Button>
                          </Link>
                          {canManageSchools && (
                            <>
                              <Link to={`/schools/${s.id}/edit`}>
                                <Button size="sm" variant="ghost" aria-label="Edit"><Pencil size={12} /></Button>
                              </Link>
                              <Button size="sm" variant="ghost" aria-label="Archive" onClick={() => setDeleteId(s.id)}>
                                <Trash2 size={12} />
                              </Button>
                            </>
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

      <ConfirmDialog
        open={!!deleteId}
        title="Archive school?"
        description="The school will be hidden from lists. Operational history, visits and checklists remain intact."
        confirmLabel="Archive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={softDelete.isPending}
      />
    </div>
  );
};