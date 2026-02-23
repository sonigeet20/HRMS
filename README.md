# HRMS — Human Resource Management System

A production-ready, full-stack HRMS monorepo with **Next.js 14**, **Supabase**, and a **Tauri** desktop agent.

## Features

| Module | Description |
| --- | --- |
| **Attendance** | Geofence / WiFi check-in, WFH fallback, idle tracking, 2-min agent pings |
| **Leave Management** | Apply / approve / reject, balance tracking, holiday-aware working-day calc |
| **Payroll** | Monthly generation with LOP, EPF 12 %, ESI 0.75 %, PT ₹200; CSV export |
| **Anonymous Feedback** | SHA-256 hashed identity, 24 h rate limit, HR moderation panel |
| **Notifications** | Real-time in-app (non-compliance, leave updates, payslip ready) |
| **Audit Logging** | Every mutation logged with actor, action, old/new values |
| **RBAC** | Three roles — ADMIN · HR · EMPLOYEE — enforced via Supabase RLS |

## Architecture

```
HRMS/
├── apps/
│   ├── web/          → Next.js 14 (App Router, shadcn/ui)
│   └── agent/        → Tauri desktop agent (Rust, system tray)
├── packages/
│   └── shared/       → Types, Zod schemas, utilities, constants
├── supabase/
│   ├── migrations/   → 13 SQL migration files + RLS policies
│   ├── functions/    → 9 Deno Edge Functions + shared utilities
│   └── seed.sql      → Demo org with locations, departments, policies
└── .env.example      → Required environment variables
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| State | TanStack React Query v5, React Context |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Database | PostgreSQL via Supabase (RLS on all tables) |
| API | Supabase Edge Functions (Deno) |
| Desktop Agent | Tauri 1.x (Rust), macOS Keychain / Windows Credential Manager |
| Validation | Zod (shared across web, agent, and edge functions) |

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Supabase CLI** — `npm install -g supabase`
- **Rust** (for Tauri agent) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

## Getting Started

### 1. Clone & install

```bash
git clone <repo-url> && cd HRMS
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in your Supabase project URL & keys
```

### 3. Start Supabase locally

```bash
npx supabase start        # Starts local Postgres, Auth, Storage, Functions
npx supabase db reset      # Applies migrations + seed data
```

### 4. Run the web app

```bash
npm run dev:web            # http://localhost:3000
```

### 5. Run Edge Functions locally

```bash
npm run dev:functions      # Serves all edge functions
```

### 6. Run the desktop agent (optional)

```bash
cd apps/agent
npm install
npm run dev                # Requires Rust toolchain
```

## Payroll Formula

```
working_days     = calendar_days − weekends − holidays
per_day_rate     = gross_monthly_salary / working_days
lop_days         = unpaid_leave_days
                  + (absent_days        if policy.count_absent_as_lop)
                  + (non_compliant_days if policy.count_non_compliant_as_lop)
lop_deduction    = per_day_rate × lop_days
payable_days     = working_days − lop_days

Statutory deductions (Indian defaults):
  EPF  = 12 % of basic (capped at ₹1,800 /month)
  ESI  = 0.75 % of gross (only if gross ≤ ₹21,000)
  PT   = ₹200 /month

net_pay = gross_pay − lop_deduction − EPF − ESI − PT
```

## Seed Data

The seed creates a demo organization **Acme Corp** with:

- 2 office locations (Mumbai HQ, Bangalore Tech Park)
- 3 departments (Engineering, Human Resources, Operations)
- 3 HR policies (In-Office Strict, Hybrid Flexible, Remote-First)
- 4 leave types (Casual Leave, Sick Leave, Earned Leave, Comp-Off)
- 2026 Indian holiday calendar (14 holidays)

## Project Scripts

| Script | Description |
| --- | --- |
| `npm run dev:web` | Start Next.js dev server |
| `npm run build:web` | Production build |
| `npm run dev:functions` | Serve edge functions locally |
| `npm run db:reset` | Reset database with migrations + seed |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Re-run seed file |

## Deployment

### Web App

Deploy to **Vercel**:

```bash
cd apps/web
npx vercel --prod
```

Set these environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabase

Link and push to hosted Supabase:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase functions deploy
```

### Desktop Agent

```bash
cd apps/agent
npm run build              # Produces platform installer in src-tauri/target/release
```

## License

MIT
