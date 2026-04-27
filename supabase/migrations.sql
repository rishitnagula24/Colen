-- Run this in the Supabase SQL editor (after schema.sql)

-- Writing samples
create table if not exists public.writing_samples (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  file_name text not null,
  content text not null,
  plan text default 'free',
  created_at timestamptz default now()
);
alter table public.writing_samples enable row level security;
create policy "Users can manage own writing samples" on public.writing_samples
  for all using (auth.uid() = user_id);

-- Email drafts
create table if not exists public.email_drafts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  professor_id uuid references public.professors(id),
  goal_type text,
  research_answers jsonb,
  generated_subject text,
  generated_body text,
  professor_perspective jsonb,
  status text default 'draft',
  created_at timestamptz default now()
);
alter table public.email_drafts enable row level security;
create policy "Users can manage own drafts" on public.email_drafts
  for all using (auth.uid() = user_id);

-- Professor match scores (cached LLM results)
create table if not exists public.professor_match_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  professor_id uuid references public.professors(id) on delete cascade not null,
  score integer,
  match_reasons text[],
  created_at timestamptz default now(),
  unique (user_id, professor_id)
);
alter table public.professor_match_scores enable row level security;
create policy "Users can manage own match scores" on public.professor_match_scores
  for all using (auth.uid() = user_id);

-- Gmail OAuth tokens (for sending emails from user's Gmail)
create table if not exists public.user_gmail_tokens (
  user_id uuid references public.users(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text not null,
  gmail_address text not null,
  expires_at timestamptz,
  updated_at timestamptz default now()
);
alter table public.user_gmail_tokens enable row level security;
create policy "Users can manage own gmail tokens" on public.user_gmail_tokens
  for all using (auth.uid() = user_id);

-- Waitlist (service role only — anon key is blocked by RLS)
create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz default now()
);
alter table public.waitlist enable row level security;
-- No public access — only service role key bypasses RLS
create policy "No public access" on public.waitlist for all using (false);
