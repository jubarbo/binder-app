import { create } from 'zustand'

/** Viewport-space bounding box of the card at the moment it was clicked. */
export interface CardFlightRect {
  top: number
  left: number
  width: number
  height: number
}

/** Everything the overlay needs to reproduce the card without the grid. */
export interface CardFlight {
  entryId: string
  imageSmall: string
  imageNormal: string
  alt: string
  start: CardFlightRect
  /** Router location key at click time; lets the overlay detect if the user
   * navigated on their own before the scheduled route swap. */
  locationKey: string
  startedAt: number
}

export type NewCardFlight = Omit<CardFlight, 'startedAt'>

/* Phase timings for the cinematic sequence:
   1. lift + fly toward the user (grid still visible),
   2. the scene sinks to near-black (the card dissolving under it),
   3. the route swap happens hidden under full black,
   4. the black dissolves, revealing the new page. */
export const FLIGHT_LIFT_MS = 160
export const FLIGHT_FLY_MS = 651
/** Card dissolve, overlapping the end of the fly (starts at 520ms). */
export const FLIGHT_CARD_FADE_MS = 300
/** Route swap, hidden under full black. */
export const NAVIGATE_AT_MS = 820
/** Black dissolve revealing the new page. */
export const FLIGHT_REVEAL_MS = 320
export const FLIGHT_TOTAL_MS = NAVIGATE_AT_MS + FLIGHT_REVEAL_MS

interface FlightState {
  flight: CardFlight | null
  beginFlight: (flight: NewCardFlight) => void
  clearFlight: () => void
}

/**
 * Module-level store for the in-flight transition. Deliberately not
 * persisted: the flight drives presentation and the timed route swap, and
 * must never survive a reload. The URL remains the single source of truth
 * for the selected card.
 */
export const useFlightStore = create<FlightState>((set) => ({
  flight: null,
  beginFlight: (flight) => set({ flight: { ...flight, startedAt: performance.now() } }),
  clearFlight: () => set({ flight: null }),
}))

/**
 * A flight only guards interactions while it is fresh. Expiry by timestamp
 * keeps the UI recoverable if the overlay never mounts or the animation never
 * completes, so a stale entry can never block navigation permanently.
 */
export function isFlightActive(flight: CardFlight | null, now: number): boolean {
  return flight !== null && now - flight.startedAt < FLIGHT_TOTAL_MS
}
