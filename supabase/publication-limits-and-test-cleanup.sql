-- Intercambio CR - limites de publicaciones y limpieza de prueba
-- Ejecutar en Supabase SQL Editor.

-- 1) Campo de plan usado por el backend.
alter table public.profiles
  add column if not exists plan text not null default 'free';

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'premium'));

-- 2) Ocultar publicacion de prueba/demo en produccion.
update public.listings
set status = 'removed'::public.listing_status,
    updated_at = now()
where lower(trim(title)) = lower('PRUEBA CHATGPT');

-- 3) Diagnostico rapido.
select id, title, status, updated_at
from public.listings
where lower(trim(title)) = lower('PRUEBA CHATGPT');

select id, full_name, role, plan
from public.profiles
order by created_at desc
limit 20;

notify pgrst, 'reload schema';
