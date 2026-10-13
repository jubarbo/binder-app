import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import type { Easing } from 'motion/react'
import type { CardFlight } from '@/features/binder/transition/flightStore'
import {
  FLIGHT_CARD_FADE_MS,
  FLIGHT_FLY_MS,
  FLIGHT_LIFT_MS,
  FLIGHT_REVEAL_MS,
  FLIGHT_TOTAL_MS,
  NAVIGATE_AT_MS,
  useFlightStore,
} from '@/features/binder/transition/flightStore'
import { computeFlightGeometry } from '@/features/binder/transition/flightGeometry'

const TOTAL_S = FLIGHT_TOTAL_MS / 1000
/** Normalized keyframe times over the whole sequence. */
const LIFT_END = FLIGHT_LIFT_MS / FLIGHT_TOTAL_MS
const FLY_END = (FLIGHT_LIFT_MS + FLIGHT_FLY_MS) / FLIGHT_TOTAL_MS
const CARD_FADE_START = (NAVIGATE_AT_MS - FLIGHT_CARD_FADE_MS) / FLIGHT_TOTAL_MS
const NAVIGATE_AT = NAVIGATE_AT_MS / FLIGHT_TOTAL_MS
/** The black starts dissolving exactly when the route swap lands. */
const REVEAL_START = (FLIGHT_TOTAL_MS - FLIGHT_REVEAL_MS) / FLIGHT_TOTAL_MS

interface CardFlightVisualProps {
  flight: CardFlight
}

/** The launched card: fixed at the pocket's rect, flying toward the user. */
function CardFlightVisual({ flight }: CardFlightVisualProps) {
  // A carried-over sharp image was already painted in the grid (browser
  // cache), so it starts visible: no crossfade can flash mid-flight.
  const [normalLoaded, setNormalLoaded] = useState(flight.imageNormal !== '')
  const geometry = computeFlightGeometry(flight.start)
  const endScale = geometry.endWidth / Math.max(flight.start.width, 1)
  const moveTimes = [0, LIFT_END, FLY_END, 1]
  // Natural accel/decel: ease out of the pocket, long controlled flight, settle.
  const moveEases: Easing[] = ['easeOut', [0.3, 0.7, 0.25, 1], 'easeIn']

  return (
    <div className="card-flight-perspective">
      <motion.div
        className="card-flight-card"
        style={{ left: flight.start.left, top: flight.start.top, width: flight.start.width, height: flight.start.height }}
        initial={{ x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 }}
        animate={{
          x: [0, 0, geometry.x, geometry.x],
          y: [0, 0, geometry.y, geometry.y],
          scale: [1, 1.06, endScale, endScale],
          rotateX: [0, -5, 0, 0],
          rotateY: [0, geometry.rotateY, geometry.rotateY * 0.25, 0],
          rotateZ: [0, 0, geometry.rotateZ, 0],
          // Dissolves under the rising black before the route swap. The final
          // 0 is repeated through the end time so the card can never reappear
          // between the swap and the sequence teardown.
          opacity: [1, 1, 0, 0],
          boxShadow: [
            '0 4px 12px rgba(0, 0, 0, 0.25)',
            '0 16px 36px rgba(0, 0, 0, 0.45)',
            '0 40px 90px rgba(0, 0, 0, 0.55)',
            '0 40px 90px rgba(0, 0, 0, 0)',
          ],
        }}
        transition={{
          duration: TOTAL_S,
          x: { times: moveTimes, ease: moveEases },
          y: { times: moveTimes, ease: moveEases },
          scale: { times: moveTimes, ease: moveEases },
          rotateX: { times: moveTimes, ease: moveEases },
          rotateY: { times: moveTimes, ease: moveEases },
          rotateZ: { times: [0, LIFT_END, (LIFT_END + FLY_END) / 2, 1], ease: moveEases },
          opacity: { times: [0, CARD_FADE_START, NAVIGATE_AT, 1], ease: 'easeIn' },
          boxShadow: { times: moveTimes, ease: 'easeOut' },
        }}
      >
        <img className="card-flight-img" src={flight.imageSmall} alt="" aria-hidden="true" draggable={false} />
        {flight.imageNormal !== '' && (
          <img
            className="card-flight-img card-flight-img--full"
            src={flight.imageNormal}
            alt=""
            aria-hidden="true"
            draggable={false}
            data-loaded={normalLoaded}
            onLoad={() => setNormalLoaded(true)}
          />
        )}
      </motion.div>
    </div>
  )
}

/**
 * Viewport-anchored transition layer for the card flight, mounted once from
 * `AppLayout` so it outlives route changes. It orchestrates the cinematic
 * sequence: the card launches toward the user, the scene sinks to near-black,
 * the route swap happens hidden under the black, and the black dissolves over
 * the new page. Purely decorative except for that single scheduled swap: it
 * is `aria-hidden`, never accepts pointer events, cancels the swap if the
 * user navigates on their own, and clears all transient state at the end.
 */
export default function CardFlightOverlay() {
  const flight = useFlightStore((state) => state.flight)
  const clearFlight = useFlightStore((state) => state.clearFlight)
  const prefersReducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const location = useLocation()
  const locationKeyRef = useRef(location.key)
  useEffect(() => {
    locationKeyRef.current = location.key
  }, [location.key])

  useEffect(() => clearFlight, [clearFlight])
  useEffect(() => {
    if (flight !== null && prefersReducedMotion) clearFlight()
  }, [flight, prefersReducedMotion, clearFlight])

  // Phase 3: the route swap, timed to land under full black. If the user
  // navigated on their own meanwhile (Back, nav link), the swap is skipped.
  useEffect(() => {
    if (flight === null || prefersReducedMotion) return
    const timer = window.setTimeout(() => {
      if (useFlightStore.getState().flight?.startedAt !== flight.startedAt) return
      if (locationKeyRef.current !== flight.locationKey) return
      navigate(`/card/${flight.entryId}`)
    }, NAVIGATE_AT_MS)
    return () => window.clearTimeout(timer)
  }, [flight, prefersReducedMotion, navigate])

  if (flight === null || prefersReducedMotion) return null

  return createPortal(
    <div className="card-flight-layer" aria-hidden="true">
      <motion.div
        className="card-flight-dim"
        initial={{ opacity: 0 }}
        // Gentle scene dim during the launch, then a full sink to near-black
        // that hides the route swap, then the dissolve revealing the new page.
        animate={{ opacity: [0, 0.28, 1, 1, 0] }}
        transition={{
          duration: TOTAL_S,
          times: [0, LIFT_END, (FLY_END + REVEAL_START) / 2, REVEAL_START, 1],
          ease: ['easeOut', 'easeIn', 'linear', 'easeOut'],
        }}
        onAnimationComplete={clearFlight}
      />
      <CardFlightVisual key={`${flight.entryId}:${flight.startedAt}`} flight={flight} />
    </div>,
    document.body,
  )
}
