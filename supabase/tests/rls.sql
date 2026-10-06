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

-- test people: C exists to be followed and never consents; D is an anonymous
-- account (made silently on first open, no email yet)
delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-00000000000d');
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'rls-a@gauntlet.test'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-b@gauntlet.test'),
  ('00000000-0000-4000-8000-00000000000c', 'rls-c@gauntlet.test'),
  ('00000000-0000-4000-8000-00000000000d', null);

-- every table in public has row level security switched on
insert into rls_results (ok, check_name)
select coalesce(bool_and(c.relrowsecurity), true),
       'every public table has RLS on' || coalesce(' (off: ' || string_agg(c.relname, ', ') filter (where not c.relrowsecurity) || ')', '')
from pg_class c join pg_namespace s on s.oid = c.relnamespace
where s.nspname = 'public' and c.relkind in ('r', 'p');

-- ============ as B: save B's own things ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

insert into public.settings (user_id, body, birth_year, health_consent_at, terms_version, terms_accepted_at)
  values ('00000000-0000-4000-8000-00000000000b', '{"weight":88}', 1990, now(), 'test', now());
insert into public.profiles (user_id, handle, aim) values ('00000000-0000-4000-8000-00000000000b', 'rls_b', 'cut');
insert into public.state (user_id, payload) values ('00000000-0000-4000-8000-00000000000b', '{"secret":"b-weight"}');
insert into public.posts (id, user_id, kind, title) values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'lift', 'B push');
insert into public.follows (follower, followee) values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c');
insert into public.follows (follower, followee) values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a');
insert into rls_results (ok, check_name) values (true, 'B can save their own settings, profile, state, post and follows');

-- ============ as A ============
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

insert into public.settings (user_id, body, health_consent_at, terms_version, terms_accepted_at)
  values ('00000000-0000-4000-8000-00000000000a', '{"weight":75}', now(), 'test', now());
insert into public.profiles (user_id, handle) values ('00000000-0000-4000-8000-00000000000a', 'rls_a');
insert into public.state (user_id, payload) values ('00000000-0000-4000-8000-00000000000a', '{"secret":"a-weight"}');
insert into public.posts (id, user_id, kind, title) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'lift', 'A legs');
insert into rls_results (ok, check_name) values (true, 'A can save their own settings, profile, state and post');

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

-- ============ 0002: settings, consent, handles, anonymous accounts ============
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated","is_anonymous":false}', true);

-- settings are private
insert into rls_results (ok, check_name)
select count(*) = 1 and bool_and(user_id = '00000000-0000-4000-8000-00000000000a'), 'A reads only their own settings'
from public.settings;
update public.settings set body = '{"weight":1}' where user_id = '00000000-0000-4000-8000-00000000000b';
delete from public.settings where user_id = '00000000-0000-4000-8000-00000000000b';
do $$ begin
  begin
    insert into public.settings (user_id, health_consent_at, terms_version, terms_accepted_at) values ('00000000-0000-4000-8000-00000000000c', now(), 'test', now());
    insert into rls_results (ok, check_name) values (false, 'A cannot write settings for someone else');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'A cannot write settings for someone else');
  end;
  begin
    update public.settings set user_id = '00000000-0000-4000-8000-00000000000b' where user_id = '00000000-0000-4000-8000-00000000000a';
    insert into rls_results (ok, check_name) values (false, 'A cannot hand their settings row to B');
  exception when insufficient_privilege or unique_violation then
    insert into rls_results (ok, check_name) values (true, 'A cannot hand their settings row to B');
  end;
  begin
    update public.settings set health_consent_at = null where user_id = '00000000-0000-4000-8000-00000000000a';
    insert into rls_results (ok, check_name) values (false, 'consent cannot be blanked while the row stays (withdrawing is deleting it)');
  exception when check_violation then
    insert into rls_results (ok, check_name) values (true, 'consent cannot be blanked while the row stays (withdrawing is deleting it)');
  end;
end $$;

