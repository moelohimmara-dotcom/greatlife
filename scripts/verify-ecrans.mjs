/**
 * CONTRÔLE DES ÉCRANS — chaque écran n'écrit que ce qu'il affiche. LECTURE SEULE.
 *
 * POURQUOI CE FILET EXISTE (plan P0, 2026-09-20)
 * Quatre écrans de contenu partageaient le même objet `content` et la même
 * écriture qui persistait L'OBJET ENTIER. Conséquence mesurée : un champ vide
 * dans l'écran A écrasait la valeur publiée depuis l'écran B — c'est la cause
 * de la duplication des coordonnées et du piège documenté dans `docs/19 §7`.
 *
 * La garantie reste INDISPENSABLE après le correctif, sinon un futur écran
 * réintroduira l'écrasement silencieusement. D'où trois exigences, vérifiées
 * STATIQUEMENT :
 *   1. plus aucun `saveContentToDb` / `saveSiteConfigToDb` dans la console ;
 *   2. chaque écran qui appelle une écriture de domaine le fait avec une
 *      LISTE DE CLÉS EXPLICITE ;
 *   3. cette liste est EXACTEMENT le domaine déclaré — ni plus (insertion
 *      silencieuse d'un champ d'un autre écran), ni moins.
 *
 * Usage : node scripts/verify-ecrans.mjs   (ou `npm run verify:ecrans`)
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ADMIN_DIR = join(ROOT, 'src', 'admin')
const MODULES_DIR = join(ADMIN_DIR, 'modules')

/** Sources console à scruter (AdminPanel + modules extraits). */
function sourcesConsole() {
  const files = [join(ADMIN_DIR, 'AdminPanel.tsx')]
  for (const name of readdirSync(MODULES_DIR)) {
    if (name.endsWith('.tsx')) files.push(join(MODULES_DIR, name))
  }
  return files.map((path) => ({ path, source: readFileSync(path, 'utf8') }))
}

const sources = sourcesConsole()
const source = sources.map((s) => s.source).join('\n\n')

/** Les domaines par écran — la règle, lisible par machine. */
const DOMAINES = [
  { fonction: 'ThemeEditor', save: 'saveApparenceFields', cles: ['themeId', 'fontId'] },
  { fonction: 'VisibilityEditor', save: 'saveApparenceFields', cles: ['visibility'] },
  { fonction: 'TeamContentsEditor', save: 'saveContentFields', cles: ['team', 'engagements', 'testimonials'] },
  { fonction: 'FormsConfig', save: 'saveContentFields', cles: ['autoReply', 'emailContact', 'emailReservation'] },
  {
    fonction: 'SettingsEditor',
    save: 'saveContentFields',
    cles: [
      'restaurantName', 'currency', 'phone', 'address', 'hours',
      'socialFacebook', 'socialInstagram', 'socialWhatsapp',
      'emailContact', 'emailReservation',
      'pickupTimes',
      'englishEnabled',
    ],
  },
]

/**
 * Corps d'une fonction exportée ou top-level : de son « function X( » au suivant
 * dans LE MÊME fichier module (les écrans sont désormais sous src/admin/modules/).
 */
