/**
 * Greatlife — contrôle de COHÉRENCE entre la matrice d'accès et la RLS
 * ===================================================================
 * DÉFAUT CONSTATÉ (constat I3 de la revue indépendante)
 * `rbac.ts` accordait le module « Contenu » à `owner`, `manager`, `chef`,
 * `editor` et `guest`. La RLS, elle, ne sert `page_sections`, `pages` et
 * `page_versions` qu'à `owner` et `manager`.
 *
 * Symptôme, toujours le même : le rôle voit le module dans la barre latérale,
 * l'ouvre, et trouve un éditeur VIDE — sans la moindre explication. Un compte
 * `guest` était actif dans cet état. Le geste destructeur restait bloqué en
 * aval (la RLS refuse aussi l'écriture), donc c'était de la confusion, pas de
 * la destruction — mais un écran vide et muet reste un défaut.
 *
 * LA RÈGLE VÉRIFIÉE
 * Pour chaque module, les rôles autorisés par l'INTERFACE doivent être un
 * SOUS-ENSEMBLE des rôles autorisés à LIRE en base. Si l'interface est plus
 * large, le module s'ouvre sur du vide. Si l'interface est plus étroite, on
 * cache une capacité — moins grave, mais on le signale aussi.
 *
 * POURQUOI CE CONTRÔLE LIT LA BASE
 * Comparer deux copies du même tableau ne prouverait rien : c'est justement
 * leur divergence qui est le défaut. On interroge donc les politiques réelles.
 *
 * Usage : node scripts/verify-rbac.mjs
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

const M = await bundleFile('rbac', `
  export { MODULE_ACCESS, ROLES } from '@/data/rbac'
`)

/**
 * Quelles tables chaque module doit pouvoir LIRE pour être utilisable.
 * Table explicite et volontairement courte : on ne devine pas, on déclare.
 * Un module absent d'ici est signalé comme non couvert, jamais considéré bon.
 */
const TABLES_DU_MODULE = {
  content: ['page_sections', 'pages', 'page_versions'],
  menu: ['menu_items'],
  blog: ['blog_posts'],
  media: ['media_assets'],
  team: ['site_content'],
  theme: ['site_content'],
  settings: ['site_content'],
  visibility: ['site_content'],
  forms: ['site_content'],
  navigation: ['navigation_items', 'navigation'],
  users: ['admin_users'],
  audit: ['audit_log'],
  orders: ['orders'],
  messages: ['messages'],
  reservations: ['reservations'],
}

// --- Politiques réelles, via l'API Management (SELECT uniquement) -----------
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ENV.NEW_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ENV.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`SQL -> ${r.status} :: ${t.slice(0, 200)}`)
  return JSON.parse(t)
}

const politiques = await sql(`
  SELECT tablename, policyname, cmd, roles::text AS roles, qual
  FROM pg_policies
  WHERE schemaname = 'public' AND cmd IN ('SELECT', 'ALL')
`)

/**
 * Rôles qui peuvent LIRE une table, d'après les politiques.
 * Renvoie `null` si la table est lisible publiquement (tout le monde).
 *
 * ⚠️ Une politique accordée à `anon` (ou `public`) rend la table lisible par
 * TOUS les rôles, même si sa condition restreint les LIGNES (`published = true`
 * par exemple). Ne regarder que `is_admin(ARRAY[...])` produit un faux positif :
 * mesuré sur `blog_posts`, dont la lecture publique passe par
 * `blog_public_read (published = true)` — le module Blog était déclaré « ouvert
 * sur du vide » à tort.
 */
function rolesQuiLisent(table) {
  const propres = politiques.filter((p) => p.tablename === table)
  if (!propres.length) return []            // aucune politique de lecture
  const tout = []
  for (const p of propres) {
    const roles = p.roles ?? ''
    if (/\b(anon|public)\b/.test(roles)) return null  // lisible par tous
    const q = p.qual ?? ''
    if (/^\s*true\s*$/i.test(q)) return null
    for (const m of q.matchAll(/is_admin\(ARRAY\[([^\]]*)\]/g)) {
      for (const r of m[1].matchAll(/'([a-z_]+)'/g)) tout.push(r[1])
    }
  }
  return [...new Set(tout)]
}

