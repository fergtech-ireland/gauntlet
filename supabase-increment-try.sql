-- Applied to the gauntlet project on 6 October 2026 (migration increment_try_signed_in_only).
-- Kept here as a record. Running it again is harmless.
-- The app only calls increment_try when someone is signed in (recordTry checks signedIn()),
-- so signed-out visitors no longer need, or get, permission to call it.
revoke execute on function public.increment_try(uuid) from public, anon;
grant execute on function public.increment_try(uuid) to authenticated;
