-- 0002: accounts (Phase 1, build 52).
--
-- 1. settings: one private row per person for their profile (body details,
--    aim, kit, style, split, targets), year of birth and the two consents.
-- 2. Consent is enforced here, not only in the app: no settings row and no
--    saved state can be written until health data consent and the terms have
--    both been recorded. Withdrawing consent is deleting the row.
-- 3. Handle rules: 3 to 20 lowercase letters, numbers or underscores, unique,
--    not on the blocklist, changeable once every 30 days.
-- 4. Anonymous accounts (made silently on first open, from build 53) can keep
--    their own settings and state, and nothing else: no profile, posts,
--    follows or tries, and they cannot read anyone else's.

-- ---------- 1. settings ----------
create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  body jsonb not null default '{}'::jsonb,
  birth_year smallint check (birth_year between 1900 and 2100),
  health_consent_at timestamptz,
  terms_version text,
  terms_accepted_at timestamptz,
  rev integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint settings_consented check (health_consent_at is not null and terms_accepted_at is not null and terms_version is not null)
);
alter table public.settings enable row level security;

create policy settings_read   on public.settings for select to authenticated using (auth.uid() = user_id);
create policy settings_write  on public.settings for insert to authenticated with check (auth.uid() = user_id);
create policy settings_edit   on public.settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy settings_delete on public.settings for delete to authenticated using (auth.uid() = user_id);

-- ---------- 2. saved state needs consent first ----------
create or replace function public.has_consented() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.settings where user_id = auth.uid())
$$;
revoke execute on function public.has_consented() from public, anon;
grant execute on function public.has_consented() to authenticated;

create policy state_needs_consent_add  on public.state as restrictive for insert to authenticated
  with check (public.has_consented());
create policy state_needs_consent_edit on public.state as restrictive for update to authenticated
  using (public.has_consented()) with check (public.has_consented());

-- ---------- 3. handles ----------
create table public.handle_blocklist (
  word text primary key check (word ~ '^[a-z0-9]+$'),
  match text not null default 'exact' check (match in ('exact', 'contains'))
);
-- No policies: nobody reads or writes this through the API. Add words in the
-- SQL editor. 'exact' compares against the handle with digits and underscores
-- taken out (so 'admin_1' is 'admin'); 'contains' blocks the word anywhere,
-- so keep that for words that are never part of an ordinary one (the RLS
-- tests check 'scunthorpe' and 'grape' still pass).
alter table public.handle_blocklist enable row level security;

insert into public.handle_blocklist (word, match) values
  ('admin', 'exact'), ('administrator', 'exact'), ('support', 'exact'), ('help', 'exact'),
  ('official', 'exact'), ('moderator', 'exact'), ('mod', 'exact'), ('staff', 'exact'),
  ('team', 'exact'), ('system', 'exact'), ('root', 'exact'), ('null', 'exact'),
  ('undefined', 'exact'), ('me', 'exact'), ('you', 'exact'), ('everyone', 'exact'),
  ('gauntlet', 'contains'), ('fergtech', 'contains'),
  ('fuck', 'contains'), ('nigga', 'contains'), ('faggot', 'contains'),
  ('nigger', 'exact'), ('niggers', 'exact'),
  ('cunt', 'exact'), ('cunts', 'exact'),
  ('hitler', 'contains'), ('porn', 'contains'),
  ('shit', 'exact'), ('bitch', 'exact'), ('whore', 'exact'), ('slut', 'exact'),
  ('rape', 'exact'), ('rapist', 'exact'), ('nazi', 'exact'), ('wank', 'exact'),
  ('wanker', 'exact'), ('dick', 'exact'), ('cock', 'exact'), ('pussy', 'exact');

-- 'ok', 'format', 'blocked' or 'taken'
create or replace function public.handle_check(h text, me uuid default null) returns text
language plpgsql stable security definer set search_path = public as $$
declare bare text;
begin
  if h is null or h !~ '^[a-z0-9_]{3,20}$' then return 'format'; end if;
  bare := regexp_replace(h, '[0-9_]', '', 'g');
  if exists (select 1 from public.handle_blocklist b
             where (b.match = 'exact' and bare = b.word) or (b.match = 'contains' and strpos(h, b.word) > 0))
  then return 'blocked'; end if;
  if exists (select 1 from public.profiles p where p.handle = h and p.user_id is distinct from me) then return 'taken'; end if;
  return 'ok';
end $$;
revoke execute on function public.handle_check(text, uuid) from public, anon, authenticated;

-- What the app calls before saving a handle. Signed-in, claimed accounts only.
create or replace function public.handle_available(h text) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in with an email first' using errcode = '42501';
  end if;
  return public.handle_check(lower(h), auth.uid());
end $$;
revoke execute on function public.handle_available(text) from public, anon;
grant execute on function public.handle_available(text) to authenticated;

alter table public.profiles
  add column display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  add column handle_changed_at timestamptz not null default now(),
  add constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$');

create or replace function public.profiles_handle_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare verdict text;
begin
  if tg_op = 'UPDATE' and new.handle = old.handle then
    new.handle_changed_at := old.handle_changed_at;   -- nobody can backdate their own clock
    return new;
  end if;
  verdict := public.handle_check(new.handle, new.user_id);
  if verdict = 'blocked' then raise exception 'handle_blocked' using errcode = '23514'; end if;
  if verdict = 'format'  then raise exception 'handle_format'  using errcode = '23514'; end if;
  -- 'taken' falls through to the unique index, which raises 23505
  if tg_op = 'UPDATE' and old.handle_changed_at > now() - interval '30 days' then
    raise exception 'handle_changed_recently' using errcode = '23514';
  end if;
  new.handle_changed_at := now();
  return new;
end $$;
create trigger profiles_handle_rules before insert or update on public.profiles
  for each row execute function public.profiles_handle_rules();

-- ---------- 4. anonymous accounts stay out of the social side ----------
create policy profiles_claimed_only on public.profiles as restrictive for all to authenticated
  using (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false))
  with check (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false));
create policy posts_claimed_only on public.posts as restrictive for all to authenticated
  using (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false))
  with check (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false));
create policy follows_claimed_only on public.follows as restrictive for all to authenticated
  using (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false))
  with check (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false));
create policy tries_claimed_only on public.tries as restrictive for all to authenticated
  using (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false))
  with check (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false));

create or replace function public.increment_try(p_post uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in with an email first' using errcode = '42501';
  end if;
  update public.posts set try_count = try_count + 1 where id = p_post returning try_count into n;
  return coalesce(n, 0);
end $$;
revoke execute on function public.increment_try(uuid) from public, anon;
grant execute on function public.increment_try(uuid) to authenticated;
