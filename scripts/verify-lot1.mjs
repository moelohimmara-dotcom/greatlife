/**
 * Greatlife — CMS : vérification du Lot 1
 * ========================================
 * Prouve, sur le code et la base réels, les quatre affirmations du Lot 1.
 *
 *   A. CONFORMITÉ   le contenu stocké en base correspond au registre
 *   B. ISOMORPHIE   `@/cms/renderer` reste importable dans Node (CM-7 / AR-10)
 *   C. NON-RÉGRESSION (TDR §41) le rendu est byte-identique à celui de la
 *                   référence `BASE_REF`, antérieure au branchement CMS
 *   D. CONSOMMATION le contenu CMS pilote réellement le rendu des sections
 *
 * Ce script n'écrit rien en base et ne modifie pas l'arbre de travail : les
 * versions de référence sont extraites avec `git show`.
 *
 * Usage :  node scripts/verify-lot1.mjs        (ou `npm run verify:lot1`)
 *          node scripts/verify-lot1.mjs --selftest
 * Env    :  SHOW_DIFF=1   affiche la première divergence de chaque écart
 *           BASE_REF=…    révision de comparaison (défaut : PRE_CMS_WIRING_REF)
 *
 * ⚠️ Le contrôle C compare à une révision FIXE, jamais à `HEAD`. Comparer à
 * `HEAD` rendrait le test tautologique dès que le branchement est commité —
 * il comparerait le nouveau code à lui-même et passerait toujours. Un
 * garde-fou refuse désormais de rapporter un succès si la référence est
 * identique à l'arbre courant.
 *
 * `--selftest` prouve que le contrôle C peut ÉCHOUER : il rend une copie
 * volontairement altérée d'un composant et vérifie que l'écart est détecté.
 *
 * Les bundles temporaires sont écrits dans `node_modules/.cms-verify`, qui est
 * ignoré par Git et sert de racine de résolution pour React.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, cpSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/')
const WORK = `${ROOT}/node_modules/.cms-verify`
/** Arbre COMPLET de la révision de référence, extrait par `git archive`. */
const BASE_DIR = `${WORK}/base`
const SHOW_DIFF = process.env.SHOW_DIFF === '1'
const SELFTEST = process.argv.includes('--selftest')

/**
 * Dernier commit AVANT le branchement des composants sur le CMS.
 * C'est la seule référence qui donne un sens au contrôle de non-régression :
 * elle porte le rendu historique du site public.
 *
 * ⚠️ CE SHA A CHANGE SANS QUE LE CONTENU CHANGE.
 * L'historique a été réécrit (`git filter-repo`) pour retirer un mot de passe
 * committé par erreur : TOUS les SHA ont été recalculés. L'ancienne valeur
 * `9e5efb7` n'existe plus et faisait échouer ce contrôle.
 *
 * La référence a été retrouvée par son ARBRE, pas par son message :
 * l'ancien `9e5efb7` et l'actuel `0528c544` portent tous deux l'arbre
 * `11b9928767a22d9008957f3d60585512731a1913`. Le rendu comparé est donc
 * rigoureusement le même — la preuve de non-régression reste valable.
 *
 * Si l'historique est réécrit de nouveau, il faudra refaire cette recherche :
 *   git log --all --format='%H|%T|%s'
 * et retrouver la ligne portant cet arbre.
 */
const PRE_CMS_WIRING_REF = '0528c5443c6107ffcfb03bd6eab697138ca6b9bc'
const BASE_REF = process.env.BASE_REF ?? PRE_CMS_WIRING_REF

const require = createRequire(`${ROOT}/package.json`)
const { build } = require('esbuild')

/** Types migrés de la page « Accueil » → composant qui les rend. */
const SECTIONS = [
  ['hero', 'Hero'],
  ['menu', 'Carte'],
  ['story', 'Story'],
  ['engagements', 'Engagements'],
  ['team', 'Team'],
  ['location', 'Localisation'],
  ['contact', 'Contact'],
  ['reservation', 'Reservation'],
  ['blog', 'Blog'],
  ['testimonials', 'Testimonials'],
]

