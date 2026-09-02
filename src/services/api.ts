import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Engineer,
  School,
  SchoolVisit,
  SchoolChecklist,
  DailyLog,
  Escalation,
  ChecklistKey,
  VisitStatus,
} from '../types';

export const queryKeys = {
  me: ['me'] as const,
  engineers: ['engineers'] as const,
  engineer: (id: string) => ['engineer', id] as const,
  schools: ['schools'] as const,
  school: (id: string) => ['school', id] as const,
  schoolChecklist: (id: string) => ['school-checklist', id] as const,
  visits: ['visits'] as const,
  visit: (id: string) => ['visit', id] as const,
  logs: ['logs'] as const,
  log: (id: string) => ['log', id] as const,
  escalations: ['escalations'] as const,
  escalation: (id: string) => ['escalation', id] as const,
  notifications: ['notifications'] as const,
};

const handleError = (err: unknown): never => {
  const message = err instanceof Error ? err.message : 'Unexpected error';
  throw new Error(message);
};

const sb = supabase as unknown as {
  from: (table: string) => any;
  channel: (name: string, opts?: unknown) => any;
  removeChannel: (channel: unknown) => void;
};

const subscribeToTable = (
  qc: ReturnType<typeof useQueryClient>,
  channelName: string,
  table: string,
  queryKeyToInvalidate: readonly unknown[],
  filter?: string,
) => {
  const channel = sb.channel(channelName);
  const cfg: Record<string, unknown> = { event: '*', schema: 'public', table };
  if (filter) cfg.filter = filter;
  channel.on('postgres_changes', cfg, () => {
    qc.invalidateQueries({ queryKey: queryKeyToInvalidate });
  });
  channel.subscribe();
  return channel;
};

export const useEngineers = (options?: Partial<UseQueryOptions<Engineer[]>>) => {
  const qc = useQueryClient();
  const query = useQuery<Engineer[]>({
    queryKey: queryKeys.engineers,
    queryFn: async () => {
      const { data, error } = await sb.from('engineers').select('*').order('full_name', { ascending: true });
      if (error) handleError(error);
      return ((data ?? []) as Engineer[]);
    },
    enabled: isSupabaseConfigured(),
    ...options,
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = subscribeToTable(qc, 'engineers-realtime', 'engineers', queryKeys.engineers);
    return () => {
      sb.removeChannel(channel);
    };
  }, [qc]);

  return query;
};

export const useEngineer = (id: string | undefined) => {
  return useQuery<Engineer | null>({
    queryKey: id ? queryKeys.engineer(id) : ['engineer', 'none'],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await sb.from('engineers').select('*').eq('id', id).maybeSingle();
      if (error) handleError(error);
      return ((data as Engineer | null) ?? null);
    },
    enabled: !!id && isSupabaseConfigured(),
  });
};

export const useSchools = (options?: Partial<UseQueryOptions<School[]>>) => {
  const qc = useQueryClient();
  const query = useQuery<School[]>({
    queryKey: queryKeys.schools,
    queryFn: async () => {
      const { data, error } = await sb
        .from('schools')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) handleError(error);
      return ((data ?? []) as School[]);
    },
    enabled: isSupabaseConfigured(),
    ...options,
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = subscribeToTable(qc, 'schools-realtime', 'schools', queryKeys.schools);
    return () => {
      sb.removeChannel(channel);
    };
  }, [qc]);

  return query;
};

export const useSchool = (id: string | undefined) => {
  return useQuery<School | null>({
    queryKey: id ? queryKeys.school(id) : ['school', 'none'],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await sb.from('schools').select('*').eq('id', id).maybeSingle();
      if (error) handleError(error);
      return ((data as School | null) ?? null);
    },
    enabled: !!id && isSupabaseConfigured(),
  });
};

export const useSchoolChecklist = (schoolId: string | undefined) => {
  const qc = useQueryClient();
  const query = useQuery<SchoolChecklist | null>({
    queryKey: schoolId ? queryKeys.schoolChecklist(schoolId) : ['school-checklist', 'none'],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data, error } = await sb
        .from('school_checklists')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();
      if (error) handleError(error);
      return ((data as SchoolChecklist | null) ?? null);
    },
    enabled: !!schoolId && isSupabaseConfigured(),
  });

  useEffect(() => {
    if (!schoolId || !isSupabaseConfigured()) return;
    const channel = subscribeToTable(
      qc,
      `checklist-realtime-${schoolId}`,
      'school_checklists',
      queryKeys.schoolChecklist(schoolId),
      `school_id=eq.${schoolId}`,
    );
    return () => {
      sb.removeChannel(channel);
    };
  }, [schoolId, qc]);

  return query;
};

