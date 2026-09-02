# Field Operations Management Platform

A production-ready, cloud-native Field Operations Management Platform for STEM/Robotics organizations operating across **Andhra Pradesh** and **Telangana**.

Manage engineers, schools, deployments, school visits, checklists, daily activity logs, escalations, materials, LMS access, feedback, targets, reports, and notifications — all from a single real-time, role-aware web application.

## Features

- **Authentication** — Email/password + Google SSO + secure password reset
- **Role-based access control** — `admin`, `team_lead`, `engineer`, `viewer`
- **Schools** — Full CRUD with SPOC, region, location, Maps link, assigned engineer
- **Visits** — Schedule, accept, reject, cancel, complete with full audit trail
- **Checklists** — Live toggle with auto-stamped completion dates and rolling completion %
- **Daily Logs** — School visit / WFH / leave / holiday with admin approval workflow
- **Escalations** — Issue lifecycle (open → in-progress → resolved → closed) with urgency & region filters
- **Engineers** — Roster management, CSV export, CSV/JSON import (admin/team lead only)
- **Reports** — Overview, school status, visit analytics, engineer performance, escalations, daily/monthly visit reports — with CSV export
- **Realtime** — Supabase Realtime keeps every connected user in sync across browsers
- **Notifications** — Topbar bell with realtime escalation updates
- **Global search** — ⌘K / Ctrl+K overlay across schools, engineers, visits, escalations
- **Responsive UI** — Desktop, laptop, tablet, and mobile support with collapsible sidebar
- **Accessibility** — Semantic HTML, focus rings, aria labels, keyboard navigation
- **Production-ready stack** — React 19, Vite, TypeScript (strict), React Query, React Router v6, oxlint, Supabase

## Tech Stack

| Layer       | Technology                                                |
|-------------|------------------------------------------------------------|
| Frontend    | React 19, Vite, TypeScript (strict), React Router v6       |
| State       | React Query, React Context (auth/toasts/connection)        |
| UI          | Custom design system, lucide-react icons                  |
| Backend     | Supabase (Postgres, Auth, Realtime, Storage, RLS)          |
| Privileged  | Supabase Edge Functions (Deno)                            |
| Deploy      | Vercel (auto from `main`)                                 |
| Lint        | oxlint                                                     |

## Project Structure

```text
src/
├── components/
│   ├── ui/         # Button, Badge, Card, Form, Modal, Skeleton, EmptyState, ProgressBar, ToastViewport
│   ├── layout/     # AppShell, Sidebar, Topbar, SearchOverlay, NotificationsPanel
│   └── modals/     # Modal, ConfirmDialog
├── pages/
│   ├── auth/       # LoginPage, SignupPage, ResetPasswordPage, UpdatePasswordPage
│   ├── overview/   # OverviewPage
│   ├── schools/    # SchoolsListPage, SchoolCreatePage, SchoolEditPage, SchoolDetailPage
│   ├── visits/     # VisitsListPage, VisitDetailPage
│   ├── logs/       # DailyLogsListPage, DailyLogCreatePage
│   ├── escalations/EscalationsListPage, EscalationDetailPage
│   ├── engineers/  # EngineersListPage, EngineerDetailPage
│   ├── reports/    # ReportsPage
│   ├── profile/    # ProfilePage
│   └── settings/   # SettingsPage
├── hooks/
├── services/api.ts # All Supabase queries and mutations as typed React Query hooks
├── lib/supabase.ts # Supabase client singleton
├── providers/      # AuthProvider, ToastProvider, ConnectionProvider
├── routes/         # AppRoutes, Guards (ProtectedRoute, RoleRoute)
├── types/          # Strong TypeScript domain types
├── utils/          # cn, date, helpers, constants
├── styles.css      # Design system tokens + global styles
├── App.tsx
└── main.tsx

supabase/
├── schema.sql      # Full database schema (tables, indexes, constraints, triggers)
├── rls.sql         # Row Level Security policies
├── realtime.sql    # Realtime publication + useful views
├── seed.sql        # Optional development seed data
├── migrations/     # Place additional migrations here
└── functions/
    └── invite-engineer/index.ts  # Edge function for admin engineer invitations

.github/workflows/ci.yml  # CI: install → typecheck → lint → build
.env.example              # Environment variable template
README.md
DEPLOYMENT.md
```

## Local Setup

### Prerequisites

- Node.js 20+
- A Supabase project (https://supabase.com)
- (Optional) Supabase CLI for local DB: `npm i -g supabase`

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Configure Supabase

Apply the SQL files in order (Supabase Dashboard → SQL editor):

1. `supabase/schema.sql` — tables, indexes, triggers, enums
2. `supabase/rls.sql` — Row Level Security policies
3. `supabase/realtime.sql` — Realtime publication + views
4. `supabase/seed.sql` — *(optional, dev only)* sample data

### 4. Promote the first admin

See `DEPLOYMENT.md` for the exact SQL. The first user to sign up via the app receives `engineer` role. Promote them to `admin` with a single SQL update.

### 5. Start dev server

```bash
npm run dev
```

Visit http://localhost:5173.

## Development Commands

| Command           | Description                          |
|-------------------|--------------------------------------|
| `npm run dev`     | Start Vite dev server                |
| `npm run build`   | Production build (`tsc -b && vite build`) |
| `npm run typecheck` | TypeScript validation (no emit)     |
| `npm run lint`    | oxlint static analysis               |
| `npm run preview` | Preview the built bundle             |

## Deployment

The application is designed for **Vercel**. See `DEPLOYMENT.md` for the complete step-by-step.

## Environment Variables

| Variable                | Required | Description                          |
|-------------------------|----------|--------------------------------------|
| `VITE_SUPABASE_URL`     | Yes      | Supabase project URL                 |
| `VITE_SUPABASE_ANON_KEY`| Yes      | Supabase anonymous (public) key      |

The service role key is **never** used in the browser. Privileged operations go through Edge Functions.

## Security

- All application tables have RLS enabled
- Engineers can only access their own logs, assigned schools, and relevant escalations
- Engineers cannot approve their own daily logs (RLS policy + frontend guard)
- Team leads and admins manage operational records
- Viewers are read-only
- Soft deletes preserve historical integrity for visits/logs/escalations

## License

Internal — STEM/Robotics organization operations.