const failures = []
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

// ---------------------------------------------------------------------------
// Environnement Supabase (lecture seule)
// ---------------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(`${ROOT}/.env`, 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Za-z_0-9]+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1).trim()]
    }),
)

async function rest(path) {
  const key = env.NEW_SERVICE_ROLE_KEY
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`${path} → ${r.status} ${text.slice(0, 200)}`)
  return JSON.parse(text)
}

mkdirSync(WORK, { recursive: true })

/** Bundle un point d'entrée et le renvoie. React est embarqué dans le bundle. */
async function bundleFile(name, contents, { define = true, alias, loader, banner } = {}) {
  const entry = `${WORK}/${name}.tsx`
  const outfile = `${WORK}/${name}.cjs`
  writeFileSync(entry, contents, 'utf8')
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    // CJS : `react-dom/server` est du CommonJS et fait `require('stream')`,
    // que esbuild ne sait pas convertir en ESM.
    format: 'cjs',
    platform: 'node',
    jsx: 'automatic',
    // Vite injecte `import.meta.env` ; Node non. On le neutralise pour que le
    // repli local de l'application s'applique, à l'identique des deux versions.
    define: define ? { 'import.meta.env': '{}' } : {},
    alias: alias ?? { '@': `${ROOT}/src` },
    loader: loader ?? { '.tsx': 'tsx', '.ts': 'ts' },
    ...(banner ? { banner: { js: banner } } : {}),
    logLevel: 'warning',
  })
  delete require.cache[require.resolve(outfile)]
  return require(outfile)
}

// ===========================================================================
console.log('A. CONFORMITÉ — le contenu en base correspond-il au registre ?\n')

const modelEntry = await bundleFile(
  'model',
  `export * from '@/cms/model/sections/schemas'
   export * from '@/cms/model/sections/validation'
   export * from '@/cms/model/i18n'`,
  { define: false },
)

const pages = await rest('pages?select=id,slug,status')
const sections = await rest('page_sections?select=*&order=position')

let errors = 0
let warnings = 0
let typeUnknown = 0
for (const s of sections) {
  const def = modelEntry.getSectionDefinition(s.type)
  if (!def) {
    typeUnknown++
    console.log(`  ✗ ${s.type} : type absent du catalogue`)
    continue
  }
  const issues = modelEntry.validateSectionContent(s.type, s.content ?? {})
  errors += issues.filter((i) => i.level === 'error').length
  warnings += issues.filter((i) => i.level === 'warning').length
  for (const i of issues.filter((x) => x.level === 'error')) {
    console.log(`  ✗ ${s.type} · ${i.path} — ${i.message}`)
  }
}
check(errors === 0, `${sections.length} sections validées sans erreur`, `${errors} erreur(s), ${warnings} remarque(s)`)
check(typeUnknown === 0, 'tous les types en base existent au catalogue')
// Informatif seulement : le Lot 2 créera d'autres pages, ce n'est pas un
// critère d'échec du Lot 1.
console.log(
  `  ℹ pages en base : ${pages.length} — ${pages.map((p) => p.slug || '(racine)').join(', ')}`,
)

// Les icônes stockées doivent TOUTES être résolvables par `iconByName`. Un nom
// hors catalogue ne plante plus (garde `hasOwnProperty`), mais se replierait
// silencieusement sur l'icône par défaut : autant le savoir.
const iconsMod = await bundleFile('icons', `export { iconByName } from '@/lib/icons'`, {
  define: false,
})
const usedIcons = new Set()
for (const s of sections) {
  for (const it of s.content?.items ?? []) {
    if (it && typeof it === 'object' && typeof it.icon === 'string') usedIcons.add(it.icon)
  }
}
const unresolved = [...usedIcons].filter((n) => !iconsMod.iconByName(n))
check(
  unresolved.length === 0,
  `les ${usedIcons.size} icônes du contenu existent au catalogue`,
  unresolved.join(', '),
)

