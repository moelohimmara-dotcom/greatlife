/**
 * Greatlife — CMS : validation du contenu des sections
 * =====================================================
 * TDR §24 : « Afficher les erreurs en langage humain. »
 *
 *   ❌  "Schema validation error"
 *   ✅  « Le plat Burger maison n'a pas de prix. »
 *
 * Décision DB-10 : la validation vit ICI, dans le registre applicatif — jamais
 * dans une contrainte SQL, qui imposerait une migration à chaque évolution du
 * catalogue.
 *
 * Ce module est PUR : aucune dépendance à Supabase, à React ou au navigateur.
 * Il est donc utilisable côté éditeur (Lot 2), côté génération statique, et
 * testable isolément.
 */

import { isTranslation, resolveI18n } from '../i18n'
import { getSectionDefinition, fieldsFor } from './schemas'
import type { FieldDef } from './fields'

export type IssueLevel = 'error' | 'warning'

export interface ValidationIssue {
  /** Chemin dans le contenu, ex. `items[2].title`. */
  path: string
  /** Message affichable au restaurateur. */
  message: string
  level: IssueLevel
}

/** Une valeur est-elle vide au sens éditorial ? */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (typeof value === 'number' || typeof value === 'boolean') return false
  if (Array.isArray(value)) return value.length === 0
  if (isTranslation(value)) return resolveI18n(value).trim().length === 0
  return false
}

/** Contrôle de forme d'un champ simple. */
function checkSimpleShape(field: FieldDef, value: unknown): boolean {
  switch (field.type) {
    case 'text':
    case 'multiline':
      if (typeof value === 'string') return true
      // Un champ traduisible accepte un objet de langue ; un champ non
      // traduisible non — sinon la valeur ne s'afficherait jamais.
      return field.translatable === false ? false : isTranslation(value)
    case 'number':
      return typeof value === 'number' || (typeof value === 'string' && /^-?\d+([.,]\d+)?$/.test(value.trim()))
    case 'boolean':
      return typeof value === 'boolean'
    case 'image':
      return typeof value === 'string'
    case 'select':
      return typeof value === 'string' && (field.options ?? []).some((o) => o.value === value)
    case 'list':
      return Array.isArray(value)
    case 'group':
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    default:
      return true
  }
}

/**
 * Valide les champs d'un OBJET — un élément de liste ou un champ `group`.
 *
 * Les contrôles sont volontairement les mêmes dans les deux cas : un
 * sous-champ obligatoire manquant doit être signalé aussi bien dans
 * `items[2].name` que dans `primaryCta.label`.
 */
function validateObjectFields(
  fields: readonly FieldDef[],
  record: Record<string, unknown>,
  basePath: string,
  prefix = '',
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const sub of fields) {
    const path = basePath ? `${basePath}.${sub.name}` : sub.name
    const subValue = record[sub.name]

    if (isBlank(subValue)) {
      if (sub.required) {
        issues.push({
          path,
          message: `${prefix}« ${sub.label} » est vide alors qu'il est obligatoire.`,
          level: 'error',
        })
      }
      continue
    }

    if (!checkSimpleShape(sub, subValue)) {
      issues.push({
        path,
        message: `${prefix}« ${sub.label} » n'a pas le format attendu.`,
        level: 'error',
      })
    }
  }

  // Clé stockée mais absente du registre : signalée, jamais bloquante.
  // C'est ce contrôle qui révèle un décalage entre la donnée et le catalogue
  // avant que le restaurateur ne le découvre dans l'éditeur.
  const declared = new Set(fields.map((f) => f.name))
  for (const key of Object.keys(record)) {
    if (!declared.has(key)) {
      issues.push({
        path: basePath ? `${basePath}.${key}` : key,
        message: `${prefix}Le champ « ${key} » n'est pas reconnu ; il est ignoré.`,
        level: 'warning',
      })
    }
  }

  return issues
}

/**
 * Valide le contenu d'une section selon le registre.
 *
 * `errors` empêchent la publication ; `warnings` signalent sans bloquer
 * (une traduction anglaise manquante, par exemple, n'est pas une faute).
 */
