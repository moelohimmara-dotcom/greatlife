/**
 * Modèle — snapshot de page (PUR)
 * ===============================
 * Le snapshot est ce qui est archivé dans `page_versions` à la publication, et
 * ce qui sera relu à la restauration.
 *
 * Il vit dans `model/` et non dans `repository/` parce qu'il doit rester
 * vérifiable sans base : ces fonctions ne dépendent ni de Supabase, ni de
 * Vite, ni de React. C'est la même frontière que `@/cms/renderer` (CM-7 / AR-10)
 * et c'est ce qui permet à `verify:lot3` de prouver la fidélité d'un
 * aller-retour sans écrire en base (docs/10 §9).
 */

import type { Bilingue } from '../i18n'
import type { Page, PageSeo, PageStatus } from '../page'
import type { PageLayout } from '../page-layout'
import { normaliserPageLayout } from '../page-layout'
import type { PageSection } from '../section'
import { EDITOR_META_KEY } from '../subblocks/types'

/** Version du format de snapshot. Un format inconnu est REFUSÉ (docs/10 §5). */
export const SNAPSHOT_FORMAT_VERSION = 1

export interface SnapshotPage {
  slug: string
  title: Bilingue
  sortOrder: number
  seo: PageSeo
  status: PageStatus
  publishedAt: string | null
  /** Absent des anciennes archives → relu comme colonne unique. */
  layout: PageLayout
}

export interface SnapshotSection {
  id: string
  type: string
  variant: string | null
  position: number
  visible: boolean
  anchor: string | null
  content: Record<string, unknown>
  settings: Record<string, unknown>
}

/**
 * Chrome du site figé à la publication (TDR §22, arbitrage propriétaire 2026-09-21).
 * Vit DANS l’instantané de page d’accueil : pas de colonne ni de clé site_content
 * supplémentaire. Absent des anciennes archives → le public utilise le gabarit,
 * jamais le JSON de travail.
 */
export interface SnapshotChromeLink {
  id: string
  label: Bilingue
  target: string
  visible: boolean
  isCta: boolean
}

export interface SnapshotChromeRestaurant {
  name: Bilingue
  slogan: Bilingue
  address: Bilingue
  hours: Bilingue
  phone: string
  emailContact: string
  emailReservation: string
  currency: string
  social: { facebook: string; instagram: string; whatsapp: string }
  /** Créneaux de retrait figés à la publication (J5). */
  pickupTimes: string[]
}

export interface SnapshotChrome {
  restaurant: SnapshotChromeRestaurant
  /** Présentation (en-tête / pied). `logoUrl` uniquement sous `header`. */
  chromePresentation: Record<string, unknown>
  typography: Record<string, unknown> | null
  headerLinks: SnapshotChromeLink[]
  footerLinks: SnapshotChromeLink[]
}

export interface PageSnapshot {
  formatVersion: number
  page: SnapshotPage
  sections: SnapshotSection[]
  /** Absent = archive d’avant le gel du chrome. */
  chrome?: SnapshotChrome
}

/**
 * Fige l'état d'une page et de ses sections. Fonction pure.
 *
 * `asPublished` porte l'état que la page **prend** à cette publication.
 *
 * Il est nécessaire parce que la version est archivée AVANT la bascule de
 * statut (on ne publie jamais sans archive) : sans lui, la version 1
 * enregistrerait `status: 'draft'` et `publishedAt: null` sur la première
 * publication. Et cette erreur serait **définitive** — l'historique est
 * immuable en base, `page_versions` n'a aucune policy UPDATE
 * (`supabase/migrations/023_cms_page_versions.sql`).
 */
export function buildSnapshot(
  page: Page,
  sections: readonly PageSection[],
  asPublished?: { status: PageStatus; publishedAt: string },
  chrome?: SnapshotChrome,
): PageSnapshot {
  const snapshot: PageSnapshot = {
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    page: {
      slug: page.slug,
      title: page.title,
      sortOrder: page.sortOrder,
      seo: page.seo,
      status: asPublished?.status ?? page.status,
      publishedAt: asPublished?.publishedAt ?? page.publishedAt,
      layout: normaliserPageLayout(page.layout),
    },
    sections: sections.map((section) => ({
      id: section.id,
      type: section.type,
      variant: section.variant,
      position: section.position,
      visible: section.visible,
      anchor: section.anchor,
      content: contenuPublie(asRecord(section.content)),
      settings: asRecord(section.settings),
    })),
  }
  if (chrome) snapshot.chrome = chrome
  return snapshot
}

/**
 * Fige le chrome à partir du JSON restaurant de TRAVAIL et des liens déjà
 * résolus. Fonction pure : pas de lecture réseau.
 */
export function freezeChrome(input: {
  restaurantRaw: Record<string, unknown> | null
  headerLinks: readonly SnapshotChromeLink[]
  footerLinks: readonly SnapshotChromeLink[]
}): SnapshotChrome {
  const raw = input.restaurantRaw ?? {}
  const social = asRecord(raw.social)
  const presentation = normaliserPresentationFigee(raw)
  const typo = raw.typography && typeof raw.typography === 'object' && !Array.isArray(raw.typography)
    ? asRecord(raw.typography)
    : null
  return {
    restaurant: {
      name: (raw.name ?? '') as Bilingue,
      slogan: (raw.slogan ?? '') as Bilingue,
      address: (raw.address ?? '') as Bilingue,
      hours: (raw.hours ?? '') as Bilingue,
      phone: str(raw.phone),
      emailContact: str(raw.emailContact),
      emailReservation: str(raw.emailReservation),
      currency: str(raw.currency) || 'FG',
      social: {
        facebook: str(social.facebook),
        instagram: str(social.instagram),
        whatsapp: str(social.whatsapp),
      },
      pickupTimes: asList(raw.pickupTimes)
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim())
        .filter(Boolean),
    },
    chromePresentation: presentation,
    typography: typo && Object.keys(typo).length > 0 ? typo : null,
    headerLinks: input.headerLinks.map(copierLien),
    footerLinks: input.footerLinks.map(copierLien),
  }
}

