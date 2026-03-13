-- ============================================================
-- Tutor Financiero Personal — Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  country text not null default 'Colombia',
  currency text not null default 'COP',
  locale text not null default 'es-CO',
  onboarding_completed boolean not null default false,
  dark_mode boolean not null default true,
  debt_strategy text not null default 'avalanche' check (debt_strategy in ('avalanche', 'snowball')),
  goal_mode text not null default 'sequential' check (goal_mode in ('sequential', 'parallel')),
  current_fund numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. INCOMES
-- ------------------------------------------------------------
create table if not exists public.incomes (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric not null,
  frequency text not null check (frequency in ('monthly', 'biweekly', 'weekly')),
  pay_days jsonb not null default '[]',
  is_net boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. EXPENSES
-- ------------------------------------------------------------
create table if not exists public.expenses (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric not null,
  category text not null,
  is_fixed boolean not null default false,
  is_essential boolean not null default false,
  due_day integer,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'debit', 'credit_card')),
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. DEBTS
-- ------------------------------------------------------------
create table if not exists public.debts (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null,
  current_balance numeric not null,
  original_amount numeric,
  monthly_payment numeric not null,
  interest_rate numeric not null,
  annual_rate numeric,
  remaining_payments integer,
  total_payments integer,
  completed_payments integer,
  due_day integer not null,
  credit_limit numeric,
  minimum_payment numeric,
  product_name text,
  product_value numeric,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. GOALS
-- ------------------------------------------------------------
create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null default '🎯',
  target_amount numeric not null,
  current_saved numeric not null default 0,
  priority integer not null default 1,
  category text not null default 'other',
  deadline text,
  is_flexible boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. TRANSACTIONS
-- ------------------------------------------------------------
create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date text not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense', 'debt_payment', 'savings', 'transfer')),
  category text not null,
  description text not null default '',
  payment_method text not null default 'cash' check (payment_method in ('cash', 'debit', 'credit_card')),
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. INDEXES
-- ------------------------------------------------------------
create index if not exists idx_incomes_user_id on public.incomes(user_id);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_debts_user_id on public.debts(user_id);
create index if not exists idx_goals_user_id on public.goals(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(user_id, date desc);

-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.debts enable row level security;
alter table public.goals enable row level security;
alter table public.transactions enable row level security;

-- Profiles: users can only access their own row
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Generic policy for all entity tables (user_id = auth.uid())
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array['incomes', 'expenses', 'debts', 'goals', 'transactions'])
  loop
    execute format(
      'drop policy if exists "Users can view own %1$s" on public.%1$s',
      tbl
    );
    execute format(
      'create policy "Users can view own %1$s" on public.%1$s for select using (auth.uid() = user_id)',
      tbl
    );
    execute format(
      'drop policy if exists "Users can insert own %1$s" on public.%1$s',
      tbl
    );
    execute format(
      'create policy "Users can insert own %1$s" on public.%1$s for insert with check (auth.uid() = user_id)',
      tbl
    );
    execute format(
      'drop policy if exists "Users can update own %1$s" on public.%1$s',
      tbl
    );
    execute format(
      'create policy "Users can update own %1$s" on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      tbl
    );
    execute format(
      'drop policy if exists "Users can delete own %1$s" on public.%1$s',
      tbl
    );
    execute format(
      'create policy "Users can delete own %1$s" on public.%1$s for delete using (auth.uid() = user_id)',
      tbl
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 9. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 10. DELETE USER ACCOUNT (RPC)
-- Called from Settings page: supabase.rpc('delete_user_account')
-- Deletes all user data (cascades from profiles) and the auth user.
-- ------------------------------------------------------------
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Delete profile row — all entity tables cascade from it
  delete from public.profiles where id = auth.uid();
  -- Delete the auth user
  delete from auth.users where id = auth.uid();
end;
$$;

-- Allow authenticated users to call this function
revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;

-- ------------------------------------------------------------
-- 11. UPDATED_AT TRIGGER for profiles
-- ------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
