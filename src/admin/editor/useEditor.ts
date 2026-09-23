/**
 * Greatlife — CMS : éditeur de pages
 * ===================================
 * Hook principal qui gère l'état de l'éditeur : sélection, sauvegarde, annulation.
 *
 * L'éditeur fonctionne sur un PRINCIPE DE MODIFICATION LOCALE :
 * - les modifications sont appliquées à un état local (copie des sections)
 * - la sauvegarde n'est déclenchée que par un bouton explicite
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
import { empreinteSauvegarde, isPersistedId, planifierSauvegarde } from '@/cms/model/save-plan'
import {
  createSection,
  deleteSection,
  updateSection,
  reorderSections,
} from '@/cms/repository/sections'

export interface EditorState {
  /** Sections en cours d'édition (copie locale, pas encore sauvegardée). */
  sections: PageSection[]
  /**
   * Identifiants des sections RETIRÉES de la liste locale et encore présentes
   * en base. La suppression n'est écrite qu'à la sauvegarde : jusque-là, elle
   * reste annulable par un simple rechargement.
   */
  removedIds: string[]
  /** Section actuellement sélectionnée (index dans `sections`), ou null. */
  selected: number | null
  /** Langue d'édition active. */
  locale: Locale
  /** `true` pendant une opération de sauvegarde. */
  saving: boolean
  /** Dernière erreur de sauvegarde, ou null. */
  error: string | null
  /**
   * Ce qui n'est PAS une erreur mais doit être dit : typiquement, des
   * modifications arrivées PENDANT l'enregistrement, qui ne sont donc pas
   * enregistrées. Sans ce champ, cette perte était silencieuse (revue I-5).
   */
  avertissement: string | null
}

