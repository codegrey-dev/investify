-- Lumen Schema Migration
-- Execute this in the Supabase SQL Editor to set up persistence.

-- 1. Profiles Table (Linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  phone text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile." on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

-- 2. Deposit Tickets Table
create table if not exists public.deposit_tickets (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  network text not null check (network in ('MTN', 'Telecel', 'AirtelTigo')),
  phone text not null,
  full_name text not null,
  reference text not null,
  screenshot text, -- Can store data URI or Supabase Storage public URL
  status text not null default 'pending' check (status in ('pending', 'processing', 'confirmed', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Deposit Tickets
alter table public.deposit_tickets enable row level security;

create policy "Users can view their own deposit tickets." on public.deposit_tickets
  for select using (auth.uid() = user_id);

create policy "Users can insert their own deposit tickets." on public.deposit_tickets
  for insert with check (auth.uid() = user_id);

-- 3. Investments Table
create table if not exists public.investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  package_id text not null,
  amount numeric not null check (amount > 0),
  daily_profit text not null,
  duration text not null,
  returns numeric not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Investments
alter table public.investments enable row level security;

create policy "Users can view their own investments." on public.investments
  for select using (auth.uid() = user_id);

create policy "Users can insert their own investments." on public.investments
  for insert with check (auth.uid() = user_id);

-- 4. Withdrawals Table
create table if not exists public.withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  network text not null check (network in ('MTN', 'Telecel', 'AirtelTigo')),
  phone text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'confirmed', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Withdrawals
alter table public.withdrawals enable row level security;

create policy "Users can view their own withdrawals." on public.withdrawals
  for select using (auth.uid() = user_id);

create policy "Users can insert their own withdrawals." on public.withdrawals
  for insert with check (auth.uid() = user_id);

-- 5. Automate profile creation on User Sign Up (Supabase Trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
