/**
 * Vérifie que le masquage d'erreurs Edge Function ne confond plus
 * un 403 métier avec « fonction indisponible ».
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
    const bad = /failed to send\|functions\?http\|404\|not found\|non-2xx/i
    assert.equal(
      bad.test(src),
      false,
      'supabase.ts ne doit plus traiter non-2xx comme « fonction indisponible »',
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

  it('résout le rôle admin avec ilike (casse)', () => {
    const src = readFileSync(`${ROOT}/src/contexts/AuthContext.tsx`, 'utf8')
    assert.match(src, /\.ilike\('email'/)
  })
})
