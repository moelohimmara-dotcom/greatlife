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

import { useCallback } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import type { ThemePalette } from '@/config/themes'
import { getSectionDefinition, defaultVariant } from '@/cms/model/sections/schemas'
import type { FieldDef } from '@/cms/model/sections/fields'
import { dispositionBannierePourMiseEnPage, type PageLayout } from '@/cms/model/page-layout'
import { anneauFocus, boutonOutil, CIBLE, titreColonne } from './chrome'

interface PropertyPanelProps {
  section: PageSection
  locale: Locale
  onUpdate: (content: Record<string, unknown>) => void
  onVariantChange: (variant: string | null) => void
  pageLayout?: PageLayout
}

export function PropertyPanel({ section, locale, onUpdate, onVariantChange, pageLayout }: PropertyPanelProps) {
  const { theme: t } = useSite()
  const def = getSectionDefinition(section.type)
  const content = section.content ?? {}
  const banniereImposee =
    section.type === 'hero' && pageLayout
      ? dispositionBannierePourMiseEnPage(pageLayout, section.variant)
      : null
  const dispositionAffichee = banniereImposee ?? section.variant

  if (!def) return null

  /** Met à jour un champ du contenu. */
  const setField = useCallback((name: string, value: unknown) => {
    onUpdate({ ...content, [name]: value })
  }, [content, onUpdate])

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      {/* En-tête : type + variante */}
      <div style={{ marginBottom: 16 }}>
        <div style={titreColonne(t)}>
          {def.label}
        </div>
        <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5 }}>
          {def.description}
        </div>
      </div>

      {/* Sélecteur de variante */}
      {def.variants.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle(t)}>Disposition</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {def.variants.map((v) => {
              const interdit = Boolean(banniereImposee) && v.id !== 'fullscreen' && v.id !== 'video'
              const actif = dispositionAffichee === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={interdit}
                  aria-pressed={actif}
                  onClick={() => { if (!interdit) onVariantChange(v.id) }}
                  title={interdit ? 'Cette mise en page affiche la bannière en plein écran. Pour Image + texte, choisissez Colonne unique.' : undefined}
                  style={{
                    ...boutonOutil(t, { actif, disabled: interdit }),
                    opacity: interdit ? 0.45 : 1,
                    cursor: interdit ? 'not-allowed' : 'pointer',
                  }}
                  {...anneauFocus(t)}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
          {banniereImposee && (
            <p style={{ fontSize: 11, color: t.muted, lineHeight: 1.4, margin: '8px 0 0' }}>
              Cette mise en page affiche la bannière en plein écran. Vous pouvez garder Vidéo. Pour Image + texte ou Centré, choisissez Colonne unique.
            </p>
          )}
        </div>
      )}

      {/* Séparateur */}
      <div style={{ height: 1, background: t.shadow, margin: '16px 0' }} />

      {/* Champs du contenu */}
      <div style={{ ...titreColonne(t), marginBottom: 12 }}>
        Contenu
      </div>

      {def.fields.filter((field) => champVisible(field, dispositionAffichee, section.type)).map((field) => (
        <FieldEditor
          key={field.name}
          field={field}
          value={content[field.name]}
          locale={locale}
          onChange={(v) => setField(field.name, v)}
        />
      ))}
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
}

