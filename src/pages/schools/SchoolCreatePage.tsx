import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngineers, useCreateSchool } from '../../services/api';
import { useToast } from '../../providers/ToastProvider';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Form';
import { REGIONS } from '../../utils/constants';
import { validatePhone } from '../../utils/helpers';

interface FormState {
  name: string;
  spoc_name: string;
  spoc_contact: string;
  location: string;
  region: string;
  area: string;
  maps_link: string;
  assigned_engineer_id: string;
  latitude: string;
  longitude: string;
}

const initial: FormState = {
  name: '',
  spoc_name: '',
  spoc_contact: '',
  location: '',
  region: REGIONS[0],
  area: '',
  maps_link: '',
  assigned_engineer_id: '',
  latitude: '',
  longitude: '',
};

export const SchoolCreatePage = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { data: engineers = [] } = useEngineers();
  const create = useCreateSchool();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    document.title = 'Add School | Field Operations';
  }, []);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'School name is required';
    if (!form.spoc_name.trim()) e.spoc_name = 'SPOC name is required';
    if (!form.spoc_contact.trim()) e.spoc_contact = 'SPOC contact is required';
    else if (!validatePhone(form.spoc_contact)) e.spoc_contact = 'Invalid phone number';
    if (!form.location.trim()) e.location = 'Location is required';
    if (!form.region) e.region = 'Region is required';
    if (!form.area.trim()) e.area = 'Area is required';
    if (!form.assigned_engineer_id) e.assigned_engineer_id = 'Assign an engineer';
    if (form.maps_link && !/^https?:\/\//i.test(form.maps_link)) e.maps_link = 'Maps link must be a valid URL';
    if (form.latitude) {
      const n = parseFloat(form.latitude);
      if (Number.isNaN(n) || n < -90 || n > 90) e.latitude = 'Latitude must be between -90 and 90';
    }
    if (form.longitude) {
      const n = parseFloat(form.longitude);
      if (Number.isNaN(n) || n < -180 || n > 180) e.longitude = 'Longitude must be between -180 and 180';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      showError('Please review the form', 'Some fields need attention');
      return;
    }
    try {
      const school = await create.mutateAsync({
        school: {
          name: form.name.trim(),
          spoc_name: form.spoc_name.trim(),
          spoc_contact: form.spoc_contact.trim(),
          location: form.location.trim(),
          region: form.region,
          area: form.area.trim(),
          maps_link: form.maps_link.trim() || null,
          assigned_engineer_id: form.assigned_engineer_id || null,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          is_active: true,
        },
      });
      success('School created', 'Initial checklist has been generated.');
      navigate(`/schools/${school.id}`, { replace: true });
    } catch (err) {
      showError('Failed to create school', err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add School</h1>
          <div className="page-subtitle">Initial checklist will be created automatically</div>
        </div>
      </div>

      <Card>
        <CardHeader title="School Details" />
        <CardBody>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <Field label="School name" htmlFor="name" required error={errors.name}>
                <Input id="name" value={form.name} onChange={update('name')} />
              </Field>
              <Field label="Area" htmlFor="area" required error={errors.area}>
                <Input id="area" value={form.area} onChange={update('area')} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="SPOC name" htmlFor="spoc_name" required error={errors.spoc_name}>
                <Input id="spoc_name" value={form.spoc_name} onChange={update('spoc_name')} />
              </Field>
              <Field label="SPOC contact" htmlFor="spoc_contact" required error={errors.spoc_contact}>
                <Input id="spoc_contact" value={form.spoc_contact} onChange={update('spoc_contact')} placeholder="+91 9876543210" />
              </Field>
            </div>
            <Field label="Location" htmlFor="location" required error={errors.location} help="Street address, city, district">
              <Input id="location" value={form.location} onChange={update('location')} />
            </Field>
            <div className="form-row">
              <Field label="Region" htmlFor="region" required error={errors.region}>
                <Select id="region" value={form.region} onChange={update('region')}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Assigned engineer" htmlFor="assigned_engineer_id" required error={errors.assigned_engineer_id}>
                <Select id="assigned_engineer_id" value={form.assigned_engineer_id} onChange={update('assigned_engineer_id')}>
                  <option value="">Select engineer</option>
                  {engineers.filter((e) => e.is_active).map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name} · {e.region}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="form-row">
              <Field label="Google Maps link" htmlFor="maps_link" error={errors.maps_link}>
                <Input id="maps_link" value={form.maps_link} onChange={update('maps_link')} placeholder="https://maps.google.com/..." />
              </Field>
              <Field label="Latitude / Longitude" htmlFor="latitude" error={errors.latitude || errors.longitude}>
                <div className="flex gap-2">
                  <Input id="latitude" value={form.latitude} onChange={update('latitude')} placeholder="Latitude" />
                  <Input value={form.longitude} onChange={update('longitude')} placeholder="Longitude" />
                </div>
              </Field>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={create.isPending}>Create School</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};