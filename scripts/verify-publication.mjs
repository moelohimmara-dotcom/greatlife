/**
 * Greatlife — contrôle de la PRÉCONDITION DE PUBLICATION
 * =======================================================
 * Constat I2 de la revue indépendante : publier une page dont AUCUNE section
 * n'est visible était accepté. Le validateur répondait « publiable », l'éditeur
 * affichait « ● En ligne », et le site public montrait toujours l'ancien contenu.
 *
 * POURQUOI C'EST GRAVE
 * `PublicSite` n'emprunte le chemin CMS que si `resolvedSections.length > 0`.
 * Avec 0 section visible, l'instantané est vide, donc le visiteur retombe sur le
 * rendu historique — l'ANCIEN site — pendant que l'éditeur annonce que c'est en
 * ligne. Aucune erreur, aucun signal : c'est le repli silencieux que l'en-tête
 * de la migration 030 désigne comme le mode de panne le plus coûteux du lot.
 *
 * POURQUOI CE N'EST PAS DANS LES 7 CONTRÔLES DU TDR §24
 * Ces 7 contrôles portent sur le CONTENU. « La page n'a rien à montrer » est une
 * condition d'EXISTENCE de la publication. On l'a donc gardée séparée, pour que
 * `runPublicationChecks` conserve exactement le contrat du TDR — et pour ne pas
 * casser `verify:lot3`, qui éprouve ces 7 contrôles sur des jeux d'essai
 * volontairement sans section.
 *
 * CE QUE CE CONTRÔLE VÉRIFIE
 *   A. la précondition refuse un instantané vide, avec un motif explicite ;
 *   B. elle ne refuse PAS un instantané qui a au moins une section visible ;
 *   C. sensibilité : un seul paramètre change entre les deux cas — la visibilité
 *      — donc la cause du refus est bien celle-là ;
 *   D. elle est RÉELLEMENT branchée dans `publishPage` (contrôle statique,
 *      annoncé comme tel : il lit la source, il n'exécute pas le chemin).
 *
 * Usage : node scripts/verify-publication.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')

async function bundleFile(name, contents) {
  const entry = `${WORK}/${name}.tsx`
  const outfile = `${WORK}/${name}.cjs`
  writeFileSync(entry, contents, 'utf8')
  await build({
    entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
    jsx: 'automatic', define: { 'import.meta.env': '{}' },
    alias: { '@': `${ROOT}/src` }, loader: { '.tsx': 'tsx', '.ts': 'ts' },
    logLevel: 'warning',
  })
  delete require.cache[require.resolve(outfile)]
  return require(outfile)
}

const M = await bundleFile('pub-precond', `
  export { snapshotEmptinessFinding } from '@/cms/model/publishing'
`)

const failures = []
function check(ok, label, detail) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

console.log('Précondition de publication — un instantané VIDE peut-il être publié ?\n')

// On ne teste QUE la fonction pure : elle ne dépend ni de la base ni du réseau,
// donc le verdict ne dépend pas de l'environnement.
const vide = M.snapshotEmptinessFinding([{ visible: false }, { visible: false }])
const plein = M.snapshotEmptinessFinding([{ visible: false }, { visible: true }])
const aucun = M.snapshotEmptinessFinding([])

console.log('A. aucune section visible')
check(vide !== null, 'la publication est REFUSÉE')
check(!!vide && vide.level === 'error', 'le constat est BLOQUANT', vide ? `level=${vide.level}` : '—')
check(!!vide && /Aucune section n'est visible/i.test(vide.message),
  'le motif est explicite pour le restaurateur', vide ? vide.message.slice(0, 68) + '…' : '—')
check(!!vide && /ancien/i.test(vide.message),
  'le motif dit la CONSÉQUENCE (le site garderait l\'ancien contenu)')

console.log('\nB. au moins une section visible')
check(plein === null, 'la publication est AUTORISÉE — la règle ne bloque pas à tort')

console.log('\nC. sensibilité')
check(vide !== null && plein === null,
  'un seul paramètre change (la visibilité) et le verdict bascule')
check(aucun !== null, 'une page SANS aucune section est refusée elle aussi',
  'sinon le public retomberait aussi sur l\'ancien rendu')

console.log('\nD. la précondition est-elle branchée dans publishPage ? (contrôle statique)')
const src = readFileSync(`${ROOT}/src/cms/repository/publishing.ts`, 'utf8')
check(/snapshotEmptinessFinding\s*\(/.test(src),
  'publishing.ts appelle snapshotEmptinessFinding')
check(/rapportFinal|videFinding/.test(src),
  'le constat est ajouté au rapport, donc le panneau peut expliquer le refus')
// Le refus doit passer par le rapport, pas par un `return` muet.
check(/if\s*\(\s*!rapportFinal\.publishable\s*\)/.test(src),
  'le refus s\'appuie sur le rapport (rapportFinal), pas sur un retour silencieux')

console.log('\n' + '='.repeat(64))
if (failures.length) {
  console.log(`❌ PRÉCONDITION EN ÉCHEC — ${failures.length} contrôle(s) :`)
  for (const f of failures) console.log(`   · ${f}`)
  process.exit(1)
}
console.log('✅ PRÉCONDITION VÉRIFIÉE — un instantané vide ne peut pas être publié.')
