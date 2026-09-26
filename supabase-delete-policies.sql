-- Gauntlet: allow people to delete their own data
-- Run once in the Supabase dashboard: SQL Editor, paste, Run.
--
-- Why: "Delete everything" in the app now removes a person's rows from all four
-- tables it uses. Supabase only allows that if a delete policy exists. Without
-- one, Supabase answers "OK" but deletes nothing. The app checks afterwards and
-- will say the data is still there, and it will not wipe the device, but the
-- deletion will not happen until these policies exist.
--
-- Safe to run more than once. It only ADDS delete permission for a person's
-- own rows; it does not change who can read or write anything.
--
-- Assumes the user columns are uuid, which is the Supabase default. If yours
-- are text, change  auth.uid()  to  auth.uid()::text  in each line below.

drop policy if exists "gauntlet delete own state"   on public.state;
create policy        "gauntlet delete own state"   on public.state
  for delete using (auth.uid() = user_id);

drop policy if exists "gauntlet delete own profile" on public.profiles;
create policy        "gauntlet delete own profile" on public.profiles
  for delete using (auth.uid() = user_id);

drop policy if exists "gauntlet delete own posts"   on public.posts;
create policy        "gauntlet delete own posts"   on public.posts
  for delete using (auth.uid() = user_id);

-- both directions: who they follow, and who follows them
drop policy if exists "gauntlet delete own follows" on public.follows;
create policy        "gauntlet delete own follows" on public.follows
  for delete using (auth.uid() = follower or auth.uid() = followee);

-- If deleting posts fails with a foreign key error, another person's post
-- probably points at theirs through origin_post. Letting that link clear
-- itself fixes it. Only run this if you see that error, and check the
-- constraint name in Table Editor first:
--
--   alter table public.posts drop constraint posts_origin_post_fkey;
--   alter table public.posts add constraint posts_origin_post_fkey
--     foreign key (origin_post) references public.posts(id) on delete set null;
--
-- The sign-in account itself is removed by delete_my_account() below; before
-- build 40 it had to be removed by hand in Authentication, Users.

-- ---------------------------------------------------------------------------
-- Build 40: let a signed-in person delete their own sign-in account.
-- "Delete everything" calls this last, after their data is gone, so the
-- account itself does not linger. It can only ever delete the caller:
-- auth.uid() is the person making the request, and nobody else.
-- Safe to run more than once.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
