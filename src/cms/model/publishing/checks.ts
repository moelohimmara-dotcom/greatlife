/**
 * Contrôle avant publication — les 7 vérifications du TDR §24
 * ==========================================================
 * La validation de SECTION n'est pas réécrite : elle est déléguée à
 * `validateSectionContent` (src/cms/model/sections/validation.ts), qui produit
 * déjà des messages en langage restaurateur. Ce module ajoute ce qu'elle ne
 * peut pas voir seule : les images, la carte, les prix et les informations du
 * restaurant.
 *
 * ⚠️ DEUX DES SEPT CONTRÔLES NE SONT PLUS EXÉCUTÉS (décision du 2026-09-19, M3)
 * Les contrôles n°2 (« Navigation valide ») et n°6 (« Aucun lien cassé »)
 * portaient sur `navigation_items`. Or le site public ne rend PAS cette table :
 * `PublicNav` et `Footer` portent des listes écrites en dur, et aucun écran
 * d'administration ne touche la navigation. Les exécuter revenait à valider
 * 13 entrées que personne ne voit — au prix d'un refus de publication sur une
 * donnée sans effet visible.
 *
 * Ils ne sont ni supprimés (le TDR §24 en demande 7) ni affichés « conformes »
 * (ce serait un vert mensonger) : ils sont déclarés NON VÉRIFIÉS, et le motif
 * est visible dans le panneau de publication. Voir
 * `PUBLICATION_CHECKS_NOT_VERIFIED` dans `./types`.
 *
 * Le jour où la navigation sera branchée (instantané publié + écran
 * d'administration), les deux contrôles se réactivent en repassant l'entrée
 * `navigation` à `PublicationInput`.
 */

import { DEFAULT_LOCALE, resolveI18n, type Bilingue, type Locale } from '../i18n'
import { getSectionDefinition, isKnownSectionType } from '../sections/schemas'
import { expectedFields, validateSectionContent } from '../sections/validation'
import { buildReport, type PublicationFinding, type PublicationInput, type PublicationReport } from './types'

/**
 * PRÉCONDITION DE PUBLICATION — un instantané VIDE ne peut pas être publié.
 *
 * ⚠️ CE N'EST PAS UN DES 7 CONTRÔLES DU TDR §24
 * Les 7 contrôles portent sur le CONTENU (pages, navigation, images, carte,
 * prix, liens, informations essentielles). « La page n'a rien à montrer » est
 * d'une autre nature : c'est une condition d'existence de la publication. On la
 * garde donc séparée, pour que `runPublicationChecks` conserve exactement le
 * contrat que le TDR lui donne.
 *
 * LE DÉFAUT QU'ELLE FERME (constat I2 de la revue indépendante)
 * `PublicSite` n'emprunte le chemin CMS que si `resolvedSections.length > 0`.
 * Avec un instantané vide, le visiteur retombe sur le RENDU HISTORIQUE — donc
 * sur l'ancien site — pendant que l'éditeur affiche « ● En ligne ».
 * Concrètement : le restaurateur masque ses sections une à une pour préparer une
 * refonte, publie, lit « En ligne », et rien ne change à l'écran. Aucune erreur,
 * aucun signal. C'est le repli silencieux que l'en-tête de la migration 030
 * désigne comme le mode de panne le plus coûteux du lot.
 *
 * Renvoie `null` si la publication est possible.
 */
export function snapshotEmptinessFinding(
  sections: readonly { visible: boolean }[],
): PublicationFinding | null {
  if (sections.some((s) => s.visible)) return null
  return {
    check: 'pages',
    level: 'error',
    message:
      "Aucune section n'est visible : le site public continuerait d'afficher l'ancien " +
      'contenu. Rendez au moins une section visible avant de publier.',
    where: 'Structure',
  }
}


