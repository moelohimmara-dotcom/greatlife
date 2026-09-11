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
