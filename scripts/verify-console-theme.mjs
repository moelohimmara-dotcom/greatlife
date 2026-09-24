/**
 * Filet : le chrome console (.admin-carte) ne doit pas peindre avec --c-* (thème site).
 * Régression 2026-09-24 : cartes Atelier sombres + texte --admin-ink = illisible en Clair.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const indexCss = readFileSync(join(ROOT, 'src/index.css'), 'utf8')
const consoleCss = readFileSync(join(ROOT, 'src/admin/console.css'), 'utf8')

const failures = []

function check(ok, label) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failures.push(label)
}

console.log('CHARTE CONSOLE — .admin-carte sans fuite --c-surface\n')

const carteBlock = indexCss.match(/\.admin-carte\s*\{[^}]+\}/)?.[0] ?? ''
check(/--admin-surface/.test(carteBlock), 'index.css .admin-carte utilise --admin-surface')
check(!/--c-surface/.test(carteBlock), 'index.css .admin-carte n’utilise pas --c-surface')

const selected = indexCss.match(/\.admin-carte\.is-selected\s*\{[^}]+\}/)?.[0] ?? ''
check(/--admin-forest/.test(selected) || /--admin-surface/.test(selected), 'index.css .admin-carte.is-selected utilise --admin-*')
check(!/--c-primary/.test(selected) && !/--c-surface/.test(selected), 'index.css sélection sans --c-primary/--c-surface')

check(
  /\[data-admin-shell\]\s+\.admin-carte\s*\{[^}]*--admin-surface/s.test(consoleCss)
    || /\[data-admin-shell\] \.admin-carte \{[\s\S]*?--admin-surface/.test(consoleCss),
  'console.css filet Clair [data-admin-shell] .admin-carte → --admin-surface',
)

if (failures.length) {
  console.log(`\n❌ ${failures.length} contrôle(s)`)
  process.exit(1)
}
console.log('\n✅ Chrome Atelier découplé du thème site (--c-*).')
