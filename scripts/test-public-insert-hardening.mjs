/**
 * Greatlife — assertions REST INSERT après migration 039
 * =====================================================
 * Vérifie sans auth JWT (clé anon), SANS `.select()` (pas de SELECT public) :
 *   1. message trop long → refusé
 *   2. message borné → accepté
 *   3. réservation status != pending → refusée
 *   4. réservation pending → acceptée
 *   5. commande article inconnu → refusée (trigger)
 *   6. commande prix inventé → acceptée ; total recalculé (lu via Management API)
 *
 * Usage : node scripts/test-public-insert-hardening.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENV = {}
for (const line of readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
  if (line.includes('=') && !line.startsWith('#')) {
    const i = line.indexOf('=')
    ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}

const url = ENV.VITE_SUPABASE_URL
const anon = ENV.VITE_SUPABASE_ANON_KEY
const projectRef = ENV.NEW_PROJECT_REF || 'atsujzoozqnjelngqkab'
const mgmtToken = ENV.SUPABASE_ACCESS_TOKEN
if (!url || !anon) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants')
  process.exit(2)
}

const sb = createClient(url, anon)
const failures = []
function check(ok, label, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

async function sql(query) {
  if (!mgmtToken) throw new Error('SUPABASE_ACCESS_TOKEN manquant pour lire le résultat commande')
  const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`SQL ${r.status}: ${t.slice(0, 200)}`)
  return JSON.parse(t)
}

const stamp = Date.now()
const probeEmail = `probe-039-${stamp}@example.com`
const orderRef = `P039-${stamp}-OK`

console.log('1. messages — message trop long')
{
  const { error } = await sb.from('messages').insert({
    nom: 'Probe',
    email: probeEmail,
    sujet: 'contact',
    message: 'x'.repeat(6000),
    handled: false,
  })
  check(!!error, 'refus message > 5000', error?.code || error?.message || 'pas d’erreur')
}

console.log('2. messages — insert borné OK')
{
  const { error } = await sb.from('messages').insert({
    nom: 'Probe',
    email: probeEmail,
    sujet: 'contact',
    message: 'Message de contrôle durcissement 039',
    handled: false,
  })
  check(!error, 'insert message valide', error?.message)
}

console.log('3. reservations — status confirmed refusé')
{
  const { error } = await sb.from('reservations').insert({
    nom: 'Probe',
    email: probeEmail,
    phone: '620000000',
    date: '2099-01-01',
    time: '12:00',
    guests: 2,
    message: '',
    status: 'confirmed',
  })
  check(!!error, 'refus réservation status confirmed', error?.code || error?.message || 'pas d’erreur')
}

console.log('4. reservations — pending OK')
{
  const { error } = await sb.from('reservations').insert({
    nom: 'Probe',
    email: probeEmail,
    phone: '620000000',
    date: '2099-01-02',
    time: '12:00',
    guests: 2,
    message: 'probe',
    status: 'pending',
  })
  check(!error, 'insert réservation pending', error?.message)
}

console.log('5. orders — article inconnu refusé')
{
  const { error } = await sb.from('orders').insert({
    ref: `P039-${stamp}-X`,
    nom: 'Probe',
    email: probeEmail,
    phone: '',
    items: [{ name: 'Plat Inexistant XYZ', price: '1', qty: 1 }],
    total: '1',
    pickup_time: '12:00',
    notes: '',
    status: 'pending',
  })
  check(!!error, 'refus commande article inconnu', error?.message?.slice(0, 80) || 'pas d’erreur')
}

console.log('6. orders — prix client écrasé par le catalogue')
{
  const { data: menu } = await sb.from('menu_items').select('name, price').limit(1).maybeSingle()
  if (!menu?.name) {
    check(false, 'menu_items lisible pour le test', 'aucune ligne')
  } else {
    const { error } = await sb.from('orders').insert({
      ref: orderRef,
      nom: 'Probe',
      email: probeEmail,
      phone: '',
      items: [{ name: menu.name, price: '1', qty: 2 }],
      total: '0',
      pickup_time: '12:00',
      notes: 'probe-039-cleanup',
      status: 'pending',
    })
    check(!error, 'insert commande connue', error?.message)

    if (!error && mgmtToken) {
      const rows = await sql(
        `SELECT total, items FROM orders WHERE ref = '${orderRef.replace(/'/g, "''")}' LIMIT 1`,
      )
      const row = Array.isArray(rows) ? rows[0] : rows
      const digits = (s) => String(s ?? '').replace(/\D/g, '')
      const expectedUnit = digits(menu.price)
      const expectedTotal = String(Number(expectedUnit) * 2)
      const gotTotal = digits(row?.total)
      const gotPrice = digits(row?.items?.[0]?.price)
      check(gotTotal === expectedTotal, 'total recalculé', `attendu ${expectedTotal}, reçu ${row?.total}`)
      check(gotPrice === expectedUnit, 'prix ligne catalogue', `attendu ${menu.price}, reçu ${row?.items?.[0]?.price}`)
    } else if (!mgmtToken) {
      console.log('  · total/prix non relus (SUPABASE_ACCESS_TOKEN absent)')
    }
  }
}

const outDir = `${ROOT}/scripts/.work`
mkdirSync(outDir, { recursive: true })
writeFileSync(`${outDir}/test-public-insert-hardening.json`, JSON.stringify({
  at: new Date().toISOString(),
  failures,
}, null, 2))

if (failures.length) {
  console.error(`\nÉCHEC — ${failures.length} contrôle(s)`)
  process.exit(1)
}
console.log('\nOK — durcissement INSERT public')
