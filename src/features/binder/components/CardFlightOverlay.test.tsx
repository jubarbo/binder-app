import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom'
import CardSlot from '@/features/binder/components/CardSlot'
import CardFlightOverlay from '@/features/binder/components/CardFlightOverlay'
import {
  FLIGHT_TOTAL_MS,
  NAVIGATE_AT_MS,
  isFlightActive,
  useFlightStore,
} from '@/features/binder/transition/flightStore'
import { computeFlightGeometry } from '@/features/binder/transition/flightGeometry'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

vi.mock('@/features/catalog/catalogQueries', () => ({
  usePrinting: vi.fn(),
}))

// Controllable reduced-motion switch for the whole file.
let mockPrefersReducedMotion = false
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return { ...actual, useReducedMotion: () => mockPrefersReducedMotion }
})

import { usePrinting } from '@/features/catalog/catalogQueries'

const mockUsePrinting = usePrinting as unknown as ReturnType<typeof vi.fn>

const entry: BinderEntry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true }

const printing: Printing = {
  id: 'p1',
  oracleId: 'o1',
  name: 'Test Card',
  setCode: 'TST',
  setName: 'Test Set',
  collectorNumber: '123',
  rarity: 'common',
  finishes: ['nonfoil'],
  imageSmall: 'http://example.com/s.png',
  imageNormal: 'http://example.com/n.png',
  imageLarge: '',
  prices: undefined,
}

const START_RECT = { top: 100, left: 200, width: 120, height: 167 } as DOMRect

/** Probe route that echoes the matched entryId so navigation is observable. */
function DetailProbe() {
  const { entryId } = useParams()
  return <div>{`detail-${entryId}`}</div>
}

/** Grid probe with an escape hatch so user-initiated navigation is testable. */
function GridProbe() {
  const navigate = useNavigate()
  return (
    <>
      <CardSlot entry={entry} />
      <button type="button" onClick={() => navigate('/wants')}>go wants</button>
    </>
  )
}

