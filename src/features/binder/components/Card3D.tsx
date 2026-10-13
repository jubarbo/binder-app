import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

/* Physical rocking: a lightly underdamped spring (zeta ~0.50) makes the card
   chase the cursor with lag and swing twice when settling or returning, like
   a real card being handled. */
const ROCK_SPRING = { stiffness: 150, damping: 11, mass: 0.8 } as const
/* Lift-off ease: slightly overdamped, one gentle overshoot when un-hovering. */
const LIFT_SPRING = { stiffness: 220, damping: 20, mass: 1 } as const
const LIFT_SCALE = 1.07
/* Pointer-to-rotation gain: without it a grid card only reaches a third of
   the tilt range, which reads timid. */
const POINTER_GAIN = 0.85

interface Card3DProps {
  entry: BinderEntry
  printing: Printing
  alt: string
  hasSmall: boolean
  hasNormal: boolean
  normalLoaded: boolean
  setNormalLoaded: (loaded: boolean) => void
  quantityBadge?: React.ReactNode
  /** Opens the detail for this card; receives the card element for geometry. */
  onOpenDetail?: (element: HTMLDivElement) => void
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
  onOpenDetail,
}: Card3DProps) {
  const prefersReducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const hovered = useMotionValue(0)

  // Chased values: the rock spring trails the pointer and keeps swinging
  // briefly, producing the physical balance instead of a rigid follow.
  const rockX = useSpring(x, ROCK_SPRING)
  const rockY = useSpring(y, ROCK_SPRING)
  const scale = useSpring(hovered, LIFT_SPRING)

  const rotateX = useTransform(rockY, [-100, 100], [11, -11])
  const rotateY = useTransform(rockX, [-100, 100], [-11, 11])
  const rotateZ = useTransform(rockX, [-100, 100], [-5, 5])
  const glareX = useTransform(rockX, [-100, 100], [100, 0])
  const glareY = useTransform(rockY, [-100, 100], [100, 0])
  const animatedScale = useTransform(scale, (value) => 1 + (LIFT_SCALE - 1) * value)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const px = e.clientX - centerX
    const py = e.clientY - centerY
    x.set(px * POINTER_GAIN)
    y.set(py * POINTER_GAIN)
  }

  const handleMouseEnter = () => {
    if (prefersReducedMotion) return
    hovered.set(1)
  }

  const handleMouseLeave = () => {
    if (prefersReducedMotion) return
    hovered.set(0)
    x.set(0)
    y.set(0)
  }

  const openDetail = () => {
    if (ref.current) onOpenDetail?.(ref.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetail()
    }
  }

  const imageProps = {
    alt,
    loading: 'lazy' as const,
    draggable: false,
  }

  return (
    <motion.div
      ref={ref}
      className={`card-slot card-slot--ready${entry.quantity > 1 ? ' card-slot--stacked' : ''}`}
      style={
        prefersReducedMotion
          ? undefined
          : {
              rotateX,
              rotateY,
              rotateZ,
              scale: animatedScale,
              transformStyle: 'preserve-3d',
            }
      }
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Carta ${alt}, ver detalle`}
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
          !hasSmall && <span className="card-slot-error-mark">Sin imagen</span>
        )}
      </span>
      {quantityBadge}
    </motion.div>
  )
}
