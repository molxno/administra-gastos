-- ============================================================
-- Delete User Account — RPC Function
-- ============================================================
-- Run this in the Supabase SQL Editor AFTER schema.sql
-- This allows a user to delete their own account via RPC.
-- ============================================================

create or replace function public.delete_user_account()
returns void as $$
begin
  -- Validate the caller is authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete all user data (cascades from profiles FK will handle most,
  -- but be explicit for safety)
  delete from public.transactions where user_id = auth.uid();
  delete from public.goals where user_id = auth.uid();
  delete from public.debts where user_id = auth.uid();
  delete from public.expenses where user_id = auth.uid();
  delete from public.incomes where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();

  -- Delete the auth user
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, auth;

-- Restrict execution: only authenticated users can call this
revoke execute on function public.delete_user_account() from public;
revoke execute on function public.delete_user_account() from anon;
grant execute on function public.delete_user_account() to authenticated;
