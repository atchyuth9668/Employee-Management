// Supabase Edge Function: invite-engineer
// Deploy with: supabase functions deploy invite-engineer
// Set secrets: SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, accept, accept-language, content-language',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface InvitePayload {
  full_name: string;
  email: string;
  phone?: string;
  region: 'Andhra Pradesh' | 'Telangana';
  role: 'admin' | 'team_lead' | 'engineer' | 'viewer';
}

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

  // Verify caller is admin or team_lead using the user's JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  console.log('invite-engineer: auth header present?', !!authHeader, 'len:', authHeader.length);

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use the service role client with the user's JWT to verify
  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: caller, error: userErr } = await callerClient.auth.getUser();
  console.log('invite-engineer: getUser result', { hasUser: !!caller?.user, errMsg: userErr?.message });
  if (userErr || !caller?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized', detail: userErr?.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile, error: profileErr } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', caller.user.id)
    .single();
  console.log('invite-engineer: profile lookup', { role: profile?.role, errMsg: profileErr?.message });
  if (!profile || !['admin', 'team_lead'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden: admin or team_lead only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: InvitePayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!payload.full_name || !payload.email || !payload.region) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1) Invite/create auth user with temporary password; user receives set-password link
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

  // 2) Insert engineer row
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
    // rollback: delete auth user
    await authClient.auth.admin.deleteUser(created.user.id);
    return new Response(JSON.stringify({ error: engErr.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3) Update profile role
  await authClient.from('profiles').update({ role: payload.role, engineer_id: engineer.id }).eq('id', created.user.id);

  // 4) Send password reset email so the user can set their own password
  await authClient.auth.resetPasswordForEmail(payload.email, {
    redirectTo: `${new URL(req.url).origin}/update-password`,
  });

  return new Response(JSON.stringify({ engineer, user_id: created.user.id }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});