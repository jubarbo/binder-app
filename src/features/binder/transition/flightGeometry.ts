import type { CardFlightRect } from '@/features/binder/transition/flightStore'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export interface FlightGeometry {
  /** Center-to-center translation from the pocket to the viewport center. */
  x: number
  y: number
  /** Final rendered size, fitted to the viewport and keeping the card ratio. */
  endWidth: number
  endHeight: number
  /** Directional tilts derived from where the card starts relative to center. */
  rotateY: number
  rotateZ: number
}

/**
 * Pure geometry for the card flight: adapts the end scale and the tilt
 * directions to the viewport and to the card's real starting position, so
 * cards near edges or on small screens land centered and fully visible.
 */
export function computeFlightGeometry(start: CardFlightRect): FlightGeometry {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const aspect = start.width / Math.max(start.height, 1)
  // The card launches close to the user: it nearly fills the viewport height
  // at the end of the fly, fitted so it never clips on any screen.
  const endHeight = Math.min(
    viewportHeight * 0.94,
    viewportWidth * 0.9 * (1 / Math.max(aspect, 0.01)),
  )
  const endWidth = endHeight * aspect
  const startCenterX = start.left + start.width / 2
  const startCenterY = start.top + start.height / 2
  const x = viewportWidth / 2 - startCenterX
  const y = viewportHeight / 2 - startCenterY
  // Cards arriving from the left tilt as if carried from that side; caps keep
  // the effect controlled on any viewport.
  const rotateY = clamp((x / viewportWidth) * 24, -12, 12)
  const rotateZ = clamp((-x / viewportWidth) * 8, -3, 3)
  return { x, y, endWidth, endHeight, rotateY, rotateZ }
}
