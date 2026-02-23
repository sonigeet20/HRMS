# HRMS — Copilot Instructions

## Project Overview
Production-ready HRMS monorepo: Next.js 14 + Supabase + Tauri desktop agent.

## Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres + Auth + RLS + Edge Functions + Storage)
- **Desktop Agent**: Tauri 1.x (Rust) — system tray, idle detection, geo-ping
- **Shared**: @hrms/shared package (Zod schemas, TypeScript types, utilities)
- **Monorepo**: npm workspaces (`apps/*`, `packages/*`)

## Key Conventions
- All pages are client components (`'use client'`) with TanStack React Query for data fetching
- Edge Functions are Deno-based, located in `supabase/functions/`
- RLS policies enforce RBAC (ADMIN, HR, EMPLOYEE) at the database level
- Payroll uses Indian statutory defaults (EPF 12%, ESI 0.75%, PT ₹200)
- Anonymous feedback uses SHA-256 hashed identity with 24h rate limiting

## Commands
- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npx supabase start` — Start local Supabase
- `npx supabase db reset` — Reset DB with migrations + seed
