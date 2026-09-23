/**
 * TEST — liens WhatsApp / téléphone / Maps (noyau pur).
 * Usage : node --test scripts/test-contact-links.mjs
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

const entry = `${WORK}/contact-links.ts`
const outfile = `${WORK}/contact-links.cjs`
writeFileSync(entry, "export * from '@/lib/contactLinks'\n", 'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
const { lienWhatsApp, lienTel, lienMapsRecherche, chiffresTelephone } = require(outfile)

test('chiffresTelephone garde l’indicatif', () => {
  assert.equal(chiffresTelephone('+224 661 16 44 58'), '+224661164458')
})

test('lienWhatsApp depuis un numéro', () => {
  assert.equal(lienWhatsApp('+224 661 16 44 58'), 'https://wa.me/224661164458')
})

test('lienWhatsApp accepte une URL wa.me', () => {
  assert.equal(lienWhatsApp('https://wa.me/224661164458'), 'https://wa.me/224661164458')
})

test('lienWhatsApp refuse une valeur vide', () => {
  assert.equal(lienWhatsApp(''), null)
  assert.equal(lienWhatsApp('   '), null)
})

test('lienTel', () => {
  assert.equal(lienTel('+224 661 16 44 58'), 'tel:+224661164458')
})

test('lienMapsRecherche encode l’adresse', () => {
  const href = lienMapsRecherche('Conakry, Guinée')
  assert.ok(href?.startsWith('https://www.google.com/maps/search/?api=1&query='))
  assert.ok(href.includes(encodeURIComponent('Conakry, Guinée')))
})
