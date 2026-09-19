/**
 * PREUVE de bout en bout du chemin de LECTURE publique — sans navigateur.
 *
 * 1. lit la page et ses sections en base (clé de service) ;
 * 2. construit l'instantané avec la fonction RÉELLE du projet (`buildSnapshot`) :
 *    le format est donc celui du code, pas une copie qui pourrait diverger ;
 * 3. l'écrit dans `pages.published_snapshot` et publie la page (une écriture) ;
 * 4. relit par `fetchPublicPageWithSections` AVEC LA CLÉ ANONYME — donc
 *    exactement comme un visiteur, RLS comprise.
 *
 * Ce que ça prouve : le public lit bien l'INSTANTANÉ, et la RLS `anon` suffit.
 * Ce que ça ne prouve pas : le clic « Publier » (chemin d'écriture de
 * `publishPage`), vérifié séparément.
 *
 * Usage : node scripts/probe-snapshot.mjs
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

// --- Variables d'environnement du projet -----------------------------------
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

// Le chemin PUBLIC est bundlé AVEC la clé anonyme : c'est ce que voit un
// visiteur. Le bundle d'écriture reste sans clé (on écrit en REST direct).
const pub = await bundleFile(
  'public-read',
  `export { fetchPublicPageWithSections } from '@/cms/repository/sections'`,
  { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON }) },
)
const model = await bundleFile(
  'snapshot-model',
  `export { buildSnapshot, parseSnapshot, SNAPSHOT_FORMAT_VERSION } from '@/cms/model/publishing'`,
  { 'import.meta.env': '{}' },
)

// --- Accès REST (clé de service) -------------------------------------------
async function rest(path, method = 'GET', body, prefer) {
  const headers = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
  if (prefer) headers.Prefer = prefer
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`REST ${r.status} ${path} :: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

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

console.log('='.repeat(66))
console.log('1. LECTURE EN BASE')
console.log('='.repeat(66))

const pages = await rest('pages?select=*')
const page = mapPage(pages[0])
console.log(`  page : slug="${page.slug}" statut=${page.status}`)

const sectionRows = await rest('page_sections?select=*&order=position')
const sections = sectionRows.map(mapSection)
console.log(`  sections : ${sections.length}`)

console.log('\n' + '='.repeat(66))
console.log('2. CONSTRUCTION DE L\'INSTANTANE (fonction du projet)')
console.log('='.repeat(66))

const snapshot = model.buildSnapshot(page, sections, {
  status: 'published',
  publishedAt: new Date().toISOString(),
})
console.log(`  formatVersion : ${snapshot.formatVersion}`)
console.log(`  sections figees : ${snapshot.sections.length}`)
console.log(`  statut fige : ${snapshot.page.status}`)
const relu = model.parseSnapshot(snapshot)
console.log(`  relecture du format : ${relu.ok ? 'OK' : 'REFUSEE — ' + relu.error}`)

console.log('\n' + '='.repeat(66))
console.log('3. ECRITURE (instantané + publication, une seule ecriture)')
console.log('='.repeat(66))

await rest(`pages?id=eq.${page.id}`, 'PATCH', {
  status: 'published',
  published_snapshot: snapshot,
}, 'return=minimal')
console.log('  ecrit.')

const check = await rest(`pages?select=status,published_snapshot&id=eq.${page.id}`)
console.log(`  statut en base : ${check[0].status}`)
console.log(`  instantane en base : ${check[0].published_snapshot ? 'present (' +
  JSON.stringify(check[0].published_snapshot).length + ' octets)' : 'NULL'}`)

console.log('\n' + '='.repeat(66))
console.log('4. LECTURE PUBLIQUE (cle ANONYME, comme un visiteur)')
console.log('='.repeat(66))

const res = await pub.fetchPublicPageWithSections('')
// Le public ne voit que les sections VISIBLES : on compare aux visibles figées,
// pas au total (une section masquée ne doit jamais être servie — TDR §22).
const visibles = snapshot.sections.filter((s) => s.visible).length
if (!res.ok) {
  console.log('  ECHEC :', res.error)
  process.exitCode = 1
} else if (!res.data) {
  console.log('  aucune page publiee -> rendu historique')
  process.exitCode = 1
} else {
  console.log(`  page : "${res.data.page.slug}"`)
  console.log(`  sections servies : ${res.data.sections.length} (visibles figées : ${visibles})`)
  const types = res.data.sections.map((s) => s.type)
  console.log(`  types : ${types.join(', ')}`)
  const titre = res.data.sections[0]?.content?.title
  console.log(`  titre de la 1re section : ${JSON.stringify(titre).slice(0, 90)}`)
  const ok = res.data.sections.length === visibles
  console.log(`\n  >>> le public lit l'INSTANTANE : ${ok ? 'OUI' : 'NON'}`)
  if (!ok) process.exitCode = 1
}

console.log('\n' + '='.repeat(66))
console.log('5. FUITE DU BROUILLON (ce que la migration 031 doit fermer)')
console.log('='.repeat(66))

// Lecture ANONYME directe de la table de travail : c'est le trou. Tant que la
// policy `sections_public_read` existe, le visiteur lit le BROUILLON.
const anonSections = await (async () => {
  const r = await fetch(`${URL}/rest/v1/page_sections?select=id,type,visible`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  })
  return { status: r.status, body: await r.text() }
})()
const anonCount = anonSections.status === 200 ? JSON.parse(anonSections.body).length : 0
console.log(`  sections lisibles par anon dans page_sections : ${anonCount}`)
console.log(`  >>> FUITE ACTIVE : ${anonCount > 0 ? 'OUI — 031 necessaire' : 'non'}`)

console.log('\n' + '='.repeat(66))
console.log('6. ISOLATION DU BROUILLON — le coeur du TDR §22')
console.log('='.repeat(66))

// On modifie le BROUILLON (la table de travail) et on verifie que le visiteur
// ne voit RIEN changer. C'est exactement ce que le CMS doit garantir : le
// restaurateur edite librement, le public ne voit que le publie.
const hero = sections.find((s) => s.type === 'hero')
if (!hero) {
  console.log('  aucune section hero — test ignore')
} else {
  const avant = await pub.fetchPublicPageWithSections('')
  const titreAvant = avant.data?.sections.find((s) => s.type === 'hero')?.content?.title
  console.log(`  titre servi AVANT modif : ${JSON.stringify(titreAvant).slice(0, 70)}`)

  const modifie = {
    ...hero.content,
    title: { fr: 'BROUILLON MODIFIE ' + Date.now() },
  }
  await rest(`page_sections?id=eq.${hero.id}`, 'PATCH', { content: modifie }, 'return=minimal')
  console.log('  brouillon modifie en base.')

  const apres = await pub.fetchPublicPageWithSections('')
  const titreApres = apres.data?.sections.find((s) => s.type === 'hero')?.content?.title
  console.log(`  titre servi APRES modif : ${JSON.stringify(titreApres).slice(0, 70)}`)

  const inchange = JSON.stringify(titreAvant) === JSON.stringify(titreApres)
  console.log(`\n  >>> le BROUILLON ne fuit PAS vers le visiteur : ${inchange ? 'OUI' : 'NON'}`)
  if (!inchange) {
    console.log('      ECHEC : le visiteur voit le brouillon.')
    process.exitCode = 1
  }

  // Remise en etat du brouillon
  await rest(`page_sections?id=eq.${hero.id}`, 'PATCH', { content: hero.content }, 'return=minimal')
  console.log('  brouillon restaure.')
}
