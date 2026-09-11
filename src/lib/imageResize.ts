export interface ResizeResult {
  file: File
  width: number
  height: number
}

export const RESIZE_PRESETS: { id: string; label: string; max: number }[] = [
  { id: 'original', label: 'Original (pas de redimensionnement)', max: 0 },
  { id: 's512', label: 'Carré 512 px (logo / favicon)', max: 512 },
  { id: 's800', label: 'Moyen 800 px (photo produit)', max: 800 },
  { id: 's1600', label: 'Large 1600 px (fond de section)', max: 1600 },
  { id: 's1920', label: 'Hero 1920 px', max: 1920 },
]

export function isResizableImage(file: File): boolean {
  return file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml'
}

export async function resizeImageFile(
  file: File,
  maxWidth: number
): Promise<ResizeResult> {
  if (maxWidth <= 0) return { file, width: 0, height: 0 }
  const img = await loadImage(file)
  const scale = Math.min(1, maxWidth / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { file, width: img.naturalWidth, height: img.naturalHeight }
  ctx.drawImage(img, 0, 0, w, h)
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, type, 0.9))
  if (!blob) return { file, width: img.naturalWidth, height: img.naturalHeight }
  const outName = file.name.replace(/\.(png|jpe?g|webp)$/i, '') + (type === 'image/png' ? '.png' : '.jpg')
  const out = new File([blob], outName, { type })
  return { file: out, width: w, height: h }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}
