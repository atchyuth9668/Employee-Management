import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import type { School, Engineer, SchoolVisit, Escalation } from '../../types';

interface SearchOverlayProps {
  onClose: () => void;
}

type Hit = {
  type: 'school' | 'engineer' | 'visit' | 'escalation';
  id: string;
  title: string;
  subtitle: string;
  to: string;
};

export const SearchOverlay = ({ onClose }: SearchOverlayProps) => {
  const { hasRole } = useAuth();
  const [term, setTerm] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [visits, setVisits] = useState<SchoolVisit[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      if (!term.trim()) {
        setSchools([]);
        setEngineers([]);
        setVisits([]);
        setEscalations([]);
        return;
      }
      const pattern = `%${term.trim()}%`;
      const [s, e, v, es] = await Promise.all([
        supabase.from('schools').select('*').ilike('name', pattern).is('deleted_at', null).limit(5),
        hasRole('admin', 'team_lead')
          ? supabase.from('engineers').select('*').or(`full_name.ilike.${pattern},email.ilike.${pattern}`).limit(5)
          : Promise.resolve({ data: [] as Engineer[] }),
        supabase.from('school_visits').select('*').or(`notes.ilike.${pattern},reason.ilike.${pattern}`).limit(5),
        supabase.from('escalations').select('*').ilike('issue_description', pattern).limit(5),
      ]);
      setSchools((s.data ?? []) as School[]);
      setEngineers((e.data ?? []) as Engineer[]);
      setVisits((v.data ?? []) as SchoolVisit[]);
      setEscalations((es.data ?? []) as Escalation[]);
    };
    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [term, hasRole]);

  const hits = useMemo<Hit[]>(() => {
    const result: Hit[] = [];
    schools.forEach((s) =>
      result.push({ type: 'school', id: s.id, title: s.name, subtitle: `${s.region} · ${s.area}`, to: `/schools/${s.id}` })
    );
    engineers.forEach((e) =>
      result.push({ type: 'engineer', id: e.id, title: e.full_name, subtitle: e.email, to: `/engineers/${e.id}` })
    );
    visits.forEach((v) =>
      result.push({ type: 'visit', id: v.id, title: `Visit ${v.visit_date}`, subtitle: v.reason, to: `/visits/${v.id}` })
    );
    escalations.forEach((esc) =>
      result.push({ type: 'escalation', id: esc.id, title: esc.issue_description, subtitle: esc.urgency, to: `/escalations/${esc.id}` })
    );
    return result;
  }, [schools, engineers, visits, escalations]);

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
          <Search size={18} />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search across the platform"
            className="input"
            style={{ border: 'none', padding: 0 }}
          />
          <button className="btn btn-ghost btn-icon" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="search-results">
          {hits.length === 0 && term && (
            <div style={{ padding: 20, color: 'var(--fg-muted)', textAlign: 'center' }}>No results</div>
          )}
          {hits.map((h) => (
            <div
              key={`${h.type}-${h.id}`}
              className="search-result"
              role="button"
              tabIndex={0}
              onClick={() => {
                onClose();
                navigate(h.to);
              }}
            >
              <span className="badge badge-accent">{h.type}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate font-medium">{h.title}</div>
                <div className="text-xs text-muted truncate">{h.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};