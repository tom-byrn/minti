-- Minti Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- User Profiles (linked to auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  date_of_birth date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI Chat Sessions
create table if not exists public.ai_chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI Chat Messages
create table if not exists public.ai_chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now()
);

-- Plaid Items (bank connections with Vault reference)
create table if not exists public.plaid_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  secret_id uuid not null, -- References Supabase Vault secret
  item_id text not null,
  institution_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, item_id)
);

-- Budget Profiles (financial goals and context)
create table if not exists public.budget_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  occupation text,
  annual_income numeric,
  savings_goal_yearly numeric,
  financial_goals text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Category Budgets (monthly spending limits)
create table if not exists public.category_budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, category)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.user_profiles enable row level security;
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.plaid_items enable row level security;
alter table public.budget_profiles enable row level security;
alter table public.category_budgets enable row level security;

-- User Profiles: users can only access their own profile
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.user_profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- AI Chat Sessions: users can only access their own sessions
create policy "Users can view own sessions" on public.ai_chat_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.ai_chat_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.ai_chat_sessions
  for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on public.ai_chat_sessions
  for delete using (auth.uid() = user_id);

-- AI Chat Messages: users can access messages from their own sessions
create policy "Users can view own messages" on public.ai_chat_messages
  for select using (
    exists (
      select 1 from public.ai_chat_sessions
      where ai_chat_sessions.id = ai_chat_messages.session_id
      and ai_chat_sessions.user_id = auth.uid()
    )
  );
create policy "Users can insert own messages" on public.ai_chat_messages
  for insert with check (
    exists (
      select 1 from public.ai_chat_sessions
      where ai_chat_sessions.id = session_id
      and ai_chat_sessions.user_id = auth.uid()
    )
  );

-- Plaid Items: users can only access their own connections
create policy "Users can view own plaid items" on public.plaid_items
  for select using (auth.uid() = user_id);
create policy "Users can insert own plaid items" on public.plaid_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update own plaid items" on public.plaid_items
  for update using (auth.uid() = user_id);
create policy "Users can delete own plaid items" on public.plaid_items
  for delete using (auth.uid() = user_id);

-- Budget Profiles: users can only access their own budget profile
create policy "Users can view own budget profile" on public.budget_profiles
  for select using (auth.uid() = user_id);
create policy "Users can insert own budget profile" on public.budget_profiles
  for insert with check (auth.uid() = user_id);
create policy "Users can update own budget profile" on public.budget_profiles
  for update using (auth.uid() = user_id);

-- Category Budgets: users can only access their own category budgets
create policy "Users can view own category budgets" on public.category_budgets
  for select using (auth.uid() = user_id);
create policy "Users can insert own category budgets" on public.category_budgets
  for insert with check (auth.uid() = user_id);
create policy "Users can update own category budgets" on public.category_budgets
  for update using (auth.uid() = user_id);
create policy "Users can delete own category budgets" on public.category_budgets
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index if not exists idx_ai_chat_sessions_user_id on public.ai_chat_sessions(user_id);
create index if not exists idx_ai_chat_messages_session_id on public.ai_chat_messages(session_id);
create index if not exists idx_plaid_items_user_id on public.plaid_items(user_id);
create index if not exists idx_budget_profiles_user_id on public.budget_profiles(user_id);
create index if not exists idx_category_budgets_user_id on public.category_budgets(user_id);

-- ============================================================================
-- VAULT RPC FUNCTIONS (for secure Plaid token storage)
-- ============================================================================

-- Store a Plaid access token securely in Vault
-- Returns the secret_id UUID to store in plaid_items
create or replace function public.store_plaid_token(token text, token_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  secret_id uuid;
begin
  -- Insert the token into vault.secrets
  insert into vault.secrets (secret, name)
  values (token, token_name)
  returning id into secret_id;

  return secret_id;
end;
$$;

-- Retrieve a Plaid access token from Vault
-- Returns the decrypted token string
create or replace function public.get_plaid_token(p_secret_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  token text;
begin
  select decrypted_secret into token
  from vault.decrypted_secrets
  where id = p_secret_id;

  return token;
end;
$$;

-- Delete a Plaid token from Vault
create or replace function public.delete_plaid_token(p_secret_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from vault.secrets where id = p_secret_id;
end;
$$;

-- ============================================================================
-- STORAGE (for avatars)
-- ============================================================================

-- Create avatars bucket (run this in the Supabase Dashboard > Storage)
-- Or use the SQL below:

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies for avatars
create policy "Anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

create policy "Users can update own avatars" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own avatars" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- USER SUBSCRIPTIONS (for editing/persisting detected subscriptions)
-- ============================================================================

-- User-persisted/edited subscriptions
create table if not exists public.user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_name text not null,
  display_name text,
  category text,
  amount numeric not null,
  billing_period text not null check (billing_period in ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
  next_charge_date date,
  source text not null check (source in ('manual', 'detected')),
  detected_subscription_id text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, detected_subscription_id)
);

-- Dismissed detected subscriptions (false positives)
create table if not exists public.dismissed_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  detected_subscription_id text not null,
  dismissed_at timestamptz default now(),
  unique(user_id, detected_subscription_id)
);

-- RLS for user_subscriptions
alter table public.user_subscriptions enable row level security;

create policy "Users can view own subscriptions" on public.user_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on public.user_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own subscriptions" on public.user_subscriptions
  for update using (auth.uid() = user_id);
create policy "Users can delete own subscriptions" on public.user_subscriptions
  for delete using (auth.uid() = user_id);

-- RLS for dismissed_subscriptions
alter table public.dismissed_subscriptions enable row level security;

create policy "Users can view own dismissed" on public.dismissed_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can insert own dismissed" on public.dismissed_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own dismissed" on public.dismissed_subscriptions
  for delete using (auth.uid() = user_id);

-- Indexes for subscriptions
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_dismissed_subscriptions_user_id on public.dismissed_subscriptions(user_id);

-- ============================================================================
-- FINANCIAL GOALS
-- ============================================================================

create table if not exists public.financial_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline date,
  category text,
  color text,
  icon text,
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for financial_goals
alter table public.financial_goals enable row level security;

create policy "Users can view own goals" on public.financial_goals
  for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.financial_goals
  for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.financial_goals
  for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.financial_goals
  for delete using (auth.uid() = user_id);

-- Indexes for goals
create index if not exists idx_financial_goals_user_id on public.financial_goals(user_id);

-- ============================================================================
-- SMART ALERTS
-- ============================================================================

create table if not exists public.alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'budget_warning', 'budget_exceeded',
    'subscription_renewal', 'subscription_price_change',
    'goal_at_risk', 'goal_achieved',
    'unusual_spending', 'income_received',
    'savings_rate_drop'
  )),
  title text not null,
  message text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  read boolean default false,
  data jsonb default '{}',
  created_at timestamptz default now()
);

-- RLS for alerts
alter table public.alerts enable row level security;

create policy "Users can view own alerts" on public.alerts
  for select using (auth.uid() = user_id);
create policy "Users can insert own alerts" on public.alerts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own alerts" on public.alerts
  for update using (auth.uid() = user_id);
create policy "Users can delete own alerts" on public.alerts
  for delete using (auth.uid() = user_id);

-- Indexes for alerts
create index if not exists idx_alerts_user_id on public.alerts(user_id);
create index if not exists idx_alerts_user_read on public.alerts(user_id, read);
