# HRMS — Comprehensive Project Documentation

> **Human Resource Management System** — A production-ready, full-stack monorepo with **Next.js 14**, **Supabase**, and a **Tauri** desktop agent.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Monorepo Structure](#2-architecture--monorepo-structure)
3. [Tech Stack](#3-tech-stack)
4. [Web Application (`apps/web`)](#4-web-application-appsweb)
   - 4.1 [App Router & Pages](#41-app-router--pages)
   - 4.2 [Authentication & Middleware](#42-authentication--middleware)
   - 4.3 [Providers (Context)](#43-providers-context)
   - 4.4 [Custom Hooks (Data Layer)](#44-custom-hooks-data-layer)
   - 4.5 [UI Components](#45-ui-components)
   - 4.6 [Styling & Design System](#46-styling--design-system)
5. [Shared Package (`packages/shared`)](#5-shared-package-packagesshared)
   - 5.1 [Type Definitions](#51-type-definitions)
   - 5.2 [Zod Schemas](#52-zod-schemas)
   - 5.3 [Utility Functions](#53-utility-functions)
   - 5.4 [Constants & Enums](#54-constants--enums)
6. [Supabase Backend](#6-supabase-backend)
   - 6.1 [Database Schema (Migrations)](#61-database-schema-migrations)
   - 6.2 [Row Level Security (RLS)](#62-row-level-security-rls)
   - 6.3 [Database Functions & Triggers](#63-database-functions--triggers)
   - 6.4 [Edge Functions (API)](#64-edge-functions-api)
   - 6.5 [Storage](#65-storage)
   - 6.6 [Seed Data](#66-seed-data)
7. [Desktop Agent (`apps/agent`)](#7-desktop-agent-appsagent)
   - 7.1 [Tauri Architecture](#71-tauri-architecture)
   - 7.2 [System Tray & Menus](#72-system-tray--menus)
   - 7.3 [Credential Management](#73-credential-management)
   - 7.4 [Ping Loop & Idle Detection](#74-ping-loop--idle-detection)
   - 7.5 [Login UI](#75-login-ui)
8. [Module Deep-Dives](#8-module-deep-dives)
   - 8.1 [Attendance Module](#81-attendance-module)
   - 8.2 [Leave Management Module](#82-leave-management-module)
   - 8.3 [Payroll Module](#83-payroll-module)
   - 8.4 [Notifications Module](#84-notifications-module)
   - 8.5 [Anonymous Feedback Module](#85-anonymous-feedback-module)
   - 8.6 [Audit Logging](#86-audit-logging)
9. [RBAC (Role-Based Access Control)](#9-rbac-role-based-access-control)
10. [Payroll Formula & Calculations](#10-payroll-formula--calculations)
11. [Environment Variables](#11-environment-variables)
12. [Scripts & Commands](#12-scripts--commands)
13. [Deployment Guide](#13-deployment-guide)
14. [Development Workflow](#14-development-workflow)

---

## 1. Project Overview

HRMS is an enterprise-grade Human Resource Management System designed for the **Indian market** with built-in statutory compliance (EPF, ESI, Professional Tax). It covers:

| Module | Description |
| --- | --- |
| **Attendance** | Geofence + WiFi check-in, WFH fallback, idle tracking, 2-min agent pings |
| **Leave Management** | Apply / approve / reject, balance tracking, holiday-aware working-day calculation |
| **Payroll** | Monthly generation with LOP, EPF 12%, ESI 0.75%, PT ₹200; CSV export |
| **Anonymous Feedback** | SHA-256 hashed identity, 24h rate limit, HR moderation panel |
| **Notifications** | Real-time in-app (non-compliance, leave updates, payslip ready) |
| **Audit Logging** | Every mutation logged with actor, action, old/new values |
| **RBAC** | Three roles — **ADMIN** · **HR** · **EMPLOYEE** — enforced via Supabase RLS |

---

## 2. Architecture & Monorepo Structure

The project uses **npm workspaces** to manage a monorepo:

```
HRMS/
├── apps/
│   ├── web/                → Next.js 14 (App Router, shadcn/ui)
│   └── agent/              → Tauri 1.x desktop agent (Rust + HTML login UI)
├── packages/
│   └── shared/             → @hrms/shared — Types, Zod schemas, utilities, constants
├── supabase/
│   ├── config.toml         → Local Supabase project configuration
│   ├── migrations/         → 14 sequential SQL migration files
│   ├── functions/          → 9 Deno Edge Functions + shared utilities
│   ├── seed.sql            → Demo org (Acme Corp) with sample data
│   └── snippets/           → Ad-hoc SQL snippets
├── package.json            → Root workspace config
├── vercel.json             → Vercel deployment config
└── .github/
    └── copilot-instructions.md
```

### Workspace Packages

| Workspace | Package Name | Path |
| --- | --- | --- |
| Web App | `@hrms/web` | `apps/web` |
| Desktop Agent | `@hrms/agent` | `apps/agent` |
| Shared Library | `@hrms/shared` | `packages/shared` |

---

## 3. Tech Stack

| Layer | Technology | Details |
| --- | --- | --- |
| **Frontend** | Next.js 14 | App Router, TypeScript, `'use client'` pages |
| **UI Framework** | shadcn/ui + Radix UI | Pre-built accessible components |
| **Styling** | Tailwind CSS 3.4 | HSL CSS variable-based theming, `tailwindcss-animate` |
| **State Management** | TanStack React Query v5 | 60s stale time, 1 retry, query invalidation |
| **Forms** | React Hook Form + `@hookform/resolvers` | Zod schema validation |
| **Auth** | Supabase Auth (`@supabase/ssr`) | Cookie-based SSR auth, middleware session refresh |
| **Database** | PostgreSQL via Supabase | RLS on all 20 tables |
| **API** | Supabase Edge Functions (Deno) | Zod validation, CORS, audit logging |
| **Desktop Agent** | Tauri 1.x (Rust) | System tray, keyring, reqwest HTTP, tokio async |
| **Validation** | Zod 3.23 | Shared schemas across web, agent, and edge functions |
| **Date Handling** | date-fns 3.6 | Relative time formatting in UI |
| **Icons** | Lucide React | Consistent icon set |
| **Toasts** | Sonner | Top-right positioned rich toasts |

---

## 4. Web Application (`apps/web`)

### 4.1 App Router & Pages

The app uses Next.js 14 App Router with **route groups** for role-based dashboards:

```
src/app/
├── layout.tsx              → Root layout (Inter font, QueryProvider, AuthProvider, Toaster)
├── page.tsx                → Redirects to /login
├── globals.css             → Tailwind + CSS variable theming
├── login/
│   └── page.tsx            → Email/password sign-in form
└── (dashboard)/            → Protected layout with Sidebar + Header
    ├── layout.tsx          → Dashboard shell (sidebar + header + main content area)
    ├── employee/           → Employee-facing pages
    │   ├── dashboard/      → Personal dashboard overview
    │   ├── attendance/     → Attendance history + check-in/out
    │   ├── leave/          → Leave applications & balances
    │   ├── payslips/       → Monthly payslip viewer
    │   ├── profile/        → Employee profile
    │   └── feedback/       → Submit anonymous feedback
    ├── hr/                 → HR management pages
    │   ├── attendance/     → Org-wide attendance monitoring
    │   ├── employees/      → Employee directory & management
    │   ├── leaves/         → Leave request approvals
    │   ├── payroll/        → Payroll runs & register
    │   ├── policies/       → HR policy configuration
    │   ├── feedback/       → Feedback moderation panel
    │   └── reports/        → Analytics & reports
    └── admin/              → Admin-only pages
        ├── settings/       → Organization settings
        ├── audit-logs/     → Full audit trail viewer
        └── downloads/      → Desktop agent download page
```

### 4.2 Authentication & Middleware

#### Supabase Client Factory

Three Supabase client factories for different contexts:

| File | Context | Usage |
| --- | --- | --- |
| `lib/supabase/client.ts` | Browser | `createBrowserClient()` for client components |
| `lib/supabase/server.ts` | Server | `createServerClient()` with cookie store for RSC |
| `lib/supabase/middleware.ts` | Middleware | Session refresh + route protection |

#### Middleware (`src/middleware.ts`)

- Runs on all routes except static assets
- **Unauthenticated users** → redirected to `/login`
- **Authenticated users at `/login`** → redirected to `/employee/dashboard`
- Refreshes Supabase session tokens via cookie exchange

```typescript
// Matcher excludes static files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

### 4.3 Providers (Context)

#### `AuthProvider`

- Wraps the entire app, provides `user`, `profile`, `loading`, `signOut`
- Fetches profile from `profiles` table after authentication
- Profile includes: `id`, `full_name`, `email`, `role`, `organization_id`, `employee_code`, `avatar_url`
- Listens to `onAuthStateChange` for real-time session updates
- Roles: `'ADMIN' | 'HR' | 'EMPLOYEE'`

#### `QueryProvider`

- Wraps TanStack React Query's `QueryClientProvider`
- Default config: `staleTime: 60_000ms`, `retry: 1`
- Lazy-initialized `QueryClient` via `useState`

### 4.4 Custom Hooks (Data Layer)

All data fetching uses TanStack React Query hooks that talk to Supabase directly or via Edge Functions:

#### Attendance Hooks (`use-attendance.ts`)

| Hook | Purpose | Access |
| --- | --- | --- |
| `useAttendance(month?)` | Fetch current user's attendance for a month | All users |
| `useOrgAttendance(date?)` | Fetch org-wide attendance for a date | HR, Admin |
| `useCheckIn()` | Mutation: POST to `attendance-checkin` edge function | All users |
| `useCheckOut()` | Mutation: POST to `attendance-checkout` edge function | All users |

#### Leave Hooks (`use-leave.ts`)

| Hook | Purpose | Access |
| --- | --- | --- |
| `useLeaveBalances()` | Fetch current user's leave balances with leave type info | All users |
| `useLeaveRequests(status?)` | Fetch current user's leave requests | All users |
| `useOrgLeaveRequests(status?)` | Fetch org-wide leave requests with profile info | HR, Admin |
| `useApplyLeave()` | Mutation: POST to `leave-apply` edge function | All users |
| `useApproveLeave()` | Mutation: POST to `leave-approve` edge function | HR, Admin |

#### Payroll Hooks (`use-payroll.ts`)

| Hook | Purpose | Access |
| --- | --- | --- |
| `usePayslips()` | Fetch current user's active payslips | All users |
| `usePayrollRuns()` | Fetch org payroll run history | HR, Admin |
| `usePayrollRegister(month)` | Fetch all payslips for a month with employee details | HR, Admin |
| `useGeneratePayroll()` | Mutation: POST to `payroll-generate-month` | HR, Admin |
| `useExportPayrollCsv()` | Mutation: Download CSV via `payroll-export-csv` | HR, Admin |

#### Notification Hooks (`use-notifications.ts`)

| Hook | Purpose | Access |
| --- | --- | --- |
| `useNotifications()` | Fetch user's notifications (limit 50, 30s refetch) | All users |
| `useUnreadCount()` | Count unread notifications (30s refetch) | All users |
| `useMarkRead()` | Mutation: Mark single notification read | All users |
| `useMarkAllRead()` | Mutation: Mark all notifications read | All users |

### 4.5 UI Components

#### Layout Components (`components/layout/`)

| Component | Description |
| --- | --- |
| `Sidebar` | 264px fixed sidebar with role-based navigation. Shows Employee, HR, and Admin sections based on user role. Uses `NAV_ITEMS` constant + Lucide icon mapping. |
| `Header` | Top bar with welcome message, user role/code display, notification bell with unread badge, and profile dropdown (profile link + sign out). |
| `NotificationCenter` | Dropdown notification panel with mark-read/mark-all-read, relative timestamps via `date-fns`, scrollable 20-notification list with unread dot indicators. |

#### UI Components (`components/ui/`)

13 shadcn/ui primitives built on Radix UI:

`avatar` · `badge` · `button` · `card` · `dialog` · `dropdown-menu` · `input` · `label` · `select` · `separator` · `table` · `tabs` · `tooltip`

### 4.6 Styling & Design System

- **Tailwind CSS** with CSS variable-based theming using HSL colors
- **Dark mode** support via `class` strategy
- Color tokens: `background`, `foreground`, `primary`, `secondary`, `destructive`, `muted`, `accent`, `popover`, `card` — each with a `foreground` variant
- Border radius system: `lg`, `md` (`-2px`), `sm` (`-4px`)
- Container: centered, `2rem` padding, max `1400px` on 2xl screens
- Animation plugin: `tailwindcss-animate`

#### Utility Functions (`lib/utils.ts`)

| Function | Purpose |
| --- | --- |
| `cn(...inputs)` | Merge Tailwind classes via `clsx` + `tailwind-merge` |
| `formatCurrency(amount, currency?)` | Format as Indian currency (`en-IN`, default INR) |
| `getInitials(name)` | Extract 2-letter initials from full name |

---

## 5. Shared Package (`packages/shared`)

The `@hrms/shared` package provides type safety across the entire stack. It's consumed by `apps/web` (transpiled via `next.config.js`) and by edge functions.

**Entry point**: `src/index.ts` re-exports everything:
```typescript
export * from './types';
export * from './schemas';
export * from './constants';
export * from './utils/payroll';
export * from './utils/dates';
```

### 5.1 Type Definitions

#### Auth Types (`types/auth.ts`)
- `UserRole` — `'ADMIN' | 'HR' | 'EMPLOYEE'`
- `AuthUser` — `id`, `email`, `role`, `organization_id`, `profile_id`
- `DeviceSession` — Tracks desktop agent sessions with `session_key`, `device_os`, `last_seen_at`

#### Employee Types (`types/employee.ts`)
- `EmploymentType` — `'FULL_TIME' | 'PART_TIME' | 'CONTRACT'`
- `Profile` — Full employee profile (22 fields) including FK references to department, manager, location, HR policy
- `Department` — `name`, `description`, `head_id`
- `Location` — `latitude`, `longitude`, `geofence_radius_meters`, `allowed_wifi_ssids`, `timezone`

#### Attendance Types (`types/attendance.ts`)
- `AttendanceStatus` — 9 states: `PRESENT`, `WFH`, `ABSENT`, `LEAVE`, `HOLIDAY`, `WEEKEND`, `HALF_DAY`, `LATE`, `NON_COMPLIANT`
- `WorkModeDetected` — `'OFFICE' | 'WFH' | 'UNKNOWN'`
- `AttendanceDay` — Daily attendance record with check-in/out times, worked/idle minutes, compliance flag, location snapshot
- `AttendanceEvent` — Granular events: `CHECK_IN`, `CHECK_OUT`, `PING`, `IDLE_START`, `IDLE_END`, `LOCATION_UPDATE`
- `LocationSnapshot` — Point-in-time location with latitude, longitude, accuracy, WiFi SSID
- `CheckInRequest` / `CheckInResponse` — API contract for check-in flow

#### Leave Types (`types/leave.ts`)
- `LeaveStatus` — `'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`
- `LeaveApprovalFlow` — `'MANAGER_THEN_HR' | 'HR_ONLY' | 'MANAGER_ONLY'`
- `AccrualFrequency` — `'MONTHLY' | 'YEARLY'`
- `LeaveType` — Configurable leave type with accrual, carry-forward, max balance, pro-rating
- `LeaveBalance` — Annual balance tracking (accrued, used, pending, carried forward, computed balance)
- `LeaveRequest` — Full leave request lifecycle with approval tracking

#### Payroll Types (`types/payroll.ts`)
- `PayrollRunStatus` — `'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'`
- `SalaryComponent` — Earning/deduction line item (fixed or percentage-based)
- `SalaryStructure` — Array of earnings + deductions
- `PayrollProfile` — Employee salary config (base salary, bank details, custom salary structure)
- `PayrollRun` — Monthly payroll execution record
- `Payslip` — Individual payslip with breakdown (versioned, with `is_active` flag for re-runs)
- `PayrollCalculationInput` / `PayrollCalculationResult` — Payroll compute contract

#### Policy Types (`types/policy.ts`)
- `WorkMode` — `'HYBRID' | 'OFFICE_ONLY' | 'WFH_ALLOWED'`
- `HrPolicy` — 14-field policy config including work mode, location enforcement, WiFi enforcement, WFH fallback, idle threshold, LOP rules, weekend days
- `HolidayCalendar` / `Holiday` — Location-specific holiday calendar with optional holidays

#### Notification Types (`types/notification.ts`)
- `NotificationType` — 8 event types: `LEAVE_APPLIED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`, `IDLE_THRESHOLD`, `NON_COMPLIANT`, `PAYSLIP_GENERATED`, `FEEDBACK_RECEIVED`, `POLICY_CHANGED`
- `Notification` — In-app notification with read status and metadata
- `AnonymousFeedback` — SHA-256 hashed identity, category, moderation status (`PENDING`, `APPROVED`, `FLAGGED`)
- `AuditLog` — Actor + action + resource + old/new values + IP address

### 5.2 Zod Schemas

Runtime validation schemas used in Edge Functions and the web app:

| Schema | File | Fields |
| --- | --- | --- |
| `loginSchema` | `schemas/auth.ts` | `email` (valid email), `password` (min 8 chars) |
| `deviceTokenExchangeSchema` | `schemas/auth.ts` | `device_name`, `device_os` (macos/windows/linux), `auth_token` |
| `checkInSchema` | `schemas/attendance.ts` | Optional `latitude`, `longitude`, `accuracy`, `wifi_ssid` |
| `checkOutSchema` | `schemas/attendance.ts` | Optional `latitude`, `longitude` |
| `pingSchema` | `schemas/attendance.ts` | Optional `latitude`, `longitude`, `idle_seconds` (default 0) |
| `idleEventSchema` | `schemas/attendance.ts` | `idle_minutes` (min 0), `started_at` (ISO datetime) |
| `leaveApplySchema` | `schemas/leave.ts` | `leave_type_id` (UUID), `start_date`/`end_date` (YYYY-MM-DD), `reason` (1–1000 chars). Refine: end ≥ start |
| `leaveApproveSchema` | `schemas/leave.ts` | `leave_request_id` (UUID), `action` (APPROVED/REJECTED), optional `rejection_reason` |
| `generatePayrollSchema` | `schemas/payroll.ts` | `month` (YYYY-MM-01), `organization_id` (UUID) |
| `exportPayrollCsvSchema` | `schemas/payroll.ts` | `month` (YYYY-MM-01), `organization_id` (UUID) |

### 5.3 Utility Functions

#### Date Utilities (`utils/dates.ts`)

| Function | Purpose |
| --- | --- |
| `daysInMonth(year, month)` | Returns number of days in a given month |
| `getDatesInMonth(year, month)` | Returns array of YYYY-MM-DD strings for entire month |
| `formatDate(date)` | Formats `Date` → `YYYY-MM-DD` string |
| `parseDate(dateStr)` | Parses `YYYY-MM-DD` → `Date` object |
| `isWeekend(date, weekendDays?)` | Checks if date falls on weekend (default Sat+Sun) |
| `countWorkingDays(year, month, holidays, weekendDays?)` | Counts working days in month excluding weekends & holidays |
| `countWorkingDaysBetween(start, end, holidays, weekendDays?)` | Counts working days in date range (inclusive) |

#### Payroll Utilities (`utils/payroll.ts`)

| Function | Purpose |
| --- | --- |
| `calculatePayroll(input)` | Full payroll calculation: earnings, deductions, LOP, net pay |
| `roundCurrency(value)` | Round to 2 decimal places |

Internal helpers:
- `computeEarnings()` — Resolves salary structure earnings (fixed + percentage-based) or defaults to base salary
- `computeDeductions()` — Resolves custom deductions or applies **Indian statutory defaults**:
  - **EPF**: 12% of Basic (assumed 40% of gross), capped at ₹1,800/month
  - **ESI**: 0.75% of gross (only if gross ≤ ₹21,000)
  - **Professional Tax**: Flat ₹200/month

### 5.4 Constants & Enums

Key constants defined in `constants.ts`:

| Constant | Values |
| --- | --- |
| `ATTENDANCE_STATUS` | `PRESENT`, `WFH`, `ABSENT`, `LEAVE`, `HOLIDAY`, `WEEKEND`, `HALF_DAY`, `LATE`, `NON_COMPLIANT` |
| `WORK_MODE` | `HYBRID`, `OFFICE_ONLY`, `WFH_ALLOWED` |
| `WORK_MODE_DETECTED` | `OFFICE`, `WFH`, `UNKNOWN` |
| `USER_ROLE` | `ADMIN`, `HR`, `EMPLOYEE` |
| `EMPLOYMENT_TYPE` | `FULL_TIME`, `PART_TIME`, `CONTRACT` |
| `LEAVE_STATUS` | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `LEAVE_APPROVAL_FLOW` | `MANAGER_THEN_HR`, `HR_ONLY`, `MANAGER_ONLY` |
| `PAYROLL_RUN_STATUS` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `ACCRUAL_FREQUENCY` | `MONTHLY`, `YEARLY` |

---

## 6. Supabase Backend

### 6.1 Database Schema (Migrations)

14 sequential migration files create the complete schema:

| # | File | Tables/Objects Created |
| --- | --- | --- |
| 01 | `00001_enums.sql` | 10 PostgreSQL ENUM types |
| 02 | `00002_organizations.sql` | `organizations` table + `update_updated_at()` trigger function |
| 03 | `00003_profiles.sql` | `profiles` table (linked to `auth.users`) |
| 04 | `00004_departments_locations.sql` | `departments`, `locations` tables + FK constraints on profiles |
| 05 | `00005_hr_policies.sql` | `hr_policies` table + FK on profiles |
| 06 | `00006_holiday_calendars.sql` | `holiday_calendars`, `holidays` tables |
| 07 | `00007_leave_management.sql` | `leave_types`, `leave_policies`, `leave_balances` (computed column), `leave_requests` |
| 08 | `00008_attendance.sql` | `attendance_days`, `attendance_events` tables |
| 09 | `00009_payroll.sql` | `payroll_profiles`, `payroll_runs`, `payslips` tables |
| 10 | `00010_feedback_notifications.sql` | `anonymous_feedback`, `notifications` tables |
| 11 | `00011_audit_device.sql` | `audit_logs`, `device_sessions` tables |
| 12 | `00012_rls_policies.sql` | RLS policies on all 20 tables + helper functions |
| 13 | `00013_functions_triggers.sql` | `handle_new_user()` trigger, `haversine_distance()`, `create_notification()`, `create_audit_log()`, storage bucket |
| 14 | `00014_agent_releases.sql` | `agent_releases` table + `set_latest_release()` trigger |

#### Complete Table Inventory (20 tables)

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `organizations` | Multi-tenant org container | `name`, `slug`, `timezone`, `org_salt`, `settings` |
| `profiles` | Employee profiles linked to `auth.users` | `full_name`, `email`, `role`, `employee_code`, `department_id`, `manager_id`, `location_id`, `hr_policy_id` |
| `departments` | Organizational departments | `name`, `description`, `head_id` |
| `locations` | Office locations with geofence | `latitude`, `longitude`, `geofence_radius_meters`, `allowed_wifi_ssids` |
| `hr_policies` | Attendance & work mode policies | `work_mode`, `location_enforced`, `office_wifi_enforced`, `idle_threshold_minutes`, `count_absent_as_lop`, `weekend_days` |
| `holiday_calendars` | Annual holiday calendars (per location) | `name`, `year`, `location_id` |
| `holidays` | Individual holidays in a calendar | `name`, `date`, `is_optional` |
| `leave_types` | Configurable leave categories | `name`, `code`, `is_paid`, `max_days_per_year`, `accrual_frequency`, `carry_forward_limit` |
| `leave_policies` | Approval workflows per leave type | `approval_flow`, `allow_negative_balance`, `min_notice_days`, `max_consecutive_days` |
| `leave_balances` | Annual leave balance tracking | `total_accrued`, `total_used`, `total_pending`, `carry_forwarded`, **computed** `balance` |
| `leave_requests` | Leave applications with status | `start_date`, `end_date`, `total_days`, `reason`, `status`, `approved_by`, `rejection_reason` |
| `attendance_days` | Daily attendance records | `date`, `status`, `check_in_at`, `check_out_at`, `worked_minutes`, `idle_minutes`, `work_mode_detected`, `office_compliant`, `location_snapshot` |
| `attendance_events` | Granular attendance events | `event_type`, `payload` (JSONB) |
| `payroll_profiles` | Salary configuration per employee | `base_monthly_salary`, `currency`, `salary_structure` (JSONB), bank details |
| `payroll_runs` | Monthly payroll execution records | `month`, `status`, `total_employees`, `total_gross`, `total_net` |
| `payslips` | Individual pay statements (versioned) | `working_days`, `lop_days`, `payable_days`, `gross_pay`, `lop_deduction`, `net_pay`, `breakdown` (JSONB) |
| `anonymous_feedback` | Employee feedback (hashed identity) | `user_hash`, `category`, `content`, `moderation_status` |
| `notifications` | In-app notification inbox | `type`, `title`, `message`, `is_read`, `metadata` |
| `audit_logs` | Immutable audit trail | `actor_id`, `action`, `resource_type`, `resource_id`, `old_value`, `new_value`, `ip_address` |
| `device_sessions` | Desktop agent sessions | `device_name`, `device_os`, `session_key`, `is_active`, `last_seen_at` |
| `agent_releases` | Desktop agent binary releases | `version`, `platform`, `filename`, `storage_path`, `is_latest` |

#### Notable Schema Features

- **Computed column**: `leave_balances.balance` is `GENERATED ALWAYS AS (total_accrued + carry_forwarded - total_used - total_pending) STORED`
- **Unique constraints**: Employee code per org, attendance per user per day, leave balance per user/type/year
- **JSONB columns**: `location_snapshot`, `salary_structure`, `breakdown`, `metadata`, `settings`, `payload`
- **Cascade deletes**: All child tables cascade on org/user deletion
- **Auto `updated_at`**: Trigger function `update_updated_at()` applied to 6 tables

### 6.2 Row Level Security (RLS)

RLS is enabled on **all 20 tables** with two helper functions:

```sql
auth_org_id()   -- Returns the current user's organization_id
auth_role()     -- Returns the current user's role (ADMIN/HR/EMPLOYEE)
```

#### Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `organizations` | Own org only | — | Admin only | — |
| `profiles` | Own + HR/Admin reads all in org | HR/Admin | HR/Admin + self (limited) | — |
| `departments` | Org members | HR/Admin | HR/Admin | HR/Admin |
| `locations` | Org members | Admin | Admin | Admin |
| `hr_policies` | Org members | HR/Admin | HR/Admin | HR/Admin |
| `holiday_calendars` | Org members | HR/Admin | HR/Admin | HR/Admin |
| `holidays` | Org members (via calendar FK) | HR/Admin | HR/Admin | HR/Admin |
| `leave_types` | Org members | HR/Admin | HR/Admin | HR/Admin |
| `leave_balances` | Own + HR/Admin reads org | — | — | — |
| `leave_requests` | Own + HR/Admin reads org | Own only | Own pending only | — |
| `attendance_days` | Own + HR/Admin reads org | — | — | — |
| `attendance_events` | Own + HR/Admin reads org | — | — | — |
| `payroll_profiles` | Own + HR/Admin reads org | HR/Admin | HR/Admin | HR/Admin |
| `payroll_runs` | HR/Admin | — | — | — |
| `payslips` | Own + HR/Admin reads org | — | — | — |
| `anonymous_feedback` | HR/Admin | Org members | — | — |
| `notifications` | Own only | — | Own (mark read) | — |
| `audit_logs` | Admin only | — | — | — |
| `device_sessions` | Own only | Own | Own | Own |
| `agent_releases` | All authenticated | Admin | Admin | Admin |

### 6.3 Database Functions & Triggers

| Function | Type | Purpose |
| --- | --- | --- |
| `update_updated_at()` | Trigger function | Auto-set `updated_at = now()` on row update |
| `handle_new_user()` | Trigger (after INSERT on `auth.users`) | Auto-create `profiles` row with metadata from signup |
| `haversine_distance(lat1, lon1, lat2, lon2)` | Immutable function | Calculates great-circle distance in meters between two coordinates |
| `create_notification(...)` | Security definer | Insert notification (used by edge functions) |
| `create_audit_log(...)` | Security definer | Insert audit log entry |
| `auth_org_id()` | Stable, security definer | Get current user's `organization_id` (for RLS) |
| `auth_role()` | Stable, security definer | Get current user's `role` (for RLS) |
| `set_latest_release()` | Trigger function | Ensures only one "latest" release per platform |

### 6.4 Edge Functions (API)

9 Deno-based Edge Functions with shared utilities:

#### Shared Utilities (`_shared/`)

| File | Exports | Purpose |
| --- | --- | --- |
| `cors.ts` | `corsHeaders`, `handleCors(req)` | CORS headers + OPTIONS preflight handler |
| `supabase.ts` | `getServiceClient()`, `getUserClient(auth)` | Service-role and user-scoped Supabase clients |
| `auth.ts` | `getAuthContext(header)`, `requireRole(ctx, ...roles)` | JWT → `AuthContext` extraction, role enforcement |
| `validators.ts` | `validateInput(schema, data)`, `jsonResponse()`, `errorResponse()` | Zod validation, standardized JSON/error responses |
| `audit.ts` | `logAudit(params)` | Insert audit log via service client |

#### Function Endpoints

| Function | Method | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| `attendance-checkin` | POST | ✅ | Any | Check in with optional geolocation + WiFi. Determines work mode (OFFICE/WFH/NON_COMPLIANT) based on HR policy. Creates/updates `attendance_days` + `attendance_events`. Notifies HR on non-compliance. |
| `attendance-checkout` | POST | ✅ | Any | Check out. Calculates `worked_minutes` = total time − idle time. Logs event + audit. |
| `attendance-ping` | POST | ✅ | Any | 2-minute heartbeat from desktop agent. Updates `location_snapshot` + logs PING event + updates device session `last_seen_at`. |
| `attendance-idle-event` | POST | ✅ | Any | Reports idle period from agent. Increments `idle_minutes` on attendance day. If idle exceeds policy threshold, notifies HR/Admin. |
| `leave-apply` | POST | ✅ | Any | Apply for leave. Calculates working days (holiday-aware), checks balance, creates request, updates pending balance, notifies HR. |
| `leave-approve` | POST | ✅ | HR/Admin | Approve or reject leave. On approval: updates balance, marks attendance days as LEAVE. On rejection: resets pending balance. Notifies employee. |
| `payroll-generate-month` | POST | ✅ | HR/Admin | Generate monthly payroll for all active employees. Calculates LOP (unpaid leave + absent + non-compliant per policy), computes earnings/deductions, creates versioned payslips, notifies employees. |
| `payroll-export-csv` | POST | ✅ | HR/Admin | Export payroll register as CSV with employee code, name, designation, working/LOP/payable days, gross/net pay. |
| `device-exchange-token` | POST | ✅ | Any | Register desktop agent device. Deactivates existing sessions for device, creates new session with unique `session_key`. |

#### Check-In Logic Flow

```
1. Validate JWT → get AuthContext
2. Check for existing check-in today
3. Fetch profile → HR policy → assigned location
4. If location provided:
   a. Compute haversine distance to office
   b. Check geofence (distance ≤ radius)
   c. Check WiFi SSID match (if enforced)
   d. Determine office_compliant
5. Apply work mode policy:
   - OFFICE_ONLY + not compliant → BLOCK or NON_COMPLIANT + notify HR
   - HYBRID + compliant → PRESENT; not compliant → WFH fallback or NON_COMPLIANT
   - WFH_ALLOWED → PRESENT (if in office) or WFH
6. Create/update attendance_days record
7. Log CHECK_IN event + audit
8. Return status + compliance info
```

### 6.5 Storage

- **Bucket**: `payslips` (private)
- **RLS**: Employees can read files in their own folder (`/{user_id}/...`); service role can upload
- **Agent releases**: Stored via `agent_releases` table referencing storage paths

### 6.6 Seed Data

The `seed.sql` creates a demo environment:

| Entity | Data |
| --- | --- |
| **Organization** | Acme Corp (`Asia/Kolkata` timezone) |
| **Locations** | HQ Office (Mumbai, 200m geofence, 2 WiFi SSIDs), Branch Office (Bangalore, 300m geofence, 1 WiFi SSID) |
| **Departments** | Engineering, Human Resources, Finance |
| **HR Policies** | Hybrid Policy, Office Only Policy, WFH Policy |
| **Holiday Calendar** | India 2026 (7 holidays: Republic Day, Holi, Good Friday, Independence Day, Gandhi Jayanti, Diwali, Christmas) |
| **Leave Types** | Annual Leave (18d/yr, monthly accrual, 5d carry-forward), Sick Leave (12d/yr), Casual Leave (6d/yr), Loss of Pay (unpaid) |
| **Leave Policies** | Annual (Manager→HR, 3d notice), Sick (Manager only, 0d notice), Casual (Manager only, 1d notice), LOP (HR only, negative balance allowed) |

> **Note**: User profiles are auto-created by the `handle_new_user()` trigger when users are created via Supabase Auth with metadata `{ organization_id, full_name, role }`.

---

## 7. Desktop Agent (`apps/agent`)

### 7.1 Tauri Architecture

The desktop agent is built with **Tauri 1.x** (Rust backend + lightweight HTML/JS frontend):

```
apps/agent/
├── package.json            → @hrms/agent, scripts: dev, build, tauri
├── ui/
│   └── index.html          → Login form (pure HTML/CSS/JS, no framework)
└── src-tauri/
    ├── Cargo.toml          → Rust dependencies
    ├── tauri.conf.json     → Tauri app config
    └── src/
        ├── main.rs         → App entry point, system tray, check-in/out
        ├── credentials.rs  → OS keychain integration
        ├── idle.rs         → System idle detection
        └── ping.rs         → 2-minute heartbeat loop
```

#### Rust Dependencies

| Crate | Purpose |
| --- | --- |
| `tauri` | App framework (system tray, dialog, notifications, shell) |
| `serde` / `serde_json` | Serialization |
| `reqwest` | HTTP client (rustls-tls) |
| `tokio` | Async runtime |
| `keyring` | OS credential storage (macOS Keychain / Windows Credential Manager) |
| `chrono` | Timestamp formatting |

### 7.2 System Tray & Menus

The agent runs as a **system tray application** (no dock icon in release mode):

**Signed Out Menu:**
```
Not signed in
○ Not Checked In
─────────────────
Sign In...
─────────────────
About HRMS Agent
Quit
```

**Signed In (Not Checked In):**
```
Signed in: user@example.com
○ Not Checked In
─────────────────
☀ Check In
─────────────────
Sign Out
─────────────────
About HRMS Agent
Quit
```

**Signed In (Checked In):**
```
Signed in: user@example.com
● Checked In
─────────────────
🌙 Check Out
─────────────────
Sign Out
─────────────────
About HRMS Agent
Quit
```

#### Window Behavior
- Login window: 420×520px, non-resizable, centered, **hidden by default**
- Close button **hides** the window instead of quitting (intercepted via `on_window_event`)
- App persists in system tray

### 7.3 Credential Management

Credentials are stored in the **OS keychain** (`keyring` crate):

| Function | Key | Purpose |
| --- | --- | --- |
| `save_token(token)` | `hrms-agent/access_token` | Store JWT access token |
| `load_token()` | `hrms-agent/access_token` | Retrieve saved token on startup |
| `delete_token()` | `hrms-agent/access_token` | Clear on sign out |
| `save_refresh_token(token)` | `hrms-agent/refresh_token` | Store refresh token |
| `load_refresh_token()` | `hrms-agent/refresh_token` | Retrieve for token refresh |
| `delete_refresh_token()` | `hrms-agent/refresh_token` | Clear on sign out |

On startup, the agent attempts to `load_token()` from the keychain. If a token exists, the user is automatically logged in without showing the login window.

### 7.4 Ping Loop & Idle Detection

#### Ping Loop (`ping.rs`)

- **Interval**: Every 2 minutes (120 seconds)
- **Endpoint**: `POST /attendance-ping`
- **Payload**: `{ source: "AGENT", timestamp: ISO-8601 }`
- **Lifecycle**: Starts after check-in, stops when `checked_in` becomes false
- **Purpose**: Heartbeat to server confirming employee is active

#### Idle Detection (`idle.rs`)

- **Polling interval**: Every 30 seconds
- **Idle threshold**: 5 minutes (300 seconds)
- **Platform detection**:
  - **macOS**: Reads `HIDIdleTime` from `ioreg -c IOHIDSystem` (nanoseconds → seconds)
  - **Linux**: Uses `xprintidle` command (milliseconds → seconds)
  - **Windows**: Uses `GetLastInputInfo` Win32 API
- **Flow**:
  1. Poll system idle time every 30s
  2. If idle ≥ 5min → mark as idle, record start time
  3. When user becomes active again → report idle duration to `POST /attendance-idle-event`
  4. Only runs while `checked_in = true`

### 7.5 Login UI

The login window is a **single HTML file** (`ui/index.html`) with:

- Styled login card with gradient background
- Email + password form fields
- Calls Supabase Auth API directly (`/auth/v1/token?grant_type=password`)
- On success: invokes Tauri command `set_auth_token` to pass tokens to Rust backend
- Stores tokens in OS keychain and updates tray menu
- Error/success message display

---

## 8. Module Deep-Dives

### 8.1 Attendance Module

#### Data Model

```
attendance_days (1 per user per day)
  ├── attendance_events (many per day)
  │   ├── CHECK_IN
  │   ├── PING (every 2 min from agent)
  │   ├── IDLE_START / IDLE_END
  │   ├── LOCATION_UPDATE
  │   └── CHECK_OUT
  ├── location_snapshot (latest JSONB)
  └── worked_minutes (total - idle)
```

#### Work Mode Decision Tree

```
HR Policy Work Mode
├── OFFICE_ONLY
│   ├── In geofence + WiFi OK → PRESENT
│   ├── Outside geofence + block_checkin → BLOCKED (403)
│   └── Outside geofence + no block → NON_COMPLIANT (notify HR)
├── HYBRID
│   ├── In geofence → PRESENT
│   ├── Outside + wfh_fallback → WFH
│   └── Outside + no fallback → NON_COMPLIANT (notify HR)
└── WFH_ALLOWED
    ├── In geofence → PRESENT
    └── Outside → WFH
```

#### Geofence Compliance

Uses **Haversine formula** (PostgreSQL function) to compute great-circle distance:
- Employee's GPS coordinates vs. office location coordinates
- Within `geofence_radius_meters` → compliant
- Optional WiFi SSID match check

#### Attendance Status Colors (UI)

| Status | Color |
| --- | --- |
| PRESENT | Green |
| WFH | Blue |
| ABSENT | Red |
| LEAVE | Yellow |
| HOLIDAY | Purple |
| WEEKEND | Gray |
| HALF_DAY | Orange |
| LATE | Amber |
| NON_COMPLIANT | Dark Red |

### 8.2 Leave Management Module

#### Leave Application Flow

```
Employee submits leave request
  → Validate leave type exists for org
  → Get HR policy weekends + holidays
  → Count working days in range (exclude weekends + holidays)
  → Check leave balance (for paid leaves)
  → Create leave_request (status: PENDING)
  → Update leave_balance (increment total_pending)
  → Notify HR/Admin
```

#### Leave Approval Flow

```
HR/Admin processes leave request
  ├── APPROVED
  │   ├── Update leave_balance (total_used += days, total_pending = 0)
  │   ├── Upsert attendance_days as LEAVE for each working day
  │   ├── Notify employee (LEAVE_APPROVED)
  │   └── Log audit
  └── REJECTED
      ├── Reset leave_balance (total_pending = 0)
      ├── Notify employee (LEAVE_REJECTED)
      └── Log audit
```

#### Leave Balance (Computed Column)

```sql
balance = total_accrued + carry_forwarded - total_used - total_pending
```

### 8.3 Payroll Module

#### Monthly Payroll Generation Flow

```
HR/Admin triggers payroll for YYYY-MM-01
  1. Create payroll_run (status: PROCESSING)
  2. Deactivate previous payslips for this month
  3. Determine next version number
  4. For each active employee with payroll_profile:
     a. Get HR policy (weekends, LOP rules)
     b. Count working days (exclude weekends + holidays)
     c. Count LOP days:
        - Unpaid leave days (approved, in month)
        - Absent days (if count_absent_as_lop)
        - Non-compliant days (if count_non_compliant_as_lop)
     d. Calculate payroll:
        - Earnings (from salary structure or base salary)
        - Statutory deductions (EPF, ESI, PT)
        - LOP deduction = per_day_rate × lop_days
        - Net pay = gross - deductions - LOP
     e. Create payslip with full breakdown (JSONB)
  5. Update payroll_run (totals, status: COMPLETED)
  6. Notify each employee (PAYSLIP_GENERATED)
  7. Log audit
```

#### CSV Export

Exports payroll register with columns:
`Employee Code, Name, Designation, Working Days, LOP Days, Payable Days, Gross Pay, LOP Deduction, Total Deductions, Net Pay`

### 8.4 Notifications Module

#### Notification Types & Triggers

| Type | Triggered By | Recipients |
| --- | --- | --- |
| `LEAVE_APPLIED` | Employee applies for leave | HR/Admin |
| `LEAVE_APPROVED` | HR approves leave | Employee |
| `LEAVE_REJECTED` | HR rejects leave | Employee |
| `IDLE_THRESHOLD` | Idle time exceeds policy threshold | HR/Admin |
| `NON_COMPLIANT` | Check-in outside geofence (OFFICE_ONLY) | HR/Admin |
| `PAYSLIP_GENERATED` | Monthly payroll generated | Employee |
| `FEEDBACK_RECEIVED` | Anonymous feedback submitted | HR/Admin |
| `POLICY_CHANGED` | HR policy updated | Affected employees |

#### Real-time Polling

- Notifications and unread count refresh every **30 seconds** via React Query's `refetchInterval`
- Max 50 notifications loaded, latest 20 shown in dropdown

### 8.5 Anonymous Feedback Module

- **Identity**: SHA-256 hash of `user_id + org_salt` (cannot be reversed)
- **Rate limit**: 24h per unique `user_hash` (enforced via index on `user_hash + created_at`)
- **Moderation**: HR views feedback with status `PENDING` → can mark as `APPROVED` or `FLAGGED`
- **Categories**: Flexible text field (default: `'general'`)

### 8.6 Audit Logging

Every mutation in the system is logged:

```json
{
  "actor_id": "uuid",
  "action": "CHECK_IN | CHECK_OUT | LEAVE_APPROVED | PAYROLL_GENERATED | ...",
  "resource_type": "attendance_days | leave_requests | payslips | ...",
  "resource_id": "uuid",
  "old_value": { "...previous state..." },
  "new_value": { "...new state..." },
  "ip_address": "1.2.3.4"
}
```

- **Access**: Admin only (enforced via RLS)
- **Indexed**: By org, actor, resource type+id, created_at (DESC)
- **Immutable**: No UPDATE/DELETE policies

---

## 9. RBAC (Role-Based Access Control)

Three hierarchical roles enforced at both UI and database levels:

| Capability | EMPLOYEE | HR | ADMIN |
| --- | --- | --- | --- |
| View own dashboard | ✅ | ✅ | ✅ |
| Check in/out | ✅ | ✅ | ✅ |
| Apply for leave | ✅ | ✅ | ✅ |
| View own payslips | ✅ | ✅ | ✅ |
| Submit feedback | ✅ | ✅ | ✅ |
| View all employees | ❌ | ✅ | ✅ |
| Approve/reject leave | ❌ | ✅ | ✅ |
| Run payroll | ❌ | ✅ | ✅ |
| Export payroll CSV | ❌ | ✅ | ✅ |
| Manage HR policies | ❌ | ✅ | ✅ |
| Moderate feedback | ❌ | ✅ | ✅ |
| View reports | ❌ | ✅ | ✅ |
| Manage departments | ❌ | ✅ | ✅ |
| Manage locations | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Organization settings | ❌ | ❌ | ✅ |
| Manage agent releases | ❌ | ❌ | ✅ |

### Enforcement Layers

1. **Database (RLS)**: PostgreSQL policies using `auth_role()` and `auth_org_id()` helper functions
2. **Edge Functions**: `requireRole(ctx, 'HR', 'ADMIN')` check throws `Forbidden` error
3. **UI (Sidebar)**: `NAV_ITEMS` filtered based on `profile.role` — HR/Admin items only shown to appropriate roles
4. **React Query**: Hooks like `useOrgAttendance` have `enabled` guards checking role

---

## 10. Payroll Formula & Calculations

### Core Formula

```
working_days     = calendar_days − weekends − holidays
per_day_rate     = gross_monthly_salary / working_days
lop_days         = unpaid_leave_days
                 + (absent_days        if policy.count_absent_as_lop)
                 + (non_compliant_days if policy.count_non_compliant_as_lop)
lop_deduction    = per_day_rate × lop_days
payable_days     = working_days − lop_days

Earnings:
  If salary_structure defined → compute from structure (fixed + percentage-based)
  Else → Basic Salary = base_monthly_salary

Statutory Deductions (Indian Defaults):
  EPF  = 12% of Basic (Basic assumed 40% of Gross, capped at ₹1,800/month)
  ESI  = 0.75% of Gross (only if Gross ≤ ₹21,000/month)
  PT   = ₹200/month (flat)

net_pay = gross_pay − lop_deduction − EPF − ESI − PT
```

### Salary Structure (Custom)

When a custom `SalaryStructure` is defined on `payroll_profiles`:

```json
{
  "earnings": [
    { "name": "Basic", "amount": 20000, "is_percentage": false },
    { "name": "HRA", "amount": 50, "is_percentage": true, "percentage_of": "Basic" },
    { "name": "Special Allowance", "amount": 5000, "is_percentage": false }
  ],
  "deductions": [
    { "name": "EPF", "amount": 12, "is_percentage": true },
    { "name": "PT", "amount": 200, "is_percentage": false }
  ]
}
```

- **Two-pass earning computation**: Fixed amounts first, then percentage-based (can reference computed values)
- **Custom deductions** override defaults if provided
- All amounts rounded to 2 decimal places via `roundCurrency()`

---

## 11. Environment Variables

| Variable | Required | Where | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Web | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Web | Supabase anonymous (public) key |
| `SUPABASE_URL` | ✅ | Edge Functions | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Edge Functions | Auto-injected; full DB access |
| `SUPABASE_ANON_KEY` | ✅ | Edge Functions | Auto-injected |
| `HRMS_API_BASE` | ❌ | Agent (env) | Override Edge Function base URL |

---

## 12. Scripts & Commands

### Root (`package.json`)

| Script | Command | Description |
| --- | --- | --- |
| `npm run dev` | `next dev` (via workspace) | Start Next.js dev server |
| `npm run build` | `next build` (via workspace) | Production build |
| `npm run lint` | `next lint` (via workspace) | ESLint check |
| `npm run dev:agent` | `tauri dev` (via workspace) | Start Tauri agent in dev mode |
| `npm run build:shared` | `tsc` (via workspace) | TypeScript compile shared package |
| `npm run db:migrate` | `supabase db push` | Apply pending migrations |
| `npm run db:reset` | `supabase db reset` | Reset DB with all migrations + seed |
| `npm run db:seed` | `supabase db seed` | Re-run seed file |
| `npm run functions:serve` | `supabase functions serve` | Serve edge functions locally |
| `npm run functions:deploy` | `supabase functions deploy` | Deploy all edge functions |

### Web App (`apps/web/package.json`)

| Script | Command |
| --- | --- |
| `npm run dev` | `next dev` |
| `npm run build` | `next build` |
| `npm run start` | `next start` |
| `npm run lint` | `next lint` |

### Desktop Agent (`apps/agent/package.json`)

| Script | Command |
| --- | --- |
| `npm run dev` | `tauri dev` |
| `npm run build` | `tauri build` |

---

## 13. Deployment Guide

### Web App → Vercel

The project includes a `vercel.json`:

```json
{
  "buildCommand": "npm run build --workspace=apps/web",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

**Steps:**
1. Connect repository to Vercel
2. Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy (auto-detects monorepo structure)

### Supabase (Hosted)

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push              # Apply all migrations
npx supabase functions deploy     # Deploy all edge functions
```

### Desktop Agent

```bash
cd apps/agent
npm run build
# Produces platform-specific installer in src-tauri/target/release/bundle/
```

Supported platforms: macOS (`.dmg`), Windows (`.msi`), Linux (`.AppImage`, `.deb`)

---

## 14. Development Workflow

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Supabase CLI** — `npm install -g supabase`
- **Rust toolchain** (for agent) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### First-Time Setup

```bash
# 1. Clone & install
git clone <repo-url> && cd HRMS
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Start local Supabase
npx supabase start          # Starts Postgres, Auth, Storage, Edge Runtime
npx supabase db reset        # Applies migrations + seed data

# 4. Start the web app
npm run dev                  # http://localhost:3000

# 5. (Optional) Serve edge functions
npm run functions:serve      # Serves all edge functions locally

# 6. (Optional) Start the desktop agent
cd apps/agent && npm install && npm run dev
```

### Creating Test Users

Since the `handle_new_user()` trigger auto-creates profiles, create users via Supabase Auth with metadata:

```json
{
  "organization_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "full_name": "John Doe",
  "employee_code": "EMP-001",
  "role": "ADMIN"
}
```

Use the Supabase Dashboard (Studio at `http://localhost:54323`) or the Auth API to create test users.

### Key Development Patterns

1. **All pages are client components** — Use `'use client'` directive with React Query for data fetching
2. **Edge Functions for mutations** — All write operations go through Edge Functions (not direct Supabase client writes)
3. **Shared validation** — Zod schemas in `@hrms/shared` are used in both frontend and backend
4. **Query invalidation** — Mutations invalidate related query keys for automatic UI refresh
5. **Multi-tenant by default** — All queries scoped by `organization_id` via RLS

---

## License

MIT
