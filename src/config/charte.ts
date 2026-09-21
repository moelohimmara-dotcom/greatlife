/**
 * CHARTE — LA SOURCE UNIQUE DES JETONS DU PROJET.
 *
 * POURQUOI CE FICHIER EXISTE
 * Un audit du 2026-09-21 (voir `docs/22_DIAGNOSTIC_CONSOLE.md`) a mesuré qu'il
 * n'existait **aucun fichier de jetons** dans ce dépôt, et que le désordre
 * venait de là :
 *   - 19 pas de police et 317 déclarations de `fontSize` dans la console ;
 *   - 80 valeurs de `padding` distinctes côté console, 57 côté site ;
 *   - **deux échelles de rayons disjointes** (le site a 2, 20, 24 ; la console a
 *     inventé 3, 7, 18 ; six valeurs seulement en commun) ;
 *   - **aucune couleur de danger, de succès ou d'avertissement** dans les
 *     palettes — d'où l'apparition de `#dc2626` (le `red-600` de Tailwind par
 *     défaut) **47 fois** dans `AdminPanel.tsx`.
 *
 * CE QUE DIT LE MARCHÉ (et pourquoi cette forme)
 * L'analogue direct est Shopify, qui a lui aussi une console et des surfaces
 * clientes. Trois principes en sont repris :
 *   1. **Les jetons sont une couche à part**, que les surfaces consomment :
 *      `@shopify/polaris-tokens` est un paquet séparé, et les surfaces qui ne
 *      sont pas l'admin le re-thèment (« *we can leverage Polaris tokens…
 *      Define your theme* »).
 *   2. **On personnalise au niveau des jetons, jamais dans les composants.**
 *      Formulation officielle : « *The safest layer for change is the
 *      foundation* — design tokens, theming rules, spacing scales, typography
 *      decisions, controlled variants. »
 *   3. L'anti-pattern à interdire est nommé : « *Override components with
 *      one-off CSS — that creates local fixes and system-wide inconsistency.* »
 *      C'est exactement l'état mesuré de la console : 531 styles inline.
 *
 * LA RÈGLE D'ADOPTION (décidée par le propriétaire, 2026-09-21)
 *   - **une seule charte**, lue par le site ET par la console ;
 *   - **héritage par défaut** : une surface qui ne dit rien prend la charte ;
 *   - **dérogation possible, optionnelle, déclarée en UN SEUL endroit**
 *     (`DEROGATIONS` ci-dessous), jamais par une valeur brute dans un composant.
 *
 * LES ÉCHELLES NE SONT PAS DÉDUITES, ELLES SONT CHOISIES — mais leur coût a été
 * mesuré avant de les choisir, sur les deux populations (`src/sections/**`,
 * `src/components/**` = site ; `src/admin/**`, `src/auth/**` = console) :
 *
 *   RAYONS      deja sur l'échelle : site 95 %, console 95 %. Écart moyen 1,1 px,
 *               maximum 2 px. La réunification est quasi gratuite.
 *   POLICES     site 71 %, console 84 %. Écart moyen 1,1 px, maximum 4 px.
 *   ESPACEMENT  site 52 %, console 37 %. Écart moyen 1,7 à 3,0 px, maximum 8 px.
 *               C'est le seul poste vraiment large : 275 occurrences à bouger
 *               côté console, mais aucun déplacement de plus de 4 px.
 *
 * AUTRE CONSTAT MESURÉ, QUI JUSTIFIE LES TROIS NOUVEAUX RÔLES
 * Une couleur de danger unique ne peut pas servir les quatre palettes :
 * `#dc2626` donne 4,83:1 sur le fond blanc de « gourmand » mais **3,00:1** sur
 * le fond sombre de « premium ». Les valeurs ci-dessous ont donc été **choisies
 * par palette et vérifiées** — chacune passe ≥ 4,5:1 sur les TROIS fonds de sa
 * palette (surface, surfaceAlt, bg). Le contrôle est automatisé :
 * `npm run verify:charte`.
 *
 * Et le jeton `gold` existant est à revoir : il donne 2,66:1 sur « gourmand »,
 * 2,60:1 sur « nature » et **1,75:1 sur « tropical »** — inutilisable comme
 * texte sur trois palettes sur quatre. Il est inscrit comme dette connue dans
 * le filet, il n'est pas corrigé ici (changer `gold` changerait le site public).
 */

/** Les échelles. Un tableau = une échelle : l'appartenance se vérifie. */
export const ECHELLE_ESPACE = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const
export const ECHELLE_RAYON = [4, 8, 10, 12, 14, 16, 20, 24, 50, 100] as const
export const ECHELLE_TEXTE = [11, 12, 13, 14, 16, 18, 20] as const
export const ECHELLE_TITRE = [24, 30, 38, 48, 64, 80] as const

/** Noms courts, pour écrire un style sans se souvenir d'un nombre. */
export const ESPACE = {
  aucun: 0, xxs: 4, xs: 8, s: 12, m: 16, l: 20, xl: 24, xxl: 32, xxxl: 40, huge: 48,
  section: 64, sectionLarge: 80, sectionXL: 96,
} as const

export const RAYON = {
  xs: 4, s: 8, m: 10, l: 12, xl: 14, xxl: 16, carte: 20, panneau: 24, pilule: 100,
  rond: '50%',
} as const

export const TEXTE = { xs: 11, s: 12, m: 13, l: 14, xl: 16, xxl: 18, xxxl: 20 } as const
export const TITRE = { s: 24, m: 30, l: 38, xl: 48, xxl: 64, affiche: 80 } as const

