import { useEffect, useState } from 'react'

/* One turn (front <-> back) every 3s. Hovering the card pauses this timer so
   the face on screen holds still long enough to read. */
const FLIP_INTERVAL_MS = 3000

/**
 * The current outward face of an auto-flipping double-faced card, in degrees
 * of `rotateY`: 0 (front) or 180 (back).
 *
 * Flipping is driven by a plain timer that alternates between the two faces
 * rather than a looping keyframe animation, because a timer can simply stop
 * scheduling while `paused` (pointer over the card) and pick up a full
 * interval after it leaves — no mid-cycle snap when the flip resumes.
 *
 * `enabled` turns flipping off entirely (single-faced card or reduced motion),
 * and the hook stays on the front face in that case.
 */
export function useFlipFace(enabled: boolean, paused: boolean) {
  const [face, setFace] = useState<0 | 180>(0)

  useEffect(() => {
    if (!enabled || paused) return
    const id = setTimeout(() => {
      setFace((current) => (current === 0 ? 180 : 0))
    }, FLIP_INTERVAL_MS)
    return () => clearTimeout(id)
  }, [enabled, paused, face])

  return face
}