-- handles: the rules live in the database
insert into rls_results (ok, check_name)
select public.handle_available('rls_a') = 'ok' and public.handle_available('RLS_A') = 'ok'
   and public.handle_available('rls_b') = 'taken' and public.handle_available('ab') = 'format'
   and public.handle_available('has.dot') = 'format' and public.handle_available('has space') = 'format'
   and public.handle_available(repeat('a', 21)) = 'format' and public.handle_available(repeat('a', 20)) = 'ok'
   and public.handle_available('admin') = 'blocked' and public.handle_available('admin_99') = 'blocked'
   and public.handle_available('the_gauntlet') = 'blocked' and public.handle_available('scunthorpe') = 'ok'
   and public.handle_available('grape_99') = 'ok' and public.handle_available('sniggers') = 'ok'
   and public.handle_available('cunt_1') = 'blocked' and public.handle_available('xfuckx') = 'blocked',
   'handle check: own handle ok, taken, too short or long, wrong characters, blocked words, no false alarms';
do $$ begin
  begin
    update public.profiles set handle = 'rls_a_new' where user_id = '00000000-0000-4000-8000-00000000000a';
    insert into rls_results (ok, check_name) values (false, 'a handle cannot change again within 30 days');
  exception when check_violation then
    insert into rls_results (ok, check_name) values (true, 'a handle cannot change again within 30 days');
  end;
  begin
    update public.profiles set handle_changed_at = now() - interval '1 year' where user_id = '00000000-0000-4000-8000-00000000000a';
    update public.profiles set handle = 'rls_a_new' where user_id = '00000000-0000-4000-8000-00000000000a';
    insert into rls_results (ok, check_name) values (false, 'nobody can backdate their own handle clock to skip the wait');
  exception when check_violation then
    insert into rls_results (ok, check_name) values (true, 'nobody can backdate their own handle clock to skip the wait');
  end;
end $$;
-- the test moves A's clock back 31 days as the database owner, with triggers
-- off for that one statement (the trigger would otherwise undo it, as above)
reset role;
set local session_replication_role = replica;
update public.profiles set handle_changed_at = now() - interval '31 days' where user_id = '00000000-0000-4000-8000-00000000000a';
set local session_replication_role = origin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  begin
    update public.profiles set handle = 'rls_b' where user_id = '00000000-0000-4000-8000-00000000000a';
    insert into rls_results (ok, check_name) values (false, 'a handle someone else has is refused');
  exception when unique_violation then
    insert into rls_results (ok, check_name) values (true, 'a handle someone else has is refused');
  end;
  begin
    update public.profiles set handle = 'Shouty' where user_id = '00000000-0000-4000-8000-00000000000a';
    insert into rls_results (ok, check_name) values (false, 'capitals are refused, so rls_a and RLS_A cannot both exist');
  exception when check_violation then
    insert into rls_results (ok, check_name) values (true, 'capitals are refused, so rls_a and RLS_A cannot both exist');
  end;
  begin
    update public.profiles set handle = 'wanker_7' where user_id = '00000000-0000-4000-8000-00000000000a';
    insert into rls_results (ok, check_name) values (false, 'a blocked handle is refused by the database, not just the app');
  exception when check_violation then
    insert into rls_results (ok, check_name) values (true, 'a blocked handle is refused by the database, not just the app');
  end;
end $$;
update public.profiles set handle = 'rls_a2', display_name = 'A Person' where user_id = '00000000-0000-4000-8000-00000000000a';
insert into rls_results (ok, check_name)
select exists (select 1 from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a' and handle = 'rls_a2' and handle_changed_at > now() - interval '1 minute'),
       'after 30 days a handle can change, and the clock restarts';

-- consent first: C has no settings row, so nothing of theirs can be stored
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  begin
    insert into public.state (user_id, payload) values ('00000000-0000-4000-8000-00000000000c', '{"weight":70}');
    insert into rls_results (ok, check_name) values (false, 'no saved state before health data consent');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'no saved state before health data consent');
  end;
  begin
    insert into public.settings (user_id, body) values ('00000000-0000-4000-8000-00000000000c', '{"weight":70}');
    insert into rls_results (ok, check_name) values (false, 'no settings without both consents recorded');
  exception when check_violation then
    insert into rls_results (ok, check_name) values (true, 'no settings without both consents recorded');
  end;
end $$;

