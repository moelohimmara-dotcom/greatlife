/**
 * TEST — résolution du texte alternatif des médias (noyau pur).
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

const entry = `${WORK}/media-alt.ts`
const outfile = `${WORK}/media-alt.cjs`
writeFileSync(
  entry,
  `export {
  coalesceAlt,
  filenameStem,
  resolveMediaAlt,
  findMediaBySlot,
  findFirstMediaBySlots,
  findMediaByUrl,
} from '@/lib/mediaAlt'`,
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
delete require.cache[require.resolve(outfile)]
const {
  coalesceAlt,
  filenameStem,
  resolveMediaAlt,
  findMediaBySlot,
  findFirstMediaBySlots,
  findMediaByUrl,
} = require(outfile)

test('alt_text prime sur le nom de fichier et le libellé métier', () => {
  assert.equal(
    resolveMediaAlt({ alt_text: 'Burger signature', filename: 'photo.jpg' }, 'Le Greatlife'),
    'Burger signature',
  )
})

test('sans alt_text, le nom de fichier (sans extension) sert de repli', () => {
  assert.equal(filenameStem('dossier/plat_mangue-fraiche.webp'), 'plat mangue fraiche')
  assert.equal(
    resolveMediaAlt({ alt_text: null, filename: 'equipe-aissa.png' }, 'Aïssa'),
    'equipe aissa',
  )
})

test('sans média, le libellé métier reste le dernier repli', () => {
  assert.equal(resolveMediaAlt(undefined, 'Le Tropical'), 'Le Tropical')
  assert.equal(resolveMediaAlt({ alt_text: '  ', filename: '' }, '  '), '')
})

test('coalesceAlt ignore les vides', () => {
  assert.equal(coalesceAlt('', null, '  ', 'OK'), 'OK')
  assert.equal(coalesceAlt(), '')
})

test('findMediaBySlot / URL / premiers candidats', () => {
  const media = [
    { slot: 'equipe-1', url: 'https://cdn/a.jpg', alt_text: 'A' },
    { slot: 'equipe-2', url: 'https://cdn/b.jpg', alt_text: null, filename: 'b.png' },
    { slot: 'hero', url: undefined },
  ]
  assert.equal(findMediaBySlot(media, 'equipe-2')?.filename, 'b.png')
  assert.equal(findMediaBySlot(media, 'hero'), undefined)
  assert.equal(findFirstMediaBySlots(media, ['hero', 'equipe-1'])?.alt_text, 'A')
  assert.equal(findMediaByUrl(media, 'https://cdn/b.jpg')?.slot, 'equipe-2')
  assert.equal(findMediaByUrl(media, '  '), undefined)
})
