/**
 * Repository — versions de page (TDR §23)
 * =======================================
 * La table `page_versions` a été créée VIDE au Lot 1, son usage réservé au
 * Lot 3 (décisions DB-1 / CM-3, `supabase/migrations/023_cms_page_versions.sql`).
 * Ce module est cet usage.
 *
 * L'historique est **immuable** en base (aucune policy UPDATE) : on ajoute une
 * entrée, on n'en modifie jamais une.
 *
 * La construction et la relecture du snapshot, elles, appartiennent au MODÈLE
 * (`../model/publishing/snapshot`) : elles sont pures, donc vérifiables sans
 * base. Ce fichier ne fait que les brancher sur Supabase.
 */

import { asArray, asObject, cmsErr, cmsOk, requireClient, type CmsResult } from './client'
import {
  buildSnapshot,
  parseSnapshot,
  SNAPSHOT_FORMAT_VERSION,
  type PageSnapshot,
} from '../model/publishing/snapshot'

export { buildSnapshot, parseSnapshot, SNAPSHOT_FORMAT_VERSION }
export type { PageSnapshot, SnapshotPage, SnapshotSection, SnapshotRead } from '../model/publishing/snapshot'

const TABLE = 'page_versions'
const SUMMARY_COLUMNS = 'id, page_id, version, note, created_at, created_by'

export interface PageVersionSummary {
  id: string
  pageId: string
  version: number
  note: string | null
  createdAt: string
  createdBy: string | null
}

export interface PageVersionDetail {
  summary: PageVersionSummary
  snapshot: PageSnapshot
}

// ---------------------------------------------------------------- lecture

/** Historique d'une page, la version la plus récente en tête. */
export async function fetchVersions(pageId: string): Promise<CmsResult<PageVersionSummary[]>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data
      .from(TABLE)
      .select(SUMMARY_COLUMNS)
      .eq('page_id', pageId)
      .order('version', { ascending: false })

    if (error) return cmsErr(readFailureMessage())
    return cmsOk(asArray(data).map((row) => mapSummary(asObject(row))))
  } catch {
    return cmsErr(readFailureMessage())
  }
}

/** Contenu d'une version, relu et validé. */
export async function fetchVersion(versionId: string): Promise<CmsResult<PageVersionDetail>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data
      .from(TABLE)
      .select(`${SUMMARY_COLUMNS}, snapshot`)
      .eq('id', versionId)
      .single()

    if (error) return cmsErr('Cette version est introuvable.')

    const row = asObject(data)
    const parsed = parseSnapshot(row.snapshot)
    if (!parsed.ok) return cmsErr(parsed.error)

    return cmsOk({ summary: mapSummary(row), snapshot: parsed.snapshot })
  } catch {
    return cmsErr(readFailureMessage())
  }
}

// ---------------------------------------------------------------- écriture

/**
 * Enregistre une nouvelle version.
 *
 * Numérotation `max(version) + 1` calculée ici, protégée par la contrainte
 * `UNIQUE (page_id, version)` : en cas de collision, **une seule** nouvelle
 * tentative, puis un échec explicite. La collision est discriminée sur l'erreur
 * brute et non sur un message générique (décision P-10 de docs/10) — sans
 * toucher au contrat partagé `CmsResult`.
 */
export async function createVersion(
  pageId: string,
  snapshot: PageSnapshot,
  note: string | null,
  createdBy: string | null,
): Promise<CmsResult<PageVersionSummary>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: maxRows, error: maxError } = await client.data
        .from(TABLE)
        .select('version')
        .eq('page_id', pageId)
        .order('version', { ascending: false })
        .limit(1)

      if (maxError) return cmsErr(writeFailureMessage())

      const rows = asArray(maxRows)
      const currentMax = rows.length > 0 ? Number(asObject(rows[0]).version) : 0
      const nextVersion = (Number.isFinite(currentMax) ? currentMax : 0) + 1

      const { data, error } = await client.data
        .from(TABLE)
        .insert({
          page_id: pageId,
          version: nextVersion,
          snapshot,
          note,
          created_by: createdBy,
        })
        .select(SUMMARY_COLUMNS)
        .single()

      if (!error) return cmsOk(mapSummary(asObject(data)))

      const collision = isVersionCollision(error)
      if (collision && attempt === 0) continue
      return cmsErr(collision ? collisionMessage() : writeFailureMessage())
    }

    return cmsErr(collisionMessage())
  } catch {
    return cmsErr(writeFailureMessage())
  }
}

// ---------------------------------------------------------------- internes

function mapSummary(row: Record<string, unknown>): PageVersionSummary {
  return {
    id: String(row.id ?? ''),
    pageId: String(row.page_id ?? ''),
    version: Number(row.version ?? 0),
    note: typeof row.note === 'string' ? row.note : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
    createdBy: typeof row.created_by === 'string' ? row.created_by : null,
  }
}

interface RawDbError {
  code?: string
  message?: string
  details?: string
}

/** Violation d'unicité sur `(page_id, version)`. */
function isVersionCollision(error: RawDbError | null | undefined): boolean {
  if (!error || error.code !== '23505') return false
  const haystack = `${error.message ?? ''} ${error.details ?? ''}`
  return haystack.includes('page_versions') || haystack.includes('version')
}

// Messages destinés au restaurateur : jamais de nom de table, de code SQL ni de
// jargon technique (TDR §24, AGENTS.md §9).
function collisionMessage(): string {
  return 'Une autre version vient d’être enregistrée au même moment. Réessayez.'
}

function readFailureMessage(): string {
  return "L'historique des versions n'a pas pu être chargé. Réessayez."
}

function writeFailureMessage(): string {
  return "Cette version n'a pas pu être enregistrée. Réessayez ; si le problème persiste, signalez-le."
}
