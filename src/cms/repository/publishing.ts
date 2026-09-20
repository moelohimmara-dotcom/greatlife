/**
 * Repository — publication (TDR §22, §23, §24)
 * ===========================================
 * Enchaîne les trois gestes du Lot 3 :
 *   1. rassembler tout ce que la publication engage (page, sections,
 *      navigation, carte, informations du restaurant) ;
 *   2. passer les 7 contrôles du TDR §24 ;
 *   3. si et seulement si c'est concluant : archiver une version, puis publier.
 *
 * Ordre volontaire (décision P-5 / docs/10 §6) : la version est écrite AVANT le
 * basculement du statut. On ne publie donc jamais sans archive. Si le
 * basculement échoue, il reste une version non publiée : c'est une entrée
 * d'archive inoffensive, et l'erreur est remontée telle quelle.
 */

import { fetchMenu } from '@/lib/repository'
import { DEFAULT_LOCALE, type Locale } from '../model/i18n'
import type { Page } from '../model/page'
import type { PageSection } from '../model/section'
import {
  buildReport,
  runPublicationChecks,
  snapshotEmptinessFinding,
  type PublicationInput,
  type PublicationReport,
  type PublicationSectionInput,
} from '../model/publishing'
import { cmsErr, cmsOk, type CmsResult } from './client'
import { fetchPageById, publishPageWithSnapshot } from './pages'
import { fetchSectionsForPage } from './sections'
import { SETTING_KEYS, fetchSetting, resolveRestaurant, toRestaurantSettings } from './settings'
import { buildSnapshot, createVersion, type PageVersionSummary } from './versions'

export interface PublishResult {
  /** `false` = les contrôles ont bloqué la publication ; `report` en donne le détail. */
  published: boolean
  report: PublicationReport
  version: PageVersionSummary | null
}

interface PublishContext {
  page: Page
  sections: PageSection[]
  input: PublicationInput
}

/**
 * Rassemble tout ce que la publication engage.
 * Les sections sont chargées **avec** les sections masquées : le snapshot doit
 * être fidèle pour qu'une restauration le soit aussi.
 *
 * NE CHARGE PLUS la navigation ni le catalogue des pages (décision du
 * 2026-09-19, M3) : ces deux lectures n'alimentaient que les contrôles n°2 et
 * n°6, qui ne sont plus exécutés parce que le site public ne rend pas
 * `navigation_items`. Les garder aurait maintenu deux appels réseau et deux
 * chemins d'échec pour une donnée sans effet sur la publication.
 */
async function loadPublishContext(pageId: string, locale: Locale): Promise<CmsResult<PublishContext>> {
  const pageResult = await fetchPageById(pageId)
  if (!pageResult.ok) return pageResult
  if (!pageResult.data) return cmsErr('Cette page est introuvable.')

  const sectionsResult = await fetchSectionsForPage(pageId, { includeHidden: true })
  if (!sectionsResult.ok) return sectionsResult

  const restaurantResult = await fetchSetting(SETTING_KEYS.restaurant)
  if (!restaurantResult.ok) return restaurantResult

  // `fetchMenu` ne renvoie pas d'erreur : il retombe sur des données de
  // démonstration. Valider un prix sur des données de démonstration serait un
  // faux feu vert — on refuse donc de conclure (TDR §6 : une seule source).
  const menu = await fetchMenu()
  if (!menu.fromDb) {
    return cmsErr("La carte n'a pas pu être vérifiée. Réessayez dans un instant.")
  }

  const restaurant = resolveRestaurant(toRestaurantSettings(restaurantResult.data), locale)

  const sections: PublicationSectionInput[] = sectionsResult.data.map((section) => ({
    type: section.type,
    anchor: section.anchor,
    visible: section.visible,
    content: (section.content ?? {}) as Record<string, unknown>,
  }))

  return cmsOk({
    page: pageResult.data,
    sections: sectionsResult.data,
    input: {
      page: { slug: pageResult.data.slug, title: pageResult.data.title },
      sections,
      menu: menu.data.map((item) => ({ name: item.name, price: item.price })),
      restaurant: {
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        hours: restaurant.hours,
      },
      locale,
    },
  })
}

/** Le rapport seul — ce qu'affiche la liste de contrôle avant toute publication. */
export async function checkPublication(
  pageId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<CmsResult<PublicationReport>> {
  const context = await loadPublishContext(pageId, locale)
  if (!context.ok) return context
  return cmsOk(runPublicationChecks(context.data.input))
}

/**
 * Publie une page : contrôle, puis version, puis statut.
 * Ne publie rien si un contrôle de niveau `error` subsiste.
 */
export async function publishPage(
  pageId: string,
  createdBy: string | null,
  locale: Locale = DEFAULT_LOCALE,
): Promise<CmsResult<PublishResult>> {
  const context = await loadPublishContext(pageId, locale)
  if (!context.ok) return context

  const report = runPublicationChecks(context.data.input)

  /*
    PRÉCONDITION, distincte des 7 contrôles du TDR §24 : un instantané VIDE ne
    peut pas être publié. Sans cela, le public retomberait sur le rendu
    historique — l'ANCIEN site — pendant que l'éditeur afficherait « En ligne »,
    sans aucune erreur. Le constat est ajouté au rapport pour que le panneau de
    publication explique POURQUOI c'est refusé, au lieu d'un refus muet.
  */
  const videFinding = snapshotEmptinessFinding(context.data.sections)
  const rapportFinal = videFinding
    ? buildReport([...report.blockers, ...report.warnings, videFinding])
    : report

  if (!rapportFinal.publishable) {
    return cmsOk({ published: false, report: rapportFinal, version: null })
  }

  // La version est construite avec l'état que la page PREND à cette
  // publication, et non avec celui qu'elle avait en arrivant : le snapshot est
  // archivé avant la bascule de statut, mais il doit décrire l'état publié.
  const publishedAt = new Date().toISOString()
  const snapshot = buildSnapshot(context.data.page, context.data.sections, {
    status: 'published',
    publishedAt,
  })

  const versionResult = await createVersion(pageId, snapshot, 'Publication', createdBy)
  if (!versionResult.ok) return versionResult

  /*
    Statut ET instantané dans la MÊME écriture.

    Deux appels successifs ouvriraient une fenêtre pendant laquelle la page est
    publiée avec un instantané `NULL` : le public bascule sur le rendu CMS et
    n'affiche rien. Un seul UPDATE ferme cette fenêtre.

    L'instantané est ce que le public lira (TDR §22) : `page_sections` redevient
    une table de TRAVAIL, modifiable sans que le brouillon ne fuite.
  */
  const statusResult = await publishPageWithSnapshot(pageId, snapshot)
  if (!statusResult.ok) return statusResult

  return cmsOk({ published: true, report, version: versionResult.data })
}
