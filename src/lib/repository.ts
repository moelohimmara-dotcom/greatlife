import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { MENU, type MenuItem } from '@/data/menu'
import type { SiteContent, ContactMessage } from '@/contexts/SiteContext'

const MENU_TABLE = 'menu_items'
const CONTENT_TABLE = 'site_content'
const MESSAGES_TABLE = 'messages'
const CONTENT_KEY = 'site_config'

interface MenuRow {
  id: string
  cat: string
  name: string
  sig: boolean | null
  price: string
  description: string
  vertus: string
  badges: string[] | Record<string, unknown> | null
  sort_order: number | null
}

function rowToMenuItem(row: MenuRow): MenuItem {
  let badges: string[] = []
  if (Array.isArray(row.badges)) {
    badges = (row.badges as unknown[]).filter((b): b is string => typeof b === 'string')
  }
  return {
    cat: row.cat,
    name: row.name,
    sig: !!row.sig,
    price: row.price,
    desc: row.description ?? '',
    vertus: row.vertus ?? '',
    badges,
  }
}

export async function fetchMenu(): Promise<{ data: MenuItem[]; fromDb: boolean }> {
  const sb = getSupabase()
  if (!sb) return { data: MENU, fromDb: false }
  try {
    const { data, error } = await sb
      .from(MENU_TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
    if (error || !data || data.length === 0) return { data: MENU, fromDb: false }
    return { data: (data as MenuRow[]).map(rowToMenuItem), fromDb: true }
  } catch {
    return { data: MENU, fromDb: false }
  }
}

export async function upsertMenuItem(item: MenuItem): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb.from(MENU_TABLE).upsert(
      {
        cat: item.cat,
        name: item.name,
        sig: item.sig ?? false,
        price: item.price,
        description: item.desc,
        vertus: item.vertus,
        badges: item.badges,
      },
      { onConflict: 'name' }
    )
    return !error
  } catch {
    return false
  }
}

const CONTENT_COLUMNS = [
  'slogan',
  'heroTitle',
  'heroSub',
  'storyTitle',
  'story',
  'emailContact',
  'emailReservation',
  'autoReply',
] as const

type ContentRow = Pick<SiteContent, (typeof CONTENT_COLUMNS)[number]>

export async function fetchContent(): Promise<{
  data: Partial<SiteContent> | null
  fromDb: boolean
}> {
  const sb = getSupabase()
  if (!sb) return { data: null, fromDb: false }
  try {
    const { data, error } = await sb
      .from(CONTENT_TABLE)
      .select('value')
      .eq('key', CONTENT_KEY)
      .maybeSingle()
    if (error || !data) return { data: null, fromDb: false }
    const value = data.value as Partial<SiteContent>
    return { data: value ?? null, fromDb: true }
  } catch {
    return { data: null, fromDb: false }
  }
}

export async function saveContent(content: SiteContent): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const row: ContentRow = {
      slogan: content.slogan,
      heroTitle: content.heroTitle,
      heroSub: content.heroSub,
      storyTitle: content.storyTitle,
      story: content.story,
      emailContact: content.emailContact,
      emailReservation: content.emailReservation,
      autoReply: content.autoReply,
    }
    const { error } = await sb.from(CONTENT_TABLE).upsert(
      { key: CONTENT_KEY, value: row, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    return !error
  } catch {
    return false
  }
}

export async function fetchMessages(): Promise<{
  data: ContactMessage[]
  fromDb: boolean
}> {
  const sb = getSupabase()
  if (!sb) return { data: [], fromDb: false }
  try {
    const { data, error } = await sb
      .from(MESSAGES_TABLE)
      .select('*')
      .order('date', { ascending: false })
      .limit(100)
    if (error || !data) return { data: [], fromDb: false }
    return {
      data: (data as Array<Record<string, unknown>>).map(m => ({
        nom: String(m.nom ?? ''),
        email: String(m.email ?? ''),
        sujet: String(m.sujet ?? 'contact'),
        message: String(m.message ?? ''),
        date: String(m.date ?? new Date().toISOString()),
      })),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export async function insertMessage(msg: ContactMessage): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb.from(MESSAGES_TABLE).insert({
      nom: msg.nom,
      email: msg.email,
      sujet: msg.sujet,
      message: msg.message,
    })
    return !error
  } catch {
    return false
  }
}

export const supabaseReady = isSupabaseConfigured
