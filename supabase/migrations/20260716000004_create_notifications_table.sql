-- Create Notifications Table to track user account transactions and alerts

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  body text not null,
  type text not null check (type in ('deposit', 'withdrawal', 'investment', 'earnings', 'system')),
  unread boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Users can view their own notifications." on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can insert their own notifications." on public.notifications
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own notifications." on public.notifications
  for update using (auth.uid() = user_id);

create policy "Users can delete their own notifications." on public.notifications
  for delete using (auth.uid() = user_id);
