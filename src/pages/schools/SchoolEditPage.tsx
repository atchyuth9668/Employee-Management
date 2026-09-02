import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEngineers, useSchool, useUpdateSchool } from '../../services/api';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Form';
import { REGIONS } from '../../utils/constants';

export const SchoolEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: school } = useSchool(id);
  const { data: engineers = [] } = useEngineers();
  const update = useUpdateSchool();
  const { success, error: showError } = useToast();
  const [form, setForm] = useState({ name: '', spoc_name: '', spoc_contact: '', location: '', region: REGIONS[0] as 'Andhra Pradesh' | 'Telangana', area: '', maps_link: '', assigned_engineer_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Edit School | Field Operations';
  }, []);

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name,
        spoc_name: school.spoc_name,
        spoc_contact: school.spoc_contact,
        location: school.location,
        region: school.region as 'Andhra Pradesh' | 'Telangana',
        area: school.area,
        maps_link: school.maps_link ?? '',
        assigned_engineer_id: school.assigned_engineer_id ?? '',
      });
    }
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.spoc_name || !form.spoc_contact || !form.location || !form.area) {
      showError('Missing details', 'Required fields cannot be empty');
      return;
    }
    setSubmitting(true);
    try {
      await update.mutateAsync({
        id,
        updates: {
          name: form.name,
          spoc_name: form.spoc_name,
          spoc_contact: form.spoc_contact,
          location: form.location,
          region: form.region as 'Andhra Pradesh' | 'Telangana',
          area: form.area,
          maps_link: form.maps_link || null,
          assigned_engineer_id: form.assigned_engineer_id || null,
        },
      });
      success('School updated', 'Changes saved');
      navigate(`/schools/${id}`);
    } catch (err) {
      showError('Update failed', err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!school) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit School</h1>
          <div className="page-subtitle">{school.name}</div>
        </div>
      </div>
      <Card>
        <CardHeader title="School Details" />
        <CardBody>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <Field label="Name" required>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Area" required>
                <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="SPOC name" required>
                <Input value={form.spoc_name} onChange={(e) => setForm({ ...form, spoc_name: e.target.value })} />
              </Field>
              <Field label="SPOC contact" required>
                <Input value={form.spoc_contact} onChange={(e) => setForm({ ...form, spoc_contact: e.target.value })} />
              </Field>
            </div>
            <Field label="Location" required>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <div className="form-row">
              <Field label="Region" required>
                <Select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as 'Andhra Pradesh' | 'Telangana' })}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Assigned engineer">
                <Select value={form.assigned_engineer_id} onChange={(e) => setForm({ ...form, assigned_engineer_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {engineers.filter((e) => e.is_active).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Google Maps link">
              <Input value={form.maps_link} onChange={(e) => setForm({ ...form, maps_link: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={submitting}>Save</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};