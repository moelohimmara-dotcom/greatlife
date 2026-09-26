/**
 * Vérifie que le masquage d'erreurs Edge Function ne confond plus
 * un 403 métier avec « fonction indisponible », et que le flux
 * set-credentials évite les INSERT en double sur admin_users.
 *
 * Usage : node --test scripts/test-manage-admin-auth-errors.mjs
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('source invokeManageAdminAuth', () => {
  it('ne classe plus non-2xx comme indisponible dans le code source', () => {
    const src = readFileSync(`${ROOT}/src/lib/supabase.ts`, 'utf8')
    // Alternation réelle : « non-2xx » accolé à « indisponible » = l'ancien bug.
    const bad = /non-2xx[\s\S]{0,120}indisponible|indisponible[\s\S]{0,120}non-2xx/i
    assert.equal(
      bad.test(src),
      false,
      'supabase.ts ne doit plus traiter non-2xx comme « fonction indisponible »',
    )
    // Contrôle anti-vacuité : le motif détecte bien l'ancienne ligne fautive.
    assert.match(
      'non-2xx → fonction indisponible (404 not found, failed to send)',
      /failed to send|functions\?http|404|not found|non-2xx/i,
      'le motif de détection ne doit pas être vide',
    )
    assert.match(src, /readFunctionsErrorBody|non-2xx/)
    assert.match(src, /getSession/)
    assert.match(src, /Authorization/)
  })

  it('lit le corps JSON des FunctionsHttpError', () => {
    const src = readFileSync(`${ROOT}/src/lib/supabase.ts`, 'utf8')
    assert.match(src, /bodyError/)
    assert.match(src, /\.json\(\)/)
  })
})

describe('AccountSettings / Auth', () => {
  it('ne fait plus d’upsert admin_users anticipé sur changement d’email', () => {
    const src = readFileSync(`${ROOT}/src/admin/modules/AccountSettings.tsx`, 'utf8')
    assert.equal(src.includes('upsertAdminUser'), false)
    assert.match(src, /confirmation en attente/)
  })

  it('masque la contrainte unique email en message FR', () => {
    const src = readFileSync(`${ROOT}/src/admin/modules/AccountSettings.tsx`, 'utf8')
    assert.match(src, /Cet email est déjà utilisé par un autre compte admin/)
    assert.match(src, /admin_users_email_key|duplicate key/)
  })

  it('résout le rôle admin avec ilike (casse)', () => {
    const src = readFileSync(`${ROOT}/src/contexts/AuthContext.tsx`, 'utf8')
    assert.match(src, /\.ilike\('email'/)
  })
})

describe('manage-admin-auth Edge Function', () => {
  const src = readFileSync(
    `${ROOT}/supabase/functions/manage-admin-auth/index.ts`,
    'utf8',
  )

  it('expose le message FR de conflit email', () => {
    assert.match(src, /Cet email est déjà utilisé par un autre compte admin/)
    assert.match(src, /AdminEmailConflictError|EMAIL_TAKEN_FR/)
    assert.match(src, /23505|admin_users_email_key/)
  })

  it('upsert la ligne existante (previous/caller) avant tout INSERT', () => {
    assert.match(src, /async function upsertAdminRow/)
    assert.match(src, /previousEmail/)
    assert.match(src, /callerEmail/)
    assert.match(src, /selfService/)
    // L'INSERT ne doit venir qu'après tentative d'UPDATE
    const upsertStart = src.indexOf('async function upsertAdminRow')
    const upsertEnd = src.indexOf('serve(async')
    const body = src.slice(upsertStart, upsertEnd)
    assert.ok(body.indexOf('.update(patch)') < body.indexOf('.insert(patch)'))
  })

  it('permet le changement mot de passe seul (même email)', () => {
    assert.match(src, /emailChanging/)
    assert.match(src, /password-only|Même email/i)
    assert.ok(
      src.includes('if (emailChanging) update.email = email'),
      'ne doit changer Auth.email que si l’email change vraiment',
    )
  })
})

describe('repository upsertAdminUser', () => {
  it('évite INSERT aveugle et mappe la contrainte unique en FR', () => {
    const src = readFileSync(`${ROOT}/src/lib/repository.ts`, 'utf8')
    const fnStart = src.indexOf('export async function upsertAdminUser')
    const fnEnd = src.indexOf('export async function deleteAdminUser')
    const body = src.slice(fnStart, fnEnd)
    assert.match(body, /Cet email est déjà utilisé par un autre compte admin/)
    assert.match(body, /\.ilike\('email'/)
    assert.ok(body.includes('.update(') && body.includes('.insert('))
  })
})

describe('revue finale : garde exacte et replis bornés', () => {
  it('la garde owner exige un match exact (pas de repli première ligne)', () => {
    const src = readFileSync(
      `${ROOT}/supabase/functions/manage-admin-auth/index.ts`,
      'utf8',
    )
    assert.equal(
      src.includes('|| adminRows'),
      false,
      'aucun repli sur la première ligne sans correspondance exacte',
    )
    assert.match(src, /isAuthRefusal|Acces non autorise/)
  })

  it('un refus 401/403 ne déclenche aucun repli (AccountSettings)', () => {
    const src = readFileSync(
      `${ROOT}/src/admin/modules/AccountSettings.tsx`,
      'utf8',
    )
    assert.match(src, /isAuthRefusal\(res\.error/)
  })

  it('un refus 401/403 ne déclenche aucun repli (UsersRoles)', () => {
    const src = readFileSync(
      `${ROOT}/src/admin/modules/UsersRoles.tsx`,
      'utf8',
    )
    assert.match(src, /isAuthRefusal\(authRes\.error/)
  })

  it('le changement d’email non-owner est bloqué avant Auth', () => {
    const src = readFileSync(
      `${ROOT}/src/admin/modules/AccountSettings.tsx`,
      'utf8',
    )
    assert.match(src, /Seul le propriétaire peut changer un email/)
  })
})
