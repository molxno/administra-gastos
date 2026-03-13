-- ============================================================
-- Tutor Financiero — Supabase Database Schema
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
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

-- 2. INCOMES
create table if not exists public.incomes (
  id text primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  amount numeric not null default 0,
  frequency text not null default 'monthly' check (frequency in ('monthly', 'biweekly', 'weekly')),
  pay_days jsonb not null default '[]',
  is_net boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. EXPENSES
create table if not exists public.expenses (
  id text primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  amount numeric not null default 0,
  category text not null,
  is_fixed boolean not null default false,
  is_essential boolean not null default false,
  due_day integer,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'debit', 'credit_card')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. DEBTS
create table if not exists public.debts (
  id text primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  type text not null,
  current_balance numeric not null default 0,
  original_amount numeric,
  monthly_payment numeric not null default 0,
  interest_rate numeric not null default 0,
  annual_rate numeric,
  remaining_payments integer,
  total_payments integer,
  completed_payments integer,
  due_day integer not null default 1,
  credit_limit numeric,
  minimum_payment numeric,
  product_name text,
  product_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. GOALS
create table if not exists public.goals (
  id text primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  icon text not null default '',
  target_amount numeric not null default 0,
  current_saved numeric not null default 0,
  priority integer not null default 1,
  category text not null default 'other',
  deadline text,
  is_flexible boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. TRANSACTIONS
create table if not exists public.transactions (
  id text primary key,
  user_id uuid references public.profiles on delete cascade not null,
  date text not null,
  amount numeric not null default 0,
  type text not null check (type in ('income', 'expense', 'debt_payment', 'savings', 'transfer')),
  category text not null,
  description text not null default '',
  payment_method text not null default 'cash' check (payment_method in ('cash', 'debit', 'credit_card')),
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_incomes_user on public.incomes(user_id);
create index if not exists idx_expenses_user on public.expenses(user_id);
create index if not exists idx_debts_user on public.debts(user_id);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(user_id, date desc);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.debts enable row level security;
alter table public.goals enable row level security;
alter table public.transactions enable row level security;

-- Profiles: users can only CRUD their own row
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Incomes: users can only CRUD their own rows
create policy "Users can view own incomes"
  on public.incomes for select using (auth.uid() = user_id);
create policy "Users can insert own incomes"
  on public.incomes for insert with check (auth.uid() = user_id);
create policy "Users can update own incomes"
  on public.incomes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own incomes"
  on public.incomes for delete using (auth.uid() = user_id);

-- Expenses
create policy "Users can view own expenses"
  on public.expenses for select using (auth.uid() = user_id);
create policy "Users can insert own expenses"
  on public.expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own expenses"
  on public.expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own expenses"
  on public.expenses for delete using (auth.uid() = user_id);

-- Debts
create policy "Users can view own debts"
  on public.debts for select using (auth.uid() = user_id);
create policy "Users can insert own debts"
  on public.debts for insert with check (auth.uid() = user_id);
create policy "Users can update own debts"
  on public.debts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own debts"
  on public.debts for delete using (auth.uid() = user_id);

-- Goals
create policy "Users can view own goals"
  on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals"
  on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals"
  on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own goals"
  on public.goals for delete using (auth.uid() = user_id);

-- Transactions
create policy "Users can view own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- UPDATED_AT AUTO-UPDATE
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
drop trigger if exists incomes_updated_at on public.incomes;
create trigger incomes_updated_at before update on public.incomes
  for each row execute procedure public.update_updated_at();
drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at before update on public.expenses
  for each row execute procedure public.update_updated_at();
drop trigger if exists debts_updated_at on public.debts;
create trigger debts_updated_at before update on public.debts
  for each row execute procedure public.update_updated_at();
drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at before update on public.goals
  for each row execute procedure public.update_updated_at();
