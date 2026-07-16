-- Create Earnings Table to track daily investment earnings

create table if not exists public.earnings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  investment_id uuid references public.investments(id) on delete cascade not null,
  package_id text not null,
  package_name text not null,
  amount numeric not null check (amount >= 0),
  calculated_date date not null, -- The date this earning is for
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, investment_id, calculated_date) -- Prevent duplicate earnings for same day
);

-- Enable RLS
alter table public.earnings enable row level security;

-- Policies
create policy "Users can view their own earnings." on public.earnings
  for select using (auth.uid() = user_id);

create policy "Users can insert their own earnings." on public.earnings
  for insert with check (auth.uid() = user_id);

-- Index for faster queries
create index if not exists earnings_user_id_idx on public.earnings(user_id);
create index if not exists earnings_investment_id_idx on public.earnings(investment_id);
create index if not exists earnings_calculated_date_idx on public.earnings(calculated_date);
