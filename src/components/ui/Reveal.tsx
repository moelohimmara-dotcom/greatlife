import React, { useRef, useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { estNoeudDansIframe } from '@/admin/editor/preview-geometry'

export function Reveal({ children, delay = 0, y = 28 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    /*
      L’aperçu CMS rend via createPortal DANS l’iframe, mais le composant
      s’exécute dans la fenêtre de la console. `window.self !== window.top`
      y est donc faux, et IntersectionObserver de la console ne voit pas
      (ou voit de travers) les nœuds de l’iframe — surtout avec un
      `transform: scale` sur l’iframe. Les cartes restent opacity: 0 tout
      en occupant leur hauteur : c’est le rectangle beige sous « Les visages ».
    */
    if (estNoeudDansIframe(el, document)) {
      setShown(true)
      return
    }
    if (reduceMotion) {
      setShown(true)
      return
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setShown(true); obs.disconnect() } })
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [reduceMotion])

  if (reduceMotion) {
    return <div ref={ref}>{children}</div>
  }

  return (
    <div ref={ref} style={{ overflow: shown ? undefined : 'hidden' }}>
      <motion.div
        initial={shown ? false : { opacity: 0, y }}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}
