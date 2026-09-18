/**
 * Greatlife — CMS : point d'entrée du RENDU
 * ==========================================
 * À utiliser dans tout contexte SANS navigateur — typiquement un script Node
 * qui génère le HTML statique à la publication (décision CM-7 / AR-10).
 *
 * ⚠️ Pourquoi ce point d'entrée existe :
 *
 *   `@/cms` (le point d'entrée global) réexporte la couche `repository`, qui
 *   dépend de `@/lib/supabase`. Or `src/lib/supabase.ts` lit `import.meta.env`
 *   au chargement du module — une API fournie par Vite, absente dans Node.
 *   Importer `@/cms` depuis un script Node échouerait donc à l'import, avant
 *   même d'exécuter la moindre ligne.
 *
 *   Ce sous-chemin n'expose QUE le modèle et le rendu : aucune dépendance à
 *   Supabase, à Vite ou au navigateur. C'est ce qui rend le renderer réellement
 *   isomorphe.
 */

// ---- Modèle (pur, sans dépendance)
export type { Bilingue, Locale } from '../model/i18n'
export {
  LOCALES,
  DEFAULT_LOCALE,
  resolveI18n,
  resolveI18nList,
  resolveDeep,
  resolveContentObject,
  isTranslation,
  hasTranslation,
  localeFromPath,
  pathFor,
  fr,
} from '../model/i18n'

export type { Page, PageSeo, PageStatus } from '../model/page'
export { PAGE_STATUSES, PAGE_STATUS_LABELS, pageStatusLabel } from '../model/page'

export type {
  SectionType,
  SectionContent,
  SectionSettings,
  PageSection,
  SectionTypeDefinition,
} from '../model/section'
export { LEGACY_ANCHORS } from '../model/section'

export {
  SECTION_TYPES,
  getSectionDefinition,
  isKnownSectionType,
  defaultVariant,
} from '../model/sections/schemas'

// ---- Rendu
export { PageRenderer } from './PageRenderer'
export type { PageRendererProps } from './PageRenderer'
export { SectionRenderer, SECTION_SCROLL_STYLE } from './SectionRenderer'
export type { SectionRendererProps } from './SectionRenderer'
export { SectionFallback } from './SectionFallback'
export type { SectionFallbackProps } from './SectionFallback'
export {
  getSectionComponent,
  registerSectionComponent,
  hasSectionComponent,
  pendingSectionTypes,
} from './registry'
export type { SectionComponentProps, SectionComponent, SectionDataSource } from './registry'

/**
 * Type des réglages du restaurant attendu par le rendu.
 * Redéclaré ici pour ne pas dépendre du repository (qui importe Supabase).
 */
export type { ResolvedRestaurant } from '../repository/settings'
