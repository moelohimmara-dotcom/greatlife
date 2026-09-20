/**
 * Greatlife — CMS : vérification du Lot 3 (publication, contrôle, versions)
 * ========================================================================
 * Prouve, sans ÉCRIRE en base, les affirmations du Lot 3 :
 *
 *   A. les 7 contrôles du TDR §24 existent, dans l'ordre du TDR
 *   B. un plat sans prix BLOQUE la publication (message imposé par le TDR §24)
 *   C. une carte vide bloque
 *   D. un lien de menu cassé bloque
 *   E. le contrôle « images » AVERTIT toujours, il ne bloque jamais
 *   F. `publishable` est faux si et seulement s'il reste une erreur
 *   G. aucun message ne contient de jargon interdit (AGENTS.md §9, TDR §2)
 *   H. une page correcte EST publiable (le contrôle n'est pas bloquant à vide)
 *   I. le snapshot fait un aller-retour FIDÈLE (base du versioning, TDR §23)
 *   J. le snapshot refuse un format inconnu au lieu de l'appliquer
 *   K. le modèle de contrôle ne dépend ni de Vite ni de Supabase
 *   L. VÉRITÉ EN BASE : les données réelles passent-elles les 7 contrôles ?
 *   M. CONSTAT §22 : le brouillon est-il encore lisible par un visiteur ?
 *
 * ⚠️ Aucune écriture. Le script ne lit qu'avec une clé de service (pour L) et
 * une clé anonyme (pour M), et ne modifie pas l'arbre de travail.
 *
 * Les jeux d'essai des contrôles B à H n'utilisent AUCUNE section : ils ne
 * dépendent donc d'aucun champ obligatoire du catalogue. Un jeu d'essai qui
 * dépendrait du registre deviendrait faux au premier ajout de champ, et
 * signalerait un défaut là où il n'y en aurait pas.
 *
 * Usage :  node scripts/verify-lot3.mjs        (ou `npm run verify:lot3`)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/')
const WORK = `${ROOT}/node_modules/.cms-verify`

const require = createRequire(`${ROOT}/package.json`)
const { build } = require('esbuild')

const failures = []
const observations = []
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}
const observe = (label) => {
  console.log(`  ⚠ ${label}`)
  observations.push(label)
}

// ---------------------------------------------------------------------------
// Environnement Supabase (LECTURE SEULE)
// ---------------------------------------------------------------------------
const envFile = existsSync(`${ROOT}/.env`) ? `${ROOT}/.env` : `${dirname(ROOT)}/.env`
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Za-z_0-9]+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1).trim()]
    }),
)

async function rest(path, { anon = false } = {}) {
  const key = anon ? env.VITE_SUPABASE_ANON_KEY : env.NEW_SERVICE_ROLE_KEY
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`${path} → ${r.status} ${text.slice(0, 180)}`)
  return JSON.parse(text)
}

// ---------------------------------------------------------------------------
// Harnais : bundle du MODÈLE pur (aucune dépendance Supabase ni Vite)
// ---------------------------------------------------------------------------
mkdirSync(WORK, { recursive: true })

async function bundleModel(name, contents) {
  const entry = `${WORK}/${name}.ts`
  const outfile = `${WORK}/${name}.cjs`
  writeFileSync(entry, contents, 'utf8')
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    alias: { '@': `${ROOT}/src` },
    loader: { '.ts': 'ts' },
    // Aucun `define` de `import.meta.env` : si le modèle en dépendait, le
    // bundle échouerait — c'est ce que vérifie le contrôle K.
    logLevel: 'warning',
  })
  delete require.cache[require.resolve(outfile)]
  return require(outfile)
}

// ---------------------------------------------------------------------------
// Jeux d'essai — sans section, pour ne dépendre d'aucun champ du catalogue
// ---------------------------------------------------------------------------
const GOOD_PAGE = { slug: '', title: { fr: 'Accueil', en: 'Home' } }
const GOOD_MENU = [{ name: 'Burger maison', price: '15 000 FG' }]
const GOOD_RESTAURANT = {
  name: 'Greatlife',
  phone: '+224 000 00 00 00',
  address: 'Conakry',
  hours: '8h–22h',
}
/*
 * Liens de menu « cassés » — CONSERVÉS COMME TÉMOINS.
 * Ils servaient à prouver qu'un lien cassé bloquait la publication. Ce
 * comportement a été retiré le 2026-09-19 (voir section D) : ces objets servent
 * maintenant à prouver que les fournir ne change PLUS rien.
 */
