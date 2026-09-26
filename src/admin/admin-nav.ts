/** Préférence de la nav console : menu ouvert, ou rail d’icônes. */
export type AdminNavPref = 'open' | 'rail'

export const ADMIN_NAV_KEY = 'greatlife-admin-nav'

export function lireNavPref(): AdminNavPref {
  try {
    const v = localStorage.getItem(ADMIN_NAV_KEY)
    if (v === 'open' || v === 'rail') return v
  } catch {
    /* navigation privée */
  }
  return 'open'
}

export function ecrireNavPref(value: AdminNavPref) {
  try {
    localStorage.setItem(ADMIN_NAV_KEY, value)
  } catch {
    /* ignore */
  }
}

/**
 * Etat des tiroirs de la barre latérale (segments pliables).
 * Chaque segment garde son état ; l'écran courant rouvre toujours le sien
 * (voir AdminShell) — c'est la partie « intelligente » du tiroir.
 */
export const TIROIRS_NAV_KEY = 'greatlife-admin-nav-tiroirs'

export function lireTiroirsNav(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(TIROIRS_NAV_KEY)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' ? (v as Record<string, boolean>) : {}
  } catch {
    /* navigation privée ou JSON invalide : on repart ouvert */
    return {}
  }
}

export function ecrireTiroirNav(segment: string, ouvert: boolean): void {
  try {
    const etat = { ...lireTiroirsNav(), [segment]: ouvert }
    localStorage.setItem(TIROIRS_NAV_KEY, JSON.stringify(etat))
  } catch {
    /* stockage indisponible : l'état reste en mémoire pour la session */
  }
}