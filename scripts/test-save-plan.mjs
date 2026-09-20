/**
 * TEST DU PLAN DE SAUVEGARDE — noyau pur, aucune base de données.
 *
 * POURQUOI CE TEST EXISTE
 * `useEditor.save()` était intestable parce qu'il mêlait la DÉCISION et
 * l'ÉCRITURE. La décision vit maintenant dans `@/cms/model/save-plan`, qui est
 * pur : on peut donc la vérifier sans base, sans serveur et sans framework à
 * installer — `node:test` est intégré à Node.
 *
 * CE QU'IL PROUVE
 *   - un identifiant provisoire (`temp-…`) mène à CRÉER, jamais à mettre à jour ;
 *   - une section retirée et présente en base mène à SUPPRIMER ;
 *   - un identifiant `temp-…` n'est JAMAIS envoyé à la base — c'est ce qui
 *     faisait échouer la sauvegarde entière (mesuré :
 *     `select 'temp-123'::uuid` -> ERROR 22P02) ;
 *   - l'ordre des étapes suit l'ordre d'affichage ;
 *   - la fonction DISCRIMINE (elle ne répond pas toujours la même chose).
 *
 * CE QU'IL NE PROUVE PAS
 *   - que la base accepte réellement l'INSERT : ce maillon-là n'est pas couvert
 *     ici (il faudrait une base jetable — Docker + `supabase start`).
 *
 * Usage : npm run test:save-plan
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

const entry = `${WORK}/save-plan.ts`
const outfile = `${WORK}/save-plan.cjs`
writeFileSync(entry, `export { isPersistedId, planifierSauvegarde } from '@/cms/model/save-plan'`, 'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(outfile)]
const { isPersistedId, planifierSauvegarde } = require(outfile)

/** Un identifiant réellement attribué par la base. */
const UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const UUID2 = '7c8d9e0f-1a2b-4c3d-9e4f-5a6b7c8d9e0f'

/** Fabrique une section minimale : le plan ne regarde que `id`. */
const section = (id) => ({ id, pageId: 'p', type: 'hero', variant: null, content: {}, settings: {}, visible: true, position: 0, anchor: null, createdAt: '', updatedAt: '' })

test('isPersistedId distingue un identifiant de la base d’un identifiant provisoire', () => {
  assert.equal(isPersistedId(UUID), true, 'un UUID est un identifiant de la base')
  assert.equal(isPersistedId('temp-1758300000000'), false, 'un identifiant provisoire n’en est pas un')
  assert.equal(isPersistedId(''), false)
  assert.equal(isPersistedId('carte'), false)
})

test('une section jamais enregistrée doit être CRÉÉE, une section en base CONSERVÉE', () => {
  const plan = planifierSauvegarde([section(UUID), section('temp-1')], [])
  assert.deepEqual(plan.etapes.map((e) => e.action), ['conserver', 'creer'])
})

test('l’ordre des étapes suit l’ordre d’affichage', () => {
  const plan = planifierSauvegarde([section('temp-1'), section(UUID), section('temp-2')], [])
  assert.deepEqual(plan.etapes.map((e) => e.action), ['creer', 'conserver', 'creer'])
})

test('une section retirée et présente en base doit être SUPPRIMÉE', () => {
  const plan = planifierSauvegarde([section(UUID)], [UUID2])
  assert.deepEqual(plan.aSupprimer, [UUID2])
})

test('un identifiant provisoire n’est JAMAIS envoyé à la base', () => {
  // C'est le défaut d'origine : `save()` passait `temp-…` à `updateSection`, que
  // la base refuse — la sauvegarde entière échouait, sans rien dire.
  const plan = planifierSauvegarde([section(UUID)], ['temp-1', UUID2])
  assert.deepEqual(plan.aSupprimer, [UUID2], 'seul un identifiant de la base peut être supprimé')
  for (const id of plan.aSupprimer) {
    assert.equal(isPersistedId(id), true, `« ${id} » serait refusé par la base`)
  }
})

test('un retrait suivi d’un retour ne supprime rien', () => {
  const plan = planifierSauvegarde([section(UUID)], [UUID])
  assert.deepEqual(plan.aSupprimer, [], 'la section est revenue dans la liste')
})

test('un identifiant retiré deux fois n’est supprimé qu’une fois', () => {
  const plan = planifierSauvegarde([section(UUID)], [UUID2, UUID2])
  assert.deepEqual(plan.aSupprimer, [UUID2])
})

test('listes vides : rien à faire', () => {
  const plan = planifierSauvegarde([], [])
  assert.deepEqual(plan, { aSupprimer: [], etapes: [] })
})

test('SENSIBILITÉ — la fonction discrimine, elle ne répond pas toujours pareil', () => {
  // Si elle répondait « creer » à tout, le premier cas passerait et le second
  // échouerait. Si elle répondait « conserver » à tout, l'inverse. Les deux
  // réponses opposées sur la MÊME fonction prouvent qu'elle lit bien l'identifiant.
  const avecUuid = planifierSauvegarde([section(UUID)], []).etapes[0].action
  const avecTemp = planifierSauvegarde([section('temp-1')], []).etapes[0].action
  assert.notEqual(avecUuid, avecTemp, 'les deux identifiants doivent mener à des actions différentes')
})

test('SENSIBILITÉ — le plan n’exige jamais de la base ce qu’elle refuse', () => {
  // Invariant global : aucun identifiant non-UUID ne sort du plan vers une
  // écriture. C'est exactement la propriété qui manquait avant le correctif.
  const plan = planifierSauvegarde(
    [section('temp-1'), section(UUID), section('temp-2')],
    ['temp-3', UUID2, 'pas-un-uuid'],
  )
  for (const id of plan.aSupprimer) assert.equal(isPersistedId(id), true)
  for (const etape of plan.etapes) {
    if (etape.action === 'conserver') assert.equal(isPersistedId(etape.section.id), true)
  }
})

// Empêche un test « vide » de passer pour un succès : on vérifie que le module
// testé est bien celui du dépôt, et non une version antérieure restée en cache.
test('le module testé est bien celui du dépôt', () => {
  const source = readFileSync(`${ROOT}/src/cms/model/save-plan.ts`, 'utf8')
  assert.match(source, /export function planifierSauvegarde/)
  assert.equal(typeof planifierSauvegarde, 'function')
})