export function validateSectionContent(
  type: string,
  content: Record<string, unknown> | null | undefined,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const definition = getSectionDefinition(type)

  if (!definition) {
    return [
      {
        path: '',
        message: `Type de bloc inconnu : « ${type} ». Il ne s'affichera pas sur le site.`,
        level: 'error',
      },
    ]
  }

  const data = content ?? {}

  // 1. Champs déclarés : présence, forme, contenu
  for (const field of definition.fields) {
    const value = data[field.name]

    if (isBlank(value)) {
      if (field.required) {
        issues.push({
          path: field.name,
          message: `« ${field.label} » est vide alors qu'il est obligatoire.`,
          level: 'error',
        })
      }
      continue
    }

    if (!checkSimpleShape(field, value)) {
      issues.push({
        path: field.name,
        message: `« ${field.label} » n'a pas le format attendu.`,
        level: 'error',
      })
      continue
    }

    if (field.type === 'group') {
      issues.push(
        ...validateObjectFields(
          field.itemFields ?? [],
          value as Record<string, unknown>,
          field.name,
          `${field.label} — `,
        ),
      )
      continue
    }

    if (field.type === 'list') {
      issues.push(...validateList(field, value, field.name))
      continue
    }

    // Traduction manquante : jamais bloquant, mais visible.
    if (field.translatable !== false && isTranslation(value) && !value.en) {
      issues.push({
        path: field.name,
        message: `« ${field.label} » n'est pas encore traduit en anglais.`,
        level: 'warning',
      })
    }
  }

  // 2. Champs non déclarés : signalés, jamais bloquants
  const declared = new Set(definition.fields.map((f) => f.name))
  for (const key of Object.keys(data)) {
    if (!declared.has(key)) {
      issues.push({
        path: key,
        message: `Le champ « ${key} » n'est pas reconnu par le bloc « ${definition.label} » ; il est ignoré.`,
        level: 'warning',
      })
    }
  }

  return issues
}

/** Valide une liste et chacun de ses éléments. */
function validateList(field: FieldDef, value: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!Array.isArray(value)) {
    return [{ path, message: `« ${field.label} » doit être une liste.`, level: 'error' }]
  }

  if (field.maxItems !== undefined && value.length > field.maxItems) {
    issues.push({
      path,
      message: `« ${field.label} » contient ${value.length} éléments, alors que ${field.maxItems} au maximum sont prévus.`,
      level: 'warning',
    })
  }

  // Cas 1 — liste de VALEURS SIMPLES (ex. les pastilles : `[{ fr: "100% bio" }]`).
  // Les éléments ne sont pas des objets métier : on contrôle leur forme avec
  // les règles du parent (type et traduisibilité).
  if (field.itemType !== undefined) {
    const scalar: FieldDef = {
      name: '',
      label: field.label,
      type: field.itemType,
      translatable: field.translatable,
    }
    value.forEach((item, index) => {
      if (isBlank(item)) {
        if (field.required) {
          issues.push({
            path: `${path}[${index}]`,
            message: `L'élément ${index + 1} de « ${field.label} » est vide.`,
            level: 'error',
          })
        }
        return
      }
      if (!checkSimpleShape(scalar, item)) {
        issues.push({
          path: `${path}[${index}]`,
          message: `L'élément ${index + 1} de « ${field.label} » n'a pas le format attendu.`,
          level: 'error',
        })
      }
    })
    return issues
  }

  // Cas 2 — liste d'OBJETS (ex. les membres de l'équipe).
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      issues.push({
        path: itemPath,
        message: `L'élément ${index + 1} de « ${field.label} » est illisible.`,
        level: 'error',
      })
      return
    }
    issues.push(
      ...validateObjectFields(
        field.itemFields ?? [],
        item as Record<string, unknown>,
        itemPath,
        `Élément ${index + 1} — `,
      ),
    )
  })

  return issues
}

/** `true` si le contenu peut être publié (aucune erreur bloquante). */
export function isPublishable(issues: readonly ValidationIssue[]): boolean {
  return !issues.some((i) => i.level === 'error')
}

/** Résumé lisible, pour l'interface. */
export function summarize(issues: readonly ValidationIssue[]): string {
  const errors = issues.filter((i) => i.level === 'error').length
  const warnings = issues.length - errors
  if (errors === 0 && warnings === 0) return 'Aucun problème détecté.'
  const parts: string[] = []
  if (errors > 0) parts.push(`${errors} problème${errors > 1 ? 's' : ''} à corriger`)
  if (warnings > 0) parts.push(`${warnings} remarque${warnings > 1 ? 's' : ''}`)
  return parts.join(' · ')
}

/** Champs attendus pour un type — raccourci pour l'éditeur et l'IA. */
export function expectedFields(type: string): readonly FieldDef[] {
  return fieldsFor(type)
}
