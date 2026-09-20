/**
 * Modèle — publication (barrel)
 * ==============================
 * Point d'entrée pur, sans dépendance à Supabase ni à Vite : importable par un
 * script Node, comme `@/cms/renderer`.
 */

export type {
  CheckLevel,
  FindingLevel,
  PublicationCheckId,
  PublicationCheckResult,
  PublicationFinding,
  PublicationInput,
  PublicationMenuInput,
  PublicationNavInput,
  PublicationReport,
  PublicationRestaurantInput,
  PublicationSectionInput,
} from './types'
export { PUBLICATION_CHECKS, PUBLICATION_CHECKS_NOT_VERIFIED, buildReport } from './types'

export { runPublicationChecks, sectionLabel, snapshotEmptinessFinding } from './checks'

export { SNAPSHOT_FORMAT_VERSION, buildSnapshot, parseSnapshot } from './snapshot'
export type { PageSnapshot, SnapshotPage, SnapshotRead, SnapshotSection } from './snapshot'