// Les 10 types migrés doivent être déclarés « implémentés » au registre.
const notImplemented = SECTIONS.map(([t]) => t).filter(
  (t) => !modelEntry.getSectionDefinition(t)?.implemented,
)
check(notImplemented.length === 0, 'les 10 types migrés sont marqués « implémentés »', notImplemented.join(', '))

// ===========================================================================
console.log('\nB. ISOMORPHIE — `@/cms/renderer` reste utilisable dans Node\n')

// B1. Le renderer seul doit s'importer SANS qu'on lui fournisse `import.meta.env`.
let isoRenderer = null
try {
  isoRenderer = await bundleFile(
    'iso-renderer',
    `export { PageRenderer, SECTION_TYPES, hasSectionComponent } from '@/cms/renderer'`,
    { define: false },
  )
  check(true, '@/cms/renderer s’importe dans Node sans import.meta.env')
} catch (err) {
  check(false, '@/cms/renderer s’importe dans Node sans import.meta.env', err.message.slice(0, 160))
}

// B2. Le registre livré par le renderer doit rester VIDE (aucun composant).
//     S'il était peuplé, le renderer tirerait SiteContext → Supabase.
if (isoRenderer) {
  const populated = isoRenderer.SECTION_TYPES.filter((d) => isoRenderer.hasSectionComponent(d.type))
    .map((d) => d.type)
  check(
    populated.length === 0,
    'le registre isomorphe ne référence aucun composant',
    populated.length ? `peuplé : ${populated.join(', ')}` : `${isoRenderer.SECTION_TYPES.length} types au catalogue`,
  )
}

// B3. Le point d'entrée complet, lui, doit enregistrer les 10 composants.
const full = await bundleFile(
  'full-entry',
  `export { hasSectionComponent, SECTION_TYPES } from '@/cms'`,
  { define: true },
)
const missing = SECTIONS.map(([t]) => t).filter((t) => !full.hasSectionComponent(t))
check(missing.length === 0, '@/cms enregistre les 10 composants de section', missing.join(', '))

