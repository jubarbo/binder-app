import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useFlipFace } from '../hooks/useFlipFace'

/* The turn itself: eases in (slow start, fast finish) so the card winds up and
   snaps over, like the rocking card's handled feel. The rest between turns
   lives in useFlipFace (one turn every ~4s), which hovering can pause. */
const FLIP_TURN_DURATION = 0.6

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
 * reveal the back every few seconds. Hovering holds the current face still so
 * the card can be read; leaving resumes the flip. Reduced motion renders the
 * front only, like every other card surface in the app. The wrapper needs
 * `perspective` from its container; each context scopes its own sizing (the
 * grid is absolute-fill, the detail is content-sized).
 */
export default function CardFlip({ back, children }: CardFlipProps) {
  const prefersReducedMotion = useReducedMotion()
  const flipEnabled = back != null && !prefersReducedMotion
  const [paused, setPaused] = useState(false)
  const face = useFlipFace(flipEnabled, paused)

  if (!flipEnabled) return <>{children}</>

  return (
    <motion.div
      className="card-flip"
      animate={{ rotateY: face }}
      transition={{ duration: FLIP_TURN_DURATION, ease: 'easeIn' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="card-face card-face--front">{children}</span>
      <span className="card-face card-face--back">{back}</span>
    </motion.div>
  )
}
