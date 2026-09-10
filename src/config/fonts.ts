export interface FontPair {
  id: string
  label: string
  heading: string
  body: string
}

export const FONTS: Record<string, FontPair> = {
  fraunces: { id: 'fraunces', label: 'Fraunces + DM Sans', heading: "'Fraunces', Georgia, serif", body: "'DM Sans', sans-serif" },
  playfair: { id: 'playfair', label: 'Playfair + Inter', heading: "'Playfair Display', Georgia, serif", body: "'Inter', sans-serif" },
  jakarta: { id: 'jakarta', label: 'Plus Jakarta + DM Sans', heading: "'Plus Jakarta Sans', sans-serif", body: "'DM Sans', sans-serif" },
}
