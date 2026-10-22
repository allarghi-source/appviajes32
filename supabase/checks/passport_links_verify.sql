-- ════════════════════════════════════════════════════════════════════════════
-- Verificación de SOLO LECTURA de la etapa 1 (passport_links).
-- Un único SELECT: el SQL Editor muestra un solo resultado.
--
-- Uso:
--   1. ANTES de aplicar la migración: ejecutar y guardar el resultado.
--      · 'sync_shared_world · huella' sirve para comprobar después que la
--        función original no cambió.
--      · Las filas 'nombre libre' deben dar 0: si no, la migración fallaría
--        (usa CREATE estricto) y hay que revisar antes de seguir.
--   2. DESPUÉS de aplicarla: ejecutar de nuevo y comparar con `esperado`.
--      Algunas filas indican "antes: … / después: …".
-- ════════════════════════════════════════════════════════════════════════════

with orig as (
  -- Función original de sincronización (firma real esperada).
  select p.oid, p.proowner
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'sync_shared_world'
),
nuevas as (
  select p.oid, p.proname, p.proowner, p.prosecdef, p.proconfig,
         pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('link_passport', 'get_passport_link_status', 'sync_shared_world_v2')
),
tabla as (
  select to_regclass('public.passport_links') as oid
)
select * from (

  -- ── Función original: no cambia ───────────────────────────────────────────
  select 1 as orden, 'sync_shared_world · huella' as chequeo,
         md5(pg_get_functiondef(o.oid)) as valor,
         'igual antes y después' as esperado
  from orig o

  union all
  select 2, 'sync_shared_world · cantidad de versiones',
         (select count(*)::text from orig), '1'

  union all
  select 3, 'sync_shared_world · firma',
         pg_get_function_identity_arguments(o.oid),
         'p_revision bigint, p_xp_total integer, p_rango_actual text, p_continentes_visitados integer, p_paises_visitados integer, p_ciudades_visitadas integer, p_viajes_realizados integer, p_trips jsonb'
  from orig o

  union all
  select 4, 'sync_shared_world · retorna',
         pg_get_function_result(o.oid), 'text'
  from orig o

  union all
  select 5, 'sync_shared_world · permisos',
         'auth=' || has_function_privilege('authenticated', o.oid, 'EXECUTE')
           || ' anon=' || has_function_privilege('anon', o.oid, 'EXECUTE'),
         'auth=true anon=false'
  from orig o

  -- ── Nombres sin conflicto con objetos preexistentes ───────────────────────
  union all
  select 6, 'nombre libre · relación public.passport_links',
         (select count(*)::text from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = 'passport_links'),
         'antes: 0 / después: 1'

  union all
  select 7, 'nombre libre · funciones ' || x.nombre || ' (cualquier firma)',
         (select count(*)::text from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = x.nombre),
         'antes: 0 / después: 1'
  from (values ('link_passport'), ('get_passport_link_status'), ('sync_shared_world_v2')) as x(nombre)

  -- ── Tabla privada ─────────────────────────────────────────────────────────
  union all
  select 8, 'passport_links · RLS activado',
         coalesce((select c.relrowsecurity::text from pg_class c, tabla t where c.oid = t.oid), 'sin tabla'),
         'después: true'

  union all
  select 9, 'passport_links · propietario',
         coalesce((select pg_get_userbyid(c.relowner) from pg_class c, tabla t where c.oid = t.oid), 'sin tabla'),
         'después: igual al de sync_shared_world (' || (select pg_get_userbyid(o.proowner) from orig o) || ')'

  union all
  select 10, 'passport_links · políticas',
         (select count(*)::text from pg_policies
          where schemaname = 'public' and tablename = 'passport_links'),
         '0'

  union all
  -- has_table_privilege también cuenta lo heredado de PUBLIC.
  select 11, 'passport_links · permisos directos de ' || r.rol,
         coalesce((
           select string_agg(pr.priv, ',')
           from tabla t,
                (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as pr(priv)
           where has_table_privilege(r.rol, t.oid, pr.priv)
         ), 'ninguno'),
         'ninguno'
  from (values ('anon'), ('authenticated')) as r(rol)

  union all
  -- Conteo con SQL dinámico: solo se ejecuta si la tabla existe, así este
  -- mismo script corre antes de la migración sin dar error.
  select 12, 'passport_links · vínculos (no se vinculó a nadie)',
         case when (select oid from tabla) is null then 'sin tabla'
              else (xpath('/row/c/text()',
                          query_to_xml('select count(*) as c from public.passport_links', false, true, '')))[1]::text
         end,
         'después: 0'

  -- ── Funciones nuevas ──────────────────────────────────────────────────────
  union all
  select 13, f.proname || '(' || f.args || ')',
         'definer=' || f.prosecdef
           || ' search_path=' || coalesce(array_to_string(f.proconfig, ','), 'SIN CONFIGURAR')
           || ' auth=' || has_function_privilege('authenticated', f.oid, 'EXECUTE')
           || ' anon=' || has_function_privilege('anon', f.oid, 'EXECUTE')
           || ' dueño=' || pg_get_userbyid(f.proowner),
         'definer=true search_path=search_path="" auth=true anon=false dueño=' || (select pg_get_userbyid(o.proowner) from orig o)
  from nuevas f

) r
order by orden, chequeo;
