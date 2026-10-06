-- Gauntlet database, as it stood on the live project on 6 October 2026 (build 51).
-- From here on every database change is a numbered file in this folder,
-- applied to gauntlet-test first and to the live project only after its gate.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  aim text,
  created_at timestamptz not null default now()
);

create table public.state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rev integer not null default 0,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  unit text,
  chips jsonb default '[]'::jsonb,
  caption text,
  session jsonb,
  origin_post uuid references public.posts(id) on delete set null,
  try_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower uuid not null references auth.users(id) on delete cascade,
  followee uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee)
);

create table public.tries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.state    enable row level security;
alter table public.posts    enable row level security;
alter table public.follows  enable row level security;
alter table public.tries    enable row level security;

create policy profiles_read  on public.profiles for select to authenticated using (true);
create policy profiles_write on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy profiles_edit  on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gauntlet delete own profile" on public.profiles for delete using (auth.uid() = user_id);

create policy state_read  on public.state for select to authenticated using (auth.uid() = user_id);
create policy state_write on public.state for insert to authenticated with check (auth.uid() = user_id);
create policy state_edit  on public.state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gauntlet delete own state" on public.state for delete using (auth.uid() = user_id);

create policy posts_read   on public.posts for select to authenticated using (true);
create policy posts_write  on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy posts_delete on public.posts for delete to authenticated using (auth.uid() = user_id);
create policy "gauntlet delete own posts" on public.posts for delete using (auth.uid() = user_id);

create policy follows_read  on public.follows for select to authenticated using (true);
create policy follows_write on public.follows for insert to authenticated with check (auth.uid() = follower);
create policy follows_drop  on public.follows for delete to authenticated using (auth.uid() = follower);
create policy "gauntlet delete own follows" on public.follows for delete using (auth.uid() = follower or auth.uid() = followee);

create policy tries_read  on public.tries for select to authenticated using (true);
create policy tries_write on public.tries for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

create or replace function public.increment_try(p_post uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.posts set try_count = try_count + 1 where id = p_post returning try_count into n;
  return coalesce(n, 0);
end $$;

revoke execute on function public.increment_try(uuid) from public, anon;
grant execute on function public.increment_try(uuid) to authenticated;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
