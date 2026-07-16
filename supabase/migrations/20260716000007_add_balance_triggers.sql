-- Add triggers to automatically update user balance when transactions change

-- Function to update balance when deposit status changes
create or replace function public.handle_deposit_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'confirmed' and old.status != 'confirmed' then
      -- Deposit confirmed: add to balance
      update public.profiles 
      set balance = balance + new.amount 
      where id = new.user_id;
    elsif old.status = 'confirmed' and new.status != 'confirmed' then
      -- Deposit unconfirmed: subtract from balance
      update public.profiles 
      set balance = balance - old.amount 
      where id = old.user_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for deposit_tickets
drop trigger if exists deposit_status_change on public.deposit_tickets;
create trigger deposit_status_change
  after update of status on public.deposit_tickets
  for each row execute procedure public.handle_deposit_status_change();

-- Function to update balance when withdrawal status changes
create or replace function public.handle_withdrawal_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'confirmed' and old.status != 'confirmed' then
      -- Withdrawal confirmed: subtract from balance
      update public.profiles 
      set balance = balance - new.amount 
      where id = new.user_id;
    elsif old.status = 'confirmed' and new.status != 'confirmed' then
      -- Withdrawal unconfirmed: add back to balance
      update public.profiles 
      set balance = balance + old.amount 
      where id = old.user_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for withdrawals
drop trigger if exists withdrawal_status_change on public.withdrawals;
create trigger withdrawal_status_change
  after update of status on public.withdrawals
  for each row execute procedure public.handle_withdrawal_status_change();

-- Function to update balance when investment is created
create or replace function public.handle_investment_creation()
returns trigger as $$
begin
  -- Investment created: subtract from balance
  update public.profiles 
  set balance = balance - new.amount 
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for investments
drop trigger if exists investment_creation on public.investments;
create trigger investment_creation
  after insert on public.investments
  for each row execute procedure public.handle_investment_creation();

-- Function to update balance when earnings are added
create or replace function public.handle_earnings_creation()
returns trigger as $$
begin
  -- Earnings added: add to balance
  update public.profiles 
  set balance = balance + new.amount 
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for earnings
drop trigger if exists earnings_creation on public.earnings;
create trigger earnings_creation
  after insert on public.earnings
  for each row execute procedure public.handle_earnings_creation();
