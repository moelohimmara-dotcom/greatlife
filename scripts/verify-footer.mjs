/**
 * CONTRÔLE DU PIED DE PAGE ET DE LA BARRE DE NAVIGATION — LECTURE SEULE.
 *
 * POURQUOI CE CONTRÔLE EXISTE (constat M2 de la revue indépendante)
 * `Footer.tsx` construisait ses ancres à partir du LIBELLÉ affiché :
 *     'La carte' → #lacarte     (l'ancre réelle est `carte`)   → lien mort
 *     'Équipe'   → #équipe      (l'ancre réelle est `equipe`)  → lien mort
 * Deux liens sur cinq ne menaient nulle part, et personne ne pouvait le voir :
 * `verify:lot1` compare le rendu des 10 SECTIONS, et `Footer` n'en fait pas
 * partie. Le pied de page échappait donc à tout filet.
 *
 * Ce contrôle relie les deux bouts : les ancres ÉCRITES dans les composants, et
 * les ancres RÉELLES portées par `page_sections.anchor`. Il refuse aussi les
 * coordonnées recopiées en dur dans le pied de page, qui est exactement le
 * défaut d'origine (TDR §16 : une source unique).
 *
 * Usage : node scripts/verify-footer.mjs   (ou `npm run verify:footer`)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ENV = {}
for (const line of readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
  if (line.includes('=') && !line.startsWith('#')) {
    const i = line.indexOf('=')
    ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}
const URL = ENV.VITE_SUPABASE_URL
const SVC = ENV.NEW_SERVICE_ROLE_KEY
if (!URL || !SVC) throw new Error('Variables Supabase manquantes dans .env')

/**
 * Le CODE d'un composant, débarrassé de ce qui n'en est pas.
 *
 * Les commentaires sont retirés, et ce n'est pas un détail : ce fichier
 * DOCUMENTE le défaut qu'il traque (« +224 620 00 00 00 », « Kaloum »). Sans
 * cette coupe, le contrôle échouerait sur sa propre explication — et le
 * réflexe serait de supprimer l'explication plutôt que de garder le filet.
 * Un contrôle doit lire le code, pas la prose qui le commente.
 *
 * Les lignes `import` sont écartées aussi : leurs chemins contiennent `@` et
 * `#`, qui n'ont rien à voir avec une ancre ou une adresse e-mail.
 */
function codeSeul(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*import\b/.test(l))
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n')
}

/** Ancres utilisées par un composant. */
function ancresUtilisees(source) {
  const corps = codeSeul(source)

  const paires = [...corps.matchAll(/\['[^']*',\s*'([^']+)'\]/g)].map((m) => m[1])
  const litteraux = [...corps.matchAll(/href="#([^"{}]+)"/g)].map((m) => m[1])
  const scrollSpy = [...corps.matchAll(/const\s+linkIds\s*=\s*\[([^\]]*)\]/g)].flatMap((m) =>
    [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]),
  )

  return [...new Set([...paires, ...litteraux, ...scrollSpy])]
}

/**
 * Coordonnées recopiées en dur dans un composant.
 * Volontairement large : on préfère une alerte à corriger qu'un doublon
 * silencieux entre le pied de page et l'administration.
 */
const INTERDITS = [
  { quoi: 'un numéro de téléphone', motif: /\+224[\s\d]{6,}/ },
  { quoi: 'une adresse e-mail', motif: /[a-z0-9._%-]+@[a-z0-9-]+\.[a-z]{2,}/i },
  { quoi: 'une adresse postale', motif: /\bKaloum\b/ },
]

function coordonneesEnDur(source) {
  const corps = codeSeul(source)
  return INTERDITS.filter(({ motif }) => motif.test(corps)).map(({ quoi }) => quoi)
}

/** Comparaison des ancres écrites aux ancres réelles. Rend la liste des fautives. */
function ancresInconnues(utilisees, reelles) {
  return utilisees.filter((a) => !reelles.includes(a))
}

