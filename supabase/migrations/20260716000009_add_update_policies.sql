-- Add missing update policies for tables to support status changes and other updates

-- Update policy for deposit_tickets
create policy "Users can update their own deposit tickets." on public.deposit_tickets
  for update using (auth.uid() = user_id);

-- Update policy for withdrawals  
create policy "Users can update their own withdrawals." on public.withdrawals
  for update using (auth.uid() = user_id);

-- Update policy for investments
create policy "Users can update their own investments." on public.investments
  for update using (auth.uid() = user_id);

-- Update policy for earnings (though typically not updated by users)
create policy "Users can update their own earnings." on public.earnings
  for update using (auth.uid() = user_id);
