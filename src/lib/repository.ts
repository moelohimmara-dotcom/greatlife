import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { MENU, type MenuItem } from '@/data/menu'
import type { SiteContent, ContactMessage, MessageReply } from '@/contexts/SiteContext'
import { fusionBilingue, clefsMiroirRestaurant, fusionnePatch } from '@/cms/model/contenu-patch'

const MENU_TABLE = 'menu_items'
const CONTENT_TABLE = 'site_content'
const MESSAGES_TABLE = 'messages'
const BLOG_TABLE = 'blog_posts'
const RESERVATIONS_TABLE = 'reservations'
const CONTENT_KEY = 'site_config'
/**
 * Clé de la ligne de réglages que le SITE PUBLIC lit pour les coordonnées.
 * Migration `024` ; `docs/04_CONTENT_MODEL.md`.
 */
const RESTAURANT_KEY = 'restaurant'

export interface SiteConfig {
  content: SiteContent
  themeId: string
  fontId: string
  visibility: unknown
  rbacOverrides?: unknown
}

export type SaveResult = { ok: boolean; error?: string }

/**
 * Résultat d'un enregistrement de plat. Sur succès, `id` porte l'identité
 * ATTRIBUÉE par la base : l'éditeur la range dans son état, sans quoi le plat
 * neuf resterait sans identité et la frappe suivante insérerait encore.
 */
export type MenuItemSaveResult = { ok: boolean; error?: string; id?: string }
function errMsg(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) return error.message
  const any = error as { message?: string; code?: string; details?: string }
  return any.message || any.code || 'Erreur inconnue'
}

/** Messages d'erreur exposés au client du site public — jamais de jargon RLS/SQL. */
function publicFormError(_error: unknown, fallback: string): string {
  return fallback
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
    id: row.id,
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

/**
 * Enregistre un plat : mise à jour si `item.id` est connu, insertion sinon.
 *
 * ⚠️ NE PAS revenir à `upsert(..., { onConflict: 'name' })`. `name` est le champ
 * que le restaurateur renomme : s'en servir comme clé faisait qu'un renommage
 * INSÉRAIT une nouvelle ligne (l'ancienne restait) au lieu de mettre à jour
 * l'existante — doublon dans la carte. La migration `028` a rendu ce défaut
 * silencieux en créant `UNIQUE (name)`.
 *
 * L'insertion renvoie l'identité ATTRIBUÉE, pour que l'éditeur cesse de croire
 * qu'un plat neuf n'existe pas (sans quoi la frappe suivante insérerait encore).
 */
export async function upsertMenuItem(item: MenuItem): Promise<MenuItemSaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    // `id` est retiré du corps : sur insertion il est attribué par la base.
    const { id, ...fields } = item
    const payload = {
      cat: fields.cat,
      name: fields.name,
      sig: fields.sig ?? false,
      price: fields.price,
      description: fields.desc,
      vertus: fields.vertus,
      badges: fields.badges,
    }

    if (id) {
      const { data, error } = await sb
        .from(MENU_TABLE)
        .update(payload)
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) return { ok: false, error: errMsg(error) }
      // Aucune ligne touchée = le plat a disparu en base (supprimé ailleurs,
      // révision concurrente). Le dire, plutôt que de faire croire à un succès.
      if (!data) {
        return { ok: false, error: "Ce produit n'existe plus dans la carte. Rechargez la page." }
      }
      return { ok: true, id }
    }

    const { data, error } = await sb.from(MENU_TABLE).insert(payload).select('id').maybeSingle()
    if (error) return { ok: false, error: errMsg(error) }
    if (!data) return { ok: false, error: "Le produit n'a pas pu être enregistré." }
    return { ok: true, id: String((data as { id: string }).id) }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

/**
 * Supprime un plat par son IDENTITÉ, jamais par son nom.
 * Le nom est modifiable : le prendre pour clé pouvait supprimer un autre plat
 * (ou aucun) après un renommage.
 */
export async function deleteMenuItem(id: string): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { data, error } = await sb.from(MENU_TABLE).delete().eq('id', id).select('id').maybeSingle()
    if (error) return { ok: false, error: errMsg(error) }
    if (!data) return { ok: false, error: "Ce produit n'existe plus dans la carte. Rechargez la page." }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
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