// ---------------------------------------------------------------- lecture base
async function lecture(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} :: ${t.slice(0, 200)}`)
  return t ? JSON.parse(t) : null
}

const lignes = await lecture('page_sections?select=anchor&anchor=not.is.null')
const reelles = [...new Set((lignes ?? []).map((r) => r.anchor))].sort()

const FOOTER = readFileSync(`${ROOT}/src/sections/Footer.tsx`, 'utf8')
const NAV = readFileSync(`${ROOT}/src/components/nav/PublicNav.tsx`, 'utf8')

console.log('='.repeat(66))
console.log('A. LES ANCRES REELLES, LUES EN BASE')
console.log('='.repeat(66))
console.log(`  ${reelles.length} ancres portees par page_sections : ${reelles.join(', ')}`)
if (reelles.length === 0) {
  console.log('  ECHEC : aucune ancre en base, le controle ne peut rien prouver.')
  process.exitCode = 1
}

console.log('\n' + '='.repeat(66))
console.log('B. LES ANCRES ECRITES DANS LES COMPOSANTS')
console.log('='.repeat(66))

let fautif = false
for (const [nom, source] of [['Footer', FOOTER], ['PublicNav', NAV]]) {
  const utilisees = ancresUtilisees(source)
  const inconnues = ancresInconnues(utilisees, reelles)
  console.log(`  ${nom} : ${utilisees.join(', ')}`)
  if (inconnues.length > 0) {
    console.log(`    ECHEC : ancre(s) inexistante(s) -> ${inconnues.join(', ')}`)
    console.log('    Un lien du menu ne mene nulle part (constat M2).')
    fautif = true
  } else {
    console.log('    toutes mènent à une section réelle')
  }
}
if (fautif) process.exitCode = 1

console.log('\n' + '='.repeat(66))
console.log('C. COORDONNEES RECOPIEES EN DUR DANS LE PIED DE PAGE (TDR §16)')
console.log('='.repeat(66))
const enDur = coordonneesEnDur(FOOTER)
if (enDur.length > 0) {
  console.log(`  ECHEC : le pied de page code en dur ${enDur.join(', ')}.`)
  console.log('  La source unique est `site_content.restaurant`.')
  process.exitCode = 1
} else {
  console.log('  aucune coordonnée en dur — le pied de page lit les réglages du restaurant')
}

console.log('\n' + '='.repeat(66))
console.log('D. SENSIBILITE — ce controle sait-il dire NON ?')
console.log('='.repeat(66))

// 1. Une ancre inventee doit etre vue.
const avecAncreFausse = FOOTER.replace(
  "const NAV_LINKS: ReadonlyArray<readonly [string, string]> = [",
  "const NAV_LINKS: ReadonlyArray<readonly [string, string]> = [\n  ['Faux', 'ancre-qui-nexiste-pas'],",
)
const detecteAncre = ancresInconnues(ancresUtilisees(avecAncreFausse), reelles).includes(
  'ancre-qui-nexiste-pas',
)
console.log(`  une ancre inventee est détectée : ${detecteAncre ? 'OUI' : 'NON'}`)
if (!detecteAncre) process.exitCode = 1

// 2. Le defaut d'ORIGINE exact doit etre vu : une ancre derivee du libelle.
const avecDefautOrigine = FOOTER.replace(
  "const NAV_LINKS: ReadonlyArray<readonly [string, string]> = [",
  "const NAV_LINKS: ReadonlyArray<readonly [string, string]> = [\n  ['La carte', 'lacarte'],\n  ['Équipe', 'équipe'],",
)
const detecteOrigine = ancresInconnues(ancresUtilisees(avecDefautOrigine), reelles).sort()
console.log(`  le défaut d'origine (#lacarte, #équipe) est détecté : ${detecteOrigine.length === 2 ? 'OUI' : 'NON'} — ${detecteOrigine.join(', ')}`)
if (detecteOrigine.length !== 2) process.exitCode = 1

// 3. Une coordonnee en dur doit etre vue.
const avecTelephone = FOOTER.replace('{coordonnees.map(', '{["+224 620 00 00 00"].map(')
const detecteTel = coordonneesEnDur(avecTelephone).length > 0
console.log(`  un numéro en dur est détecté : ${detecteTel ? 'OUI' : 'NON'}`)
if (!detecteTel) process.exitCode = 1

console.log('\n' + '='.repeat(66))
console.log(process.exitCode ? 'ECHEC — voir les lignes ci-dessus.' : 'PIED DE PAGE ET NAVIGATION VERIFIES.')
console.log('AUCUNE ECRITURE N\'A ETE EFFECTUEE — cette sonde ne fait que lire.')
console.log('='.repeat(66))
