/**
 * TEST — emplacements photo de plat (noyau pur).
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

const entry = `${WORK}/product-photo-slot.ts`
const outfile = `${WORK}/product-photo-slot.cjs`
writeFileSync(entry, `export { productPhotoSlotId, slugifyMenuName, productPhotoCandidates } from '@/lib/productPhotoSlot'`, 'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(outfile)]
const { productPhotoSlotId, slugifyMenuName, productPhotoCandidates } = require(outfile)

const GREATLIFE = '7d9e302d-1da0-4438-8cb4-8988ca31c1f8'

test('l’emplacement stable ignore le nom affiché', () => {
  assert.equal(productPhotoSlotId(GREATLIFE), `produit-${GREATLIFE}`)
})

test('un accent ne casse plus le slug (Mangue fraîche)', () => {
  assert.equal(slugifyMenuName('Mangue fraîche', true), 'mangue-fraiche')
  assert.equal(slugifyMenuName('Mangue fraîche', false), 'mangue-fra-che')
})

test('les candidats mettent l’identité avant le nom', () => {
  const c = productPhotoCandidates({ id: GREATLIFE, name: 'Le Greatlife Spécial' })
  assert.equal(c[0], `produit-${GREATLIFE}`)
  assert.ok(c.includes('produit-le-greatlife-special'))
  assert.ok(!c.includes('produit-le-greatlife'), 'aucun fallback magique sur l’ancien nom')
})

test('sans identité (démo), on garde le slug du nom', () => {
  const c = productPhotoCandidates({ name: 'Le Tropical' })
  assert.deepEqual(c, ['produit-le-tropical'])
})
