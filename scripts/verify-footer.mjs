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
 * ---------------------------------------------------------------------------
 * DURCISSEMENT APRÈS LA REVUE DU 2026-09-19 — ce contrôle produisait un FAUX
 * VERT, et c'est ce qui a motivé les quatre corrections ci-dessous :
 *
 *  1. IL CERTIFIAIT UNE ADRESSE EN DUR. La première version cherchait le mot
 *     « Kaloum » — l'ANCIENNE valeur. Or `Footer.tsx` contenait encore
 *     « Conakry, Guinée », qui est la valeur CANONIQUE de
 *     `site_content.restaurant.address`. Résultat : le contrôle disait
 *     « aucune coordonnée en dur » sur un fichier qui en contenait une.
 *     Une liste de valeurs interdites connues ne peut pas attraper une valeur
 *     qu'on n'a pas prévue. La section C compare donc désormais aux valeurs
 *     RÉELLES, lues en base au moment du contrôle.
 *
 *  2. IL N'ÉTAIT PAS FILTRÉ. Les ancres « réelles » étaient lues sur TOUTE
 *     `page_sections`, y compris les sections MASQUÉES : l'ancre `temoignages`
 *     (section `visible = false`, mesurée) était donc acceptée, alors que le
 *     public ne reçoit que 9 sections sur 10. Un lien vers `#temoignages`
 *     aurait été certifié conforme et pourtant mort. La section A ne retient
 *     plus que les sections VISIBLES d'une page PUBLIÉE — ce que le public
 *     reçoit réellement.
 *
 *  3. IL POUVAIT PASSER SUR DU VIDE. Si l'extraction ne trouvait AUCUNE ancre
 *     dans un composant (refonte de la liste en objets, par exemple), la boucle
 *     ne vérifiait rien et affichait « toutes mènent à une section réelle ».
 *     Un contrôle qui n'a rien contrôlé ne doit pas dire oui : c'est désormais
 *     une erreur.
 *
 *  4. IL LISAIT TROP LARGE. Le motif `['x', 'y']` capturait n'importe quel
 *     couple de littéraux : une paire `['fr', 'en']` faisait apparaître une
 *     ancre fantôme. Les ancres ne sont plus extraites que des listes
 *     DÉCLARÉES (`NAV_LINKS`, `links`, `linkIds`).
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
 * Retire un commentaire de fin de ligne SANS toucher aux `//` qui se trouvent
 * à l'intérieur d'une chaîne. Une simple regex `/\/\/.*$/` tronquerait une URL
 * (`https://…`) et ferait disparaître du code réel du champ de contrôle.
 */
function sansCommentaireDeLigne(ligne) {
  let guillemet = null
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (guillemet) {
      if (c === '\\') { i++; continue }
      if (c === guillemet) guillemet = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { guillemet = c; continue }
    if (c === '/' && ligne[i + 1] === '/') return ligne.slice(0, i)
  }
  return ligne
}

/**
 * Le CODE d'un composant, débarrassé de ce qui n'en est pas.
 *
 * Les commentaires sont retirés, et ce n'est pas un détail : ce fichier
 * DOCUMENTE les défauts qu'il traque (« +224 620 00 00 00 », « Kaloum »). Sans
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
    .map(sansCommentaireDeLigne)
    .join('\n')
}

/**
 * Le contenu d'un littéral de tableau DÉCLARÉ (`const NAV_LINKS = [ … ]`).
 *
 * On part de l'ASSIGNATION, pas du nom : le type peut lui-même contenir des
 * crochets (`ReadonlyArray<readonly [string, string]>`), et s'y arrêter faisait
 * rendre à l'extraction le contenu du TYPE au lieu de celui de la liste — un
 * bloc vide, donc « 0 ancre », donc un échec trompeur sur un fichier correct.
 *
 * Si la valeur n'est pas un tableau (refonte en objet, par exemple), on renvoie
 * une chaîne vide : la garde anti-vide fera son travail au lieu de chercher un
 * crochet plus loin dans le fichier.
 *
 * Repérage par profondeur de crochets, pour tenir aussi bien la liste sur une
 * ligne (`linkIds`) que la liste étalée sur plusieurs (`links`).
 */
function blocDeclare(source, nom) {
  const m = new RegExp(`const\\s+${nom}\\b`).exec(source)
  if (!m) return ''
  const egal = source.indexOf('=', m.index)
  if (egal === -1) return ''

  let j = egal + 1
  while (j < source.length && /\s/.test(source[j])) j++
  if (source[j] !== '[') return ''

  let profondeur = 0
  for (let k = j; k < source.length; k++) {
    if (source[k] === '[') profondeur++
    else if (source[k] === ']') {
      profondeur--
      if (profondeur === 0) return source.slice(j, k + 1)
    }
  }
  return ''
}

