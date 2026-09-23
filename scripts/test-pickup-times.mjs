/**
 * TEST J5 — créneaux de retrait (normalisation + gel chrome).
 * Usage : npm run test:pickup
 */
import { mkdirSync, writeFileSync } from 'node:fs'
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

const entry = `${WORK}/pickup-test.ts`
const outfile = `${WORK}/pickup-test.cjs`
writeFileSync(
  entry,
  [
    "export { normaliserPickupTimes } from '@/cms/model/pickup-times'",
    "export { freezeChrome } from '@/cms/model/publishing/snapshot'",
    "export { CLEFS_MIROIR_RESTAURANT, clefsMiroirRestaurant } from '@/cms/model/contenu-patch'",
  ].join('\n'),
  'utf8',
)
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  alias: { '@': `${ROOT}/src` },
  loader: { '.ts': 'ts' },
  logLevel: 'warning',
})
const {
  normaliserPickupTimes,
  freezeChrome,
  CLEFS_MIROIR_RESTAURANT,
  clefsMiroirRestaurant,
} = require(outfile)

test('normaliserPickupTimes retire vides et doublons, garde l’ordre', () => {
  assert.deepEqual(
    normaliserPickupTimes(['12:00', ' 12:30 ', '', '12:00', '19:00', 42]),
    ['12:00', '12:30', '19:00'],
  )
})

test('liste vide = panier honnête (pas de repli hardcodé)', () => {
  assert.deepEqual(normaliserPickupTimes([]), [])
  assert.deepEqual(normaliserPickupTimes(null), [])
})

test('freezeChrome fige pickupTimes depuis restaurant', () => {
  const chrome = freezeChrome({
    restaurantRaw: {
      name: { fr: 'Greatlife' },
      pickupTimes: ['12:00', '19:30', ''],
    },
    headerLinks: [],
    footerLinks: [],
  })
  assert.deepEqual(chrome.restaurant.pickupTimes, ['12:00', '19:30'])
})

test('miroir restaurant inclut pickupTimes', () => {
  assert.ok(CLEFS_MIROIR_RESTAURANT.includes('pickupTimes'))
  assert.deepEqual(clefsMiroirRestaurant({ pickupTimes: ['12:00'], phone: '1' }), [
    'phone',
    'pickupTimes',
  ])
})
