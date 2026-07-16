-- Add role column to profiles table for admin access control

alter table public.profiles 
add column if not exists role text default 'user' check (role in ('user', 'admin'));

-- Update existing profiles to have 'user' role by default
update public.profiles 
set role = 'user' 
where role is null;
