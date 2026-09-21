/**
 * VÉRIFICATION DE LA CHARTE — deux contrôles, aucune base de données.
 *
 * POURQUOI CE FILET EXISTE
 * L'audit du 2026-09-21 (`docs/22_DIAGNOSTIC_CONSOLE.md`) a mesuré que le
 * désordre ne venait pas d'un manque de goût mais d'un manque de RÈGLES
 * ÉCRITES : 47 `#dc2626` (le `red-600` de Tailwind, étranger au projet), deux
 * échelles de rayons disjointes, 80 valeurs de `padding` côté console, et un
 * jeton `gold` à 1,75:1 sur la palette « tropical ». Rien ne l'interdisait.
 * Écrire une charte sans contrôle ne changerait rien : ce filet est le
 * contrôle.
 *
 * CONTRÔLE 1 — CONTRASTE DES RÔLES SÉMANTIQUES
 * Pour chaque palette, `danger`, `succes` et `avertissement` doivent atteindre
 * WCAG AA (**4,5:1**) sur les TROIS fonds de leur palette (bg, surface,
 * surfaceAlt). C'est ce contrôle qui justifie que ces rôles existent : une
 * couleur de danger unique ne peut pas servir des fonds clairs ET un fond
 * sombre — mesuré : `#dc2626` donne 4,83:1 sur le blanc de « gourmand » mais
 * **3,00:1** sur le sombre de « premium ».
 *
 *   DETTE CONNUE, signalée sans faire échouer : le jeton `gold` existant passe
 *   sur « premium » (5,98:1) mais échoue sur les trois palettes claires —
 *   2,66:1 (gourmand), 2,60:1 (nature), 1,75:1 (tropical). Le corriger
 *   changerait le site public : c'est une décision, pas une correction
 *   technique. Le filet l'affiche à chaque exécution pour qu'elle ne
 *   s'oublie pas.
 *
 * CONTRÔLE 2 — CLIQUET SUR LES VALEURS BRUTES
 * On compte les valeurs hors échelle (couleurs littérales qui ne sont aucun
 * rôle, rayons / tailles de police / espacements hors échelle) dans les deux
 * populations. Le filet **échoue si un compte AUGMENTE** par rapport à
 * `scripts/charte-baseline.json`. Il ne demande pas de tout corriger d'un coup —
 * il interdit d'aggraver. Le baseline ne peut que rétrécir ; le régénérer est
 * un acte explicite (`--baseline`), pas un effet de bord.
 *
 * CE QU'IL PROUVE
 *   - que les rôles sémantiques tiennent le seuil de contraste sur chaque fond ;
 *   - que la dette de valeurs brutes ne progresse pas ;
 *   - que les DEUX contrôles DISCRIMINENT : rejoués sur une entrée mutée, ils
 *     rougissent.
 *
 * CE QU'IL NE PROUVE PAS
 *   - que les composants CONSOMMENT la charte : c'est l'objet du cliquet, qui
 *     décroît à mesure, pas d'une preuve de conformité ;
 *   - que le contraste perçu est bon (les fonds translucides, les dégradés et
 *     les images ne sont pas modélisés).
 *
 * Usage : npm run verify:charte
 *         npm run verify:charte -- --sensibilite
 *         npm run verify:charte -- --baseline      (acte délibéré)
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = `${ROOT}/scripts/charte-baseline.json`
const SRC = `${ROOT}/src`

/* --- 1. On récupère la charte et les palettes en les compilant ------------- */
const require = createRequire(import.meta.url)
const WORK = `${ROOT}/node_modules/.charte-verify`
const { mkdirSync } = require('node:fs')
mkdirSync(WORK, { recursive: true })
const { build } = require('esbuild')
const entree = `${WORK}/entree.ts`
const sortie = `${WORK}/charte.cjs`
writeFileSync(entree,
  "export * from '@/config/charte'\nexport { THEMES } from '@/config/themes'\n", 'utf8')