-- D: an anonymous account keeps its own data and nothing else
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000d","role":"authenticated","is_anonymous":true}', true);
insert into public.settings (user_id, body, health_consent_at, terms_version, terms_accepted_at) values ('00000000-0000-4000-8000-00000000000d', '{"weight":66}', now(), 'test', now());
insert into public.state (user_id, payload) values ('00000000-0000-4000-8000-00000000000d', '{"secret":"d-weight"}');
insert into rls_results (ok, check_name)
select (select count(*) from public.state) = 1 and (select count(*) from public.settings) = 1,
       'anonymous: can save and read only their own settings and state';
insert into rls_results (ok, check_name)
select (select count(*) from public.profiles) + (select count(*) from public.posts) + (select count(*) from public.follows) + (select count(*) from public.tries) = 0,
       'anonymous: cannot see any profile, post, follow or try';
do $$ begin
  begin
    insert into public.profiles (user_id, handle) values ('00000000-0000-4000-8000-00000000000d', 'rls_d');
    insert into rls_results (ok, check_name) values (false, 'anonymous: cannot take a handle');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'anonymous: cannot take a handle');
  end;
  begin
    insert into public.posts (user_id, kind, title) values ('00000000-0000-4000-8000-00000000000d', 'lift', 'anon post');
    insert into rls_results (ok, check_name) values (false, 'anonymous: cannot post');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'anonymous: cannot post');
  end;
  begin
    insert into public.follows (follower, followee) values ('00000000-0000-4000-8000-00000000000d', '00000000-0000-4000-8000-00000000000b');
    insert into rls_results (ok, check_name) values (false, 'anonymous: cannot follow');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'anonymous: cannot follow');
  end;
  begin
    perform public.increment_try('00000000-0000-4000-8000-0000000000b1');
    insert into rls_results (ok, check_name) values (false, 'anonymous: cannot credit a try');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'anonymous: cannot credit a try');
  end;
  begin
    perform public.handle_available('anything');
    insert into rls_results (ok, check_name) values (false, 'anonymous: cannot probe handles');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'anonymous: cannot probe handles');
  end;
end $$;

-- functions only the database itself should run cannot be called through the API
insert into rls_results (ok, check_name)
select not has_function_privilege('authenticated', 'public.profiles_handle_rules()', 'execute')
   and not has_function_privilege('anon', 'public.profiles_handle_rules()', 'execute')
   and not has_function_privilege('authenticated', 'public.handle_check(text, uuid)', 'execute')
   and not has_function_privilege('anon', 'public.handle_check(text, uuid)', 'execute'),
   'the handle trigger and the raw handle check cannot be called through the API';

-- the blocklist is never readable through the API
do $$ begin
  begin
    perform 1 from public.handle_blocklist;
    insert into rls_results (ok, check_name)
    select not exists (select 1 from public.handle_blocklist), 'signed in: the blocklist is not readable';
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'signed in: the blocklist is not readable');
  end;
end $$;

-- ============ signed out ============
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

insert into rls_results (ok, check_name)
select (select count(*) from public.state) + (select count(*) from public.profiles) + (select count(*) from public.posts)
     + (select count(*) from public.follows) + (select count(*) from public.tries)
     + (select count(*) from public.settings) + (select count(*) from public.handle_blocklist) = 0,
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
    perform public.handle_available('anything');
    insert into rls_results (ok, check_name) values (false, 'signed out: cannot probe handles');
  exception when insufficient_privilege then
    insert into rls_results (ok, check_name) values (true, 'signed out: cannot probe handles');
  when others then
    insert into rls_results (ok, check_name) values (false, 'signed out: cannot probe handles (it ran and failed inside)');
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
   and not exists (select 1 from public.settings where user_id = '00000000-0000-4000-8000-00000000000a')
   and not exists (select 1 from public.posts where user_id = '00000000-0000-4000-8000-00000000000a')
   and not exists (select 1 from public.follows where '00000000-0000-4000-8000-00000000000a' in (follower, followee))
   and not exists (select 1 from public.tries where user_id = '00000000-0000-4000-8000-00000000000a'),
   'delete my account removes every row A had, and the sign-in';
insert into rls_results (ok, check_name)
select exists (select 1 from public.state where user_id = '00000000-0000-4000-8000-00000000000b')
   and exists (select 1 from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b')
   and exists (select 1 from public.settings where user_id = '00000000-0000-4000-8000-00000000000b'),
   'and leaves B''s account alone';

-- tidy up the test people (cascades to their rows)
delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-00000000000d');
commit;

select n, ok, check_name from rls_results order by n;
