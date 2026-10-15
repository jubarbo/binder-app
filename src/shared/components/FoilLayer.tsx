import { motion } from 'motion/react'
import type { MotionValue } from 'motion/react'

interface FoilLayerProps {
  /** Pointer offsets from `useCardRock`; omit them on a surface that does not rock. */
  x?: MotionValue<string>
  y?: MotionValue<string>
}

/**
 * The holographic sweep shared by every card surface (grid, detail, zoom): an
 * oversized rainbow gradient screened over the art, split into two layers so
 * the band's keyframes never replace the pointer transform on the outer one,
 * and both stay composited instead of repainting the card each frame.
 *
 * Decorative only: hidden from assistive tech, never hit-tested, and always
 * mounted inside a box that clips to the image — otherwise the band, which is
 * deliberately larger than the card, paints past its edge. Reduced motion
 * drops the sweep (CSS media query), never the layer itself, so a foil copy
 * still reads as foil standing still.
 */
export default function FoilLayer({ x, y }: FoilLayerProps) {
  return (
    <motion.div className="card-foil" style={{ x, y }} aria-hidden="true">
      {/* Owns the gradient and the sweep, so its keyframes never replace the
          pointer transform motion writes on the parent above. */}
      <div className="card-foil-band" />
    </motion.div>
  )
}
