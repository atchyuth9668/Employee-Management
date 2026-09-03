// Supabase Edge Function: invite-engineer
// Deploy with: supabase functions deploy invite-engineer
// Set secrets: SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, accept, accept-language, content-language',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface InvitePayload {
  action: 'invite';
  full_name: string;
  email: string;
  phone?: string;
  region: 'Andhra Pradesh' | 'Telangana';
  role: 'admin' | 'team_lead' | 'engineer' | 'viewer';
}

interface StatusPayload {
  action: 'set_status';
  engineer_id: string;
  is_active: boolean;
}

interface DeletePayload {
  action: 'delete';
  engineer_id: string;
}

type Payload = InvitePayload | StatusPayload | DeletePayload;

const getUserIdFromAuthHeader = (authHeader: string): string | null => {
  if (!authHeader.startsWith('Bearer ')) return null;
  const jwt = authHeader.substring(7);
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
};

const isAdminOrLead = async (authClient: ReturnType<typeof createClient>, userId: string): Promise<boolean> => {
  const { data: profile } = await authClient.from('profiles').select('role').eq('id', userId).single();
  return !!profile && ['admin', 'team_lead'].includes(profile.role);
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = req.headers.get('Authorization') ?? '';
  const callerId = getUserIdFromAuthHeader(authHeader);
  if (!callerId) {
    return new Response(JSON.stringify({ error: 'Unauthorized: missing or invalid bearer token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!(await isAdminOrLead(authClient, callerId))) {
    return new Response(JSON.stringify({ error: 'Forbidden: admin or team_lead only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // -------- ACTION: set_status --------
  if (payload.action === 'set_status') {
    if (!payload.engineer_id) {
      return new Response(JSON.stringify({ error: 'engineer_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: eng, error: engErr } = await authClient
      .from('engineers')
      .select('*')
      .eq('id', payload.engineer_id)
      .single();
    if (engErr || !eng) {
      return new Response(JSON.stringify({ error: 'Engineer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update roster record
    const rosterUpdate = await authClient
      .from('engineers')
      .update({
        is_active: payload.is_active,
        deleted_at: payload.is_active ? null : new Date().toISOString(),
      })
      .eq('id', payload.engineer_id);
    if (rosterUpdate.error) {
      return new Response(JSON.stringify({ error: rosterUpdate.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ban / unban the auth user
    if (eng.auth_user_id) {
      const banDuration = payload.is_active ? 'none' : '876000h'; // 100 years
      const { error: banErr } = await authClient.auth.admin.updateUserById(eng.auth_user_id, {
        ban_duration: banDuration,
      });
      if (banErr) {
        return new Response(JSON.stringify({ error: `Roster updated but auth ban failed: ${banErr.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, is_active: payload.is_active }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // -------- ACTION: invite --------
  if (payload.action === 'invite') {
    if (!payload.full_name || !payload.email || !payload.region) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const tempPassword = crypto.randomUUID() + 'Aa1!';
    const { data: created, error: createErr } = await authClient.auth.admin.createUser({
      email: payload.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: payload.full_name },
    });
    if (createErr || !created?.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? 'Failed to create user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: engineer, error: engErr } = await authClient
      .from('engineers')
      .insert({
        auth_user_id: created.user.id,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone ?? null,
        region: payload.region,
        role: payload.role,
        is_active: true,
      })
      .select('*')
      .single();
    if (engErr) {
      await authClient.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: engErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await authClient
      .from('profiles')
      .update({ role: payload.role, engineer_id: engineer.id })
      .eq('id', created.user.id);

    await authClient.auth.resetPasswordForEmail(payload.email, {
      redirectTo: `${new URL(req.url).origin}/update-password`,
    });

    return new Response(JSON.stringify({ engineer, user_id: created.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // -------- ACTION: delete --------
  if (payload.action === 'delete') {
    if (!payload.engineer_id) {
      return new Response(JSON.stringify({ error: 'engineer_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: eng, error: engErr } = await authClient
      .from('engineers')
      .select('*')
      .eq('id', payload.engineer_id)
      .single();
    if (engErr || !eng) {
      return new Response(JSON.stringify({ error: 'Engineer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Null out references in profiles
    if (eng.auth_user_id) {
      await authClient
        .from('profiles')
        .update({ engineer_id: null })
        .eq('id', eng.auth_user_id);
    }

    // Null out references in operational tables so we can delete the engineer row
    await Promise.all([
      authClient.from('school_visits').update({ engineer_id: null as any }).eq('engineer_id', payload.engineer_id),
      authClient.from('daily_logs').update({ engineer_id: null as any }).eq('engineer_id', payload.engineer_id),
      authClient.from('escalations').update({ engineer_id: null as any }).eq('engineer_id', payload.engineer_id),
      authClient.from('escalations').update({ assigned_to: null as any }).eq('assigned_to', payload.engineer_id),
      authClient.from('material_deliveries').update({ engineer_id: null as any }).eq('engineer_id', payload.engineer_id),
      authClient.from('schools').update({ assigned_engineer_id: null as any }).eq('assigned_engineer_id', payload.engineer_id),
    ]);

    // Delete the engineer roster row
    const { error: delErr } = await authClient
      .from('engineers')
      .delete()
      .eq('id', payload.engineer_id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete the auth user (permanently)
    if (eng.auth_user_id) {
      const { error: authDelErr } = await authClient.auth.admin.deleteUser(eng.auth_user_id);
      if (authDelErr) {
        return new Response(
          JSON.stringify({ error: `Engineer record deleted but auth user deletion failed: ${authDelErr.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, deleted: payload.engineer_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});