-- ============================================
-- _._kret_._ DonutSMP Utils - Supabase setup
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Profiles (public user data linked to auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Categories (admin-managed, can be added from admin panel)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  icon text default '📦',
  created_at timestamptz default now()
);

-- Entries (traps, farms, bases, exploits, etc.)
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category_id uuid references categories(id) on delete set null,
  description text default '',
  materials text default '',
  difficulty text default 'medium' check (difficulty in ('easy','medium','hard','expert')),
  tags text[] default '{}',
  screenshot_url text,
  video_url text,
  author_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Comments
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references entries(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- Likes (unique per user per entry)
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references entries(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (entry_id, user_id)
);

-- ============================================
-- Seed default categories
-- ============================================
insert into categories (slug, name, icon) values
  ('traps', 'Traps', '🪤'),
  ('farms', 'Farms', '🌾'),
  ('bases', 'Bases', '🏰'),
  ('exploits', 'Exploits', '⚡')
on conflict (slug) do nothing;

-- ============================================
-- Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Row Level Security
-- ============================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table entries enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;

-- Profiles: anyone can read, user can update their own
drop policy if exists "profiles_read" on profiles;
create policy "profiles_read" on profiles for select using (true);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Categories: anyone reads, only admins modify
drop policy if exists "categories_read" on categories;
create policy "categories_read" on categories for select using (true);

drop policy if exists "categories_admin_all" on categories;
create policy "categories_admin_all" on categories for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Entries: anyone reads, only admins modify
drop policy if exists "entries_read" on entries;
create policy "entries_read" on entries for select using (true);

drop policy if exists "entries_admin_all" on entries;
create policy "entries_admin_all" on entries for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Comments: anyone reads, authenticated users insert, own comment or admin deletes
drop policy if exists "comments_read" on comments;
create policy "comments_read" on comments for select using (true);

drop policy if exists "comments_insert_auth" on comments;
create policy "comments_insert_auth" on comments for insert with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own_or_admin" on comments;
create policy "comments_delete_own_or_admin" on comments for delete
  using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Likes: anyone reads, user inserts/deletes own
drop policy if exists "likes_read" on likes;
create policy "likes_read" on likes for select using (true);

drop policy if exists "likes_insert_own" on likes;
create policy "likes_insert_own" on likes for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on likes;
create policy "likes_delete_own" on likes for delete using (auth.uid() = user_id);

-- ============================================
-- Storage bucket for screenshots
-- Run this in Supabase Dashboard -> Storage, OR:
-- ============================================
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "screenshots_read" on storage.objects;
create policy "screenshots_read" on storage.objects for select
  using (bucket_id = 'screenshots');

drop policy if exists "screenshots_admin_upload" on storage.objects;
create policy "screenshots_admin_upload" on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "screenshots_admin_delete" on storage.objects;
create policy "screenshots_admin_delete" on storage.objects for delete
  using (
    bucket_id = 'screenshots'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
