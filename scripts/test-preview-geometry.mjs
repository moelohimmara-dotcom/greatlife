/**
 * Géométrie de l’aperçu et détection iframe — noyau pur.
 *
 * CE QU'IL PROUVE
 *   - l’échelle tient le cadre 1200 px dans la colonne, sans dépasser 1 ;
 *   - une scène de largeur 0 ne produit pas une échelle 1 (iframe 1200 hors cadre) ;
 *   - la hauteur du « verre » est scène / échelle, jamais une constante magique ;
 *   - un nœud dont le document n’est pas celui de la console est dans l’iframe.
 *
 * Usage : npm run test:preview-geometry
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

const entry = `${WORK}/preview-geometry.ts`
const outfile = `${WORK}/preview-geometry.cjs`
writeFileSync(entry, "export { estNoeudDansIframe, echelleCadreApercu, hauteurVerreApercu } from '@/admin/editor/preview-geometry'\n", 'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(outfile)]
const { estNoeudDansIframe, echelleCadreApercu, hauteurVerreApercu } = require(outfile)

test('le cadre Bureau tient dans une colonne étroite', () => {
  const scale = echelleCadreApercu(520, 1200)
  assert.ok(scale < 1)
  assert.equal(Math.round(1200 * scale), 520 - 16)
})

test('une scène plus large que le cadre ne s’agrandit pas', () => {
  assert.equal(echelleCadreApercu(1400, 1200), 1)
})

test('une scène de largeur 0 ne force pas l’échelle 1', () => {
  const scale = echelleCadreApercu(0, 1200)
  assert.ok(scale < 0.01, `reçu ${scale} — ce serait un iframe 1200 px hors cadre`)
})

test('le verre d’aperçu suit la scène, pas une hauteur inventée', () => {
  const scale = 0.5
  assert.equal(hauteurVerreApercu(800, scale), 1600)
  assert.equal(hauteurVerreApercu(0, scale), 1)
})

test('un nœud porté dans un autre document est dans l’iframe', () => {
  const hote = { nom: 'console' }
  const iframe = { nom: 'apercu' }
  assert.equal(estNoeudDansIframe({ ownerDocument: iframe }, hote), true)
  assert.equal(estNoeudDansIframe({ ownerDocument: hote }, hote), false)
  assert.equal(estNoeudDansIframe(null, hote), false)
})
