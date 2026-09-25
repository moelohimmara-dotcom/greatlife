/**
 * Règles d'identifiants côté console (email + mot de passe fort).
 * Pure : aucune dépendance à Supabase — testable sans réseau.
 */

export const PASSWORD_MIN_LENGTH = 12

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mots de passe trop courants / historiques Greatlife — refusés explicitement. */
const BLOCKED_PASSWORDS = new Set([
  'greatlife2026',
  'password',
  'password123',
  'motdepasse',
  'motdepasse1',
  '123456789012',
  'azertyuiop12',
  'qwertyuiop12',
])

export function isValidEmail(value: string): boolean {
  const email = value.trim().toLowerCase()
  if (!email || email.length > 320) return false
  return EMAIL_RE.test(email)
}

export interface PasswordRuleResult {
  ok: boolean
  errors: string[]
  /** Indications individuelles pour l'UI (coche / croix). */
  checks: { id: string; label: string; ok: boolean }[]
}

export function evaluatePassword(password: string, email?: string): PasswordRuleResult {
  const checks = [
    {
      id: 'length',
      label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
      ok: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'lower',
      label: 'Une lettre minuscule',
      ok: /[a-z]/.test(password),
    },
    {
      id: 'upper',
      label: 'Une lettre majuscule',
      ok: /[A-Z]/.test(password),
    },
    {
      id: 'digit',
      label: 'Un chiffre',
      ok: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'Un caractère spécial (!@#$%…)',
      ok: /[^A-Za-z0-9]/.test(password),
    },
  ]

  const errors: string[] = []
  for (const c of checks) {
    if (!c.ok) errors.push(c.label)
  }

  const normalized = password.trim().toLowerCase()
  if (BLOCKED_PASSWORDS.has(normalized)) {
    errors.push('Ce mot de passe est trop courant ou déjà compromis.')
  }

  if (email) {
    const local = email.trim().toLowerCase().split('@')[0] || ''
    if (local.length >= 3 && normalized.includes(local)) {
      errors.push('Le mot de passe ne doit pas contenir votre adresse email.')
    }
  }

  return { ok: errors.length === 0, errors, checks }
}

export function passwordRulesSummary(): string {
  return `Au moins ${PASSWORD_MIN_LENGTH} caractères, avec majuscule, minuscule, chiffre et caractère spécial.`
}
