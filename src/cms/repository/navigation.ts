/**
 * Greatlife — CMS : accès à la navigation
 * ========================================
 * TDR §19 : header et footer sont GLOBAUX — une seule définition, appliquée à
 * toutes les pages. TDR §20 : sous-menus et bouton principal.
 */

import type { Bilingue } from '../model/i18n'
import { asObject, cmsErr, cmsOk, describeError, requireClient, type CmsResult } from './client'

const NAV_TABLE = 'navigation'
const ITEM_TABLE = 'navigation_items'

export type NavigationKey = 'header' | 'footer'

export type NavTargetType = 'page' | 'anchor' | 'url'

export interface NavigationItem {
  id: string
  navigationId: string
  parentId: string | null
  label: Bilingue
  targetType: NavTargetType
  targetPageId: string | null
  /** Ancre (sans `#`) ou URL externe, selon `targetType`. */
  targetValue: string | null
  position: number
  visible: boolean
  isCta: boolean
}

interface ItemRow {
  id: string
  navigation_id: string
  parent_id: string | null
  label_i18n: unknown
  target_type: string
  target_page_id: string | null
  target_value: string | null
  position: number
  visible: boolean
  is_cta: boolean
}

const ITEM_COLUMNS =
  'id, navigation_id, parent_id, label_i18n, target_type, target_page_id, target_value, position, visible, is_cta'

function mapItem(row: ItemRow): NavigationItem {
  return {
    id: row.id,
    navigationId: row.navigation_id,
    parentId: row.parent_id,
    label: (row.label_i18n ?? {}) as Bilingue,
    targetType: (row.target_type as NavTargetType) ?? 'page',
    targetPageId: row.target_page_id,
    targetValue: row.target_value,
    position: row.position ?? 0,
    visible: row.visible ?? true,
    isCta: row.is_cta ?? false,
  }
}

export interface NavigationTree {
  key: NavigationKey
  items: NavigationItem[]
  /** Sous-items indexés par identifiant de parent (TDR §20 : sous-menus). */
  childrenOf: Record<string, NavigationItem[]>
}

/** Construit l'arbre à partir d'une liste plate. */
function buildTree(key: NavigationKey, rows: NavigationItem[]): NavigationTree {
  const roots = rows.filter((r) => r.parentId === null)
  const childrenOf: Record<string, NavigationItem[]> = {}
  for (const item of rows) {
    if (item.parentId) {
      const list = childrenOf[item.parentId] ?? []
      list.push(item)
      childrenOf[item.parentId] = list
    }
  }
  return { key, items: roots, childrenOf }
}

/**
 * Récupère une navigation complète.
 * La RLS filtre déjà les items non publiés côté public ; `includeHidden`
 * sert à l'administration, qui doit tout voir.
 */
export async function fetchNavigation(
  key: NavigationKey,
  options: { includeHidden?: boolean } = {},
): Promise<CmsResult<NavigationTree | null>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data: nav, error: navError } = await client.data
      .from(NAV_TABLE)
      .select('id, key')
      .eq('key', key)
      .maybeSingle()

    if (navError) return cmsErr(describeError(navError))
    if (!nav) return cmsOk(null)

    let query = client.data.from(ITEM_TABLE).select(ITEM_COLUMNS).eq('navigation_id', nav.id)
    if (!options.includeHidden) query = query.eq('visible', true)

    const { data, error } = await query.order('position', { ascending: true })
    if (error) return cmsErr(describeError(error))

    return cmsOk(buildTree(key, ((data ?? []) as ItemRow[]).map(mapItem)))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Récupère l'en-tête et le pied de page en une fois. */
export async function fetchSiteNavigation(options: { includeHidden?: boolean } = {}): Promise<
  CmsResult<{ header: NavigationTree | null; footer: NavigationTree | null }>
> {
  const [header, footer] = await Promise.all([
    fetchNavigation('header', options),
    fetchNavigation('footer', options),
  ])
  if (!header.ok) return header
  if (!footer.ok) return footer
  return cmsOk({ header: header.data, footer: footer.data })
}

export interface NavigationItemInput {
  navigationId: string
  parentId?: string | null
  label: Bilingue
  targetType: NavTargetType
  targetPageId?: string | null
  targetValue?: string | null
  position?: number
  visible?: boolean
  isCta?: boolean
}

/** Crée une entrée de navigation. */
export async function createNavigationItem(
  input: NavigationItemInput,
): Promise<CmsResult<NavigationItem>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data
      .from(ITEM_TABLE)
      .insert({
        navigation_id: input.navigationId,
        parent_id: input.parentId ?? null,
        label_i18n: input.label ?? {},
        target_type: input.targetType,
        target_page_id: input.targetPageId ?? null,
        target_value: input.targetValue ?? null,
        position: input.position ?? 0,
        visible: input.visible ?? true,
        is_cta: input.isCta ?? false,
      })
      .select(ITEM_COLUMNS)
      .single()

    if (error) return cmsErr(describeError(error))
    return cmsOk(mapItem(data as ItemRow))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Met à jour les champs fournis d'une entrée de navigation. */
export async function updateNavigationItem(
  id: string,
  patch: Partial<Omit<NavigationItemInput, 'navigationId'>>,
): Promise<CmsResult<NavigationItem>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const payload: Record<string, unknown> = {}
    if (patch.parentId !== undefined) payload.parent_id = patch.parentId
    if (patch.label !== undefined) payload.label_i18n = patch.label
    if (patch.targetType !== undefined) payload.target_type = patch.targetType
    if (patch.targetPageId !== undefined) payload.target_page_id = patch.targetPageId
    if (patch.targetValue !== undefined) payload.target_value = patch.targetValue
    if (patch.position !== undefined) payload.position = patch.position
    if (patch.visible !== undefined) payload.visible = patch.visible
    if (patch.isCta !== undefined) payload.is_cta = patch.isCta

    const { data, error } = await client.data
      .from(ITEM_TABLE)
      .update(payload)
      .eq('id', id)
      .select(ITEM_COLUMNS)
      .single()

    if (error) return cmsErr(describeError(error))
    return cmsOk(mapItem(data as ItemRow))
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Supprime une entrée de navigation (les sous-items suivent en cascade). */
export async function deleteNavigationItem(id: string): Promise<CmsResult<true>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { error } = await client.data.from(ITEM_TABLE).delete().eq('id', id)
    if (error) return cmsErr(describeError(error))
    return cmsOk(true)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Réordonne les entrées d'une navigation. */
export async function reorderNavigationItems(
  orderedIds: readonly string[],
): Promise<CmsResult<true>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await client.data.from(ITEM_TABLE).update({ position: i }).eq('id', orderedIds[i])
      if (error) return cmsErr(describeError(error))
    }
    return cmsOk(true)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Résout la cible d'une entrée en lien utilisable. */
export function resolveNavHref(item: NavigationItem): string {
  if (item.targetType === 'url') return item.targetValue ?? '#'
  if (item.targetType === 'anchor') return '#' + (item.targetValue ?? '')
  // Cible « page » : le slug sera résolu par le renderer via le catalogue de pages.
  return item.targetValue ?? '/'
}

/** Convertit un objet non typé en entrée de navigation sûre. */
export function asNavigationItemInput(row: unknown): Partial<NavigationItemInput> {
  const o = asObject(row)
  const out: Partial<NavigationItemInput> = {}
  if (typeof o.label === 'object') out.label = o.label as Bilingue
  if (typeof o.target_type === 'string') out.targetType = o.target_type as NavTargetType
  if (typeof o.target_value === 'string') out.targetValue = o.target_value
  return out
}
