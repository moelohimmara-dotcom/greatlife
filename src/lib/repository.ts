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

const MEDIA_TABLE = 'media_assets'
const MEDIA_BUCKET = 'media'

export interface MediaAsset {
  id: string
  slot: string
  filename: string
  storage_path: string
  public_url: string
  content_type: string | null
  size_bytes: number | null
  created_at: string
  updated_at: string
}

export async function fetchMedia(): Promise<{ data: MediaAsset[]; fromDb: boolean }> {
  const sb = getSupabase()
  if (!sb) return { data: [], fromDb: false }
  try {
    const { data, error } = await sb
      .from(MEDIA_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data) return { data: [], fromDb: false }
    return {
      data: (data as Array<Record<string, unknown>>).map(a => ({
        id: String(a.id ?? ''),
        slot: String(a.slot ?? 'general'),
        filename: String(a.filename ?? ''),
        storage_path: String(a.storage_path ?? ''),
        public_url: String(a.public_url ?? ''),
        content_type: a.content_type == null ? null : String(a.content_type),
        size_bytes: a.size_bytes == null ? null : Number(a.size_bytes),
        created_at: String(a.created_at ?? ''),
        updated_at: String(a.updated_at ?? ''),
      })),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export interface UploadedMedia {
  id: string
  slot: string
  filename: string
  public_url: string
  content_type: string | null
  size_bytes: number | null
}

export async function uploadMedia(
  file: File,
  slot: string
): Promise<{ data: UploadedMedia | null; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { data: null, error: 'not-configured' }
  try {
    const ext = file.name.split('.').pop() || 'bin'
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const path = `${slot}/${Date.now()}-${safeName || `file.${ext}`}`
    const { error: upErr } = await sb.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false })
    if (upErr) return { data: null, error: upErr.message }
    const { data: pub } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path)
    const publicUrl = pub.publicUrl
    const { data: row, error: insErr } = await sb
      .from(MEDIA_TABLE)
      .insert({
        slot,
        filename: file.name,
        storage_path: path,
        public_url: publicUrl,
        content_type: file.type || null,
        size_bytes: file.size,
      })
      .select('id,slot,filename,public_url,content_type,size_bytes')
      .single()
    if (insErr || !row) {
      await sb.storage.from(MEDIA_BUCKET).remove([path])
      return { data: null, error: insErr?.message || 'insert-failed' }
    }
    const r = row as Record<string, unknown>
    return {
      data: {
        id: String(r.id ?? ''),
        slot: String(r.slot ?? slot),
        filename: String(r.filename ?? file.name),
        public_url: String(r.public_url ?? publicUrl),
        content_type: r.content_type == null ? null : String(r.content_type),
        size_bytes: r.size_bytes == null ? null : Number(r.size_bytes),
      },
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function deleteMedia(id: string, storagePath: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error: delErr } = await sb.from(MEDIA_TABLE).delete().eq('id', id)
    if (delErr) return false
    if (storagePath) await sb.storage.from(MEDIA_BUCKET).remove([storagePath])
    return true
  } catch {
    return false
  }
}

export async function updateMediaSlot(id: string, slot: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb
      .from(MEDIA_TABLE)
      .update({ slot, updated_at: new Date().toISOString() })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

const ADMIN_USERS_TABLE = 'admin_users'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  created_at?: string
}

export async function fetchAdminUsers(): Promise<{ data: AdminUser[]; fromDb: boolean }> {
  const sb = getSupabase()
  if (!sb) return { data: [], fromDb: false }
  try {
    const { data, error } = await sb
      .from(ADMIN_USERS_TABLE)
      .select('*')
      .order('created_at', { ascending: true })
    if (error || !data) return { data: [], fromDb: false }
    return {
      data: (data as Array<Record<string, unknown>>).map(u => ({
        id: String(u.id ?? ''),
        email: String(u.email ?? ''),
        name: String(u.name ?? ''),
        role: String(u.role ?? 'guest'),
        created_at: u.created_at ? String(u.created_at) : undefined,
      })),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export async function upsertAdminUser(
  user: { id?: string; email: string; name: string; role: string }
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    if (user.id) {
      const { error } = await sb
        .from(ADMIN_USERS_TABLE)
        .update({ email: user.email, name: user.name, role: user.role })
        .eq('id', user.id)
      return { ok: !error, error: error?.message }
    }
    const { error } = await sb.from(ADMIN_USERS_TABLE).insert({
      email: user.email,
      name: user.name,
      role: user.role,
    })
    return { ok: !error, error: error?.message }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function deleteAdminUser(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    const { error } = await sb.from(ADMIN_USERS_TABLE).delete().eq('id', id)
    return { ok: !error, error: error?.message }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export const supabaseReady = isSupabaseConfigured