export function useEditor(pageId: string, initialSections: PageSection[]) {
  const [state, setState] = useState<EditorState>({
    sections: initialSections,
    removedIds: [],
    selected: initialSections.length > 0 ? 0 : null,
    locale: 'fr',
    saving: false,
    error: null,
    avertissement: null,
  })
  /** Mode Grouper : cliquer les textes dans l’aperçu, sans Maj. */
  const [groupMode, setGroupMode] = useState(false)
  const startGroupMode = useCallback(() => setGroupMode(true), [])
  const stopGroupMode = useCallback(() => setGroupMode(false), [])

  /** Sélectionne une section par son index. */
  const select = useCallback((index: number | null) => {
    setState((s) => ({ ...s, selected: index }))
  }, [])

  /** Sélectionne une section par son identifiant (clic dans l’aperçu). */
  const selectById = useCallback((id: string) => {
    setState((s) => {
      const index = s.sections.findIndex((section) => section.id === id)
      return index < 0 ? s : { ...s, selected: index }
    })
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

  /**
   * Copie un bloc sous l’original (nouveau identifiant, contenu cloné).
   * Les en-tête / pied ne passent pas par cette liste.
   */
  const duplicateSection = useCallback((index: number) => {
    setState((s) => {
      const source = s.sections[index]
      if (!source) return s
      const now = new Date().toISOString()
      const copie: PageSection = {
        ...structuredClone(source),
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        anchor: null,
        createdAt: now,
        updatedAt: now,
      }
      const sections = [...s.sections]
      sections.splice(index + 1, 0, copie)
      return { ...s, sections, selected: index + 1 }
    })
  }, [])

  /** Restaure un brouillon (Annuler / Rétablir) sans fusionner. */
  const replaceDraft = useCallback((sections: PageSection[], removedIds: string[], selected: number | null) => {
    setState((s) => ({
      ...s,
      sections,
      removedIds,
      selected: selected !== null && selected >= sections.length
        ? (sections.length === 0 ? null : sections.length - 1)
        : selected,
    }))
  }, [])

  /**
   * Retire une section de la liste locale.
   *
   * Si la section existait en base, son identifiant est mémorisé : c'est
   * `save()` qui la supprimera réellement. Une section jamais enregistrée
   * (identifiant `temp-…`) disparaît simplement — il n'y a rien à supprimer.
   */
  const removeSection = useCallback((index: number) => {
    setState((s) => {
      const retirée = s.sections[index]
      const sections = s.sections.filter((_, i) => i !== index)
      const removedIds =
        retirée && isPersistedId(retirée.id) && !s.removedIds.includes(retirée.id)
          ? [...s.removedIds, retirée.id]
          : s.removedIds
      return {
        ...s,
        sections,
        removedIds,
        selected: sections.length === 0
          ? null
          : s.selected === index
            ? Math.min(index, sections.length - 1)
            : (s.selected !== null && s.selected > index ? s.selected - 1 : s.selected),
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
   *
   * La sauvegarde couvre les TROIS gestes de la colonne Structure, dans cet
   * ordre : SUPPRIMER, CRÉER, puis réordonner et mettre à jour.
   *
   * Pourquoi l'ordre compte : `reorderSections` et `updateSection` écrivent par
   * identifiant. Une section retirée ne doit donc plus être dans la liste quand
   * on réordonne, et une section nouvelle doit avoir reçu son identifiant
   * définitif avant qu'on la réordonne. Auparavant, les deux gestes étaient
   * purement absents : la liste changeait à l'écran, la base ne bougeait pas, et
   * tout revenait au rechargement.
   *
   * QUE DÉCIDER est extrait dans `planifierSauvegarde` (module pur, vérifié par
   * `npm run test:save-plan`). Cette fonction-ci n'exécute plus que le plan :
   * c'est ce qui rend la décision vérifiable sans base de données.
   */
  const save = useCallback(async (): Promise<boolean> => {
    setState((s) => ({ ...s, saving: true, error: null, avertissement: null }))

    const plan = planifierSauvegarde(state.sections, state.removedIds)
    const empreinteDepart = empreinteSauvegarde(state.sections)

    /**
     * Identifiants provisoires → identifiants attribués par la base.
     * Rempli au fil des créations réussies.
     */
    const attribues = new Map<string, string>()

    /**
     * Sortie de sauvegarde — appliquée à CHAQUE issue, succès comme échec.
     *
     * DEUX RAISONS, toutes deux mesurées par la revue du 2026-09-19 :
     *
     * 1. REPRISE DES IDENTIFIANTS MÊME EN CAS D'ÉCHEC.
     *    Une création réussie suivie d'un échec plus loin laissait la section
     *    avec son identifiant provisoire (`temp-…`) : le clic suivant sur
     *    Enregistrer la RECRÉAIT en base. Le doublon revenait donc par le chemin
     *    d'échec, alors qu'il était fermé sur le chemin nominal.
     *
     * 2. FUSION DANS L'ÉTAT COURANT, JAMAIS RÉINJECTION.
     *    Une sauvegarde dure 2N+2 allers-retours. Le restaurateur continue de
     *    taper pendant ce temps — les champs ne sont pas désactivés. Réinjecter
     *    `persistees` (l'instantané du DÉBUT) effaçait sa saisie sans un mot.
     *    On ne réécrit donc que l'identifiant, et on laisse le contenu tel qu'il
     *    est au moment où la réponse arrive.
     */
    const sortir = (removedIdsRestants: string[], error: string | null): boolean => {
      setState((s) => {
        const sections = s.sections.map((section) => {
          const id = attribues.get(section.id)
          return id === undefined ? section : { ...section, id }
        })
        /*
          DES MODIFICATIONS SONT-ELLES ARRIVÉES PENDANT L'ENREGISTREMENT ?
          Si oui, on le DIT. Les champs ne sont pas désactivés pendant la
          sauvegarde : sans ce message, le restaurateur croyait tout enregistré
          et découvrait la perte au rechargement suivant.
        */
        const modifieEntreTemps = error === null && empreinteSauvegarde(sections) !== empreinteDepart
        return {
          ...s,
          sections,
          removedIds: removedIdsRestants,
          saving: false,
          error,
          avertissement: modifieEntreTemps
            ? "Vous avez modifié le contenu pendant l'enregistrement : ces dernières modifications ne sont pas encore enregistrées. Cliquez de nouveau sur Enregistrer pour les conserver."
            : null,
        }
      })
      return error === null
    }

    /*
      `resteASupprimer` est SUIVI, et non recopié depuis le plan à chaque sortie.
      La version précédente remettait `plan.aSupprimer` EN ENTIER dans le
      `catch` : les identifiants déjà supprimés y retournaient, et tout
      enregistrement ultérieur les aurait tentés de nouveau — donc échoué —
      jusqu'au rechargement (revue du 2026-09-20, M-6).
    */
    let resteASupprimer = [...plan.aSupprimer]

    try {
      // 1. Supprimer en base les sections retirées de la liste.
      //    Un échec laisse en attente les identifiants NON encore traités.
      while (resteASupprimer.length > 0) {
        const result = await deleteSection(resteASupprimer[0])
        if (!result.ok) return sortir(resteASupprimer, result.error)
        resteASupprimer = resteASupprimer.slice(1)
      }

      // 2. Créer les sections nouvelles, et RETENIR l'identifiant attribué.
      //    Sans cette reprise, la sauvegarde suivante recréerait les sections
      //    ajoutées : c'est exactement le doublon corrigé au Point 2, transposé.
      const persistees: PageSection[] = []
      for (const etape of plan.etapes) {
        if (etape.action === 'conserver') {
          persistees.push(etape.section)
          continue
        }
        const result = await createSection({
          pageId,
          type: etape.section.type,
          variant: etape.section.variant,
          position: etape.section.position,
          visible: etape.section.visible,
          anchor: etape.section.anchor,
          content: etape.section.content,
          settings: etape.section.settings,
        })
        if (!result.ok) return sortir([], result.error)
        attribues.set(etape.section.id, result.data.id)
        persistees.push(result.data)
      }

      // 3. Sauvegarder l'ordre des sections
      const orderResult = await reorderSections(persistees.map((s) => s.id))
      if (!orderResult.ok) return sortir([], orderResult.error)

      // 4. Sauvegarder chaque section
      for (let i = 0; i < persistees.length; i++) {
        const section = persistees[i]
        const result = await updateSection(section.id, {
          content: section.content,
          variant: section.variant,
          visible: section.visible,
          position: i,
          anchor: section.anchor,
          settings: section.settings,
        })
        if (!result.ok) return sortir([], result.error)
      }

      // 5. Reprendre en local les identifiants attribués par la base
      return sortir([], null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de sauvegarde'
      return sortir(resteASupprimer, message)
    }
  }, [state.sections, state.removedIds, pageId])

  /** Sections résolues dans la langue active (pour le renderer). */
  const resolvedSections = useMemo(() => {
    return state.sections.map((s) => ({
      ...s,
      content: resolveContentObject(s.content, state.locale),
    }))
  }, [state.sections, state.locale])

  return {
    ...state,
    groupMode,
    startGroupMode,
    stopGroupMode,
    select,
    selectById,
    setLocale,
    updateContent,
    setVariant,
    toggleVisibility,
    reorder,
    addSection,
    duplicateSection,
    replaceDraft,
    removeSection,
    save,
    resolvedSections,
  }
}