export type SnapshotRead =
  | { ok: true; snapshot: PageSnapshot }
  | { ok: false; error: string }

/**
 * Relit un snapshot stocké en base.
 *
 * Refuse explicitement un format inconnu plutôt que de l'appliquer à
 * l'aveugle : une version écrite par une génération future du site ne doit
 * jamais être restaurée par erreur (docs/10 §5). Les messages sont en langage
 * restaurateur — jamais de jargon technique (TDR §24, AGENTS.md §9).
 */
export function parseSnapshot(raw: unknown): SnapshotRead {
  const value = asRecord(raw)

  const formatVersion = Number(value.formatVersion)
  if (!Number.isFinite(formatVersion)) {
    return { ok: false, error: 'Cette version est illisible : elle ne contient pas de repère de format.' }
  }
  if (formatVersion !== SNAPSHOT_FORMAT_VERSION) {
    return {
      ok: false,
      error: "Cette version a été enregistrée par une autre génération du site. La restauration est impossible en l'état.",
    }
  }

  const page = asRecord(value.page)
  const sections = asList(value.sections).map((entry) => {
    const s = asRecord(entry)
    return {
      id: String(s.id ?? ''),
      type: String(s.type ?? ''),
      variant: typeof s.variant === 'string' ? s.variant : null,
      position: Number(s.position ?? 0),
      visible: s.visible !== false,
      anchor: typeof s.anchor === 'string' ? s.anchor : null,
      content: asRecord(s.content),
      settings: asRecord(s.settings),
    } satisfies SnapshotSection
  })

  if (!page.slug && !page.title) {
    return { ok: false, error: 'Cette version ne contient pas de page exploitable.' }
  }

  const snapshot: PageSnapshot = {
    formatVersion,
    page: {
      slug: typeof page.slug === 'string' ? page.slug : '',
      title: (page.title ?? '') as Bilingue,
      sortOrder: Number(page.sortOrder ?? 0),
      seo: (page.seo ?? {}) as PageSeo,
      status: (page.status ?? 'draft') as PageStatus,
      publishedAt: typeof page.publishedAt === 'string' ? page.publishedAt : null,
      layout: normaliserPageLayout(typeof page.layout === 'string' ? page.layout : undefined),
    },
    sections,
  }
  if (Object.prototype.hasOwnProperty.call(value, 'chrome')) {
    snapshot.chrome = lireChrome(value.chrome)
  }

  return {
    ok: true,
    snapshot,
  }
}

// ---------------------------------------------------------------- internes
// Copies locales et PRIVÉES des coercitions de `repository/client.ts` : ce
// module ne peut pas importer le client, qui tire `@/lib/supabase` et donc
// Vite. Deux fonctions de trois lignes, assumées ici pour garder la frontière
// de pureté (même arbitrage que `@/cms/renderer`).

/**
 * R8 — le public ignore les groupes et verrous. On ne les fige donc pas
 * dans l’instantané : le brouillon `page_sections.content` les garde.
 */
function contenuPublie(content: Record<string, unknown>): Record<string, unknown> {
  const out = { ...content }
  delete out[EDITOR_META_KEY]
  delete out.groups
  return out
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function copierLien(lien: SnapshotChromeLink): SnapshotChromeLink {
  return {
    id: lien.id,
    label: lien.label,
    target: lien.target,
    visible: lien.visible,
    isCta: lien.isCta,
  }
}

function lireLiens(raw: unknown): SnapshotChromeLink[] {
  return asList(raw).map((entry) => {
    const o = asRecord(entry)
    return {
      id: str(o.id) || str(o.target),
      label: (o.label ?? '') as Bilingue,
      target: str(o.target),
      visible: o.visible !== false,
      isCta: o.isCta === true,
    }
  })
}

function lireChrome(raw: unknown): SnapshotChrome {
  const o = asRecord(raw)
  return freezeChrome({
    restaurantRaw: {
      ...asRecord(o.restaurant),
      chromePresentation: o.chromePresentation,
      typography: o.typography,
    },
    headerLinks: lireLiens(o.headerLinks),
    footerLinks: lireLiens(o.footerLinks),
  })
}

/** Une seule vérité pour le logo : `chromePresentation.header.logoUrl`. */
function normaliserPresentationFigee(raw: Record<string, unknown>): Record<string, unknown> {
  const racine = asRecord(raw.chromePresentation)
  const header = { ...asRecord(racine.header) }
  const logoRacine = str(raw.logoUrl).trim()
  const logoHeader = str(header.logoUrl).trim()
  if (!logoHeader && logoRacine) header.logoUrl = logoRacine
  else if (logoHeader) header.logoUrl = logoHeader
  const out: Record<string, unknown> = { ...racine }
  if (Object.keys(header).length > 0) out.header = header
  return out
}