export function runPublicationChecks(input: PublicationInput): PublicationReport {
  const locale: Locale = input.locale ?? DEFAULT_LOCALE
  const findings: PublicationFinding[] = []

  const visibleSections = input.sections.filter((s) => s.visible)

  // ---- 1. Pages valides ---------------------------------------------------
  if (!safeResolve(input.page.title, locale).trim()) {
    findings.push({
      check: 'pages',
      level: 'error',
      message: "Le titre principal de la page n'est pas renseigné.",
      where: 'Page',
    })
  }

  for (const section of visibleSections) {
    const label = sectionLabel(section.type, section.content, locale)

    if (!isKnownSectionType(section.type)) {
      findings.push({
        check: 'pages',
        level: 'error',
        message: `La section « ${label} » n'existe plus dans le site. Remplacez-la ou supprimez-la avant de publier.`,
        where: `Section « ${label} »`,
      })
      continue
    }

    for (const issue of validateSectionContent(section.type, section.content)) {
      findings.push({
        check: 'pages',
        level: issue.level,
        message: issue.message,
        where: `Section « ${label} »`,
      })
    }
  }

  /*
    ---- 2. Navigation valide ------------------------------------------------
    NON EXÉCUTÉ — voir l'en-tête de ce module et `PUBLICATION_CHECKS_NOT_VERIFIED`
    (`./types`). Le contrôle portait sur `navigation_items`, que le site public
    ne rend pas : il validait une fiction, et pouvait refuser une publication à
    cause d'un lien que personne ne voyait.
  */

  // ---- 3. Images valides --------------------------------------------------
  for (const section of visibleSections) {
    if (!isKnownSectionType(section.type)) continue
    const label = sectionLabel(section.type, section.content, locale)
    const content = section.content ?? {}

    for (const field of expectedFields(section.type)) {
      if (field.type !== 'image') continue
      if (isFilled(content[field.name])) continue
      findings.push({
        check: 'images',
        level: 'warning',
        message: `La section « ${label} » n'a pas d'image renseignée.`,
        where: `Section « ${label} »`,
      })
    }
  }

  // ---- 4. Menu valide -----------------------------------------------------
  if (input.menu.length === 0) {
    findings.push({
      check: 'menu',
      level: 'error',
      message: 'La carte ne contient aucun plat.',
      where: 'Carte',
    })
  }

  // ---- 5. Prix renseignés -------------------------------------------------
  for (const item of input.menu) {
    const price = (item.price ?? '').trim()
    if (!price) {
      findings.push({
        check: 'prices',
        level: 'error',
        message: `Le plat ${item.name} n'a pas de prix.`,
        where: `Plat « ${item.name} »`,
      })
      continue
    }
    if (!/\d/.test(price)) {
      findings.push({
        check: 'prices',
        level: 'warning',
        message: `Le prix du plat ${item.name} ne contient aucun montant (valeur affichée : « ${price} »).`,
        where: `Plat « ${item.name} »`,
      })
    }
  }

  /*
    ---- 6. Aucun lien cassé ------------------------------------------------
    NON EXÉCUTÉ — ce contrôle ne savait vérifier que les ancres de
    `navigation_items`, que le site public ne rend pas. Les ancres réellement
    servies sont désormais vérifiées au moment de DÉVELOPPER, par
    `npm run verify:anchors`, qui confronte les liens écrits dans le site
    (menu, pied de page) ET les cibles ÉDITABLES des boutons de la page
    d'accueil aux ancres de `pages.published_snapshot`. Ce n'est pas un filet de
    publication, et cette limite est assumée et documentée.
  */

  // ---- 7. Informations essentielles présentes ----------------------------
  const essentials: [boolean, string][] = [
    [!input.restaurant.name.trim(), "Le nom du restaurant n'est pas renseigné."],
    [!input.restaurant.phone.trim(), "Le numéro de téléphone du restaurant n'est pas renseigné."],
    [!input.restaurant.address.trim(), "L'adresse du restaurant n'est pas renseignée."],
    [!input.restaurant.hours.trim(), 'Les horaires du restaurant ne sont pas renseignés.'],
  ]
  for (const [missing, message] of essentials) {
    if (missing) {
      findings.push({ check: 'essentials', level: 'warning', message, where: 'Informations du restaurant' })
    }
  }

  return buildReport(findings)
}

// ---------------------------------------------------------------- utilitaires

/** Libellé humain d'une section : son titre s'il existe, sinon son nom d'usage. */
export function sectionLabel(
  type: string,
  content: Record<string, unknown> | null,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const title = safeResolve(content?.title as Bilingue | undefined, locale).trim()
  if (title) return title
  return getSectionDefinition(type)?.label ?? type
}

/** `resolveI18n` renvoie une chaîne ; on protège contre une valeur non textuelle. */
function safeResolve(value: Bilingue | undefined | null, locale: Locale): string {
  if (value === undefined || value === null) return ''
  const resolved = resolveI18n(value, locale)
  return typeof resolved === 'string' ? resolved : ''
}

function isFilled(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() !== ''
  if (value === null || value === undefined) return false
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return true
}
