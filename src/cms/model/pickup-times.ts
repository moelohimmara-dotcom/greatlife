/**
 * Créneaux de retrait (J5) — module PUR.
 * Aucune dépendance réseau : testable avec node:test / esbuild.
 */

/** Normalise une liste de créneaux (chaînes non vides, ordre conservé, doublons retirés). */
export function normaliserPickupTimes(raw: unknown): string[] {
  const vus = new Set<string>()
  const out: string[] = []
  if (!Array.isArray(raw)) return out
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const t = entry.trim()
    if (!t || vus.has(t)) continue
    vus.add(t)
    out.push(t)
  }
  return out
}
