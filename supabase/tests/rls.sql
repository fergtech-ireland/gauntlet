-- Row level security tests.
--
-- Acts as two signed-in people (A and B) and a signed-out visitor, and proves
-- each can read and change only what they should. The last statement returns
-- one row per check; every row must say ok = true.
--
-- Runs on a throwaway local Postgres in every test run (rls.test.js), and can
-- be pasted into the SQL editor of gauntlet-test as it is. It removes its own
-- test people at the end. Never run it on the live project.
--
-- When a migration adds a table, add its checks here in the same change.

create temp table rls_results (n serial primary key, ok boolean not null, check_name text not null);
grant select, insert on rls_results to anon, authenticated;
grant usage on sequence rls_results_n_seq to anon, authenticated;

begin;

-- three test people; C exists only to be followed
delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c');
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'rls-a@gauntlet.test'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-b@gauntlet.test'),
  ('00000000-0000-4000-8000-00000000000c', 'rls-c@gauntlet.test');

-- every table in public has row level security switched on
insert into rls_results (ok, check_name)
select coalesce(bool_and(c.relrowsecurity), true),
       'every public table has RLS on' || coalesce(' (off: ' || string_agg(c.relname, ', ') filter (where not c.relrowsecurity) || ')', '')
from pg_class c join pg_namespace s on s.oid = c.relnamespace
where s.nspname = 'public' and c.relkind in ('r', 'p');

-- ============ as B: save B's own things ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

insert into public.profiles (user_id, handle, aim) values ('00000000-0000-4000-8000-00000000000b', 'rls_b', 'cut');
insert into public.state (user_id, payload) values ('00000000-0000-4000-8000-00000000000b', '{"secret":"b-weight"}');
insert into public.posts (id, user_id, kind, title) values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'lift', 'B push');
insert into public.follows (follower, followee) values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c');
insert into public.follows (follower, followee) values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a');
insert into rls_results (ok, check_name) values (true, 'B can save their own profile, state, post and follows');

-- ============ as A ============
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

insert into public.profiles (user_id, handle) values ('00000000-0000-4000-8000-00000000000a', 'rls_a');
insert into public.state (user_id, payload) values ('00000000-0000-4000-8000-00000000000a', '{"secret":"a-weight"}');
insert into public.posts (id, user_id, kind, title) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'lift', 'A legs');
insert into rls_results (ok, check_name) values (true, 'A can save their own profile, state and post');

-- private data: state
insert into rls_results (ok, check_name)
select count(*) = 1 and bool_and(user_id = '00000000-0000-4000-8000-00000000000a'), 'A reads only their own saved state'
from public.state;

update public.state set payload = '{"secret":"changed by A"}' where user_id = '00000000-0000-4000-8000-00000000000b';
delete from public.state where user_id = '00000000-0000-4000-8000-00000000000b';

do $$ begin
  begin
    insert into public.state (user_id, payload) values ('00000000-0000-4000-8000-00000000000b', '{}');
    insert into rls_results (ok, check_name) values (false, 'A cannot save state as B');
  exception when insufficient_privilege or unique_violation then
    insert into rls_results (ok, check_name) values (true, 'A cannot save state as B');
  end;
  begin
    update public.state set user_id = '00000000-0000-4000-8000-00000000000b' where user_id = '00000000-0000-4000-8000-00000000000a';
    insert into rls_results (ok, check_name) values (false, 'A cannot hand their state row to B');
  exception when insufficient_privilege or unique_violation then
    insert into rls_results (ok, check_name) values (true, 'A cannot hand their state row to B');
  end;
end $$;

-- profiles
update public.profiles set handle = 'hijacked' where user_id = '00000000-0000-4000-8000-00000000000b';
delete from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b';
do $$ begin
  begin
    insert into public.profiles (user_id, handle) values ('00000000-0000-4000-8000-00000000000c', 'pretend_c');
    insert into rls_results (ok, check_name) values (false, 'A cannot create a profile for someone else');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'A cannot create a profile for someone else');
  end;
end $$;

-- posts
delete from public.posts where id = '00000000-0000-4000-8000-0000000000b1';
do $$ begin
  begin
    insert into public.posts (user_id, kind, title) values ('00000000-0000-4000-8000-00000000000b', 'lift', 'posted as B');
    insert into rls_results (ok, check_name) values (false, 'A cannot post as B');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'A cannot post as B');
  end;
  begin
    update public.posts set title = 'edited by A' where id = '00000000-0000-4000-8000-0000000000b1';
    insert into rls_results (ok, check_name)
    select not exists (select 1 from public.posts where title = 'edited by A'), 'A cannot edit B''s post';
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'A cannot edit B''s post');
  end;
end $$;

