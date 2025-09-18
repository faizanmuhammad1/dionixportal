-- Helper RPC to list users with profiles for admin UI
create or replace view public.v_auth_users_with_profiles as
  select u.id,
         u.email,
         coalesce(p.first_name, (u.raw_user_meta_data->>'firstName')) as first_name,
         coalesce(p.last_name, (u.raw_user_meta_data->>'lastName')) as last_name,
         coalesce(p.role, (u.raw_user_meta_data->>'role')) as role,
         p.department,
         p.position,
         p.status,
         u.last_sign_in_at as last_login,
         u.created_at as created_at
  from auth.users u
  left join public.profiles p on p.id = u.id;

-- Expose via RPC to work well with supabase-js admin client
create or replace function public.auth_users_with_profiles()
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  department text,
  position text,
  status text,
  last_login timestamptz,
  created_at timestamptz
) language sql security definer set search_path = public as $$
  select * from public.v_auth_users_with_profiles
$$;

grant execute on function public.auth_users_with_profiles() to supabase_auth_admin;
revoke execute on function public.auth_users_with_profiles() from authenticated, anon, public;


