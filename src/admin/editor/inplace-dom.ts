/**
 * Caret et lecture DOM pour l’édition in-place dans l’iframe aperçu.
 */
export function offsetCaret(el: HTMLElement): number {
  const doc = el.ownerDocument
  const sel = doc.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0)
  const pre = range.cloneRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

export function poserCaret(el: HTMLElement, offset: number): void {
  const doc = el.ownerDocument
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let left = Math.max(0, offset)
  let node: Node | null = walker.nextNode()
  while (node) {
    const len = node.textContent?.length ?? 0
    if (left <= len) {
      const r = doc.createRange()
      r.setStart(node, left)
      r.collapse(true)
      const sel = doc.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
      return
    }
    left -= len
    node = walker.nextNode()
  }
  const r = doc.createRange()
  r.selectNodeContents(el)
  r.collapse(false)
  const sel = doc.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(r)
}

export function caretDepuisPoint(doc: Document, x: number, y: number): Range | null {
  const avecPos = doc as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  if (typeof avecPos.caretRangeFromPoint === 'function') {
    return avecPos.caretRangeFromPoint(x, y)
  }
  const pos = avecPos.caretPositionFromPoint?.(x, y)
  if (!pos) return null
  const r = doc.createRange()
  r.setStart(pos.offsetNode, pos.offset)
  r.collapse(true)
  return r
}

export type CibleApercu = {
  doc: Document
  root: HTMLElement
  profile: 'inline' | 'rich' | 'plain'
}

export function slotContientWidget(el: HTMLElement): boolean {
  return Boolean(el.querySelector('svg, img, video, button, input, textarea'))
}

function restaurerRange(root: HTMLElement, rangeSauve: Range | null): Range | null {
  const doc = root.ownerDocument
  const sel = doc.getSelection()
  if (rangeSauve && sel) {
    try {
      sel.removeAllRanges()
      sel.addRange(rangeSauve)
    } catch {
      /* range devenu invalide */
    }
  }
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null
  return range
}

/** Entoure la sélection (gras, couleur, mark) — pas d’`execCommand`. */
export function wrapSelection(
  root: HTMLElement,
  fabrique: () => HTMLElement,
  rangeSauve: Range | null,
): boolean {
  const doc = root.ownerDocument
  const range = restaurerRange(root, rangeSauve)
  const sel = doc.getSelection()
  if (!range || !sel || range.collapsed) return false
  const wrap = fabrique()
  try {
    range.surroundContents(wrap)
  } catch {
    wrap.appendChild(range.extractContents())
    range.insertNode(wrap)
  }
  sel.removeAllRanges()
  const next = doc.createRange()
  next.selectNodeContents(wrap)
  sel.addRange(next)
  return true
}

/** Insère un fragment HTML déjà sanitizé à la place de la sélection. */
export function insertNode(
  root: HTMLElement,
  html: string,
  rangeSauve: Range | null,
): boolean {
  const doc = root.ownerDocument
  const range = restaurerRange(root, rangeSauve)
  const wrap = doc.createElement('template')
  wrap.innerHTML = html
  const frag = wrap.content
  if (!frag.firstChild) {
    const texte = doc.createTextNode(html)
    if (range) {
      range.deleteContents()
      range.insertNode(texte)
    } else {
      root.appendChild(texte)
    }
    return true
  }
  const last = frag.lastChild
  if (range) {
    range.deleteContents()
    range.insertNode(frag)
  } else {
    root.appendChild(frag)
  }
  if (last) {
    const next = doc.createRange()
    next.setStartAfter(last)
    next.collapse(true)
    const sel = doc.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(next)
  }
  return true
}
