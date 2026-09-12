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
  montserrat: { id: 'montserrat', label: 'Montserrat + Open Sans', heading: "'Montserrat', sans-serif", body: "'Open Sans', sans-serif" },
  poppins: { id: 'poppins', label: 'Poppins + Nunito', heading: "'Poppins', sans-serif", body: "'Nunito', sans-serif" },
  lora: { id: 'lora', label: 'Lora + Source Sans', heading: "'Lora', Georgia, serif", body: "'Source Sans 3', sans-serif" },
  merriweather: { id: 'merriweather', label: 'Merriweather + IBM Plex', heading: "'Merriweather', Georgia, serif", body: "'IBM Plex Sans', sans-serif" },
  space: { id: 'space', label: 'Space Grotesk + Inter', heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" },
  cormorant: { id: 'cormorant', label: 'Cormorant + Mulish', heading: "'Cormorant Garamond', Georgia, serif", body: "'Mulish', sans-serif" },
}