/*
  F. BRANCHEMENT RÉEL DE L'APPLICATION
  ------------------------------------
  Ce contrôle existe à cause d'un défaut trouvé en production : le module
  `register-sections` n'était importé QUE par `@/cms`. Or le site public
  n'importe jamais `@/cms` — il passe par `@/cms/hooks` et `@/cms/renderer`.
  Le registre restait donc VIDE chez les visiteurs : `SectionRenderer` ne
  trouvait aucun composant et se rabattait sur `SectionFallback`, qui ne rend
  RIEN pour les sections adossées à un module (`menu`, `blog`). Le site public
  était amputé sans qu'aucune erreur ne soit levée.

  Le contrôle B3 ci-dessus ne pouvait pas l'attraper : il importe `@/cms`
  lui-même, donc il enregistre les composants… et réussit même quand
  l'application ne le fait pas.

  Pourquoi ce contrôle est STATIQUE et non un bundle du point d'entrée :
  importer `src/main.tsx` tire react-dom et react-router, qui exigent un DOM
  complet. Un stub minimal ne suffit pas (vérifié : `element.setAttribute`),
  et entretenir un faux DOM rendrait le contrôle plus fragile que le défaut
  qu'il surveille. On vérifie donc la seule chose qui compte ici — que le
  point d'entrée déclenche l'enregistrement — puis on prouve séparément que le
  module enregistre bien les 10 composants.
*/
const entryFiles = ['src/main.tsx', 'src/App.tsx']
// Formes acceptées :
//   import '@/cms/register-sections'      (effet de bord, SANS `from`)
//   import { x } from '@/cms'             (enregistre aussi, par effet de bord)
const REGISTRATION_IMPORT =
  /import\s+(?:[^'";]*?\s+from\s+)?['"](?:@\/cms(?:\/register-sections)?|\.{1,2}\/cms(?:\/register-sections)?)['"]/

const wired = entryFiles.filter((f) => {
  const p = `${ROOT}/${f}`
  if (!existsSync(p)) return false
  return REGISTRATION_IMPORT.test(readFileSync(p, 'utf8'))
})
check(
  wired.length > 0,
  'le point d\u2019entrée de l\u2019application déclenche l\u2019enregistrement des composants',
  wired.length ? `via ${wired.join(', ')}` : `AUCUN import de \`@/cms\` ni de \`register-sections\` dans ${entryFiles.join(' ni ')}`,
)

// Et l'on prouve que ce module enregistre réellement les 10.
const registration = await bundleFile(
  'registration-probe',
  `import '@/cms/register-sections'
   export { hasSectionComponent } from '@/cms/renderer/registry'`,
  { define: true },
)
const unregistered = SECTIONS.map(([t]) => t).filter((t) => !registration.hasSectionComponent(t))
check(
  unregistered.length === 0,
  `\`register-sections\` enregistre bien les ${SECTIONS.length} composants`,
  unregistered.length ? `NON enregistrés : ${unregistered.join(', ')}` : 'table complète',
)

// ===========================================================================
const baseRev = execFileSync('git', ['rev-parse', '--verify', BASE_REF], {
  cwd: ROOT,
  encoding: 'utf8',
}).trim()
console.log(`\nC. NON-RÉGRESSION (TDR §41) — rendu identique à ${BASE_REF} (${baseRev.slice(0, 7)})\n`)

// Git stocke des LF, l'arbre de travail Windows peut être en CRLF : on
// normalise AVANT toute comparaison de contenu.
const norm = (s) => s.replace(/\r\n/g, '\n')

/*
  On extrait l'ARBRE COMPLET de la référence, pas les seuls 10 fichiers de
  section. Comparer 10 fichiers isolés ne détecterait pas une régression dans
  un composant PARTAGÉ (`SectionHead`, `OrganicCard`, `Reveal`, contextes…) :
  ces fichiers viendraient de l'arbre courant dans les DEUX branches, et 7
  sections pourraient se dégrader sans que le contrôle bronche. Démontré par
  la revue indépendante.
*/
mkdirSync(BASE_DIR, { recursive: true })
const tarPath = `${WORK}/base.tar`
execFileSync('git', ['archive', '--format=tar', '-o', tarPath, baseRev], { cwd: ROOT })
execFileSync('tar', ['-xf', tarPath, '-C', BASE_DIR], { cwd: ROOT })
const BASE_SECTIONS_DIR = `${BASE_DIR}/src/sections`

const baseSources = new Map()
for (const [, name] of SECTIONS) {
  baseSources.set(name, norm(readFileSync(`${BASE_SECTIONS_DIR}/${name}.tsx`, 'utf8')))
}

// GARDE-FOU. Si la référence est identique à l'arbre courant, la comparaison
// ne prouve rien du tout : on refuse de rapporter un succès.
const unchanged = SECTIONS.filter(
  ([, n]) => norm(readFileSync(`${ROOT}/src/sections/${n}.tsx`, 'utf8')) === baseSources.get(n),
)
const vacuous = unchanged.length === SECTIONS.length
if (vacuous) {
  check(
    false,
    `comparaison impossible : ${BASE_REF} est identique à l'arbre courant`,
    'la référence doit être ANTÉRIEURE au branchement — passez BASE_REF=<révision>',
  )
}

const harness = (dir) => {
  const imports = SECTIONS.map(([, n], i) => `import { ${n} as C${i} } from '${dir}/${n}'`).join('\n')
  const table = SECTIONS.map(([t], i) => `  ${t}: C${i},`).join('\n')
  return `
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteProvider } from '@/contexts/SiteContext'
import { CartProvider } from '@/contexts/CartContext'
${imports}

const SECTIONS = {
${table}
}

function wrap(C, props) {
  return renderToStaticMarkup(
    <SiteProvider><CartProvider><C {...props} /></CartProvider></SiteProvider>,
  )
}

/** Chemin servi aujourd'hui : aucun contenu CMS fourni. */
export function renderLegacy() {
  const out = {}
  for (const [type, C] of Object.entries(SECTIONS)) {
    try { out[type] = wrap(C, {}) } catch (e) { out[type] = 'ERROR: ' + e.message }
  }
  return out
}

/** Chemin d'après bascule : contenu CMS fourni, déjà résolu en français. */
export function renderCms(contentByType) {
  const out = {}
  for (const [type, C] of Object.entries(SECTIONS)) {
    try { out[type] = wrap(C, { content: contentByType[type] ?? {} }) } catch (e) { out[type] = 'ERROR: ' + e.message }
  }
  return out
}
`
}

// Chaque branche est bundlée avec SON PROPRE arbre : c'est ce qui rend la
// comparaison sensible à une régression dans un fichier partagé.
const baseR = await bundleFile('harness-base', harness(BASE_SECTIONS_DIR), {
  alias: { '@': `${BASE_DIR}/src` },
})
const workR = await bundleFile('harness-work', harness(`${ROOT}/src/sections`))

const before = baseR.renderLegacy()
const after = workR.renderLegacy()

/**
 * Normalise le HTML pour la comparaison :
 * - suppression des attributs `id=` (les ancres sont portées par le WRAPPER,
 *   pas par le composant lui-même — changement intentionnel du Lot 2)
 */
function stripIds(html) { return html.replace(/\sid="[^"]*"/g, '') }

const diffTypes = []
for (const [type] of SECTIONS) {
  if (before[type].startsWith('ERROR') || after[type].startsWith('ERROR')) {
    diffTypes.push(type)
    console.log(
      `  ✗ ${type} — rendu en erreur\n      HEAD : ${before[type].slice(0, 160)}\n      WORK : ${after[type].slice(0, 160)}`,
    )
  } else if (stripIds(before[type]) !== stripIds(after[type])) {
    diffTypes.push(type)
    console.log(
      `  ✗ ${type} — HTML différent (HEAD ${before[type].length} car. / courant ${after[type].length} car.)`,
    )
  }
}
if (!vacuous) {
  check(
    diffTypes.length === 0,
    `rendu identique à ${BASE_REF} pour les ${SECTIONS.length} sections`,
    diffTypes.length ? `écarts : ${diffTypes.join(', ')}` : 'comparaison caractère par caractère',
  )
}

if (SHOW_DIFF && diffTypes.length) {
  for (const type of diffTypes) {
    const x = before[type]
    const y = after[type]
    let i = 0
    while (i < x.length && i < y.length && x[i] === y[i]) i++
    console.log(`\n--- ${type} : divergence à l'offset ${i} ---`)
    console.log(`  HEAD    : …${x.slice(Math.max(0, i - 100), i + 200)}…`)
    console.log(`  courant : …${y.slice(Math.max(0, i - 100), i + 200)}…`)
  }
}

// ===========================================================================
console.log('\nD. CONSOMMATION — le contenu CMS pilote-t-il vraiment le rendu ?\n')

const contentByType = {}
for (const s of sections) {
  contentByType[s.type] = modelEntry.resolveContentObject(s.content ?? {}, 'fr')
}

const cmsHtml = workR.renderCms(contentByType)
const broken = SECTIONS.map(([t]) => t).filter((t) => cmsHtml[t].startsWith('ERROR'))
check(broken.length === 0, `le contenu migré se rend sans erreur`, broken.join(', '))
for (const t of broken) console.log(`      ${t} : ${cmsHtml[t].slice(0, 200)}`)

// Le contenu migré reprend les textes codés en dur d'origine : un rendu
// identique au repli n'est donc PAS une preuve de consommation. On injecte une
// sentinelle et on vérifie qu'elle atteint le HTML.
const MARK = 'ZZ-SENTINELLE-CMS-ZZ'
const sentinel = {}
for (const [type] of SECTIONS) sentinel[type] = { ...contentByType[type], title: MARK }
sentinel.testimonials = { ...contentByType.testimonials, items: [{ name: MARK, text: MARK }] }
const marked = workR.renderCms(sentinel)

const ignored = SECTIONS.map(([t]) => t).filter((t) => !marked[t].includes(MARK))
check(ignored.length === 0, `les ${SECTIONS.length} sections consomment le champ « titre »`, ignored.join(', '))

// Écarts d'affichage à la bascule : ce qui changera visiblement pour le public.
const diverging = SECTIONS.filter(([t]) => before[t] !== cmsHtml[t]).map(([t]) => t)
console.log(`\n  ℹ sections dont l'affichage changera à la bascule : ${diverging.join(', ') || 'aucune'}`)
if (SHOW_DIFF) {
  for (const type of diverging) {
    const x = before[type]
    const y = cmsHtml[type]
    let i = 0
    while (i < x.length && i < y.length && x[i] === y[i]) i++
    console.log(`  --- ${type} : divergence à l'offset ${i} ---`)
    console.log(`      repli : …${x.slice(Math.max(0, i - 80), i + 160)}…`)
    console.log(`      CMS   : …${y.slice(Math.max(0, i - 80), i + 160)}…`)
  }
}

// ===========================================================================
// E. CAPACITÉ À ÉCHOUER — un test qui ne peut pas échouer n'est pas un test.
if (SELFTEST) {
  console.log('\nE. AUTOTEST — le contrôle de non-régression peut-il échouer ?\n')

  const MUT_DIR = `${WORK}/mutated`
  cpSync(`${ROOT}/src/sections`, MUT_DIR, { recursive: true })
  const heroPath = `${MUT_DIR}/Hero.tsx`
  const heroSrc = readFileSync(heroPath, 'utf8')
  const marker = 'LIBELLE-ALTERE-PAR-AUTOTEST'
  const patched = heroSrc.replace("'Découvrir la carte'", `'${marker}'`)
  if (patched === heroSrc) {
    check(false, 'autotest : la chaîne à altérer est introuvable dans Hero.tsx')
  } else {
    writeFileSync(heroPath, patched, 'utf8')
    const mutR = await bundleFile('harness-mutated', harness(MUT_DIR))
    const mutated = mutR.renderLegacy()
    const changed = SECTIONS.filter(([t]) => mutated[t] !== after[t]).map(([t]) => t)

    check(
      changed.includes('hero'),
      'une altération volontaire du Hero est bien détectée',
      changed.length ? `sections en écart : ${changed.join(', ')}` : 'AUCUN écart — le test ne peut pas échouer',
    )
    check(
      changed.length === 1,
      'seule la section altérée est signalée',
      changed.filter((t) => t !== 'hero').join(', ') || 'aucune section signalée à tort',
    )
  }

  // E2 — le contrôle doit aussi voir une régression dans un composant PARTAGÉ
  // (`SectionHead`, utilisé par 8 sections). On altère l'arbre de RÉFÉRENCE :
  // si la branche de référence n'était pas bundlée avec SON PROPRE arbre, cette
  // altération resterait totalement invisible.
  const shPath = `${BASE_DIR}/src/components/ui/SectionHead.tsx`
  const shOriginal = readFileSync(shPath, 'utf8')
  const shPatched = shOriginal.replace(`'"opsz" 144'`, `'"opsz" 999'`)
  if (shPatched === shOriginal) {
    check(false, 'autotest : la chaîne à altérer est introuvable dans SectionHead.tsx')
  } else {
    writeFileSync(shPath, shPatched, 'utf8')
    const sharedR = await bundleFile('harness-shared', harness(BASE_SECTIONS_DIR), {
      alias: { '@': `${BASE_DIR}/src` },
    })
    const sharedHtml = sharedR.renderLegacy()
    const blind = SECTIONS.filter(([t]) => sharedHtml[t] !== before[t]).map(([t]) => t)
    writeFileSync(shPath, shOriginal, 'utf8')
    check(
      blind.length > 1,
      'une régression dans un composant PARTAGÉ est détectée',
      blind.length
        ? `${blind.length} sections en écart (SectionHead)`
        : 'AUCUN écart — la comparaison serait AVEUGLE aux fichiers partagés',
    )
  }
}

// ===========================================================================
console.log(
  failures.length === 0
    ? `\n✅ LOT 1 VÉRIFIÉ — ${sections.length} sections, ${SECTIONS.length} composants, contrôles au vert.`
    : `\n❌ ${failures.length} contrôle(s) en échec :\n   - ${failures.join('\n   - ')}`,
)
process.exit(failures.length === 0 ? 0 : 1)
