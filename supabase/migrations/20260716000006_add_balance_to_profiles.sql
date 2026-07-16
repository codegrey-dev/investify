-- Add balance column to profiles table

alter table public.profiles 
add column if not exists balance numeric default 0 check (balance >= 0);

-- Add column to track last earnings calculation date
alter table public.profiles 
add column if not exists last_earnings_calculated date;
