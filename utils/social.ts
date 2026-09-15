import { supabase } from './supabase';

// ─── NORMALIZACIÓN ────────────────────────────────────────────────────────────
// Mismo criterio que utils/auth.ts (normalizeUsername): quita un @ inicial,
// trim, lowercase. Sirve tanto para @username como para email, ya que ambos
// se buscan en minúsculas.
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

// ─── IDENTIDAD PROPIA ─────────────────────────────────────────────────────────
// Lectura directa a `profiles` (no vía RPC): la policy de profiles ya permite
// que un usuario lea su propia fila (auth.uid() = id), y get_social_usernames
// es un resolver por lote de ids ajenos (ver find_user_exact más abajo para
// el detalle de cómo se confirmó cada firma real) — usar ese RPC acá sería
// indirección innecesaria para el caso "mi propio username".
export async function getMyUsername(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  if (error) {
    // PGRST116 = ninguna fila (perfil todavía no creado por el trigger, caso
    // límite inesperado): se trata como "sin username", no como error fatal.
    if (error.code === 'PGRST116') return null;
    if (__DEV__) console.warn('[social] getMyUsername error', error.code, error.message);
    throw error;
  }

  const username = (data as { username?: unknown } | null)?.username;
  return typeof username === 'string' && username.length > 0 ? username : null;
}

// ─── BÚSQUEDA EXACTA ──────────────────────────────────────────────────────────

export interface FoundUser {
  id: string;
  username: string;
}

// find_user_exact ya está instalado en Supabase (no se creó ni modificó acá).
// Su firma real se confirmó de forma no invasiva contra el proyecto real
// (sin ejecutar SQL): llamando al RPC vía REST con nombres de parámetro de
// prueba y leyendo el error de PostgREST, que informa el nombre correcto
// cuando no matchea ninguna función. Así se confirmó que el único parámetro
// se llama `p_query` (un intento con `p_query` devolvió "permission denied
// for function", es decir la función matcheó y el único problema fue no
// tener una sesión autenticada — confirma la firma sin necesitar ver el SQL).
//
// La forma de la fila que devuelve SÍ se confirmó después, contra el SQL
// real: `RETURNS TABLE(user_id uuid, username text)` — la columna del id es
// `user_id`, no `id` (ver FoundUser.id más abajo, que sigue llamándose `id`
// puertas adentro del cliente por ser el nombre que usa el resto de la app).
// Se sigue parseando de forma defensiva: se acepta null, array vacío, array
// con un objeto, o un objeto suelto, y solo se confía en `user_id`/`username`
// si son strings — cualquier otra forma se trata como "no encontrado", nunca
// como crash.
export async function findUserExact(query: string): Promise<FoundUser | null> {
  const { data, error } = await supabase.rpc('find_user_exact', { p_query: query });

  if (error) {
    if (__DEV__) console.warn('[social] find_user_exact error', error.code, error.message);
    throw error;
  }

  return parseFoundUser(data);
}

function parseFoundUser(data: unknown): FoundUser | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;

  const { user_id, username } = row as Record<string, unknown>;
  if (typeof user_id === 'string' && user_id.length > 0 && typeof username === 'string' && username.length > 0) {
    return { id: user_id, username };
  }
  return null;
}

// ─── SOLICITUDES DE COMPARTIR ─────────────────────────────────────────────────

export type ShareRequestType = 'request_access' | 'offer_share';
export type ShareScope = 'realized' | 'wishlist' | 'both';

// create_share_request ya está instalado (no se creó ni modificó acá). Firma
// confirmada con la misma técnica no invasiva que find_user_exact: probing
// vía REST leyendo los hints de PostgREST cuando el nombre de parámetro no
// matchea. Un intento con `p_target_id` sola devolvió el hint
// "Perhaps you meant to call the function
// public.create_share_request(p_request_type, p_scope, p_target_id)" —
// confirma los 3 nombres reales. Además, tanto mandar `p_scope: null` como
// omitir `p_scope` por completo matchean la misma función (ambos devuelven
// "permission denied for function", nunca "función no encontrada"),
// confirmando que ese parámetro es opcional — coherente con que
// request_access no elige scope.
export async function createShareRequest(params: {
  targetId: string;
  requestType: ShareRequestType;
  scope?: ShareScope;
}): Promise<void> {
  const { error } = await supabase.rpc('create_share_request', {
    p_request_type: params.requestType,
    p_scope: params.scope ?? null,
    p_target_id: params.targetId,
  });

  if (error) {
    if (__DEV__) console.warn('[social] create_share_request error', error.code, error.message);
    throw error;
  }

  // El valor de retorno no se usa: la ausencia de error ya confirma el éxito,
  // y no se pudo observar de forma confiable la forma exacta de una fila de
  // éxito sin una segunda cuenta real para disparar el flujo completo — no
  // hace falta ninguna, "no hubo error" es la única señal necesaria acá.
}

