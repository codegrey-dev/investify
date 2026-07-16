-- Add admin policies to allow admins to view and manage all data

-- Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Admin policies for deposit_tickets
drop policy if exists "Admins can view all deposit tickets" on public.deposit_tickets;
create policy "Admins can view all deposit tickets" on public.deposit_tickets
  for select using (public.is_admin());

drop policy if exists "Admins can update all deposit tickets" on public.deposit_tickets;
create policy "Admins can update all deposit tickets" on public.deposit_tickets
  for update using (public.is_admin());

-- Admin policies for withdrawals
drop policy if exists "Admins can view all withdrawals" on public.withdrawals;
create policy "Admins can view all withdrawals" on public.withdrawals
  for select using (public.is_admin());

drop policy if exists "Admins can update all withdrawals" on public.withdrawals;
create policy "Admins can update all withdrawals" on public.withdrawals
  for update using (public.is_admin());

-- Admin policies for investments
drop policy if exists "Admins can view all investments" on public.investments;
create policy "Admins can view all investments" on public.investments
  for select using (public.is_admin());

drop policy if exists "Admins can update all investments" on public.investments;
create policy "Admins can update all investments" on public.investments
  for update using (public.is_admin());

-- Admin policies for profiles
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles" on public.profiles
  for update using (public.is_admin());

-- Admin policies for earnings
drop policy if exists "Admins can view all earnings" on public.earnings;
create policy "Admins can view all earnings" on public.earnings
  for select using (public.is_admin());

-- Admin policies for notifications
drop policy if exists "Admins can view all notifications" on public.notifications;
create policy "Admins can view all notifications" on public.notifications
  for select using (public.is_admin());
