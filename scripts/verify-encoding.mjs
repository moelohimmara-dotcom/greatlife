/**
 * Filet : aucun littéral UI source ne doit contenir du mojibake UTF-8→CP1252
 * (ex. EnregistrÃ©, ContrÃ´le, Mettre Ã jour).
 * Régression 2026-09-24 : PageEditor.tsx entièrement double-encodé.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

/** Séquences typiques d'UTF-8 lu comme Windows-1252 / Latin-1. */
const MOJIBAKE =
  /Ã[\u0080-\u00FF]|â€[\u0080-\u00FF]|Â[«»\u00A0]|Ã\u00A0/u

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.json', '.md'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else {
      const dot = name.lastIndexOf('.')
      if (dot >= 0 && EXT.has(name.slice(dot))) out.push(p)
    }
  }
  return out
}

const failures = []
const files = walk(SRC)

console.log('ENCODAGE UI — scan mojibake UTF-8→CP1252 sous src/\n')

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  lines.forEach((line, i) => {
    if (!MOJIBAKE.test(line)) return
    // reset lastIndex if needed — recreate test
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    const sample = line.trim().slice(0, 100)
    failures.push(`${rel}:${i + 1}: ${sample}`)
  })
}

if (failures.length) {
  console.log(`  ✗ ${failures.length} occurrence(s)\n`)
  for (const f of failures.slice(0, 40)) console.log(`    ${f}`)
  if (failures.length > 40) console.log(`    … +${failures.length - 40}`)
  console.log(`\n❌ Encodage source corrompu (mojibake).`)
  process.exit(1)
}

console.log('  ✓ aucun mojibake détecté sous src/')
console.log('\n✅ Littéraux UI en UTF-8 correct.')
