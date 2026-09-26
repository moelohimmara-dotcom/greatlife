/**
 * Chaque entrée de navigation de la console a une icône UNIQUE :
 * deux sections ne partagent jamais la même (confusion du 2026-09-26).
 * Et chaque icône existe dans `@/lib/icons` (sinon la barre latérale casse).
 *
 * Usage : node --test scripts/test-nav-icons.mjs
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const routes = readFileSync(`${ROOT}/src/admin/routes.ts`, 'utf8')
const icons = readFileSync(`${ROOT}/src/lib/icons/index.tsx`, 'utf8')

function navIcons(src) {
  // NAV_GROUPS est le seul endroit avec des triplets [clé, libellé, icône].
  const entries = [...src.matchAll(/\['([a-zA-Z]+)', '[^']*', '([a-zA-Z]+)'\]/g)].map(
    ([, key, icon]) => ({ key, icon }),
  )
  if (entries.length === 0) throw new Error('NAV_GROUPS introuvable')
  return entries
}

function iconKeys(src) {
  return new Set(
    [...src.matchAll(/^ {2}([a-zA-Z]+): \(s/gm)].map((m) => m[1]),
  )
}

describe('icônes de navigation uniques', () => {
  it('aucune icône partagée entre deux sections', () => {
    const entries = navIcons(routes)
    assert.ok(entries.length >= 10, 'assez de sections lues')
    const seen = new Map()
    for (const { key, icon } of entries) {
      assert.ok(
        !seen.has(icon),
        `icône « ${icon} » partagée par « ${seen.get(icon)} » et « ${key} »`,
      )
      seen.set(icon, key)
    }
  })

  it('chaque icône existe dans la bibliothèque', () => {
    const known = iconKeys(icons)
    for (const { key, icon } of navIcons(routes)) {
      assert.ok(known.has(icon), `« ${key} » pointe vers une icône inconnue : ${icon}`)
    }
  })
})
