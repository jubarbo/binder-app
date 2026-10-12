import { motion, useMotionValue, useTransform, useReducedMotion } from 'motion/react'
import { useState, useRef } from 'react'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

interface Card3DProps {
  entry: BinderEntry
  printing: Printing
  alt: string
  hasSmall: boolean
  hasNormal: boolean
  normalLoaded: boolean
  setNormalLoaded: (loaded: boolean) => void
  quantityBadge?: React.ReactNode
}

export default function Card3D({
  entry,
  printing,
  alt,
  hasSmall,
  hasNormal,
  normalLoaded,
  setNormalLoaded,
  quantityBadge,
}: Card3DProps) {
  const prefersReducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-100, 100], [8, -8])
  const rotateY = useTransform(x, [-100, 100], [-8, 8])
  const glareX = useTransform(x, [-100, 100], [100, 0])
  const glareY = useTransform(y, [-100, 100], [100, 0])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const px = e.clientX - centerX
    const py = e.clientY - centerY
    x.set(px * 0.5)
    y.set(py * 0.5)
  }

  const handleMouseLeave = () => {
    if (prefersReducedMotion) return
    x.set(0)
    y.set(0)
  }

  const imageProps = {
    alt,
    loading: 'lazy' as const,
    draggable: false,
  }

  return (
    <motion.div
      ref={ref}
      className={`card-slot card-slot--ready${entry.quantity > 1 ? ' card-slot--stacked' : ''} ${isZoomed ? 'card-slot--zoomed' : ''}`}
      style={
        prefersReducedMotion
          ? undefined
          : {
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
              perspective: 1000,
            }
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsZoomed((z) => !z)}
      role="button"
      tabIndex={0}
      aria-pressed={isZoomed}
      aria-label={`Card ${alt}${isZoomed ? ', zoomed' : ', click to zoom'}`}
    >
      <span className="card-image-frame">
        {hasSmall && (
          <img
            className="card-image card-image--placeholder"
            src={printing.imageSmall}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        )}
        {hasNormal ? (
          <>
            <img
              className="card-image card-image--full"
              src={printing.imageNormal}
              {...imageProps}
              data-loaded={normalLoaded || !hasSmall}
              onLoad={() => setNormalLoaded(true)}
            />
            {!prefersReducedMotion && (
              <motion.div
                className="card-glare"
                style={{
                  background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%)`,
                }}
              />
            )}
          </>
        ) : (
          !hasSmall && <span className="card-slot-error-mark">No image</span>
        )}
      </span>
      {quantityBadge}
      {isZoomed && (
        <div className="card-zoom-overlay" onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }} role="dialog" aria-label="Card zoom">
          <img src={printing.imageNormal || printing.imageSmall} alt={alt} />
        </div>
      )}
    </motion.div>
  )
}
