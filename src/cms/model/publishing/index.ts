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

export { SNAPSHOT_FORMAT_VERSION, buildSnapshot, parseSnapshot, freezeChrome } from './snapshot'
export type {
  PageSnapshot,
  SnapshotChrome,
  SnapshotChromeLink,
  SnapshotChromeRestaurant,
  SnapshotPage,
  SnapshotRead,
  SnapshotSection,
} from './snapshot'
