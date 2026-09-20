/**
 * Greatlife — CMS : sections publiées pour le site public
 * =======================================================
 * Charge les sections de la page d'accueil **publiée**.
 *
 * ⚠️ CE QUI A CHANGÉ (et pourquoi)
 *
 * La première version pilotait l'activation par un drapeau dans le
 * `localStorage` (`greatlife_cms_enabled`). C'était une ERREUR DE CONCEPTION :
 * le `localStorage` est propre à CHAQUE navigateur. Seul l'administrateur qui
 * posait le drapeau voyait le contenu CMS ; aucun visiteur ne le voyait jamais.
 * « Modifier le site » ne pouvait donc pas influencer le site public.
 *
 * L'interrupteur est désormais le STATUT DE LA PAGE (TDR §22, §3.5) :
 *
 *   page `draft`     → le site public garde son rendu historique
 *   page `published` → le site public rend les sections du CMS
 *
 * Ce choix ne rajoute aucune mécanique : c'est la BASE qui décide de ce que voit
 * un visiteur, et non le navigateur (TDR §31).
 *
 * ⚠️ MISE À JOUR DU 2026-09-19 — LA GARDE N'EST PLUS CELLE CITÉE ICI
 * Ce commentaire désignait la policy `sections_public_read` comme la garde RLS.
 * Cette policy **n'existe plus** : la migration `031` l'a supprimée, parce
 * qu'elle exposait la TABLE DE TRAVAIL au public — un brouillon modifié mais non
 * publié devenait visible, ce que le TDR §22 interdit.
 *
 * La lecture publique passe par `pages.published_snapshot` (migration `030`) :
 * un instantané figé, écrit dans le MÊME `UPDATE` que le statut. Un visiteur
 * anonyme ne lit donc plus `page_sections` du tout — mesuré : 0 section.
 * Vérifié par `npm run verify:public`.
 * Références : `docs/10_PUBLISHING_VERSIONING.md` §7, `docs/12_DATABASE_SCHEMA.md` §3.2.
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSite } from '@/contexts/SiteContext'
import type { PageSection } from '@/cms/model/section'
import type { Page } from '@/cms/model/page'
import { fetchPublicPageWithSections } from '@/cms/repository/sections'
import { resolveContentObject } from '@/cms/model/i18n'
import type { Locale } from '@/cms/model/i18n'

interface UseCmsSectionsResult {
  /** Sections publiées et visibles, dans l'ordre. */
  sections: PageSection[]
  /** Sections résolues dans la langue active, prêtes pour le renderer. */
  resolvedSections: PageSection[]
  /** `true` pendant le chargement initial. */
  loading: boolean
  /** Erreur de lecture, le cas échéant. */
  error: string | null
  /** `true` si une page publiée existe : le CMS pilote alors le rendu. */
  enabled: boolean
  /** Page publiée (mise en page lue dans l'instantané, pas le brouillon). */
  page: Page | null
}

export function useCmsSections(locale: Locale = 'fr'): UseCmsSectionsResult {
  const { cmsSections } = useSite()
  const [sections, setSections] = useState<PageSection[]>([])
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        /*
          Lecture ANONYME. `fetchPublicPageWithSections` renvoie `null` tant que
          la page n'est pas publiée — c'est exactement le signal qui distingue
          « le CMS pilote le site » de « le site garde son rendu historique ».
        */
        const res = await fetchPublicPageWithSections('')
        if (cancelled) return

        if (!res.ok) {
          setError(res.error)
          setEnabled(false)
          setSections([])
          setPage(null)
          return
        }
        if (!res.data) {
          setError(null)
          setEnabled(false)
          setSections([])
          setPage(null)
          return
        }

        setError(null)
        setEnabled(true)
        setSections(res.data.sections)
        setPage(res.data.page)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement')
          setEnabled(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [reloadKey])

  /*
    Realtime : `SiteContext` écoute `pages` — qui porte le STATUT de publication
    ET l'instantané publié — et non plus `page_sections`. La version précédente
    de ce commentaire affirmait le contraire : `page_sections` n'est plus écouté
    (voir `SiteContext.tsx:450`).

    C'est le comportement voulu : modifier le brouillon ne doit pas recharger le
    site public à chaque frappe. En revanche une publication change `pages`, donc
    `cmsSections` est réécrit et cette relecture suit — c'est ce qui rend une
    publication immédiatement visible côté visiteur.
  */
  useEffect(() => { reload() }, [cmsSections, reload])

  const resolvedSections = useMemo(() => {
    return sections.map((s) => ({
      ...s,
      content: resolveContentObject(s.content, locale) as typeof s.content,
    }))
  }, [sections, locale])

  return { sections, resolvedSections, loading, error, enabled, page }
}