const BROKEN_ANCHOR_NAV = {
  label: { fr: 'Notre histoire', en: 'Our story' },
  targetType: 'anchor',
  targetPageId: null,
  targetValue: 'section-qui-nexiste-pas',
  visible: true,
}
const UNKNOWN_PAGE_NAV = {
  label: { fr: 'Carte', en: 'Menu' },
  targetType: 'page',
  targetPageId: 'page-qui-nexiste-pas',
  targetValue: null,
  visible: true,
}
const BLANK_URL_NAV = {
  label: { fr: 'Facebook', en: 'Facebook' },
  targetType: 'url',
  targetPageId: null,
  targetValue: '',
  visible: true,
}

function makeInput(overrides = {}) {
  return {
    page: GOOD_PAGE,
    sections: [],
    menu: GOOD_MENU,
    restaurant: GOOD_RESTAURANT,
    locale: 'fr',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
const model = await bundleModel('publishing', `export * from '@/cms/model/publishing'`)

check(
  typeof model.runPublicationChecks === 'function' &&
    typeof model.buildSnapshot === 'function' &&
    typeof model.parseSnapshot === 'function',
  'le modèle de publication est chargeable dans Node',
)

// ===========================================================================
console.log('\nA. LES 7 CONTRÔLES DU TDR §24\n')

const EXPECTED_CHECKS = ['pages', 'navigation', 'images', 'menu', 'prices', 'links', 'essentials']
const ids = model.PUBLICATION_CHECKS.map((c) => c.id)
check(
  ids.length === EXPECTED_CHECKS.length && ids.every((id, i) => id === EXPECTED_CHECKS[i]),
  'les 7 contrôles sont présents, dans l’ordre du TDR §24',
  ids.join(' · '),
)

const baseline = model.runPublicationChecks(makeInput())
check(
  baseline.checks.length === 7,
  'chaque rapport expose les 7 contrôles, même sans constat',
  `${baseline.checks.length} contrôles`,
)

// ===========================================================================
console.log('\nB. UN PLAT SANS PRIX BLOQUE (message imposé par le TDR §24)\n')

const priceReport = model.runPublicationChecks(makeInput({ menu: [{ name: 'Burger maison', price: '' }] }))
const priceFinding = priceReport.blockers.find((f) => f.check === 'prices')
check(Boolean(priceFinding), 'un plat sans prix produit un bloqueur')
check(
  priceFinding?.message === "Le plat Burger maison n'a pas de prix.",
  'le message est exactement celui du TDR §24',
  priceFinding?.message ?? '(aucun)',
)
check(!priceReport.publishable, 'la publication est refusée')

// ===========================================================================
console.log('\nC. UNE CARTE VIDE BLOQUE\n')

const emptyMenuReport = model.runPublicationChecks(makeInput({ menu: [] }))
check(emptyMenuReport.blockers.some((f) => f.check === 'menu'), 'une carte sans plat produit un bloqueur')
check(!emptyMenuReport.publishable, 'la publication est refusée')

// ===========================================================================
console.log('\nD. LES CONTRÔLES n°2 ET n°6 SONT DÉCLARÉS NON VÉRIFIÉS\n')

/*
 * POURQUOI CES ASSERTIONS ONT CHANGÉ DE SENS (et pourquoi ce n'est pas un
 * affaiblissement)
 * Avant, cette section exigeait qu'un lien de menu cassé BLOQUE la publication.
 * Ce comportement a été RETIRÉ sur décision du propriétaire le 2026-09-19 : le
 * site public ne rend pas `navigation_items` (`PublicNav` et `Footer` portent
 * des listes écrites en dur) et aucun écran d'administration ne la modifie.
 * Bloquer une publication sur un lien que personne ne voit revenait à valider
 * une fiction.
 *
 * Les assertions ci-dessous n'asservissent donc pas le code au hasard : elles
 * vérifient le nouveau contrat ET elles prouvent le retrait — c'est-à-dire que
 * l'ancienne entrée est devenue INERTE, et non qu'on l'a oubliée.
 */
const rapportVide = model.runPublicationChecks(makeInput())
const navCheck = rapportVide.checks.find((c) => c.id === 'navigation')
const linksCheck = rapportVide.checks.find((c) => c.id === 'links')

check(navCheck?.level === 'skipped', 'le contrôle « Navigation » est déclaré non vérifié, pas « conforme »')
check(linksCheck?.level === 'skipped', 'le contrôle « Aucun lien cassé » est déclaré non vérifié, pas « conforme »')
check(
  Boolean(navCheck?.note) && Boolean(linksCheck?.note),
  'chacun dit POURQUOI il n’a pas été exécuté',
  (navCheck?.note ?? '').slice(0, 60),
)
check(
  rapportVide.checks.length === EXPECTED_CHECKS.length,
  'les 7 contrôles du TDR §24 restent tous présents dans le rapport',
)
check(
  !rapportVide.checks.some((c) => c.level === 'ok' && (c.id === 'navigation' || c.id === 'links')),
  'aucun des deux n’affiche un vert mensonger',
)

// Témoin du retrait : fournir les anciens liens cassés ne change PLUS rien.
const avecLiensCasses = model.runPublicationChecks({
  ...makeInput(),
  navigation: [BROKEN_ANCHOR_NAV, UNKNOWN_PAGE_NAV, BLANK_URL_NAV],
})
check(
  avecLiensCasses.publishable === true,
  'un lien de menu cassé ne bloque plus la publication (retrait assumé, décision du 2026-09-19)',
)
check(
  JSON.stringify(avecLiensCasses.checks) === JSON.stringify(rapportVide.checks),
  'l’entrée « navigation » est INERTE : la fournir ne modifie pas le rapport',
)

// Les contrôles qui RESTENT doivent toujours mordre — sinon on aurait seulement
// supprimé des assertions au lieu de changer de contrat.
const temoinMenu = model.runPublicationChecks(makeInput({ menu: [{ name: 'X', price: '' }] }))
check(temoinMenu.blockers.length > 0 && !temoinMenu.publishable, 'les contrôles restants bloquent toujours quand il faut')

// ===========================================================================
console.log('\nE. LE CONTRÔLE « IMAGES » AVERTIT, IL NE BLOQUE JAMAIS\n')

// Une section dont le champ image est vide. On n'affirme RIEN sur le reste du
// rapport : cette section peut déclencher d'autres constats de contenu, et ce
// n'est pas ce qui est testé ici.
const imageReport = model.runPublicationChecks(
  makeInput({
    sections: [{ type: 'hero', anchor: null, visible: true, content: {} }],
  }),
)
check(Boolean(imageReport.checks.find((c) => c.id === 'images')), 'le contrôle « images » est présent')
check(
  !imageReport.blockers.some((f) => f.check === 'images'),
  'une image manquante ne produit JAMAIS de bloqueur',
)
check(
  imageReport.warnings.every((f) => f.level === 'warning'),
  'tous les avertissements sont de niveau `warning`',
)

// Une section MASQUÉE ne doit pas être contrôlée : son contenu n'est pas publié.
const hiddenReport = model.runPublicationChecks(
  makeInput({ sections: [{ type: 'hero', anchor: null, visible: false, content: {} }] }),
)
check(
  hiddenReport.warnings.filter((f) => f.check === 'images').length === 0,
  'une section masquée est exclue du contrôle des images',
)

// ===========================================================================
console.log('\nF. `publishable` EST FAUX SI ET SEULEMENT S’IL RESTE UNE ERREUR\n')

const cases = [
  ['jeu correct', makeInput(), true],
  ['un bloqueur', makeInput({ menu: [{ name: 'X', price: '' }] }), false],
  ['un avertissement seul', makeInput({ restaurant: { ...GOOD_RESTAURANT, phone: '' } }), true],
  ['carte vide', makeInput({ menu: [] }), false],
  ['un lien de menu cassé (n’est plus bloquant)', { ...makeInput(), navigation: [BROKEN_ANCHOR_NAV] }, true],
  ['titre de page absent', makeInput({ page: { slug: '', title: '' } }), false],
]
let coherent = true
for (const [label, input, expected] of cases) {
  const report = model.runPublicationChecks(input)
  const derived = report.blockers.length === 0
  if (report.publishable !== expected || report.publishable !== derived) {
    coherent = false
    console.log(`    ✗ ${label} : attendu publishable=${expected}, obtenu ${report.publishable}`)
  }
}
check(coherent, `rapport cohérent sur ${cases.length} jeux d’essai`, cases.map((c) => c[0]).join(', '))

// ===========================================================================
console.log('\nG. AUCUN MESSAGE NE CONTIENT DE JARGON INTERDIT\n')

const FORBIDDEN = [
  'Schema validation error',
  'schema',
  'props',
  'JSON',
  'page_sections',
  'page_versions',
  'migration',
  'supabase',
  'database',
  'null',
  'undefined',
]

const allMessages = [
  ...baseline.blockers,
  ...baseline.warnings,
  ...priceReport.blockers,
  ...priceReport.warnings,
  ...emptyMenuReport.blockers,
  // Les rapports des liens de menu ne sont plus listés : ces contrôles ne
  // produisent plus de message (voir section D). Les messages des contrôles
  // restants sont tous couverts ci-dessus et ci-dessous.
  ...imageReport.warnings,
  ...hiddenReport.warnings,
].map((f) => f.message)

const violations = allMessages.filter((message) =>
  FORBIDDEN.some((word) => message.toLowerCase().includes(word.toLowerCase())),
)
check(
  violations.length === 0,
  `${allMessages.length} messages contrôlés, aucun jargon`,
  violations.join(' | '),
)

// ===========================================================================
console.log('\nH. UNE PAGE CORRECTE EST PUBLIABLE\n')

check(baseline.publishable, 'le jeu d’essai correct passe les 7 contrôles', baseline.summary)
check(baseline.blockers.length === 0 && baseline.warnings.length === 0, 'aucun constat sur un jeu correct')

// ===========================================================================
console.log('\nI. LE SNAPSHOT FAIT UN ALLER-RETOUR FIDÈLE (TDR §23)\n')

const PAGE = {
  id: 'p1',
  slug: '',
  title: { fr: 'Accueil', en: 'Home' },
  sortOrder: 0,
  seo: { description: { fr: 'Bio', en: 'Organic' } },
  status: 'published',
  publishedAt: '2026-09-19T08:00:00.000Z',
}
const SECTIONS = [
  {
    id: 's1',
    pageId: 'p1',
    type: 'hero',
    variant: 'fullscreen',
    position: 0,
    visible: true,
    anchor: 'accueil',
    content: { title: { fr: 'Bienvenue' } },
    settings: { spacing: 'large' },
  },
  {
    id: 's2',
    pageId: 'p1',
    type: 'testimonials',
    variant: 'grid',
    position: 1,
    visible: false,
    anchor: null,
    content: {},
    settings: {},
  },
]

const snapshot = model.buildSnapshot(PAGE, SECTIONS)
check(snapshot.formatVersion === model.SNAPSHOT_FORMAT_VERSION, 'le snapshot porte la version de format')
check(snapshot.sections.length === 2, 'les 2 sections sont archivées, y compris la section MASQUÉE')
check(
  snapshot.sections[1].visible === false,
  'une section masquée reste archivée telle quelle (fidélité de la restauration)',
)

const roundTrip = model.parseSnapshot(JSON.parse(JSON.stringify(snapshot)))
check(roundTrip.ok, 'le snapshot archivé est relisible', roundTrip.ok ? '' : roundTrip.error)
check(
  JSON.stringify(roundTrip.ok ? roundTrip.snapshot : null) === JSON.stringify(snapshot),
  'l’aller-retour ne perd ni ne modifie aucune donnée',
)

/*
 * L'archive est écrite AVANT la bascule de statut : elle doit donc porter
 * l'état PUBLIÉ, et non l'état de travail. Sans ce détail, la version 1
 * enregistrerait `draft` et `publishedAt: null` — définitivement, puisque
 * l'historique est immuable en base.
 */
const publishedSnapshot = model.buildSnapshot(
  { ...PAGE, status: 'draft', publishedAt: null },
  SECTIONS,
  { status: 'published', publishedAt: '2026-09-19T09:30:00.000Z' },
)
check(
  publishedSnapshot.page.status === 'published' &&
    publishedSnapshot.page.publishedAt === '2026-09-19T09:30:00.000Z',
  "l’archive porte l’état PUBLIÉ, pas l’état de travail",
  `status=${publishedSnapshot.page.status}, publishedAt=${publishedSnapshot.page.publishedAt}`,
)

// ===========================================================================
console.log('\nJ. LE SNAPSHOT REFUSE UN FORMAT INCONNU\n')

const foreign = model.parseSnapshot({ formatVersion: 99, page: { slug: '' }, sections: [] })
check(!foreign.ok, 'un format inconnu est REFUSÉ')
check(
  !foreign.ok && foreign.error.length > 0 && !/\d/.test(foreign.error),
  'le refus est formulé sans jargon (aucun numéro technique)',
  foreign.ok ? '' : foreign.error,
)

const legacy = model.parseSnapshot({ page: { slug: '' } })
check(!legacy.ok, 'un snapshot sans repère de format est REFUSÉ')

// ===========================================================================
console.log('\nK. LE MODÈLE NE DÉPEND NI DE VITE NI DE SUPABASE\n')

const modelFiles = [
  'src/cms/model/publishing/types.ts',
  'src/cms/model/publishing/checks.ts',
  'src/cms/model/publishing/snapshot.ts',
  'src/cms/model/publishing/index.ts',
]

/**
 * Les commentaires sont retirés AVANT l'analyse : ces fichiers EXPLIQUENT
 * pourquoi ils ne doivent pas dépendre de Vite ni de Supabase, donc ils citent
 * ces noms. Contrôler le texte brut ferait échouer la vérification sur sa
 * propre documentation, ce qui ne prouve rien sur le code.
 */
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const IMPURITY_PATTERNS = [
  [/from\s+['"](@\/lib\/supabase|vite|@supabase\/supabase-js|@\/contexts\/)/, 'import interdit'],
  [/import\.meta/, 'import.meta (API Vite)'],
  [/\bgetSupabase\b/, 'accès direct à Supabase'],
]

const impurities = []
for (const file of modelFiles) {
  const code = stripComments(readFileSync(`${ROOT}/${file}`, 'utf8'))
  for (const [pattern, label] of IMPURITY_PATTERNS) {
    if (pattern.test(code)) impurities.push(`${file} → ${label}`)
  }
}
check(impurities.length === 0, `les ${modelFiles.length} fichiers du modèle sont purs`, impurities.join(' | '))

// ===========================================================================
console.log('\nL. VÉRITÉ EN BASE — les données réelles passent-elles les 7 contrôles ?\n')

const pages = await rest('pages?select=id,slug,title_i18n,status')
const sections = await rest('page_sections?select=*&order=position')
const menu = await rest('menu_items?select=name,price')
const siteContent = await rest('site_content?select=key,value&key=eq.restaurant')

const restaurantRow = siteContent[0]?.value ?? {}
const asText = (value) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.fr ?? value.en ?? ''
  return ''
}

const realInput = {
  page: { slug: pages[0]?.slug ?? '', title: pages[0]?.title_i18n ?? '' },
  sections: sections.map((s) => ({
    type: s.type,
    anchor: s.anchor,
    visible: s.visible,
    content: s.content ?? {},
  })),
  menu: menu.map((m) => ({ name: m.name, price: m.price ?? '' })),
  restaurant: {
    name: asText(restaurantRow.name),
    phone: asText(restaurantRow.phone),
    address: asText(restaurantRow.address),
    hours: asText(restaurantRow.hours),
  },
  locale: 'fr',
}

const realReport = model.runPublicationChecks(realInput)
console.log(`    ${realReport.summary}`)
for (const finding of realReport.blockers) {
  console.log(`    ✗ ${finding.check} — ${finding.message}${finding.where ? ` (${finding.where})` : ''}`)
}
for (const finding of realReport.warnings) {
  console.log(`    ! ${finding.check} — ${finding.message}${finding.where ? ` (${finding.where})` : ''}`)
}
check(
  realReport.publishable,
  `la page d’accueil réelle passe les contrôles (${sections.length} sections, ${menu.length} plats)`,
)
check(
  realReport.checks.filter((c) => c.level === 'skipped').length === 2,
  'en base réelle aussi, exactement 2 contrôles sont déclarés non vérifiés (navigation, liens)',
  realReport.checks.filter((c) => c.level === 'skipped').map((c) => c.id).join(', '),
)

// ===========================================================================
console.log('\nM. CONSTAT TDR §22 — le brouillon est-il encore lisible par un visiteur ?\n')

let anonCount = null
let anonError = null
try {
  const rows = await rest('page_sections?select=id,type,visible', { anon: true })
  anonCount = rows.length
} catch (err) {
  anonError = String(err).slice(0, 140)
}

/*
 * ATTENTION — « 0 section » ne prouve PAS l'isolation du brouillon.
 * `sections_public_read` (021) exige que la PAGE soit publiée. Une page en
 * `draft` renvoie donc 0 section sans qu'aucune isolation n'existe : c'est le
 * cas aujourd'hui, et c'est aussi le comportement d'AVANT le Lot 3. Conclure
 * « ✓ §22 conforme » dans cet état serait exactement le faux vert à éviter.
 * Le contrôle lit donc le statut de la page avant de se prononcer.
 */
if (anonError !== null) {
  check(false, "l'état du brouillon n'a pas pu être mesuré (lecture anon en échec)", anonError)
} else if (anonCount > 0) {
  observe(
    `§22 NON SATISFAIT : un visiteur anonyme lit ${anonCount} sections du brouillon. ` +
      "L'isolation arbitrée (option B, migrations 030/031) n'est pas appliquée.",
  )
} else {
  const pageStatus = pages[0]?.status ?? '(inconnu)'
  if (pageStatus === 'published') {
    console.log('  ✓ le brouillon n’est pas lisible par un visiteur (page publiée, 0 section renvoyée)')
  } else {
    observe(
      `§22 NON CONCLUANT : l’anon reçoit 0 section, mais uniquement parce que la page est « ${pageStatus} » ` +
        "et que la RLS publique exige `status = 'published'`. Aucune isolation du brouillon n'est " +
        "démontrée : publier la page rendrait de nouveau les sections du brouillon lisibles par un " +
        "visiteur. L'isolation réelle dépend de l'application des migrations 030/031.",
    )
  }
}

// ===========================================================================
console.log('')
if (observations.length > 0) {
  console.log(`⚠ ${observations.length} constat(s) :`)
  for (const o of observations) console.log(`   • ${o}`)
  console.log('')
}

if (failures.length > 0) {
  console.log(`✗ ${failures.length} contrôle(s) en échec :`)
  for (const f of failures) console.log(`   • ${f}`)
  process.exit(1)
}

console.log('✓ Lot 3 — contrôles §24, versions et snapshot : conformes.')
console.log('  Non couvert ici (vérification manuelle requise) : création réelle d’une version,')
console.log('  restauration (volet 5), et bascule du chemin de lecture public (option B).')
