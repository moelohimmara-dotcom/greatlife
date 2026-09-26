import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_URL.includes('.supabase.co')
)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'greatlife-auth' },
    })
  }
  return client
}

const EDGE_FUNCTION_URL = isSupabaseConfigured
  ? `${SUPABASE_URL}/functions/v1/send-contact-email`
  : ''

export async function invokeContactEmail(payload: {
  nom: string
  email: string
  sujet: string
  message: string
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb || !EDGE_FUNCTION_URL) return { ok: false, error: 'not-configured' }
  try {
    const { data, error } = await sb.functions.invoke('send-contact-email', {
      body: payload,
    })
    if (error) return { ok: false, error: error.message }
    if (data && (data as { error?: string }).error) {
      return { ok: false, error: (data as { error: string }).error }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function sendMagicLink(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        shouldCreateUser: true,
      },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

/** Change le mot de passe du compte connecté (session requise). */
export async function updateOwnPassword(
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    const { error } = await sb.auth.updateUser({ password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

/**
 * Demande un changement d'email pour le compte connecté.
 * Supabase envoie un courriel de confirmation à la nouvelle adresse.
 */
export async function updateOwnEmail(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    const { error } = await sb.auth.updateUser({
      email: email.trim().toLowerCase(),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

/** Envoie un lien de réinitialisation de mot de passe (écran de connexion). */
export async function requestPasswordReset(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login?reset=1`,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export type ManageAdminAuthResult = {
  ok: boolean
  error?: string
  email?: string
  role?: string
  inviteSent?: boolean
  inviteError?: string
  replaced?: boolean
}

/** Lit le corps JSON d'une FunctionsHttpError (Response dans error.context). */
async function readFunctionsErrorBody(error: unknown): Promise<{
  message?: string
  status?: number
  bodyError?: string
}> {
  const err = error as {
    message?: string
    context?: Response | { status?: number; json?: () => Promise<unknown> }
  } | null
  const message = err?.message || 'invoke-failed'
  const ctx = err?.context
  const status =
    ctx && typeof ctx === 'object' && 'status' in ctx && typeof ctx.status === 'number'
      ? ctx.status
      : undefined
  let bodyError: string | undefined
  if (ctx && typeof (ctx as Response).json === 'function') {
    try {
      // Cloner : le corps ne peut être lu qu'une fois.
      const clone = typeof (ctx as Response).clone === 'function'
        ? (ctx as Response).clone()
        : (ctx as Response)
      const parsed = (await clone.json()) as { error?: string; message?: string; ok?: boolean }
      bodyError = parsed?.error || parsed?.message
    } catch {
      /* corps non JSON — on garde le message générique */
    }
  }
  return { message, status, bodyError }
}

/**
 * Owner uniquement — crée / remplace des identifiants via Edge Function
 * (service_role côté serveur, jamais dans le navigateur).
 *
 * Important : un FunctionsHttpError « non-2xx » n'est PAS une fonction absente.
 * Le corps JSON (ex. « Acces non autorise ») doit remonter tel quel à l'UI.
 */
export async function invokeManageAdminAuth(payload: {
  action: 'set-credentials' | 'invite-tester'
  email: string
  name?: string
  password: string
  role?: string
  previousEmail?: string
  sendInviteEmail?: boolean
}): Promise<ManageAdminAuthResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    const { data: sessionData } = await sb.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      return { ok: false, error: 'Authentification requise' }
    }

    const { data, error } = await sb.functions.invoke('manage-admin-auth', {
      body: payload,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (error) {
      const parsed = await readFunctionsErrorBody(error)
      const message = parsed.message ?? 'invoke-failed'
      const { status, bodyError } = parsed
      if (bodyError) {
        return { ok: false, error: bodyError }
      }
      // Indisponibilité réelle uniquement : réseau / 404. Ne jamais traiter
      // le message générique « non-2xx » comme « fonction absente ».
      if (/failed to send/i.test(message) || status === 404) {
        return {
          ok: false,
          error:
            'Fonction manage-admin-auth indisponible. Déployez-la dans Supabase (Functions) ou utilisez le lien magique.',
        }
      }
      if (status === 401) return { ok: false, error: 'Authentification requise' }
      if (status === 403) return { ok: false, error: 'Acces non autorise' }
      return {
        ok: false,
        error: message.includes('non-2xx')
          ? 'Échec de la mise à jour des identifiants.'
          : message,
      }
    }
    if (data && (data as { error?: string }).error) {
      return { ok: false, error: (data as { error: string }).error }
    }
    if (data && (data as { ok?: boolean }).ok === false) {
      return { ok: false, error: (data as { error?: string }).error || 'Échec' }
    }
    return {
      ok: true,
      email: (data as { email?: string })?.email,
      role: (data as { role?: string })?.role,
      inviteSent: Boolean((data as { inviteSent?: boolean })?.inviteSent),
      inviteError: (data as { inviteError?: string })?.inviteError,
      replaced: Boolean((data as { replaced?: boolean })?.replaced),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

/**
 * Un refus d'autorisation (401/403) ne doit JAMAIS déclencher un repli :
 * sinon un accès refusé passerait pour une réussite.
 */
export function isAuthRefusal(error?: string): boolean {
  if (!error) return false
  return /authentification requise|session admin invalide|acces non autorise|accès non autorisé/i.test(error)
}

export async function invokeReplyEmail(payload: {
  to: string
  subject: string
  replyMessage: string
  replyFromName?: string
  originalMessage?: string
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb || !EDGE_FUNCTION_URL) return { ok: false, error: 'not-configured' }
  try {
    const { data, error } = await sb.functions.invoke('send-contact-email', {
      body: { action: 'reply', ...payload },
    })
    if (error) return { ok: false, error: error.message }
    if (data && (data as { error?: string }).error) {
      return { ok: false, error: (data as { error: string }).error }
    }
    if (data && Array.isArray((data as { errors?: unknown[] }).errors) && (data as { errors: unknown[] }).errors.length > 0) {
      return { ok: false, error: (data as { errors: string[] }).errors.join('; ') }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function invokeOrderStatusEmail(payload: {
  to: string
  nom: string
  status: string
  ref?: string
  items?: string
  total?: string
  pickupTime?: string
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb || !EDGE_FUNCTION_URL) return { ok: false, error: 'not-configured' }
  try {
    const { data, error } = await sb.functions.invoke('send-contact-email', {
      body: { action: 'order-status', ...payload },
    })
    if (error) return { ok: false, error: error.message }
    if (data && (data as { error?: string }).error) {
      return { ok: false, error: (data as { error: string }).error }
    }
    if (data && Array.isArray((data as { errors?: unknown[] }).errors) && (data as { errors: unknown[] }).errors.length > 0) {
      return { ok: false, error: (data as { errors: string[] }).errors.join('; ') }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function invokeReservationStatusEmail(payload: {
  to: string
  nom: string
  status: string
  resaDate?: string
  resaTime?: string
  resaGuests?: string
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb || !EDGE_FUNCTION_URL) return { ok: false, error: 'not-configured' }
  try {
    const { data, error } = await sb.functions.invoke('send-contact-email', {
      body: { action: 'reservation-status', ...payload },
    })
    if (error) return { ok: false, error: error.message }
    if (data && (data as { error?: string }).error) {
      return { ok: false, error: (data as { error: string }).error }
    }
    if (data && Array.isArray((data as { errors?: unknown[] }).errors) && (data as { errors: unknown[] }).errors.length > 0) {
      return { ok: false, error: (data as { errors: string[] }).errors.join('; ') }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}
