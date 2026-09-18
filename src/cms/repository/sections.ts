/**
 * Greatlife — CMS : accès aux sections
 * =====================================
 * TDR §30 : accès centralisé. Les sections sont toujours lues et écrites par ici.
 *
 * Une section ne contient AUCUNE copie de donnée métier : les sections `menu`
 * et `blog` référencent leur module (TDR §16).
 */

import type { PageSection, SectionContent, SectionSettings, SectionType } from '../model/section'
import type { Page } from '../model/page'
import { asObject, cmsErr, cmsOk, describeError, requireClient, type CmsResult } from './client'
import { fetchPublishedPage } from './pages'

const TABLE = 'page_sections'

interface SectionRow {
  id: string
  page_id: string
  type: string
  variant: string | null
  position: number
  visible: boolean
  anchor: string | null
  content: unknown
  settings: unknown
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id, page_id, type, variant, position, visible, anchor, content, settings, created_at, updated_at'

function mapSection(row: SectionRow): PageSection {
  return {
    id: row.id,
    pageId: row.page_id,
    type: row.type as SectionType,
    variant: row.variant,
    position: row.position ?? 0,
    visible: row.visible ?? true,
    anchor: row.anchor,
    content: asObject(row.content) as SectionContent,
    settings: asObject(row.settings) as SectionSettings,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Ancre nettoyée : sans `#`, sans espace (le renderer construit le lien). */
export function normalizeAnchor(anchor: string | null | undefined): string | null {
  if (!anchor) return null
  const clean = anchor.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase()
  return clean.length > 0 ? clean : null
}

/** Récupère les sections d'une page, ordonnées. */
export async function fetchSectionsForPage(
  pageId: string,
  options: { includeHidden?: boolean } = {},
): Promise<CmsResult<PageSection[]>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    let query = client.data.from(TABLE).select(COLUMNS).eq('page_id', pageId)
    if (!options.includeHidden) query = query.eq('visible', true)

    const { data, error } = await query.order('position', { ascending: true })
    if (error) return cmsErr(describeError(error))
    return cmsOk(((data ?? []) as SectionRow[]).map(mapSection))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/**
 * Charge une page **publiée** et ses sections visibles.
 * C'est le point d'entrée du renderer public. La RLS filtre déjà côté base ;
 * le filtre `visible` est appliqué ici pour que l'intention soit explicite.
 */
export async function fetchPublicPageWithSections(
  slug: string,
): Promise<CmsResult<{ page: Page; sections: PageSection[] } | null>> {
  const pageResult = await fetchPublishedPage(slug)
  if (!pageResult.ok) return pageResult
  if (!pageResult.data) return cmsOk(null)

  const sectionsResult = await fetchSectionsForPage(pageResult.data.id, { includeHidden: false })
  if (!sectionsResult.ok) return sectionsResult

  return cmsOk({ page: pageResult.data, sections: sectionsResult.data })
}

export interface SectionInput {
  pageId: string
  type: SectionType
  variant?: string | null
  position?: number
  visible?: boolean
  anchor?: string | null
  content?: SectionContent
  settings?: SectionSettings
}

/** Crée une section. */
export async function createSection(input: SectionInput): Promise<CmsResult<PageSection>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data
      .from(TABLE)
      .insert({
        page_id: input.pageId,
        type: input.type,
        variant: input.variant ?? null,
        position: input.position ?? 0,
        visible: input.visible ?? true,
        anchor: normalizeAnchor(input.anchor),
        content: input.content ?? {},
        settings: input.settings ?? {},
      })
      .select(COLUMNS)
      .single()

    if (error) return cmsErr(describeError(error))
    return cmsOk(mapSection(data as SectionRow))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Met à jour les champs fournis d'une section. */
export async function updateSection(
  id: string,
  patch: Partial<Omit<SectionInput, 'pageId'>>,
): Promise<CmsResult<PageSection>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const payload: Record<string, unknown> = {}
    if (patch.type !== undefined) payload.type = patch.type
    if (patch.variant !== undefined) payload.variant = patch.variant
    if (patch.position !== undefined) payload.position = patch.position
    if (patch.visible !== undefined) payload.visible = patch.visible
    if (patch.anchor !== undefined) payload.anchor = normalizeAnchor(patch.anchor)
    if (patch.content !== undefined) payload.content = patch.content
    if (patch.settings !== undefined) payload.settings = patch.settings

    const { data, error } = await client.data
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select(COLUMNS)
      .single()

    if (error) return cmsErr(describeError(error))
    return cmsOk(mapSection(data as SectionRow))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Supprime une section. */
export async function deleteSection(id: string): Promise<CmsResult<true>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { error } = await client.data.from(TABLE).delete().eq('id', id)
    if (error) return cmsErr(describeError(error))
    return cmsOk(true)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/**
 * Réordonne les sections d'une page.
 * Le glisser-déposer appartient au Lot 2 ; cette fonction en est le socle.
 * Elle écrit les positions une par une : à cette échelle (une dizaine de
 * sections), une transaction n'est pas nécessaire.
 */
export async function reorderSections(
  orderedIds: readonly string[],
): Promise<CmsResult<true>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await client.data.from(TABLE).update({ position: i }).eq('id', orderedIds[i])
      if (error) return cmsErr(describeError(error))
    }
    return cmsOk(true)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}
