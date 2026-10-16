import { motion, useReducedMotion } from 'motion/react'
import type { Transition } from 'motion/react'
import type { ReactNode } from 'react'

/* Double-faced auto-flip cadence: rest on one face, turn, rest on the other.
   The turn eases in (slow start, fast finish) so the card winds up and snaps
   over, and each face is held ~1.4s for a turn roughly every 2s. The keyframes
   run 0 -> 0 -> 180 -> 180 -> 0 so the repeat lands back on the front with no
   visible jump. */
const FLIP_DURATION = 0.6
const FLIP_HOLD = 1.4
const FLIP_CYCLE = (FLIP_DURATION + FLIP_HOLD) * 2
const FLIP_KEYFRAMES = [0, 0, 180, 180, 0]
const FLIP_TRANSITION: Transition = {
  duration: FLIP_CYCLE,
  times: [
    0,
    FLIP_HOLD / FLIP_CYCLE,
    (FLIP_HOLD + FLIP_DURATION) / FLIP_CYCLE,
    (2 * FLIP_HOLD + FLIP_DURATION) / FLIP_CYCLE,
    1,
  ],
  repeat: Infinity,
  ease: 'easeIn',
}

interface CardFlipProps {
  /**
   * The back-face content. When absent — or under reduced motion — the
   * component renders the front (`children`) alone with no flip. Each face
   * receives full content (image plus any overlay), so effects like the foil
   * ride along and rotate with their own side instead of floating on top.
   */
  back?: ReactNode
  children: ReactNode
}

/**
 * Wraps a card's faces and, when back content is present, turns them in 3D to
 * reveal the back every couple of seconds. Reduced motion renders the front
 * only, like every other card surface in the app. The wrapper needs
 * `perspective` from its container; each context scopes its own sizing (the
 * grid is absolute-fill, the detail is content-sized).
 */
export default function CardFlip({ back, children }: CardFlipProps) {
  const prefersReducedMotion = useReducedMotion()
  const flipEnabled = back != null && !prefersReducedMotion

  if (!flipEnabled) return <>{children}</>

  return (
    <motion.div
      className="card-flip"
      animate={{ rotateY: FLIP_KEYFRAMES }}
      transition={FLIP_TRANSITION}
    >
      <span className="card-face card-face--front">{children}</span>
      <span className="card-face card-face--back">{back}</span>
    </motion.div>
  )
}
