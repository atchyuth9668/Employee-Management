# Deployment Guide

This guide walks you through deploying the **Field Operations Management Platform** to production on **Vercel** with **Supabase** as the data backend.

## 1. Create a Supabase Project

1. Go to https://supabase.com and create a new project.
2. Choose a strong database password and store it securely.
3. Wait for the project to provision (~2 minutes).
4. Note the following values from **Project Settings → API**:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`) → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key (KEEP SECRET — used only in Edge Functions)

## 2. Configure the Database

Open **SQL Editor** in the Supabase dashboard and run the SQL files **in this order**:

### Step A — Schema

Open `supabase/schema.sql`, paste into a new query, and run.

This creates:

- Tables: `profiles`, `school_teams`, `engineers`, `schools`, `school_visits`, `school_checklists`, `daily_logs`, `escalations`, `visit_feedback`, `material_deliveries`, `lms_access`, `monthly_visit_targets`
- Enums for roles, statuses, urgency, activity types
- Indexes on every foreign key, status, date, and region column
- Triggers: `set_updated_at`, `recalculate_checklist_percentage`, `handle_new_user` (auto-creates a profile on signup), `handle_new_school` (auto-creates empty checklist on school creation)

### Step B — Row Level Security

Open `supabase/rls.sql`, paste, and run.

This enables RLS on every table and creates policies for admin / team_lead / engineer / viewer roles.

### Step C — Realtime + Views

Open `supabase/realtime.sql`, paste, and run.

This adds every operational table to the `supabase_realtime` publication and creates the `v_school_progress` and `v_engineer_stats` views.

### Step D — (Optional) Development Seed

**Only run this in dev/test environments.** Open `supabase/seed.sql`, paste, and run. It adds sample engineers, schools, visits, logs, and escalations.

## 3. Enable Realtime

If the `supabase_realtime` publication already exists (Supabase enables it by default for the `public` schema in new projects), step C handles it. To verify:

```sql
select * from pg_publication_tables where pubname = 'supabase_realtime';
```

You should see every operational table listed.

## 4. Configure Authentication

### Email/Password

Already enabled by default. Configure the following under **Authentication → Providers → Email**:

- **Confirm email** — set to ON for production (recommended), OFF for development convenience.
- **Secure email change** — ON.

### Google SSO (Optional)

1. In **Authentication → Providers**, enable **Google**.
2. Create OAuth credentials in Google Cloud Console (https://console.cloud.google.com → APIs & Services → Credentials → Create OAuth client).
3. Set the **Authorized redirect URI** to `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. Paste the Google Client ID and Secret into Supabase.
5. In Vercel (or your deployment env), the app's URL becomes the post-login redirect automatically.

## 5. Promote the First Admin

The first user who signs up gets the default `engineer` role. To promote them to `admin`, run this in the Supabase SQL editor **after they sign up at least once**:

```sql
-- Find their user id
select id, email, role from auth.users;

-- Promote by email
update public.profiles
set role = 'admin'
where email = 'your-admin@example.com';

-- Optional: link their engineer record so the profile pulls assignments
update public.profiles p
set engineer_id = e.id
from public.engineers e
where p.email = e.email and p.email = 'your-admin@example.com';
```

Subsequent admins/team leads can be promoted the same way, or via the in-app Engineers module once you deploy the `invite-engineer` Edge Function.

## 6. Deploy the Edge Function (Recommended for Engineer Invitations)

The frontend uses the standard Supabase auth API for sign-up and password reset. For **inviting new engineers** without exposing the service role key, deploy the bundled Edge Function:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase      # macOS
# or scoop install supabase              # Windows
# or see https://supabase.com/docs/guides/cli

# Login
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the function
supabase functions deploy invite-engineer --no-verify-jwt
```

Then set the secret:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

The frontend calls this function via:

```ts
await supabase.functions.invoke('invite-engineer', { body: { ... } });
```

If you skip this step, you can still create engineers via the **Engineers** module — they simply won't have a Supabase auth account until you promote them and they reset their password.

## 7. Configure Vercel

### Option A — Connect GitHub repository (recommended)

1. Push this repo to GitHub: https://github.com/atchyuth9668/Employee-Management
2. Go to https://vercel.com → **New Project** → **Import Git Repository**.
3. Select your repository.
4. Vercel auto-detects Vite. Confirm:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add environment variables (Settings → Environment Variables):

   | Name                     | Value                                |
   |--------------------------|--------------------------------------|
   | `VITE_SUPABASE_URL`      | `https://<ref>.supabase.co`          |
   | `VITE_SUPABASE_ANON_KEY` | `<anon key>`                          |

6. Click **Deploy**. Vercel assigns a public URL like `https://employee-management-<hash>.vercel.app`.
7. **Production URL** — Configure your custom domain (optional) under Project Settings → Domains.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

## 8. Continuous Deployment

`main` branch automatically deploys to production. Pull requests get preview URLs. The CI workflow in `.github/workflows/ci.yml` validates every push and PR:

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Merges to `main` succeed only if all checks pass.

## 9. Post-Deployment Verification

After the first production deployment:

1. **Visit the URL** — you should see the sign-in page with a configuration banner suppressed.
2. **Sign up** with your admin email (after promoting them in step 5).
3. **Open the app in two browsers** (or incognito) and verify realtime:
   - Create a school in browser A → it appears in browser B without refresh.
   - Raise an escalation in browser A → it appears in browser B without refresh.
4. **Verify role enforcement**:
   - As an engineer, try navigating to `/engineers` → you should be redirected.
   - As an engineer, try to approve your own daily log → blocked.
5. **Verify CSV export** — go to Reports → Download CSV.
6. **Check Supabase logs** — Database → Logs to confirm RLS is enforcing policies.

## 10. First-Admin Quick Reference

```sql
-- After your admin signs up:
update public.profiles set role = 'admin' where email = 'admin@example.com';

-- Promote a team lead
update public.profiles set role = 'team_lead' where email = 'lead@example.com';

-- Demote / disable
update public.profiles set role = 'engineer' where email = 'engineer@example.com';
update public.engineers set is_active = false where email = 'engineer@example.com';
```

## Troubleshooting

- **"Supabase not configured"** on login page → environment variables not set in Vercel. Redeploy after adding.
- **Realtime updates not flowing** → Confirm tables are in `supabase_realtime` publication (run the verification query in step 3).
- **RLS denies writes** → Check that the user has a row in `public.profiles` with the correct `role`. The signup trigger creates a profile automatically.
- **Google SSO fails** → Confirm the OAuth redirect URI matches Supabase's callback URL exactly.

## Rollback

To roll back a deployment:

1. Vercel Dashboard → Deployments → select previous successful deployment → **Promote to Production**.

Database migrations are additive. To roll back schema changes, write a new migration that reverts the change and apply it via the SQL editor.