/**
 * Greatlife — CMS : hook de chargement des sections
 * ==================================================
 * Charge les sections de la page « Accueil » depuis la base.
 * Utilisé par le site public pour afficher le contenu CMS.
 *
 * Le hook gère :
 * - le chargement initial des sections
 * - la subscription Realtime pour les mises à jour en direct
 * - le fallback vers les données legacy si le CMS n'est pas activé
 */

import { useEffect, useState, useMemo } from 'react'
import { useSite } from '@/contexts/SiteContext'
import type { PageSection } from '@/cms/model/section'
import { fetchAllPages } from '@/cms/repository/pages'
import { fetchSectionsForPage } from '@/cms/repository/sections'
import { resolveContentObject } from '@/cms/model/i18n'
import type { Locale } from '@/cms/model/i18n'

/**
 * Flag de bascule CMS.
 * `true` = le site public utilise les données de `page_sections`
 * `false` = le site public utilise les données legacy (`site_content`)
 *
 * Ce flag est lu dans le `localStorage` pour persister le choix.
 * Il n'est modifiable que par un admin (pas de bouton public).
 */
const CMS_ENABLED_KEY = 'greatlife_cms_enabled'

export function isCmsEnabled(): boolean {
  try {
    return localStorage.getItem(CMS_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setCmsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CMS_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch { /* ignore */ }
}

interface UseCmsSectionsResult {
  /** Sections chargées depuis la base. */
  sections: PageSection[]
  /** Sections résolues dans la langue donnée. */
  resolvedSections: Record<string, unknown>[]
  /** `true` pendant le chargement. */
  loading: boolean
  /** Erreur éventuelle. */
  error: string | null
  /** `true` si le CMS est activé. */
  enabled: boolean
}

export function useCmsSections(locale: Locale = 'fr'): UseCmsSectionsResult {
  const { cmsSections } = useSite()
  const [sections, setSections] = useState<PageSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enabled] = useState(isCmsEnabled)

  // Charger les sections depuis la base
  useEffect(() => {
    if (!enabled) { setLoading(false); return }

    let cancelled = false
    async function load() {
      try {
        const pagesRes = await fetchAllPages()
        if (cancelled) return
        if (!pagesRes.ok || pagesRes.data.length === 0) {
          setError('Aucune page trouvée')
          return
        }
        const sectionsRes = await fetchSectionsForPage(pagesRes.data[0].id, { includeHidden: false })
        if (cancelled) return
        if (!sectionsRes.ok) {
          setError(sectionsRes.error)
          return
        }
        setSections(sectionsRes.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [enabled])

  // Mettre à jour les sections quand le Realtime notifie un changement
  useEffect(() => {
    if (!enabled || cmsSections.length === 0) return
    setSections(cmsSections as PageSection[])
  }, [cmsSections, enabled])

  // Résoudre le contenu dans la langue active
  const resolvedSections = useMemo(() => {
    return sections
      .filter((s) => s.visible)
      .map((s) => ({
        ...s,
        content: resolveContentObject(s.content, locale),
      }))
  }, [sections, locale])

  return { sections, resolvedSections, loading, error, enabled }
}
