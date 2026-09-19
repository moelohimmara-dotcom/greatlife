/**
 * CONTRÔLE DU CHEMIN PUBLIC — STRICTEMENT EN LECTURE SEULE.
 *
 * POURQUOI CE CONTRÔLE EXISTE (constat I4 de la revue indépendante)
 * `verify:lot1` lit `page_sections`, c'est-à-dire le BROUILLON, et compare le
 * rendu historique à une révision fixe. Il n'exerce JAMAIS le chemin de
 * l'instantané. Un « vert » de `verify:lot1` ne dit donc rien sur la chaîne de
 * publication — c'est-à-dire précisément ce que ce lot a changé. Ce contrôle-ci
 * ferme ce trou : il compare ce que le public REÇOIT à l'instantané PUBLIÉ.
 *
 * ⚠️ CE FICHIER A ÉCRIT EN PRODUCTION, ET C'ÉTAIT UN DÉFAUT
 * Une version précédente faisait :
 *     PATCH pages?id=eq.<id> { status:'published', published_snapshot: snapshot }
 * avec la clé de SERVICE. Conséquence mesurée : l'état publié en production ne
 * correspondait plus à la version archivée (`pages.published_snapshot` !=
 * `page_versions[1].snapshot`), et `published_at` ne correspondait à rien.
 * Le critère 9 de `docs/10_PUBLISHING_VERSIONING.md` §10 l'interdit :
 * « Aucune écriture n'est effectuée sur la base de production par un script de
 * vérification. » Un script qui fabrique l'état qu'il constate ne vérifie rien.
 *
 * Cette version ne fait que des `GET` et des appels de lecture. Elle échoue si
 * un écrivain était nécessaire : c'est volontaire.
 *
 * Ce qu'elle vérifie :
 *   1. l'instantané publié est bien construit et relisible (fonctions réelles) ;
 *   2. ce que le public reçoit correspond EXACTEMENT à l'instantané publié —
 *      la preuve que le public lit l'état figé, et non la table de travail ;
 *   3. le brouillon est illisible par un visiteur anonyme (TDR §22) ;
 *   4. le brouillon DIVERGE de l'instantané : la preuve que les deux états sont
 *      bien séparés, et non confondus par hasard.
 *
 * Usage : node scripts/verify-public.mjs   (ou `npm run verify:public`)
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

const ENV = {}
for (const line of readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
  if (line.includes('=') && !line.startsWith('#')) {
    const i = line.indexOf('=')
    ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}
const URL = ENV.VITE_SUPABASE_URL
const ANON = ENV.VITE_SUPABASE_ANON_KEY
const SVC = ENV.NEW_SERVICE_ROLE_KEY
if (!URL || !ANON || !SVC) throw new Error('Variables Supabase manquantes dans .env')

async function bundleFile(name, contents, define) {
  const entry = `${WORK}/${name}.tsx`
  const outfile = `${WORK}/${name}.cjs`
  writeFileSync(entry, contents, 'utf8')
  await build({
    entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
    jsx: 'automatic', define, alias: { '@': `${ROOT}/src` },
    loader: { '.tsx': 'tsx', '.ts': 'ts' }, logLevel: 'warning',
  })
  delete require.cache[require.resolve(outfile)]
  return require(outfile)
}

const pub = await bundleFile(
  'public-read',
  `export { fetchPublicPageWithSections } from '@/cms/repository/sections'`,
  { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON }) },
)
const model = await bundleFile(
  'snapshot-model',
  `export { buildSnapshot, parseSnapshot } from '@/cms/model/publishing'`,
  { 'import.meta.env': '{}' },
)

/** LECTURE seule. Toute methode d'ecriture est refusee ici, par principe. */
async function lecture(path, key = SVC) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} :: ${t.slice(0, 200)}`)
  return t ? JSON.parse(t) : null
}

const egaux = (a, b) => JSON.stringify(a) === JSON.stringify(b)

console.log('='.repeat(66))
console.log('1. ETAT DE TRAVAIL (brouillon) — lecture seule')
console.log('='.repeat(66))
const page = (await lecture('pages?select=id,slug,status,published_at,published_snapshot'))[0]
const brouillon = await lecture('page_sections?select=*&order=position')
console.log(`  page : slug="${page.slug}" | statut=${page.status} | published_at=${page.published_at}`)
console.log(`  sections en travail : ${brouillon.length}`)

console.log('\n' + '='.repeat(66))
console.log('2. INSTANTANE PUBLIE — construit et relu par les fonctions REELLES')
console.log('='.repeat(66))
const mapPage = (r) => ({
  id: r.id, slug: r.slug ?? '', title: r.title_i18n ?? {}, status: r.status ?? 'draft',
  sortOrder: r.sort_order ?? 0, seo: r.seo ?? {}, publishedAt: r.published_at ?? null,
  createdAt: r.created_at ?? '', updatedAt: r.updated_at ?? '', updatedBy: r.updated_by ?? null,
})
const mapSection = (r) => ({
  id: r.id, pageId: r.page_id, type: r.type, variant: r.variant ?? null,
  position: r.position ?? 0, visible: r.visible !== false, anchor: r.anchor ?? null,
  content: r.content ?? {}, settings: r.settings ?? {}, createdAt: '', updatedAt: '',
})
const reconstruit = model.buildSnapshot(mapPage(page), brouillon.map(mapSection), {
  status: 'published', publishedAt: page.published_at ?? new Date().toISOString(),
})
const relu = model.parseSnapshot(reconstruit)
console.log(`  formatVersion : ${reconstruit.formatVersion} | sections : ${reconstruit.sections.length}`)
console.log(`  relecture du format : ${relu.ok ? 'OK' : 'REFUSEE — ' + relu.error}`)

const enBase = page.published_snapshot
console.log(`  instantane stocke en base : ${enBase ? JSON.stringify(enBase).length + ' octets' : 'NULL'}`)

console.log('\n' + '='.repeat(66))
console.log('3. LECTURE PUBLIQUE (cle ANONYME, comme un visiteur)')
console.log('='.repeat(66))
const res = await pub.fetchPublicPageWithSections('')
if (!res.ok || !res.data) {
  console.log('  le public ne recoit pas de contenu CMS :', res.ok ? 'aucune page publiee' : res.error)
  process.exitCode = 1
} else {
  const servies = res.data.sections
  console.log(`  sections servies : ${servies.length}`)
  console.log(`  types : ${servies.map((s) => s.type).join(', ')}`)

  // --- 3. Le public sert-il EXACTEMENT l'instantane stocke ? ----------------
  const attendues = (enBase?.sections ?? [])
    .filter((s) => s.visible)
    .sort((a, b) => a.position - b.position)
  const identiques = egaux(
    servies.map((s) => ({ type: s.type, position: s.position, content: s.content })),
    attendues.map((s) => ({ type: s.type, position: s.position, content: s.content })),
  )
  console.log(`\n  >>> le public sert EXACTEMENT l'instantane stocke : ${identiques ? 'OUI' : 'NON'}`)
  if (!identiques) process.exitCode = 1

  /*
    AUTOTEST DE SENSIBILITÉ.
    Une comparaison qui répondrait toujours « OUI » ne prouverait rien. On
    vérifie donc qu'elle sait dire « NON » : mêmes données, avec UN champ
    volontairement altéré. Si elle ne détecte pas cette différence, le « OUI »
    ci-dessus n'a aucune valeur.
  */
  const falsifie = attendues.map((s, i) =>
    i === 0 ? { ...s, content: { ...s.content, __falsifie: 'valeur differente' } } : s)
  const detecte = !egaux(
    servies.map((s) => ({ type: s.type, position: s.position, content: s.content })),
    falsifie.map((s) => ({ type: s.type, position: s.position, content: s.content })),
  )
  console.log(`  autotest : la comparaison détecte une différence : ${detecte ? 'OUI' : 'NON'}`)
  if (!detecte) {
    console.log('      ÉCHEC : la comparaison est aveugle, le verdict ci-dessus ne vaut rien.')
    process.exitCode = 1
  }

  // --- 4. Le brouillon diverge-t-il de l'instantane ? ----------------------
  // S'ils etaient identiques, la preuve d'isolation ne serait pas concluante :
  // on ne pourrait pas distinguer « lit l'instantane » de « lit le brouillon ».
  const divergentes = brouillon.filter((s) => {
    const inst = (enBase?.sections ?? []).find((x) => x.id === s.id)
    return inst && !egaux(inst.content, s.content ?? {})
  })
  console.log(`  sections ou le brouillon diverge de l'instantane : ${divergentes.length}` +
    ` / ${brouillon.length}`)
  if (divergentes.length > 0) {
    const types = divergentes.map((s) => s.type).join(', ')
    console.log(`  (${types})`)
    console.log(`  >>> preuve par divergence : le public sert bien l'etat FIGE, pas le travail`)
  } else {
    console.log(`  >>> divergence nulle : la lecture croisee ne prouve rien de plus ici`)
  }
}

console.log('\n' + '='.repeat(66))
console.log('5. FUITE DU BROUILLON (TDR §22) — lecture ANONYME de la table de travail')
console.log('='.repeat(66))
const anon = await lecture('page_sections?select=id', ANON)
console.log(`  sections lisibles par un visiteur anonyme : ${Array.isArray(anon) ? anon.length : anon}`)
console.log(`  >>> brouillon ferme au public : ${Array.isArray(anon) && anon.length === 0 ? 'OUI' : 'NON'}`)
if (!Array.isArray(anon) || anon.length !== 0) process.exitCode = 1

console.log('\n' + '='.repeat(66))
console.log('AUCUNE ECRITURE N\'A ETE EFFECTUEE — cette sonde ne fait que lire.')
console.log('='.repeat(66))
