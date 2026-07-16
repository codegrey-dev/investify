-- Add triggers to automatically create notifications for key events

-- Function to create notification when deposit status changes
create or replace function public.handle_deposit_notification()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'confirmed' and old.status != 'confirmed' then
      insert into public.notifications (user_id, title, body, type)
      values (
        new.user_id,
        'Deposit Confirmed',
        'Your deposit of GH₵' || new.amount || ' via ' || new.network || ' Mobile Money has been approved.',
        'deposit'
      );
    elsif new.status = 'rejected' and old.status != 'rejected' then
      insert into public.notifications (user_id, title, body, type)
      values (
        new.user_id,
        'Deposit Rejected',
        'Your deposit of GH₵' || new.amount || ' via ' || new.network || ' Mobile Money was rejected. Please contact support.',
        'deposit'
      );
    elsif new.status = 'processing' and old.status = 'pending' then
      insert into public.notifications (user_id, title, body, type)
      values (
        new.user_id,
        'Deposit Processing',
        'Your deposit of GH₵' || new.amount || ' via ' || new.network || ' Mobile Money is processing. Reference: ' || new.reference,
        'deposit'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for deposit notifications
drop trigger if exists deposit_notification on public.deposit_tickets;
create trigger deposit_notification
  after update of status on public.deposit_tickets
  for each row execute procedure public.handle_deposit_notification();

-- Function to create notification when withdrawal status changes
create or replace function public.handle_withdrawal_notification()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'confirmed' and old.status != 'confirmed' then
      insert into public.notifications (user_id, title, body, type)
      values (
        new.user_id,
        'Withdrawal Approved',
        'Your withdrawal of GH₵' || new.amount || ' to ' || new.network || ' (' || new.phone || ') has been completed.',
        'withdrawal'
      );
    elsif new.status = 'rejected' and old.status != 'rejected' then
      insert into public.notifications (user_id, title, body, type)
      values (
        new.user_id,
        'Withdrawal Rejected',
        'Your withdrawal of GH₵' || new.amount || ' has been rejected. Please review account details.',
        'withdrawal'
      );
    elsif new.status = 'processing' and old.status = 'pending' then
      insert into public.notifications (user_id, title, body, type)
      values (
        new.user_id,
        'Withdrawal Initiated',
        'Your withdrawal request of GH₵' || new.amount || ' has been submitted. Status: Processing.',
        'withdrawal'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for withdrawal notifications
drop trigger if exists withdrawal_notification on public.withdrawals;
create trigger withdrawal_notification
  after update of status on public.withdrawals
  for each row execute procedure public.handle_withdrawal_notification();

-- Function to create notification when investment is created
create or replace function public.handle_investment_notification()
returns trigger as $$
declare
  package_name text;
begin
  -- Generate package name from package_id
  package_name = initcap(new.package_id) || ' Package';
  
  insert into public.notifications (user_id, title, body, type)
  values (
    new.user_id,
    'Investment Active',
    'Your GH₵' || new.amount || ' investment in ' || package_name || ' is active and yielding ' || new.daily_profit || ' returns.',
    'investment'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for investment notifications
drop trigger if exists investment_notification on public.investments;
create trigger investment_notification
  after insert on public.investments
  for each row execute procedure public.handle_investment_notification();

-- Function to create notification when earnings are added
create or replace function public.handle_earnings_notification()
returns trigger as $$
begin
  insert into public.notifications (user_id, title, body, type)
  values (
    new.user_id,
    'Daily Earnings Credited',
    'Your investment in ' || new.package_name || ' has earned GH₵' || new.amount || ' for ' || new.calculated_date || '.',
    'earnings'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for earnings notifications
drop trigger if exists earnings_notification on public.earnings;
create trigger earnings_notification
  after insert on public.earnings
  for each row execute procedure public.handle_earnings_notification();