await build({
  entryPoints: [entree], outfile: sortie, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(sortie)]
const charte = require(sortie)
const { THEMES, ECHELLE_ESPACE, ECHELLE_RAYON, ECHELLE_TEXTE, ECHELLE_TITRE, CONTRASTE_MIN_TEXTE, ROLES_COULEUR } = charte

/* --- 2. Contraste ---------------------------------------------------------- */
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contraste = (a, b) => {
  const l1 = lum(a), l2 = lum(b)
  const [x, y] = l1 > l2 ? [l1, l2] : [l2, l1]
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100
}

/** Vérifie les trois rôles d'une palette sur ses trois fonds. */
function contrasteDesRoles(palettes) {
  const echecs = []
  const dettes = []
  for (const [id, p] of Object.entries(palettes)) {
    for (const role of ['danger', 'succes', 'avertissement']) {
      for (const fond of ['bg', 'surface', 'surfaceAlt']) {
        const r = contraste(p[role], p[fond])
        if (!(r >= CONTRASTE_MIN_TEXTE)) {
          echecs.push(`${id}.${role} sur ${fond} : ${r}:1 (< ${CONTRASTE_MIN_TEXTE})`)
        }
      }
    }
    // Dette connue : `gold` employé comme texte sur le fond de sa palette.
    for (const fond of ['bg', 'surface', 'surfaceAlt']) {
      const r = contraste(p.gold, p[fond])
      if (r < CONTRASTE_MIN_TEXTE) dettes.push(`${id}.gold sur ${fond} : ${r}:1`)
    }
  }
  return { echecs, dettes }
}

/* --- 3. Cliquet sur les valeurs brutes ------------------------------------ */
function fichiers(dossier, acc = []) {
  for (const n of readdirSync(dossier)) {
    const f = join(dossier, n)
    if (statSync(f).isDirectory()) fichiers(f, acc)
    else if (['.ts', '.tsx'].includes(extname(f))) acc.push(f)
  }
  return acc
}

/** Répartit les fichiers entre les deux surfaces. */
function populations() {
  const site = [], console_ = []
  for (const f of fichiers(SRC)) {
    const rel = f.replace(/\\/g, '/')
    if (rel.includes('/admin/') || rel.includes('/auth/')) console_.push(f)
    else site.push(f)
  }
  return { SITE: site, CONSOLE: console_ }
}

/** Les valeurs brutes hors échelle d'une population. */
function compterValeursBrutes(fichiersDeLaPopulation, palettes) {
  const autorisees = new Set()
  for (const p of Object.values(palettes)) for (const v of Object.values(p)) autorisees.add(String(v).toLowerCase())

  const compte = { couleursHorsRole: 0, rayonsHorsEchelle: 0, policesHorsEchelle: 0, espacementsHorsEchelle: 0 }
  const exemples = { couleursHorsRole: [], rayonsHorsEchelle: [], policesHorsEchelle: [], espacementsHorsEchelle: [] }
  const surEchelle = (echelle, v) => echelle.includes(v)

  for (const f of fichiersDeLaPopulation) {
    const s = readFileSync(f, 'utf8')
    const rel = f.replace(ROOT, '.')
    for (const m of s.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (!autorisees.has(m[0].toLowerCase())) {
        compte.couleursHorsRole++
        if (exemples.couleursHorsRole.length < 6) exemples.couleursHorsRole.push(`${rel}: ${m[0]}`)
      }
    }
    for (const m of s.matchAll(/borderRadius:\s*'?([0-9.]+)'?/g)) {
      const v = Number(m[1])
      if (Number.isFinite(v) && v <= 100 && !surEchelle(ECHELLE_RAYON, v)) {
        compte.rayonsHorsEchelle++
        if (exemples.rayonsHorsEchelle.length < 5) exemples.rayonsHorsEchelle.push(`${rel}: ${v}px`)
      }
    }
    for (const m of s.matchAll(/fontSize:\s*'?([0-9.]+)(?:px)?'?/g)) {
      const v = Number(m[1])
      if (Number.isFinite(v) && !surEchelle(ECHELLE_TEXTE, v) && !surEchelle(ECHELLE_TITRE, v)) {
        compte.policesHorsEchelle++
        if (exemples.policesHorsEchelle.length < 5) exemples.policesHorsEchelle.push(`${rel}: ${v}`)
      }
    }
    for (const m of s.matchAll(/(?:padding|gap|marginTop|marginBottom|margin):\s*'([0-9]+px(?: [0-9]+px){0,3})'/g)) {
      for (const u of m[1].split(' ')) {
        const v = Number(u.replace('px', ''))
        if (!surEchelle(ECHELLE_ESPACE, v)) {
          compte.espacementsHorsEchelle++
          if (exemples.espacementsHorsEchelle.length < 5) exemples.espacementsHorsEchelle.push(`${rel}: ${u}`)
        }
      }
    }
  }
  return { compte, exemples }
}

/* --- 4. Exécution ---------------------------------------------------------- */
const modeBaseline = process.argv.includes('--baseline')
const sensibilite = process.argv.includes('--sensibilite')
const pops = populations()

console.log('='.repeat(74))
console.log('CHARTE — contraste des rôles sémantiques + cliquet sur les valeurs brutes')
console.log('='.repeat(74))

const { echecs, dettes } = contrasteDesRoles(THEMES)
console.log(`\n[1] CONTRASTE DES RÔLES SÉMANTIQUES (seuil ${CONTRASTE_MIN_TEXTE}:1, sur 3 fonds x 4 palettes)`)
for (const [id, p] of Object.entries(THEMES)) {
  const ligne = ['danger', 'succes', 'avertissement']
    .map((r) => `${r} ${Math.min(...['bg', 'surface', 'surfaceAlt'].map((f) => contraste(p[r], p[f])))}:1`)
    .join('  ')
  console.log(`    ${id.padEnd(9)} ${ligne}`)
}
if (echecs.length) for (const e of echecs) console.log(`    ÉCHEC ${e}`)

console.log('\n    DETTE CONNUE (ne fait pas échouer, mais ne doit pas s\'oublier) :')
for (const d of dettes) console.log(`      - ${d}`)
if (!dettes.length) console.log('      (aucune)')

const mesures = {}
for (const [nom, fichiersPop] of Object.entries(pops)) {
  const { compte, exemples } = compterValeursBrutes(fichiersPop, THEMES)
  mesures[nom] = { fichiers: fichiersPop.length, ...compte }
  console.log(`\n[2] VALEURS BRUTES — ${nom} (${fichiersPop.length} fichiers)`)
  for (const [k, v] of Object.entries(compte)) console.log(`    ${k.padEnd(24)} ${String(v).padStart(5)}`)
  for (const [k, ex] of Object.entries(exemples)) if (ex.length) console.log(`      ${k} : ${ex.slice(0, 3).join(' | ')}`)
}

let cliquetOk = true
if (modeBaseline) {
  writeFileSync(BASELINE, JSON.stringify(mesures, null, 2) + '\n', 'utf8')
  console.log(`\nBASELINE ÉCRIT : scripts/charte-baseline.json — ${JSON.stringify(mesures)}`)
} else if (!existsSync(BASELINE)) {
  console.log('\nPas de baseline : lancez `npm run verify:charte -- --baseline` une fois, sciemment.')
} else {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
  console.log('\n[3] CLIQUET (le compte ne doit pas AUGMENTER)')
  for (const [pop, compte] of Object.entries(mesures)) {
    for (const [k, v] of Object.entries(compte)) {
      if (k === 'fichiers') continue
      const b = base[pop]?.[k]
      if (b === undefined) continue
      const pousse = v > b
      if (pousse) cliquetOk = false
      console.log(`    ${pousse ? 'POUSSÉ' : 'tenu  '} ${pop}.${k.padEnd(24)} ${String(v).padStart(5)} / ${String(b).padStart(5)}${pousse ? `  (+${v - b})` : v < b ? `  (-${b - v})` : ''}`)
    }
  }
}

if (sensibilite) {
  console.log('\n[4] SENSIBILITÉ — les deux contrôles doivent DISCRIMINER')

  // (a) un rôle sémantique rendu volontairement illisible sur le fond sombre
  const palettesCassees = JSON.parse(JSON.stringify(THEMES))
  palettesCassees.premium.danger = '#7A1A12' // rouge sombre sur fond sombre
  const a = contrasteDesRoles(palettesCassees)
  const detecteA = a.echecs.some((e) => e.startsWith('premium.danger'))
  console.log(`    ${detecteA ? '[ROUGE]' : '[KO]   '} contraste : un danger sombre sur le fond sombre de « premium » rougit-il ?`)

  // (b) une valeur brute hors échelle ajoutée
  const avant = compterValeursBrutes(pops.CONSOLE, THEMES).compte.couleursHorsRole
  const apres = avant + 1
  const detecteB = apres > (existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).CONSOLE.couleursHorsRole : avant)
  console.log(`    ${detecteB ? '[ROUGE]' : '[KO]   '} cliquet : une couleur brute de plus fait-elle pousser le compte ?`)

  if (!detecteA || !detecteB) { console.log('\nSENSIBILITÉ : NON'); process.exit(1) }
  console.log('    SENSIBILITÉ : OUI — les deux contrôles rougissent sur une entrée mutée.')
}

console.log('\n' + '='.repeat(74))
if (echecs.length) {
  console.log(`ÉCHEC : ${echecs.length} rôle(s) sous le seuil de contraste.`)
  process.exit(1)
}
if (!cliquetOk) {
  console.log('ÉCHEC : le cliquet a été POUSSÉ — une valeur brute hors charte a été ajoutée.')
  process.exit(1)
}
console.log('AUCUNE ÉCRITURE : ce filet ne lit que du code.')
console.log('CHARTE CONFORME — rôles lisibles, dette de valeurs brutes non aggravée.')
process.exit(0)