export const useVisits = (options?: Partial<UseQueryOptions<SchoolVisit[]>>) => {
  const qc = useQueryClient();
  const query = useQuery<SchoolVisit[]>({
    queryKey: queryKeys.visits,
    queryFn: async () => {
      const { data, error } = await sb.from('school_visits').select('*').order('visit_date', { ascending: false });
      if (error) handleError(error);
      return ((data ?? []) as SchoolVisit[]);
    },
    enabled: isSupabaseConfigured(),
    ...options,
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = subscribeToTable(qc, 'visits-realtime', 'school_visits', queryKeys.visits);
    return () => {
      sb.removeChannel(channel);
    };
  }, [qc]);

  return query;
};

export const useVisit = (id: string | undefined) => {
  return useQuery<SchoolVisit | null>({
    queryKey: id ? queryKeys.visit(id) : ['visit', 'none'],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await sb.from('school_visits').select('*').eq('id', id).maybeSingle();
      if (error) handleError(error);
      return ((data as SchoolVisit | null) ?? null);
    },
    enabled: !!id && isSupabaseConfigured(),
  });
};

export const useDailyLogs = (options?: Partial<UseQueryOptions<DailyLog[]>>) => {
  const qc = useQueryClient();
  const query = useQuery<DailyLog[]>({
    queryKey: queryKeys.logs,
    queryFn: async () => {
      const { data, error } = await sb.from('daily_logs').select('*').order('log_date', { ascending: false });
      if (error) handleError(error);
      return ((data ?? []) as DailyLog[]);
    },
    enabled: isSupabaseConfigured(),
    ...options,
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = subscribeToTable(qc, 'logs-realtime', 'daily_logs', queryKeys.logs);
    return () => {
      sb.removeChannel(channel);
    };
  }, [qc]);

  return query;
};

export const useEscalations = (options?: Partial<UseQueryOptions<Escalation[]>>) => {
  const qc = useQueryClient();
  const query = useQuery<Escalation[]>({
    queryKey: queryKeys.escalations,
    queryFn: async () => {
      const { data, error } = await sb
        .from('escalations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) handleError(error);
      return ((data ?? []) as Escalation[]);
    },
    enabled: isSupabaseConfigured(),
    ...options,
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = subscribeToTable(qc, 'escalations-realtime', 'escalations', queryKeys.escalations);
    return () => {
      sb.removeChannel(channel);
    };
  }, [qc]);

  return query;
};

export const useEscalation = (id: string | undefined) => {
  return useQuery<Escalation | null>({
    queryKey: id ? queryKeys.escalation(id) : ['escalation', 'none'],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await sb.from('escalations').select('*').eq('id', id).maybeSingle();
      if (error) handleError(error);
      return ((data as Escalation | null) ?? null);
    },
    enabled: !!id && isSupabaseConfigured(),
  });
};

export const useCreateSchool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { school: Omit<School, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> }) => {
      const { data: school, error } = await sb.from('schools').insert(input.school).select('*').single();
      if (error) throw error;
      const { error: clErr } = await sb.from('school_checklists').insert({ school_id: (school as School).id });
      if (clErr) throw clErr;
      return school as School;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.schools });
    },
  });
};

export const useUpdateSchool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<School> }) => {
      const { data, error } = await sb.from('schools').update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      return data as School;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.schools });
      qc.invalidateQueries({ queryKey: queryKeys.school(data.id) });
    },
  });
};

export const useSoftDeleteSchool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('schools')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.schools });
    },
  });
};

export const useUpdateChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ schoolId, key, done }: { schoolId: string; key: ChecklistKey; done: boolean }) => {
      const dateKey = `${key}_date`;
      const patch: Record<string, unknown> = { [key]: done, [dateKey]: done ? new Date().toISOString().slice(0, 10) : null };
      const { data, error } = await sb
        .from('school_checklists')
        .update(patch)
        .eq('school_id', schoolId)
        .select('*')
        .single();
      if (error) throw error;
      return data as SchoolChecklist;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.schoolChecklist(data.school_id) });
      qc.invalidateQueries({ queryKey: queryKeys.school(data.school_id) });
    },
  });
};

