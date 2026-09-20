/**
 * CONTRÔLE DES COULOIRS — qui a le droit d'écrire quoi.
 *
 * POURQUOI CE FILET EXISTE (2026-09-20)
 * Deux agents ont travaillé sur ce dépôt **le même matin** : l'un a corrigé la
 * console et déployé à 07:35, l'autre a livré les dispositions de la Bannière et
 * déployé à 08:28. Aucun dégât — les filets ont rattrapé — mais la collision
 * était réelle et rien ne la signalait. Un tableau dans un document n'aurait pas
 * suffi : deux agents qui ne se lisent pas ne le respecteraient pas.
 *
 * Ce script rend la règle VÉRIFIABLE : il confronte les fichiers que la branche
 * courante modifie aux couloirs déclarés dans `scripts/couloirs.json`.
 *
 *   écart hors de son couloir  -> ÉCHEC   (on écrit chez l'autre)
 *   fichier partagé touché     -> AVERTISSEMENT (permis, mais à annoncer)
 *   fichier sans couloir       -> AVERTISSEMENT (personne ne le revendique)
 *
 * À lancer AVANT de pousser. Usage :
 *   node scripts/verify-couloirs.mjs                 (branche courante)
 *   node scripts/verify-couloirs.mjs --branche nom    (vérifie un autre couloir)
 *   node scripts/verify-couloirs.mjs --base main      (autre référence)
 *
 * N'ÉCRIT RIEN : lecture de git et d'un JSON.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CARTE = JSON.parse(readFileSync(`${ROOT}/scripts/couloirs.json`, 'utf8'))

/** Dépendances → git, en une seule fonction, pour que tout passe par le même chemin. */
function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/**
 * Convertit un motif de couloir en expression régulière.
 * `**` traverse les dossiers, `*` reste dans un segment. Les motifs sont
 * ancrés : `src/sections/**` ne doit PAS capturer `src/admin/sections.ts`.
 */
export function motifVersRegex(motif) {
  const echappe = motif.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const corps = echappe
    .replace(/\*\*\//g, '\u0000') // sentinelle : dossier quelconque, optionnel
    .replace(/\*\*/g, '\u0001') // sentinelle : n'importe quoi
    .replace(/\*/g, '[^/]*')
    .split('\u0000')
    .join('(?:[^/]+/)*')
    .split('\u0001')
    .join('.*')
  return new RegExp(`^${corps}$`)
}

/** Un chemin appartient-il au couloir ? */
export function appartient(chemin, motifs) {
  return motifs.some((m) => motifVersRegex(m).test(chemin))
}

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2)
const argBranche = argv.includes('--branche') ? argv[argv.indexOf('--branche') + 1] : null
const argBase = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null

const base = argBase ?? CARTE.base
const couloirs = CARTE.couloirs
const partages = CARTE.partages.fichiers

// ------------------------------------------------- quelle branche / quel couloir
let nomCouloir = argBranche
if (!nomCouloir) {
  const branche = git('rev-parse', '--abbrev-ref', 'HEAD')
  const trouve = Object.entries(couloirs).find(([, c]) => c.branche === branche)
  if (!trouve) {
    /*
      On ne devine PAS. Une branche inconnue n'est pas forcément une erreur
      (l'autre agent utilise une branche par fonctionnalité), mais on refuse de
      choisir un couloir au hasard : ce serait déclarer à sa place.
    */
    console.log('='.repeat(72))
    console.log('COULOIRS — branche NON DÉCLARÉE')
    console.log('='.repeat(72))
    console.log(`  branche courante : ${branche}`)
    console.log('  Aucun couloir ne la revendique. Couloirs connus :')
    for (const [nom, c] of Object.entries(couloirs)) {
      console.log(`    ${nom.padEnd(20)} ${c.branche}  (${c.responsable})`)
    }
    console.log('\n  Pour vérifier un couloir précis :')
    console.log('    node scripts/verify-couloirs.mjs --branche <nom-du-couloir>\n')
    process.exit(0)
  }
  nomCouloir = trouve[0]
}

const couloir = couloirs[nomCouloir]
if (!couloir) {
  console.error(`Couloir inconnu : « ${nomCouloir} ». Connus : ${Object.keys(couloirs).join(', ')}`)
  process.exit(2)
}

// ---------------------------------------------------------------- les fichiers
let fichiers = []
try {
  fichiers = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean)
} catch {
  console.error(`Impossible de comparer à « ${base} ». La référence existe-t-elle ? (git fetch)`)
  process.exit(2)
}

