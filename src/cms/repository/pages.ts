/**
 * Greatlife — CMS : accès aux pages
 * ==================================
 * TDR §30 : les requêtes Supabase ne sont jamais dispersées dans les composants.
 * Toute lecture ou écriture de page passe par ce module.
 */

import type { Page, PageSeo, PageStatus } from '../model/page'
import { cmsErr, cmsOk, describeError, requireClient, asObject, type CmsResult } from './client'

const TABLE = 'pages'

/** Ligne brute telle que renvoyée par Postgres (snake_case). */
interface PageRow {
  id: string
  slug: string
  title_i18n: unknown
  status: string
  sort_order: number
  seo: unknown
  published_at: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

function mapPage(row: PageRow): Page {
  return {
    id: row.id,
    slug: row.slug ?? '',
    title: (row.title_i18n ?? {}) as Page['title'],
    status: (row.status as PageStatus) ?? 'draft',
    sortOrder: row.sort_order ?? 0,
    seo: asObject(row.seo) as PageSeo,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

const COLUMNS =
  'id, slug, title_i18n, status, sort_order, seo, published_at, created_at, updated_at, updated_by'

/** Normalise un slug : minuscules, sans barre oblique superflue. */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
}

/**
 * Récupère une page **publiée** par son slug — usage public.
 * TDR §22 : le public ne voit que le publié. Le filtrage est fait ici ET en
 * base (RLS) : la sécurité ne repose jamais sur le seul client (TDR §31).
 */
export async function fetchPublishedPage(slug: string): Promise<CmsResult<Page | null>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data
      .from(TABLE)
      .select(COLUMNS)
      // `eq` et non `ilike` : le slug est normalisé en minuscules à l'écriture,
      // et `ilike` interpréterait `%` ou `_` présents dans une adresse.
      .eq('slug', normalizeSlug(slug))
      .eq('status', 'published')
      .maybeSingle()

    if (error) return cmsErr(describeError(error))
    return cmsOk(data ? mapPage(data as PageRow) : null)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Récupère une page par son identifiant — usage administration. */
export async function fetchPageById(id: string): Promise<CmsResult<Page | null>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
    if (error) return cmsErr(describeError(error))
    return cmsOk(data ? mapPage(data as PageRow) : null)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Liste toutes les pages (brouillons et archives compris) — usage administration. */
export async function fetchAllPages(): Promise<CmsResult<Page[]>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data
      .from(TABLE)
      .select(COLUMNS)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return cmsErr(describeError(error))
    return cmsOk(((data ?? []) as PageRow[]).map(mapPage))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

export interface PageInput {
  slug: string
  title: Page['title']
  status?: PageStatus
  sortOrder?: number
  seo?: PageSeo
}

/** Crée une page. */
export async function createPage(input: PageInput): Promise<CmsResult<Page>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data
      .from(TABLE)
      .insert({
        slug: normalizeSlug(input.slug),
        title_i18n: input.title ?? {},
        status: input.status ?? 'draft',
        sort_order: input.sortOrder ?? 0,
        seo: input.seo ?? {},
        // Une page créée directement en « publié » doit porter sa date de publication.
        published_at: (input.status ?? 'draft') === 'published' ? new Date().toISOString() : null,
      })
      .select(COLUMNS)
      .single()

    if (error) return cmsErr(describeError(error))
    return cmsOk(mapPage(data as PageRow))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Met à jour les champs fournis d'une page. */
export async function updatePage(id: string, patch: Partial<PageInput>): Promise<CmsResult<Page>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const payload: Record<string, unknown> = {}
    if (patch.slug !== undefined) payload.slug = normalizeSlug(patch.slug)
    if (patch.title !== undefined) payload.title_i18n = patch.title
    if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder
    if (patch.seo !== undefined) payload.seo = patch.seo
    if (patch.status !== undefined) {
      payload.status = patch.status
      // `published_at` garde la date de la DERNIÈRE publication : la remettre à
      // null à chaque dépublication effacerait une information d'historique.
      if (patch.status === 'published') payload.published_at = new Date().toISOString()
    }

    const { data, error } = await client.data
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select(COLUMNS)
      .single()

    if (error) return cmsErr(describeError(error))
    return cmsOk(mapPage(data as PageRow))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/**
 * Publie ou dépublie une page.
 * TDR §21 : une page ne se supprime pas, elle s'archive.
 */
export async function setPageStatus(id: string, status: PageStatus): Promise<CmsResult<Page>> {
  return updatePage(id, { status })
}
