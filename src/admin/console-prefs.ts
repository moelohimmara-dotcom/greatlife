/**
 * Préférences de la CONSOLE (opérateur) — distinctes du thème public et des
 * Réglages du restaurant. Persistance navigateur uniquement (MVP) : une clé
 * `site_content` partagée fusionnerait le chrome de tous les comptes.
 */
import { ecrireNavPref, lireNavPref, type AdminNavPref } from '@/admin/admin-nav'

export type ConsoleTheme = 'clair' | 'nuit'
export type ConsoleChrome = 'creme' | 'foret'
export type ConsoleDensity = 'confortable' | 'compacte'
export type ConsoleAccent = 'foret' | 'corail' | 'safran'

export interface ConsolePrefs {
  /** Mode clair / nuit du chrome console (indépendant du site public). */
  theme: ConsoleTheme
  chrome: ConsoleChrome
  density: ConsoleDensity
  /** Couleur d’accent des actions (boutons actifs, liens). */
  accent: ConsoleAccent
  nav: AdminNavPref
  /** Réduit transitions / animations dans la console. */
  reduceMotion: boolean
  /** Affiche les pastilles compteurs (messages, commandes, réservations). */
  showBadges: boolean
}

export const CONSOLE_PREFS_KEY = 'greatlife-admin-console-prefs'
export const CONSOLE_PREFS_EVENT = 'greatlife-console-prefs-changed'

/** Astuces « Comment ça marche » / tips écran — réaffichables depuis Préférences. */
export const CONSOLE_TIP_KEYS = {
  mediasGuide: 'glife.medias.guide-tip.dismissed.v2',
} as const

const DEFAULTS: ConsolePrefs = {
  theme: 'clair',
  chrome: 'creme',
  density: 'confortable',
  accent: 'foret',
  nav: 'open',
  reduceMotion: false,
  showBadges: true,
}

function asTheme(v: unknown): ConsoleTheme {
  return v === 'nuit' ? 'nuit' : 'clair'
}

function asChrome(v: unknown): ConsoleChrome {
  return v === 'foret' ? 'foret' : 'creme'
}

function asDensity(v: unknown): ConsoleDensity {
  return v === 'compacte' ? 'compacte' : 'confortable'
}

function asAccent(v: unknown): ConsoleAccent {
  if (v === 'corail' || v === 'safran') return v
  return 'foret'
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

export function lireConsolePrefs(): ConsolePrefs {
  const nav = lireNavPref()
  try {
    const raw = localStorage.getItem(CONSOLE_PREFS_KEY)
    if (!raw) return { ...DEFAULTS, nav }
    const parsed = JSON.parse(raw) as Partial<ConsolePrefs>
    return {
      theme: asTheme(parsed.theme),
      chrome: asChrome(parsed.chrome),
      density: asDensity(parsed.density),
      accent: asAccent(parsed.accent),
      nav: parsed.nav === 'rail' || parsed.nav === 'open' ? parsed.nav : nav,
      reduceMotion: asBool(parsed.reduceMotion, DEFAULTS.reduceMotion),
      showBadges: asBool(parsed.showBadges, DEFAULTS.showBadges),
    }
  } catch {
    return { ...DEFAULTS, nav }
  }
}

function serialiser(prefs: ConsolePrefs): string {
  return JSON.stringify({
    theme: prefs.theme,
    chrome: prefs.chrome,
    density: prefs.density,
    accent: prefs.accent,
    nav: prefs.nav,
    reduceMotion: prefs.reduceMotion,
    showBadges: prefs.showBadges,
  })
}

export function ecrireConsolePrefs(patch: Partial<ConsolePrefs>): ConsolePrefs {
  const next = { ...lireConsolePrefs(), ...patch }
  try {
    localStorage.setItem(CONSOLE_PREFS_KEY, serialiser(next))
  } catch {
    /* navigation privée */
  }
  if (patch.nav === 'open' || patch.nav === 'rail') ecrireNavPref(patch.nav)
  try {
    window.dispatchEvent(new CustomEvent(CONSOLE_PREFS_EVENT, { detail: next }))
  } catch {
    /* ignore */
  }
  return next
}

export function reinitialiserGuidesConsole(): number {
  let n = 0
  for (const key of Object.values(CONSOLE_TIP_KEYS)) {
    try {
      if (localStorage.getItem(key) != null) {
        localStorage.removeItem(key)
        n += 1
      }
    } catch {
      /* ignore */
    }
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSOLE_PREFS_EVENT, { detail: lireConsolePrefs() }))
  } catch {
    /* ignore */
  }
  return n
}

/** Applique les attributs data-* lus par console.css — aperçu immédiat. */
export function appliquerConsolePrefsAuShell(el: HTMLElement | null, prefs: ConsolePrefs) {
  if (!el) return
  el.setAttribute('data-console-theme', prefs.theme)
  el.setAttribute('data-admin-chrome', prefs.chrome)
  el.setAttribute('data-admin-density', prefs.density)
  el.setAttribute('data-console-accent', prefs.accent)
  el.setAttribute('data-console-motion', prefs.reduceMotion ? 'reduce' : 'normal')
  el.setAttribute('data-console-badges', prefs.showBadges ? 'on' : 'off')
  el.style.colorScheme = prefs.theme === 'nuit' ? 'dark' : 'light'
}
