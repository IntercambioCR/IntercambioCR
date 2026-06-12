-- Intercambio CR - prueba de perfil administrador
-- Ejecutar en Supabase SQL Editor sobre el proyecto correcto: mbgioclczfosydguprnq
-- Correo admin: step1115.sp@gmail.com

-- Asegura que exista la funcion is_admin(user_id) usada para verificar esta prueba.
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'admin'
      and is_blocked = false
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- 1) Verificar que el usuario exista en Supabase Auth.
select
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmed_at,
  raw_user_meta_data
from auth.users
where lower(email) = 'step1115.sp@gmail.com';

-- Si la consulta anterior no devuelve filas, primero crea la cuenta desde /auth
-- usando el correo step1115.sp@gmail.com. Luego vuelve a ejecutar este script.

-- 2) Asegurar que exista profile y cuenta de credis.
insert into public.profiles (id, full_name, role, is_blocked)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', email, 'Administradora Intercambio CR'),
  'user'::user_role,
  false
from auth.users
where lower(email) = 'step1115.sp@gmail.com'
on conflict (id) do nothing;

insert into public.credit_accounts (user_id)
select id
from auth.users
where lower(email) = 'step1115.sp@gmail.com'
on conflict (user_id) do nothing;

-- 3) Asignar rol admin manualmente.
update public.profiles
set
  role = 'admin'::user_role,
  is_blocked = false
where id = (
  select id
  from auth.users
  where lower(email) = 'step1115.sp@gmail.com'
)
returning id, full_name, role, is_blocked, created_at;

-- 4) Verificar que la funcion usada por la app lea admin correctamente.
select
  u.id,
  u.email,
  p.role,
  p.is_blocked,
  public.is_admin(u.id) as app_should_treat_as_admin
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = 'step1115.sp@gmail.com';

-- 5) Crear una solicitud de entrega de prueba para emitir credis desde /admin.
-- Se crea solo si no existe una prueba pendiente/aprobable con el mismo titulo.
insert into public.platform_intakes (
  user_id,
  title,
  category,
  condition,
  description,
  requested_notes,
  status,
  dropoff_location
)
select
  u.id,
  'Solicitud de prueba admin - emisión de credis',
  'Electrónica',
  'Muy bueno',
  'Artículo de prueba creado desde SQL para validar aprobación y emisión de credis en el panel administrador.',
  'Prueba interna. Puede aprobarse con 25 credis y luego emitirse.',
  'submitted'::intake_status,
  'Escazú'
from auth.users u
where lower(u.email) = 'step1115.sp@gmail.com'
  and not exists (
    select 1
    from public.platform_intakes pi
    where pi.user_id = u.id
      and pi.title = 'Solicitud de prueba admin - emisión de credis'
      and pi.status in ('submitted', 'offer_made', 'approved')
  )
returning id, user_id, title, status, created_at;

-- 6) Ver solicitudes de entrega visibles para admin.
select
  pi.id,
  u.email as user_email,
  pi.title,
  pi.category,
  pi.condition,
  pi.status,
  pi.offered_credits,
  pi.created_at
from public.platform_intakes pi
join auth.users u on u.id = pi.user_id
order by pi.created_at desc
limit 10;

-- 7) Ver historial de credis de la cuenta admin.
select
  ct.id,
  ct.type,
  ct.amount,
  ct.previous_balance,
  ct.new_balance,
  ct.description,
  ct.created_at
from public.credit_transactions ct
where ct.user_id = (
  select id from auth.users where lower(email) = 'step1115.sp@gmail.com'
)
order by ct.created_at desc
limit 20;

-- 8) SQL para remover admin si alguna vez necesitas revertirlo.
-- update public.profiles
-- set role = 'user'::user_role
-- where id = (
--   select id from auth.users where lower(email) = 'step1115.sp@gmail.com'
-- );