export const useCreateVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SchoolVisit, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await sb.from('school_visits').insert(input).select('*').single();
      if (error) throw error;
      return data as SchoolVisit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.visits }),
  });
};

export const useUpdateVisitStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: VisitStatus;
      reason?: string;
    }) => {
      const now = new Date().toISOString();
      const patch: Partial<SchoolVisit> = { status };
      if (status === 'accepted') patch.accepted_at = now;
      if (status === 'completed') patch.completed_at = now;
      if (status === 'rejected') {
        patch.rejected_at = now;
        patch.rejection_reason = reason ?? null;
      }
      if (status === 'cancelled') {
        patch.cancelled_at = now;
        patch.cancellation_reason = reason ?? null;
      }
      const { data, error } = await sb.from('school_visits').update(patch).eq('id', id).select('*').single();
      if (error) throw error;
      return data as SchoolVisit;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.visits });
      qc.invalidateQueries({ queryKey: queryKeys.visit(data.id) });
    },
  });
};

export const useCreateDailyLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<DailyLog, 'id' | 'created_at' | 'updated_at' | 'is_approved' | 'approved_by' | 'approved_at' | 'rejection_reason' | 'rejected_at'>) => {
      const { data, error } = await sb.from('daily_logs').insert(input).select('*').single();
      if (error) throw error;
      return data as DailyLog;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.logs }),
  });
};

export const useApproveDailyLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approvedBy, approve }: { id: string; approvedBy: string; approve: boolean }) => {
      const now = new Date().toISOString();
      const patch: Partial<DailyLog> = approve
        ? { is_approved: true, approved_by: approvedBy, approved_at: now, rejection_reason: null, rejected_at: null }
        : { is_approved: false, rejected_at: now, rejection_reason: 'Rejected by reviewer' };
      const { data, error } = await sb.from('daily_logs').update(patch).eq('id', id).select('*').single();
      if (error) throw error;
      return data as DailyLog;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.logs }),
  });
};

export const useCreateEscalation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Escalation, 'id' | 'created_at' | 'updated_at' | 'resolved_at' | 'closed_at' | 'resolution_notes' | 'assigned_to' | 'status'> & Partial<Pick<Escalation, 'status' | 'assigned_to'>>) => {
      const { data, error } = await sb.from('escalations').insert(input).select('*').single();
      if (error) throw error;
      return data as Escalation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.escalations }),
  });
};

export const useUpdateEscalation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Escalation> }) => {
      const now = new Date().toISOString();
      const patch: Partial<Escalation> = { ...updates };
      if (updates.status === 'resolved') patch.resolved_at = now;
      if (updates.status === 'closed') patch.closed_at = now;
      const { data, error } = await sb.from('escalations').update(patch).eq('id', id).select('*').single();
      if (error) throw error;
      return data as Escalation;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.escalations });
      qc.invalidateQueries({ queryKey: queryKeys.escalation(data.id) });
    },
  });
};

export const useCreateEngineer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Engineer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'auth_user_id'> & { auth_user_id?: string | null }) => {
      const { data, error } = await sb.from('engineers').insert(input).select('*').single();
      if (error) throw error;
      return data as Engineer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.engineers }),
  });
};

export const useUpdateEngineer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Engineer> }) => {
      const { data, error } = await sb.from('engineers').update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      return data as Engineer;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.engineers });
      qc.invalidateQueries({ queryKey: queryKeys.engineer(data.id) });
    },
  });
};

export const useSoftDeleteEngineer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('engineers')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.engineers }),
  });
};

export const useNotifications = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const { data, error } = await sb
        .from('escalations')
        .select('id, urgency, status, issue_type, school_id, created_at')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) handleError(error);
      return (data ?? []) as Pick<Escalation, 'id' | 'urgency' | 'status' | 'issue_type' | 'school_id' | 'created_at'>[];
    },
    enabled: isSupabaseConfigured(),
  });
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = subscribeToTable(qc, 'notifications-realtime', 'escalations', queryKeys.notifications);
    return () => {
      sb.removeChannel(channel);
    };
  }, [qc]);
  return query;
};