const dedans = fichiers.filter((f) => appartient(f, couloir.fichiers))
const partagesTouches = fichiers.filter((f) => partages.includes(f))
const ailleurs = fichiers.filter(
  (f) => !appartient(f, couloir.fichiers) && !partages.includes(f),
)

console.log('='.repeat(72))
console.log(`COULOIRS — couloir « ${nomCouloir} » (${couloir.responsable})`)
console.log('='.repeat(72))
console.log(`  référence : ${base}  ·  ${fichiers.length} fichier(s) modifié(s)`)
console.log(`  ${dedans.length} dans le couloir  ·  ${partagesTouches.length} partagé(s)  ·  ${ailleurs.length} hors couloir`)

if (dedans.length > 0) {
  console.log('\n  DANS LE COULOIR :')
  for (const f of dedans) console.log(`    ✓ ${f}`)
}

if (partagesTouches.length > 0) {
  console.log('\n  FICHIERS PARTAGÉS — permis, mais à ANNONCER à l\'autre agent :')
  for (const f of partagesTouches) console.log(`    ! ${f}`)
}

if (ailleurs.length > 0) {
  console.log('\n  HORS COULOIR — ces fichiers appartiennent à quelqu\'un d\'autre :')
  for (const f of ailleurs) {
    const proprietaire = Object.entries(couloirs).find(([n, c]) => n !== nomCouloir && appartient(f, c.fichiers))
    console.log(`    ✗ ${f}${proprietaire ? `  -> couloir « ${proprietaire[0]} » (${proprietaire[1].responsable})` : '  -> aucun couloir ne le revendique'}`)
  }
  console.log('\n  Deux issues, et une seule est bonne :')
  console.log('    1. Déplacer ce travail dans le couloir qui le revendique ;')
  console.log('    2. Si le couloir est mal découpé, CORRIGER `scripts/couloirs.json`')
  console.log('       et le dire — un découpage faux se répare, une collision silencieuse non.')
  process.exitCode = 1
}

console.log('\n' + '='.repeat(72))
console.log('SENSIBILITÉ — ce contrôle sait-il dire NON ?')
console.log('='.repeat(72))

/*
  Un filet qui ne peut pas échouer ne prouve rien : c'est la leçon des trois
  revues du 2026-09-20. Ces cas figent le comportement du CLASSEMENT, y compris
  ses deux pièges : le `**` doit traverser les dossiers, le `*` non — sinon
  `src/sections/**` capturerait `src/admin/sections.ts`, qui n'a rien à voir.
*/
const CAS = [
  ['un fichier de l\'autre couloir est classé CHEZ LUI', 'src/sections/Hero.tsx', 'edition-sections', true],
  ['et pas chez moi', 'src/sections/Hero.tsx', 'fiabilite-depot', false],
  ['mon filet est bien chez moi', 'scripts/verify-lot1.mjs', 'fiabilite-depot', true],
  ['mais pas chez lui', 'scripts/verify-lot1.mjs', 'edition-sections', false],
  ['le filet des dispositions est chez lui', 'scripts/verify-dispositions.mjs', 'edition-sections', true],
  ['un fichier de base est chez moi', 'supabase/migrations/034_x.sql', 'fiabilite-depot', true],
  ['** traverse les dossiers', 'src/cms/repository/sections.ts', 'fiabilite-depot', true],
  ['* ne traverse PAS les dossiers', 'src/admin/sections.ts', 'edition-sections', false],
  ['un chemin voisin ne doit pas matcher', 'src/cms/repository-old/x.ts', 'fiabilite-depot', false],
  ['le panneau de propriétés est chez lui', 'src/admin/editor/PropertyPanel.tsx', 'edition-sections', true],
]

let sensibiliteKo = 0
for (const [quoi, chemin, couloirTeste, attendu] of CAS) {
  const obtenu = appartient(chemin, couloirs[couloirTeste].fichiers)
  const ok = obtenu === attendu
  if (!ok) sensibiliteKo++
  console.log(`  ${ok ? 'OUI' : 'NON'}  ${quoi}`)
  if (!ok) console.log(`       attendu ${attendu}, obtenu ${obtenu}`)
}
if (sensibiliteKo > 0) {
  console.log(`\n  ECHEC : ${sensibiliteKo} cas de sensibilité faux. Le classement ne vaut rien tel quel.`)
  process.exitCode = 1
}

console.log('\n' + '='.repeat(72))
console.log(
  process.exitCode
    ? 'ECHEC — voir les fichiers hors couloir ci-dessus.'
    : 'COULOIR RESPECTÉ — aucun fichier de l\'autre agent n\'a été touché.',
)
console.log('AUCUNE ÉCRITURE : ce contrôle ne lit que git et un JSON.')
console.log('='.repeat(72))
