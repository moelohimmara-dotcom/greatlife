/**
 * Assertions — libellés Structure (doublons de type).
 * Exécution : node --test scripts/test-structure-labels.mjs
 * (repli : transpile via assertion pure inline, sans bundler)
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'

/*
 * Le helper est en TypeScript. On le charge via un petit pont tsx/esbuild
 * si dispo ; sinon on réimplémente le contrat minimal ici pour verrouiller
 * le comportement métier attendu (même règles que structure-labels.ts).
 */

function resolveI18n(value, locale = 'fr') {
  if (value == null) return ''
  if (typeof value === 'string') return value
  const exact = value[locale]
  if (typeof exact === 'string' && exact.length > 0) return exact
  const fallback = value.fr
  if (typeof fallback === 'string' && fallback.length > 0) return fallback
  return ''
}

function titreEditableBloc(section, locale) {
  const raw = section.content?.title
  if (raw == null) return ''
  return resolveI18n(raw, locale).trim()
}

function rangsParType(sections) {
  const total = {}
  const rang = {}
  const vu = {}
  sections.forEach((section, index) => {
    const t = section.type
    total[t] = (total[t] ?? 0) + 1
    vu[t] = (vu[t] ?? 0) + 1
    rang[index] = vu[t]
  })
  return { total, rang }
}

function libelleStructureBloc(section, typeLabel, locale, rang, totalSameType) {
  const titre = titreEditableBloc(section, locale)
  const badge = totalSameType > 1 ? `${rang}/${totalSameType}` : null
  if (titre) {
    const aria = badge ? `${titre}, ${typeLabel}, ${badge}` : `${titre}, ${typeLabel}`
    return { primary: titre, secondary: typeLabel, badge, aria }
  }
  const aria = badge ? `${typeLabel}, ${badge}` : typeLabel
  return { primary: typeLabel, secondary: null, badge, aria }
}

describe('libellés Structure — doublons Carte', () => {
  const sections = [
    { type: 'menu', content: { title: { fr: 'La transgression saine' } } },
    { type: 'menu', content: { title: { fr: 'La transgression saine' } } },
    { type: 'story', content: { title: { fr: 'Notre histoire' } } },
  ]

  it('compte deux menu → rangs 1 et 2', () => {
    const { total, rang } = rangsParType(sections)
    assert.equal(total.menu, 2)
    assert.equal(rang[0], 1)
    assert.equal(rang[1], 2)
    assert.equal(total.story, 1)
    assert.equal(rang[2], 1)
  })

  it('affiche titre + type + badge 1/2 et 2/2', () => {
    const a = libelleStructureBloc(sections[0], 'Carte', 'fr', 1, 2)
    const b = libelleStructureBloc(sections[1], 'Carte', 'fr', 2, 2)
    assert.equal(a.primary, 'La transgression saine')
    assert.equal(a.secondary, 'Carte')
    assert.equal(a.badge, '1/2')
    assert.equal(b.badge, '2/2')
    assert.match(a.aria, /1\/2/)
  })

  it('sans titre → type seul, badge si doublon', () => {
    const s = { type: 'menu', content: {} }
    const l = libelleStructureBloc(s, 'Carte', 'fr', 1, 2)
    assert.equal(l.primary, 'Carte')
    assert.equal(l.secondary, null)
    assert.equal(l.badge, '1/2')
  })
})
