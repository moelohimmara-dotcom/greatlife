/**
 * TEST DES RÈGLES DE SOUS-BLOCS — noyau pur, aucune base, aucun React.
 *
 * Usage : node --test scripts/test-subblock-rules.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')

const entry = `${WORK}/subblock-rules.ts`
const outfile = `${WORK}/subblock-rules.cjs`
writeFileSync(entry, [
  "export * from '@/cms/model/subblocks/rules'",
].join('\n'), 'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(outfile)]
const {
  addSlotsToGroup,
  applyGroupModeClick,
  canGroup,
  canLock,
  canPatchSlot,
  canUngroup,
  canUseMarkup,
  groupSelection,
  lockGroup,
  markupProfileForField,
  readEditorMeta,
  selectClick,
  selectInGroupMode,
  showsGroupProperties,
  ungroup,
  unlock,
  EMPTY_SELECTION,
} = require(outfile)

const content = () => ({ title: { fr: 'A' }, tagline: { fr: 'B' }, subtitle: { fr: 'C' } })

test('R1 un emplacement n’appartient qu’à un groupe', () => {
  let data = groupSelection(content(), ['title', 'tagline'], { id: 'g1' })
  data = groupSelection(data, ['title', 'subtitle'], { id: 'g2' })
  const meta = readEditorMeta(data)
  assert.equal(meta.groups.length, 1)
  assert.deepEqual(meta.groups[0].slots, ['title', 'tagline'])
  assert.equal(canGroup(data, ['title', 'subtitle']).ok, false)
})

test('R2 on ne groupe que des emplacements du même content (même section)', () => {
  const ok = canGroup(content(), ['title', 'tagline'], 'page')
  assert.equal(ok.ok, true)
})

test('R3 verrou de groupe bloque le patch des membres', () => {
  let data = groupSelection(content(), ['title', 'tagline'], { id: 'g1' })
  assert.equal(canPatchSlot(data, 'title'), true)
  data = lockGroup(data, 'g1', 'members')
  assert.equal(canPatchSlot(data, 'title'), false)
  assert.equal(canPatchSlot(data, 'tagline'), false)
  assert.equal(canPatchSlot(data, 'subtitle'), true)
  data = lockGroup(data, 'g1', 'group')
  assert.equal(canPatchSlot(data, 'titleColor'), false, 'la couleur du titre suit le verrou')
})

test('R4 dégrouper interdit tant que lock === group', () => {
  let data = groupSelection(content(), ['title', 'tagline'], { id: 'g1' })
  data = lockGroup(data, 'g1', 'group')
  assert.equal(canUngroup(data, 'g1').ok, false)
  assert.equal(canUngroup(data, 'g1').reason, 'locked')
  const still = ungroup(data, 'g1')
  assert.equal(readEditorMeta(still).groups.length, 1)
  data = unlock(data, 'g1')
  assert.equal(canUngroup(data, 'g1').ok, true)
  assert.equal(readEditorMeta(ungroup(data, 'g1')).groups.length, 0)
})

test('R5 clic élément, Shift étend, Ctrl bascule, propriétés de groupe', () => {
  const a = selectClick(EMPTY_SELECTION, {
    surface: 'page', sectionId: 's1', slot: 'title', shift: false,
  })
  assert.deepEqual(a.slots, ['title'])
  const b = selectClick(a, {
    surface: 'page', sectionId: 's1', slot: 'tagline', shift: true,
  })
  assert.deepEqual(b.slots, ['title', 'tagline'])
  assert.equal(showsGroupProperties(b), true)
  const b2 = selectClick(b, {
    surface: 'page', sectionId: 's1', slot: 'subtitle', toggle: true, shift: false,
  })
  assert.deepEqual(b2.slots, ['title', 'tagline', 'subtitle'])
  const c = selectClick(b, {
    surface: 'page', sectionId: 's2', slot: 'title', shift: true,
  })
  assert.deepEqual(c.slots, ['title'])
  assert.equal(c.sectionId, 's2')
  const g = selectClick(EMPTY_SELECTION, {
    surface: 'page', sectionId: 's1', slot: null, groupId: 'g1', shift: false,
  })
  assert.equal(g.groupId, 'g1')
  assert.equal(showsGroupProperties(g), true)
})

test('R7 pas de groupes chrome ni cross header/footer', () => {
  assert.equal(canGroup(content(), ['logo', 'slogan'], 'header').ok, false)
  const sel = selectClick(
    { surface: 'page', sectionId: 's1', slots: ['title'], groupId: null },
    { surface: 'footer', sectionId: null, slot: 'address', shift: true },
  )
  assert.equal(sel.surface, 'footer')
  assert.deepEqual(sel.slots, ['address'])
})

test('R8 _editor est de la métadonnée, pas du contenu public', () => {
  const data = groupSelection(content(), ['title', 'tagline'], { id: 'g1', label: 'Ouverture' })
  assert.ok(data._editor)
  assert.equal(data.title.fr, 'A', 'le contenu métier reste lisible')
})

test('R9 pas de groupe vide ; singleton = no-op', () => {
  const data = groupSelection(content(), ['title'], { id: 'g1' })
  assert.equal(readEditorMeta(data).groups.length, 0)
  assert.equal(canGroup(content(), ['title']).reason, 'need-two')
})

test('R10 / R12 profil inline vs rich', () => {
  assert.equal(markupProfileForField({ name: 'title', label: 'Titre', type: 'text', inlineMarkup: true }), 'inline')
  assert.equal(markupProfileForField({ name: 'body', label: 'Récit', type: 'multiline', inlineMarkup: true }), 'rich')
  assert.equal(markupProfileForField({ name: 'title', label: 'Titre', type: 'text' }), 'none')
})

test('R11 traitement de texte désactivé si verrou', () => {
  let data = groupSelection(content(), ['title', 'tagline'], { id: 'g1' })
  data = lockGroup(data, 'g1', 'group')
  const field = { name: 'title', label: 'Titre', type: 'text', inlineMarkup: true }
  assert.equal(canUseMarkup(data, 'title', field), false)
  assert.equal(canUseMarkup(content(), 'title', field), true)
})

test('canLock : groupe existant, pas déjà bloqué', () => {
  const vide = content()
  assert.equal(canLock(vide, 'g1').ok, false)
  assert.equal(canLock(vide, 'g1').reason, 'missing')
  let data = groupSelection(vide, ['title', 'tagline'], { id: 'g1' })
  assert.equal(canLock(data, 'g1').ok, true)
  data = lockGroup(data, 'g1', 'group')
  assert.equal(canLock(data, 'g1').ok, false)
  assert.equal(canLock(data, 'g1').reason, 'locked')
})

test('mode Grouper : deux clics créent le groupe sans Maj', () => {
  const first = applyGroupModeClick(
    content(),
    EMPTY_SELECTION,
    { surface: 'page', sectionId: 's1', slot: 'title', shift: false },
  )
  assert.equal(readEditorMeta(first.content).groups.length, 0)
  assert.deepEqual(first.selection.slots, ['title'])
  const second = applyGroupModeClick(
    first.content,
    first.selection,
    { surface: 'page', sectionId: 's1', slot: 'tagline', shift: false },
  )
  const meta = readEditorMeta(second.content)
  assert.equal(meta.groups.length, 1)
  assert.deepEqual(meta.groups[0].slots, ['title', 'tagline'])
  assert.equal(second.selection.groupId, meta.groups[0].id)
})

test('mode Grouper : clic suivant ajoute au groupe (même bloc)', () => {
  const two = applyGroupModeClick(
    applyGroupModeClick(
      content(),
      EMPTY_SELECTION,
      { surface: 'page', sectionId: 's1', slot: 'title', shift: false },
    ).content,
    { surface: 'page', sectionId: 's1', slots: ['title'], groupId: null },
    { surface: 'page', sectionId: 's1', slot: 'tagline', shift: false },
  )
  const three = applyGroupModeClick(
    two.content,
    two.selection,
    { surface: 'page', sectionId: 's1', slot: 'subtitle', shift: false },
  )
  assert.deepEqual(readEditorMeta(three.content).groups[0].slots, ['title', 'tagline', 'subtitle'])
})

test('selectInGroupMode accumule sans Maj ; autre bloc recommence', () => {
  const a = selectInGroupMode(EMPTY_SELECTION, {
    surface: 'page', sectionId: 's1', slot: 'title', shift: false,
  })
  const b = selectInGroupMode(a, {
    surface: 'page', sectionId: 's1', slot: 'tagline', shift: false,
  })
  assert.deepEqual(b.slots, ['title', 'tagline'])
  const c = selectInGroupMode(b, {
    surface: 'page', sectionId: 's2', slot: 'title', shift: false,
  })
  assert.deepEqual(c.slots, ['title'])
  assert.equal(c.sectionId, 's2')
})

test('R1 addSlotsToGroup refuse un emplacement déjà dans un autre groupe', () => {
  let data = groupSelection(
    { title: { fr: 'A' }, tagline: { fr: 'B' }, subtitle: { fr: 'C' }, body: { fr: 'D' } },
    ['title', 'tagline'],
    { id: 'g1' },
  )
  data = groupSelection(data, ['subtitle', 'body'], { id: 'g2' })
  const blocked = addSlotsToGroup(data, 'g1', ['subtitle'])
  assert.deepEqual(readEditorMeta(blocked).groups[0].slots, ['title', 'tagline'])
})