-- follows
insert into public.follows (follower, followee) values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
insert into rls_results (ok, check_name) values (true, 'A can follow B');
delete from public.follows where follower = '00000000-0000-4000-8000-00000000000b' and followee = '00000000-0000-4000-8000-00000000000c';
do $$ begin
  begin
    insert into public.follows (follower, followee) values ('00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-00000000000a');
    insert into rls_results (ok, check_name) values (false, 'A cannot make C follow them');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'A cannot make C follow them');
  end;
end $$;
-- removing a follower is allowed by design (the followee may delete the row)
delete from public.follows where follower = '00000000-0000-4000-8000-00000000000b' and followee = '00000000-0000-4000-8000-00000000000a';

-- tries
do $$ begin
  begin
    insert into public.tries (user_id, post_id) values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a1');
    insert into rls_results (ok, check_name) values (false, 'A cannot record a try as B');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'A cannot record a try as B');
  end;
end $$;
insert into public.tries (user_id, post_id) values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000b1');
insert into rls_results (ok, check_name) select public.increment_try('00000000-0000-4000-8000-0000000000b1') = 1, 'a signed-in person can credit a try';

-- today's open feed, by design until phase 3 replaces it with friends:
-- profiles, posts and follows are readable by anyone signed in
insert into rls_results (ok, check_name)
select (select count(*) from public.profiles) = 2 and (select count(*) from public.posts) = 2,
       'today, by design: signed-in people see every profile and post (the open feed)';

-- ============ back as B: nothing A tried stuck ============
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

insert into rls_results (ok, check_name)
select count(*) = 1 and bool_and(payload ->> 'secret' = 'b-weight'), 'B''s state is untouched by A (not changed, deleted or read)'
from public.state;
insert into rls_results (ok, check_name)
select exists (select 1 from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b' and handle = 'rls_b'), 'B''s profile is untouched by A';
insert into rls_results (ok, check_name)
select exists (select 1 from public.posts where id = '00000000-0000-4000-8000-0000000000b1' and title = 'B push'), 'B''s post is untouched by A';
insert into rls_results (ok, check_name)
select exists (select 1 from public.follows where follower = '00000000-0000-4000-8000-00000000000b' and followee = '00000000-0000-4000-8000-00000000000c'), 'B''s follow of C is untouched by A';
insert into rls_results (ok, check_name)
select not exists (select 1 from public.follows where follower = '00000000-0000-4000-8000-00000000000b' and followee = '00000000-0000-4000-8000-00000000000a'), 'A could remove B as a follower (intended)';

-- ============ signed out ============
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

insert into rls_results (ok, check_name)
select (select count(*) from public.state) + (select count(*) from public.profiles) + (select count(*) from public.posts)
     + (select count(*) from public.follows) + (select count(*) from public.tries) = 0,
       'signed out: nothing at all is readable';
do $$ begin
  begin
    insert into public.posts (user_id, kind, title) values ('00000000-0000-4000-8000-00000000000a', 'lift', 'anon');
    insert into rls_results (ok, check_name) values (false, 'signed out: cannot post');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'signed out: cannot post');
  end;
  begin
    perform public.increment_try('00000000-0000-4000-8000-0000000000b1');
    insert into rls_results (ok, check_name) values (false, 'signed out: cannot credit a try');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'signed out: cannot credit a try');
  when others then
    insert into rls_results (ok, check_name) values (false, 'signed out: cannot credit a try (it ran and failed inside)');
  end;
  begin
    perform public.delete_my_account();
    insert into rls_results (ok, check_name) values (false, 'signed out: cannot call delete my account');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'signed out: cannot call delete my account');
  when others then
    insert into rls_results (ok, check_name) values (false, 'signed out: cannot call delete my account (it ran and failed inside)');
  end;
end $$;

-- ============ A deletes their account ============
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select public.delete_my_account();

reset role;
insert into rls_results (ok, check_name)
select not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-00000000000a')
   and not exists (select 1 from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a')
   and not exists (select 1 from public.state where user_id = '00000000-0000-4000-8000-00000000000a')
   and not exists (select 1 from public.posts where user_id = '00000000-0000-4000-8000-00000000000a')
   and not exists (select 1 from public.follows where '00000000-0000-4000-8000-00000000000a' in (follower, followee))
   and not exists (select 1 from public.tries where user_id = '00000000-0000-4000-8000-00000000000a'),
   'delete my account removes every row A had, and the sign-in';
insert into rls_results (ok, check_name)
select exists (select 1 from public.state where user_id = '00000000-0000-4000-8000-00000000000b')
   and exists (select 1 from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b'),
   'and leaves B''s account alone';

-- tidy up the test people (cascades to their rows)
delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c');
commit;

select n, ok, check_name from rls_results order by n;
