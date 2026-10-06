-- 0003: the handle rules trigger function is for the trigger only (build 52).
-- Supabase's security advisor flagged it as callable through the API as a
-- security definer function. A trigger function cannot actually run outside a
-- trigger, but nothing should be exposed that does not need to be.
revoke execute on function public.profiles_handle_rules() from public, anon, authenticated;
