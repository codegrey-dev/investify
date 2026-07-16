-- Add avatar_url column to profiles table
alter table public.profiles 
add column if not exists avatar_url text;

-- Create storage bucket for user profile avatar images
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Security Policies for Avatars
-- Allow everyone to view profile avatars
create policy "Allow public read access to avatars" on storage.objects
  for select using (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
create policy "Allow authenticated users to upload avatars" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

-- Allow users to update their own avatars
create policy "Allow users to update their own avatars" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
