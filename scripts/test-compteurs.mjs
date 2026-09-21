/**
 * TEST DES COMPTEURS DE PILOTAGE — noyau pur, aucune base de données.
 *
 * POURQUOI CE TEST EXISTE
 * Le tableau de bord affichait « 0 » là où la base portait 1 réservation et
 * 4 commandes en attente. La cause n'était pas le calcul, mais le FAIT QUE le
 * calcul n'avait pas lieu : `load()` ne posait que les totaux, et les compteurs
 * « en attente » n'étaient écrits que par le temps réel.
 *
 * CE QU'IL PROUVE
 *   - les totaux et les attentes sont deux choses distinctes et ne se
 *     confondent pas (c'est le défaut d'origine : 4 commandes, total 4,
 *     attentes 0) ;
 *   - le cas mesuré en base le 2026-09-21 rend bien 4 et 1, pas 0 ;
 *   - un statut INCONNU ne gonfle aucune alarme (`'Pending'`, `'en attente'`,
 *     `''` ne comptent pas) ;
 *   - une liste vide rend 0, jamais `NaN` ;
 *   - la fonction DISCRIMINE : elle ne répond pas toujours la même chose.
 *
 * CE QU'IL NE PROUVE PAS
 *   - que `SiteContext` appelle bien ce noyau au premier chargement : cela se
 *     vérifie sur l'écran réel, pas ici (c'est ce qui a été fait ensuite).
 *
 * Usage : npm run test:compteurs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
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

const entry = `${WORK}/compteurs.ts`
const outfile = `${WORK}/compteurs.cjs`
writeFileSync(entry,
  "export { compteursPilotage, compterEnAttente, estEnAttente, STATUT_EN_ATTENTE } from '@/cms/model/compteurs'",
  'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(outfile)]
const { compteursPilotage, compterEnAttente, estEnAttente, STATUT_EN_ATTENTE } = require(outfile)

/** Une ligne réduite à ce que les compteurs regardent : son statut. */
const ligne = (status) => ({ status })

/* ---------------------------------------------------------------------------
   LE DÉFAUT, TEL QU'IL A ÉTÉ MESURÉ.
   La base portait 4 commandes TOUTES `pending`, et 12 réservations dont 1 seule
   `pending`. L'écran affichait « 0 » pour les deux attentes.
--------------------------------------------------------------------------- */
const quatreCommandesEnAttente = [ligne('pending'), ligne('pending'), ligne('pending'), ligne('pending')]
const douzeReservations = [
  ligne('cancelled'), ligne('cancelled'), ligne('cancelled'), ligne('cancelled'),
  ligne('cancelled'), ligne('cancelled'), ligne('cancelled'), ligne('cancelled'),
  ligne('cancelled'), ligne('confirmed'), ligne('confirmed'), ligne('pending'),
]

test('le cas mesuré : 4 commandes en attente rendent 4, pas 0', () => {
  const c = compteursPilotage(quatreCommandesEnAttente, douzeReservations)
  assert.equal(c.pendingOrdersCount, 4, 'les quatre commandes attendent une confirmation')
  assert.equal(c.ordersCount, 4, 'et elles sont bien quatre au total')
})

test('le cas mesuré : 12 réservations dont 1 en attente rendent 12 et 1', () => {
  const c = compteursPilotage(quatreCommandesEnAttente, douzeReservations)
  assert.equal(c.reservationsCount, 12, 'une réservation annulée reste une réservation')
  assert.equal(c.pendingReservationsCount, 1, 'une seule table à confirmer')
})

test('l’ancien affichage était un couple IMPOSSIBLE — c’est le défaut d’origine', () => {
  // Avant correctif, l'écran affichait « 4 commandes au total » ET « Aucune
  // commande à traiter » EN MÊME TEMPS. La règle ne peut pas produire ce couple :
  // si les quatre commandes sont `pending`, les attentes valent quatre aussi.
  const c = compteursPilotage(quatreCommandesEnAttente, [])
  assert.notDeepEqual(
    [c.ordersCount, c.pendingOrdersCount],
    [4, 0],
    '4 commandes dont 4 en attente ne peuvent pas cohabiter avec 0 attente',
  )
  assert.deepEqual([c.ordersCount, c.pendingOrdersCount], [4, 4],
    'les deux nombres COÏNCIDENT ici — c’est pourquoi le défaut était visible : total juste, attente fausse')
})