/** Ancres utilisées par un composant, extraites de ses listes déclarées. */
function ancresUtilisees(source, { paires = [], simples = [] } = {}) {
  const corps = codeSeul(source)
  const blocPaires = paires.map((n) => blocDeclare(corps, n)).join('\n')
  const blocSimples = simples.map((n) => blocDeclare(corps, n)).join('\n')

  const enPaires = [...blocPaires.matchAll(/\['[^']*',\s*'([^']+)'\]/g)].map((m) => m[1])
  const enSimples = [...blocSimples.matchAll(/'([^']+)'/g)].map((m) => m[1])
  const litteraux = [...corps.matchAll(/href="#([^"{}]+)"/g)].map((m) => m[1])

  return [...new Set([...enPaires, ...enSimples, ...litteraux])]
}

/**
 * Valeurs de coordonnées recopiées en dur dans le code.
 *
 * `name` est VOLONTAIREMENT exclu : le pied de page affiche « Greatlife » comme
 * marque, et ce n'est pas une coordonnée. Les quatre autres clés sont celles que
 * le restaurateur règle dans l'administration : elles ne doivent exister qu'à un
 * seul endroit (TDR §16).
 */
const CLES_COORDONNEES = ['address', 'phone', 'emailContact', 'hours']

/** Valeurs périmées, gardées nommément : elles ne sont plus canoniques. */
const VALEURS_PERIMEES = [
  { quoi: 'une ancienne adresse', motif: /\bKaloum\b/ },
  { quoi: 'un ancien numéro', motif: /\+224\s*620/ },
]

function textesDe(valeur) {
  if (typeof valeur === 'string') return [valeur]
  if (valeur && typeof valeur === 'object') return Object.values(valeur).flatMap(textesDe)
  return []
}

/** Coordonnées trouvées en dur dans le code d'un composant. */
function coordonneesEnDur(source, canoniques) {
  const corps = codeSeul(source)
  const trouvees = []

  for (const valeur of canoniques) {
    if (corps.includes(valeur)) trouvees.push(`la valeur canonique « ${valeur} »`)
  }
  for (const { quoi, motif } of VALEURS_PERIMEES) {
    if (motif.test(corps)) trouvees.push(quoi)
  }
  return trouvees
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

// ============================================================ A. ancres servies
const pagesPubliees = await lecture('pages?select=id&status=eq.published')
const idsPages = new Set((pagesPubliees ?? []).map((p) => p.id))
const toutesSections = await lecture('page_sections?select=anchor,page_id,visible&anchor=not.is.null')
const reelles = [
  ...new Set(
    (toutesSections ?? [])
      .filter((s) => s.visible === true && idsPages.has(s.page_id))
      .map((s) => s.anchor),
  ),
].sort()

const masquees = (toutesSections ?? [])
  .filter((s) => s.visible !== true && s.anchor)
  .map((s) => s.anchor)

console.log('='.repeat(70))
console.log('A. LES ANCRES REELLEMENT SERVIES AU PUBLIC')
console.log('='.repeat(70))
console.log(`  ${reelles.length} ancres de sections VISIBLES sur page PUBLIEE :`)
console.log(`    ${reelles.join(', ')}`)
if (masquees.length > 0) {
  console.log(`  ${masquees.length} ancre(s) de sections MASQUEES, exclues du controle : ${masquees.join(', ')}`)
  console.log('    -> un lien vers celles-la serait mort : le public ne les recoit pas.')
}
if (reelles.length === 0) {
  console.log('  ECHEC : aucune ancre servie, le controle ne peut rien prouver.')
  process.exitCode = 1
}

// ======================================================== B. ancres ecrites
const FOOTER = readFileSync(`${ROOT}/src/sections/Footer.tsx`, 'utf8')
const NAV = readFileSync(`${ROOT}/src/components/nav/PublicNav.tsx`, 'utf8')

const COMPOSANTS = [
  { nom: 'Footer', source: FOOTER, listes: { paires: ['NAV_LINKS'] }, minimum: 2 },
  { nom: 'PublicNav', source: NAV, listes: { paires: ['links'], simples: ['linkIds'] }, minimum: 2 },
]

console.log('\n' + '='.repeat(70))
console.log('B. LES ANCRES ECRITES DANS LES COMPOSANTS')
console.log('='.repeat(70))

let fautif = false
for (const { nom, source, listes, minimum } of COMPOSANTS) {
  const utilisees = ancresUtilisees(source, listes)
  console.log(`  ${nom} : ${utilisees.length > 0 ? utilisees.join(', ') : '(aucune)'}`)

  // GARDE ANTI-VIDE : rien trouvé = rien vérifié. Dire « tout va bien » serait
  // le faux vert le plus coûteux, parce qu'il est silencieux.
  if (utilisees.length < minimum) {
    console.log(`    ECHEC : ${utilisees.length} ancre(s) extraite(s), ${minimum} attendues au minimum.`)
    console.log('    L\'extraction ne trouve plus la liste : le controle ne verifie RIEN.')
    fautif = true
    continue
  }

  const inconnues = utilisees.filter((a) => !reelles.includes(a))
  if (inconnues.length > 0) {
    console.log(`    ECHEC : ancre(s) inexistante(s) -> ${inconnues.join(', ')}`)
    console.log('    Un lien du menu ne mene nulle part (constat M2).')
    fautif = true
  } else {
    console.log('    toutes mènent à une section réellement servie')
  }
}
if (fautif) process.exitCode = 1

// ============================================== C. coordonnees en dur
const reglages = await lecture('site_content?select=value&key=eq.restaurant')
const restaurant = reglages?.[0]?.value ?? {}
const canoniques = CLES_COORDONNEES.flatMap((cle) => textesDe(restaurant[cle]))
  .map((t) => t.trim())
  .filter((t) => t.length >= 5)

console.log('\n' + '='.repeat(70))
console.log('C. COORDONNEES RECOPIEES EN DUR DANS LE PIED DE PAGE (TDR §16)')
console.log('='.repeat(70))
console.log(`  ${canoniques.length} valeurs canoniques épiées, lues en base :`)
for (const v of canoniques) console.log(`    « ${v} »`)
if (canoniques.length === 0) {
  console.log('  ECHEC : aucune valeur canonique lue, le controle ne peut rien prouver.')
  process.exitCode = 1
}

const enDur = coordonneesEnDur(FOOTER, canoniques)
if (enDur.length > 0) {
  console.log(`\n  ECHEC : le pied de page code en dur ${enDur.join(', ')}.`)
  console.log('  La source unique est `site_content.restaurant`.')
  process.exitCode = 1
} else {
  console.log('\n  aucune coordonnée en dur — le pied de page lit les réglages du restaurant')
}

// ============================================================ D. sensibilite
console.log('\n' + '='.repeat(70))
console.log('D. SENSIBILITE — ce controle sait-il dire NON ?')
console.log('='.repeat(70))

const DEPLACER_TETE = /const NAV_LINKS[^\n]*\n/
const resultats = []
const mesurer = (nom, condition) => {
  resultats.push([nom, condition])
  console.log(`  ${nom} : ${condition ? 'OUI' : 'NON'}`)
  if (!condition) process.exitCode = 1
}

// 1. Une ancre inventee.
const avecAncreFausse = FOOTER.replace(
  DEPLACER_TETE,
  "const NAV_LINKS: ReadonlyArray<readonly [string, string]> = [\n  ['Faux', 'ancre-qui-nexiste-pas'],",
)
mesurer(
  'une ancre inventée est détectée',
  ancresUtilisees(avecAncreFausse, COMPOSANTS[0].listes).includes('ancre-qui-nexiste-pas') &&
    ancresUtilisees(avecAncreFausse, COMPOSANTS[0].listes).some((a) => !reelles.includes(a)),
)

// 2. Le defaut d'ORIGINE exact : une ancre derivee du libelle.
const avecDefautOrigine = FOOTER.replace(
  DEPLACER_TETE,
  "const NAV_LINKS: ReadonlyArray<readonly [string, string]> = [\n  ['La carte', 'lacarte'],\n  ['Équipe', 'équipe'],",
)
const manquantes = ancresUtilisees(avecDefautOrigine, COMPOSANTS[0].listes).filter((a) => !reelles.includes(a))
mesurer(
  `le défaut d'origine (#lacarte, #équipe) est détecté — ${manquantes.join(', ')}`,
  manquantes.length === 2,
)

// 3. Le faux vert CORRIGE : la valeur canonique recopiee.
const adresse = textesDe(restaurant.address)[0] ?? ''
const avecAdresse = FOOTER.replace('© 2026 Greatlife ·', `© Copyright ${adresse} ·`)
mesurer(
  `la valeur canonique de l'adresse (« ${adresse} ») est détectée`,
  coordonneesEnDur(avecAdresse, canoniques).length > 0,
)

// 4. Un numero perime.
const avecTelephone = FOOTER.replace('{coordonnees.map(', '{["+224 620 00 00 00"].map(')
mesurer('un ancien numéro en dur est détecté', coordonneesEnDur(avecTelephone, canoniques).length > 0)

// 5. La garde anti-vide : une refonte qui fait disparaitre la liste.
const refonteEnObjets = FOOTER.replace(DEPLACER_TETE, 'const NAV_LINKS = { carte: 1, blog: 1 }\n')
const apresRefonte = ancresUtilisees(refonteEnObjets, COMPOSANTS[0].listes)
mesurer(
  "une refonte qui fait disparaître la liste est détectée (le contrôle ne passe pas sur du vide)",
  apresRefonte.length < COMPOSANTS[0].minimum,
)

console.log('\n' + '='.repeat(70))
console.log(process.exitCode ? 'ECHEC — voir les lignes ci-dessus.' : 'PIED DE PAGE ET NAVIGATION VERIFIES.')
console.log("AUCUNE ECRITURE N'A ETE EFFECTUEE — cette sonde ne fait que lire.")
console.log('='.repeat(70))
