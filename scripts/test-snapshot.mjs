/**
 * TEST DU SNAPSHOT DE PUBLICATION — noyau pur, aucune base de données.
 *
 * POURQUOI CE TEST EXISTE
 * Le snapshot est ce qui est archivé dans `page_versions` à la publication, et
 * ce que le site public sert ensuite. Deux pièges sont documentés dans le code
 * et n'avaient AUCUN test :
 *   1. la version est archivée AVANT la bascule de statut : sans l'argument
 *      `asPublished`, la version 1 enregistrerait `status: 'draft'` sur la
 *      première publication — et l'historique est immuable, l'erreur serait
 *      définitive ;
 *   2. le public ignore les groupes et verrous de l'éditeur (R8) : les figer
 *      dans l'instantané exposerait la mécanique d'édition au visiteur.
 *
 * CE QU'IL PROUVE
 *   - `asPublished` impose bien le statut et la date de publication, même si la
 *     page est encore en brouillon au moment de l'archivage ;
 *   - les métadonnées d'édition (`_editor`, `groups`) sont RETIRÉES du contenu
 *     figé, tout le reste est conservé ;
 *   - un snapshot d'un autre format est REFUSÉ, avec un message en langage
 *     restaurateur — ni nom de table, ni jargon technique (AGENTS.md §9) ;
 *   - un snapshot sans page exploitable est refusé lui aussi ;
 *   - l'aller-retour est fidèle : figer puis relire rend les mêmes valeurs ;
 *   - le chrome figé normalise devise, créneaux de retrait et logo, et copie
 *     ses liens (muter la copie ne touche pas l'entrée) ;
 *   - la lecture DISCRIMINE : le format courant passe, les autres sont refusés.
 *
 * CE QU'IL NE PROUVE PAS
 *   - que la publication écrit bien ce snapshot en base : cela se vérifie sur
 *     le parcours réel (`verify:public`, `verify:lot3`).
 *
 * Usage : npm run test:snapshot
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

const entry = `${WORK}/snapshot.ts`
const outfile = `${WORK}/snapshot.cjs`
writeFileSync(entry,
  "export { SNAPSHOT_FORMAT_VERSION, buildSnapshot, freezeChrome, parseSnapshot } from '@/cms/model/publishing/snapshot'",
  'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(outfile)]
const { SNAPSHOT_FORMAT_VERSION, buildSnapshot, freezeChrome, parseSnapshot } = require(outfile)

/** Une page encore en BROUILLON au moment de l'archivage — le cas piégeux. */
const pageBrouillon = {
  id: 'p1',
  slug: '',
  title: { fr: 'Accueil', en: 'Home' },
  status: 'draft',
  sortOrder: 0,
  seo: { title: { fr: 'Greatlife' }, description: { fr: 'Fast-food bio' } },
  layout: 'single_column',
  publishedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const sectionAvecMeta = {
  id: 's1',
  pageId: 'p1',
  type: 'hero',
  variant: null,
  position: 0,
  visible: true,
  anchor: 'home',
  content: {
    title: { fr: 'Manger vite. Manger bio.' },
    subtitle: { fr: 'Sous-titre', en: 'Subtitle' },
    _editor: { groups: { hero: ['title'] }, locks: { subtitle: true } },
    groups: ['hero'],
  },
  settings: { hauteur: 'grand' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

test('PIÈGE N°1 : le statut publié est imposé par `asPublished`, pas lu dans la page', () => {
  const snap = buildSnapshot(pageBrouillon, [sectionAvecMeta], {
    status: 'published',
    publishedAt: '2026-09-24T16:53:58.002Z',
  })
  assert.equal(snap.page.status, 'published', 'la page est encore en brouillon : sans asPublished, la version 1 garderait « draft »')
  assert.equal(snap.page.publishedAt, '2026-09-24T16:53:58.002Z', 'et la date de publication serait perdue — définitivement')
})

test('sans `asPublished`, l\'état de la page est figé tel quel (le piège est visible)', () => {
  const snap = buildSnapshot(pageBrouillon, [sectionAvecMeta])
  assert.equal(snap.page.status, 'draft', 'c\'est bien ce comportement que `asPublished` doit corriger à la publication')
  assert.equal(snap.page.publishedAt, null)
})

test('PIÈGE N°2 : les métadonnées d\'éditeur ne sont JAMAIS figées (R8)', () => {
  const snap = buildSnapshot(pageBrouillon, [sectionAvecMeta], { status: 'published', publishedAt: '2026-09-24T16:53:58.002Z' })
  const content = snap.sections[0].content
  assert.equal(content._editor, undefined, 'les groupes et verrous restent dans le brouillon, pas dans le public')
  assert.equal(content.groups, undefined, 'ni la liste des groupes')
  assert.deepEqual(content.title, { fr: 'Manger vite. Manger bio.' }, 'mais le contenu réel est conservé')
  assert.deepEqual(content.subtitle, { fr: 'Sous-titre', en: 'Subtitle' }, 'sous sa forme bilingue')
  assert.deepEqual(snap.sections[0].settings, { hauteur: 'grand' }, 'les réglages de section sont figés aussi')
})

test('un format inconnu est REFUSÉ — et le message reste du langage restaurateur', () => {
  const snap = buildSnapshot(pageBrouillon, [sectionAvecMeta])
  const futur = JSON.parse(JSON.stringify(snap))
  futur.formatVersion = SNAPSHOT_FORMAT_VERSION + 1
  const lu = parseSnapshot(futur)
  assert.equal(lu.ok, false, 'une version d\'une autre génération ne doit jamais être restaurée par erreur')
  assert.match(lu.error, /génération du site/, 'le message explique le problème en français')
  for (const jargon of ['formatVersion', 'JSON', 'schema', 'table', 'SQL', 'migration']) {
    assert.ok(!lu.error.includes(jargon), `le message ne doit pas contenir le jargon « ${jargon} »`)
  }
})

test('un snapshot sans repère de format, ou sans page, est refusé lui aussi', () => {
  const sansFormat = parseSnapshot({ page: { slug: '' }, sections: [] })
  assert.equal(sansFormat.ok, false)
  const sansPage = parseSnapshot({ formatVersion: SNAPSHOT_FORMAT_VERSION, page: {}, sections: [] })
  assert.equal(sansPage.ok, false, 'ni titre ni slug : rien à restaurer')
  assert.match(sansPage.error, /page exploitable/)
})

test('aller-retour fidèle : figer puis relire rend les mêmes valeurs', () => {
  const snap = buildSnapshot(pageBrouillon, [sectionAvecMeta], {
    status: 'published',
    publishedAt: '2026-09-24T16:53:58.002Z',
  })
  const relu = parseSnapshot(JSON.parse(JSON.stringify(snap)))
  assert.equal(relu.ok, true, 'le format courant doit se relire')
  assert.deepEqual(relu.snapshot.page, snap.page, 'la page est identique après le trajet en base')
  assert.deepEqual(relu.snapshot.sections, snap.sections, 'et les sections aussi')
  assert.equal(relu.snapshot.chrome, undefined, 'sans chrome figé, aucune clé chrome n\'apparaît')
})

test('le chrome figé normalise devise, créneaux et logo, et COPIE ses liens', () => {
  const liens = [{ id: 'l1', label: { fr: 'La carte' }, target: 'carte', visible: true, isCta: false }]
  const chrome = freezeChrome({
    restaurantRaw: {
      name: { fr: 'Greatlife' },
      phone: '+224 661 16 44 58',
      pickupTimes: [' 11h00 ', '', '23h00', '   '],
      logoUrl: 'https://exemple.test/logo.png',
      typography: {},
    },
    headerLinks: liens,
    footerLinks: liens,
  })
  assert.equal(chrome.restaurant.currency, 'FG', 'devise par défaut quand elle n\'est pas saisie')
  assert.deepEqual(chrome.restaurant.pickupTimes, ['11h00', '23h00'], 'créneaux nettoyés : espaces rognés, vides retirés')
  assert.deepEqual(chrome.chromePresentation.header.logoUrl, 'https://exemple.test/logo.png', 'le logo racine est rangé sous header')
  assert.equal(chrome.typography, null, 'une typographie vide ne fige rien')
  chrome.headerLinks[0].target = 'pirate'
  assert.equal(liens[0].target, 'carte', 'muter le lien figé ne touche pas le lien de travail')
})

test('la lecture DISCRIMINE : le format courant passe, les autres sont refusés', () => {
  const snap = buildSnapshot(pageBrouillon, [sectionAvecMeta], { status: 'published', publishedAt: '2026-09-24T16:53:58.002Z' })
  assert.equal(parseSnapshot(JSON.parse(JSON.stringify(snap))).ok, true, 'le format courant est accepté')
  const vide = parseSnapshot(null)
  assert.equal(vide.ok, false, 'une entrée vide est refusée — la fonction ne répond pas toujours « ok »')
})
