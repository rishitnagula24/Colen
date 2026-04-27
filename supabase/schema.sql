-- Run this in the Supabase SQL editor to set up the schema

create table public.users (
  id uuid references auth.users(id) primary key,
  email text not null,
  platform_email text unique,
  name text,
  school text,
  major text,
  year text,
  bio text,
  onboarded boolean default false,
  created_at timestamptz default now()
);

create table public.professors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  title text,
  department text,
  school text,
  research_interests text[] default '{}',
  email text,
  source text default 'seeded',
  created_at timestamptz default now()
);

create table public.email_threads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  professor_id uuid references public.professors(id),
  subject text not null,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.email_messages (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid references public.email_threads(id) on delete cascade,
  direction text not null,
  body text not null,
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz default now()
);

create table public.ai_generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  professor_id uuid references public.professors(id),
  goal_type text,
  form_inputs jsonb,
  generated_subject text,
  generated_body text,
  used boolean default false,
  created_at timestamptz default now()
);

create table public.professor_favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  professor_id uuid not null references public.professors(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, professor_id)
);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, platform_email)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1) || '@reachout.app'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.users enable row level security;
alter table public.professors enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;
alter table public.ai_generations enable row level security;
alter table public.professor_favorites enable row level security;

create policy "Users can manage own profile" on public.users
  for all using (auth.uid() = id);

create policy "Professors are publicly readable" on public.professors
  for select using (true);

create policy "Users can manage own threads" on public.email_threads
  for all using (auth.uid() = user_id);

create policy "Users can manage messages in own threads" on public.email_messages
  for all using (
    thread_id in (select id from public.email_threads where user_id = auth.uid())
  );

create policy "Users can manage own generations" on public.ai_generations
  for all using (auth.uid() = user_id);

create policy "Users can manage own favorites" on public.professor_favorites
  for all using (auth.uid() = user_id);
