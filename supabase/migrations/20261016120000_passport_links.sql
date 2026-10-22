-- ════════════════════════════════════════════════════════════════════════════
-- MyWorldXP · Identidad del pasaporte · ETAPA 1 (solo servidor)
--
-- Vínculo PRIVADO entre un pasaporte (instalación de MyWorldXP, identificada
-- por un UUID aleatorio que genera la app) y una cuenta social.
--
-- Reglas:
--   · Un pasaporte se vincula con UNA sola cuenta, y una cuenta con UN solo
--     pasaporte (passport_id es PK; user_id es UNIQUE).
--   · Un vínculo existente NUNCA se reasigna: no hay UPDATE ni ninguna función
--     que lo mueva. Cambio de cuenta y recuperación quedan para una etapa
--     posterior, con revisión propia.
--   · Ningún cliente puede leer ni escribir la tabla directamente (RLS sin
--     políticas + REVOKE). Solo se usa a través de las funciones de abajo.
--   · Conocer un passport_id NO autoriza nada sobre cuentas ajenas: todas las
--     funciones operan exclusivamente sobre auth.uid() (la cuenta autenticada).
--
-- ADITIVA Y COMPATIBLE:
--   · No modifica, reemplaza ni desactiva public.sync_shared_world: las
--     versiones actuales de la app siguen publicando igual que hoy.
--   · No crea vínculos para ningún usuario: la tabla queda vacía.
--   · No toca cuentas, viajes publicados, relaciones, solicitudes ni permisos.
--
-- ESTRICTA: usa CREATE (sin IF NOT EXISTS / OR REPLACE). Si ya existiera
-- cualquier objeto con estos nombres y firmas, la migración falla completa y
-- no aplica nada, en vez de saltearlo o reemplazarlo en silencio.
--
-- Propietario: el rol que la ejecuta en el SQL Editor (postgres), igual que las
-- funciones sociales existentes. Necesita, como ya tiene: EXECUTE sobre
-- public.require_verified_social_user y public.sync_shared_world, y crear una
-- FK hacia auth.users. Como propietario de la tabla no está sujeto a su RLS, así
-- que las funciones SECURITY DEFINER pueden leerla y escribirla; ningún cliente.
--
-- Reversión: supabase/rollback/20261016120000_passport_links_down.sql
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── Tabla privada de vínculos ───────────────────────────────────────────────

create table public.passport_links (
  passport_id uuid primary key,
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  linked_at   timestamptz not null default now()
);

alter table public.passport_links enable row level security;
-- Sin políticas a propósito: ningún rol de cliente ve ni modifica filas.
-- Además se quitan los permisos que Supabase otorga por defecto a las tablas
-- nuevas de "public".
revoke all on table public.passport_links from public, anon, authenticated;


-- ─── Vincular el pasaporte de este dispositivo con la cuenta autenticada ─────
-- Solo crea un vínculo nuevo cuando NI la cuenta NI el pasaporte tienen uno.
-- Devuelve 'linked' o 'already_linked'. Nunca reasigna.