function FieldEditor({ field, value, locale, onChange }: FieldEditorProps) {
  switch (field.type) {
    case 'text':
      return <TextField field={field} value={value} locale={locale} onChange={onChange} />
    case 'multiline':
      return <MultilineField field={field} value={value} locale={locale} onChange={onChange} />
    case 'number':
      return <NumberField field={field} value={value} onChange={onChange} />
    case 'select':
      return <SelectField field={field} value={value} onChange={onChange} />
    case 'list':
      // `locale` est transmis : les sous-champs d'une liste d'objets sont
      // édités par le même FieldEditor, qui en a besoin (textes bilingues).
      return <ListField field={field} value={value} locale={locale} onChange={onChange} />
    case 'group':
      return <GroupField field={field} value={value} locale={locale} onChange={onChange} />
    case 'image':
      return <ImageField field={field} value={value} onChange={onChange} />
    case 'video':
      return <VideoField field={field} value={value} onChange={onChange} />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* Champs individuels                                                  */
/* ------------------------------------------------------------------ */

function TextField({ field, value, locale, onChange }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  // Résoudre la valeur bilingue
  const resolved = resolveValue(value, locale)

  if (field.translatable !== false && isTranslationObject(value)) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle(t)}>{field.label}{field.required ? ' *' : ''}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['fr', 'en'] as const).map((lang) => (
            <div key={lang}>
              <label htmlFor={`${field.name}-${lang}`} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 4 }}>
                {lang === 'fr' ? 'Français' : 'English'}
              </label>
              <input
                id={`${field.name}-${lang}`}
                value={(value as Record<string, string>)[lang] ?? ''}
                onChange={(e) => {
                  const obj = { ...(value as Record<string, string> || {}), [lang]: e.target.value }
                  onChange(obj)
                }}
                style={{ ...inputStyle(t), minHeight: CIBLE }}
                {...anneauFocus(t)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}{field.required ? ' *' : ''}</label>
      <input value={typeof resolved === 'string' ? resolved : ''} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle(t), minHeight: CIBLE }} {...anneauFocus(t)} />
      {field.help && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function MultilineField({ field, value, locale, onChange }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  const resolved = resolveValue(value, locale)

  /*
    Même branche bilingue que `TextField`. Elle manquait ici.

    ⚠️ SON ABSENCE A DÉTRUIT DES DONNÉES EN PRODUCTION
    Sans cette branche, le composant écrivait une CHAÎNE SIMPLE là où la valeur
    était un objet `{ fr, en }` : `onChange(e.target.value)`. Conséquences :
      - la version ANGLAISE était perdue, définitivement et sans le moindre
        avertissement ;
      - le validateur restait muet, puisqu'il ne teste `isTranslation` que sur
        les objets — une chaîne lui échappait ;
      - et comme le public lit l'instantané figé, RIEN ne changeait à l'écran :
        le restaurateur ne pouvait pas s'en apercevoir.
    Mesuré : `hero.subtitle` et `story.body` avaient été abîmés ainsi.

    Les deux composants doivent rester symétriques : un champ déclaré
    traduisible se présente de la même façon, qu'il soit court ou long.
  */
  if (field.translatable !== false && isTranslationObject(value)) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle(t)}>{field.label}{field.required ? ' *' : ''}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['fr', 'en'] as const).map((lang) => (
            <div key={lang}>
              <label htmlFor={`${field.name}-ml-${lang}`} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 4 }}>
                {lang === 'fr' ? 'Français' : 'English'}
              </label>
              <textarea
                id={`${field.name}-ml-${lang}`}
                value={(value as Record<string, string>)[lang] ?? ''}
                onChange={(e) => {
                  const obj = { ...(value as Record<string, string> || {}), [lang]: e.target.value }
                  onChange(obj)
                }}
                rows={3}
                style={{ ...inputStyle(t), fontSize: 13, resize: 'vertical', minHeight: 72 }}
                {...anneauFocus(t)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}{field.required ? ' *' : ''}</label>
      <textarea value={typeof resolved === 'string' ? resolved : ''} onChange={(e) => onChange(e.target.value)}
        rows={3} style={{ ...inputStyle(t), resize: 'vertical', minHeight: 72 }} {...anneauFocus(t)} />
    </div>
  )
}

