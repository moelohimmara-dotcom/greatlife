/**
 * Historique du brouillon (Annuler / Rétablir).
 * Pile courte, coalescence du texte — pas un instantané de publication.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { isTranslation } from '@/cms/model/i18n'
import type { PageLayout } from '@/cms/model/page-layout'
import type { PageSection } from '@/cms/model/section'
import { EDITOR_META_KEY } from '@/cms/model/subblocks'

export const HISTORIQUE_MAX = 20
export const HISTORIQUE_TEXTE_MS = 800

export type BrouillonSnap = {
  sections: PageSection[]
  removedIds: string[]
  selected: number | null
  layout: PageLayout
}

export function clonerBrouillon(snap: BrouillonSnap): BrouillonSnap {
  return {
    sections: structuredClone(snap.sections),
    removedIds: [...snap.removedIds],
    selected: snap.selected,
    layout: snap.layout,
  }
}

export function brouillonsEgaux(a: BrouillonSnap, b: BrouillonSnap): boolean {
  return a.layout === b.layout
    && a.selected === b.selected
    && a.removedIds.length === b.removedIds.length
    && a.removedIds.every((id, i) => id === b.removedIds[i])
    && JSON.stringify(a.sections) === JSON.stringify(b.sections)
}

/** `true` si seuls des textes (chaîne ou {fr,en}) ont bougé — pas un geste structuré. */
export function saisieTexteSeule(
  avant: Record<string, unknown>,
  apres: Record<string, unknown>,
): boolean {
  const cles = new Set([...Object.keys(avant), ...Object.keys(apres)])
  let change = false
  for (const cle of cles) {
    if (Object.is(avant[cle], apres[cle])) continue
    try {
      if (JSON.stringify(avant[cle]) === JSON.stringify(apres[cle])) continue
    } catch {
      return false
    }
    change = true
    if (cle === EDITOR_META_KEY || cle === 'spacing') return false
    const valeur = apres[cle] ?? avant[cle]
    if (typeof valeur === 'string') continue
    if (isTranslation(valeur)) continue
    return false
  }
  return change
}

export function useBrouillonHistory() {
  const pastRef = useRef<BrouillonSnap[]>([])
  const futureRef = useRef<BrouillonSnap[]>([])
  const coalescingRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const [flags, setFlags] = useState({ canUndo: false, canRedo: false })

  const sync = useCallback(() => {
    setFlags({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    })
  }, [])

  const arreterCoalescence = useCallback(() => {
    coalescingRef.current = false
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const noter = useCallback((kind: 'coalesce' | 'immediate', current: BrouillonSnap) => {
    if (kind === 'coalesce' && coalescingRef.current) {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        coalescingRef.current = false
        timerRef.current = null
      }, HISTORIQUE_TEXTE_MS)
      return
    }
    const dernier = pastRef.current[pastRef.current.length - 1]
    if (!dernier || !brouillonsEgaux(dernier, current)) {
      pastRef.current = [...pastRef.current, clonerBrouillon(current)].slice(-HISTORIQUE_MAX)
      futureRef.current = []
    }
    if (kind === 'coalesce') {
      coalescingRef.current = true
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        coalescingRef.current = false
        timerRef.current = null
      }, HISTORIQUE_TEXTE_MS)
    } else {
      arreterCoalescence()
    }
    sync()
  }, [arreterCoalescence, sync])

  const undo = useCallback((present: BrouillonSnap): BrouillonSnap | null => {
    arreterCoalescence()
    const past = pastRef.current
    if (past.length === 0) return null
    const prev = past[past.length - 1]
    pastRef.current = past.slice(0, -1)
    futureRef.current = [...futureRef.current, clonerBrouillon(present)].slice(-HISTORIQUE_MAX)
    sync()
    return clonerBrouillon(prev)
  }, [arreterCoalescence, sync])

  const redo = useCallback((present: BrouillonSnap): BrouillonSnap | null => {
    arreterCoalescence()
    const future = futureRef.current
    if (future.length === 0) return null
    const next = future[future.length - 1]
    futureRef.current = future.slice(0, -1)
    pastRef.current = [...pastRef.current, clonerBrouillon(present)].slice(-HISTORIQUE_MAX)
    sync()
    return clonerBrouillon(next)
  }, [arreterCoalescence, sync])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  return { canUndo: flags.canUndo, canRedo: flags.canRedo, noter, undo, redo }
}
