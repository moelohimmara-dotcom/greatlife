/**
 * Préférences de la CONSOLE (opérateur) — distinctes du thème public et des
 * Réglages du restaurant. Persistance navigateur uniquement (MVP) : une clé
 * `site_content` partagée fusionnerait le chrome de tous les comptes.
 */
import { ecrireNavPref, lireNavPref, type AdminNavPref } from '@/admin/admin-nav'

export type ConsoleChrome = 'creme' | 'foret'
export type ConsoleDensity = 'confortable' | 'compacte'

export interface ConsolePrefs {
  chrome: ConsoleChrome
  density: ConsoleDensity
  nav: AdminNavPref
}

export const CONSOLE_PREFS_KEY = 'greatlife-admin-console-prefs'
export const CONSOLE_PREFS_EVENT = 'greatlife-console-prefs-changed'

/** Astuces « Comment ça marche » / tips écran — réaffichables depuis Préférences. */
export const CONSOLE_TIP_KEYS = {
  mediasGuide: 'glife.medias.guide-tip.dismissed.v2',
} as const

const DEFAULTS: ConsolePrefs = {
  chrome: 'creme',
  density: 'confortable',
  nav: 'open',
}

function asChrome(v: unknown): ConsoleChrome {
  return v === 'foret' ? 'foret' : 'creme'
}

function asDensity(v: unknown): ConsoleDensity {
  return v === 'compacte' ? 'compacte' : 'confortable'
}

export function lireConsolePrefs(): ConsolePrefs {
  const nav = lireNavPref()
  try {
    const raw = localStorage.getItem(CONSOLE_PREFS_KEY)
    if (!raw) return { ...DEFAULTS, nav }
    const parsed = JSON.parse(raw) as Partial<ConsolePrefs>
    return {
      chrome: asChrome(parsed.chrome),
      density: asDensity(parsed.density),
      nav: parsed.nav === 'rail' || parsed.nav === 'open' ? parsed.nav : nav,
    }
  } catch {
    return { ...DEFAULTS, nav }
  }
}

export function ecrireConsolePrefs(patch: Partial<ConsolePrefs>): ConsolePrefs {
  const next = { ...lireConsolePrefs(), ...patch }
  try {
    localStorage.setItem(
      CONSOLE_PREFS_KEY,
      JSON.stringify({ chrome: next.chrome, density: next.density, nav: next.nav }),
    )
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

export function appliquerConsolePrefsAuShell(el: HTMLElement | null, prefs: ConsolePrefs) {
  if (!el) return
  el.setAttribute('data-admin-chrome', prefs.chrome)
  el.setAttribute('data-admin-density', prefs.density)
}
