-- ════════════════════════════════════════════════════════════════════════════
-- Reversión de supabase/migrations/20261016120000_passport_links.sql
--
-- Quita SOLO lo que agregó esa migración. No toca public.sync_shared_world,
-- cuentas, viajes publicados, relaciones, solicitudes ni permisos.
--
-- ESTRICTA: DROP sin IF EXISTS y sin CASCADE. Si falta alguno de estos objetos
-- (la migración no se aplicó) o si otro objeto depende de ellos, la reversión
-- falla completa y no borra nada, en vez de borrar a medias o de llevarse algo
-- que no creó esta migración.
-- Si ya existieran vínculos (etapas posteriores), se pierden: antes de usar
-- esta reversión en ese caso, revisar con quien corresponda.
-- ════════════════════════════════════════════════════════════════════════════

begin;

drop function public.sync_shared_world_v2(uuid, bigint, integer, text, integer, integer, integer, integer, jsonb);
drop function public.get_passport_link_status(uuid);
drop function public.link_passport(uuid);
drop table public.passport_links;

notify pgrst, 'reload schema';

commit;
