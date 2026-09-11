import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { MENU, type MenuItem } from '@/data/menu'
import type { SiteContent, ContactMessage } from '@/contexts/SiteContext'

const MENU_TABLE = 'menu_items'
const CONTENT_TABLE = 'site_content'
const MESSAGES_TABLE = 'messages'
const BLOG_TABLE = 'blog_posts'
const RESERVATIONS_TABLE = 'reservations'
const CONTENT_KEY = 'site_config'

export interface SiteConfig {
  content: SiteContent
  themeId: string
  fontId: string
  visibility: unknown
}

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

export async function deleteMenuItem(name: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb.from(MENU_TABLE).delete().eq('name', name)
    return !error
  } catch {
    return false
  }
}

export async function fetchContent(): Promise<{
  data: Partial<SiteConfig> | null
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
    const value = data.value as Partial<SiteConfig>
    return { data: value ?? null, fromDb: true }
  } catch {
    return { data: null, fromDb: false }
  }
}

export async function saveContent(content: SiteContent): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { data: existing } = await sb
      .from(CONTENT_TABLE)
      .select('value')
      .eq('key', CONTENT_KEY)
      .maybeSingle()
    const currentValue = (existing?.value ?? {}) as Record<string, unknown>
    const merged = {
      ...currentValue,
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
      { key: CONTENT_KEY, value: merged, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    return !error
  } catch {
    return false
  }
}

export async function saveSiteConfig(config: SiteConfig): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb.from(CONTENT_TABLE).upsert(
      { key: CONTENT_KEY, value: config, updated_at: new Date().toISOString() },
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
        id: String(m.id ?? ''),
        nom: String(m.nom ?? ''),
        email: String(m.email ?? ''),
        sujet: String(m.sujet ?? 'contact'),
        message: String(m.message ?? ''),
        date: String(m.date ?? new Date().toISOString()),
        handled: Boolean(m.handled ?? false),
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

export interface MessageRecord {
  id?: string
  nom: string
  email: string
  sujet: string
  message: string
  date: string
  handled: boolean
}

export async function markMessageHandled(
  id: string,
  handled: boolean
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb
      .from(MESSAGES_TABLE)
      .update({ handled })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

export interface BlogPost {
  id?: string
  title: string
  excerpt: string
  body: string
  category: string
  published: boolean
  created_at?: string
}

export async function fetchBlogPosts(): Promise<{ data: BlogPost[]; fromDb: boolean }> {
  const sb = getSupabase()
  if (!sb) return { data: [], fromDb: false }
  try {
    const { data, error } = await sb
      .from(BLOG_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data) return { data: [], fromDb: false }
    return {
      data: (data as Array<Record<string, unknown>>).map(p => ({
        id: String(p.id ?? ''),
        title: String(p.title ?? ''),
        excerpt: String(p.excerpt ?? ''),
        body: String(p.body ?? ''),
        category: String(p.category ?? 'Actualités'),
        published: Boolean(p.published ?? false),
        created_at: String(p.created_at ?? ''),
      })),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export async function upsertBlogPost(post: BlogPost): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const payload = {
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      published: post.published,
    }
    if (post.id) {
      const { error } = await sb.from(BLOG_TABLE).update(payload).eq('id', post.id)
      return !error
    }
    const { error } = await sb.from(BLOG_TABLE).insert(payload)
    return !error
  } catch {
    return false
  }
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb.from(BLOG_TABLE).delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}

export interface Reservation {
  id?: string
  nom: string
  email: string
  phone: string
  date: string
  time: string
  guests: number
  message: string
  status: string
  created_at?: string
}

export async function insertReservation(r: Omit<Reservation, 'id' | 'status' | 'created_at'>): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb.from(RESERVATIONS_TABLE).insert({
      nom: r.nom,
      email: r.email,
      phone: r.phone,
      date: r.date,
      time: r.time,
      guests: r.guests,
      message: r.message,
    })
    return !error
  } catch {
    return false
  }
}

export async function fetchReservations(): Promise<{ data: Reservation[]; fromDb: boolean }> {
  const sb = getSupabase()
  if (!sb) return { data: [], fromDb: false }
  try {
    const { data, error } = await sb
      .from(RESERVATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error || !data) return { data: [], fromDb: false }
    return {
      data: (data as Array<Record<string, unknown>>).map(r => ({
        id: String(r.id ?? ''),
        nom: String(r.nom ?? ''),
        email: String(r.email ?? ''),
        phone: String(r.phone ?? ''),
        date: String(r.date ?? ''),
        time: String(r.time ?? ''),
        guests: Number(r.guests ?? 2),
        message: String(r.message ?? ''),
        status: String(r.status ?? 'pending'),
        created_at: String(r.created_at ?? ''),
      })),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export async function updateReservationStatus(id: string, status: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb.from(RESERVATIONS_TABLE).update({ status }).eq('id', id)
    return !error
  } catch {
    return false
  }
}

export const supabaseReady = isSupabaseConfigured