// ─── SOLICITUDES PENDIENTES ───────────────────────────────────────────────────

export interface PendingShareRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  requestType: ShareRequestType;
  scope: ShareScope | null;
  createdAt: string;
}

function isShareRequestType(v: unknown): v is ShareRequestType {
  return v === 'request_access' || v === 'offer_share';
}

function isShareScope(v: unknown): v is ShareScope {
  return v === 'realized' || v === 'wishlist' || v === 'both';
}

// SELECT de solo lectura a share_requests (nunca INSERT/UPDATE directo): la
// policy ya permite al receiver leer sus propias solicitudes. Se trae solo lo
// necesario, filtrado por receiver_id + status=pending — nada de historial ni
// de solicitudes enviadas por mí.
export async function fetchPendingShareRequests(myUserId: string): Promise<PendingShareRequest[]> {
  const { data, error } = await supabase
    .from('share_requests')
    .select('id, sender_id, request_type, scope, created_at')
    .eq('receiver_id', myUserId)
    .eq('status', 'pending');

  if (error) {
    if (__DEV__) console.warn('[social] fetchPendingShareRequests error', error.code, error.message);
    throw error;
  }

  // Sin tipos generados de Supabase (no hay Database genérico configurado),
  // la forma de `data` no es confiable de por sí — se trata como `unknown[]`
  // y se valida cada fila a mano abajo, nunca se asume su forma.
  const rows: unknown[] = Array.isArray(data) ? data : [];

  // Filas con forma inesperada se descartan en vez de romper la pantalla.
  const valid = rows.filter((row): row is Record<string, unknown> => {
    if (!row || typeof row !== 'object') return false;
    const r = row as Record<string, unknown>;
    return (
      typeof r.id === 'string' &&
      typeof r.sender_id === 'string' &&
      isShareRequestType(r.request_type) &&
      (r.scope === null || isShareScope(r.scope)) &&
      typeof r.created_at === 'string'
    );
  });

  const senderIds = [...new Set(valid.map((r) => r.sender_id as string))];
  const usernames = await resolveUsernames(senderIds);

  return valid.map((r) => ({
    id: r.id as string,
    senderId: r.sender_id as string,
    senderUsername: usernames.get(r.sender_id as string) ?? 'Usuario',
    requestType: r.request_type as ShareRequestType,
    scope: (r.scope as ShareScope | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

// get_social_usernames ya está instalado (no se creó ni modificó acá). Su
// firma real (`p_user_ids`) se confirmó con la misma técnica de probing REST:
// un intento con un parámetro incorrecto devolvió el hint
// "Perhaps you meant to call the function public.get_social_usernames(p_user_ids)".
// Está pensado justamente para resolver usernames en lote por ids
// relacionados/con solicitud — se llama UNA vez por pantalla con todos los
// sender_id únicos, nunca una vez por request. No se pudo observar la forma
// exacta de una fila de éxito sin sesión real, así que se acepta tanto `id`
// como `user_id` como nombre de columna del id, y cualquier fila que no
// tenga username usable simplemente no entra al mapa (cae al fallback
// "Usuario" en el llamador) — nunca rompe la carga de pendientes por esto.
async function resolveUsernames(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabase.rpc('get_social_usernames', { p_user_ids: userIds });

  if (error) {
    if (__DEV__) console.warn('[social] get_social_usernames error', error.code, error.message);
    return map;
  }

  const rows = Array.isArray(data) ? data : data != null ? [data] : [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : typeof r.user_id === 'string' ? r.user_id : null;
    const username = typeof r.username === 'string' ? r.username : null;
    if (id && username) map.set(id, username);
  }
  return map;
}

// respond_share_request ya está instalado (no se creó ni modificó acá). Firma
// confirmada con la misma técnica no invasiva: varios intentos con nombres de
// parámetro incorrectos devolvieron el hint "Perhaps you meant to call the
// function public.respond_share_request(p_accept, p_request_id, p_scope)".
// Enviar los 3 juntos (con p_scope null) y también omitiendo p_scope por
// completo matchearon la misma función (ambos "permission denied for
// function", nunca "función no encontrada"), confirmando que p_scope es
// opcional — coherente con que solo hace falta al aceptar un request_access;
// para offer_share se omite y el servidor respeta el scope ya elegido por
// quien ofreció, tal como pide la arquitectura (nunca se cambia scope desde
// el cliente).
export async function respondShareRequest(params: {
  requestId: string;
  accept: boolean;
  scope?: ShareScope;
}): Promise<void> {
  const { error } = await supabase.rpc('respond_share_request', {
    p_accept: params.accept,
    p_request_id: params.requestId,
    p_scope: params.scope ?? null,
  });

  if (error) {
    if (__DEV__) console.warn('[social] respond_share_request error', error.code, error.message);
    throw error;
  }
}

// ─── ERRORES ──────────────────────────────────────────────────────────────────
// Los errores de RPC/Postgrest son PostgrestError (code/details/hint/message
// crudos de Postgres), no AuthError — nunca se muestra `message`/`hint` tal
// cual al usuario.

function getConnectionOrPermissionMessage(error: Error): string | null {
  const msg = error.message.toLowerCase();
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch failed')) {
    return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
  }

  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  if (code === '42501') {
    return 'No tenés permiso para hacer esto en este momento. Confirmá tu email o volvé a iniciar sesión.';
  }
  return null;
}

export function getSocialErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Ocurrió un error inesperado. Intentá de nuevo.';
  }

  const base = getConnectionOrPermissionMessage(error);
  if (base) return base;

  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  if (code.startsWith('PGRST')) {
    return 'Ocurrió un error inesperado al buscar. Intentá de nuevo en unos minutos.';
  }

  return 'Ocurrió un error al buscar. Intentá de nuevo en unos minutos.';
}

// El servidor ya implementa toda la lógica de negocio (pending equivalente,
// cooldown de 15 días, bloqueo tras 2do/3er rechazo, relación existente,
// verificación, etc.) — este mapeo NO la duplica, solo interpreta el error
// que ya devolvió el RPC. No se pudo observar en un caso real qué código o
// texto exacto usa cada regla (haría falta una segunda cuenta y disparar
// esos estados en la base real, algo fuera de alcance acá), así que el
// parsing es prudente: varias palabras clave por categoría, nunca una frase
// única y frágil, y si nada matchea, un mensaje genérico honesto en vez de
// inventar un motivo.
export function getShareRequestErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'No pudimos completar la solicitud. Intentá de nuevo más tarde.';
  }

  const base = getConnectionOrPermissionMessage(error);
  if (base) return base;

  const msg = error.message.toLowerCase();

  // Casos específicos de responder (aceptar/rechazar) una solicitud ya
  // existente — se chequean antes que los de creación porque "ya no está
  // pending" y "ya existe una pendiente" usan vocabulario parecido y el
  // orden evita que el genérico de más abajo gane por error.
  if (/expired|expirad/.test(msg)) {
    return 'Esta solicitud ya expiró.';
  }
  if (/not.?found|no.?encontr|does not exist|no existe/.test(msg)) {
    return 'Esta solicitud ya no existe.';
  }
  if (/already.*respond|ya.*respond|not.*pending|no.*(está|esta).*pending|already.*(accept|reject)/.test(msg)) {
    return 'Esta solicitud ya fue respondida.';
  }
  if (/scope/.test(msg)) {
    return 'Falta elegir qué vas a compartir para aceptar esta solicitud.';
  }

  if (/(cooldown|esperar|espera|wait|d[ií]as|days)/.test(msg)) {
    return 'Tenés que esperar un tiempo antes de volver a intentar con este usuario.';
  }
  if (/(bloque|block|permanent)/.test(msg)) {
    return 'No podés enviar esta solicitud a este usuario.';
  }
  if (/(pending|pendiente)/.test(msg)) {
    return 'Ya existe una solicitud pendiente con este usuario.';
  }
  if (/(relation|relaci[oó]n|already.*shar|ya.*compart)/.test(msg)) {
    return 'Ya existe una relación con este usuario.';
  }
  if (/(verif|confirm)/.test(msg)) {
    return 'Este usuario todavía no puede usar funciones sociales.';
  }
  if (/(self|propio|yourself|mismo usuario)/.test(msg)) {
    return 'No podés hacer esto con tu propio usuario.';
  }

  // Ni un código conocido ni una palabra clave reconocible: honesto en vez
  // de adivinar el motivo.
  return 'No pudimos completar la solicitud. Intentá de nuevo más tarde.';
}