/**
 * MOUVEMENT. `normal` est la durée de référence du projet. `courbe` est la
 * courbe déjà employée partout (`Reveal`, transitions de page) — la nommer
 * évite qu'elle soit recopiée à la main avec une virgule de différence.
 */
export const MOUVEMENT = {
  instant: 0,
  rapide: 120,
  normal: 200,
  lent: 320,
  courbe: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

/** Les rôles de couleur. `ThemePalette` en implémente une valeur par rôle. */
export const ROLES_COULEUR = [
  'bg', 'surface', 'surfaceAlt', 'primary', 'primaryDark', 'accent', 'accentSoft',
  'gold', 'cream', 'text', 'muted', 'heading', 'headingInvert', 'shadow', 'shadowDeep',
  'danger', 'succes', 'avertissement',
] as const
export type RoleCouleur = (typeof ROLES_COULEUR)[number]

/*
  LES TROIS RÔLES SÉMANTIQUES, PAR PALETTE.
  Chaque triplet est vérifié ≥ 4,5:1 sur surface, surfaceAlt ET bg de sa palette.
  Les ratios sont écrits à côté : si quelqu'un change un fond, le contrôle
  `verify:charte` rougit et la ligne fautive est immédiatement lisible.
*/
export const SEMANTIQUES: Record<string, Pick<Record<RoleCouleur, string>, 'danger' | 'succes' | 'avertissement'>> = {
  // fonds clairs — surface #FFFFFF, surfaceAlt #FAF6F0, bg #F5EFE6
  gourmand: { danger: '#A81E14', succes: '#047857', avertissement: '#8A5A00' },
  // fonds sombres — surface #252B25, surfaceAlt #1E241E, bg #1A1F1A
  // une palette sombre exige des teintes CLAIRES : #dc2626 y tomberait à 3,00:1
  premium: { danger: '#FF8A80', succes: '#6EE7A0', avertissement: '#FBBF24' },
  // fonds clairs — surface #FFFFFF, surfaceAlt #F8F5EE, bg #EEEAE0
  nature: { danger: '#A81E14', succes: '#047857', avertissement: '#8A5A00' },
  // fonds clairs — surface #FFFFFF, surfaceAlt #FFF4E5, bg #FFF9F0
  tropical: { danger: '#A81E14', succes: '#047857', avertissement: '#8A5A00' },
}

/** Seuil de contraste WCAG AA pour du texte courant. */
export const CONTRASTE_MIN_TEXTE = 4.5

/* ---------------------------------------------------------------------------
   LA DÉROGATION PAR SURFACE.

   C'est le « personnalisation graphique indépendante ou optionnelle » : une
   surface peut DÉCLARER une dérogation sur un sous-ensemble de jetons, ici et
   nulle part ailleurs. Tant qu'elle ne déclare rien, elle HÉRITE.

   Ces deux entrées sont vides AUJOURD'HUI, volontairement : la règle retenue
   est « héritage par défaut, dérogation rare et gouvernée ». Le mécanisme est
   en place dès le premier jour pour qu'une dérogation future soit un acte
   explicite et lisible, jamais un `#dc2626` glissé dans un composant.
--------------------------------------------------------------------------- */
export type Surface = 'site' | 'console'

export interface Derogation {
  /** Une teinte de rôle remplacée pour cette seule surface. */
  couleurs?: Partial<Record<RoleCouleur, string>>
  /** Un pas d'espacement ajusté (densité d'une console, par exemple). */
  espace?: Partial<Record<keyof typeof ESPACE, number>>
}

export const DEROGATIONS: Record<Surface, Derogation> = {
  site: {},
  console: {},
}

/** Les jetons d'une surface : la charte, éventuellement dérogée. */
export function jetonsDeSurface(surface: Surface, palette: Record<RoleCouleur, string>) {
  const d = DEROGATIONS[surface] ?? {}
  return {
    couleurs: { ...palette, ...(d.couleurs ?? {}) },
    espace: { ...ESPACE, ...(d.espace ?? {}) },
    rayon: RAYON,
    texte: TEXTE,
    titre: TITRE,
    mouvement: MOUVEMENT,
    surface,
  }
}

/**
 * Les jetons en variables CSS. UN SEUL endroit produit les variables, donc une
 * seule chose à corriger si un nom change — et les deux surfaces les lisent.
 *
 * Le paramètre est typé sur les RÔLES, pas sur `Record<string, string>` : un
 * objet de rôle n'a pas de signature d'index, et c'est tant mieux — cela
 * interdit de passer n'importe quoi.
 */
/** Le nom de variable CSS de chaque rôle. Un rôle absent d'ici n'a pas de variable. */
export const NOMS_VARIABLES: Record<RoleCouleur, string> = {
  bg: '--c-bg',
  surface: '--c-surface',
  surfaceAlt: '--c-surface-alt',
  primary: '--c-primary',
  primaryDark: '--c-primary-dark',
  accent: '--c-accent',
  accentSoft: '--c-accent-soft',
  gold: '--c-gold',
  cream: '--c-cream',
  text: '--c-text',
  muted: '--c-muted',
  heading: '--c-heading',
  headingInvert: '--c-heading-invert',
  shadow: '--c-shadow',
  shadowDeep: '--c-shadow-deep',
  danger: '--c-danger',
  succes: '--c-succes',
  avertissement: '--c-avertissement',
}

export function variablesCss(couleurs: Partial<Record<RoleCouleur, string>>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const role of ROLES_COULEUR) {
    const v = couleurs[role]
    if (v) out[NOMS_VARIABLES[role]] = v
  }
  return out
}

/** `true` si la valeur appartient à l'échelle donnée. */
export const surLEchelle = (echelle: readonly number[], v: number) => echelle.includes(v)