function NumberField({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}</label>
      <input type="number" value={typeof value === 'number' ? value : ''} onChange={(e) => {
        const n = e.target.valueAsNumber
        onChange(isNaN(n) ? null : n)
      }} style={inputStyle(t)} placeholder={field.help} {...anneauFocus(t)} />
      {field.help && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function SelectField({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}</label>
      <select value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle(t), cursor: 'pointer' }} {...anneauFocus(t)}>
        <option value="">Choisir</option>
        {(field.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {field.help && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function ListField({ field, value, locale, onChange }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  const items = Array.isArray(value) ? value : []

  const addItem = () => {
    if (field.itemType) {
      // Liste de valeurs simples (ex. chips)
      onChange([...items, ''])
    } else if (field.itemFields) {
      // Liste d'objets (ex. membres, avis)
      const obj: Record<string, unknown> = {}
      for (const f of field.itemFields) obj[f.name] = ''
      onChange([...items, obj])
    }
  }

  const removeItem = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i))
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

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>
        {field.label}
        {field.maxItems && <span style={{ fontWeight: 400, color: t.muted }}> ({items.length}/{field.maxItems})</span>}
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            border: `1px solid ${t.shadow}`, background: `${t.primary}03`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.heading }}>
                {field.itemType ? `Élément ${i + 1}` : `${field.label.replace(/s$/, '')} ${i + 1}`}
              </span>
              <button type="button" onClick={() => removeItem(i)} aria-label="Retirer cet élément"
                style={{ minWidth: CIBLE, minHeight: CIBLE, background: 'none', border: 'none', cursor: 'pointer', color: t.accent }}
                {...anneauFocus(t)}>
                {Icon.trash(16, t.accent)}
              </button>
            </div>

            {field.itemType ? (
              // Valeur simple
              <input value={typeof item === 'string' ? item : ''} onChange={(e) => updateItem(i, e.target.value)}
                style={inputStyle(t)} placeholder={`Élément ${i + 1}`} {...anneauFocus(t)} />
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
                {field.itemFields.map((sub, k) => (
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
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {(!field.maxItems || items.length < field.maxItems) && (
        <button type="button" onClick={addItem} style={{
          marginTop: 6, ...boutonOutil(t, {}),
          display: 'flex', alignItems: 'center', gap: 4,
        }} {...anneauFocus(t)}>
          {Icon.plus(12, t.primary)} Ajouter
        </button>
      )}
      {/* L'aide n'est répétée dans aucun élément : elle ne s'affiche ici que si
          la liste est vide, sinon elle apparaîtrait une fois par élément. */}
      {field.help && items.length === 0 && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function GroupField({ field, value, locale, onChange }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  const obj = (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value as Record<string, unknown> : {}

  const updateSubField = (name: string, val: unknown) => {
    onChange({ ...obj, [name]: val })
  }

  return (
    <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, border: `1px solid ${t.shadow}`, background: `${t.primary}03` }}>
      <label style={{ ...labelStyle(t), marginBottom: 8 }}>{field.label}</label>
      {field.itemFields?.map((sub) => (
        <FieldEditor key={sub.name} field={sub} value={obj[sub.name]} locale={locale} onChange={(v) => updateSubField(sub.name, v)} />
      ))}
      {field.help && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function VideoField({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const { theme: t, media } = useSite()
  const actuel = typeof value === 'string' ? value : ''
  const videos = media.filter((m) => m.url && (m.content_type?.startsWith('video/') || /\.(mp4|webm|ogg)(\?|$)/i.test(m.url)))

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}</label>
      {videos.length > 0 && (
        <select
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
        value={actuel}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle(t)}
        placeholder="https://… ou fichier déjà téléversé"
        {...anneauFocus(t)}
      />
      {field.help && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

function ImageField({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}</label>
      <input value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}
        style={inputStyle(t)} placeholder="URL de l'image" {...anneauFocus(t)} />
      {field.help && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

function labelStyle(t: ThemePalette): React.CSSProperties {
  return { display: 'block', fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 5 }
}

function inputStyle(t: ThemePalette): React.CSSProperties {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 8, minHeight: CIBLE,
    border: `1px solid ${t.shadow}`, background: t.bg,
    fontSize: 13, color: t.text, outline: 'none',
  }
}
