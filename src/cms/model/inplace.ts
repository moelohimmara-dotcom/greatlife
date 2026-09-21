/**
 * Édition in-place — noyau pur (pas de DOM).
 * Le HTML de l’aperçu est écrit dans `content` comme le panneau Modifier.
 */
import { isTranslation, type Locale } from './i18n'
import type { FieldDef } from './sections/fields'
import { canPatchSlot, markupProfileForField } from './subblocks/rules'

export function champInplacePossible(field: FieldDef | undefined): boolean {
  if (!field) return false
  return field.type === 'text' || field.type === 'multiline'
}

export function profilInplace(field: FieldDef | undefined): 'inline' | 'rich' | 'plain' {
  const profil = markupProfileForField(field)
  if (profil === 'rich') return 'rich'
  if (profil === 'inline') return 'inline'
  return 'plain'
}

export function peutEditerInplace(
  content: Record<string, unknown>,
  field: FieldDef | undefined,
): boolean {
  if (!champInplacePossible(field)) return false
  if (!field) return false
  return canPatchSlot(content, field.name)
}

export function ecrireChampLocale(
  content: Record<string, unknown>,
  name: string,
  locale: Locale,
  texte: string,
  translatable: boolean,
): Record<string, unknown> {
  if (!translatable) return { ...content, [name]: texte }
  const avant = content[name]
  const base: Record<string, string> = isTranslation(avant)
    ? { ...avant }
    : typeof avant === 'string'
      ? { fr: avant }
      : { fr: '', en: '' }
  return { ...content, [name]: { ...base, [locale]: texte } }
}
