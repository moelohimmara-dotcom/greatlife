/**
 * Greatlife — CMS : point d'entrée COMPLET
 * =========================================
 * Le reste de l'application importe depuis `@/cms` et non depuis les fichiers
 * internes : cela garde la frontière entre le CMS et l'existant lisible
 * (décision AR-1), et permettra plus tard d'exposer les mêmes fonctions au
 * futur AI Copilot (TDR §35).
 *
 * ⚠️ Ce point d'entrée réexporte la couche `repository`, qui dépend de
 * `@/lib/supabase` — donc de Vite (`import.meta.env`). Il n'est PAS utilisable
 * dans un script Node.
 *
 * Pour générer du HTML statique (décision CM-7), utiliser `@/cms/renderer`,
 * qui n'expose que le modèle et le rendu, sans dépendance à Supabase ni au
 * navigateur.
 */

// ---- Modèle
export type { Bilingue, Locale } from './model/i18n'
export {
  LOCALES,
  DEFAULT_LOCALE,
  resolveI18n,
  resolveI18nList,
  resolveDeep,
  resolveContentObject,
  hasTranslation,
  isTranslation,
  localeFromPath,
  pathFor,
  fr,
} from './model/i18n'

export type { Page, PageSeo, PageStatus, PageWithSections } from './model/page'
export { PAGE_STATUSES, PAGE_STATUS_LABELS, pageStatusLabel } from './model/page'

export type { SectionType, SectionContent, SectionSettings, PageSection, SectionTypeDefinition } from './model/section'
export { LEGACY_ANCHORS } from './model/section'

export {
  SECTION_TYPES,
  getSectionDefinition,
  isKnownSectionType,
  defaultVariant,
} from './model/sections/schemas'

// ---- Accès aux données
export type { CmsResult } from './repository/client'
export { cmsOk, cmsErr, describeError, requireClient } from './repository/client'

export {
  fetchPublishedPage,
  fetchPageById,
  fetchAllPages,
  createPage,
  updatePage,
  setPageStatus,
  normalizeSlug,
} from './repository/pages'
export type { PageInput } from './repository/pages'

export {
  fetchSectionsForPage,
  fetchPublicPageWithSections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  normalizeAnchor,
} from './repository/sections'
export type { SectionInput } from './repository/sections'

export {
  fetchNavigation,
  fetchSiteNavigation,
  createNavigationItem,
  updateNavigationItem,
  deleteNavigationItem,
  reorderNavigationItems,
  resolveNavHref,
  isNavItemResolvable,
  asNavigationItemInput,
} from './repository/navigation'
export type { NavigationItem, NavigationTree, NavigationKey, NavTargetType } from './repository/navigation'

export {
  SETTING_KEYS,
  fetchSetting,
  saveSetting,
  toRestaurantSettings,
  toEmailTemplates,
  resolveRestaurant,
  DEFAULT_RESTAURANT,
  DEFAULT_EMAIL_TEMPLATES,
} from './repository/settings'
export type { RestaurantSettings, ResolvedRestaurant, EmailTemplates } from './repository/settings'

// ---- Rendu
export { PageRenderer } from './renderer/PageRenderer'
export type { PageRendererProps } from './renderer/PageRenderer'
export { SectionRenderer } from './renderer/SectionRenderer'
export type { SectionRendererProps } from './renderer/SectionRenderer'
export { SectionFallback } from './renderer/SectionFallback'
export {
  getSectionComponent,
  registerSectionComponent,
  hasSectionComponent,
  pendingSectionTypes,
} from './renderer/registry'
export type { SectionComponentProps, SectionComponent, SectionDataSource } from './renderer/registry'

// ---- Câblage applicatif
// Enregistre les 9 composants de section pour effet de bord. Ce module dépend du
// navigateur (il tire `@/lib/supabase` via `SiteContext`) : il n'est donc
// volontairement PAS importé par `@/cms/renderer`, qui doit rester isomorphe.
import './register-sections'
