/**
 * Géométrie de l’aperçu CMS (cadre Bureau / Téléphone).
 *
 * L’iframe a la largeur RÉELLE de l’appareil, puis on réduit à l’échelle
 * pour tenir dans la colonne. Sa hauteur interne est celle du « verre »
 * (la scène visible), pas celle du document : ainsi `100vh` dans l’iframe
 * désigne l’écran d’aperçu, sans étirer une page de fond crème.
 *
 * Pur : testable sans DOM (`scripts/test-preview-geometry.mjs`).
 */

export function estNoeudDansIframe(
  noeud: { ownerDocument: Document } | null,
  documentHote: Document,
): boolean {
  return noeud != null && noeud.ownerDocument !== documentHote
}

export function echelleCadreApercu(
  largeurScene: number,
  largeurCadre: number,
  marge = 16,
): number {
  if (largeurCadre <= 0) return 1
  const utile = Math.max(1, largeurScene - marge)
  return Math.min(1, utile / largeurCadre)
}

export function hauteurVerreApercu(hauteurScene: number, scale: number): number {
  if (hauteurScene <= 0 || scale <= 0) return 1
  return Math.max(1, hauteurScene / scale)
}