export function corps(fonction) {
  const fichier = sources.find((s) =>
    s.source.includes(`function ${fonction}(`) || s.source.includes(`function ${fonction} (`),
  )
  if (!fichier) return null
  const src = fichier.source
  const debut = src.search(new RegExp(`(?:export\\s+)?function ${fonction}\\s*\\(`))
  if (debut === -1) return null
  // Jusqu'à la prochaine fonction exportée / top-level du même fichier, ou fin.
  const reste = src.slice(debut + 1)
  const next = reste.search(/\n(?:export\s+)?function\s+\w+\s*\(/)
  const fin = next === -1 ? src.length : debut + 1 + next
  return src.slice(debut, fin)
}

/**
 * Les clés d'un appel LITTÉRAL `saveXxxFields({ a: v, b: v })`.
 * Une écriture sans clés littérales (variable, spread) renvoie `null` et
 * déclare ECHEC : une écriture par variable ne prouve plus rien au lecteur.
 */
export function clesDe(body, nomSauvegarde) {
  if (body === null) return null
  const m = new RegExp(`${nomSauvegarde}\\(\\{([^}]*)\\}\\)`, 's').exec(body)
  if (!m) return null
  // Tokens séparés par des virgules ; chaque token est soit un RACCOURCI
  // (`themeId`), soit un `clé: valeur`. Les spreads (`...`) ne se débrouillent
  // pas : ils retournent `null` et échouent, car ils cachent les clés.
  const clefs = m[1]
    .split(',')
    .map((t) => (/^\s*(\w+)\s*:/.exec(t) ?? /^\s*(\w+)\s*$/.exec(t))?.[1])
    .filter(Boolean)
  return [...new Set(clefs)]
}

console.log('='.repeat(70))
console.log('A. LES ÉCRITURES-BLOC SONT-ELLES DISPARUES ?')
console.log('='.repeat(70))
const bloc = source.match(/saveContentToDb|saveSiteConfigToDb/g) ?? []
if (bloc.length > 0) {
  console.log(`  ECHEC : il reste ${bloc.length} occurrence(s) d'écriture-bloc dans la console.`)
  process.exitCode = 1
} else {
  console.log('  aucune écriture-bloc : chaque écran passe par un patch de domaine.')
}

console.log('\n' + '='.repeat(70))
console.log('B. CHAQUE ÉCRAN ÉCRIT-IL EXACTEMENT SON DOMAINE ?')
console.log('='.repeat(70))
let echec = false
for (const { fonction, save, cles } of DOMAINES) {
  const corpsModule = corps(fonction)
  if (!corpsModule) {
    console.log(`  ${fonction} : le module est introuvable (retitré ?).`)
    console.log('    ECHEC : mettez DOMAINES à jour (la liste ICI EST la regle).')
    process.exitCode = 1
    continue
  }
  const clesTrouvees = clesDe(corpsModule, save)
  if (!clesTrouvees) {
    console.log(`  ${fonction} : AUCUN appel « ${save}({…}) » avec des clés littérales.`)
    console.log('    ECHEC : retour au cas PIÈGE — voir `docs/19 §7`.')
    process.exitCode = 1
    continue
  }
  const manquantes = cles.filter((c) => !clesTrouvees.includes(c))
  const extra = clesTrouvees.filter((c) => !cles.includes(c))
  if (manquantes.length === 0 && extra.length === 0) {
    console.log(`  ${fonction.padEnd(20)} ${cles.join(', ')}`)
  } else {
    console.log(`  ${fonction} : ECHEC`)
    for (const c of manquantes) console.log(`    absent de son appel : ${c}`)
    for (const c of extra) console.log(`    écrit un champ qu'il n'affiche pas : ${c} -> peut écraser un domaine voisin`)
    process.exitCode = 1
    echec = true
  }
}

console.log('\n' + '='.repeat(70))
console.log('C. SENSIBILITÉ — l\'extraction fonctionne-t-elle vraiment ?')
console.log('='.repeat(70))
// Même fonction que B (revue 3 : un témoin sans appel ne servait à rien).
const DEMO = `async function Demo() { const r = await saveContentFields({ emailContact: content.emailContact }) }`
const clesDemo = clesDe(DEMO, 'saveContentFields')
const okDemo = clesDemo !== null && clesDemo.length === 1 && clesDemo[0] === 'emailContact'
console.log(`  l'extraction lit une écriture : ${okDemo ? 'OUI' : 'NON'}`)
if (!okDemo) process.exitCode = 1

console.log('\n' + '='.repeat(70))
console.log(process.exitCode ? 'ECHEC — voir les lignes ci-dessus.' : 'ÉCRANS CONFORMES — chaque « Enregistrer » n’écrit que son domaine.')
console.log('AUCUNE ÉCRITURE : ce filet ne lit que du code.')
console.log('='.repeat(70))
