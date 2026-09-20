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
writeFileSync(entry, [
  "export { isPersistedId, planifierSauvegarde, empreinteSauvegarde } from '@/cms/model/save-plan'",
  "export { fusionnePatch, clefsCoordonnees, fusionBilingue, CLEFS_COORDONNEES } from '@/cms/model/contenu-patch'",
].join('\n'), 'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(outfile)]
const { isPersistedId, planifierSauvegarde, empreinteSauvegarde, fusionnePatch, clefsCoordonnees, fusionBilingue } = require(outfile)

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

// ---------------------------------------------------------------------------
// FUSION PAR DOMAINE (`@/cms/model/contenu-patch`) — plan P0 du 2026-09-20.
// Quatre écrans partageaient l'écriture TOTALE de `site_config` : un champ
// vide dans l'écran A écrasait la valeur publiée depuis l'écran B. La propriété
// testée ici est celle qui ferme le piège : UNE CLÉ ABSENTE DU PATCH SURVIVIT
// INTACTE, quelle que soit sa valeur.

test('FUSION — une clé absente du patch survit intacts, même si le patch porte une valeur vide', () => {
  const actuel = { phone: '225012020202', team: [{ name: 'A' }], emailContact: '' }
  const fusion = fusionnePatch(actuel, { emailContact: '' })
  assert.equal(fusion.phone, '225012020202', 'le téléphone survit : absent du patch')
  assert.deepEqual(fusion.team, [{ name: 'A' }], 'l’équipe survit : absent du patch')
})

test('FUSION — une clé PRESENTE dans le patch est appliquée, y compris pour vider', () => {
  const fusion = fusionnePatch({ phone: '22501201202'.slice(0, 12) }, { autoReply: 'Bonjour' })
  assert.equal(fusion.emailContact, undefined)
  const vide = fusionnePatch({ phone: '' }, {})
  assert.equal(vide.phone, '')
})

test('FUSION — l’écrasement annoncé par le patch gagne sur toute valeur périmée', () => {
  const fusion = fusionnePatch(
    { phone: '+224 000 00 00 00', slogan: 'ancien' },
    { phone: '+224 661 16 44 58' },
  )
  assert.equal(fusion.phone, '+224 661 16 44 58')
  assert.equal(fusion.slogan, 'ancien')
})

test('MIROIR — seul un champ de COORDONNÉE présent dans le patch atteint `restaurant`', () => {
  assert.deepEqual(clefsCoordonnees({ autoReply: 'x', phone: '+224…' }), ['phone'])
  assert.deepEqual(clefsCoordonnees({ team: [] }), [], 'l’équipe n’est pas une coordonnée')
  assert.deepEqual(clefsCoordonnees({}), [])
  const lesCinq = clefsCoordonnees({
    phone: 1, emailContact: 1, emailReservation: 1, address: 1, hours: 1,
  })
  assert.equal(lesCinq.length, 5)
})

test('BILINGUE — fusionner ne détruit plus l’anglais (migration 032, revue I6)', () => {
  assert.deepEqual(fusionBilingue({ fr: 'Conakry', en: 'Conakry, Guinea' }, 'Conakry, Ratoma'), {
    fr: 'Conakry, Ratoma',
    en: 'Conakry, Guinea',
  })
  assert.deepEqual(fusionBilingue('chaîne plate', 'Guinée'), { fr: 'Guinée' })
})

// Empêche un test « vide » de passer pour un succès : on vérifie que le module
// testé est bien celui du dépôt, et non une version antérieure restée en cache.
test('le module testé est bien celui du dépôt', () => {
  const source = readFileSync(`${ROOT}/src/cms/model/save-plan.ts`, 'utf8')
  assert.match(source, /export function planifierSauvegarde/)
  assert.equal(typeof planifierSauvegarde, 'function')
})

// ---------------------------------------------------------------------------
// EMPREINTE DE SAUVEGARDE — elle sert à DÉTECTER une saisie faite pendant
// l'enregistrement (revue du 2026-09-20, I-5). Elle doit donc voir les vraies
// modifications, et RIEN d'autre : une empreinte trop sensible alarmerait sans
// raison, une empreinte aveugle laisserait la perte silencieuse.

test('l’empreinte IGNORE les identifiants (ils changent légitimement temp- → UUID)', () => {
  const avant = [section('temp-1')]
  const apres = [{ ...section('temp-1'), id: UUID }]
  assert.equal(empreinteSauvegarde(avant), empreinteSauvegarde(apres))
})

test('l’empreinte IGNORE les positions (elles sont recalculées depuis l’ordre)', () => {
  const a = [{ ...section(UUID), position: 3 }]
  const b = [{ ...section(UUID), position: 0 }]
  assert.equal(empreinteSauvegarde(a), empreinteSauvegarde(b))
})

test('SENSIBILITÉ — l’empreinte DÉTECTE une saisie arrivée pendant l’enregistrement', () => {
  const avant = [section(UUID)]
  const apres = [{ ...section(UUID), content: { title: { fr: 'tapé pendant la sauvegarde' } } }]
  assert.notEqual(empreinteSauvegarde(avant), empreinteSauvegarde(apres))
})

test('SENSIBILITÉ — l’empreinte détecte un masquage et un réordonnancement', () => {
  const a = { ...section(UUID), type: 'hero', content: { title: { fr: 'A' } } }
  const b = { ...section(UUID2), type: 'blog', content: { title: { fr: 'B' } } }
  assert.notEqual(empreinteSauvegarde([a, b]), empreinteSauvegarde([{ ...a, visible: false }, b]))
  assert.notEqual(empreinteSauvegarde([a, b]), empreinteSauvegarde([b, a]))
})

/*
  LIMITE CONNUE, MESURÉE ICI POUR QU'ELLE NE SOIT PAS SUPPOSÉE.
  Deux sections que RIEN ne distingue (même type, même contenu, même ancre, même
  visibilité) sont interchangeables sans changer l'empreinte : les échanger
  n'avertirait donc pas. C'est assumé — un tel échange est aussi sans effet
  visible, puisque les deux sections sont identiques. Si un jour un champ
  distinctif est ajouté (icône, identifiant affiché), cette limite disparaîtra
  d'elle-même. Le test fige la limite pour qu'un changement de comportement se
  voie.
*/
test('LIMITE CONNUE — deux sections rigoureusement identiques restent interchangeables', () => {
  const jumelles = [section(UUID), section(UUID2)]
  assert.equal(empreinteSauvegarde(jumelles), empreinteSauvegarde([jumelles[1], jumelles[0]]))
})
