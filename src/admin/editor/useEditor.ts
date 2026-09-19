/**
 * Greatlife — CMS : éditeur de pages
 * ===================================
 * Hook principal qui gère l'état de l'éditeur : sélection, sauvegarde, annulation.
 *
 * L'éditeur fonctionne sur un PRINCIPE DE MODIFICATION LOCALE :
 * - les modifications sont appliquées à un état local (copie des sections)
 * - la sauvegarde n'est déclenchée que par un bouton explicite
 * - l'annulation restaure l'état de départ
 *
 * Le rendu de prévisualisation utilise le renderer isomorphe : même code
 * que le site public, mais alimenté par les données LOCALES (pas encore sauvegardées).
 */

import { useState, useCallback, useMemo } from 'react'
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import type { SectionType } from '@/cms/model/section'
import { getSectionDefinition, defaultVariant } from '@/cms/model/sections/schemas'
import { resolveContentObject } from '@/cms/model/i18n'
import {
  updateSection,
  reorderSections,
} from '@/cms/repository/sections'

export interface EditorState {
  /** Sections en cours d'édition (copie locale, pas encore sauvegardée). */
  sections: PageSection[]
  /** Section actuellement sélectionnée (index dans `sections`), ou null. */
  selected: number | null
  /** Langue d'édition active. */
  locale: Locale
  /** `true` pendant une opération de sauvegarde. */
  saving: boolean
  /** Dernière erreur de sauvegarde, ou null. */
  error: string | null
}

export function useEditor(pageId: string, initialSections: PageSection[]) {
  const [state, setState] = useState<EditorState>({
    sections: initialSections,
    selected: null,
    locale: 'fr',
    saving: false,
    error: null,
  })

  /** Sélectionne une section par son index. */
  const select = useCallback((index: number | null) => {
    setState((s) => ({ ...s, selected: index }))
  }, [])

  /** Change la langue d'édition. */
  const setLocale = useCallback((locale: Locale) => {
    setState((s) => ({ ...s, locale }))
  }, [])

  /** Met à jour le contenu d'une section (modification locale, pas de sauvegarde). */
  const updateContent = useCallback((index: number, content: Record<string, unknown>) => {
    setState((s) => {
      const sections = [...s.sections]
      sections[index] = { ...sections[index], content }
      return { ...s, sections }
    })
  }, [])

  /** Change la variante d'une section. */
  const setVariant = useCallback((index: number, variant: string | null) => {
    setState((s) => {
      const sections = [...s.sections]
      sections[index] = { ...sections[index], variant }
      return { ...s, sections }
    })
  }, [])

  /** Active/désactive la visibilité d'une section. */
  const toggleVisibility = useCallback((index: number) => {
    setState((s) => {
      const sections = [...s.sections]
      sections[index] = { ...sections[index], visible: !sections[index].visible }
      return { ...s, sections }
    })
  }, [])

  /** Réordonne les sections (drag & drop). */
  const reorder = useCallback((from: number, to: number) => {
    setState((s) => {
      const sections = [...s.sections]
      const [moved] = sections.splice(from, 1)
      sections.splice(to, 0, moved)
      return { ...s, sections }
    })
  }, [])

  /** Ajoute une section de type donné à la fin. */
  const addSection = useCallback((type: SectionType) => {
    const def = getSectionDefinition(type)
    if (!def) return

    const now = new Date().toISOString()
    const newSection: PageSection = {
      id: `temp-${Date.now()}`,
      pageId,
      type,
      variant: defaultVariant(type),
      content: {},
      settings: {},
      visible: true,
      position: state.sections.length,
      anchor: null,
      createdAt: now,
      updatedAt: now,
    }

    setState((s) => ({
      ...s,
      sections: [...s.sections, newSection],
      selected: s.sections.length, // Sélectionne la nouvelle section
    }))
  }, [pageId, state.sections.length])

  /** Supprime (masque) une section. */
  const removeSection = useCallback((index: number) => {
    setState((s) => {
      const sections = s.sections.filter((_, i) => i !== index)
      return {
        ...s,
        sections,
        selected: s.selected === index ? null : (s.selected !== null && s.selected > index ? s.selected - 1 : s.selected),
      }
    })
  }, [])

  /**
   * Sauvegarde toutes les modifications en base.
   *
   * Retourne `true` **seulement si tout a été écrit**. `reorderSections` et
   * `updateSection` renvoient un `CmsResult` que la version précédente
   * ignorait : une sauvegarde refusée par la base était donc indiscernable
   * d'une réussite, et l'écran n'affichait rien.
   *
   * La publication s'appuie sur ce résultat : `publishPage` relit la BASE, pas
   * l'état local. Sans cette information, on publierait un contenu qui n'est
   * pas celui que le restaurateur vient de modifier, sans le lui dire.
   */
  const save = useCallback(async (): Promise<boolean> => {
    setState((s) => ({ ...s, saving: true, error: null }))
    try {
      // 1. Sauvegarder l'ordre des sections
      const orderedIds = state.sections.map((s) => s.id)
      const orderResult = await reorderSections(orderedIds)
      if (!orderResult.ok) {
        setState((s) => ({ ...s, saving: false, error: orderResult.error }))
        return false
      }

      // 2. Sauvegarder chaque section
      for (let i = 0; i < state.sections.length; i++) {
        const section = state.sections[i]
        const result = await updateSection(section.id, {
          content: section.content,
          variant: section.variant,
          visible: section.visible,
          position: i,
          anchor: section.anchor,
          settings: section.settings,
        })
        if (!result.ok) {
          setState((s) => ({ ...s, saving: false, error: result.error }))
          return false
        }
      }

      setState((s) => ({ ...s, saving: false }))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de sauvegarde'
      setState((s) => ({ ...s, saving: false, error: message }))
      return false
    }
  }, [state.sections, pageId])

  /** Sections résolues dans la langue active (pour le renderer). */
  const resolvedSections = useMemo(() => {
    return state.sections.map((s) => ({
      ...s,
      content: resolveContentObject(s.content, state.locale),
    }))
  }, [state.sections, state.locale])

  return {
    ...state,
    select,
    setLocale,
    updateContent,
    setVariant,
    toggleVisibility,
    reorder,
    addSection,
    removeSection,
    save,
    resolvedSections,
  }
}
