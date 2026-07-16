-- Create Supabase Storage Bucket for Deposit Screenshot Receipts

-- 1. Insert bucket config
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

-- 2. Setup Security Policies for the Bucket
-- Allow everyone to read screenshots
create policy "Allow public read access to screenshots" on storage.objects
  for select using (bucket_id = 'screenshots');

-- Allow authenticated users to upload screenshots
create policy "Allow authenticated users to upload screenshots" on storage.objects
  for insert with check (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their own screenshots
create policy "Allow users to delete their own screenshots" on storage.objects
  for delete using (
    bucket_id = 'screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
