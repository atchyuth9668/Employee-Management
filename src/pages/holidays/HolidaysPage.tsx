import { useEffect, useMemo, useState } from 'react';
import { CalendarOff, Trash2 } from 'lucide-react';
import { useHolidays, useDeclareHolidays, useDeleteHoliday } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Form';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/date';

export const HolidaysPage = () => {
  const { user, canManageSchools } = useAuth();
  const { data: holidays = [], isLoading } = useHolidays();
  const declare = useDeclareHolidays();
  const remove = useDeleteHoliday();
  const { success, error: showError } = useToast();

  const [form, setForm] = useState({ from: '', to: '', reason: '' });
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Holidays | Field Operations';
  }, []);

  const sorted = useMemo(
    () => [...holidays].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)),
    [holidays],
  );

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sorted.filter((h) => h.holiday_date >= today);
  const past = sorted.filter((h) => h.holiday_date < today).reverse();

  const submit = async () => {
    if (!form.from || !form.to) {
      showError('Missing dates', 'From and To are required');
      return;
    }
    if (form.from > form.to) {
      showError('Invalid range', 'From date must be on or before To date');
      return;
    }
    if (!form.reason.trim()) {
      showError('Missing reason', 'Please mention the holiday reason');
      return;
    }
    try {
      const result = await declare.mutateAsync({
        from: form.from,
        to: form.to,
        reason: form.reason,
        declaredBy: user?.id ?? null,
      });
      success('Holiday declared', `${result.length} day${result.length === 1 ? '' : 's'} marked as holiday. Engineers' logs will reflect this.`);
      setForm({ from: '', to: '', reason: '' });
    } catch (err) {
      showError('Failed to declare', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      success('Holiday removed', 'Engineer logs will be updated.');
      setPendingDelete(null);
    } catch (err) {
      showError('Failed to remove', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  if (!canManageSchools) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Holidays</h1>
            <div className="page-subtitle">Declared company holidays</div>
          </div>
        </div>
        <Card>
          <CardBody>
            {isLoading ? (
              <Skeleton style={{ height: 80 }} />
            ) : sorted.length === 0 ? (
              <EmptyState icon={<CalendarOff size={26} />} title="No holidays declared" description="Once an admin declares a holiday it will appear here." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Date</th><th>Reason</th></tr></thead>
                  <tbody>
                    {sorted.map((h) => (
                      <tr key={h.id}>
                        <td>{formatDate(h.holiday_date)}</td>
                        <td>{h.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Holidays</h1>
          <div className="page-subtitle">Declare holidays so all engineers' logs reflect them automatically</div>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader title="Declare Holiday" />
        <CardBody>
          <div className="form-row">
            <Field label="From" required>
              <Input type="date" value={form.from} max={form.to || undefined} onChange={(e) => setForm({ ...form, from: e.target.value })} />
            </Field>
            <Field label="To" required>
              <Input type="date" value={form.to} min={form.from || undefined} onChange={(e) => setForm({ ...form, to: e.target.value })} />
            </Field>
          </div>
          <Field label="Reason" required>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Diwali · office closed" />
          </Field>
          <div className="flex gap-2 mt-2" style={{ alignItems: 'center' }}>
            <Button variant="primary" onClick={submit} loading={declare.isPending}>
              <CalendarOff size={14} /> Declare Holiday
            </Button>
            <span className="text-xs text-muted">
              All dates in the range will be marked as holiday. If a date is already declared, the reason will be updated.
            </span>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title={`Upcoming (${upcoming.length})`} />
          <CardBody>
            {isLoading ? (
              <Skeleton style={{ height: 80 }} />
            ) : upcoming.length === 0 ? (
              <EmptyState icon={<CalendarOff size={22} />} title="No upcoming holidays" description="Declare a holiday above to notify all engineers." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Date</th><th>Reason</th><th></th></tr>
                  </thead>
                  <tbody>
                    {upcoming.map((h) => (
                      <tr key={h.id}>
                        <td>{formatDate(h.holiday_date)}</td>
                        <td>{h.reason}</td>
                        <td style={{ textAlign: 'right' }}>
                          {pendingDelete === h.id ? (
                            <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                              <Button size="sm" variant="danger" onClick={() => handleDelete(h.id)} loading={remove.isPending}>Confirm</Button>
                              <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setPendingDelete(h.id)}><Trash2 size={12} /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Past (${past.length})`} actions={<Badge variant="neutral">Read only</Badge>} />
          <CardBody>
            {isLoading ? (
              <Skeleton style={{ height: 80 }} />
            ) : past.length === 0 ? (
              <div className="text-muted text-sm">No past holidays</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Date</th><th>Reason</th><th></th></tr></thead>
                  <tbody>
                    {past.map((h) => (
                      <tr key={h.id}>
                        <td>{formatDate(h.holiday_date)}</td>
                        <td>{h.reason}</td>
                        <td style={{ textAlign: 'right' }}>
                          {pendingDelete === h.id ? (
                            <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                              <Button size="sm" variant="danger" onClick={() => handleDelete(h.id)} loading={remove.isPending}>Confirm</Button>
                              <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setPendingDelete(h.id)}><Trash2 size={12} /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
