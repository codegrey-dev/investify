-- Backfill existing data to calculate earnings, balance, and notifications

-- 1. Backfill earnings for existing investments
insert into public.earnings (user_id, investment_id, package_id, package_name, amount, calculated_date, created_at)
select 
  i.user_id,
  i.id as investment_id,
  i.package_id,
  initcap(i.package_id) || ' Package' as package_name,
  (i.amount * (replace(replace(i.daily_profit, '%', ''), ' daily', '')::numeric / 100)) as amount,
  (i.created_at::date + generate_series(1, greatest(0, (current_date - i.created_at::date)::integer))) as calculated_date,
  now() as created_at
from public.investments i
where i.status = 'active'
  and i.created_at::date < current_date
on conflict (user_id, investment_id, calculated_date) do nothing;

-- 2. Backfill balance for existing users
update public.profiles p
set balance = coalesce((
  select 
    coalesce(sum(case when dt.status = 'confirmed' then dt.amount else 0 end), 0) -
    coalesce(sum(case when w.status = 'confirmed' then w.amount else 0 end), 0) -
    coalesce(sum(i.amount), 0) +
    coalesce(sum(e.amount), 0)
  from public.deposit_tickets dt
  left join public.withdrawals w on w.user_id = p.id
  left join public.investments i on i.user_id = p.id
  left join public.earnings e on e.user_id = p.id
  where dt.user_id = p.id or w.user_id = p.id or i.user_id = p.id or e.user_id = p.id
), 0);

-- 3. Backfill notifications for existing confirmed deposits
insert into public.notifications (user_id, title, body, type, unread, created_at)
select 
  dt.user_id,
  'Deposit Confirmed',
  'Your deposit of GH₵' || dt.amount || ' via ' || dt.network || ' Mobile Money has been approved.',
  'deposit',
  false,
  dt.created_at
from public.deposit_tickets dt
where dt.status = 'confirmed'
  and not exists (
    select 1 from public.notifications n 
    where n.user_id = dt.user_id 
    and n.type = 'deposit' 
    and n.created_at = dt.created_at
  );

-- 4. Backfill notifications for existing confirmed withdrawals
insert into public.notifications (user_id, title, body, type, unread, created_at)
select 
  w.user_id,
  'Withdrawal Approved',
  'Your withdrawal of GH₵' || w.amount || ' to ' || w.network || ' (' || w.phone || ') has been completed.',
  'withdrawal',
  false,
  w.created_at
from public.withdrawals w
where w.status = 'confirmed'
  and not exists (
    select 1 from public.notifications n 
    where n.user_id = w.user_id 
    and n.type = 'withdrawal' 
    and n.created_at = w.created_at
  );

-- 5. Backfill notifications for existing investments
insert into public.notifications (user_id, title, body, type, unread, created_at)
select 
  i.user_id,
  'Investment Active',
  'Your GH₵' || i.amount || ' investment in ' || initcap(i.package_id) || ' Package is active and yielding ' || i.daily_profit || ' returns.',
  'investment',
  false,
  i.created_at
from public.investments i
where i.status = 'active'
  and not exists (
    select 1 from public.notifications n 
    where n.user_id = i.user_id 
    and n.type = 'investment' 
    and n.created_at = i.created_at
  );

-- 6. Set last_earnings_calculated for users with investments
update public.profiles p
set last_earnings_calculated = current_date
where exists (
  select 1 from public.investments i 
  where i.user_id = p.id 
  and i.status = 'active'
);