const TOUS = M.ROLES.map((r) => r.id)
const failures = []
function check(ok, label, detail) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

/**
 * Vérifie une matrice. Séparé pour pouvoir éprouver la SENSIBILITÉ du contrôle
 * avec une matrice volontairement fausse.
 */
function verifier(matrice, { silencieux = false } = {}) {
  const problemes = []
  for (const [id, acces] of Object.entries(matrice)) {
    const tables = TABLES_DU_MODULE[id]
    if (!tables) continue
    /*
      INTERSECTION, pas union. Un module a besoin de lire TOUTES ses tables pour
      être utilisable : si un rôle peut lire `pages` mais pas `page_sections`, le
      module s'ouvre et affiche une structure vide — c'est exactement le défaut.
      `pages` est lisible publiquement (`pages_public_read`), donc une union
      blanchirait tout le monde et rendrait le contrôle aveugle (mesuré).
    */
    let autorises = null
    for (const t of tables) {
      const l = rolesQuiLisent(t)
      const ensemble = l === null ? new Set(TOUS) : new Set(l)
      autorises = autorises === null ? ensemble : new Set([...autorises].filter((r) => ensemble.has(r)))
    }
    autorises = autorises ?? new Set()
    const enTrop = (acces.roles ?? []).filter((r) => !autorises.has(r))
    if (enTrop.length) {
      problemes.push({ id, module: acces.module, enTrop })
      if (!silencieux) {
        console.log(`  ✗ ${acces.module} : ${enTrop.join(', ')} voient le module mais ne lisent RIEN`)
      }
    }
  }
  return problemes
}

console.log('Cohérence matrice d\'accès (interface) ↔ RLS (base)\n')

console.log('A. chaque module accessible est-il lisible en base ?')
const problemes = verifier(M.MODULE_ACCESS)
const couverts = Object.keys(TABLES_DU_MODULE).filter((id) => M.MODULE_ACCESS[id])
for (const id of couverts) {
  if (!problemes.some((p) => p.id === id)) {
    console.log(`  ✓ ${M.MODULE_ACCESS[id].module} : cohérent`)
  }
}
check(problemes.length === 0, 'aucun module ouvert sur du vide',
  problemes.length ? `${problemes.length} en écart` : 'tous cohérents')

const nonCouverts = Object.keys(M.MODULE_ACCESS).filter((id) => !TABLES_DU_MODULE[id])
if (nonCouverts.length) {
  console.log(`  (information : ${nonCouverts.length} module(s) non déclaré(s) dans ce contrôle : ${nonCouverts.join(', ')})`)
}

console.log('\nB. sensibilité — le contrôle détecte-t-il vraiment un écart ?')
// On remet la faute historique : `guest` sur le module Contenu.
const matriceFausse = {
  ...M.MODULE_ACCESS,
  content: { ...M.MODULE_ACCESS.content, roles: ['owner', 'manager', 'chef', 'editor', 'guest'] },
}
const problemesFaux = verifier(matriceFausse, { silencieux: true })
check(problemesFaux.length === 1 && problemesFaux[0].id === 'content',
  'en remettant l\'ancienne matrice, le contrôle ÉCHOUE bien',
  problemesFaux.length ? `${problemesFaux[0].enTrop.join(', ')} détectés` : 'aucun écart détecté — le contrôle serait aveugle')

console.log('\nC. la lecture en base est-elle bien mesurée, et pas supposée ?')
const content = rolesQuiLisent('page_sections')
check(Array.isArray(content) && content.length > 0,
  'page_sections : rôles de lecture effectivement lus dans pg_policies',
  content === null ? 'lisible par tous' : content.join(', '))

console.log('\n' + '='.repeat(64))
if (failures.length) {
  console.log(`❌ COHÉRENCE RBAC EN ÉCHEC — ${failures.length} contrôle(s) :`)
  for (const f of failures) console.log(`   · ${f}`)
  process.exit(1)
}
console.log('✅ COHÉRENCE VÉRIFIÉE — aucun module ne s\'ouvre sur du vide.')