create function public.link_passport(p_passport_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid;
  v_current_passport uuid;
begin
  v_uid := public.require_verified_social_user();

  if p_passport_id is null then
    raise exception 'INVALID_PASSPORT';
  end if;

  -- ¿La cuenta ya está vinculada?
  select pl.passport_id
  into v_current_passport
  from public.passport_links pl
  where pl.user_id = v_uid
  for update;

  if found then
    if v_current_passport = p_passport_id then
      return 'already_linked';
    end if;
    -- Nunca se reasigna en silencio a otro pasaporte.
    raise exception 'ACCOUNT_LINKED_TO_OTHER_PASSPORT';
  end if;

  -- ¿El pasaporte ya pertenece a otra cuenta?
  perform 1
  from public.passport_links pl
  where pl.passport_id = p_passport_id
  for update;

  if found then
    raise exception 'PASSPORT_LINKED_TO_OTHER_ACCOUNT';
  end if;

  begin
    insert into public.passport_links (passport_id, user_id)
    values (p_passport_id, v_uid);
  exception
    when unique_violation then
      -- Dos vinculaciones simultáneas: gana la primera; esta no se aplica.
      raise exception 'LINK_CONFLICT';
  end;

  return 'linked';
end;
$function$;


-- ─── Consultar el estado del vínculo (solo lectura) ──────────────────────────
-- Para que la app sepa qué mostrar. No revela qué pasaporte ni qué cuenta:
--   'linked_here'                       la cuenta está vinculada a ESTE pasaporte
--   'account_linked_elsewhere'          la cuenta está vinculada a OTRO pasaporte
--   'passport_linked_to_other_account'  este pasaporte pertenece a otra cuenta
--   'unlinked'                          ninguno de los dos tiene vínculo

create function public.get_passport_link_status(p_passport_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid;
  v_current_passport uuid;
begin
  v_uid := public.require_verified_social_user();

  if p_passport_id is null then
    raise exception 'INVALID_PASSPORT';
  end if;

  select pl.passport_id
  into v_current_passport
  from public.passport_links pl
  where pl.user_id = v_uid;

  if found then
    if v_current_passport = p_passport_id then
      return 'linked_here';
    end if;
    return 'account_linked_elsewhere';
  end if;

  if exists (
    select 1
    from public.passport_links pl
    where pl.passport_id = p_passport_id
  ) then
    return 'passport_linked_to_other_account';
  end if;

  return 'unlinked';
end;
$function$;


-- ─── Publicar SOLO desde el pasaporte vinculado ──────────────────────────────
-- Mismos parámetros que sync_shared_world más p_passport_id. Si la cuenta
-- autenticada no está vinculada a ESE pasaporte, no publica nada. Si lo está,
-- delega en la función actual (una sola lógica de publicación, sin duplicar).
-- FOR SHARE: el vínculo no puede desaparecer mientras se publica.

-- Firma de la función original comprobada contra su definición de producción
-- (pg_get_functiondef, CSV del 2026-10-03):
--   sync_shared_world(p_revision bigint, p_xp_total integer, p_rango_actual text,
--     p_continentes_visitados integer, p_paises_visitados integer,
--     p_ciudades_visitadas integer, p_viajes_realizados integer, p_trips jsonb)
--   RETURNS text
-- La llamada de abajo es posicional en ese mismo orden. El script de
-- verificación vuelve a comprobar esa firma en la base antes de aplicar.

create function public.sync_shared_world_v2(
  p_passport_id uuid,
  p_revision bigint,
  p_xp_total integer,
  p_rango_actual text,
  p_continentes_visitados integer,
  p_paises_visitados integer,
  p_ciudades_visitadas integer,
  p_viajes_realizados integer,
  p_trips jsonb
)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid;
begin
  v_uid := public.require_verified_social_user();

  if p_passport_id is null then
    raise exception 'INVALID_PASSPORT';
  end if;

  perform 1
  from public.passport_links pl
  where pl.user_id = v_uid
    and pl.passport_id = p_passport_id
  for share;

  if not found then
    raise exception 'PASSPORT_NOT_LINKED';
  end if;

  return public.sync_shared_world(
    p_revision,
    p_xp_total,
    p_rango_actual,
    p_continentes_visitados,
    p_paises_visitados,
    p_ciudades_visitadas,
    p_viajes_realizados,
    p_trips
  );
end;
$function$;


-- ─── Permisos de ejecución ───────────────────────────────────────────────────
-- Solo usuarios autenticados. Nunca anon.

revoke execute on function public.link_passport(uuid) from public, anon;
grant  execute on function public.link_passport(uuid) to authenticated;

revoke execute on function public.get_passport_link_status(uuid) from public, anon;
grant  execute on function public.get_passport_link_status(uuid) to authenticated;

revoke execute on function public.sync_shared_world_v2(uuid, bigint, integer, text, integer, integer, integer, integer, jsonb) from public, anon;
grant  execute on function public.sync_shared_world_v2(uuid, bigint, integer, text, integer, integer, integer, integer, jsonb) to authenticated;

-- Que la API (PostgREST) vea las funciones nuevas.
notify pgrst, 'reload schema';

commit;
