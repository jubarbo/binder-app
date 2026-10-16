import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFlipFace } from './useFlipFace'

/* One turn (front <-> back) every 3s, matching the approved cadence. */
const FLIP_INTERVAL_MS = 3000

describe('useFlipFace', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts on the front face and advances every interval', () => {
    const { result } = renderHook(() => useFlipFace(true, false))

    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(FLIP_INTERVAL_MS)
    })
    expect(result.current).toBe(180)

    act(() => {
      vi.advanceTimersByTime(FLIP_INTERVAL_MS)
    })
    expect(result.current).toBe(0)
  })

  it('holds the current face while paused', () => {
    const { result, rerender } = renderHook(
      ({ paused }) => useFlipFace(true, paused),
      { initialProps: { paused: false } },
    )

    act(() => {
      vi.advanceTimersByTime(FLIP_INTERVAL_MS)
    })
    expect(result.current).toBe(180)

    rerender({ paused: true })

    // Several intervals pass with the pointer parked: no turn happens.
    act(() => {
      vi.advanceTimersByTime(FLIP_INTERVAL_MS * 4)
    })
    expect(result.current).toBe(180)
  })

  it('waits a full interval after resuming', () => {
    const { result, rerender } = renderHook(
      ({ paused }) => useFlipFace(true, paused),
      { initialProps: { paused: true } },
    )

    act(() => {
      vi.advanceTimersByTime(FLIP_INTERVAL_MS * 2)
    })
    expect(result.current).toBe(0)

    rerender({ paused: false })

    act(() => {
      vi.advanceTimersByTime(FLIP_INTERVAL_MS)
    })
    expect(result.current).toBe(180)
  })

  it('never advances when flipping is disabled', () => {
    const { result } = renderHook(() => useFlipFace(false, false))

    act(() => {
      vi.advanceTimersByTime(FLIP_INTERVAL_MS * 4)
    })
    expect(result.current).toBe(0)
  })
})
