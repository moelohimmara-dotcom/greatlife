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
import { getSectionDefinition } from '@/cms/model/sections/schemas'
import type { FieldDef } from '@/cms/model/sections/fields'

interface PropertyPanelProps {
  section: PageSection
  locale: Locale
  onUpdate: (content: Record<string, unknown>) => void
  onVariantChange: (variant: string | null) => void
}

export function PropertyPanel({ section, locale, onUpdate, onVariantChange }: PropertyPanelProps) {
  const { theme: t } = useSite()
  const def = getSectionDefinition(section.type)
  const content = section.content ?? {}

  if (!def) return null

  /** Met à jour un champ du contenu. */
  const setField = useCallback((name: string, value: unknown) => {
    onUpdate({ ...content, [name]: value })
  }, [content, onUpdate])

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      {/* En-tête : type + variante */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          {def.label}
        </div>
        <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5 }}>
          {def.description}
        </div>
      </div>

      {/* Sélecteur de variante */}
      {def.variants.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle(t)}>Variante</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {def.variants.map((v) => (
              <button key={v.id} onClick={() => onVariantChange(v.id)} style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: `1px solid ${section.variant === v.id ? t.primary : t.shadow}`,
                background: section.variant === v.id ? `${t.primary}12` : 'transparent',
                color: section.variant === v.id ? t.primary : t.text,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Séparateur */}
      <div style={{ height: 1, background: t.shadow, margin: '16px 0' }} />

      {/* Champs du contenu */}
      <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
        Contenu
      </div>

      {def.fields.map((field) => (
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
        <div style={{ display: 'flex', gap: 4 }}>
          {(['fr', 'en'] as const).map((lang) => (
            <input key={lang} value={(value as Record<string, string>)[lang] ?? ''} onChange={(e) => {
              const obj = { ...(value as Record<string, string> || {}), [lang]: e.target.value }
              onChange(obj)
            }} style={{ ...inputStyle(t), flex: 1, fontSize: 12 }} placeholder={lang.toUpperCase()} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}{field.required ? ' *' : ''}</label>
      <input value={typeof resolved === 'string' ? resolved : ''} onChange={(e) => onChange(e.target.value)} style={inputStyle(t)} />
    </div>
  )
}

function MultilineField({ field, value, locale, onChange }: { field: FieldDef; value: unknown; locale: Locale; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  const resolved = resolveValue(value, locale)

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}{field.required ? ' *' : ''}</label>
      <textarea value={typeof resolved === 'string' ? resolved : ''} onChange={(e) => onChange(e.target.value)}
        rows={3} style={{ ...inputStyle(t), resize: 'vertical', minHeight: 72 }} />
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
      }} style={inputStyle(t)} placeholder={field.help} />
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
        style={{ ...inputStyle(t), cursor: 'pointer' }}>
        <option value="">— Choisir —</option>
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
              <span style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {field.itemType ? `Élément ${i + 1}` : `${field.label.replace(/s$/, '')} ${i + 1}`}
              </span>
              <button onClick={() => removeItem(i)} title="Retirer"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4, opacity: 0.6 }}>
                {Icon.trash(13)}
              </button>
            </div>

            {field.itemType ? (
              // Valeur simple
              <input value={typeof item === 'string' ? item : ''} onChange={(e) => updateItem(i, e.target.value)}
                style={inputStyle(t)} placeholder={`Élément ${i + 1}`} />
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
        <button onClick={addItem} style={{
          marginTop: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
          border: `1px dashed ${t.primary}44`, background: 'transparent',
          color: t.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
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

function ImageField({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const { theme: t } = useSite()
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle(t)}>{field.label}</label>
      <input value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}
        style={inputStyle(t)} placeholder="URL de l'image" />
      {field.help && <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{field.help}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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
    width: '100%', padding: '7px 10px', borderRadius: 8,
    border: `1px solid ${t.shadow}`, background: t.bg,
    fontSize: 13, color: t.text, outline: 'none',
  }
}
