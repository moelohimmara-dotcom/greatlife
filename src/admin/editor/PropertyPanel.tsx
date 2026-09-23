/**
 * Greatlife — CMS : panneau de propriétés
 * =========================================
 * Colonne « Modifier » de l'éditeur.
 * Génère dynamiquement un formulaire de modification pour la section sélectionnée,
 * à partir des champs déclarés dans le registre (`schemas.ts`).
 *
 * Chaque type de champ a un composant d'édition dédié :
 * - text → input texte
 * - multiline → textarea
 * - number → input number
 * - select → select (liste déroulante)
 * - list → éditeur de liste (ajout/suppression d'éléments)
 * - group → sous-formulaire imbriqué
 * - image → input URL (placeholder Lot 6)
 */

import { useCallback, useEffect, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { FieldLabel, GhostButton, inputStyle } from '@/admin/ui'
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import { getSectionDefinition, defaultVariant } from '@/cms/model/sections/schemas'
import {
  clampFieldNumber,
  hasNumericBounds,
  parseFieldNumber,
  champEstAltImage,
  nomChampAltImage,
  type FieldDef,
} from '@/cms/model/sections/fields'
import { dispositionBannierePourMiseEnPage, type PageLayout } from '@/cms/model/page-layout'
import {
  Bouton,
  ESPACE,
  TiroirInspecteur,
  anneauFocus,
  ADMIN_ACTIVE_BG,
  ADMIN_ACTIVE_BG_SOFT,
  ADMIN_CORAL,
  ADMIN_FOREST,
  ADMIN_INK,
  ADMIN_LINE,
  ADMIN_MUTED,
} from './chrome'
import { TextToolbox } from './TextToolbox'
import { ColorControl } from './ColorPicker'
import { sanitiserHex } from '@/cms/model/sections/couleur'
import type { ThemePalette } from '@/config/themes'
import {
  canGroup,
  canLock,
  canPatchSlot,
  canUngroup,
  colorFieldForSlot,
  findGroupForSlot,
  groupSelection,
  lockGroup,
  markupProfileForField,
  readEditorMeta,
  renameGroup,
  showsGroupProperties,
  slotablesFromFields,
  ungroup,
  unlock,
  type EditorGroup,
  type EditorMeta,
  type GroupDecision,
  type SelectionState,
} from '@/cms/model/subblocks'
import type { CibleApercu } from './inplace-dom'

interface PropertyPanelProps {
  section: PageSection
  locale: Locale
  onUpdate: (content: Record<string, unknown>) => void
  onVariantChange: (variant: string | null) => void
  pageLayout?: PageLayout
  selection?: SelectionState
  onSelectionChange?: (next: SelectionState) => void
  groupMode?: boolean
  onStartGroupMode?: () => void
  onStopGroupMode?: () => void
  eviterFocusChamp?: boolean
  cibleApercu?: CibleApercu | null
}

export function PropertyPanel({
  section,
  locale,
  onUpdate,
  onVariantChange,
  pageLayout,
  selection,
  onSelectionChange,
  groupMode = false,
  onStartGroupMode,
  onStopGroupMode,
  eviterFocusChamp = false,
  cibleApercu = null,
}: PropertyPanelProps) {
  const { theme: t } = useSite()
  const [avisOutil, setAvisOutil] = useState<string | null>(null)
  const def = getSectionDefinition(section.type)
  const content = section.content ?? {}
  const banniereImposee =
    section.type === 'hero' && pageLayout
      ? dispositionBannierePourMiseEnPage(pageLayout, section.variant)
      : null
  const dispositionAffichee = banniereImposee ?? section.variant

  if (!def) return null

  const visibles = def.fields.filter((field) => champVisible(field, dispositionAffichee, section.type))
  const champsContenuAffiches = visibles.filter((f) => familleChamp(f, visibles) === 'contenu')
  const champsMedia = visibles.filter((f) => familleChamp(f, visibles) === 'media')
  const champsAction = visibles.filter((f) => familleChamp(f, visibles) === 'action')
  const champsSeo = visibles.filter((f) => familleChamp(f, visibles) === 'seo')
  const champsOptions = visibles.filter((f) => familleChamp(f, visibles) === 'options')
  const meta = readEditorMeta(content)
  const slotSeul = selection?.slots.length === 1 ? selection.slots[0] : null
  const groupeActif = selection ? groupeDeSelection(selection, meta) : undefined
  const panneauGroupe = Boolean(selection && showsGroupProperties(selection, content))
  const decisionGrouper = selection
    ? canGroup(content, selection.slots, selection.surface)
    : { ok: false, reason: 'need-two' as const }
  const peutGrouper = decisionGrouper.ok
  const decisionDegrouper = groupeActif
    ? canUngroup(content, groupeActif.id)
    : { ok: false, reason: 'missing' as const }
  const decisionBloquer = groupeActif
    ? canLock(content, groupeActif.id)
    : { ok: false, reason: 'missing' as const }
  const titreDegrouper = decisionDegrouper.ok
    ? 'Dégrouper'
    : motifDecision(decisionDegrouper, 'degrouper')
  const titreBloquer = decisionBloquer.ok
    ? 'Les membres restent ensemble'
    : motifDecision(decisionBloquer, 'bloquer')

  const nature: 'groupe' | 'emplacement' | 'bloc' = panneauGroupe
    ? 'groupe'
    : slotSeul
      ? 'emplacement'
      : 'bloc'

  const champFocus = slotSeul
    ? [...champsContenuAffiches, ...champsMedia, ...champsAction, ...champsSeo, ...champsOptions]
      .find((f) => f.name === slotSeul)
    : undefined
  const focusFamille = champFocus ? familleChamp(champFocus, visibles) : null
  const focusDansContenu = focusFamille === 'contenu'
  const focusDansMedia = focusFamille === 'media'
  const focusDansAction = focusFamille === 'action'
  const focusDansSeo = focusFamille === 'seo'
  const focusDansOptions = focusFamille === 'options'
  const autresContenu = champFocus && focusDansContenu
    ? champsContenuAffiches.filter((f) => f.name !== champFocus.name)
    : champsContenuAffiches
  const outilsGroupeUtiles = groupMode
    || panneauGroupe
    || meta.groups.length > 0
    || (selection != null && selection.slots.length >= 2)

  const champsSelection = selection && selection.surface === 'page'
    ? slotablesFromFields(visibles).filter((f) =>
      selection.slots.includes(f.name) && (f.type === 'text' || f.type === 'multiline' || f.name.endsWith('Cta')),
    )
    : []

  const setField = useCallback((name: string, value: unknown) => {
    if (!canPatchSlot(content, name)) return
    onUpdate({ ...content, [name]: value })
  }, [content, onUpdate])

  useEffect(() => {
    setAvisOutil(null)
  }, [selection?.slots.join('|'), selection?.groupId, section.id, groupMode])

  useEffect(() => {
    if (!slotSeul || eviterFocusChamp) return
    const el = document.querySelector(`[data-cms-field="${CSS.escape(slotSeul)}"]`)
    if (!(el instanceof HTMLElement)) return
    el.scrollIntoView({ block: 'nearest' })
    const cible = el.querySelector('input, textarea, [contenteditable="true"]')
    if (cible instanceof HTMLElement) cible.focus()
  }, [slotSeul, section.id, locale, eviterFocusChamp])

  const appliquerGrouper = () => {
    if (groupMode) {
      onStopGroupMode?.()
      return
    }
    if (selection && peutGrouper) {
      const next = groupSelection(content, selection.slots, {
        id: `g-${selection.slots.join('_')}`,
        label: 'Groupe',
      })
      onUpdate(next)
      const created = readEditorMeta(next).groups.find((g) =>
        g.slots.length === selection.slots.length && selection.slots.every((s) => g.slots.includes(s)),
      )
      onSelectionChange?.({
        surface: 'page',
        sectionId: selection.sectionId,
        slots: created?.slots ?? selection.slots,
        groupId: created?.id ?? null,
      })
      return
    }
    onStartGroupMode?.()
  }

  const rendreChamp = (field: FieldDef) => {
    const couleur = colorFieldForSlot(def.fields, field.name)
    const teinte = couleur && typeof content[couleur.name] === 'string'
      ? sanitiserHex(content[couleur.name] as string) ?? undefined
      : undefined
    return (
      <div key={field.name} data-cms-field={field.name}>
        <FieldEditor
          field={field}
          value={content[field.name]}
          locale={locale}
          locked={!canPatchSlot(content, field.name)}
          profile={markupProfileForField(field) === 'rich' ? 'rich' : markupProfileForField(field) === 'inline' ? 'inline' : undefined}
          slotColor={teinte}
          inheritedColor={couleur ? teinteParDefaut(couleur, t) : undefined}
          onSlotColorChange={couleur
            ? (hex) => { if (canPatchSlot(content, couleur.name)) onUpdate({ ...content, [couleur.name]: hex ?? '' }) }
            : undefined}
          cibleApercu={slotSeul === field.name ? cibleApercu : null}
          altValue={undefined}
          onAltChange={undefined}
          onChange={(v) => setField(field.name, v)}
        />
      </div>
    )
  }

  const rendreGroupeChamps = (
    id: string,
    titre: string,
    icone: string | undefined,
    champs: FieldDef[],
    opts: { ouvertParDefaut?: boolean; forcerOuvert?: boolean; focusIci?: boolean },
  ) => {
    if (champs.length === 0 && !(champFocus && opts.focusIci)) return null
    const autres = champFocus && opts.focusIci
      ? champs.filter((f) => f.name !== champFocus.name)
      : champs
    return (
      <TiroirInspecteur
        id={id}
        titre={titre}
        icone={icone}
        ouvertParDefaut={opts.ouvertParDefaut}
        forcerOuvert={opts.forcerOuvert}
        compte={champs.length}
      >
        {champFocus && opts.focusIci && rendreChamp(champFocus)}
        {nature === 'emplacement' && opts.focusIci && autres.length > 0 ? (
          <TiroirInspecteur
            id={`autres-${id}`}
            titre={`Autres — ${titre}`}
            ouvertParDefaut={false}
            compte={autres.length}
          >
            {autres.map(rendreChamp)}
          </TiroirInspecteur>
        ) : !(champFocus && opts.focusIci) ? (
          champs.map(rendreChamp)
        ) : null}
      </TiroirInspecteur>
    )
  }

  return (
    <div className="admin-inspector-panel">
      <div className="admin-inspector-lead">
        <div className="admin-editor-col-title admin-inspector-block-title">
          {def.label}
        </div>
        <div className="admin-editor-col-sub">
          {nature === 'emplacement' && champFocus
            ? (champFocus.type === 'list'
              ? `Liste sélectionnée : ${champFocus.label}`
              : champFocus.type === 'group' && /cta/i.test(champFocus.name)
                ? `Bouton sélectionné : ${champFocus.label}`
                : champFocus.type === 'group'
                  ? `Élément sélectionné : ${champFocus.label}`
                  : `Texte sélectionné : ${champFocus.label}`)
            : nature === 'groupe'
              ? 'Groupe de textes sélectionné'
              : def.description}
        </div>
      </div>

      {champsSelection.length > 0 && (
        <div
          role="status"
          aria-label="Sélection"
          className="admin-inspector-chips"
        >
          {champsSelection.map((f) => (
            <span
              key={f.name}
              title={f.label}
              className="admin-inspector-chip"
            >
              {f.label}
            </span>
          ))}
        </div>
      )}

      {outilsGroupeUtiles && (
        <TiroirInspecteur
          id="groupe"
          titre="Groupe"
          icone="group"
          ouvertParDefaut={groupMode || panneauGroupe}
          forcerOuvert={nature === 'groupe' || groupMode}
        >
          <div role="toolbar" aria-label="Actions de groupe" style={{ display: 'flex', flexWrap: 'wrap', gap: ESPACE, marginBottom: ESPACE }}>
            <Bouton
              genre={groupMode ? 'actif' : 'secondaire'}
              aria-pressed={groupMode}
              aria-label="Grouper"
              title={groupMode
                ? 'Cliquez de nouveau pour quitter le mode grouper (Ctrl+G)'
                : peutGrouper
                  ? 'Grouper les textes sélectionnés (Ctrl+G)'
                  : 'Cliquez ici puis deux textes dans l’aperçu (Ctrl+G)'}
              onClick={appliquerGrouper}
            >
              {Icon.group(16, ADMIN_INK)} Grouper
            </Bouton>
            {meta.groups.length > 0 && (
              <>
                <Bouton
                  genre="silencieux"
                  aria-label="Dégrouper"
                  title={decisionDegrouper.ok ? titreDegrouper : 'Sélectionnez un groupe d’abord'}
                  onClick={() => {
                    if (!groupeActif) {
                      setAvisOutil('Sélectionnez un groupe d’abord')
                      return
                    }
                    if (!decisionDegrouper.ok) {
                      setAvisOutil(titreDegrouper)
                      return
                    }
                    onUpdate(ungroup(content, groupeActif.id))
                    if (selection) onSelectionChange?.({ ...selection, groupId: null })
                  }}
                >
                  {Icon.ungroup(16, ADMIN_INK)} Dégrouper
                </Bouton>
                <Bouton
                  genre="silencieux"
                  aria-label="Bloquer le groupe"
                  title={titreBloquer}
                  onClick={() => {
                    if (!groupeActif || !decisionBloquer.ok) {
                      setAvisOutil(titreBloquer || 'Sélectionnez un groupe d’abord')
                      return
                    }
                    onUpdate(lockGroup(content, groupeActif.id, 'group'))
                  }}
                >
                  {Icon.lock(16, ADMIN_INK)} Bloquer
                </Bouton>
              </>
            )}
          </div>
          <p role="status" style={{ fontSize: 12, color: avisOutil ? ADMIN_CORAL : ADMIN_MUTED, margin: '0 0 8px', lineHeight: 1.4 }}>
            {avisOutil
              ?? (groupMode
                ? 'Cliquez deux textes dans l’aperçu.'
                : 'Pour regrouper : ouvrez ce tiroir, puis cliquez deux textes dans l’aperçu.')}
          </p>
          {groupeActif ? (
            <>
              <FieldLabel htmlFor="groupe-libelle">Nom du groupe</FieldLabel>
              <input
                id="groupe-libelle"
                value={groupeActif.label}
                onChange={(e) => onUpdate(renameGroup(content, groupeActif.id, e.target.value))}
                style={inputStyle(t)}
                {...anneauFocus(t)}
              />
              <p style={{ fontSize: 12, color: ADMIN_MUTED, margin: '8px 0 0', lineHeight: 1.4 }}>
                {groupeActif.lock === 'group'
                  ? 'Groupe bloqué : les textes restent ensemble. Débloquez pour dégrouper.'
                  : 'Les textes de ce groupe restent ensemble dans ce bloc.'}
              </p>
              {groupeActif.lock === 'group' && (
                <Bouton
                  style={{ marginTop: 8 }}
                  genre="silencieux"
                  aria-label="Débloquer le groupe"
                  onClick={() => onUpdate(unlock(content, groupeActif.id))}
                >
                  {Icon.unlock(16, ADMIN_INK)} Débloquer
                </Bouton>
              )}
            </>
          ) : panneauGroupe ? (
            <p style={{ fontSize: 13, color: ADMIN_MUTED, margin: 0, lineHeight: 1.4 }}>
              Plusieurs textes sont sélectionnés. Cliquez Grouper pour les garder ensemble.
            </p>
          ) : null}
        </TiroirInspecteur>
      )}

      {def.variants.length > 0 && (
        <TiroirInspecteur
          id="disposition"
          titre="Disposition"
          icone="columns"
          ouvertParDefaut={nature === 'bloc'}
        >
          <FieldLabel>Mise en page du bloc</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {def.variants.map((v) => {
              const interdit = Boolean(banniereImposee) && v.id !== 'fullscreen' && v.id !== 'video'
              const actif = dispositionAffichee === v.id
              return (
                <GhostButton
                  key={v.id}
                  disabled={interdit}
                  color={actif ? ADMIN_FOREST : ADMIN_INK}
                  aria-pressed={actif}
                  title={interdit ? 'Cette mise en page affiche la bannière en plein écran. Pour Image + texte, choisissez Colonne unique.' : undefined}
                  onClick={() => { if (!interdit) onVariantChange(v.id) }}
                  style={actif ? { background: ADMIN_ACTIVE_BG, borderColor: ADMIN_FOREST } : undefined}
                >
                  {v.label}
                </GhostButton>
              )
            })}
          </div>
          {banniereImposee && (
            <p style={{ fontSize: 12, color: ADMIN_MUTED, lineHeight: 1.4, margin: '8px 0 0' }}>
              Cette mise en page affiche la bannière en plein écran. Vous pouvez garder Vidéo. Pour Image + texte ou Centré, choisissez Colonne unique.
            </p>
          )}
        </TiroirInspecteur>
      )}

      {(champsContenuAffiches.length > 0 || (champFocus && focusDansContenu)) && (
        <TiroirInspecteur
          id="contenu"
          titre="Contenu"
          icone="write"
          ouvertParDefaut={nature !== 'groupe' || focusDansContenu}
          forcerOuvert={nature === 'emplacement' && focusDansContenu}
          compte={champsContenuAffiches.length}
        >
          {champFocus && focusDansContenu && (
            <div style={{ marginBottom: autresContenu.length > 0 ? 12 : 0 }}>
              {rendreChamp(champFocus)}
            </div>
          )}
          {nature === 'emplacement' && focusDansContenu && autresContenu.length > 0 ? (
            <TiroirInspecteur
              id="autres-contenu"
              titre="Autres contenus"
              ouvertParDefaut={false}
              compte={autresContenu.length}
            >
              {autresContenu.map(rendreChamp)}
            </TiroirInspecteur>
          ) : !(champFocus && focusDansContenu) ? (
            champsContenuAffiches.map(rendreChamp)
          ) : null}
        </TiroirInspecteur>
      )}

      {rendreGroupeChamps('media', 'Média', 'image', champsMedia, {
        ouvertParDefaut: nature === 'bloc' && champsContenuAffiches.length === 0,
        forcerOuvert: nature === 'emplacement' && focusDansMedia,
        focusIci: focusDansMedia,
      })}

      {rendreGroupeChamps('action', 'Action', 'link', champsAction, {
        ouvertParDefaut: false,
        forcerOuvert: nature === 'emplacement' && focusDansAction,
        focusIci: focusDansAction,
      })}

      {rendreGroupeChamps('seo', 'SEO & accessibilité', 'search', champsSeo, {
        ouvertParDefaut: false,
        forcerOuvert: nature === 'emplacement' && focusDansSeo,
        focusIci: focusDansSeo,
      })}

      {champsOptions.length > 0 && (
        <TiroirInspecteur
          id="options"
          titre="Options"
          icone="more"
          ouvertParDefaut={nature === 'bloc' && champsContenuAffiches.length === 0 && champsMedia.length === 0}
          forcerOuvert={nature === 'emplacement' && focusDansOptions}
          compte={champsOptions.length}
        >
          {champFocus && focusDansOptions ? (
            <>
              {rendreChamp(champFocus)}
              {champsOptions.filter((f) => f.name !== champFocus.name).length > 0 && (
                <TiroirInspecteur
                  id="autres-options"
                  titre="Autres options"
                  ouvertParDefaut={false}
                  compte={champsOptions.length - 1}
                >
                  {champsOptions.filter((f) => f.name !== champFocus.name).map(rendreChamp)}
                </TiroirInspecteur>
              )}
            </>
          ) : (
            champsOptions.map((field) => (
              <div key={field.name} data-cms-field={field.name}>
                <FieldEditor
                  field={field}
                  value={content[field.name]}
                  locale={locale}
                  locked={!canPatchSlot(content, field.name)}
                  onChange={(v) => setField(field.name, v)}
                />
              </div>
            ))
          )}
        </TiroirInspecteur>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Éditeur de champ générique                                          */
/* ------------------------------------------------------------------ */

interface FieldEditorProps {
  field: FieldDef
  value: unknown
  locale: Locale
  onChange: (value: unknown) => void
  idPrefix?: string
  locked?: boolean
  profile?: 'inline' | 'rich'
  slotColor?: string
  inheritedColor?: string
  onSlotColorChange?: (hex: string | undefined) => void
  cibleApercu?: CibleApercu | null
  altValue?: unknown
  onAltChange?: (value: unknown) => void
}

function FieldEditor({ field, value, locale, onChange, idPrefix, locked, profile, slotColor, inheritedColor, onSlotColorChange, cibleApercu, altValue, onAltChange }: FieldEditorProps) {
  switch (field.type) {
    case 'text':
      return <TextField field={field} value={value} locale={locale} onChange={onChange} idPrefix={idPrefix} locked={locked} profile={profile} slotColor={slotColor} inheritedColor={inheritedColor} onSlotColorChange={onSlotColorChange} cibleApercu={cibleApercu} />
    case 'multiline':
      return <MultilineField field={field} value={value} locale={locale} onChange={onChange} idPrefix={idPrefix} locked={locked} profile={profile} slotColor={slotColor} inheritedColor={inheritedColor} onSlotColorChange={onSlotColorChange} cibleApercu={cibleApercu} />
    case 'number':
      return <NumberField field={field} value={value} onChange={onChange} idPrefix={idPrefix} />
    case 'select':
      return <SelectField field={field} value={value} onChange={onChange} idPrefix={idPrefix} />
    case 'list':
      return <ListField field={field} value={value} locale={locale} onChange={onChange} idPrefix={idPrefix} />
    case 'group':
      return <GroupField field={field} value={value} locale={locale} onChange={onChange} idPrefix={idPrefix} locked={locked} />
    case 'image':
      return <ImageField field={field} value={value} locale={locale} onChange={onChange} idPrefix={idPrefix} altValue={altValue} onAltChange={onAltChange} />
    case 'video':
      return <VideoField field={field} value={value} onChange={onChange} idPrefix={idPrefix} />
    case 'color':
      return <ColorField field={field} value={value} onChange={onChange} />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* Champs individuels                                                  */
/* ------------------------------------------------------------------ */

function TextField({ field, value, locale, onChange, idPrefix, locked, profile, slotColor, inheritedColor, onSlotColorChange, cibleApercu }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void; idPrefix?: string; locked?: boolean; profile?: 'inline' | 'rich'; slotColor?: string; inheritedColor?: string; onSlotColorChange?: (hex: string | undefined) => void; cibleApercu?: CibleApercu | null }) {
  const { theme: t } = useSite()
  const inputId = champId(idPrefix, field.name, locale)
  const hint = locale === 'fr' ? 'Texte en français' : 'Text in English'
  const markup = profile ?? (field.inlineMarkup ? 'inline' : undefined)

  if (field.translatable !== false) {
    const obj = asTranslation(value)
    if (field.inlineMarkup) {
      return (
        <TextToolbox
          id={inputId}
          label={`${field.label}${field.required ? ' *' : ''}`}
          localeHint={hint}
          help={field.help}
          value={obj[locale]}
          disabled={locked}
          profile={markup === 'rich' ? 'rich' : 'inline'}
          slotColor={slotColor}
          inheritedColor={inheritedColor}
          onSlotColorChange={onSlotColorChange}
          cibleApercu={cibleApercu}
          onChange={(next) => onChange({ ...obj, [locale]: next })}
        />
      )
    }
    return (
      <div style={{ marginBottom: 14 }}>
        <FieldLabel htmlFor={inputId}>{field.label}{field.required ? ' *' : ''}</FieldLabel>
        <div style={{ fontSize: 12, color: ADMIN_MUTED, marginBottom: 4 }}>
          {hint}
        </div>
        <input
          id={inputId}
          value={obj[locale]}
          disabled={locked}
          onChange={(e) => onChange({ ...obj, [locale]: e.target.value })}
          style={inputStyle(t)}
          {...anneauFocus(t)}
        />
        {field.help && <div style={{ fontSize: 12, color: ADMIN_MUTED, marginTop: 4 }}>{field.help}</div>}
      </div>
    )
  }

  const resolved = resolveValue(value, locale)
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel htmlFor={inputId}>{field.label}{field.required ? ' *' : ''}</FieldLabel>
      <input id={inputId} value={typeof resolved === 'string' ? resolved : ''} onChange={(e) => onChange(e.target.value)} style={inputStyle(t)} {...anneauFocus(t)} />
      {field.help && <div style={{ fontSize: 12, color: ADMIN_MUTED, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function MultilineField({ field, value, locale, onChange, idPrefix, locked, profile, slotColor, inheritedColor, onSlotColorChange, cibleApercu }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void; idPrefix?: string; locked?: boolean; profile?: 'inline' | 'rich'; slotColor?: string; inheritedColor?: string; onSlotColorChange?: (hex: string | undefined) => void; cibleApercu?: CibleApercu | null }) {
  const { theme: t } = useSite()
  const inputId = champId(idPrefix, field.name, `ml-${locale}`)
  const hint = locale === 'fr' ? 'Texte en français' : 'Text in English'

  if (field.translatable !== false) {
    const obj = asTranslation(value)
    if (field.inlineMarkup) {
      return (
        <TextToolbox
          id={inputId}
          label={`${field.label}${field.required ? ' *' : ''}`}
          localeHint={hint}
          help={field.help}
          multiline
          disabled={locked}
          profile={profile ?? 'rich'}
          slotColor={slotColor}
          inheritedColor={inheritedColor}
          onSlotColorChange={onSlotColorChange}
          cibleApercu={cibleApercu}
          value={obj[locale]}
          onChange={(next) => onChange({ ...obj, [locale]: next })}
        />
      )
    }
    return (
      <div style={{ marginBottom: 14 }}>
        <FieldLabel htmlFor={inputId}>{field.label}{field.required ? ' *' : ''}</FieldLabel>
        <div style={{ fontSize: 12, color: ADMIN_MUTED, marginBottom: 4 }}>
          {hint}
        </div>
        <textarea
          id={inputId}
          value={obj[locale]}
          disabled={locked}
          onChange={(e) => onChange({ ...obj, [locale]: e.target.value })}
          rows={3}
          style={{ ...inputStyle(t), fontSize: 13, resize: 'vertical', minHeight: 72 }}
          {...anneauFocus(t)}
        />
      </div>
    )
  }

  const resolved = resolveValue(value, locale)
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel htmlFor={inputId}>{field.label}{field.required ? ' *' : ''}</FieldLabel>
      <textarea id={inputId} value={typeof resolved === 'string' ? resolved : ''} onChange={(e) => onChange(e.target.value)}
        rows={3} style={{ ...inputStyle(t), resize: 'vertical', minHeight: 72 }} {...anneauFocus(t)} />
    </div>
  )
}

function NumberField({ field, value, onChange, idPrefix }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; idPrefix?: string }) {
  const { theme: t } = useSite()
  const inputId = champId(idPrefix, field.name)
  const sliderId = champId(idPrefix, field.name, 'curseur')
  const parsed = parseFieldNumber(value)
  const facultatif = field.required !== true
  const vide = parsed === null
  const borne = hasNumericBounds(field)
  const min = field.min ?? 0
  const max = field.max ?? 100
  const step = field.step && field.step > 0 ? field.step : 1
  const affiche = vide ? (facultatif ? '' : min) : parsed
  const curseur = vide ? min : clampFieldNumber(field, parsed)
  const unite = field.unit ? ` ${field.unit}` : ''

  const ecrire = (n: number | null) => {
    if (n === null) {
      onChange(null)
      return
    }
    onChange(clampFieldNumber(field, n))
  }

  const messageBorne = !vide && borne && (parsed < min || parsed > max)
    ? `Choisissez un nombre entre ${min} et ${max}${unite}.`
    : null

  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel htmlFor={inputId}>{field.label}</FieldLabel>
      {vide && facultatif ? (
        <div>
          <p style={{ fontSize: 13, color: ADMIN_MUTED, margin: '0 0 8px', lineHeight: 1.4 }}>
            {field.unit === 'plats' || field.unit === 'articles'
              ? `Tous les ${field.unit} sont affichés.`
              : 'Aucune limite : tout est affiché.'}
          </p>
          <GhostButton color={ADMIN_FOREST} onClick={() => ecrire(clampFieldNumber(field, field.max ? Math.min(12, field.max) : 12))}>
            Limiter
          </GhostButton>
        </div>
      ) : (
        <>
          {borne && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Bouton
                carre
                disabled={curseur <= min}
                aria-label="Diminuer"
                onClick={() => ecrire(curseur - step)}
              >
                −
              </Bouton>
              <input
                id={sliderId}
                className="admin-focus admin-range"
                type="range"
                min={min}
                max={max}
                step={step}
                value={curseur}
                aria-label={field.label}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={curseur}
                aria-valuetext={`${curseur}${unite}`}
                onChange={(e) => ecrire(e.target.valueAsNumber)}
                style={{ flex: 1, minWidth: 0 }}
              />
              <Bouton
                carre
                disabled={curseur >= max}
                aria-label="Augmenter"
                onClick={() => ecrire(curseur + step)}
              >
                +
              </Bouton>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id={inputId}
              type="number"
              min={field.min}
              max={field.max}
              step={step}
              value={affiche}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '' && facultatif) {
                  ecrire(null)
                  return
                }
                const n = e.target.valueAsNumber
                if (Number.isNaN(n)) return
                ecrire(n)
              }}
              style={{ ...inputStyle(t), flex: 1 }}
              {...anneauFocus(t)}
            />
            {field.unit && <span style={{ fontSize: 13, color: ADMIN_MUTED, flexShrink: 0 }}>{field.unit}</span>}
          </div>
          {facultatif && !vide && (
            <GhostButton color={ADMIN_MUTED} onClick={() => ecrire(null)} style={{ marginTop: 8 }}>
              Tout afficher
            </GhostButton>
          )}
        </>
      )}
      {messageBorne && (
        <div id={`${inputId}-erreur`} role="status" style={{ fontSize: 12, color: ADMIN_CORAL, marginTop: 4 }}>
          {messageBorne}
        </div>
      )}
      {field.help && <div style={{ fontSize: 12, color: ADMIN_MUTED, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function SelectField({ field, value, onChange, idPrefix }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; idPrefix?: string }) {
  const { theme: t } = useSite()
  const inputId = champId(idPrefix, field.name)
  const brut = typeof value === 'string' ? value.trim().replace(/^#/, '') : ''
  const options = [...(field.options ?? [])]
  if (brut && !options.some((o) => o.value === brut)) {
    options.unshift({ value: brut, label: brut })
  }
  const actuel = brut && options.some((o) => o.value === brut)
    ? brut
    : (field.name === 'spacing' ? 'normal' : field.name === 'visibleOn' ? 'all' : field.name === 'target' ? (options[0]?.value ?? '') : '')
  const presets = options.length > 0 && options.length <= 8 && field.name !== 'target'

  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel htmlFor={presets ? undefined : inputId}>{field.label}</FieldLabel>
      {presets ? (
        <div role="group" aria-label={field.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {options.map((o) => {
            const actif = actuel === o.value
            return (
              <GhostButton
                key={o.value}
                color={actif ? ADMIN_FOREST : ADMIN_INK}
                aria-pressed={actif}
                onClick={() => onChange(o.value)}
                style={actif ? { background: ADMIN_ACTIVE_BG, borderColor: ADMIN_FOREST } : undefined}
              >
                {o.label}
              </GhostButton>
            )
          })}
        </div>
      ) : (
        <select id={inputId} value={actuel} onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle(t), cursor: 'pointer' }} {...anneauFocus(t)}>
          {field.name !== 'target' && <option value="">Choisir</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {field.help && <div style={{ fontSize: 12, color: ADMIN_MUTED, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function ListField({ field, value, locale, onChange, idPrefix }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void; idPrefix?: string }) {
  const items = Array.isArray(value) ? value : []

  const addItem = () => {
    if (field.itemType) {
      const vide = field.itemType === 'text' || field.itemType === 'multiline'
        ? (field.translatable !== false ? { fr: '', en: '' } : '')
        : ''
      onChange([...items, vide])
    } else if (field.itemFields) {
      const obj: Record<string, unknown> = {}
      for (const f of field.itemFields) {
        obj[f.name] = (f.type === 'text' || f.type === 'multiline') && f.translatable !== false
          ? { fr: '', en: '' }
          : ''
      }
      onChange([...items, obj])
    }
  }

  const removeItem = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i))
  }

  /** Alternative clavier / bouton au drag (WCAG 2.2 — dragging movements). */
  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return
    const arr = [...items]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    onChange(arr)
  }

  const updateItem = (i: number, val: unknown) => {
    const arr = [...items]
    arr[i] = val
    onChange(arr)
  }

  /**
   * Écrit UN sous-champ d'un élément, en préservant les autres.
   *
   * `[f.name]: val` écrirait une clé littérale `"f.name"` : c'est le nom du
   * champ, calculé, qu'il faut employer comme clé.
   */
  const updateSubField = (i: number, item: unknown, name: string, val: unknown) => {
    const obj = typeof item === 'object' && item !== null ? { ...(item as Record<string, unknown>) } : {}
    updateItem(i, { ...obj, [name]: val })
  }

  /** L'élément n'est-il qu'un emplacement vide (aucun sous-champ renseigné) ? */
  const isEmptyItem = (item: unknown) => {
    if (typeof item !== 'object' || item === null) return true
    return Object.values(item as Record<string, unknown>).every(v => {
      const r = resolveValue(v, locale)
      return r === '' || r === null || r === undefined
    })
  }

  const libelleLigne = (i: number) => (
    field.itemType ? `Ligne ${i + 1}` : `${field.label.replace(/s$/, '')} ${i + 1}`
  )

  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel>
        {field.label}
        {field.maxItems && <span style={{ fontWeight: 400, color: ADMIN_MUTED }}> ({items.length}/{field.maxItems})</span>}
      </FieldLabel>
      {items.length > 1 && (
        <p style={{ fontSize: 12, color: ADMIN_MUTED, margin: '0 0 8px', lineHeight: 1.4 }}>
          Réordonnez les éléments avec Monter / Descendre.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            border: `1px solid ${ADMIN_LINE}`, background: ADMIN_ACTIVE_BG_SOFT,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: ADMIN_INK, minWidth: 0 }}>
                {libelleLigne(i)}
              </span>
              <div role="group" aria-label={`Ordre — ${libelleLigne(i)}`} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Bouton
                  carre
                  genre="silencieux"
                  disabled={i === 0}
                  aria-label={`Monter ${libelleLigne(i)}`}
                  title="Monter"
                  onClick={() => moveItem(i, i - 1)}
                >
                  {Icon.chevronUp(16, ADMIN_MUTED)}
                </Bouton>
                <Bouton
                  carre
                  genre="silencieux"
                  disabled={i === items.length - 1}
                  aria-label={`Descendre ${libelleLigne(i)}`}
                  title="Descendre"
                  onClick={() => moveItem(i, i + 1)}
                >
                  {Icon.chevronDown(16, ADMIN_MUTED)}
                </Bouton>
                <Bouton carre genre="danger" aria-label={`Retirer ${libelleLigne(i)}`} onClick={() => removeItem(i)}>
                  {Icon.trash(16, ADMIN_CORAL)}
                </Bouton>
              </div>
            </div>

            {field.itemType ? (
              <FieldEditor
                field={{
                  name: 'ligne',
                  label: '',
                  type: field.itemType,
                  translatable: field.translatable,
                }}
                value={item}
                locale={locale}
                onChange={(v) => updateItem(i, v)}
                idPrefix={champId(idPrefix, field.name, String(i))}
              />
            ) : field.itemFields ? (
              // Objet : TOUS les sous-champs sont édités, pas seulement le premier.
              // Avant, seul `itemFields[0]` était affiché : le rôle et la
              // présentation d'un membre d'équipe, le texte d'un avis, la légende
              // d'une photo, la réponse d'une question restaient inaccessibles.
              // Les sous-champs sont rendus par le FieldEditor habituel, donc
              // chaque type (texte, texte long, image) garde son éditeur.
              // Les libellés sont repris : hors d'un sous-formulaire, le champ
              // n'est plus désigné par le titre de la liste.
              <div>
                {field.itemFields.filter((sub) => !champEstAltImage(sub, field.itemFields ?? [])).map((sub, k) => (
                  <FieldEditor
                    key={sub.name}
                    field={{
                      ...sub,
                      label: sub.label || (k === 0 ? field.label : ''),
                      help: isEmptyItem(item) ? (k === 0 ? field.help ?? sub.help : sub.help) : sub.help,
                    }}
                    value={typeof item === 'object' && item !== null ? (item as Record<string, unknown>)[sub.name] : undefined}
                    locale={locale}
                    onChange={(v) => updateSubField(i, item, sub.name, v)}
                    idPrefix={champId(idPrefix, field.name, String(i))}
                    altValue={sub.type === 'image' && typeof item === 'object' && item !== null
                      ? (item as Record<string, unknown>)[nomChampAltImage(sub.name)]
                      : undefined}
                    onAltChange={sub.type === 'image'
                      ? (v) => updateSubField(i, item, nomChampAltImage(sub.name), v)
                      : undefined}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {(!field.maxItems || items.length < field.maxItems) && (
        <GhostButton color={ADMIN_FOREST} onClick={addItem} style={{ marginTop: 8 }}>
          {Icon.plus(16, ADMIN_FOREST)} Ajouter
        </GhostButton>
      )}
      {/* L'aide n'est répétée dans aucun élément : elle ne s'affiche ici que si
          la liste est vide, sinon elle apparaîtrait une fois par élément. */}
      {field.help && items.length === 0 && <div style={{ fontSize: 11, color: ADMIN_MUTED, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function GroupField({ field, value, locale, onChange, idPrefix, locked }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void; idPrefix?: string; locked?: boolean }) {
  const obj = (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value as Record<string, unknown> : {}

  const updateSubField = (name: string, val: unknown) => {
    onChange({ ...obj, [name]: val })
  }

  return (
    <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, border: `1px solid ${ADMIN_LINE}`, background: ADMIN_ACTIVE_BG_SOFT }}>
      <FieldLabel>{field.label}</FieldLabel>
      {field.itemFields?.filter((sub) => !champEstAltImage(sub, field.itemFields ?? [])).map((sub) => (
        <FieldEditor
          key={sub.name}
          field={sub}
          value={obj[sub.name]}
          locale={locale}
          onChange={(v) => updateSubField(sub.name, v)}
          idPrefix={champId(idPrefix, field.name)}
          locked={locked}
          altValue={sub.type === 'image' ? obj[nomChampAltImage(sub.name)] : undefined}
          onAltChange={sub.type === 'image' ? (v) => updateSubField(nomChampAltImage(sub.name), v) : undefined}
        />
      ))}
      {field.help && <div style={{ fontSize: 11, color: ADMIN_MUTED, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function VideoField({ field, value, onChange, idPrefix }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; idPrefix?: string }) {
  const { theme: t, media } = useSite()
  const actuel = typeof value === 'string' ? value : ''
  const videos = media.filter((m) => m.url && (m.content_type?.startsWith('video/') || /\.(mp4|webm|ogg)(\?|$)/i.test(m.url)))
  const selectId = champId(idPrefix, field.name, 'video')
  const inputId = champId(idPrefix, field.name)

  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel htmlFor={videos.length > 0 ? selectId : inputId}>{field.label}</FieldLabel>
      {videos.length > 0 && (
        <select
          id={selectId}
          value={videos.some((m) => m.url === actuel) ? actuel : ''}
          onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
          style={{ ...inputStyle(t), cursor: 'pointer', marginBottom: 8 }}
          {...anneauFocus(t)}
        >
          <option value="">Choisir une vidéo téléversée</option>
          {videos.map((m) => (
            <option key={m.id || m.url} value={m.url}>{m.filename || m.slot}</option>
          ))}
        </select>
      )}
      <input
        id={videos.length > 0 ? undefined : inputId}
        value={actuel}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle(t)}
        placeholder="https://… ou fichier déjà téléversé"
        {...anneauFocus(t)}
      />
      {field.help && <div style={{ fontSize: 11, color: ADMIN_MUTED, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function ColorField({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  const actuel = typeof value === 'string' ? sanitiserHex(value) ?? undefined : undefined
  return (
    <ColorControl
      label={field.label}
      value={actuel}
      inherited={teinteParDefaut(field, t)}
      against={contrasteDeclare(field.against, t)}
      help={field.help}
      onChange={(v) => onChange(v ?? '')}
    />
  )
}

function teinteParDefaut(field: FieldDef, t: ThemePalette): string {
  if (field.name === 'blockTint') return t.bg
  if (field.name === 'overlayTint') return '#000000'
  if (field.name === 'headingColor' || field.name === 'titleColor') return t.heading
  if (field.name === 'taglineColor') return t.muted
  if (field.name === 'primaryColor') return t.primary
  if (field.name === 'secondaryColor') return t.heading
  return t.primary
}

function contrasteDeclare(against: string | undefined, t: ThemePalette): string | undefined {
  if (!against) return undefined
  if (against.startsWith('#')) return against
  const table: Record<string, string> = {
    text: t.text,
    bg: t.bg,
    surface: t.surface,
    heading: t.heading,
    cream: t.cream,
    primary: t.primary,
  }
  return table[against]
}

function ImageField({ field, value, locale, onChange, idPrefix, altValue, onAltChange }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void; idPrefix?: string; altValue?: unknown; onAltChange?: (v: unknown) => void }) {
  const { theme: t, media } = useSite()
  const actuel = typeof value === 'string' ? value : ''
  const photos = media.filter((m) => m.url && (m.content_type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(m.url)))
  const inputId = champId(idPrefix, field.name)
  const selectId = champId(idPrefix, field.name, 'photo')
  const altId = champId(idPrefix, nomChampAltImage(field.name), locale)
  const altObj = asTranslation(altValue)
  const altTexte = altObj[locale] ?? ''
  const photoSansAlt = actuel.trim().length > 0 && altTexte.trim().length === 0
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel htmlFor={photos.length > 0 ? selectId : inputId}>{field.label}</FieldLabel>
      {photos.length > 0 && (
        <select
          id={selectId}
          value={photos.some((m) => m.url === actuel) ? actuel : ''}
          onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
          style={{ ...inputStyle(t), cursor: 'pointer', marginBottom: 8 }}
          {...anneauFocus(t)}
        >
          <option value="">Choisir une photo déjà téléversée</option>
          {photos.map((m) => (
            <option key={m.id || m.url} value={m.url}>{m.filename || m.slot}</option>
          ))}
        </select>
      )}
      <input
        id={inputId}
        value={actuel}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle(t)}
        placeholder="Ou coller l’adresse d’une photo…"
        {...anneauFocus(t)}
      />
      {field.help && <div style={{ fontSize: 12, color: ADMIN_MUTED, marginTop: 4 }}>{field.help}</div>}
      {onAltChange && (
        <div style={{ marginTop: 10 }}>
          <FieldLabel htmlFor={altId}>Texte alternatif</FieldLabel>
          <input
            id={altId}
            value={altTexte}
            onChange={(e) => onAltChange({ ...altObj, [locale]: e.target.value })}
            style={inputStyle(t)}
            aria-describedby={`${altId}-aide`}
            placeholder="Décrivez la photo pour les non-voyants"
            {...anneauFocus(t)}
          />
          <div id={`${altId}-aide`} role={photoSansAlt ? 'status' : undefined} style={{ fontSize: 12, color: photoSansAlt ? ADMIN_CORAL : ADMIN_MUTED, marginTop: 4, lineHeight: 1.4 }}>
            Décrivez la photo pour les non-voyants
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function asTranslation(value: unknown): { fr: string; en: string } {
  if (isTranslationObject(value)) {
    const obj = value as Record<string, string>
    return { fr: obj.fr ?? '', en: obj.en ?? '' }
  }
  if (typeof value === 'string') return { fr: value, en: '' }
  return { fr: '', en: '' }
}

function champId(prefix: string | undefined, name: string, extra?: string) {
  return [prefix, name, extra].filter(Boolean).join('-')
}

function champVisible(field: FieldDef, variant: string | null, type: PageSection['type']): boolean {
  if (!field.forVariants || field.forVariants.length === 0) return true
  const actuelle = variant || defaultVariant(type) || ''
  return field.forVariants.includes(actuelle)
}

function resolveValue(value: unknown, locale: Locale): unknown {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (isTranslationObject(value)) {
    const obj = value as Record<string, string>
    return obj[locale] ?? obj.fr ?? ''
  }
  return value
}

function isTranslationObject(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && ('fr' in (v as Record<string, unknown>) || 'en' in (v as Record<string, unknown>))
}

function familleChamp(field: FieldDef, voisins: readonly FieldDef[] = []): 'contenu' | 'media' | 'action' | 'seo' | 'options' {
  if (champEstAltImage(field, voisins) || /alt|seo|accessib/i.test(field.name) || /alternatif|accessib/i.test(field.label)) {
    return 'seo'
  }
  if (field.type === 'image' || field.type === 'video') return 'media'
  if (field.type === 'group' && /cta/i.test(field.name)) return 'action'
  if (field.type === 'number' || field.type === 'select' || field.type === 'boolean' || field.type === 'color') return 'options'
  return 'contenu'
}

function motifDecision(decision: GroupDecision, action: 'grouper' | 'degrouper' | 'bloquer'): string {
  if (decision.ok) return ''
  if (action === 'grouper') {
    if (decision.reason === 'need-two') {
      return 'Cliquez Grouper, puis deux textes du même bloc dans l’aperçu'
    }
    if (decision.reason === 'already-grouped') return 'Ces textes font déjà partie d’un groupe'
    if (decision.reason === 'chrome') return 'On ne groupe pas l’en-tête ni le pied de page'
  }
  if (action === 'degrouper') {
    if (decision.reason === 'locked') return 'Débloquez le groupe avant de le dégrouper'
    if (decision.reason === 'missing') return 'Sélectionnez un groupe d’abord'
    if (decision.reason === 'singleton') return 'Un seul texte ne forme pas un groupe'
  }
  if (action === 'bloquer') {
    if (decision.reason === 'missing') return 'Sélectionnez un groupe d’abord'
    if (decision.reason === 'locked') return 'Ce groupe est déjà bloqué'
  }
  return 'Action indisponible pour cette sélection'
}

function groupeDeSelection(selection: SelectionState, meta: EditorMeta): EditorGroup | undefined {
  if (selection.groupId) return meta.groups.find((g) => g.id === selection.groupId)
  if (selection.slots.length === 1) return findGroupForSlot(meta.groups, selection.slots[0])
  if (selection.slots.length < 2) return undefined
  const groupes = selection.slots
    .map((slot) => findGroupForSlot(meta.groups, slot))
    .filter((g): g is EditorGroup => Boolean(g))
  if (groupes.length === 0) return undefined
  const premier = groupes[0]
  if (groupes.every((g) => g.id === premier.id) && premier.slots.length === selection.slots.length) {
    return premier
  }
  return undefined
}