/**
 * Écrit les coordonnées dans la ligne que le SITE PUBLIC lit en premier.
 *
 * HISTORIQUE (défaut fermé le 2026-09-20) : l'écran « Réglages globaux »
 * n'écrivait que `site_config`, tandis que le site public lit
 * `site_content.restaurant` EN PREMIER (`Localisation.tsx`, `Footer.tsx`). La
 * valeur de remplacement `+224 000 00 00 00` l'emportait donc sur la saisie du
 * restaurateur : il ne pouvait pas changer son numéro.
 *
 * MIROIR CIBLE (plan P0) : seule une clé PRÉSENTE dans `champ` est réécrite.
 * Les autres garantissent leur valeur publiée : un écran qui n'affiche pas le
 * téléphone ne peut pas l'écraser, même s'il ne l'envoie pas.
 *
 * `address` et `hours` sont BILINGUES dans cette ligne : on fusionne dans la
 * forme existante au lieu de l'aplatir, sinon une éventuelle traduction
 * anglaise serait détruite — c'est exactement le défaut corrigé par la
 * migration `032` (revue du 2026-09-19, I6).
 */
async function ecrireCoordonneesCanoniques(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  champ: Record<string, unknown>,
): Promise<SaveResult> {
  const { data: existant, error: lectureErr } = await sb
    .from(CONTENT_TABLE)
    .select('value')
    .eq('key', RESTAURANT_KEY)
    .maybeSingle()
  if (lectureErr) return { ok: false, error: errMsg(lectureErr) }

  const actuel = (existant?.value ?? {}) as Record<string, unknown>
  // MIROIR CIBLE (plan P0) : seule une clé PRÉSENTE dans `champ` est réécrite.
  // Les autres garantissent leur valeur publiée : un écran qui n'affiche pas le
  // téléphone ne peut pas l'écraser, même s'il ne l'envoie pas.
  const suivant: Record<string, unknown> = { ...actuel }
  if ('phone' in champ) suivant.phone = String(champ.phone ?? '')
  if ('emailContact' in champ) suivant.emailContact = String(champ.emailContact ?? '')
  if ('emailReservation' in champ) suivant.emailReservation = String(champ.emailReservation ?? '')
  if ('address' in champ) suivant.address = fusionBilingue(actuel.address, String(champ.address ?? ''))
  if ('hours' in champ) suivant.hours = fusionBilingue(actuel.hours, String(champ.hours ?? ''))
  if ('restaurantName' in champ) suivant.name = fusionBilingue(actuel.name, String(champ.restaurantName ?? ''))

  const { error } = await sb.from(CONTENT_TABLE).upsert(
    {
      key: RESTAURANT_KEY,
      value: suivant,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  )
  if (error) return { ok: false, error: errMsg(error) }
  return { ok: true }
}

/*
  NOTE — l'ancien `saveContent(content)` (écriture TOTALE de `site_config`)
  a été RETIRÉ à ce lot : plus aucun appelant, et chaque écran de console passe
  désormais par les écritures PAR DOMAINE ci-dessous. Le seul remplacement
  complet restant est volontaire : l'import d'un fichier de configuration
  (« Réglages globaux » → Importer), qui passe par `saveSiteConfig`.
*/

/**
 * ÉCRITURE PAR DOMAINE — le correctif central du plan P0 (2026-09-20).
 *
 * DÉFAUT FERMÉ ICI : quatre écrans de contenu partageaient le même objet
 * `content` et persistaient L'OBJET ENTIER à chaque « Enregistrer ». Un champ
 * vide dans l'écran A écrasait donc la valeur publiée depuis l'écran B — c'est
 * la cause première de la duplication des coordonnées et du piège documenté
 * dans `docs/19 §7`. `saveSiteConfig` avait le même défaut masqué : les écrans
 * Apparence réécrivaient le `content` global au passage.
 *
 * SÉMANTIQUE
 *   - `patch` ne contient QUE les champs que l'écran actif affiche ;
 *   - fusion sur la valeur actuelle (`fusionnePatch`, module pur testé) :
 *     une clé absente du patch SURVIT INTACTE, y compris si l'état local de
 *     l'écran portait une valeur obsolète ou vide ;
 *   - canonique = les champs du contenu au NIVEAU RACINE de `value` — c'est la
 *     forme que `saveContent` a toujours écrite, et celle où la vraie
 *     coordonnée saisie par le restaurateur a atterri. Le lecteur
 *     (`SiteContext`) lit le plat en premier depuis ce lot ;
 *   - miroir `restaurant` UNIQUEMENT pour les clés de coordonnées présentes
 *     dans le patch (site public : `Localisation.tsx`, `Footer.tsx`, la
 *     fonction Edge).
 */
export async function updateSiteContentFields(
  patch: Partial<SiteContent>,
): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  if (Object.keys(patch).length === 0) return { ok: true }
  try {
    const { data: existing, error: readErr } = await sb
      .from(CONTENT_TABLE)
      .select('value')
      .eq('key', CONTENT_KEY)
      .maybeSingle()
    if (readErr) return { ok: false, error: errMsg(readErr) }
    const currentValue = (existing?.value ?? {}) as Record<string, unknown>

    const merged = fusionnePatch(currentValue, patch)
    const { error } = await sb.from(CONTENT_TABLE).upsert(
      { key: CONTENT_KEY, value: merged, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    if (error) return { ok: false, error: errMsg(error) }

    if (clefsMiroirRestaurant(patch as Record<string, unknown>).length > 0) {
      const miroir = await ecrireCoordonneesCanoniques(sb, patch as Record<string, unknown>)
      if (!miroir.ok) return miroir
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

/**
 * Écriture par domaine pour les ÉCRANS D'APPARENCE (thème, polices, visibilité).
 *
 * POURQUOI une seconde fonction : `saveSiteConfig` REMPLAÇAIT `site_config.value`
 * ENTIER — y compris le `content` global. Changer un thème réécrivait donc le
 * contenu de quatre autres écrans : le même défaut, par un autre chemin, et
 * invisible puisque les valeurs repartaient de l'état en mémoire.
 *
 * Avec la fusion, un thème ou une visibilité ne touche JAMAIS le `content`.
 */
export async function updateSiteConfigFields(
  patch: Record<string, unknown>,
): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  if (Object.keys(patch).length === 0) return { ok: true }
  try {
    const { data: existing, error: readErr } = await sb
      .from(CONTENT_TABLE)
      .select('value')
      .eq('key', CONTENT_KEY)
      .maybeSingle()
    if (readErr) return { ok: false, error: errMsg(readErr) }
    const currentValue = (existing?.value ?? {}) as Record<string, unknown>

    const merged = fusionnePatch(currentValue, patch)
    const { error } = await sb.from(CONTENT_TABLE).upsert(
      { key: CONTENT_KEY, value: merged, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

/**
 * Remplacement COMPLET de la configuration — réservé à l'IMPORT de
 * configuration (« Réglages globaux » → Importer, choix volontaire de
 * l'écrasement). Usage général : passez par les écritures par domaine
 * (`updateSiteContentFields` / `updateSiteConfigFields`).
 *
 * Écrit la forme canonique (contenu plat + réglages), donc la coordonnée
 * importée atteint aussi le miroir `restaurant`.
 */
export async function saveSiteConfig(config: SiteConfig): Promise<SaveResult> {
  const contenu = await updateSiteContentFields(config.content)
  if (!contenu.ok) return contenu
  return updateSiteConfigFields({
    themeId: config.themeId,
    fontId: config.fontId,
    visibility: config.visibility,
    ...(config.rbacOverrides !== undefined ? { rbacOverrides: config.rbacOverrides } : {}),
  })
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
      data: (data as Array<Record<string, unknown>>).map(m => {
        let replies: MessageReply[] = []
        const raw = m.replies
        if (Array.isArray(raw)) {
          replies = raw.map((r: Record<string, unknown>) => ({
            date: String(r.date ?? ''),
            author: String(r.author ?? ''),
            content: String(r.content ?? ''),
          }))
        }
        return {
          id: String(m.id ?? ''),
          nom: String(m.nom ?? ''),
          email: String(m.email ?? ''),
          sujet: String(m.sujet ?? 'contact'),
          message: String(m.message ?? ''),
          date: String(m.date ?? new Date().toISOString()),
          handled: Boolean(m.handled ?? false),
          replies,
        }
      }),
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
): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { error } = await sb
      .from(MESSAGES_TABLE)
      .update({ handled })
      .eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

export async function appendReply(id: string, reply: MessageReply): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { data, error: selErr } = await sb.from(MESSAGES_TABLE).select('replies').eq('id', id).maybeSingle()
    if (selErr) return { ok: false, error: errMsg(selErr) }
    const existing: MessageReply[] = Array.isArray((data as Record<string, unknown> | null)?.replies) ? ((data as Record<string, unknown>).replies as MessageReply[]) : []
    const next = [...existing, reply]
    const { error } = await sb.from(MESSAGES_TABLE).update({ replies: next }).eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

export async function deleteMessage(id: string): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { error } = await sb.from(MESSAGES_TABLE).delete().eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
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
  slug?: string
  cover_url?: string
  meta_description?: string
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
        slug: String(p.slug ?? ''),
        cover_url: String(p.cover_url ?? ''),
        meta_description: String(p.meta_description ?? ''),
      })),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export async function upsertBlogPost(post: BlogPost): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const payload = {
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      published: post.published,
      slug: post.slug ?? '',
      cover_url: post.cover_url ?? '',
      meta_description: post.meta_description ?? '',
    }
    if (post.id) {
      const { error } = await sb.from(BLOG_TABLE).update(payload).eq('id', post.id)
      if (error) return { ok: false, error: errMsg(error) }
      return { ok: true }
    }
    const { error } = await sb.from(BLOG_TABLE).insert(payload)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

export async function deleteBlogPost(id: string): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { error } = await sb.from(BLOG_TABLE).delete().eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
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

export async function updateReservationStatus(id: string, status: string): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { error } = await sb.from(RESERVATIONS_TABLE).update({ status }).eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

export async function deleteReservation(id: string): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { error } = await sb.from(RESERVATIONS_TABLE).delete().eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

const ORDERS_TABLE = 'orders'

export interface OrderItem {
  name: string
  price: string
  qty: number
}

export interface Order {
  id?: string
  ref: string
  nom: string
  email: string
  phone: string
  items: OrderItem[]
  total: string
  pickup_time: string
  notes: string
  status: string
  created_at?: string
}

export async function insertOrder(
  o: Omit<Order, 'id' | 'status' | 'created_at'>
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Impossible d’envoyer la commande. Réessayez dans un instant.' }
  const fallback = 'Impossible d’envoyer la commande. Vérifiez vos informations et réessayez.'
  try {
    const { error } = await sb.from(ORDERS_TABLE).insert({
      ref: o.ref,
      nom: o.nom,
      email: o.email,
      phone: o.phone,
      items: o.items,
      total: o.total,
      pickup_time: o.pickup_time,
      notes: o.notes,
      status: 'pending',
    })
    if (error) return { ok: false, error: publicFormError(error, fallback) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: publicFormError(err, fallback) }
  }
}

export async function fetchOrders(): Promise<{ data: Order[]; fromDb: boolean }> {
  const sb = getSupabase()
  if (!sb) return { data: [], fromDb: false }
  try {
    const { data, error } = await sb
      .from(ORDERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error || !data) return { data: [], fromDb: false }
    return {
      data: (data as Array<Record<string, unknown>>).map(o => {
        const rawItems = o.items
        let items: OrderItem[] = []
        if (Array.isArray(rawItems)) items = rawItems as OrderItem[]
        return {
          id: String(o.id ?? ''),
          ref: String(o.ref ?? ''),
          nom: String(o.nom ?? ''),
          email: String(o.email ?? ''),
          phone: String(o.phone ?? ''),
          items,
          total: String(o.total ?? '0'),
          pickup_time: String(o.pickup_time ?? ''),
          notes: String(o.notes ?? ''),
          status: String(o.status ?? 'pending'),
          created_at: String(o.created_at ?? ''),
        }
      }),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export async function updateOrderStatus(id: string, status: string): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { error } = await sb.from(ORDERS_TABLE).update({ status }).eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

export async function deleteOrder(id: string): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { error } = await sb.from(ORDERS_TABLE).delete().eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
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
  alt_text: string | null
  caption: string | null
  created_at: string
  updated_at: string
}

function mapMediaAsset(a: Record<string, unknown>): MediaAsset {
  return {
    id: String(a.id ?? ''),
    slot: String(a.slot ?? 'general'),
    filename: String(a.filename ?? ''),
    storage_path: String(a.storage_path ?? ''),
    public_url: String(a.public_url ?? ''),
    content_type: a.content_type == null ? null : String(a.content_type),
    size_bytes: a.size_bytes == null ? null : Number(a.size_bytes),
    alt_text: a.alt_text == null || a.alt_text === '' ? null : String(a.alt_text),
    caption: a.caption == null || a.caption === '' ? null : String(a.caption),
    created_at: String(a.created_at ?? ''),
    updated_at: String(a.updated_at ?? ''),
  }
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
      data: (data as Array<Record<string, unknown>>).map(mapMediaAsset),
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

export async function deleteMedia(id: string, storagePath?: string): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  try {
    let path = storagePath
    if (!path) {
      const { data: row, error: readErr } = await sb
        .from(MEDIA_TABLE)
        .select('storage_path')
        .eq('id', id)
        .maybeSingle()
      if (readErr) return { ok: false, error: errMsg(readErr) }
      path = row ? String((row as Record<string, unknown>).storage_path ?? '') : ''
    }
    const { error: delErr } = await sb.from(MEDIA_TABLE).delete().eq('id', id)
    if (delErr) return { ok: false, error: errMsg(delErr) }
    if (path) await sb.storage.from(MEDIA_BUCKET).remove([path])
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

export async function updateMediaSlot(id: string, slot: string): Promise<SaveResult> {
  return updateMediaAsset(id, { slot })
}

export type MediaAssetPatch = {
  slot?: string
  alt_text?: string | null
  caption?: string | null
}

/** Met à jour emplacement et/ou description (texte alternatif, légende). */
export async function updateMediaAsset(id: string, patch: MediaAssetPatch): Promise<SaveResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase non configuré' }
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.slot !== undefined) body.slot = patch.slot
  if (patch.alt_text !== undefined) {
    const v = patch.alt_text == null ? null : String(patch.alt_text).trim()
    body.alt_text = v === '' ? null : v
  }
  if (patch.caption !== undefined) {
    const v = patch.caption == null ? null : String(patch.caption).trim()
    body.caption = v === '' ? null : v
  }
  if (Object.keys(body).length <= 1) return { ok: true }
  try {
    const { error } = await sb
      .from(MEDIA_TABLE)
      .update(body)
      .eq('id', id)
    if (error) return { ok: false, error: errMsg(error) }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

const ADMIN_USERS_TABLE = 'admin_users'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  active?: boolean
  invited_at?: string | null
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
        active: u.active === undefined ? true : Boolean(u.active),
        invited_at: u.invited_at ? String(u.invited_at) : null,
        created_at: u.created_at ? String(u.created_at) : undefined,
      })),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export async function updateAdminUserStatus(
  id: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    const { error } = await sb
      .from(ADMIN_USERS_TABLE)
      .update({ active })
      .eq('id', id)
    if (error && /column.*active|schema cache/i.test(error.message)) {
      return { ok: false, error: 'Migration manquante : exécutez la migration 018_admin_users_active.sql dans Supabase.' }
    }
    return { ok: !error, error: error?.message }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
  }
}

export async function setUserInvitedAt(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'not-configured' }
  try {
    const { error } = await sb
      .from(ADMIN_USERS_TABLE)
      .update({ invited_at: new Date().toISOString() })
      .eq('email', email)
    if (error && /column.*invited_at|schema cache/i.test(error.message)) {
      return { ok: false, error: 'Migration manquante : exécutez la migration 018_admin_users_active.sql dans Supabase.' }
    }
    return { ok: !error, error: error?.message }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network' }
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
    if (error && /duplicate key|unique constraint/i.test(error.message)) {
      return { ok: false, error: 'Un utilisateur avec cet email existe déjà.' }
    }
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

export interface AuditEntry {
  id?: string
  created_at?: string
  actor: string
  action: string
  target: string
  detail: string
}

const AUDIT_TABLE = 'audit_log'

export async function fetchAuditLog(): Promise<{ data: AuditEntry[]; fromDb: boolean }> {
  const sb = getSupabase()
  if (!sb) return { data: [], fromDb: false }
  try {
    const { data, error } = await sb
      .from(AUDIT_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error || !data) return { data: [], fromDb: false }
    return {
      data: (data as Array<Record<string, unknown>>).map(a => ({
        id: String(a.id ?? ''),
        created_at: String(a.created_at ?? ''),
        actor: String(a.actor ?? ''),
        action: String(a.action ?? ''),
        target: String(a.target ?? ''),
        detail: String(a.detail ?? ''),
      })),
      fromDb: true,
    }
  } catch {
    return { data: [], fromDb: false }
  }
}

export async function logAudit(entry: Omit<AuditEntry, 'id' | 'created_at'>): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  try {
    await sb.from(AUDIT_TABLE).insert({
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      detail: entry.detail,
    })
  } catch {
    /* best-effort: silent fail */
  }
}
