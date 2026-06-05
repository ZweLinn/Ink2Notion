-- ─── Users ─────────────────────────────────────────────────────────────────
-- Mirrors NextAuth session data into Supabase for joins + RLS
create table if not exists public.users (
  id              text primary key,          -- NextAuth user ID (sub)
  email           text unique not null,
  name            text,
  avatar_url      text,
  password_hash   text,                      -- bcrypt hash for credentials users
  provider        text default 'credentials', -- 'credentials', 'google', 'github'
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Add columns if table already exists (safe to re-run)
alter table public.users
  add column if not exists password_hash text,
  add column if not exists provider text default 'credentials';

-- ─── Notion Connections ─────────────────────────────────────────────────────
create table if not exists public.notion_connections (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null references public.users(id) on delete cascade,
  access_token        text not null,
  workspace_id        text not null,
  workspace_name      text,
  bot_id              text,
  notion_database_id  text,             -- set after user picks/creates their DB
  connected_at        timestamptz default now(),
  unique (user_id)                      -- one Notion workspace per user
);

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.notion_connections enable row level security;

-- Users can only read/update their own row
create policy "users: own row" on public.users
  for all using (id = current_setting('app.user_id', true));

-- notion_connections: own rows only
create policy "notion_connections: own rows" on public.notion_connections
  for all using (user_id = current_setting('app.user_id', true));
