/**
 * TEST J7 — SEO de page (normalisation, résolution, balises).
 * Usage : npm run test:page-seo
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

const entry = `${WORK}/page-seo-test.ts`
const outfile = `${WORK}/page-seo-test.cjs`
writeFileSync(
  entry,
  [
    "export {",
    "  normaliserPageSeo,",
    "  resoudrePageSeo,",
    "  ecrireSeoLocale,",
    "  balisesSeoDocument,",
    "} from '@/cms/model/page-seo'",
    "export { buildSnapshot } from '@/cms/model/publishing/snapshot'",
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
  normaliserPageSeo,
  resoudrePageSeo,
  ecrireSeoLocale,
  balisesSeoDocument,
  buildSnapshot,
} = require(outfile)

test('normaliserPageSeo ignore le bruit et garde title/description/image', () => {
  const seo = normaliserPageSeo({
    title: { fr: '  Accueil  ', en: 'Home' },
    description: { fr: 'Bio à Conakry' },
    image: '  https://cdn.example/hero.jpg  ',
    trash: true,
    noindex: false,
  })
  assert.deepEqual(seo.title, { fr: '  Accueil  ', en: 'Home' })
  assert.equal(seo.image, 'https://cdn.example/hero.jpg')
  assert.equal(seo.noindex, undefined)
})

test('resoudrePageSeo préfère la locale puis le FR', () => {
  const r = resoudrePageSeo(
    { title: { fr: 'FR', en: 'EN' }, description: { fr: 'Desc FR' } },
    'en',
  )
  assert.equal(r.title, 'EN')
  assert.equal(r.description, 'Desc FR')
})

test('ecrireSeoLocale conserve l’autre langue', () => {
  const next = ecrireSeoLocale(
    { title: { fr: 'FR', en: 'EN' }, description: { fr: 'D' } },
    'title',
    'fr',
    'Nouveau',
  )
  assert.deepEqual(next.title, { fr: 'Nouveau', en: 'EN' })
})

test('balisesSeoDocument omet les champs vides (socle index.html préservé)', () => {
  assert.deepEqual(balisesSeoDocument(resoudrePageSeo({})), [])
  const tags = balisesSeoDocument(
    resoudrePageSeo({
      title: { fr: 'Titre' },
      description: { fr: 'Texte' },
      image: 'https://cdn.example/og.jpg',
      noindex: true,
    }),
  )
  const keys = tags.map((t) => `${t.attr}:${t.key}`)
  assert.ok(keys.includes('name:description'))
  assert.ok(keys.includes('property:og:title'))
  assert.ok(keys.includes('property:og:image'))
  assert.ok(keys.includes('name:robots'))
})

test('buildSnapshot fige pages.seo dans l’instantané', () => {
  const snap = buildSnapshot(
    {
      id: 'p1',
      slug: '',
      title: { fr: 'Accueil' },
      status: 'draft',
      sortOrder: 0,
      seo: {
        title: { fr: 'Titre Google' },
        description: { fr: 'Texte de partage' },
        image: 'https://cdn.example/og.jpg',
      },
      layout: 'single',
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
      updatedBy: null,
    },
    [],
    { status: 'published', publishedAt: '2026-09-23T00:00:00.000Z' },
  )
  assert.equal(snap.page.seo.title.fr, 'Titre Google')
  assert.equal(snap.page.seo.description.fr, 'Texte de partage')
  assert.equal(snap.page.seo.image, 'https://cdn.example/og.jpg')
})
