import manifest from '@/../public/produits-manifest.json'

const FILES: string[] = (manifest as unknown as string[]).filter(Boolean)

export interface ProductIllustration {
  slot: string
  url: string
  product: string
}

export function getProductIllustrations(): ProductIllustration[] {
  return FILES.map(f => ({
    slot: f,
    url: `/produits/${f}.jpg`,
    product: f.replace(/^produit-/, '').replace(/-/g, ' '),
  }))
}

export function hasProductIllustration(slot: string): boolean {
  return FILES.includes(slot)
}
