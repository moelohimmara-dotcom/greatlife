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
import { fetchPublishedPageSnapshot } from './pages'
import { parseSnapshot } from '../model/publishing'

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
 * Charge une page **publiée** et ses sections — point d'entrée du renderer public.
 *
 * ⚠️ CE QUI A CHANGÉ (et pourquoi)
 * Cette fonction lisait `page_sections` en direct. Depuis que `page_sections` est
 * la table de TRAVAIL (l'éditeur y écrit en continu), ce chemin servait le
 * BROUILLON au visiteur dès que la page était publiée — exactement ce que le
 * TDR §22 interdit. C'était aussi ce qui obligeait à retirer la policy
 * `sections_public_read` : le seul rempart était la RLS, donc l'édition
 * devenait impossible sans fuiter.
 *
 * Elle lit désormais l'INSTANTANÉ figé à la publication
 * (`pages.published_snapshot`). `page_sections` redevient une table de travail,
 * modifiable librement : le public ne voit que ce qui a été publié.
 *
 * Un instantané absent ou illisible renvoie `null` — donc le rendu historique.
 * Jamais une page vide : mieux vaut l'ancien site qu'un écran blanc.
 */
export async function fetchPublicPageWithSections(
  slug: string,
): Promise<CmsResult<{ page: Page; sections: PageSection[] } | null>> {
  const result = await fetchPublishedPageSnapshot(slug)
  if (!result.ok) return result
  if (!result.data) return cmsOk(null)

  const parsed = parseSnapshot(result.data.snapshot)
  if (!parsed.ok) {
    // Une page publiée sans instantané exploitable ne doit pas produire un site
    // vide : on la traite comme non publiée et le rendu historique prend le
    // relais. Le cas est signalé, jamais silencieux.
    console.warn('[CMS] page publiée sans instantané exploitable :', parsed.error)
    return cmsOk(null)
  }

  const { page, sections } = parsed.snapshot
  return cmsOk({
    // Le titre et le SEO viennent de l'INSTANTANÉ, pas de la ligne courante :
    // ce sont des données que le restaurateur peut modifier dans l'éditeur, et
    // le public ne doit voir que la version publiée (TDR §22). L'identifiant et
    // les dates, eux, n'existent que sur la ligne.
    page: { ...result.data.page, slug: page.slug, title: page.title, seo: page.seo },
    sections: sections
      // Le public ne voit que les sections visibles (TDR §22).
      .filter((s) => s.visible)
      .map((s) => ({
        id: s.id,
        pageId: result.data!.page.id,
        type: s.type as PageSection['type'],
        variant: s.variant,
        position: s.position,
        visible: s.visible,
        anchor: s.anchor,
        content: s.content,
        settings: s.settings,
        createdAt: '',
        updatedAt: '',
      })),
  })
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

/**
 * Supprime une section.
 *
 * LE NOMBRE DE LIGNES EST CONTRÔLÉ (revue du 2026-09-19, constat I-2).
 * Sans `.select('id')`, PostgREST renvoie `ok` même quand AUCUNE ligne n'a été
 * touchée — une écriture filtrée par la RLS était donc indiscernable d'une
 * réussite. `save()` annonçait alors « tout a été écrit », et la publication,
 * qui relit la BASE, publiait un contenu différent de ce que l'écran montrait.
 *
 * Zéro ligne supprimée est une ERREUR, pas un cas normal : `save()` n'appelle
 * cette fonction que pour des sections qu'il vient de lire et que le
 * restaurateur a retirées. Si la base ne les supprime pas, quelque chose ne
 * s'est pas passé comme prévu — et le taire coûterait plus cher que le dire.
 */
export async function deleteSection(id: string): Promise<CmsResult<true>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data.from(TABLE).delete().eq('id', id).select('id')
    if (error) return cmsErr(describeError(error))
    if (!data || data.length === 0) {
      /*
        Zéro ligne touchée a DEUX causes possibles, et le client ne peut pas les
        distinguer : la section n'existe plus (quelqu'un d'autre l'a supprimée),
        ou la policy RLS a filtré l'écriture. Le message ne tranche donc pas —
        la version précédente disait « Rechargez la page », ce qui n'aiderait pas
        dans le second cas (revue du 2026-09-20, M-8).
      */
      return cmsErr(
        "Cette section n'a pas pu être supprimée : elle n'existe peut-être plus, ou vous n'avez plus les droits. Rechargez la page et réessayez.",
      )
    }
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
 *
 * LE NOMBRE DE LIGNES EST CONTRÔLÉ (revue du 2026-09-19, constat I-2) : pour la
 * même raison que dans `deleteSection`. Un réordonnancement partiellement écrit
 * laisserait deux sections à la même position — l'index d'unicité ne porte que
 * sur `anchor`, pas sur `position` (vérifié dans la migration `021`).
 */
export async function reorderSections(
  orderedIds: readonly string[],
): Promise<CmsResult<true>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { data, error } = await client.data
        .from(TABLE)
        .update({ position: i })
        .eq('id', orderedIds[i])
        .select('id')
      if (error) return cmsErr(describeError(error))
      if (!data || data.length === 0) {
        return cmsErr(
          "L'ordre des sections n'a pas pu être enregistré : une section a peut-être disparu, ou les droits ont changé. Rechargez la page et réessayez.",
        )
      }
    }
    return cmsOk(true)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}
