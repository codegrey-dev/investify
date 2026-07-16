-- Add full_name column to withdrawals table to track recipient account name

alter table public.withdrawals 
add column if not exists full_name text not null default 'Recipient';
