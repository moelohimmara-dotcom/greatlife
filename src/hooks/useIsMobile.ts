import { useState, useEffect } from 'react'

/** `view` : fenêtre de l’élément (iframe aperçu), sinon la fenêtre parente. */
export function useIsMobile(view?: Window | null) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    const win = view ?? window
    try {
      return win.matchMedia('(max-width: 768px)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    const win = view ?? window
    const mq = win.matchMedia('(max-width: 768px)')
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [view])
  return isMobile
}