test('un statut inconnu ne gonfle aucune alarme', () => {
  const inconnus = [ligne('Pending'), ligne('PENDING'), ligne('en attente'), ligne(''), ligne('pending ')]
  assert.equal(compterEnAttente(inconnus), 0, 'seul `pending` exact compte')
  assert.equal(estEnAttente(ligne('Pending')), false, 'la casse compte')
  assert.equal(estEnAttente(ligne(STATUT_EN_ATTENTE)), true)
})

test('les totaux comptent toutes les lignes, quel que soit le statut', () => {
  const melange = [ligne('pending'), ligne('confirmed'), ligne('cancelled'), ligne('archive')]
  const c = compteursPilotage(melange, melange)
  assert.equal(c.ordersCount, 4)
  assert.equal(c.reservationsCount, 4)
  assert.equal(c.pendingOrdersCount, 1, 'une seule ligne sur quatre attend')
})

test('une liste vide rend 0, jamais NaN', () => {
  const c = compteursPilotage([], [])
  assert.deepEqual(c, {
    ordersCount: 0, pendingOrdersCount: 0, reservationsCount: 0, pendingReservationsCount: 0,
  })
})

test('la fonction DISCRIMINE : 0, 1 et 3 en attente ne rendent pas la même chose', () => {
  const rendu = (n) => compteursPilotage(Array.from({ length: n }, () => ligne('pending')), []).pendingOrdersCount
  assert.equal(rendu(0), 0)
  assert.equal(rendu(1), 1)
  assert.equal(rendu(3), 3, 'ce test échoue si la fonction répond toujours la même chose')
})

/* ---------------------------------------------------------------------------
   SENSIBILITÉ — le test doit ROUGIR si le défaut revient.
   On reconstruit le noyau à partir de sa source, avec le corps de
   `compterEnAttente` remplacé par `0` : c'est exactement l'ancien comportement
   (les compteurs « en attente » jamais alimentés). Si les attentes annoncées
   ci-dessus restent vertes, c'est qu'elles ne prouvaient rien.
   Usage : npm run test:compteurs -- --sensibilite
--------------------------------------------------------------------------- */
if (process.argv.includes('--sensibilite')) {
  const source = readFileSync(`${ROOT}/src/cms/model/compteurs.ts`, 'utf8')
  const casse = source.replace(
    'return lignes.filter(estEnAttente).length',
    'return 0 /* DÉFAUT RÉINTRODUIT : les attentes ne sont jamais comptées */',
  )
  assert.notEqual(casse, source, 'la source a bien été modifiée — sinon le test ne prouve rien')

  const entryCasse = `${WORK}/compteurs-casse.ts`
  const outfileCasse = `${WORK}/compteurs-casse.cjs`
  writeFileSync(entryCasse, casse, 'utf8')
  await build({
    entryPoints: [entryCasse], outfile: outfileCasse, bundle: true, format: 'cjs',
    platform: 'node', loader: { '.ts': 'ts' }, logLevel: 'warning',
  })
  delete require.cache[require.resolve(outfileCasse)]
  const casseModule = require(outfileCasse)

  const avecDefaut = casseModule.compteursPilotage(quatreCommandesEnAttente, douzeReservations)
  const rougit = avecDefaut.pendingOrdersCount !== 4 || avecDefaut.pendingReservationsCount !== 1
  assert.equal(rougit, true,
    'avec le défaut réintroduit, les attentes doivent valoir 0 : le test doit ROUGIR')

  console.log('SENSIBILITÉ : OUI')
  console.log(`  attentes avec le défaut : commandes=${avecDefaut.pendingOrdersCount}, réservations=${avecDefaut.pendingReservationsCount}`)
  console.log('  -> les attentes du « cas mesuré » (4 et 1) seraient bien violées : le test discrimine.')
}

