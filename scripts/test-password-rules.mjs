/**
 * Règles de mot de passe / email — noyau pur.
 * Usage : npm run test:password
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')

const entry = `${WORK}/password.ts`
const outfile = `${WORK}/password.cjs`
writeFileSync(
  entry,
  `export { isValidEmail, evaluatePassword, PASSWORD_MIN_LENGTH, passwordRulesSummary } from '@/lib/password'\n`,
  'utf8',
)
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  alias: { '@': `${ROOT}/src` },
  logLevel: 'warning',
})
const {
  isValidEmail,
  evaluatePassword,
  PASSWORD_MIN_LENGTH,
  passwordRulesSummary,
} = require(outfile)

test('email valide / invalide', () => {
  assert.equal(isValidEmail('owner@greatlife.com'), true)
  assert.equal(isValidEmail('  a@b.co  '), true)
  assert.equal(isValidEmail('pas-un-email'), false)
  assert.equal(isValidEmail(''), false)
  assert.equal(isValidEmail('a@b'), false)
})

test('mot de passe fort accepté', () => {
  const r = evaluatePassword('Bonjour!2026xx', 'owner@exemple.com')
  assert.equal(r.ok, true)
  assert.equal(r.errors.length, 0)
  assert.ok(r.checks.every((c) => c.ok))
})

test('mot de passe trop court refusé', () => {
  const r = evaluatePassword('Aa1!', 'x@y.com')
  assert.equal(r.ok, false)
  assert.ok(r.errors.some((e) => e.includes(String(PASSWORD_MIN_LENGTH))))
})

test('ancien mot de passe démo bloqué', () => {
  const r = evaluatePassword('greatlife2026', 'owner@greatlife.com')
  assert.equal(r.ok, false)
  assert.ok(r.errors.some((e) => /courant|compromis/i.test(e)))
})

test('email dans le mot de passe refusé', () => {
  const r = evaluatePassword('Owner!!2026abc', 'owner@greatlife.com')
  assert.equal(r.ok, false)
  assert.ok(r.errors.some((e) => /email/i.test(e)))
})

test('résumé des règles lisible', () => {
  const s = passwordRulesSummary()
  assert.match(s, new RegExp(String(PASSWORD_MIN_LENGTH)))
  assert.match(s, /majuscule/i)
})
