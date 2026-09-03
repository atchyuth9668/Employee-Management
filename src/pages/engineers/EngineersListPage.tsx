import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Power, Download, Upload, UserX } from 'lucide-react';
import { useEngineers, useCreateEngineer, useUpdateEngineer } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { supabase } from '../../lib/supabase';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select } from '../../components/ui/Form';
import { Modal } from '../../components/modals/Modal';
import { ConfirmDialog } from '../../components/modals/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { initials, downloadCsv, toCsv, validateEmail, validatePhone } from '../../utils/helpers';
import { REGIONS, ROLE_LABELS, USER_ROLES } from '../../utils/constants';

export const EngineersListPage = () => {
  const { canManageEngineers, isAdmin } = useAuth();
  const { data: engineers = [], isLoading } = useEngineers();
  const create = useCreateEngineer();
  const update = useUpdateEngineer();
  const { success, error: showError } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hardDeleteId, setHardDeleteId] = useState<string | null>(null);
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', region: REGIONS[0] as 'Andhra Pradesh' | 'Telangana', role: 'engineer' as 'admin' | 'team_lead' | 'engineer' | 'viewer',
  });
  const [importData, setImportData] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Engineers | Field Operations';
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return engineers.filter((e) => {
      if (term && !`${e.full_name} ${e.email} ${e.region}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [engineers, search]);

  const totals = useMemo(() => ({
    total: engineers.length,
    active: engineers.filter((e) => e.is_active).length,
    leads: engineers.filter((e) => e.role === 'team_lead').length,
    admins: engineers.filter((e) => e.role === 'admin').length,
  }), [engineers]);

  const resetForm = () => setForm({ full_name: '', email: '', phone: '', region: REGIONS[0], role: 'engineer' });

  const openCreate = () => { resetForm(); setEditing(null); setOpen(true); };
  const openEdit = (id: string) => {
    const e = engineers.find((x) => x.id === id);
    if (!e) return;
    setForm({ full_name: e.full_name, email: e.email, phone: e.phone ?? '', region: e.region as 'Andhra Pradesh' | 'Telangana', role: e.role });
    setEditing(id);
    setOpen(true);
  };

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      showError('Missing details', 'Name and email are required');
      return;
    }
    if (!validateEmail(form.email)) {
      showError('Invalid email', 'Please enter a valid email');
      return;
    }
    if (form.phone && !validatePhone(form.phone)) {
      showError('Invalid phone', 'Please enter a valid phone number');
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing, updates: { full_name: form.full_name, email: form.email, phone: form.phone || null, region: form.region as 'Andhra Pradesh' | 'Telangana', role: form.role } });
        success('Engineer updated', 'Changes saved');
      } else {
        const { error: fnErr } = await supabase.functions.invoke('invite-engineer', {
          body: {
            action: 'invite',
            full_name: form.full_name,
            email: form.email,
            phone: form.phone || null,
            region: form.region,
            role: form.role,
          },
        });
        if (fnErr) throw fnErr;
        success('Engineer invited', 'They will receive an email to set their password');
      }
      setOpen(false);
      resetForm();
      setEditing(null);
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.functions.invoke('invite-engineer', {
        body: { action: 'set_status', engineer_id: deleteId, is_active: false },
      });
      success('Engineer deactivated', 'They can no longer sign in. Re-activate to restore access.');
    } catch (err) {
      showError('Failed to archive', err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteId) return;
    const target = engineers.find((x) => x.id === hardDeleteId);
    if (!target) {
      setHardDeleteId(null);
      return;
    }
    if (hardDeleteConfirm.trim().toLowerCase() !== target.email.toLowerCase()) {
      showError('Confirmation failed', `Type the engineer's email (${target.email}) to confirm.`);
      return;
    }
    try {
      const { error: fnErr } = await supabase.functions.invoke('invite-engineer', {
        body: { action: 'delete', engineer_id: hardDeleteId },
      });
      if (fnErr) throw fnErr;
      success('Engineer deleted', 'Roster record and Supabase auth user permanently removed.');
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setHardDeleteId(null);
      setHardDeleteConfirm('');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await supabase.functions.invoke('invite-engineer', {
        body: { action: 'set_status', engineer_id: id, is_active: isActive },
      });
      success(isActive ? 'Engineer activated' : 'Engineer deactivated', isActive ? 'They can sign in again.' : 'They can no longer sign in.');
    } catch (err) {
      showError('Update failed', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const exportCsv = () => {
    const csv = toCsv(
      engineers.map((e) => ({
        full_name: e.full_name, email: e.email, phone: e.phone ?? '', region: e.region, role: e.role, is_active: e.is_active ? 'yes' : 'no',
      })),
      [
        { key: 'full_name', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'region', label: 'Region' },
        { key: 'role', label: 'Role' },
        { key: 'is_active', label: 'Active' },
      ]
    );
    downloadCsv('engineers.csv', csv);
    success('Exported', 'CSV downloaded');
  };

  const handleImport = async () => {
    let records: Array<{ full_name: string; email: string; phone?: string; region: string; role: 'admin' | 'team_lead' | 'engineer' | 'viewer' }>;
    try {
      if (importData.trim().startsWith('[')) {
        records = JSON.parse(importData);
      } else {
        const lines = importData.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error('CSV must include header and at least one row');
        const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        records = lines.slice(1).map((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          header.forEach((h, i) => { row[h] = cols[i] ?? ''; });
          return row as unknown as typeof records[number];
        });
      }
    } catch (err) {
      showError('Parse failed', err instanceof Error ? err.message : 'Invalid format');
      return;
    }

    if (!Array.isArray(records) || records.length === 0) {
      showError('No records', 'Provide at least one record');
      return;
    }
    const seen = new Set<string>();
    const valid: typeof records = [];
    for (const r of records) {
      if (!r.full_name || !r.email || !validateEmail(r.email)) continue;
      if (seen.has(r.email)) continue;
      seen.add(r.email);
      valid.push({ ...r, role: (r.role && USER_ROLES.includes(r.role as 'admin' | 'team_lead' | 'engineer' | 'viewer') ? r.role : 'engineer') });
    }
    if (valid.length === 0) {
      showError('Nothing valid', 'No valid records found');
      return;
    }
    let added = 0;
    for (const r of valid) {
      try {
        await create.mutateAsync({ full_name: r.full_name, email: r.email, phone: r.phone || null, region: REGIONS.includes(r.region as 'Andhra Pradesh' | 'Telangana') ? r.region : REGIONS[0], role: r.role, is_active: true, auth_user_id: null, team_id: null });
        added++;
      } catch {
        // skip duplicates
      }
    }
    success('Import complete', `${added} engineer${added === 1 ? '' : 's'} imported`);
    setImportOpen(false);
    setImportData('');
  };

  if (!canManageEngineers) {
    return (
      <Card>
        <CardBody>
          <div className="banner banner-danger">You do not have permission to access the Engineers module.</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Engineers</h1>
          <div className="page-subtitle">Field team roster</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}><Download size={14} /> Export CSV</Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload size={14} /> Import</Button>
          <Button variant="primary" onClick={openCreate}><Plus size={14} /> Add Engineer</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 mb-4">
        <KPICard label="Total" value={totals.total} />
        <KPICard label="Active" value={totals.active} />
        <KPICard label="Team Leads" value={totals.leads} />
        <KPICard label="Admins" value={totals.admins} />
      </div>

      <Card className="mb-4">
        <CardBody>
          <Field label="Search" style={{ marginBottom: 0 }}>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, region" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`${filtered.length} engineer${filtered.length === 1 ? '' : 's'}`} />
        <div className="table-wrap">
          {isLoading ? (
            <div style={{ padding: 16 }}><Skeleton style={{ height: 60 }} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No engineers" description="Add the first engineer to get started." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Region</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="avatar">{initials(e.full_name)}</span>
                        <Link to={`/engineers/${e.id}`} style={{ fontWeight: 600 }}>{e.full_name}</Link>
                      </div>
                    </td>
                    <td>{e.email}</td>
                    <td>{e.phone ?? '—'}</td>
                    <td>{e.region}</td>
                    <td><Badge variant={e.role === 'admin' ? 'accent' : e.role === 'team_lead' ? 'info' : 'neutral'}>{ROLE_LABELS[e.role]}</Badge></td>
                    <td>
                      <Button
                        size="sm"
                        variant={e.is_active ? 'success' : 'secondary'}
                        onClick={() => handleToggleActive(e.id, !e.is_active)}
                        aria-label={e.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {e.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </td>
                    <td>
                        <div className="flex gap-1">
                          <Link to={`/engineers/${e.id}`}><Button size="sm" variant="ghost">View</Button></Link>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(e.id)} aria-label="Edit"><Pencil size={12} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(e.id)} aria-label="Deactivate" title="Deactivate"><Power size={12} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setHardDeleteId(e.id); setHardDeleteConfirm(''); }} aria-label="Delete permanently" title="Delete permanently" style={{ color: 'var(--danger)' }}><UserX size={12} /></Button>
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
        title={editing ? 'Edit Engineer' : 'Add Engineer'}
        onClose={() => { setOpen(false); setEditing(null); }}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
            <Button variant="primary" onClick={submit} loading={create.isPending || update.isPending}>Save</Button>
          </>
        }
      >
        <div className="form-row">
          <Field label="Full name" required><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} /></Field>
        </div>
        <div className="form-row">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Region" required>
            <Select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as 'Andhra Pradesh' | 'Telangana' })}>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Role" required>
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'team_lead' | 'engineer' | 'viewer' })} disabled={!isAdmin}>
            {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </Field>
      </Modal>

      <Modal
        open={importOpen}
        title="Import Engineers"
        onClose={() => setImportOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleImport}>Import</Button>
          </>
        }
      >
        <p className="text-sm text-muted mb-3">
          Paste CSV (with header row: <code>full_name,email,phone,region,role</code>) or JSON array. Duplicates by email are skipped.
        </p>
        <Field label="Data">
          <textarea className="textarea" rows={8} value={importData} onChange={(e) => setImportData(e.target.value)} placeholder='full_name,email,phone,region,role\nJohn Doe,john@example.com,+91...,Andhra Pradesh,engineer' />
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Deactivate engineer?"
        description="They will be marked inactive and will not be able to sign in. Their visits, logs, and escalations remain intact. You can re-activate later from the Status column."
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={false}
      />

      <Modal
        open={!!hardDeleteId}
        title="Delete engineer permanently?"
        onClose={() => { setHardDeleteId(null); setHardDeleteConfirm(''); }}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setHardDeleteId(null); setHardDeleteConfirm(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleHardDelete} disabled={hardDeleteConfirm.trim().length === 0}>
              <UserX size={14} /> Delete forever
            </Button>
          </>
        }
      >
        <div className="banner banner-danger mb-3">
          <strong>Warning:</strong> This permanently removes the engineer from the roster AND deletes their Supabase auth account. They will not be able to sign in ever again.
        </div>
        <p className="text-sm mb-3">
          Type the engineer's email to confirm:
          <br />
          <code style={{ background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
            {engineers.find((e) => e.id === hardDeleteId)?.email}
          </code>
        </p>
        <Input
          type="text"
          value={hardDeleteConfirm}
          onChange={(e) => setHardDeleteConfirm(e.target.value)}
          placeholder="Type email to confirm"
          autoFocus
        />
      </Modal>
    </div>
  );
};

const KPICard = ({ label, value }: { label: string; value: number }) => (
  <div className="kpi-card">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
  </div>
);