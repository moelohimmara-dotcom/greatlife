/**
 * Greatlife — CMS : éditeur de pages
 * ===================================
 * Layout 3 colonnes (TDR §10) :
 *   Structure (liste draggable) | Aperçu (renderer) | Modifier (formulaire)
 *
 * Ce composant est le point d'entrée de l'éditeur. Il est intégré dans
 * AdminPanel à la place de l'écran `content` existant.
 */

import { useEffect, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import type { PageSection } from '@/cms/model/section'
import type { PageStatus } from '@/cms/model/page'
import { dispositionBannierePourMiseEnPage, type PageLayout } from '@/cms/model/page-layout'
import { PageLayoutPicker } from './PageLayoutPicker'
import type { PublicationReport } from '@/cms/model/publishing'
import {
  SETTING_KEYS,
  fetchSetting,
  resolveRestaurant,
  toRestaurantSettings,
  type ResolvedRestaurant,
} from '@/cms/repository/settings'
import { useEditor } from './useEditor'
import { SectionList } from './SectionList'
import { PreviewPane } from './PreviewPane'
import { PropertyPanel } from './PropertyPanel'
import { PublicationPanel } from './PublicationPanel'
import { SectionTypePicker } from './SectionTypePicker'
import { anneauFocus, boutonOutil, titreColonne } from './chrome'

interface PageEditorProps {
  /** ID de la page à éditer. */
  pageId: string
  /** Sections initiales (chargées depuis la base). */
  initialSections: PageSection[]
  /** Statut de publication : c'est lui qui décide si le public voit le CMS. */
  status: PageStatus
  layout: PageLayout
  onLayoutChange: (layout: PageLayout) => void
  /** `true` pendant la bascule de publication. */
  publishing: boolean
  /** Met l'instantané en ligne (y compris si la page est déjà publiée). */
  onPublish: () => void
  /** Retire la page du site public (repassage en brouillon). */
  onUnpublish: () => void
  /**
   * Rapport d'une publication refusée par les contrôles du TDR §24.
   * Non nul ⇒ le panneau s'ouvre de lui-même sur ce qui a bloqué.
   */
  blockedReport?: PublicationReport | null
}

export function PageEditor({
  pageId,
  initialSections,
  status,
  layout,
  onLayoutChange,
  publishing,
  onPublish,
  onUnpublish,
  blockedReport = null,
}: PageEditorProps) {
  const { theme: t } = useSite()
  const editor = useEditor(pageId, initialSections)

  /*
    L'APERÇU DOIT MONTRER LES VRAIES COORDONNÉES (revue du 2026-09-20, I-4).

    `PreviewPane` n'était appelé SANS `restaurant` : il retombait donc sur des
    valeurs codées en dur (« Conakry, Guinée », « +224 000 00 00 00 »), et le
    restaurateur voyait dans son propre aperçu un numéro de téléphone qui n'était
    pas le sien. Un aperçu qui ment est pire que pas d'aperçu : c'est sur lui
    qu'on décide de publier (TDR §4).

    On charge donc les réglages réels, une fois, comme le fait le site public
    (`PublicSite` → `fetchSetting`). Tant qu'ils ne sont pas arrivés, l'aperçu
    n'affiche AUCUNE coordonnée inventée — il n'en affiche aucune.
  */
  const [restaurant, setRestaurant] = useState<ResolvedRestaurant | undefined>(undefined)
  useEffect(() => {
    let actif = true
    fetchSetting(SETTING_KEYS.restaurant).then((result) => {
      if (!actif || !result.ok) return
      setRestaurant(resolveRestaurant(toRestaurantSettings(result.data), editor.locale))
    })
    return () => {
      actif = false
    }
  }, [editor.locale])
  const [showPicker, setShowPicker] = useState(false)
  const [showPublication, setShowPublication] = useState(false)

  // Une publication bloquée doit être EXPLIQUÉE, pas seulement refusée.
  useEffect(() => {
    if (blockedReport) setShowPublication(true)
  }, [blockedReport])

  // Section actuellement sélectionnée (objet, pas juste l'index)
  const selectedSection = editor.selected !== null ? editor.sections[editor.selected] : null

  const isPublished = status === 'published'

  const choisirMiseEnPage = (next: PageLayout) => {
    const premiere = editor.sections[0]
    if (premiere?.type === 'hero') {
      const imposee = dispositionBannierePourMiseEnPage(next, premiere.variant)
      if (imposee) editor.setVariant(0, imposee)
    }
    onLayoutChange(next)
  }

  /**
   * Publier engage ce qui est EN BASE : `publishPage` relit la page et ses
   * sections depuis la base, pas l'état local de l'éditeur. Une modification
   * non sauvegardée serait donc silencieusement écartée de la publication —
   * le restaurateur publierait autre chose que ce qu'il voit.
   * On sauvegarde donc d'abord, et on s'arrête si la sauvegarde a échoué.
   */
  /**
   * Publier engage ce qui est EN BASE. On sauvegarde d'abord.
   * Une fois le site déjà en ligne, ce même geste MET À JOUR l'instantané
   * (mise en page comprise) — sans ça, le restaurateur n'avait plus que
   * « Repasser en brouillon » et le public ne bougeait jamais.
   */
  const handlePublish = async () => {
    const saved = await editor.save()
    if (!saved) return
    onPublish()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 0 }}>
      {/* Barre d'outils */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderBottom: `1px solid ${t.shadow}`, background: t.surface,
        flexWrap: 'wrap',
      }}>
        <span
          title={isPublished
            ? "Les visiteurs voient la dernière version mise en ligne. Pour qu'une mise en page ou un texte les atteigne, cliquez « Mettre à jour le site »."
            : 'Les visiteurs voient encore l’ancien site. Publiez pour appliquer vos modifications.'}
          style={{
            fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 100,
            minHeight: 44, display: 'inline-flex', alignItems: 'center',
            background: isPublished ? `${t.primary}14` : `${t.accent}14`,
            color: isPublished ? t.primary : t.accent,
            border: `1px solid ${isPublished ? `${t.primary}33` : `${t.accent}44`}`,
            whiteSpace: 'nowrap',
          }}
        >
          {isPublished ? 'En ligne' : 'Brouillon, pas encore sur le site'}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/*
            Contrôle avant publication (TDR §24) et historique des versions
            (TDR §23). Le restaurateur doit pouvoir savoir CE QUI BLOQUE et
            retrouver un état antérieur, sans quitter l'éditeur.
          */}
          <button
            type="button"
            onClick={() => setShowPublication((open) => !open)}
            aria-pressed={showPublication}
            aria-expanded={showPublication}
            title="Vérifier la page avant publication et consulter les versions enregistrées."
            style={boutonOutil(t, { actif: showPublication, disabled: false })}
            {...anneauFocus(t)}
          >
            Contrôle et versions
          </button>
          <div role="group" aria-label="Langue de l’aperçu" style={{ display: 'flex', gap: 8 }}>
            {([
              { id: 'fr' as const, label: 'Français' },
              { id: 'en' as const, label: 'English' },
            ]).map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => editor.setLocale(lang.id)}
                aria-pressed={editor.locale === lang.id}
                style={boutonOutil(t, { actif: editor.locale === lang.id, primaire: editor.locale === lang.id })}
                {...anneauFocus(t)}
              >
                {lang.label}
              </button>
            ))}
          </div>
          {editor.error && (
            <span role="alert" style={{ fontSize: 13, color: t.accent, maxWidth: 280 }}>{editor.error}</span>
          )}
          {editor.avertissement && !editor.error && (
            <span role="status" title={editor.avertissement} style={{ fontSize: 13, fontWeight: 600, color: t.gold, maxWidth: 280 }}>
              {editor.avertissement}
            </span>
          )}
          <button
            type="button"
            onClick={editor.save}
            disabled={editor.saving}
            style={boutonOutil(t, { disabled: editor.saving })}
            {...anneauFocus(t)}
          >
            {editor.saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || editor.saving}
            title={isPublished
              ? 'Les visiteurs verront la mise en page et les textes de cet écran.'
              : 'Publier : les visiteurs verront ce contenu.'}
            style={boutonOutil(t, { primaire: true, disabled: publishing || editor.saving })}
            {...anneauFocus(t)}
          >
            {publishing ? 'Publication…' : isPublished ? 'Mettre à jour le site' : 'Publier sur le site'}
          </button>
          {isPublished && (
            <button
              type="button"
              onClick={onUnpublish}
              disabled={publishing || editor.saving}
              title="Retirer cette version : les visiteurs reverront l’ancien site."
              style={boutonOutil(t, { danger: true, disabled: publishing || editor.saving })}
              {...anneauFocus(t)}
            >
              Retirer du site
            </button>
          )}
        </div>
      </div>

      {/* Layout 3 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', flex: 1, overflow: 'hidden' }}>
        {/* Colonne 1 : Structure */}
        <div style={{
          borderRight: `1px solid ${t.shadow}`, background: t.surface,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 14px 8px', ...titreColonne(t) }}>
            Structure
          </div>
          <PageLayoutPicker value={layout} onChange={choisirMiseEnPage} disabled={editor.saving} />
          <SectionList
            sections={editor.sections}
            selected={editor.selected}
            onSelect={editor.select}
            onReorder={editor.reorder}
            onToggleVisibility={editor.toggleVisibility}
            onRemove={editor.removeSection}
            onAdd={() => setShowPicker(true)}
          />
        </div>

        {/* Colonne 2 : Aperçu */}
        <div style={{ overflow: 'hidden', background: t.bg }}>
          <PreviewPane sections={editor.resolvedSections} locale={editor.locale} restaurant={restaurant} layout={layout} />
        </div>

        <div style={{
          borderLeft: `1px solid ${t.shadow}`, background: t.surface,
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ height: '100%', overflow: 'auto' }}>
            {selectedSection ? (
              <PropertyPanel
                section={selectedSection}
                locale={editor.locale}
                pageLayout={layout}
                onUpdate={(content) => editor.updateContent(editor.selected!, content)}
                onVariantChange={(variant) => editor.setVariant(editor.selected!, variant)}
              />
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: t.muted }}>
                <p style={{ fontSize: 14, margin: 0 }}>Sélectionnez une section pour la modifier.</p>
              </div>
            )}
          </div>
          {showPublication && (
            <div
              style={{ position: 'absolute', inset: 0, background: t.surface, zIndex: 2, overflow: 'auto' }}
              role="region"
              aria-label="Contrôle avant publication"
            >
              <PublicationPanel
                pageId={pageId}
                blockedReport={blockedReport}
                onClose={() => setShowPublication(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sélecteur de type (modal) */}
      {showPicker && (
        <SectionTypePicker
          onSelect={(type) => { editor.addSection(type); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
