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

interface PageEditorProps {
  /** ID de la page à éditer. */
  pageId: string
  /** Sections initiales (chargées depuis la base). */
  initialSections: PageSection[]
  /** Statut de publication : c'est lui qui décide si le public voit le CMS. */
  status: PageStatus
  /** `true` pendant la bascule de publication. */
  publishing: boolean
  /** Bascule brouillon ⇄ publié. */
  onTogglePublish: () => void
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
  publishing,
  onTogglePublish,
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

  /**
   * Publier engage ce qui est EN BASE : `publishPage` relit la page et ses
   * sections depuis la base, pas l'état local de l'éditeur. Une modification
   * non sauvegardée serait donc silencieusement écartée de la publication —
   * le restaurateur publierait autre chose que ce qu'il voit.
   * On sauvegarde donc d'abord, et on s'arrête si la sauvegarde a échoué.
   */
  const handlePublish = async () => {
    if (isPublished) {
      onTogglePublish()
      return
    }
    const saved = await editor.save()
    if (!saved) return
    onTogglePublish()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Barre d'outils */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderBottom: `1px solid ${t.shadow}`, background: t.surface,
      }}>
        <h2 style={{ fontFamily: 'var(--f-heading)', fontSize: 18, fontWeight: 700, color: t.heading, margin: 0, letterSpacing: '-0.02em' }}>
          Modifier le site
        </h2>

        {/*
          État de publication, affiché en permanence.

          ⚠️ CE QUI A CHANGÉ (et pourquoi le libellé a été corrigé)
          Depuis que le public lit `pages.published_snapshot` (migration 030/031),
          il ne voit plus « le contenu de cet éditeur » : il voit la DERNIÈRE
          VERSION PUBLIÉE. Une modification enregistrée mais non publiée reste
          invisible — c'est le flux voulu (TDR §8), mais l'ancien libellé
          promettait autre chose. Un repère faux est pire que pas de repère :
          le restaurateur publierait en croyant que c'est déjà en ligne.

          On ne peut pas afficher « des modifications restent à publier » :
          l'éditeur ne compare pas son état local à la version publiée. La
          formulation est donc choisie pour être VRAIE en toutes circonstances.
        */}
        <span
          title={isPublished
            ? "Les visiteurs voient la dernière version publiée. Vos modifications ne seront visibles qu'après « Publier sur le site »."
            : 'Les visiteurs voient encore l\'ancien site. Publiez pour appliquer vos modifications.'}
          style={{
            fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 100,
            background: isPublished ? `${t.primary}14` : 'rgba(220,38,38,0.08)',
            color: isPublished ? t.primary : '#b91c1c',
            border: `1px solid ${isPublished ? `${t.primary}33` : 'rgba(220,38,38,0.2)'}`,
            whiteSpace: 'nowrap',
          }}
        >
          {isPublished ? '● En ligne' : '○ Brouillon — non visible sur le site'}
        </span>
        {isPublished && (
          <span style={{ fontSize: 11, color: t.muted, whiteSpace: 'nowrap' }}>
            Les visiteurs voient la dernière version publiée.
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/*
            Contrôle avant publication (TDR §24) et historique des versions
            (TDR §23). Le restaurateur doit pouvoir savoir CE QUI BLOQUE et
            retrouver un état antérieur, sans quitter l'éditeur.
          */}
          <button
            onClick={() => setShowPublication((open) => !open)}
            title="Vérifier la page avant publication et consulter les versions enregistrées."
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: `1px solid ${showPublication ? t.primary : t.shadow}`,
              background: showPublication ? `${t.primary}12` : 'transparent',
              color: showPublication ? t.primary : t.text,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            Contrôle et versions
          </button>
          {/* Sélecteur de langue */}
          <div style={{ display: 'flex', gap: 4, background: `${t.primary}0a`, borderRadius: 8, padding: 2 }}>
            {(['fr', 'en'] as const).map((lang) => (
              <button key={lang} onClick={() => editor.setLocale(lang)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: editor.locale === lang ? t.primary : 'transparent',
                color: editor.locale === lang ? '#fff' : t.muted,
                transition: 'all 0.15s',
              }}>{lang.toUpperCase()}</button>
            ))}
          </div>
          {/* Erreur */}
          {editor.error && (
            <span style={{ fontSize: 12, color: '#dc2626', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editor.error}</span>
          )}
          {/* Avertissement — ni une erreur ni un succès : quelque chose reste à faire */}
          {editor.avertissement && !editor.error && (
            <span
              title={editor.avertissement}
              style={{ fontSize: 12, fontWeight: 600, color: '#a16207', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {editor.avertissement}
            </span>
          )}
          {/* Bouton sauvegarder */}
          <button onClick={editor.save} disabled={editor.saving} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: editor.saving ? 'wait' : 'pointer',
            background: editor.saving ? t.muted : t.primary,
            color: '#fff', transition: 'background 0.15s',
          }}>
            {editor.saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
          {/*
            Publier / depublier. C'est L'ACTION qui fait basculer le site public.
            Tant que la page est en brouillon, elle est absente de la lecture
            publique (`pages_public_read` ne sert que les pages publiées) :
            les visiteurs gardent donc l'ancien rendu.
          */}
          <button onClick={handlePublish} disabled={publishing || editor.saving} title={
            isPublished
              ? 'Repasser en brouillon : les visiteurs reverront l\'ancien site.'
              : 'Publier : les visiteurs verront ce contenu.'
          } style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: `1px solid ${isPublished ? t.shadow : t.primary}`,
            cursor: publishing ? 'wait' : 'pointer',
            background: isPublished ? 'transparent' : `${t.primary}12`,
            color: isPublished ? t.text : t.primary,
            transition: 'all 0.15s',
          }}>
            {publishing ? '…' : isPublished ? 'Repasser en brouillon' : 'Publier sur le site'}
          </button>
        </div>
      </div>

      {/* Layout 3 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', flex: 1, overflow: 'hidden' }}>
        {/* Colonne 1 : Structure */}
        <div style={{
          borderRight: `1px solid ${t.shadow}`, background: t.surface,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 14px 8px', fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Structure
          </div>
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
        <div style={{ overflow: 'auto', background: '#f5f5f5' }}>
          <PreviewPane sections={editor.resolvedSections} locale={editor.locale} restaurant={restaurant} />
        </div>

        {/* Colonne 3 : Modifier — ou Contrôle avant publication */}
        <div style={{
          borderLeft: `1px solid ${t.shadow}`, background: t.surface,
          overflow: 'auto',
        }}>
          {showPublication ? (
            <PublicationPanel
              pageId={pageId}
              blockedReport={blockedReport}
              onClose={() => setShowPublication(false)}
            />
          ) : selectedSection ? (
            <PropertyPanel
              section={selectedSection}
              locale={editor.locale}
              onUpdate={(content) => editor.updateContent(editor.selected!, content)}
              onVariantChange={(variant) => editor.setVariant(editor.selected!, variant)}
            />
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: t.muted }}>
              <p style={{ fontSize: 14, margin: 0 }}>Sélectionnez une section pour la modifier.</p>
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