function renderScene() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <CardFlightOverlay />
      <Routes>
        <Route path="/" element={<GridProbe />} />
        <Route path="/card/:entryId" element={<DetailProbe />} />
        <Route path="/wants" element={<div>wants-page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function beginTestFlight(locationKey = 'loc-1') {
  act(() => {
    useFlightStore.getState().beginFlight({
      entryId: 'e1',
      imageSmall: printing.imageSmall,
      imageNormal: printing.imageNormal,
      alt: 'alt',
      start: { top: 100, left: 200, width: 120, height: 167 },
      locationKey,
    })
  })
}

describe('flight store', () => {
  beforeEach(() => {
    useFlightStore.setState({ flight: null })
  })

  it('expires a flight after its total duration so it can never block clicks forever', () => {
    beginTestFlight()
    const flight = useFlightStore.getState().flight
    expect(isFlightActive(flight, performance.now())).toBe(true)
    expect(isFlightActive(flight, performance.now() + FLIGHT_TOTAL_MS + 1)).toBe(false)
    expect(isFlightActive(null, performance.now())).toBe(false)
  })
})

describe('computeFlightGeometry', () => {
  it('targets the viewport center and preserves the card aspect ratio', () => {
    const geometry = computeFlightGeometry(START_RECT)
    expect(geometry.x).toBeCloseTo(window.innerWidth / 2 - (START_RECT.left + START_RECT.width / 2))
    expect(geometry.y).toBeCloseTo(window.innerHeight / 2 - (START_RECT.top + START_RECT.height / 2))
    expect(geometry.endWidth / geometry.endHeight).toBeCloseTo(START_RECT.width / START_RECT.height)
    // End size fits within the viewport on any screen size.
    expect(geometry.endWidth).toBeLessThanOrEqual(window.innerWidth)
    expect(geometry.endHeight).toBeLessThanOrEqual(window.innerHeight)
    // Directional tilts stay controlled.
    expect(Math.abs(geometry.rotateY)).toBeLessThanOrEqual(12)
    expect(Math.abs(geometry.rotateZ)).toBeLessThanOrEqual(3)
  })
})

describe('CardSlot flight initiation', () => {
  beforeEach(() => {
    useFlightStore.setState({ flight: null })
    mockPrefersReducedMotion = false
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
  })

  it('starts a flight with the real card rect without navigating immediately', () => {
    renderScene()
    const button = screen.getByRole('button', { name: /Carta/i })
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(START_RECT)
    fireEvent.click(button)
    const flight = useFlightStore.getState().flight
    expect(flight?.entryId).toBe('e1')
    expect(flight?.start).toEqual({ top: 100, left: 200, width: 120, height: 167 })
    // The swap is deferred: the detail must not appear before the black.
    expect(screen.queryByText(/detail-/)).not.toBeInTheDocument()
  })

  it('leaves the sharp image behind when the grid never hydrated it', () => {
    renderScene()
    fireEvent.click(screen.getByRole('button', { name: /Carta/i }))
    // The grid's high-res <img> never fired load in jsdom, so the flight must
    // carry no sharp layer: it can never pop in with a mid-flight crossfade.
    expect(useFlightStore.getState().flight?.imageNormal).toBe('')
  })

  it('navigates directly without a flight under reduced motion', () => {
    mockPrefersReducedMotion = true
    renderScene()
    fireEvent.click(screen.getByRole('button', { name: /Carta/i }))
    expect(useFlightStore.getState().flight).toBeNull()
    expect(screen.getByText('detail-e1')).toBeInTheDocument()
  })

  it('ignores clicks while a flight is active', () => {
    beginTestFlight()
    const startedAt = useFlightStore.getState().flight?.startedAt
    renderScene()
    fireEvent.click(screen.getByRole('button', { name: /Carta/i }))
    expect(useFlightStore.getState().flight?.startedAt).toBe(startedAt)
  })

  it('starts a fresh flight when the stored one is expired', () => {
    useFlightStore.setState({
      flight: {
        entryId: 'e1',
        imageSmall: printing.imageSmall,
        imageNormal: printing.imageNormal,
        alt: 'alt',
        start: { top: 0, left: 0, width: 10, height: 14 },
        locationKey: 'loc-old',
        startedAt: performance.now() - FLIGHT_TOTAL_MS - 100,
      },
    })
    renderScene()
    fireEvent.click(screen.getByRole('button', { name: /Carta/i }))
    const flight = useFlightStore.getState().flight
    expect(flight?.locationKey).not.toBe('loc-old')
    expect(isFlightActive(flight, performance.now())).toBe(true)
  })
})

describe('CardFlightOverlay orchestration', () => {
  beforeEach(() => {
    useFlightStore.setState({ flight: null })
    mockPrefersReducedMotion = false
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    // Fake only the timer APIs the overlay schedules with, so motion's rAF
    // loop keeps running untouched.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('swaps the route at NAVIGATE_AT_MS, timed under the black', () => {
    renderScene()
    fireEvent.click(screen.getByRole('button', { name: /Carta/i }))
    expect(useFlightStore.getState().flight).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(NAVIGATE_AT_MS - 1)
    })
    // Still on the grid just before the swap instant.
    expect(screen.queryByText(/detail-/)).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByText('detail-e1')).toBeInTheDocument()
  })

  it('skips the scheduled swap when the user navigates on their own first', () => {
    renderScene()
    fireEvent.click(screen.getByRole('button', { name: /Carta/i }))
    fireEvent.click(screen.getByText('go wants'))
    expect(screen.getByText('wants-page')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(NAVIGATE_AT_MS + 200)
    })
    // The stale swap must not yank the user back to a card detail.
    expect(screen.getByText('wants-page')).toBeInTheDocument()
    expect(screen.queryByText(/detail-/)).not.toBeInTheDocument()
  })
})

describe('CardFlightOverlay layer', () => {
  /** The overlay needs router context for its scheduled swap. */
  const renderOverlay = () =>
    render(
      <MemoryRouter>
        <CardFlightOverlay />
      </MemoryRouter>,
    )

  beforeEach(() => {
    useFlightStore.setState({ flight: null })
    mockPrefersReducedMotion = false
  })

  it('renders nothing while idle and the decorative layer while flying', () => {
    const { container, unmount } = renderOverlay()
    expect(container).toBeEmptyDOMElement()
    expect(document.querySelector('.card-flight-card')).toBeNull()
    beginTestFlight()
    const layer = document.querySelector('.card-flight-layer')
    expect(layer).not.toBeNull()
    // Decorative duplicate: hidden from assistive tech and never interactive.
    expect(layer?.getAttribute('aria-hidden')).toBe('true')
    expect(document.querySelector('.card-flight-card')).not.toBeNull()
    unmount()
  })

  it('mounts the carried-over sharp layer already visible, without a crossfade', () => {
    renderOverlay()
    beginTestFlight()
    const full = document.querySelector('.card-flight-img--full')
    expect(full).not.toBeNull()
    expect(full?.getAttribute('data-loaded')).toBe('true')
  })

  it('clears the flight when the layer unmounts so no transient state leaks', () => {
    const { unmount } = renderOverlay()
    beginTestFlight()
    expect(useFlightStore.getState().flight).not.toBeNull()
    unmount()
    expect(useFlightStore.getState().flight).toBeNull()
  })

  it('refuses to render a flight under reduced motion and clears it', () => {
    mockPrefersReducedMotion = true
    renderOverlay()
    beginTestFlight()
    expect(document.querySelector('.card-flight-card')).toBeNull()
    expect(useFlightStore.getState().flight).toBeNull()
  })
})
