import { useRef } from 'react'
import type { MouseEvent } from 'react'
import {
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'motion/react'

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

/**
 * Shared rocking-card physics (binder grid + wants preview): cursor-chasing
 * 3D tilt on damped springs, lift-off scale and a pointer-following glare.
 * The consumer owns its DOM (classes, children, activation semantics) and
 * spreads the returned handlers plus `style` onto a `motion.div`. The raw
 * `rockX`/`rockY` offsets and `prefersReducedMotion` are exposed so a consumer
 * can attach its own pointer-linked overlay (the foil band) to the same truth.
 *
 * Under `prefers-reduced-motion` the style and glare are absent and the
 * handlers no-op, so the card stays fully static.
 */
export function useCardRock() {
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
  const animatedScale = useTransform(
    scale,
    (value) => 1 + (LIFT_SCALE - 1) * value,
  )

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * POINTER_GAIN)
    y.set((e.clientY - centerY) * POINTER_GAIN)
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

  const style = prefersReducedMotion
    ? undefined
    : ({
        rotateX,
        rotateY,
        rotateZ,
        scale: animatedScale,
        transformStyle: 'preserve-3d',
      } as const)

  const glareStyle = prefersReducedMotion
    ? null
    : `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%)`

  return {
    ref,
    style,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    glareStyle,
    // Raw pointer offsets, plus the motion preference, so a consumer can drive
    // its own pointer-linked layers (e.g. the foil band) from the same truth
    // instead of adding a second listener and a second rect measurement.
    rockX,
    rockY,
    prefersReducedMotion,
  }
}
