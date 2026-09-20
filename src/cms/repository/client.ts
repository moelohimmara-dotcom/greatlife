/**
 * Greatlife — CMS : socle d'accès aux données
 * ============================================
 * Décision AR-4 : les nouvelles fonctions du CMS **échouent explicitement**.
 *
 * Le `repository.ts` historique retombe silencieusement sur des données locales
 * en cas d'erreur (12 occurrences relevées dans l'audit §19). Ce défaut masque
 * les pannes et fait passer une base indisponible pour un « mode démo » normal.
 * Les fonctions du CMS ne reproduisent PAS ce motif : elles renvoient une erreur
 * explicite, que l'appelant doit traiter.
 *
 * Décision DB-2 : les écritures sont réservées à `owner`/`manager` par la RLS.
 * Aucun contrôle de rôle n'est fait ici : la base reste l'autorité (TDR §31).
 */

import { getSupabase } from '@/lib/supabase'

/** Résultat explicite — jamais de valeur de repli silencieuse. */
export type CmsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export function cmsOk<T>(data: T): CmsResult<T> {
  return { ok: true, data }
}

export function cmsErr<T = never>(error: string): CmsResult<T> {
  return { ok: false, error }
}

/** Traduit une erreur Supabase en message lisible, sans jargon. */
export function describeError(error: unknown): string {
  if (!error) return 'Erreur inconnue'
  const e = error as { message?: string; code?: string; details?: string }
  if (e.code === '42501' || /row-level security/i.test(e.message ?? '')) {
    return "Vous n'avez pas les droits pour effectuer cette action."
  }
  if (e.code === '23505' || /duplicate key/i.test(e.message ?? '')) {
    return 'Cet élément existe déjà (adresse ou ancre en double).'
  }
  if (e.code === '23503' || /foreign key/i.test(e.message ?? '')) {
    return 'Cet élément est référencé ailleurs et ne peut pas être supprimé.'
  }
  /*
    Contrainte de validation violée (`CHECK`). Sans ce cas, `e.message` remontait
    tel quel : « violates check constraint "pages_published_requires_snapshot" » —
    soit un nom de table ET de contrainte dans le visage du restaurateur, ce que
    AGENTS.md §9 interdit.
    Atteignable depuis la migration `033` : publier une page sans instantané est
    désormais refusé par la base, et non plus seulement par le client.
  */
  if (e.code === '23514' || /check constraint/i.test(e.message ?? '')) {
    return "Cette action n'est pas possible dans l'état actuel de la page. Rechargez la page et réessayez."
  }
  if (/fetch|network|Failed to fetch/i.test(e.message ?? '')) {
    return 'Connexion au serveur impossible. Vérifiez votre réseau et réessayez.'
  }
  return e.message ?? e.details ?? 'Erreur inconnue'
}

/**
 * Récupère le client Supabase ou lève une erreur explicite.
 * Le CMS ne fonctionne pas en mode démo : sans Supabase, il n'y a pas de
 * contenu à administrer (contrairement au site public, qui a un mode local).
 */
export function requireClient(): CmsResult<NonNullable<ReturnType<typeof getSupabase>>> {
  const sb = getSupabase()
  if (!sb) {
    return cmsErr(
      'Supabase n’est pas configuré : le CMS ne peut pas fonctionner sans base de données.',
    )
  }
  return cmsOk(sb)
}

/** Convertit une valeur JSONB inconnue en objet sûr. */
export function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/** Convertit une valeur JSONB en tableau sûr. */
export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}
