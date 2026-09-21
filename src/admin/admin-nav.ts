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
